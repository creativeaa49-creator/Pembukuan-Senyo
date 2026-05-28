/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  ClipboardList, 
  LayoutDashboard, 
  FolderGit2, 
  Plus, 
  Users, 
  Download, 
  Upload, 
  Loader2, 
  ShieldCheck, 
  CheckCircle, 
  DatabaseBackup,
  Undo2,
  AlertTriangle,
  FileText,
  RefreshCw,
  Cloud,
  X
} from 'lucide-react';
import { JobEvent, Teammate } from './types';
import { 
  getAllEvents, 
  saveEvent, 
  deleteEvent, 
  getAllTeammates, 
  saveTeammate, 
  deleteTeammate, 
  seedInitialDataIfNeeded,
  resetToDefaults 
} from './lib/db';
import { exportToJSONFile } from './lib/utils';
import { pullFromSheets, pushToSheets, testConnection as testSheetsConnection } from './lib/sheetsSync';

import Dashboard from './components/Dashboard';
import EventForm from './components/EventForm';
import EventList from './components/EventList';
import EventDetail from './components/EventDetail';
import TeammateManager from './components/TeammateManager';
import { MonthlyCalculator } from './components/MonthlyCalculator';

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'events' | 'kalkulasi'>('dashboard');
  const [events, setEvents] = useState<JobEvent[]>([]);
  const [teammates, setTeammates] = useState<Teammate[]>([]);
  
  // Navigation & UI focus states
  const [viewingEvent, setViewingEvent] = useState<JobEvent | null>(null);
  const [editingEvent, setEditingEvent] = useState<JobEvent | null>(null);
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [isRosterOpen, setIsRosterOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Centralized Sheets Sync states
  const [isSyncModalOpen, setIsSyncModalOpen] = useState<boolean>(false);
  const [showSheetInstructions, setShowSheetInstructions] = useState<boolean>(false);
  const [isTestingConnection, setIsTestingConnection] = useState<boolean>(false);
  const [isPushingAll, setIsPushingAll] = useState<boolean>(false);
  const [testStatus, setTestStatus] = useState<{ type: 'success' | 'error' | ''; message: string }>({ type: '', message: '' });

  const [sheetUrl, setSheetUrl] = useState<string>(() => {
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

  const handleSaveSheetUrl = (url: string) => {
    const trimmed = url.trim();
    setSheetUrl(trimmed);
    localStorage.setItem('senyo_google_sheet_url', trimmed);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load database on mount
  useEffect(() => {
    async function initDB() {
      setIsLoading(true);
      try {
        await seedInitialDataIfNeeded();
        await loadAllData();
        // Auto-fetch/pull newest rows from Google Sheet to sync devices on start
        await syncPullFromGoogleSheets(true);
      } catch (err) {
        console.error('Error initializing database:', err);
      } finally {
        setIsLoading(false);
      }
    }
    initDB();
  }, [sheetUrl]);

  const loadAllData = async () => {
    const evs = await getAllEvents();
    const tms = await getAllTeammates();
    setEvents(evs);
    setTeammates(tms);
  };

  const testConnection = async () => {
    if (!sheetUrl) {
      setTestStatus({ type: 'error', message: 'Tolong masukkan URL Web App Apps Script bray!' });
      return;
    }
    setIsTestingConnection(true);
    setTestStatus({ type: '', message: '' });
    try {
      const message = await testSheetsConnection(sheetUrl);
      setTestStatus({ type: 'success', message });
    } catch (err: any) {
      console.error(err);
      setTestStatus({ type: 'error', message: err.message || 'Koneksi gagal bray. Periksa kembali URL dan pastikan Web App dideploy dengan akses "Siapa Saja (Anyone)".' });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const syncPullFromGoogleSheets = async (silent = true): Promise<void> => {
    if (!sheetUrl) return;

    if (!silent) setIsLoading(true);
    try {
      const remoteEvents = await pullFromSheets(sheetUrl);
      let importedCount = 0;
      
      for (const ev of remoteEvents) {
        await saveEvent(ev);
        importedCount++;
      }
      
      await loadAllData();
      if (importedCount > 0 && !silent) {
        showToast(`Sinkronisasi sukses! ${importedCount} data ditarik dari Google Sheets! 🚀`);
        setTestStatus({ type: 'success', message: `Berhasil menarik ${importedCount} data gawean dari Sheets secara realtime!` });
      } else if (!silent) {
        showToast('Database Google Sheets sinkron dengan device ini!');
        setTestStatus({ type: 'success', message: 'Device sudah sinkron dengan seluruh database di Google Sheets!' });
      }
    } catch (err: any) {
      console.error('Failed to pull from Google Sheets:', err);
      if (!silent) {
        showToast(err.message || 'Gagal memuat data dari Sheets. Pastikan Web App dideploy dengan benar.');
        setTestStatus({ type: 'error', message: err.message || 'Gagal sinkron data.' });
      }
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  const syncPushAllToGoogleSheets = async (): Promise<boolean> => {
    if (!sheetUrl) {
      setTestStatus({ type: 'error', message: 'Tolong masukkan URL Web App Apps Script bray!' });
      return false;
    }
    if (events.length === 0) {
      setTestStatus({ type: 'error', message: 'Tidak ada data pekerjaan lokal untuk disetorkan bray.' });
      return false;
    }
    setIsPushingAll(true);
    setTestStatus({ type: '', message: '' });
    
    // Group all local events to send in one payload
    const payload = {
      events: events.map(e => ({
        id: e.id,
        date: e.date,
        month: e.month,
        year: e.year,
        eventName: e.eventName,
        location: e.location || 'Pekerjaan Pribadi',
        team: e.team || [],
        notes: e.notes || ''
      }))
    };

    try {
      const success = await pushToSheets(sheetUrl, payload);
      if (success) {
        setTestStatus({ 
          type: 'success', 
          message: `Mantap bray! Seluruh basis data lokal (${events.length} Laporan Pekerjaan) sukses disetorkan ke Google Sheets Cloud!` 
        });
        showToast('Seluruh database berhasil tersimpan di Google Sheets!');
        return true;
      } else {
        throw new Error('Gagal menyimpan database.');
      }
    } catch (err: any) {
      console.error('Failed to push all events:', err);
      setTestStatus({ 
        type: 'error', 
        message: `Gagal mengirim basis data bray: ${err.message || 'Koneksi error.'}` 
      });
      return false;
    } finally {
      setIsPushingAll(false);
    }
  };

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Event handlers
  const autoSyncToGoogleSheets = async (event: JobEvent): Promise<boolean> => {
    if (!sheetUrl) return false;

    const payload = {
      events: [{
        id: event.id,
        date: event.date,
        month: event.month,
        year: event.year,
        eventName: event.eventName,
        location: event.location || 'Pekerjaan Pribadi',
        team: event.team || [],
        notes: event.notes || ''
      }]
    };

    try {
      return await pushToSheets(sheetUrl, payload);
    } catch (err) {
      console.error('Failed to auto-sync with Google Sheets:', err);
      return false;
    }
  };

  const handleSaveEvent = async (event: JobEvent) => {
    setIsLoading(true);
    try {
      await saveEvent(event);
      await loadAllData();
      setIsFormOpen(false);
      setEditingEvent(null);
      
      // If was viewing the event, update the viewed detail state
      if (viewingEvent && viewingEvent.id === event.id) {
        setViewingEvent(event);
      }
      
      // Auto sync with Google Sheets
      const syncSuccess = await autoSyncToGoogleSheets(event);
      if (syncSuccess) {
        showToast('Data berhasil di-input & otomatis disetorkan ke Google Sheets! 🚀');
      } else {
        showToast('Data berhasil disimpan secara lokal! (Gagal kirim ke Google Sheets)');
      }
    } catch (err) {
      console.error(err);
      showToast('Gagal menyimpan pekerjaan.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    setIsLoading(true);
    try {
      await deleteEvent(id);
      await loadAllData();
      if (viewingEvent?.id === id) {
        setViewingEvent(null);
      }
      showToast('Rekaman pekerjaan berhasil dihapus dari database.');
    } catch (err) {
      console.error(err);
      showToast('Gagal menghapus pekerjaan.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveTeammate = async (teammate: Teammate) => {
    try {
      await saveTeammate(teammate);
      await loadAllData();
      showToast(`Roster ${teammate.name} berhasil disimpan!`);
    } catch (err) {
      console.error(err);
      showToast('Gagal menyimpan personil.');
    }
  };

  const handleAddTeammateByName = async (name: string) => {
    // Check if teammate exists
    const exists = teammates.some(t => t.name.toLowerCase() === name.toLowerCase());
    if (exists) return;
    
    const newTeammate: Teammate = {
      id: Math.random().toString(36).substring(2, 9),
      name,
      role: 'Anggota Lapangan',
      isActive: true
    };
    await handleSaveTeammate(newTeammate);
  };

  const handleDeleteTeammate = async (id: string) => {
    try {
      await deleteTeammate(id);
      await loadAllData();
      showToast('Personil dihapus dari kontak cepat roster.');
    } catch (err) {
      console.error(err);
      showToast('Gagal menghapus personil.');
    }
  };

  // Backup file export
  const handleExportData = () => {
    const backupPayload = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      events,
      teammates
    };
    const filename = `backup-pendataan-pekerjaan-${new Date().toISOString().substring(0,10)}.json`;
    exportToJSONFile(backupPayload, filename);
    showToast('Ekspor berkas cadangan database JSON sukses didownload.');
  };

  // Backup file import
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (!json.events || !Array.isArray(json.events)) {
          alert('Format cadangan tidak valid (Data kegiatan tidak ditemukan).');
          return;
        }

        setIsLoading(true);
        // Save events to DB
        for (const ev of json.events) {
          await saveEvent(ev);
        }

        // Save teammates if exists
        if (json.teammates && Array.isArray(json.teammates)) {
          for (const tm of json.teammates) {
            await saveTeammate(tm);
          }
        }

        await loadAllData();
        showToast('Restorasi berhasil! Seluruh data cadangan digabung ke database lokal.');
      } catch (err) {
        console.error('Error importing backup:', err);
        alert('Gagal membaca file cadangan. Pastikan file berformat .json valid.');
      } finally {
        setIsLoading(false);
        // Clear input element
        e.target.value = '';
      }
    };

    reader.readAsText(file);
  };

  return (
    <div id="app-root-shell" className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none antialiased">
      
      {/* GLOBAL TOAST BANNER */}
      {toastMessage && (
        <div 
          id="global-alert-toast" 
          className="fixed bottom-5 right-5 z-50 bg-slate-900 border border-pink-500/30 text-slate-200 text-xs font-semibold py-3 px-5 rounded-2xl shadow-2xl shadow-pink-500/5 flex items-center gap-2.5 max-w-sm hover:opacity-90 transition-opacity pointer-events-auto"
        >
          <CheckCircle className="w-4.5 h-4.5 text-pink-500 flex-shrink-0 animate-bounce" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* HEADER BAR */}
      <header id="app-main-header" className="bg-slate-900 border-b-4 border-slate-800 sticky top-0 z-20 shadow-xl shadow-slate-950/30 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Logo Brand Title */}
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 bg-gradient-to-tr from-pink-500 to-orange-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-pink-500/10">
              <ClipboardList className="w-5.5 h-5.5" />
            </div>
            <div>
              <h1 className="text-lg sm:text-2xl font-black tracking-tight uppercase leading-none bg-gradient-to-r from-pink-500 to-orange-400 bg-clip-text text-transparent">
                SENYO
              </h1>
              <span className="text-[10px] sm:text-xs text-slate-400 font-extrabold mt-1.5 block uppercase tracking-wide">
                List Gawean Selesai &amp; Job Pribadi Buat Laporan ke Kantor (No Drama)
              </span>
            </div>
          </div>

          {/* Quick Actions (Export, Import, Roster Management) */}
          <div className="flex flex-wrap items-center gap-2">
            
            {/* Quick date display */}
            <div className="bg-slate-950/85 border border-slate-800 px-3 py-2 rounded-xl text-slate-400 font-black text-[10px] uppercase tracking-wider hidden sm:block">
              {new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
            </div>

            {/* Sync Cloud Setup & Operations Button */}
            <button
              onClick={() => {
                setIsSyncModalOpen(true);
                setTestStatus({ type: '', message: '' });
              }}
              className="h-10 px-3.5 bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-800/60 rounded-xl text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5 transition-all cursor-pointer animate-pulse hover:animate-none"
              title="Pusat Sinkronisasi Google Sheets"
            >
              <Cloud className="w-4 h-4 text-emerald-400" />
              <span>Sinkronisasi Cloud</span>
            </button>

            {/* Roster management button */}
            <button
              onClick={() => {
                setIsRosterOpen(true);
                setViewingEvent(null);
                setIsFormOpen(false);
              }}
              className="h-10 px-3.5 bg-slate-800 hover:bg-slate-750 border border-slate-700/80 rounded-xl text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5 transition-all cursor-pointer hover:text-slate-100"
            >
              <Users className="w-4 h-4 text-pink-500" />
              <span>Roster Tim</span>
            </button>

            {/* Reset to Senyo defaults button */}
            <button
              onClick={async () => {
                if (window.confirm("Yakin ingin reset basis data ke list Pekerjaan Senyo bawaan (CORO.AI & AVACINEMA)? data saat ini akan ditimpa.")) {
                  setIsLoading(true);
                  try {
                    await resetToDefaults();
                    await loadAllData();
                    showToast("Basis data berhasil direset ke Pekerjaan Senyo (CORO.AI & AVACINEMA)!");
                  } catch (err) {
                    console.error(err);
                    showToast("Gagal melakukan reset data.");
                  } finally {
                    setIsLoading(false);
                  }
                }
              }}
              className="h-10 px-3 flex items-center gap-1.5 bg-slate-800 hover:bg-pink-950/40 border border-slate-700/80 hover:border-pink-500/30 rounded-xl text-xs font-black uppercase tracking-wider text-slate-300 hover:text-pink-400 transition-all cursor-pointer"
              title="Reset ke Laporan Bawaan Senyo"
            >
              <DatabaseBackup className="w-4 h-4 text-pink-500 animate-pulse" />
              <span>Reset Senyo</span>
            </button>

            <div className="h-6 w-[1px] bg-slate-800 mx-1 hidden sm:block" />

            <button
              onClick={handleExportData}
              className="h-10 px-3 bg-slate-800 hover:bg-slate-750 border border-slate-705 rounded-xl text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5 transition-all cursor-pointer"
              title="Ekspor seluruh data ke file JSON"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span className="hidden md:inline">Ekspor</span>
            </button>

            <button
              onClick={handleImportClick}
              className="h-10 px-3 bg-slate-800 hover:bg-slate-750 border border-slate-705 rounded-xl text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5 transition-all cursor-pointer"
              title="Impor data dari file backup JSON"
            >
              <Upload className="w-4 h-4 text-amber-400" />
              <span className="hidden md:inline">Impor</span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImportFileChange}
              accept=".json"
              className="hidden"
            />

          </div>

        </div>
      </header>

      {/* PRIMARY CONTAINER */}
      <main id="app-main-content-layout" className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 md:py-8 space-y-6">
        
        {/* LOADING INDICATOR MODULE */}
        {isLoading && (
          <div className="p-4 bg-slate-900 border-2 border-slate-800 rounded-2xl flex items-center justify-between text-slate-300 font-medium text-xs shadow-xl animate-pulse print:hidden">
            <span className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-pink-500" />
              Mengakses sinkronisasi basis data lokal...
            </span>
            <span className="text-[10px] uppercase font-black text-slate-500 tracking-wider">IndexedDB Aktif</span>
          </div>
        )}

        {/* DECIDE MODES (Form vs Details vs Roster vs Tabs) */}
        {isFormOpen ? (
          /* FORM ENTRY SCREEN */
          <div className="space-y-4 print:hidden">
            <button
              onClick={() => {
                setIsFormOpen(false);
                setEditingEvent(null);
              }}
              className="flex items-center gap-1.5 text-xs text-slate-405 hover:text-pink-500 font-extrabold ml-1.5 cursor-pointer uppercase tracking-wider transition-colors"
            >
              <Undo2 className="w-4 h-4 text-pink-500" /> Batal dan Kembali
            </button>
            
            <EventForm
              onSave={handleSaveEvent}
              onCancel={() => {
                setIsFormOpen(false);
                setEditingEvent(null);
              }}
              initialEvent={editingEvent || undefined}
              availableTeammates={teammates}
              onAddTeammate={handleAddTeammateByName}
            />
          </div>
        ) : viewingEvent ? (
          /* DETAIL SCREEN VIEW */
          <div className="space-y-4">
            <button
              onClick={() => setViewingEvent(null)}
              className="flex items-center gap-1.5 text-xs text-slate-405 hover:text-pink-500 font-extrabold ml-1.5 cursor-pointer uppercase tracking-wider transition-colors print:hidden"
            >
              <Undo2 className="w-4 h-4 text-pink-500" /> Kembali ke Daftar Utama
            </button>

            <EventDetail
              event={viewingEvent}
              onClose={() => setViewingEvent(null)}
              onEdit={(ev) => {
                setEditingEvent(ev);
                setIsFormOpen(true);
                setViewingEvent(null);
              }}
              onDelete={handleDeleteEvent}
            />
          </div>
        ) : isRosterOpen ? (
          /* ROSTER MANAGEMENT SCREEN */
          <div className="space-y-4 print:hidden">
            <button
              onClick={() => setIsRosterOpen(false)}
              className="flex items-center gap-1.5 text-xs text-slate-405 hover:text-pink-500 font-extrabold ml-1.5 cursor-pointer uppercase tracking-wider transition-colors"
            >
              <Undo2 className="w-4 h-4 text-pink-500" /> Tutup Roster Tim
            </button>

            <TeammateManager
              teammates={teammates}
              onSaveTeammate={handleSaveTeammate}
              onDeleteTeammate={handleDeleteTeammate}
              onClose={() => setIsRosterOpen(false)}
            />
          </div>
        ) : (
          /* STANDARD DASHBOARD / SEARCHING GRID TABS LIST */
          <div className="space-y-6 print:hidden">
            
            {/* Tab Controls & Add Action button */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-2.5">
              
               {/* Visual Segment Tabs */}
              <div className="flex gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-2xl max-w-max">
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                    activeTab === 'dashboard'
                      ? 'bg-slate-800 text-slate-50 border border-slate-700 shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4 text-pink-500" />
                  Dashboard
                </button>
                <button
                  onClick={() => setActiveTab('events')}
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                    activeTab === 'events'
                      ? 'bg-slate-800 text-slate-50 border border-slate-700 shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <FolderGit2 className="w-4 h-4 text-amber-500" />
                  Buku Catatan ({events.length})
                </button>
                <button
                  onClick={() => setActiveTab('kalkulasi')}
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                    activeTab === 'kalkulasi'
                      ? 'bg-slate-800 text-slate-50 border border-slate-700 shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <FileText className="w-4 h-4 text-emerald-400" />
                  Laporan Bulanan
                </button>
              </div>

              {/* Master call-to-action */}
              <button
                onClick={() => setIsFormOpen(true)}
                className="h-11 px-5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black uppercase tracking-wider text-xs rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-orange-500/10 active:scale-95 transition-all cursor-pointer"
              >
                <Plus className="w-4.5 h-4.5 stroke-[2.5]" />
                Tambah Catatan Baru
              </button>

            </div>

            {/* Render Tab Components */}
            {activeTab === 'dashboard' ? (
              <Dashboard 
                events={events} 
                onSelectEvent={(ev) => setViewingEvent(ev)} 
              />
            ) : activeTab === 'events' ? (
              <EventList
                events={events}
                onSelectEvent={(ev) => setViewingEvent(ev)}
                onEditEvent={(ev) => {
                  setEditingEvent(ev);
                  setIsFormOpen(true);
                }}
                onDeleteEvent={handleDeleteEvent}
              />
            ) : (
              <MonthlyCalculator
                events={events}
                sheetUrl={sheetUrl}
                onSheetUrlChange={handleSaveSheetUrl}
              />
            )}

          </div>
        )}

      </main>

      {/* FOOTER COOPERATING BAR */}
      <footer id="app-main-footer" className="border-t border-slate-800 bg-slate-900/40 py-6 mt-12 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-4 text-center text-[10px] md:text-xs text-slate-400 font-semibold font-mono">
          <div className="flex items-center gap-1.5 justify-center">
            <ShieldCheck className="w-4.5 h-4.5 text-pink-500 animate-pulse" />
            <span>Koneksi Database Terenkripsi Lokal (IndexedDB) Aktif Secara Privat</span>
          </div>
          <div>
            <span>Pendataan Pekerjaan &copy; {new Date().getFullYear()} &bull; Disusun Mandiri</span>
          </div>
        </div>
      </footer>

      {/* Bottom Bar Decoration */}
      <div className="h-4 w-full bg-gradient-to-r from-indigo-500 via-pink-500 to-orange-500 print:hidden shrink-0"></div>

      {/* CLOUD SYNC HUB MODAL */}
      {isSyncModalOpen && (
        <div id="sync-hub-modal" className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto animate-fade-in print:hidden">
          <div className="bg-slate-900 border-2 border-slate-800 rounded-3xl max-w-2xl w-full p-6 md:p-8 space-y-6 shadow-2xl relative select-text">
            
            {/* Close Button */}
            <button 
              onClick={() => {
                setIsSyncModalOpen(false);
                setTestStatus({ type: '', message: '' });
              }}
              className="absolute top-4 right-4 text-slate-450 hover:text-slate-100 p-2 cursor-pointer hover:bg-slate-800 rounded-xl transition-all"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Title */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-950/60 border border-emerald-800/80 flex items-center justify-center">
                <Cloud className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="text-left">
                <h3 className="text-sm sm:text-lg font-black uppercase tracking-tight text-slate-100 flex items-center gap-1.5">
                  Pusat Sinkronisasi Cloud
                </h3>
                <p className="text-[10px] sm:text-xs text-slate-400 font-extrabold">Backup &amp; sinkronkan basis data dengan Google Sheets secara realtime bray!</p>
              </div>
            </div>

            {/* URL Form Section */}
            <div className="bg-slate-950/40 p-4 border border-slate-800/80 rounded-2xl space-y-3">
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-450 leading-none text-left">
                URL Google Apps Script Web App (Webhook)
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={sheetUrl}
                  onChange={(e) => handleSaveSheetUrl(e.target.value)}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  className="flex-1 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-xs font-mono text-slate-200 placeholder:text-slate-755 placeholder:font-sans focus:outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={testConnection}
                  disabled={isTestingConnection}
                  className="bg-slate-800 hover:bg-slate-750 text-slate-250 border border-slate-705 px-4 h-10 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isTestingConnection ? 'animate-spin' : ''}`} />
                  <span>Cek Koneksi</span>
                </button>
              </div>
            </div>

            {/* Operational Sync Buttons */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Box Pull */}
              <div className="bg-slate-950/20 border border-slate-800 p-4 rounded-2xl flex flex-col justify-between text-left">
                <div>
                  <h4 className="text-xs font-black text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    📥 Ambil Dari Cloud (Pull)
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                    Menarik seluruh data pekerjaan dari Google Sheets dan memasukkannya ke penyimpanan lokal device ini bray.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    await syncPullFromGoogleSheets(false);
                  }}
                  disabled={isLoading}
                  className="mt-4 w-full h-10 bg-indigo-950/40 hover:bg-indigo-900/60 border border-indigo-850 rounded-xl text-xs font-black uppercase tracking-wider text-indigo-400 flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                >
                  <Download className="w-4 h-4" /> Tarik Semua Data
                </button>
              </div>

              {/* Box Push */}
              <div className="bg-slate-950/20 border border-slate-800 p-4 rounded-2xl flex flex-col justify-between text-left">
                <div>
                  <h4 className="text-xs font-black text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    📤 Setor ke Cloud (Push ALL)
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                    Kirim basis data lokal ({events.length} Laporan Pekerjaan) di device ini ke Google Sheets saat ini juga bray.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={syncPushAllToGoogleSheets}
                  disabled={isPushingAll || events.length === 0}
                  className="mt-4 w-full h-10 bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-800/80 rounded-xl text-xs font-black uppercase tracking-wider text-emerald-450 flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                >
                  <Upload className={`w-4 h-4 ${isPushingAll ? 'animate-spin' : ''}`} /> Setor Semua Data
                </button>
              </div>

            </div>

            {/* Test connection results banner */}
            {testStatus.message && (
              <div className={`p-3.5 rounded-2xl border flex items-start gap-2.5 text-xs font-extrabold leading-relaxed text-left ${
                testStatus.type === 'success' 
                  ? 'bg-emerald-950/30 border-emerald-800/60 text-emerald-455' 
                  : 'bg-red-955/20 border-red-800/60 text-red-400'
              }`}>
                {testStatus.type === 'success' ? (
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5 animate-bounce" />
                )}
                <span>{testStatus.message}</span>
              </div>
            )}

            {/* Instruction Toggle */}
            <div className="pt-2 border-t border-slate-800 text-left">
              <button
                type="button"
                className="w-full text-left text-xs text-pink-400 hover:text-pink-300 font-extrabold cursor-pointer uppercase tracking-wider flex items-center justify-between"
                onClick={() => setShowSheetInstructions(!showSheetInstructions)}
              >
                <span>{showSheetInstructions ? '✖ Sembunyikan Panduan Deploy' : '⚙ Panduan Cara Atur Google Sheets'}</span>
              </button>
              
              {showSheetInstructions && (
                <div className="mt-3.5 text-xs text-slate-400 space-y-4 max-h-48 overflow-y-auto thin-scrollbar p-3 bg-slate-950/60 border border-slate-800/80 rounded-2xl leading-relaxed">
                  <ol className="list-decimal pl-4.5 space-y-2.5 font-bold">
                    <li>Buka Google Sheets Anda atau buat Sheet baru.</li>
                    <li>Sediakan sheet pertama di dokumen itu.</li>
                    <li>Klik menu <strong className="text-slate-100">Ekstensi &gt; Apps Script</strong>.</li>
                    <li>Hapus seluruh isi script bawaan, lalu paste kode Apps Script luar biasa (bisa disalin di tab Laporan Bulanan bray).</li>
                    <li>Klik <strong className="text-slate-100">Terapkan &gt; Penerapan Baru (Deploy &gt; New Deployment)</strong>.</li>
                    <li>Atur jenis penerapan ke <strong className="text-slate-100">Aplikasi Web (Web App)</strong>.</li>
                    <li>Atur <strong className="text-slate-100">Yang memiliki akses (Who has access)</strong> menjadi <strong className="text-pink-400">Siapa Saja (Anyone)</strong>. Hal ini penting agar aplikasi web ini bisa menyimpan data ke sheets tanpa harus login akun google lagi bray!</li>
                    <li>Klik Terapkan (Deploy), berikan izin akses google account anda.</li>
                    <li>Salin URL Aplikasi Web yang dihasilkan kemudian masukkan di kolom input atas bray!</li>
                  </ol>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
