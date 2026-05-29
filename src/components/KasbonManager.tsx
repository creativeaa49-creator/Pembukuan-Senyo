/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  Coins, 
  Plus, 
  Trash2, 
  Search, 
  Calendar, 
  User, 
  CreditCard, 
  FileText, 
  Download, 
  AlertCircle, 
  CheckCircle2, 
  TrendingDown, 
  BaggageClaim,
  PiggyBank,
  ArrowDownCircle,
  HelpCircle
} from 'lucide-react';
import { Kasbon, KasbonMethod, Teammate } from '../types';

interface KasbonManagerProps {
  kasbonList: Kasbon[];
  teammates: Teammate[];
  onSaveKasbon: (kasbon: Kasbon) => Promise<void>;
  onDeleteKasbon: (id: string) => Promise<void>;
}

export default function KasbonManager({
  kasbonList,
  teammates,
  onSaveKasbon,
  onDeleteKasbon
}: KasbonManagerProps) {
  // Input states
  const [selectedTeammate, setSelectedTeammate] = useState<string>('');
  const [customName, setCustomName] = useState<string>('');
  const [isCustomName, setIsCustomName] = useState<boolean>(false);
  const [date, setDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [amount, setAmount] = useState<string>('');
  const [method, setMethod] = useState<KasbonMethod>('Transfer BCA');
  const [notes, setNotes] = useState<string>('');

  // UI state
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterMethod, setFilterMethod] = useState<string>('Semua');

  // Format Helper for IDR
  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val);
  };

  const handleTeammateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === '__MANUAL__') {
      setIsCustomName(true);
      setSelectedTeammate('');
    } else {
      setIsCustomName(false);
      setSelectedTeammate(val);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const finalName = isCustomName ? customName.trim() : selectedTeammate;

    if (!finalName) {
      setErrorMsg('Nama personil harus dipilih atau diisi secara manual.');
      return;
    }

    const numericAmount = parseFloat(amount.replace(/[^0-9]/g, ''));
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setErrorMsg('Jumlah kasbon harus berupa angka positif yang valid.');
      return;
    }

    const newKasbon: Kasbon = {
      id: 'kb-' + Math.random().toString(36).substring(2, 9),
      date,
      teammateName: finalName,
      amount: numericAmount,
      method,
      notes: notes.trim(),
      createdAt: new Date().toISOString()
    };

    try {
      await onSaveKasbon(newKasbon);
      
      // Reset Form fields
      setAmount('');
      setNotes('');
      if (isCustomName) {
        setCustomName('');
      }
      setSuccessMsg(`Berhasil mencatat kasbon Rp ${numericAmount.toLocaleString('id-ID')} untuk ${finalName}!`);
      
      // Auto-dismiss success message after 3 seconds
      setTimeout(() => {
        setSuccessMsg('');
      }, 4000);
    } catch (err: any) {
      setErrorMsg('Gagal menyimpan kasbon: ' + err.message);
    }
  };

  // Filtered and searched kasbon list
  const filteredKasbonList = useMemo(() => {
    return kasbonList.filter(item => {
      const matchSearch = item.teammateName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (item.notes || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchMethod = filterMethod === 'Semua' || item.method === filterMethod;
      return matchSearch && matchMethod;
    });
  }, [kasbonList, searchQuery, filterMethod]);

  // Compute stats on filtered list or whole list (let's do whole list for absolute bookkeeping accuracy)
  const stats = useMemo(() => {
    let total = 0;
    let bca = 0;
    let gopay = 0;
    let cash = 0;
    let lainnya = 0;

    const personSummary: Record<string, number> = {};

    kasbonList.forEach(item => {
      total += item.amount;
      if (item.method === 'Transfer BCA') bca += item.amount;
      else if (item.method === 'Gopay') gopay += item.amount;
      else if (item.method === 'Cash') cash += item.amount;
      else lainnya += item.amount;

      personSummary[item.teammateName] = (personSummary[item.teammateName] || 0) + item.amount;
    });

    // Sort individuals with highest kasbon
    const topDebtors = Object.entries(personSummary)
      .map(([name, sum]) => ({ name, sum }))
      .sort((a, b) => b.sum - a.sum);

    return { total, bca, gopay, cash, lainnya, topDebtors };
  }, [kasbonList]);

  // Handle Export to CSV/JSON format helper
  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(kasbonList, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `Backup_Kasbon_Senyo_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div id="kasbon-manager-tab-panel" className="space-y-6">
      
      {/* HEADER EXPLANATION */}
      <div className="bg-gradient-to-r from-orange-500/10 via-amber-500/5 to-transparent border-l-4 border-orange-500 p-4 rounded-r-3xl bg-slate-900/40">
        <div className="flex gap-3">
          <Coins className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-xs font-black uppercase text-orange-400 tracking-wider">Sistem Buku Catatan Kasbon (Uang Muka)</h3>
            <p className="text-xs text-slate-300 leading-relaxed mt-1 font-medium">
              Kelola uang muka, bon, atau kasbon operasional crew lapangan di sini secara terpusat. Data kasbon akan diakumulasikan dan dapat dipotong langsung saat perhitungan rekap upah bersih bulanan.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* COL 1: FORM CATAT KASBON BARU (4 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-slate-900 border-2 border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl shadow-black/25 relative overflow-hidden border-b-8 border-b-slate-800">
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-100 flex items-center gap-2 mb-4">
              <Plus className="w-4 h-4 text-orange-500" />
              Catat Kasbon Baru
            </h3>

            {errorMsg && (
              <div className="flex gap-2 p-3 bg-pink-500/10 border-2 border-pink-500/20 text-pink-400 rounded-2xl text-[11px] font-black uppercase tracking-wider mb-4 items-center animate-fade-in">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {errorMsg}
              </div>
            )}

            {successMsg && (
              <div className="flex gap-2 p-3 bg-emerald-500/10 border-2 border-emerald-500/20 text-emerald-400 rounded-2xl text-[11px] font-black uppercase tracking-wider mb-4 items-center animate-fade-in">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                {successMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* SELECT PERSONIL */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5 flex items-center justify-between">
                  <span>Pilih Crew / Personil</span>
                  <span className="text-slate-500 text-[9px] font-semibold dark:text-slate-600">Terdaftar di Roster</span>
                </label>
                
                <select
                  value={isCustomName ? '__MANUAL__' : selectedTeammate}
                  onChange={handleTeammateChange}
                  className="w-full h-11 px-3 border-2 border-slate-800 bg-slate-950 rounded-2xl text-xs font-bold text-slate-100 focus:outline-none focus:border-orange-500 focus:bg-slate-900 transition-all cursor-pointer font-mono"
                >
                  <option value="">-- Pilih Crew --</option>
                  {teammates.filter(t => t.isActive).map(t => (
                    <option key={t.id} value={t.name}>{t.name} ({t.role || 'Kru'})</option>
                  ))}
                  <option value="__MANUAL__">✍️ Ketik Nama Manual...</option>
                </select>
              </div>

              {/* MANUAL INPUT FALLBACK */}
              {isCustomName && (
                <div className="animate-fade-in">
                  <label className="block text-[10px] font-black uppercase tracking-wider text-orange-400 mb-1.5">
                    Nama Lengkap Manual
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Contoh: Budi Santoso"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      className="w-full h-11 pl-10 pr-4 border-2 border-slate-800 bg-slate-950 rounded-2xl text-xs font-bold text-slate-100 focus:outline-none focus:border-orange-500 focus:bg-slate-900 transition-all font-mono"
                    />
                    <User className="absolute left-3.5 top-3.5 w-4.5 h-4.5 text-slate-500" />
                  </div>
                </div>
              )}

              {/* DATE PICKER */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                  Tanggal Kasbon
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full h-11 pl-10 pr-4 border-2 border-slate-800 bg-slate-950 rounded-2xl text-xs font-bold text-slate-100 focus:outline-none focus:border-orange-500 focus:bg-slate-900 transition-all font-mono"
                  />
                  <Calendar className="absolute left-3.5 top-3.5 w-4.5 h-4.5 text-slate-500" />
                </div>
              </div>

              {/* AMOUNT KASBON */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                  Jumlah Kasbon (Rupiah)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-3 text-xs font-black text-slate-500">Rp</span>
                  <input
                    type="number"
                    placeholder="Misal: 500000"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full h-11 pl-11 pr-4 border-2 border-slate-800 bg-slate-950 rounded-2xl text-xs font-bold text-slate-100 focus:outline-none focus:border-orange-500 focus:bg-slate-900 transition-all font-mono"
                  />
                </div>
                {amount && !isNaN(parseFloat(amount)) && (
                  <p className="text-[10px] text-emerald-400 font-bold mt-1.5 font-mono ml-1">
                    Setara: {formatRupiah(parseFloat(amount))}
                  </p>
                )}
              </div>

              {/* METODE PEMBAYARAN */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                  Metode Pengiriman Uang
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['Transfer BCA', 'Gopay', 'Cash', 'Lainnya'] as KasbonMethod[]).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMethod(m)}
                      className={`py-2 px-1 border-2 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
                        method === m
                          ? 'border-orange-500 bg-orange-500/10 text-orange-400 shadow-md shadow-orange-500/5'
                          : 'border-slate-800 hover:border-slate-750 bg-slate-950 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* NOTES */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                  Keterangan / Alasan Kasbon (Opsional)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Contoh: pinjam bensin mobil, jajan crew"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full h-11 pl-10 pr-4 border-2 border-slate-800 bg-slate-950 rounded-2xl text-xs font-bold text-slate-100 focus:outline-none focus:border-orange-500 focus:bg-slate-900 transition-all placeholder:text-slate-650"
                  />
                  <FileText className="absolute left-3.5 top-3.5 w-4.5 h-4.5 text-slate-500" />
                </div>
              </div>

              <button
                type="submit"
                className="w-full h-11 mt-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black uppercase tracking-wider text-xs rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-orange-500/10 transition-all cursor-pointer"
              >
                <Coins className="w-4 h-4" />
                Simpan Transaksi Kasbon
              </button>

            </form>
          </div>

          {/* BOX RINGKASAN REKAP KASBON PER PERSONIL */}
          <div className="bg-slate-900 border-2 border-slate-800 rounded-3xl p-5 shadow-xl shadow-black/20 space-y-3.5 border-b-8 border-b-slate-800">
            <div>
              <h4 className="text-xs font-black uppercase text-slate-100 tracking-wider flex items-center gap-2">
                <ArrowDownCircle className="w-4 h-4 text-orange-400" /> Akumulasi Kasbon Crew
              </h4>
              <p className="text-[10px] text-slate-400 font-semibold mt-0.5 leading-relaxed">
                Total pinjaman aktif yang masih berjalan dan harus dibayar lunas atau didebet.
              </p>
            </div>

            {stats.topDebtors.length === 0 ? (
              <div className="text-center py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Belum ada kasbon tercatat bray
              </div>
            ) : (
              <div className="max-h-[220px] overflow-y-auto pr-1 space-y-2 select-text scrollbar-thin">
                {stats.topDebtors.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center p-2.5 bg-slate-950 border border-slate-800 rounded-2xl hover:border-slate-700 transition-colors">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 bg-orange-500/10 text-orange-400 rounded-lg flex items-center justify-center text-[10px] font-black">
                        {idx + 1}
                      </div>
                      <span className="text-xs font-bold text-slate-200 capitalize truncate max-w-[140px]">
                        {item.name}
                      </span>
                    </div>
                    <span className="text-xs font-extrabold text-orange-400 font-mono">
                      {formatRupiah(item.sum)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* COL 2: MAIN BOARD AND STATS / LIST (7 cols) */}
        <div className="lg:col-span-7 space-y-6">

          {/* BENTO STATS FOR KASBON */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-900 border-2 border-slate-800 p-4 rounded-3xl flex flex-col justify-between border-b-8 border-b-indigo-500 shadow-md">
              <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">GRAND TOTAL</span>
              <span className="text-md sm:text-lg font-black text-slate-100 mt-2 font-mono truncate">{formatRupiah(stats.total)}</span>
              <span className="text-[8px] font-extrabold text-indigo-400 tracking-wider mt-1 uppercase">Seluruh Kru</span>
            </div>
            
            <div className="bg-slate-900 border-2 border-slate-800 p-4 rounded-3xl flex flex-col justify-between border-b-8 border-b-sky-500 shadow-md">
              <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">TRANSFER BCA</span>
              <span className="text-md sm:text-lg font-black text-slate-100 mt-2 font-mono truncate">{formatRupiah(stats.bca)}</span>
              <span className="text-[8px] font-extrabold text-sky-400 tracking-wider mt-1 uppercase">Sistem M-Banking</span>
            </div>

            <div className="bg-slate-900 border-2 border-slate-800 p-4 rounded-3xl flex flex-col justify-between border-b-8 border-b-emerald-500 shadow-md font-mono">
              <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">GOPAY PAY</span>
              <span className="text-md sm:text-lg font-black text-slate-100 mt-2 truncate">{formatRupiah(stats.gopay)}</span>
              <span className="text-[8px] font-extrabold text-emerald-400 tracking-wider mt-1 uppercase">Dompet Digital</span>
            </div>

            <div className="bg-slate-900 border-2 border-slate-800 p-4 rounded-3xl flex flex-col justify-between border-b-8 border-b-amber-500 shadow-md font-mono">
              <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">TUNAI (CASH)</span>
              <span className="text-md sm:text-lg font-black text-slate-100 mt-2 truncate">{formatRupiah(stats.cash)}</span>
              <span className="text-[8px] font-extrabold text-amber-400 tracking-wider mt-1 uppercase">Transaksi Langsung</span>
            </div>
          </div>

          {/* TABLE CATATAN KASBON */}
          <div className="bg-slate-900 border-2 border-slate-800 rounded-3xl shadow-xl shadow-black/25 overflow-hidden border-b-8 border-b-slate-800 flex flex-col">
            
            {/* TABLE FILTER BLOCK */}
            <div className="p-4 bg-slate-950/60 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3.5">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-100 flex items-center gap-2">
                <Coins className="w-4 h-4 text-orange-400" />
                Histori Transaksi ({filteredKasbonList.length})
              </h3>

              <div className="flex flex-wrap sm:flex-nowrap gap-2 items-center">
                {/* Search Bar query */}
                <div className="relative w-full sm:w-44">
                  <input
                    type="text"
                    placeholder="Cari crew/keterangan..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-8 pl-8 pr-2 border border-slate-800 bg-slate-950 rounded-xl text-[11px] font-bold text-slate-200 focus:outline-none focus:border-orange-500 focus:bg-slate-900 transition-all font-mono"
                  />
                  <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-500" />
                </div>

                {/* Filter Method */}
                <select
                  value={filterMethod}
                  onChange={(e) => setFilterMethod(e.target.value)}
                  className="h-8 px-2 border border-slate-800 bg-slate-950 text-[10px] font-black uppercase text-slate-350 rounded-xl focus:outline-none focus:border-orange-500 cursor-pointer"
                >
                  <option value="Semua">Semua Metode</option>
                  <option value="Transfer BCA">BCA Only</option>
                  <option value="Gopay">Gopay Only</option>
                  <option value="Cash">Cash Only</option>
                  <option value="Lainnya">Lainnya</option>
                </select>

                <button
                  type="button"
                  onClick={handleExportJSON}
                  className="h-8 px-2.5 bg-slate-800 hover:bg-slate-750 border border-slate-705 text-slate-300 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-colors"
                  title="Unduh Backup Kasbon JSON"
                >
                  <Download className="w-3.5 h-3.5 text-amber-400" />
                  <span>Backup</span>
                </button>
              </div>
            </div>

            {/* THE LIST ENGINE */}
            {filteredKasbonList.length === 0 ? (
              <div className="text-center py-16 px-4 space-y-2 select-none">
                <Coins className="w-10 h-10 text-slate-700 mx-auto stroke-[1.25]" />
                <p className="text-xs text-slate-400 font-extrabold uppercase tracking-widest mt-1">Belum Ada Kasbon</p>
                <p className="text-[11px] text-slate-500 max-w-sm mx-auto font-medium leading-relaxed leading-relaxed">
                  Tidak ada transaksi kasbon yang cocok dengan filter atau kata kunci pencarian bray. Silakan buat kasbon baru di panel kiri!
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[460px] scrollbar-thin select-text">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-850 bg-slate-950/20 text-[10px] font-black uppercase tracking-wider text-slate-450 font-mono">
                      <th className="py-3 px-4">Tanggal</th>
                      <th className="py-3 px-4">Nama Kru</th>
                      <th className="py-3 px-4 text-right">Jumlah</th>
                      <th className="py-3 px-4 text-center">Metode</th>
                      <th className="py-3 px-4">Keterangan</th>
                      <th className="py-3 px-4 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850">
                    {filteredKasbonList.map((item) => {
                      // Format date beautifully
                      let dispDate = item.date;
                      try {
                        const dObj = new Date(item.date);
                        if (!isNaN(dObj.getTime())) {
                          const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
                          dispDate = `${dObj.getDate()} ${months[dObj.getMonth()]} ${dObj.getFullYear()}`;
                        }
                      } catch(_) {}

                      return (
                        <tr 
                          key={item.id} 
                          className="hover:bg-slate-950/30 text-xs font-bold text-slate-300 transition-colors animate-fade-in"
                        >
                          <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px] text-slate-400">
                            {dispDate}
                          </td>
                          <td className="py-3 px-4 font-mono font-medium truncate max-w-[140px] text-slate-100 capitalize">
                            {item.teammateName}
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap font-mono text-orange-400 font-black">
                            {formatRupiah(item.amount)}
                          </td>
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <span className={`inline-block text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                              item.method === 'Transfer BCA'
                                ? 'bg-sky-500/10 text-sky-400'
                                : item.method === 'Gopay'
                                ? 'bg-emerald-500/10 text-emerald-400'
                                : item.method === 'Cash'
                                ? 'bg-amber-500/10 text-amber-400'
                                : 'bg-slate-500/10 text-slate-400'
                            }`}>
                              {item.method === 'Transfer BCA' ? 'BCA' : item.method}
                            </span>
                          </td>
                          <td className="py-3 px-4 truncate max-w-[180px] text-[11px] text-slate-400" title={item.notes}>
                            {item.notes || '-'}
                          </td>
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`Hapus catatan kasbon ${item.teammateName} sejumlah ${formatRupiah(item.amount)}?`)) {
                                  onDeleteKasbon(item.id);
                                }
                              }}
                              className="p-1 px-2.5 bg-slate-950 hover:bg-pink-500/10 hover:text-pink-500 border border-slate-800 hover:border-pink-500/30 text-slate-500 rounded-lg text-[10px] font-bold cursor-pointer transition-all"
                            >
                              Hapus
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
