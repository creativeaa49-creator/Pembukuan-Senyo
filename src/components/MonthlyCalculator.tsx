/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { JobEvent } from '../types';
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
  AlertTriangle
} from 'lucide-react';

interface MonthlyCalculatorProps {
  events: JobEvent[];
  sheetUrl?: string;
  onSheetUrlChange?: (url: string) => void;
}

const ID_MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export function MonthlyCalculator({ events, sheetUrl: propSheetUrl, onSheetUrlChange }: MonthlyCalculatorProps) {
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

  const handlePrint = () => {
    window.print();
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
          <button
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

      {/* HIGH-PRECISION REPLICA OF A4 REPORT SHEET (Interactive visual canvas & PRINT TARGET) */}
      {completedMonthlyEvents.length > 0 && (
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
            className="w-full max-w-[210mm] mx-auto bg-white text-slate-900 border border-slate-200 rounded-2xl shadow-2xl p-[15mm] sm:p-[20mm] aspect-[1/1.414] overflow-hidden flex flex-col justify-between print:rounded-none print:shadow-none print:border-none print:p-[15mm] print:mx-0 print:w-full print:max-w-none print:min-h-screen relative"
            style={{
              fontFamily: '"Inter", sans-serif',
              color: '#1e293b' // deep slate-800
            }}
          >
            {/* IN-APP WATERMARK HELPER (Invisible in print, tells developer it's simulation) */}
            <div className="absolute top-2.5 right-2.5 border border-pink-500/20 bg-pink-50 text-[8px] font-black text-pink-500 uppercase tracking-wider px-2 py-0.5 rounded-md print:hidden opacity-75">
              Live A4 Sheet Preview
            </div>

            <div>
              {/* HEADER AREA */}
              <div className="flex justify-between items-start border-b-4 border-slate-900 pb-5 mb-5">
                <div>
                  <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight font-sans">
                    LAPORAN DINAS BULANAN
                  </h1>
                  <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 mt-0.5">
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
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">SUB-REKAP KELAR</span>
                  <p className="text-[11px] font-semibold text-slate-600">
                    Total Beres: <strong className="text-slate-900 font-extrabold">{completedMonthlyEvents.length} Pekerjaan Selesai</strong>
                  </p>
                </div>
              </div>

              {/* DETAILED WORK TABLE */}
              <div className="mb-6">
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

              {/* FORMAL TERMS ACCORDING COMPANY NEED */}
              <div className="text-[10px] text-slate-400 leading-relaxed max-w-lg mb-6 py-2.5 px-4 bg-slate-50 rounded-xl border border-slate-100">
                <p className="font-semibold block text-slate-500 mb-0.5 uppercase tracking-wide text-[8px]">Ketentuan Pelaporan Dinas:</p>
                Daftar terlampir menggambarkan detail realisasi lapangan secara sah demi akurasi pelacakan perusahaan. Dokumentasi foto pendukung lengkap disimpan pada database lokal dan dapat dilihat pada lampiran digital. Silakan hubungi bagian administrasi personalia jika ditemukan ketidaksesuaian data kegiatan.
              </div>
            </div>

            {/* FORMAL SIGNATURE BLOCKS AT FOOTER */}
            <div className="flex justify-between items-end border-t border-slate-200 pt-5 mt-auto">
              <div className="text-left">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-4">DIVERIFIKASI OLEH</span>
                <span className="text-[10px] text-slate-300 block line-through">_______________________</span>
                <span className="text-[9px] text-slate-400 block font-bold font-mono">Manajemen Dinas / HRD</span>
              </div>
              <div className="text-right">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">TANDA TANGAN Pembuat</span>
                <span className="text-[11px] text-slate-900 block font-black uppercase tracking-tight">({signerName})</span>
                <span className="text-[9px] text-slate-500 block font-medium max-w-[180px] line-clamp-1 leading-none mt-1">
                  {signerRole}
                </span>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* EMBED PRINT SPECIFIC STYLES TO WEB SHELL HEAD DYNAMICALLY */}
      <style>{`
        @media print {
          /* Hide non-print structures */
          header, 
          #app-main-header, 
          #app-main-footer,
          .print\\:hidden, 
          .no-print,
          #monthly-calc-settings,
          #app-main-content-layout > :not(.space-y-3), 
          #app-main-content-layout > .space-y-3 > :not(#a4-printable-sheet) {
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

          /* Reset Printable Page Area precisely */
          #a4-printable-sheet {
            display: flex !important;
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            max-width: none !important;
            height: auto !important;
            min-height: auto !important;
            aspect-ratio: auto !important;
            color: #0f172a !important;
            background-color: white !important;
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
          }
        }
      `}</style>

    </div>
  );
}
