/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { JobEvent, Kasbon } from '../types';
import { pushToSheets } from '../lib/sheetsSync';
import { 
  Printer, 
  Calendar, 
  Building, 
  CheckCircle,
  Sparkles,
  FileText,
  Copy,
  Check,
  Database,
  FileSpreadsheet,
  AlertTriangle,
  Coins,
  Lock,
  Unlock,
  Users
} from 'lucide-react';

interface MonthlyCalculatorProps {
  events: JobEvent[];
  sheetUrl?: string;
  onSheetUrlChange?: (url: string) => void;
  kasbonList?: Kasbon[];
}

const ID_MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export function MonthlyCalculator({ events, sheetUrl: propSheetUrl, onSheetUrlChange, kasbonList = [] }: MonthlyCalculatorProps) {
  // Get all unique years and months from events for selectors
  const years = useMemo(() => {
    const list = events.map(e => e.year);
    if (list.length === 0) return [new Date().getFullYear()];
    const unique = Array.from(new Set(list));
    return unique.sort((a, b) => b - a);
  }, [events]);

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1; // 1-12

  // Find standard month & year of latest event if any, otherwise default to current date
  const latestEvent = events[0];
  const defaultYear = latestEvent ? latestEvent.year : currentYear;
  const defaultMonth = latestEvent ? latestEvent.month : currentMonth;

  const [selectedMonth, setSelectedMonth] = useState<number>(defaultMonth);
  const [selectedYear, setSelectedYear] = useState<number>(defaultYear);
  const [signerName, setSignerName] = useState<string>('Senyo');
  const [signerRole, setSignerRole] = useState<string>('Kreator Utama / Partner Lapangan');
  const [copiedWhatsApp, setCopiedWhatsApp] = useState<boolean>(false);
  const [copiedSlipName, setCopiedSlipName] = useState<string | null>(null);

  // Load and manage closed book state
  const [closedBooks, setClosedBooks] = useState<Record<string, boolean>>(() => {
    try {
      const stored = localStorage.getItem('senyo_closed_books');
      return stored ? JSON.parse(stored) : {};
    } catch (_) {
      return {};
    }
  });

  const isBookClosed = useMemo(() => {
    return !!closedBooks[`${selectedYear}-${selectedMonth}`];
  }, [closedBooks, selectedYear, selectedMonth]);

  const toggleBookStatus = (year: number, monthVal: number) => {
    const key = `${year}-${monthVal}`;
    const updated = { ...closedBooks, [key]: !closedBooks[key] };
    setClosedBooks(updated);
    localStorage.setItem('senyo_closed_books', JSON.stringify(updated));
  };

  // Google Sheets Sync States
  const [localSheetUrl, setLocalSheetUrl] = useState<string>(() => {
    const DEFAULT_SHEET_URL = 'https://script.google.com/macros/s/AKfycbw8nqWB1uYVyaa0rF9BFL3__c0yWgL2WEhDAIR0FVZPXC4hUb9cpkwV3k0XKqrcVwfv/exec';
    const stored = localStorage.getItem('senyo_google_sheet_url');
    const isOld = !stored || 
                  stored.includes('AKfycbzfX0pO') || 
                  stored.includes('AKfycbxVeO7jx') || 
                  stored.includes('AKfycbw6GMLuYPJ5LIm33C') ||
                  stored.includes('AKfycby92BSI8gE-56smG1fAk4lwvBIi7UJIhPD1xMZS3jIExLaMO3fNpPUaU2sEdg4yEvcW');
    if (isOld) {
      localStorage.setItem('senyo_google_sheet_url', DEFAULT_SHEET_URL);
      return DEFAULT_SHEET_URL;
    }
    return stored || DEFAULT_SHEET_URL;
  });

  const sheetUrl = propSheetUrl !== undefined ? propSheetUrl : localSheetUrl;

  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<{ type: 'success' | 'error' | ''; message: string }>({ type: '', message: '' });
  const [copiedScript, setCopiedScript] = useState<boolean>(false);
  const [showSheetInstructions, setShowSheetInstructions] = useState<boolean>(false);

  const handleSaveSheetUrl = (url: string) => {
    if (onSheetUrlChange) {
      onSheetUrlChange(url);
    } else {
      setLocalSheetUrl(url);
      localStorage.setItem('senyo_google_sheet_url', url);
    }
  };

  // Filter events of selected month/year that are completed ('Selesai')
  const monthlyEventsAll = useMemo(() => {
    return events.filter(e => e.month === selectedMonth && e.year === selectedYear);
  }, [events, selectedMonth, selectedYear]);

  // Keep all monthly events but allow calculation specifically for "Selesai" (completed)
  const completedMonthlyEvents = useMemo(() => {
    return monthlyEventsAll.filter(e => e.status === 'Selesai');
  }, [monthlyEventsAll]);

  // Grouped by instansi/location details
  const statsByClient = useMemo(() => {
    const groups: Record<string, { count: number; jobs: string[] }> = {};
    completedMonthlyEvents.forEach(e => {
      const client = e.location || 'Klien Umum';
      if (!groups[client]) {
        groups[client] = { count: 0, jobs: [] };
      }
      groups[client].count += 1;
      groups[client].jobs.push(e.eventName);
    });
    return groups;
  }, [completedMonthlyEvents]);

  // Filter kasbon of selected month/year
  const monthlyKasbon = useMemo(() => {
    if (!kasbonList) return [];
    return kasbonList.filter(item => {
      try {
        const parts = item.date.split('-');
        const itemYear = parseInt(parts[0], 10);
        const itemMonth = parseInt(parts[1], 10);
        return itemYear === selectedYear && itemMonth === selectedMonth;
      } catch (_) {
        return false;
      }
    });
  }, [kasbonList, selectedMonth, selectedYear]);

  const totalMonthlyKasbon = useMemo(() => {
    return monthlyKasbon.reduce((acc, curr) => acc + curr.amount, 0);
  }, [monthlyKasbon]);

  const [activeCalcTab, setActiveCalcTab] = useState<'a4' | 'pembayaran'>('a4');

  // Programmatic paycheck & wage sheet calculations
  const paycheckData = useMemo(() => {
    const crewMap: Record<string, { jobsCount: number; grossHonor: number; eventsList: string[] }> = {};
    
    // Default main signer
    if (signerName && signerName.trim()) {
      crewMap[signerName.trim()] = { jobsCount: 0, grossHonor: 0, eventsList: [] };
    }

    // Process completed events
    completedMonthlyEvents.forEach(e => {
      const budget = e.rate || 0;
      const team = e.team || [];
      
      if (team.length === 0) {
        // Solo event: goes to signer/reporter if exists
        const mainGuy = (signerName && signerName.trim()) ? signerName.trim() : 'Mandiri';
        if (!crewMap[mainGuy]) {
          crewMap[mainGuy] = { jobsCount: 0, grossHonor: 0, eventsList: [] };
        }
        crewMap[mainGuy].jobsCount += 1;
        crewMap[mainGuy].grossHonor += budget;
        crewMap[mainGuy].eventsList.push(`${e.eventName} (Rp ${budget.toLocaleString('id-ID')})`);
      } else {
        // Split event budget equally among crew
        const share = budget / team.length;
        team.forEach(name => {
          const trimmed = name.trim();
          if (!crewMap[trimmed]) {
            crewMap[trimmed] = { jobsCount: 0, grossHonor: 0, eventsList: [] };
          }
          crewMap[trimmed].jobsCount += 1;
          crewMap[trimmed].grossHonor += share;
          crewMap[trimmed].eventsList.push(`${e.eventName} (Rp ${share.toLocaleString('id-ID')})`);
        });
      }
    });

    // Now convert to list and combine with Kasbon info
    return Object.entries(crewMap).map(([name, data]) => {
      const teammateKasbonList = monthlyKasbon.filter(k => k.teammateName.trim().toLowerCase() === name.toLowerCase());
      const totalKasbon = teammateKasbonList.reduce((acc, curr) => acc + curr.amount, 0);
      const netPay = data.grossHonor - totalKasbon;

      return {
        name,
        jobsCount: data.jobsCount,
        grossHonor: data.grossHonor,
        eventsList: data.eventsList,
        totalKasbon,
        netPay,
        hasPaid: isBookClosed
      };
    });
  }, [completedMonthlyEvents, monthlyKasbon, signerName, isBookClosed]);

  // Aggregate values
  const totalGrossHonor = useMemo(() => {
    return paycheckData.reduce((acc, curr) => acc + curr.grossHonor, 0);
  }, [paycheckData]);

  const totalNetPay = useMemo(() => {
    return paycheckData.reduce((acc, curr) => acc + curr.netPay, 0);
  }, [paycheckData]);

  const handlePrint = () => {
    window.print();
  };

  const handleCopyWhatsAppText = () => {
    const formattedDesc = ID_MONTHS[selectedMonth - 1] + ' ' + selectedYear;
    const statusText = isBookClosed ? "🔒 TUTUP BUKU (FINAL & REKAP SAH)" : "🔓 BELUM TUTUP BUKU";
    
    // Formatting Completed Work list
    const workItemsText = completedMonthlyEvents.map((e, idx) => {
      let dispDate = e.date;
      try {
        const parts = e.date.split('-');
        dispDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
      } catch (_) {}
      const budgetText = e.rate ? ` [💰 Rp ${e.rate.toLocaleString('id-ID')}]` : '';
      return `${idx + 1}. *${e.eventName}*${budgetText}
   📅 Tanggal: ${dispDate}
   🏢 Lokasi: ${e.location || 'Pekerjaan Pribadi'}
   👥 Kru: ${e.team && e.team.length ? e.team.join(', ') : 'Mandiri'}
   📝 Keterangan: ${e.notes || '-'}`;
    }).join('\n\n');

    // Formatting Kasbon list
    const kasbonItemsText = monthlyKasbon.length > 0 ? monthlyKasbon.map((k, idx) => {
      let dispDate = k.date;
      try {
        const parts = k.date.split('-');
        dispDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
      } catch (_) {}
      return `${idx + 1}. *Rp ${k.amount.toLocaleString('id-ID')}* - *${k.teammateName}*
   📅 Tanggal: ${dispDate}
   💳 Metode: ${k.method}
   💡 Keperluan: ${k.notes || '-'}`;
    }).join('\n\n') : 'Nihil / Tidak ada kasbon di bulan ini.';

    // Formatting Paychecks list
    const paycheckItemsText = paycheckData.length > 0 ? paycheckData.map((p, idx) => {
      return `${idx + 1}. *${p.name}*
   💼 Kehadiran: ${p.jobsCount} Job
   💰 Honor Kotor Share: Rp ${Math.round(p.grossHonor).toLocaleString('id-ID')}
   📉 Potongan Kasbon: -Rp ${p.totalKasbon.toLocaleString('id-ID')}
   💵 Sisa Bersih Dibayar: *Rp ${Math.round(p.netPay).toLocaleString('id-ID')}*`;
    }).join('\n\n') : 'Nihil / Belum ada personil terdaftar.';

    const finalWhatsAppText = `📋 *LAPORAN DINAS BULANAN (REKAP SENYO)*
*Periode*: ${formattedDesc}
*Pembuat*: ${signerName} (${signerRole})
*Status*: ${statusText}

=========================

*📊 RINGKASAN REKAP DATA:*
• Total Pekerjaan Selesai: *${completedMonthlyEvents.length} Job*
• Total Omset Kegiatan (Tarif): *Rp ${totalGrossHonor.toLocaleString('id-ID')}*
• Total Kasbon Terpotong: *Rp ${totalMonthlyKasbon.toLocaleString('id-ID')}*
• Total Sisa Bersih Pembayaran: *Rp ${totalNetPay.toLocaleString('id-ID')}*

=========================

*✅ BAGIAN 1: CATATAN GAWEAN LAPANGAN SELESAI ({completedMonthlyEvents.length})*

${workItemsText || 'Nihil / Tidak ada catatan gawean selesai.'}

=========================

*💸 BAGIAN 2: DAFTAR TRANSAKSI KASBON ({monthlyKasbon.length})*

${kasbonItemsText}

=========================

*💵 BAGIAN 3: RINCIAN BAYARAN & REALISASI GAJI ({paycheckData.length})*

${paycheckItemsText}

=========================
_Generated via Aplikasi Rekap Dinas Lapangan Senyo_`;

    navigator.clipboard.writeText(finalWhatsAppText).then(() => {
      setCopiedWhatsApp(true);
      setTimeout(() => setCopiedWhatsApp(false), 2500);
    }).catch(err => {
      console.error("Gagal menyalin teks WA:", err);
    });
  };

  const syncToGoogleSheets = async () => {
    if (!sheetUrl) {
      setSyncStatus({ type: 'error', message: 'Masukkan URL Web App Apps Script di panel integrasi dulu bray!' });
      return;
    }
    
    setIsSyncing(true);
    setSyncStatus({ type: '', message: '' });
    
    const payload = {
      events: completedMonthlyEvents.map(e => ({
        id: e.id,
        date: e.date,
        month: e.month,
        year: e.year,
        eventName: e.eventName,
        location: e.location || 'Pekerjaan Pribadi',
        team: e.team,
        notes: e.notes || ''
      }))
    };

    try {
      const success = await pushToSheets(sheetUrl, payload);
      if (success) {
        setSyncStatus({ 
          type: 'success', 
          message: `Mataapp! ${completedMonthlyEvents.length} data gawean bulan ${ID_MONTHS[selectedMonth - 1]} dikirim ke Sheets!` 
        });
      } else {
        throw new Error('Gagal mengirim data bray.');
      }
    } catch (err: any) {
      console.error(err);
      setSyncStatus({ 
        type: 'error', 
        message: `Koneksi error: ${err?.message || 'Gagal mengirim data.'}` 
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // Google Apps Script template code (No Rate Column)
  const googleAppsScriptCode = `function doGet(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var lastRow = sheet.getLastRow();
    var events = [];
    
    if (lastRow > 1) {
      var range = sheet.getRange(2, 1, lastRow - 1, 8);
      var values = range.getValues();
      
      for (var i = 0; i < values.length; i++) {
        var row = values[i];
        if (!row[0]) continue; // Skip empty rows
        
        // Parse "Tanggal Main" (e.g., "2026-05-25")
        var dateVal = row[1];
        if (dateVal instanceof Date) {
          var yearStr = dateVal.getFullYear();
          var monthStr = ("0" + (dateVal.getMonth() + 1)).slice(-2);
          var dayStr = ("0" + dateVal.getDate()).slice(-2);
          dateVal = yearStr + "-" + monthStr + "-" + dayStr;
        } else {
          dateVal = String(dateVal);
        }
        
        // Parse day, month, year
        var parts = dateVal.split("-");
        var day = parseInt(parts[2]) || new Date().getDate();
        var month = parseInt(parts[1]) || (new Date().getMonth() + 1);
        var year = parseInt(parts[0]) || new Date().getFullYear();
        
        // Parse kru
        var teamStr = String(row[5] || "");
        var teamArr = [];
        if (teamStr && teamStr !== "Mandiri" && teamStr !== "Mandiri (tidak ada tim)") {
          teamArr = teamStr.split(",").map(function(t) { return t.trim(); });
        }
        
        events.push({
          id: String(row[0] || ""),
          date: dateVal,
          day: day,
          month: month,
          year: year,
          eventName: String(row[3] || ""),
          location: String(row[4] || ""),
          team: teamArr,
          notes: String(row[6] || ""),
          status: "Selesai",
          createdAt: new Date().toISOString()
        });
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      events: events
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    var rawData = e.postData.contents;
    var data = JSON.parse(rawData);
    
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    
    // Bikin Header Otomatis kalo Sheet masih kosong melong
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        "ID Kerja",
        "Tanggal Main",
        "Bulan/Tahun",
        "Nama Event/Pekerjaan",
        "Klien / Perusahaan / Lokasi",
        "Kru/Partner Kerja",
        "Catatan Pekerjaan",
        "Waktu Sinkronisasi (WIB)"
      ]);
      
      // Kasih style dikit biar ganteng & estetik kayak Senyo
      var headerRange = sheet.getRange(1, 1, 1, 8);
      headerRange.setFontWeight("bold");
      headerRange.setBackground("#ec4899"); // Pink manis
      headerRange.setFontColor("#ffffff");
    }
    
    // Mulai append atau update row data gawean
    if (data.events && Array.isArray(data.events)) {
      data.events.forEach(function(ev) {
        var idToFind = ev.id;
        var existingRowIndex = -1;
        
        if (sheet.getLastRow() > 1) {
          var ids = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues();
          for (var r = 0; r < ids.length; r++) {
            if (String(ids[r][0]) === String(idToFind)) {
              existingRowIndex = r + 2; // +2 offset for header (1) and indexing (1)
              break;
            }
          }
        }
        
        var rowData = [
          ev.id,
          ev.date,
          ev.month + "/" + ev.year,
          ev.eventName,
          ev.location || "Pekerjaan Pribadi",
          ev.team && ev.team.length ? ev.team.join(", ") : "Mandiri",
          ev.notes || "",
          new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })
        ];
        
        if (existingRowIndex !== -1) {
          // Update existing row
          var rowRange = sheet.getRange(existingRowIndex, 1, 1, 8);
          rowRange.setValues([rowData]);
        } else {
          // Append new row
          sheet.appendRow(rowData);
        }
      });
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: data.events.length + " data berhasil disetorkan!"
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}`;

  return (
    <div id="monthly-calculator-panel" className="space-y-6">
      
      {/* CONTROL BOARD (Hidden in prints) */}
      <div id="monthly-calc-settings" className="bg-slate-900 border-2 border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl shadow-black/20 border-b-8 border-b-slate-800 print:hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4 mb-5">
          <div>
            <h2 className="text-lg font-black text-slate-100 uppercase tracking-tight flex items-center gap-2">
              <FileText className="w-5.5 h-5.5 text-pink-500" /> Rekap &amp; Laporan Bulanan
            </h2>
            <p className="text-xs text-slate-400 font-semibold mt-1">
              Rekapitulasi gawean selesai dalam sebulan, buat dokumen rekam dinas cetak standar A4.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <button
              type="button"
              onClick={handleCopyWhatsAppText}
              disabled={completedMonthlyEvents.length === 0}
              className={`h-11 px-5 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                completedMonthlyEvents.length > 0 
                  ? 'bg-slate-950 hover:bg-slate-900 text-emerald-400 border-2 border-emerald-500/30 hover:border-emerald-500/60 shadow-lg active:scale-95'
                  : 'bg-slate-850 text-slate-600 border border-slate-800 cursor-not-allowed'
              }`}
            >
              {copiedWhatsApp ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400 animate-bounce" />
                  <span>Teks WA Tersalin!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-emerald-400" />
                  <span>Salin Ringkasan WA</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handlePrint}
              disabled={completedMonthlyEvents.length === 0}
              className={`h-11 px-5 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                completedMonthlyEvents.length > 0 
                  ? 'bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600 text-white shadow-lg shadow-pink-500/10 active:scale-95'
                  : 'bg-slate-800 text-slate-500 border border-slate-700/50 cursor-not-allowed'
              }`}
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Rekap A4 / PDF</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          
          {/* Month choice drop */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Pilih Bulan Laporan</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="w-full h-11 border-2 border-slate-800 rounded-2xl bg-slate-950 px-3.5 text-xs font-black text-slate-100 focus:outline-none focus:border-pink-500 appearance-none cursor-pointer"
            >
              {ID_MONTHS.map((name, idx) => (
                <option key={name} value={idx + 1}>{name}</option>
              ))}
            </select>
          </div>

          {/* Year choice drop */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Pilih Tahun</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="w-full h-11 border-2 border-slate-800 rounded-2xl bg-slate-950 px-3.5 text-xs font-black text-slate-100 focus:outline-none focus:border-pink-500 appearance-none cursor-pointer"
            >
              {years.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {/* Person Signer Info */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Nama Pembuat / Tanda Tangan</label>
            <input
              type="text"
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              placeholder="e.g. Senyo"
              className="w-full h-11 border-2 border-slate-800 rounded-2xl bg-slate-950 px-3.5 text-xs font-bold text-slate-100 focus:outline-none focus:border-pink-500 placeholder:text-slate-600"
            />
          </div>

        </div>

        {isBookClosed && (
          <div className="mt-4 p-3.5 bg-rose-500/10 bg-red-500/5 border-2 border-red-500/20 text-red-400 rounded-2xl flex items-center gap-2.5 text-[11px] font-black uppercase tracking-wider animate-scale-up">
            <Lock className="w-4 h-4 shrink-0 text-red-500 animate-pulse" />
            <span>Pemberitahuan: Periode {ID_MONTHS[selectedMonth - 1]} {selectedYear} Sudah Tutup Buku (Arsip Dikunci)</span>
          </div>
        )}
      </div>

      {/* DASHBOARD STATISTICS PREVIEW FOR SELECTED MONTH (Hidden in prints) */}
      {completedMonthlyEvents.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 print:hidden">
          
          {/* Metric 1 */}
          <div className="bg-slate-900 border-2 border-slate-800 p-5 rounded-3xl border-b-8 border-b-pink-500/80 shadow-lg">
            <div className="flex justify-between items-start mb-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Kerja Selesai</span>
              <CheckCircle className="w-4.5 h-4.5 text-pink-500" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black text-slate-100">{completedMonthlyEvents.length}</span>
              <span className="text-xs text-slate-450 font-extrabold">gawean</span>
            </div>
            <p className="text-[9px] text-slate-500 font-semibold mt-1">Status kelar periode {ID_MONTHS[selectedMonth - 1]}</p>
          </div>

          {/* Metric 2 */}
          <div className="bg-slate-900 border-2 border-slate-800 p-5 rounded-3xl border-b-8 border-b-orange-500/80 shadow-lg">
            <div className="flex justify-between items-start mb-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Instansi / Lokasi</span>
              <Building className="w-4.5 h-4.5 text-orange-400" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black text-slate-100">{Object.keys(statsByClient).length}</span>
              <span className="text-xs text-slate-450 font-extrabold">mitra</span>
            </div>
            <p className="text-[9px] text-slate-500 font-semibold mt-1">Partner dinas atau panggung lapangan</p>
          </div>

        </div>
      ) : (
        <div className="text-center py-12 border-4 border-dashed border-slate-800 bg-slate-950/40 rounded-3xl print:hidden">
          <Calendar className="w-12 h-12 text-slate-700 mx-auto mb-3" />
          <p className="text-base text-slate-300 font-black uppercase tracking-tight">Kga ada list kerja di bulan ini</p>
          <p className="text-xs text-slate-550 mt-1 max-w-sm mx-auto">
            Ubah pilihan bulan atau tambah pekerjaan baru dengan status selesai pada bulan {ID_MONTHS[selectedMonth - 1]}!
          </p>
        </div>
      )}

      {/* DETAILED SUMMARY CARDS BY CLIENT (Hidden in prints) */}
      {completedMonthlyEvents.length > 0 && (
        <div className="bg-slate-900 border-2 border-slate-800 rounded-3xl p-5 shadow-xl shadow-black/20 print:hidden space-y-4">
          <div>
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-300 flex items-center gap-1.5">
              <Building className="w-4 h-4 text-pink-500" /> Distribusi Pekerjaan Menurut Perusahaan
            </h3>
            <p className="text-[10px] text-slate-450 font-semibold mt-0.5">Ringkasan mitra kerja aktif bulan ini</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(Object.entries(statsByClient) as [string, { count: number; jobs: string[] }][]).map(([client, data]) => (
              <div key={client} className="p-4 bg-slate-950 border border-slate-800 rounded-2xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-slate-850 pb-2 mb-2">
                    <span className="text-xs font-black text-slate-200 uppercase tracking-tight flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-orange-400" /> {client}
                    </span>
                    <span className="text-[10px] bg-slate-900 border border-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-black">
                      {data.count} Job
                    </span>
                  </div>
                  <ul className="space-y-1 pl-1">
                    {data.jobs.map((jobName, jidx) => (
                      <li key={jidx} className="text-xs text-slate-400 font-extrabold flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-pink-500 shrink-0"></span>
                        {jobName}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 🔌 GOOGLE SHEET WEB APPS SYNC SYSTEM (Hidden in prints) */}
      {completedMonthlyEvents.length > 0 && (
        <div id="google-sheets-sync-card" className="bg-slate-900 border-2 border-slate-800 rounded-3xl p-5 shadow-xl shadow-black/20 print:hidden space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-300 flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" /> Integrasi &amp; Sinkronisasi Google Sheets
              </h3>
              <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Automasi setor rekap gawean lo langsung ke baris spreadsheet</p>
            </div>
            <button
              onClick={() => setShowSheetInstructions(!showSheetInstructions)}
              className="text-[10px] font-black uppercase tracking-widest text-pink-400 hover:text-pink-300 transition-colors flex items-center gap-1 cursor-pointer"
            >
              {showSheetInstructions ? '💾 Sembunyikan Script' : '🔧 Cara Setup Apps Script'}
            </button>
          </div>

          {/* Instructions & Script Viewer */}
          {showSheetInstructions && (
            <div className="p-4 bg-slate-950 border border-slate-850 rounded-2xl space-y-4 text-xs">
              <div className="space-y-2">
                <h4 className="font-extrabold text-slate-200 uppercase tracking-wider text-[10px] text-pink-400">Langkah Setup Database Google Sheets:</h4>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-300 font-semibold">
                  <li>Buka Google Sheets baru atau pakai yang sudah ada.</li>
                  <li>Klik menu <strong className="text-slate-100">Ekstensi &gt; Apps Script</strong> di bagian atas.</li>
                  <li>Hapus semua script bawaan, lalu paste kode di bawah secara utuh.</li>
                  <li>Klik tombol <strong className="text-slate-100">Terapkan &gt; Penerapan Baru</strong> (Deploy &gt; New Deployment).</li>
                  <li>Pilih jenis <strong className="text-slate-100">Aplikasi Web</strong> (Web App).</li>
                  <li>Atur <strong className="text-slate-100">Yang memiliki akses (Who has access)</strong> menjadi <strong className="text-pink-400">Siapa Saja (Anyone)</strong>.</li>
                  <li>Klik terapkan, setujui izinnya, lalu salin URL Aplikasi Web (Web App URL) yang diberikan.</li>
                  <li>Masukkan URL tersebut pada kolom isian di bawah untuk mulai kirim data otomatis!</li>
                </ol>
              </div>

              {/* Code container */}
              <div className="space-y-2">
                <div className="flex items-center justify-between bg-slate-900 px-3 py-1.5 rounded-t-xl border-t border-r border-l border-slate-800">
                  <span className="text-[9px] font-mono uppercase tracking-wider text-slate-400">Google Apps Script</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(googleAppsScriptCode);
                      setCopiedScript(true);
                      setTimeout(() => setCopiedScript(false), 2500);
                    }}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-[10px] font-black uppercase tracking-wider text-slate-300 hover:text-white rounded flex items-center gap-1 transition-all cursor-pointer"
                  >
                    {copiedScript ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-rose-450" />}
                    <span>{copiedScript ? 'Tersalin!' : 'Salin Kode'}</span>
                  </button>
                </div>
                <pre className="p-4 bg-slate-900 border border-slate-800 rounded-b-2xl overflow-x-auto text-[10px] font-mono text-slate-300 max-h-64 thin-scrollbar">
                  <code>{googleAppsScriptCode}</code>
                </pre>
              </div>
            </div>
          )}

          {/* Live URL config & Sync execution UI */}
          <div className="bg-slate-950/60 p-4 border border-slate-800 rounded-2xl space-y-3.5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">
                  URL Aplikasi Web Google Apps Script (Webhook)
                </label>
                <input
                  type="text"
                  value={sheetUrl}
                  onChange={(e) => handleSaveSheetUrl(e.target.value)}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  className="w-full h-11 border-2 border-slate-800 bg-slate-950 px-3.5 text-xs font-mono font-bold text-slate-100 focus:outline-none focus:border-pink-500 placeholder:text-slate-750 placeholder:font-sans rounded-xl transition-all"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={syncToGoogleSheets}
                  disabled={isSyncing || completedMonthlyEvents.length === 0}
                  className={`w-full h-11 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    completedMonthlyEvents.length === 0 
                      ? 'bg-slate-850 text-slate-600 border border-slate-800/60 cursor-not-allowed'
                      : isSyncing 
                      ? 'bg-pink-900/40 text-pink-300 border border-pink-700/60 animate-pulse'
                      : 'bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black active:scale-95 shadow-lg shadow-emerald-500/5'
                  }`}
                >
                  <Database className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? 'Menyetorkan...' : 'Setor ke Google Sheets'}</span>
                </button>
              </div>
            </div>

            {/* Sync Status Banner */}
            {syncStatus.message && (
              <div className={`p-3 rounded-xl border flex items-start gap-2.5 text-xs font-semibold ${
                syncStatus.type === 'success' 
                  ? 'bg-emerald-950/20 border-emerald-800 text-emerald-400' 
                  : 'bg-red-955/20 border-red-800/80 text-red-400'
              }`}>
                {syncStatus.type === 'success' ? (
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                )}
                <span>{syncStatus.message}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 🔒 KONTROL TUTUP BUKU & STATUS LAPORAN (Hidden in prints) */}
      <div className="bg-slate-900 border-2 border-slate-800 rounded-3xl p-5 shadow-xl shadow-black/20 border-b-8 border-b-slate-800 print:hidden space-y-4">
        <div>
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-100 flex items-center gap-1.5">
            <Lock className="w-4 h-4 text-pink-500 animate-pulse" />
            Sistem Kontrol Tutup Buku &amp; Arsip Bulanan ({selectedYear})
          </h3>
          <p className="text-[10px] text-slate-400 font-semibold mt-0.5 leading-relaxed">
            Pantau status laporan dan kunci transaksi kasbulanan secara digital. Buku yang dikunci (Tutup Buku) menandakan seluruh gawean dan kasbon kru telah dinyatakan sah, final, serta siap untuk diajukan ke dinas administrasi.
          </p>
        </div>

        {/* 12 Months Status Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {ID_MONTHS.map((monthName, idx) => {
            const mVal = idx + 1;
            const key = `${selectedYear}-${mVal}`;
            const isClosed = !closedBooks ? false : !!closedBooks[key];

            // Count completed jobs for this iteration
            const mEvents = events.filter(e => e.year === selectedYear && e.month === mVal && e.status === 'Selesai');
            
            // Calculate kasbon for this iteration
            const mKasbon = kasbonList.filter(k => {
              try {
                const parts = k.date.split('-');
                return parseInt(parts[0], 10) === selectedYear && parseInt(parts[1], 10) === mVal;
              } catch (_) { return false; }
            });
            const mKasbonSum = mKasbon.reduce((acc, c) => acc + c.amount, 0);

            return (
              <div 
                key={mVal} 
                className={`p-3 rounded-2xl border-2 flex flex-col justify-between transition-all relative ${
                  isClosed 
                    ? 'border-red-950/60 bg-red-950/10 shadow-inner shadow-red-950/20' 
                    : 'border-slate-800 bg-slate-950 hover:border-slate-800'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-black text-slate-200 truncate">{monthName}</span>
                    <span className="text-[8px] text-slate-500 font-mono font-bold shrink-0">{selectedYear}</span>
                  </div>

                  <div className="space-y-1 text-[10px] text-slate-450 font-bold mb-3">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-slate-500 text-[9px] uppercase">Job Beres</span>
                      <span className="text-slate-300 font-black">{mEvents.length} Job</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-slate-500 text-[9px] uppercase">Gaji Kasbon</span>
                      <span className="text-orange-400 font-black">Rp {mKasbonSum.toLocaleString('id-ID')}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 mt-auto pt-2 border-t border-slate-900">
                  {/* Status Badge */}
                  <div className="text-center">
                    <span className={`inline-flex items-center gap-1 text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                      isClosed 
                        ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' 
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}>
                      {isClosed ? <Lock className="w-2.5 h-2.5 shrink-0 text-rose-400" /> : <Unlock className="w-2.5 h-2.5 shrink-0 text-amber-400" />}
                      <span>{isClosed ? 'Tutup Buku' : 'Belum Tutup'}</span>
                    </span>
                  </div>

                  {/* Lock/Unlock Button */}
                  <button
                    type="button"
                    onClick={() => toggleBookStatus(selectedYear, mVal)}
                    className={`w-full py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider text-center transition-all cursor-pointer ${
                      isClosed
                        ? 'bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white'
                        : 'bg-gradient-to-r from-pink-500 to-orange-500 text-slate-950 hover:opacity-90 font-black shadow-sm'
                    }`}
                  >
                    {isClosed ? 'Buka Buku' : 'Tutup Buku'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* HIGH-PRECISION REPLICA OF A4 REPORT SHEET (Interactive visual canvas & PRINT TARGET) */}
      {completedMonthlyEvents.length > 0 && (
        <div className="space-y-3">
          
          {/* Visual Choice Switcher Tabs */}
          <div className="flex gap-2 p-1 bg-slate-950 border-2 border-slate-800 rounded-2xl max-w-max print:hidden mb-2">
            <button
              onClick={() => setActiveCalcTab('a4')}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                activeCalcTab === 'a4'
                  ? 'bg-slate-800 text-slate-100 border border-slate-700 shadow-md shadow-pink-500/5'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4 text-pink-500" />
              Laporan Cetak A4
            </button>
            <button
              onClick={() => setActiveCalcTab('pembayaran')}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer relative ${
                activeCalcTab === 'pembayaran'
                  ? 'bg-slate-800 text-slate-100 border border-slate-700 shadow-md shadow-emerald-500/5'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Coins className="w-4 h-4 text-emerald-400 animate-pulse" />
              <span>Slip &amp; Gaji Tutup Buku</span>
              {isBookClosed && (
                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
              )}
            </button>
          </div>

          {activeCalcTab === 'pembayaran' ? (
            /* 💵 TUTUP BUKU & PEMBAYARAN GAJI KRU PANEL */
            <div className="bg-slate-900 border-2 border-slate-800 rounded-3xl p-6 shadow-xl space-y-6 print:bg-white print:border-none print:shadow-none">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-slate-800 pb-5">
                <div>
                  <h3 className="text-lg font-black text-slate-100 flex items-center gap-2 uppercase tracking-tight">
                    <Coins className="w-5.5 h-5.5 text-emerald-400" />
                    Buku Pembayaran &amp; Gaji Kru Selesai
                  </h3>
                  <p className="text-[11px] text-slate-400 font-semibold mt-1">
                    Detail realisasi pembagian upah bersih perorangan untuk bulan <span className="text-pink-500 font-black">{ID_MONTHS[selectedMonth - 1]} {selectedYear}</span>.
                  </p>
                </div>

                <div className="flex-shrink-0">
                  {isBookClosed ? (
                    <div className="px-4 py-2 bg-emerald-500/10 border-2 border-emerald-500/30 text-emerald-400 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 stroke-[2.5]" />
                      Lunas &amp; Buku Terkunci
                    </div>
                  ) : (
                    <div className="px-4 py-2 bg-amber-500/10 border-2 border-amber-500/30 text-amber-500 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-1.5">
                      <Unlock className="w-3.5 h-3.5 stroke-[2.5]" />
                      Estimasi Belum Diarsip
                    </div>
                  )}
                </div>
              </div>

              {/* CASHFLOW SUMMARY TIERS */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between">
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none">TOTAL BUDGET BRUTO</span>
                  <div className="text-base font-black text-indigo-400 tracking-tight mt-1">
                    Rp {totalGrossHonor.toLocaleString('id-ID')}
                  </div>
                  <span className="text-[9px] text-slate-500 font-semibold mt-0.5">Akumulasi anggaran {completedMonthlyEvents.length} pekerjaan selesai.</span>
                </div>

                <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between">
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none">KASBON TERPOTONG</span>
                  <div className="text-base font-black text-pink-400 tracking-tight mt-1">
                    -Rp {totalMonthlyKasbon.toLocaleString('id-ID')}
                  </div>
                  <span className="text-[9px] text-slate-500 font-semibold mt-0.5">Total pinjaman/uang muka dibayarkan di muka.</span>
                </div>

                <div className="bg-emerald-500/5 border-2 border-emerald-500/20 rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden">
                  <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest leading-none">TOTAL NET GAJI DIBAYAR</span>
                  <div className="text-xl font-black text-emerald-400 tracking-tight mt-1">
                    Rp {totalNetPay.toLocaleString('id-ID')}
                  </div>
                  <span className="text-[9px] text-emerald-500/80 font-bold mt-0.5 uppercase tracking-wider">
                    {isBookClosed ? "✅ Telah Lunas Ditransfer" : "🔓 Sisa Siap Ditransfer"}
                  </span>
                </div>
              </div>

              {/* INDIVIDUAL PAYCHECK CARDS */}
              <div className="space-y-4">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-350 flex items-center gap-1.5 border-b border-slate-800/80 pb-2">
                  <Users className="w-4 h-4 text-pink-500" /> Rincian Rekening &amp; Hak Penerima ({paycheckData.length} Orang)
                </h4>

                <div id="payout-roster-group" className="grid grid-cols-1 gap-4">
                  {paycheckData.map((p, idx) => {
                    const initials = p.name ? p.name.substring(0, 2).toUpperCase() : 'KR';
                    const isSignerSelf = signerName && p.name.toLowerCase() === signerName.toLowerCase();
                    return (
                      <div key={idx} className="bg-slate-950/40 border border-slate-800 rounded-3xl p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-slate-700 transition-all">
                        {/* Teammate Bio */}
                        <div className="flex items-center gap-3.5 flex-1">
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-950 border-2 border-slate-800 flex items-center justify-center font-black text-sm text-pink-500 tracking-wider shrink-0">
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-black text-slate-100 uppercase tracking-tight truncate max-w-[200px]">{p.name}</span>
                              {isSignerSelf && (
                                <span className="bg-pink-500/10 text-pink-400 px-2 py-0.5 rounded-md text-[8px] font-black border border-pink-500/20 uppercase tracking-widest shrink-0">PJ Pembuat</span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 font-bold mt-0.5 truncate">
                              {p.jobsCount} Kali Terdaftar Lapangan • Sisa Gaji Setelah Kasbon
                            </div>
                          </div>
                        </div>

                        {/* Breakdown math details table */}
                        <div className="w-full md:w-auto flex flex-wrap gap-4 md:gap-8 justify-between text-right">
                          <div className="text-left md:text-right">
                            <span className="block text-[8px] font-black text-slate-500 uppercase tracking-widest">BAGIAN BRUTO</span>
                            <span className="text-xs font-bold text-slate-300">Rp {Math.round(p.grossHonor).toLocaleString('id-ID')}</span>
                          </div>

                          <div className="text-left md:text-right">
                            <span className="block text-[8px] font-black text-slate-500 uppercase tracking-widest font-mono">DIPOTONG KASBON</span>
                            <span className="text-xs font-bold text-pink-400 font-mono">-Rp {p.totalKasbon.toLocaleString('id-ID')}</span>
                          </div>

                          <div className="text-left md:text-right">
                            <span className="block text-[8px] font-black text-emerald-400 uppercase tracking-widest">SISA BERSIH DITERIMA</span>
                            <span className="text-sm font-black text-emerald-400">Rp {Math.round(p.netPay).toLocaleString('id-ID')}</span>
                          </div>
                        </div>

                        {/* Slip Copy & Action trigger */}
                        <div className="w-full md:w-auto flex justify-end gap-2 shrink-0 border-t border-slate-800/60 pt-3 md:pt-0 md:border-none">
                          <button
                            type="button"
                            onClick={() => {
                              const slipText = `💵 *SLIP GAJI BULANAN (REKAP SENYO)*\n*Periode*: ${ID_MONTHS[selectedMonth - 1]} ${selectedYear}\n*Personil*: *${p.name}*\n*Status*: ${isBookClosed ? "✅ LUNAS & DITRANSFER (TUTUP BUKU)" : "⚠️ BELUM TUTUP BUKU (DRAFT)"}\n---------------------------------------------\n• Kehadiran: *${p.jobsCount} Pekerjaan*\n• Honor Kotor Share: *Rp ${Math.round(p.grossHonor).toLocaleString('id-ID')}*\n• Potongan Kasbon: *-Rp ${p.totalKasbon.toLocaleString('id-ID')}*\n---------------------------------------------\n*SISA NET DIBAYAR: Rp ${Math.round(p.netPay).toLocaleString('id-ID')}*\n---------------------------------------------\nTerima kasih atas dedikasinya di lapangan bray! 🙏`;
                              navigator.clipboard.writeText(slipText).then(() => {
                                setCopiedSlipName(p.name);
                                setTimeout(() => setCopiedSlipName(null), 2000);
                              });
                            }}
                            className={`py-2 px-3.5 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all w-full md:w-auto cursor-pointer ${
                              copiedSlipName === p.name
                                ? 'bg-emerald-500 border border-emerald-400 text-slate-950 font-black'
                                : 'bg-slate-900 border-2 border-slate-800 hover:bg-slate-800 text-slate-300'
                            }`}
                          >
                            {copiedSlipName === p.name ? (
                              <>
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                                <span>Tersalin!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5 text-pink-500" />
                                <span>Salin Slip WA</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* FOOTER TERM WARNING */}
              <div className="text-[10px] text-slate-400 bg-slate-950/40 border border-slate-800 p-4 rounded-3xl leading-relaxed">
                <span className="font-black text-slate-300 uppercase tracking-wider block mb-1">DOKUMEN VALID DENGAN MATA UANG RUPIAH (Rp):</span>
                Gaji dihitung otomatis dengan membagi anggaran event secara merata di antara kru yang bertindak (solo event diberikan 100% kepada PJ pembuat atau dihitung Mandiri). Pinjaman kasbon kru langsung dipotong otomatis dari anggaran sisa bersih untuk meringankan beban pembukuan bendahara. Sisa bersih merupakan nilai mata uang resmi yang sah ditransfer ke personil terdaftar.
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Preview banner inside app */}
              <div className="flex items-center justify-between px-1.5 print:hidden">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                  <FileText className="w-4.5 h-4.5 text-pink-500 animate-pulse" /> PREVIEW REKAP SHEET A4 UNTUK PERUSAHAAN
                </span>
                <span className="text-[10px] text-slate-500 font-bold hidden sm:inline">Ukuran proporsional: A4 Standar (210 x 297 mm)</span>
              </div>

              {/* Actual Print Sheet Container. Highly optimized styles using pure CSS and Tailwind print variables. */}
              <div 
                id="a4-printable-sheet" 
                className="w-full max-w-[210mm] mx-auto bg-white text-slate-900 border border-slate-200 rounded-2xl shadow-2xl p-[12mm] sm:p-[18mm] min-h-[297mm] h-auto flex flex-col justify-between print:rounded-none print:shadow-none print:border-none print:mx-0 print:w-full print:max-w-none print:min-h-screen relative overflow-visible"
                style={{
                  fontFamily: '"Inter", sans-serif',
                  color: '#1e293b' // deep slate-800
                }}
              >
            {/* IN-APP WATERMARK HELPER (Invisible in print, tells developer it's simulation) */}
            <div className="absolute top-2.5 right-2.5 border border-pink-500/20 bg-pink-50 text-[8px] font-black text-pink-500 uppercase tracking-wider px-2 py-0.5 rounded-md print:hidden opacity-75">
              Live A4 Sheet Preview
            </div>

            {/* WATERMARK LOCKED STAMP (Visible if Tudup Buku is true) */}
            {isBookClosed && (
              <div className="absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 border-[5px] border-dashed border-red-500/25 bg-red-100/5 text-[32px] font-black text-red-500/30 uppercase tracking-widest px-8 py-5 rounded-3xl -rotate-12 pointer-events-none select-none flex flex-col items-center justify-center gap-1 z-20 font-mono">
                <div className="flex items-center gap-2">
                  <Lock className="w-8 h-8 opacity-45 text-red-500" /> 
                  <span>ARSIP FINAL</span>
                </div>
                <span className="text-xs font-black tracking-widest text-red-500/50">TUTUP BUKU &amp; REKAP SAH</span>
              </div>
            )}

            <div>
              {/* HEADER AREA */}
              <div className="flex justify-between items-start border-b-4 border-slate-900 pb-5 mb-5">
                <div>
                  <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight font-sans">
                    LAPORAN DINAS BULANAN
                  </h1>
                  <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 mt-0.5 animate-pulse">
                    SENYO - RINGKASAN REKAP GAWEAN LAPANGAN
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-sm font-black text-slate-900 block font-mono">
                    ID: {selectedYear}{String(selectedMonth).padStart(2, '0')}
                  </span>
                  <span className="text-[9px] font-bold text-slate-500 block uppercase tracking-wider">
                    Periode: {ID_MONTHS[selectedMonth - 1]} {selectedYear}
                  </span>
                  {isBookClosed && (
                    <span className="text-[8px] font-black bg-red-500 text-white px-1.5 py-0.5 rounded-md inline-block uppercase tracking-wider mt-1">
                      🔒 CLOSED BOOK
                    </span>
                  )}
                </div>
              </div>

              {/* DETAILS METRICS BOX */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">DATA REKANAN</span>
                  <p className="text-[11px] font-semibold text-slate-600">
                    Pembuat Laporan: <strong className="text-slate-900 font-extrabold">{signerName}</strong>
                  </p>
                  <p className="text-[11px] font-semibold text-slate-600 mt-0.5">
                    Jabatan / Rujukan: <span className="text-slate-700">{signerRole}</span>
                  </p>
                </div>
                 <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">REKAP OPERASIONAL &amp; KASBON</span>
                  <p className="text-[11px] font-semibold text-slate-600">
                    Total Beres: <strong className="text-slate-900 font-extrabold">{completedMonthlyEvents.length} Pekerjaan Selesai</strong>
                  </p>
                  {monthlyKasbon.length > 0 && (
                    <p className="text-[11px] font-semibold text-slate-700 mt-1 flex justify-between items-center bg-orange-50 px-2 py-0.5 rounded-lg border border-orange-200/50">
                      <span>Total Kasbon Kru:</span>
                      <strong className="text-orange-650 font-black">Rp {totalMonthlyKasbon.toLocaleString('id-ID')}</strong>
                    </p>
                  )}
                </div>
              </div>

              {/* SECTION I: DETAILED WORK TABLE */}
              <div className="mb-6">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  Bagian 1: Daftar Catatan Kegiatan Lapangan Selesai ({completedMonthlyEvents.length})
                </h3>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b-[3px] border-slate-900 text-slate-800 text-[10px] uppercase tracking-wider font-extrabold">
                      <th className="py-2.5 px-2 font-black">Tanggal</th>
                      <th className="py-2.5 px-2 font-black">Kegiatan / Pekerjaan</th>
                      <th className="py-2.5 px-2 font-black">Partner Klien / Lokasi</th>
                      <th className="py-2.5 px-2 font-black">Teammates / Kru</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {completedMonthlyEvents.map((e) => (
                      <tr key={e.id} className="text-[11px] font-medium text-slate-600">
                        <td className="py-3 px-2 font-mono font-semibold">
                          {String(e.day).padStart(2, '0')}/{String(e.month).padStart(2, '0')}/{e.year}
                        </td>
                        <td className="py-3 px-2 font-extrabold text-slate-900">
                          {e.eventName}
                          {e.notes && (
                            <span className="block text-[9px] text-slate-400 font-normal italic mt-0.5 line-clamp-1">
                              &bull; {e.notes}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-2 uppercase font-black tracking-tight text-slate-700">
                          {e.location || 'Klien Umum'}
                        </td>
                        <td className="py-3 px-2 text-slate-600 text-xs">
                          {e.team && e.team.length > 0 ? e.team.join(', ') : 'Mandiri'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* SECTION II: DETAILED KASBON TRANSACTIONS */}
              {monthlyKasbon.length > 0 ? (
                <div className="mt-8 border-t-2 border-slate-900 pt-5 mb-6">
                  <div className="flex justify-between items-center mb-2.5">
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Coins className="w-4 h-4 text-orange-500 animate-pulse" />
                      Bagian 2: Lampiran Kasbon &amp; Pinjaman Kru ({monthlyKasbon.length} Transaksi)
                    </h3>
                  </div>
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b-[3px] border-slate-900 text-slate-800 text-[10px] uppercase tracking-wider font-extrabold">
                        <th className="py-2.5 px-2 font-black text-center w-8">No</th>
                        <th className="py-2.5 px-2 font-black">Tanggal</th>
                        <th className="py-2.5 px-2 font-black">Nama Kru</th>
                        <th className="py-2.5 px-2 font-black text-right">Jumlah (RP)</th>
                        <th className="py-2.5 px-2 font-black text-center">Metode</th>
                        <th className="py-2.5 px-2 pl-4 font-black">Keterangan Keperluan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {monthlyKasbon.map((kb, idx) => {
                        let dispKbDate = kb.date;
                        try {
                          const parts = kb.date.split('-');
                          dispKbDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
                        } catch (_) {}
                        return (
                          <tr key={kb.id} className="text-[11px] font-medium text-slate-600">
                            <td className="py-3 px-1 text-center font-mono text-slate-400">{idx + 1}</td>
                            <td className="py-3 px-2 font-mono whitespace-nowrap">{dispKbDate}</td>
                            <td className="py-3 px-2 font-extrabold text-slate-900 capitalize">{kb.teammateName}</td>
                            <td className="py-3 px-2 text-right font-mono font-black text-slate-950 whitespace-nowrap">
                              Rp {kb.amount.toLocaleString('id-ID')}
                            </td>
                            <td className="py-3 px-2 text-center text-[9px] font-black uppercase text-slate-600">{kb.method}</td>
                            <td className="py-3 px-2 pl-4 text-slate-500 italic text-[11px]">{kb.notes || '-'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="mt-8 border-t-2 border-slate-900 pt-5 mb-6 text-center">
                  <p className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider py-3 bg-slate-50 border border-dashed border-slate-200 rounded-xl">
                    Bagian 2: Nihil. Tidak ada transaksi kasbon aktif terdaftar pada bulan ini.
                  </p>
                </div>
              )}

              {/* FORMAL TERMS ACCORDING COMPANY NEED */}
              <div className="text-[10px] text-slate-400 leading-relaxed max-w-lg mb-6 py-2.5 px-4 bg-slate-50 rounded-xl border border-slate-100">
                <p className="font-semibold block text-slate-500 mb-0.5 uppercase tracking-wide text-[8px]">Ketentuan Pelaporan Dinas:</p>
                Daftar terlampir menggambarkan detail realisasi lapangan secara sah demi akurasi pelacakan perusahaan. Dokumentasi foto pendukung lengkap disimpan pada database lokal dan dapat dilihat pada lampiran digital. Silakan hubungi bagian administrasi personalia jika ditemukan ketidaksesuaian data kegiatan.
              </div>
            </div>

            {/* FORMAL SIGNATURE BLOCKS AT FOOTER */}
            <div className="flex justify-between items-end border-t border-slate-200 pt-5 mt-[30px]">
              <div className="text-left">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-4">DIVERIFIKASI OLEH</span>
                <span className="text-[10px] text-slate-300 block line-through">_______________________</span>
                <span className="text-[9px] text-slate-400 block font-bold font-mono">Manajemen Dinas / HRD</span>
              </div>
              <div className="text-right">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">TANDA TANGAN PEMBUAT</span>
                <span className="text-[11px] text-slate-900 block font-black uppercase tracking-tight">({signerName})</span>
                <span className="text-[9px] text-slate-500 block font-medium max-w-[180px] line-clamp-1 leading-none mt-1">
                  {signerRole}
                </span>
              </div>
            </div>

          </div>

        </div>
          )}
        </div>
      )}

      {/* EMBED PRINT SPECIFIC STYLES TO WEB SHELL HEAD DYNAMICALLY */}
      <style>{`
        @page {
          size: A4;
          margin: 10mm 10mm 10mm 10mm !important;
        }

        @media print {
          /* Hide non-print structures */
          header, 
          #app-main-header, 
          #app-main-footer,
          .print\\:hidden, 
          .no-print,
          #monthly-calc-settings,
          #monthly-calculator-panel > :not(.space-y-3), 
          #monthly-calculator-panel > .space-y-3 > :not(#a4-printable-sheet) {
            display: none !important;
          }

          /* Force global standard paper layouts */
          body, html, #root, #app-root-shell, #app-main-content-layout {
            background: white !important;
            color: #0f172a !important;
            padding: 0 !important;
            margin: 0 !important;
            min-height: auto !important;
            height: auto !important;
            width: 100% !important;
          }

          /* Reset Printable Page Area precisely without forcing mepet to the border */
          #a4-printable-sheet {
            display: block !important; /* switch from flex to block so multi-pages break naturally */
            border: none !important;
            box-shadow: none !important;
            box-sizing: border-box !important;
            padding: 6mm 5mm 15mm 5mm !important; /* page has safety margins, so layout has beautiful surrounding spaces */
            margin: 0 auto !important;
            width: 100% !important;
            max-width: 190mm !important; /* matches standard A4 printable horizontal path */
            height: auto !important; /* height grows naturally if data breaks to multiple pages */
            min-height: 277mm !important;
            aspect-ratio: auto !important;
            color: #0d1527 !important;
            background-color: white !important;
            overflow: visible !important;
            page-break-after: always !important;
          }

          /* General printable styles */
          table {
            border-collapse: collapse !important;
            width: 100% !important;
          }
          tr {
            page-break-inside: avoid !important;
          }
          th, td {
            color: #000000 !important;
            border-color: #cbd5e1 !important; /* border-slate-300 */
          }
        }
      `}</style>

    </div>
  );
}
