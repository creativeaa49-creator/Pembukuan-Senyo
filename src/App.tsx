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
  FileText
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

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load database on mount
  useEffect(() => {
    async function initDB() {
      setIsLoading(true);
      try {
        await seedInitialDataIfNeeded();
        await loadAllData();
      } catch (err) {
        console.error('Error initializing database:', err);
      } finally {
        setIsLoading(false);
      }
    }
    initDB();
  }, []);

  const loadAllData = async () => {
    const evs = await getAllEvents();
    const tms = await getAllTeammates();
    setEvents(evs);
    setTeammates(tms);
  };

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Event handlers
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
      
      showToast('Data pekerjaan berhasil disimpan secara aman di database lokal!');
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

    </div>
  );
}
