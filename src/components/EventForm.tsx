/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Calendar, Users, MapPin, FileText, Camera, Plus, X, Trash2, Check, Sparkles } from 'lucide-react';
import { JobEvent, EventPhoto, Teammate, EventStatus } from '../types';
import { MONTH_NAMES_ID, compressImage, splitDate } from '../lib/utils';

interface EventFormProps {
  onSave: (event: JobEvent) => void;
  onCancel: () => void;
  initialEvent?: JobEvent;
  availableTeammates: Teammate[];
  onAddTeammate?: (name: string) => Promise<void>;
}

export default function EventForm({
  onSave,
  onCancel,
  initialEvent,
  availableTeammates,
  onAddTeammate
}: EventFormProps) {
  // We represent Year-Month-Day internally. The user interface exposes split inputs.
  const [day, setDay] = useState<number>(new Date().getDate());
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1);
  const [year, setYear] = useState<number>(new Date().getFullYear());
  
  // Custom Date Input link
  const [calendarDate, setCalendarDate] = useState<string>(
    new Date().toISOString().substring(0, 10)
  );

  const [eventName, setEventName] = useState<string>('');
  const [location, setLocation] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [status, setStatus] = useState<EventStatus>('Selesai');
  const [selectedTeam, setSelectedTeam] = useState<string[]>([]);
  const [customTeammate, setCustomTeammate] = useState<string>('');
  const [photos, setPhotos] = useState<EventPhoto[]>([]);
  const [isCompressing, setIsCompressing] = useState<boolean>(false);
  const [dragOver, setDragOver] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state if editing
  useEffect(() => {
    if (initialEvent) {
      setDay(initialEvent.day);
      setMonth(initialEvent.month);
      setYear(initialEvent.year);
      setCalendarDate(initialEvent.date);
      setEventName(initialEvent.eventName);
      setLocation(initialEvent.location);
      setNotes(initialEvent.notes || '');
      setStatus(initialEvent.status);
      setSelectedTeam(initialEvent.team || []);
      setPhotos(initialEvent.photos || []);
    } else {
      // Default to today
      const today = new Date();
      setDay(today.getDate());
      setMonth(today.getMonth() + 1);
      setYear(today.getFullYear());
      setCalendarDate(today.toISOString().substring(0, 10));
    }
  }, [initialEvent]);

  // Handle auto-synced inputs from calendar
  const handleCalendarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCalendarDate(value);
    if (value) {
      const { day: d, month: m, year: y } = splitDate(value);
      setDay(d);
      setMonth(m);
      setYear(y);
    }
  };

  // Handle manual day, month, year changes
  const handleManualDateChange = (newDay: number, newMonth: number, newYear: number) => {
    setDay(newDay);
    setMonth(newMonth);
    setYear(newYear);

    // Format single digit date / values
    const mm = String(newMonth).padStart(2, '0');
    const dd = String(newDay).padStart(2, '0');
    // Ensure four digit year
    const yyyy = String(newYear).padStart(4, '0');
    
    // Validate if it is a correct calendar format
    const candidateStr = `${yyyy}-${mm}-${dd}`;
    const parsed = Date.parse(candidateStr);
    if (!isNaN(parsed)) {
      setCalendarDate(candidateStr);
    }
  };

  // Add custom teammate tags
  const handleAddCustomTeammate = async (e: React.FormEvent) => {
    e.preventDefault();
    const nameTrimmed = customTeammate.trim();
    if (!nameTrimmed) return;

    if (!selectedTeam.includes(nameTrimmed)) {
      setSelectedTeam([...selectedTeam, nameTrimmed]);
    }
    
    if (onAddTeammate) {
      // Background save to regular teammate listing for future convenience
      await onAddTeammate(nameTrimmed);
    }
    setCustomTeammate('');
  };

  // Toggle quick-select teammates
  const handleToggleTeammateCheckbox = (name: string) => {
    if (selectedTeam.includes(name)) {
      setSelectedTeam(selectedTeam.filter(t => t !== name));
    } else {
      setSelectedTeam([...selectedTeam, name]);
    }
  };

  // Handle file drops / uploads
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      await processFiles(e.target.files);
    }
  };

  const processFiles = async (fileList: FileList) => {
    setIsCompressing(true);
    const newPhotos: EventPhoto[] = [];

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      if (!file.type.startsWith('image/')) {
        alert('Tolong unggah file gambar saja.');
        continue;
      }

      try {
        const compressedBase64 = await compressImage(file, 1100, 0.75);
        newPhotos.push({
          id: Math.random().toString(36).substring(2, 9),
          base64: compressedBase64,
          name: file.name,
          size: file.size,
          uploadedAt: new Date().toISOString()
        });
      } catch (err) {
        console.error('Error compressing image:', err);
      }
    }

    setPhotos([...photos, ...newPhotos]);
    setIsCompressing(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files) {
      await processFiles(e.dataTransfer.files);
    }
  };

  const removePhoto = (id: string) => {
    setPhotos(photos.filter(p => p.id !== id));
  };

  // Form submit handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!eventName.trim()) {
      alert('Nama event harus diisi!');
      return;
    }

    if (!location.trim()) {
      alert('Lokasi event harus diisi!');
      return;
    }

    // Build standard date string YYYY-MM-DD representing selected split state
    const formattedY = String(year).padStart(4, '0');
    const formattedM = String(month).padStart(2, '0');
    const formattedD = String(day).padStart(2, '0');
    const finalDateStr = `${formattedY}-${formattedM}-${formattedD}`;

    const submissionEvent: JobEvent = {
      id: initialEvent?.id || Math.random().toString(36).substring(2, 11),
      date: finalDateStr,
      day,
      month,
      year,
      eventName: eventName.trim(),
      team: selectedTeam,
      location: location.trim(),
      notes: notes.trim(),
      photos,
      status,
      createdAt: initialEvent?.createdAt || new Date().toISOString()
    };

    onSave(submissionEvent);
  };

  return (
    <div id="event-form-card" className="bg-slate-900 border-2 border-slate-800 rounded-3xl shadow-2xl shadow-black/45 p-6 sm:p-8 max-w-4xl mx-auto animate-scale-up border-b-8 border-b-slate-800">
      <div className="flex border-b-2 border-slate-800 pb-4 mb-6 items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-100 uppercase tracking-tight gap-2 flex items-center">
            {initialEvent ? '✏️ Retouch Detail Laporan' : '📝 Catat Gawean Baru'}
          </h2>
          <p className="text-xs text-slate-400 font-semibold">
            Tinggal isi form di bawah buat nyimpen bukti joban, durasi/tanggal, tim tempur, dan dokumentasi visual.
          </p>
        </div>
        <button
          onClick={onCancel}
          type="button"
          className="p-2 rounded-xl border-2 border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-pink-400 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ROW 1: TANGGAL, BULAN, TAHUN */}
        <div id="date-group-card" className="p-5 bg-slate-950/45 border-2 border-slate-800 rounded-3xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 justify-between">
            <span className="text-xs font-black text-slate-300 uppercase tracking-widest flex items-center gap-1.5">
              <Calendar className="w-5 h-5 text-pink-500" /> Waktu Kegiatan
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400">Kalender:</span>
              <input
                type="date"
                value={calendarDate}
                onChange={handleCalendarChange}
                className="text-xs bg-slate-900 border-2 border-slate-800 rounded-xl px-3 py-1.5 text-slate-100 font-bold cursor-pointer focus:outline-none focus:border-pink-500"
              />
            </div>
          </div>

          <div id="manual-inputs-grid" className="grid grid-cols-3 gap-3 md:gap-4">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Tanggal (Hari)</label>
              <select
                value={day}
                onChange={(e) => handleManualDateChange(Number(e.target.value), month, year)}
                className="w-full h-11 border-2 border-slate-800 rounded-2xl bg-slate-900 px-3 font-mono text-sm font-black text-slate-100 focus:outline-none focus:border-pink-500 appearance-none shadow-xs cursor-pointer"
              >
                {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>
                    {String(d).padStart(2, '0')}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Bulan</label>
              <select
                value={month}
                onChange={(e) => handleManualDateChange(day, Number(e.target.value), year)}
                className="w-full h-11 border-2 border-slate-800 rounded-2xl bg-slate-900 px-3 text-sm font-black text-slate-100 focus:outline-none focus:border-pink-500 appearance-none shadow-xs cursor-pointer"
              >
                {MONTH_NAMES_ID.map((name, idx) => (
                  <option key={name} value={idx + 1}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Tahun</label>
              <input
                type="number"
                min="2010"
                max="2035"
                value={year}
                onChange={(e) => handleManualDateChange(day, month, Number(e.target.value))}
                className="w-full h-11 border-2 border-slate-800 rounded-2xl bg-slate-900 px-3 font-mono text-sm font-black text-slate-100 focus:outline-none focus:border-pink-500"
              />
            </div>
          </div>
        </div>

        {/* ROW 2: NAMA EVENT & LOKASI */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-slate-350 mb-2">
              Nama Event / Kegiatan <span className="text-pink-500 font-bold">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Contoh: Seminar Teknologi Masa Depan 2026"
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                required
                className="w-full h-12 pl-10 pr-4 border-2 border-slate-800 bg-slate-950 rounded-2xl text-sm font-bold text-slate-100 focus:outline-none focus:border-pink-500 placeholder:text-slate-650 focus:bg-slate-900 transition-all"
              />
              <FileText className="absolute left-3.5 top-3.5 w-4.5 h-4.5 text-slate-600" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-slate-350 mb-2">
              Lokasi Event / Gedung / Kota <span className="text-pink-500 font-bold">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Contoh: Jakarta Convention Center (JCC), Senayan"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                required
                className="w-full h-12 pl-10 pr-4 border-2 border-slate-800 bg-slate-950 rounded-2xl text-sm font-bold text-slate-100 focus:outline-none focus:border-pink-500 placeholder:text-slate-650 focus:bg-slate-900 transition-all"
              />
              <MapPin className="absolute left-3.5 top-3.5 w-4.5 h-4.5 text-pink-500" />
            </div>
          </div>
        </div>

        {/* ROW 3: STATUS KEGIATAN */}
        <div>
          <label className="block text-xs font-black uppercase tracking-widest text-slate-350 mb-2.5">
            Status Kegiatan Saat Ini
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(['Direncanakan', 'Berlangsung', 'Selesai'] as EventStatus[]).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatus(st)}
                className={`py-3 px-3 rounded-2xl border-2 text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  status === st
                    ? st === 'Selesai'
                      ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/15'
                      : st === 'Berlangsung'
                      ? 'bg-amber-500 border-amber-500 text-white shadow-lg shadow-amber-500/15'
                      : 'bg-indigo-650 border-indigo-650 text-white shadow-lg shadow-indigo-650/15'
                    : 'border-slate-800 bg-slate-950 hover:bg-slate-800 text-slate-400'
                }`}
              >
                {status === st && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* ROW 4: SIAPA AJA YANG JALAN (CREW LIST) */}
        <div id="crew-subcard" className="p-5 bg-slate-950/25 border-2 border-slate-800 rounded-3xl space-y-4">
          <label className="block text-xs font-black uppercase tracking-widest text-slate-300 flex items-center gap-1.5">
            <Users className="w-5 h-5 text-pink-500" /> Personil yang Bertugas
          </label>

          {/* Custom Crew Tag Creator */}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Tuliskan nama lalu klik '+ Tambah'..."
              value={customTeammate}
              onChange={(e) => setCustomTeammate(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddCustomTeammate(e)}
              className="flex-1 h-10 px-4 border-2 border-slate-800 bg-slate-900 rounded-xl text-xs font-bold text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-pink-500"
            />
            <button
              type="button"
              onClick={handleAddCustomTeammate}
              className="h-10 px-4 bg-indigo-600 hover:bg-pink-600 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-all shadow-lg"
            >
              <Plus className="w-4 h-4" /> Tambah
            </button>
          </div>

          {/* Quick-select checkbox list */}
          {availableTeammates.length > 0 && (
            <div className="space-y-2">
              <span className="text-[10px] font-black text-slate-450 uppercase tracking-widest block">
                Pilih Cepat dari Roster Tim Terdaftar:
              </span>
              <div id="teammate-checkbox-grid" className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {availableTeammates.map((teammate) => {
                  const isChecked = selectedTeam.includes(teammate.name);
                  return (
                    <button
                      key={teammate.id}
                      type="button"
                      onClick={() => handleToggleTeammateCheckbox(teammate.name)}
                      className={`flex items-center gap-2 p-2 border-2 rounded-2xl text-xs text-left transition-all cursor-pointer ${
                        isChecked
                          ? 'border-pink-500/20 bg-pink-500/5 text-pink-400 font-bold'
                          : 'border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800/80'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-lg flex items-center justify-center border-2 ${
                        isChecked ? 'border-pink-500 bg-pink-500 text-white' : 'border-slate-700 bg-slate-950'
                      }`}>
                        {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                      <span className="truncate flex-1 font-semibold">{teammate.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Chosen Team List Area */}
          <div className="pt-3 border-t-2 border-slate-850">
            <span className="text-[10px] font-black text-slate-450 uppercase tracking-widest block mb-2.5">
              Tim Terkait Di Kegiatan Ini ({selectedTeam.length} Personil):
            </span>
            {selectedTeam.length === 0 ? (
              <span className="text-xs text-slate-500 italic font-semibold">Belum ada tim terpilih (jalan mandiri).</span>
            ) : (
              <div id="selected-crew-chips" className="flex flex-wrap gap-2">
                {selectedTeam.map((name) => (
                  <span
                    key={name}
                    className="inline-flex items-center gap-1.5 bg-pink-500/10 text-pink-400 rounded-full font-black text-xs border border-pink-500/20 px-3.5 py-1.5"
                  >
                    + {name}
                    <button
                      type="button"
                      onClick={() => setSelectedTeam(selectedTeam.filter(t => t !== name))}
                      className="text-pink-400 hover:text-pink-300 rounded-full transition-colors ml-1 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ROW 5: CATATAN TAMBAHAN */}
        <div>
          <label className="block text-xs font-black uppercase tracking-widest text-slate-350 mb-2">
            Catatan Tambahan
          </label>
          <textarea
            placeholder="Tuliskan kendala, instruksi tambahan, detail pekerjaan yang berhasil diselesaikan, atau catatan logistik lainnya yang penting di sini..."
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full p-4 border-2 border-slate-800 rounded-2xl text-sm font-semibold text-slate-100 bg-slate-950 placeholder:text-slate-650 focus:bg-slate-900 focus:border-pink-500 focus:outline-none resize-none animate-scale-up"
          />
        </div>

        {/* ROW 6: FOTO DOKUMENTASI KEGIATAN */}
        <div id="photos-upload-card" className="space-y-4">
          <label className="block text-xs font-black uppercase tracking-widest text-slate-300 flex items-center gap-1.5">
            <Camera className="w-5 h-5 text-pink-500" /> Unggah Laporan Dokumentasi ({photos.length} Foto)
          </label>

          {/* Drag & Drop Area */}
          <div
            id="drag-drop-zone"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-4 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all ${
              dragOver
                ? 'border-pink-500 bg-pink-500/10'
                : 'border-slate-805 bg-slate-950/40 hover:bg-slate-950/80 hover:border-slate-700'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              multiple
              accept="image/*"
              className="hidden"
            />
            <div className="flex flex-col items-center gap-3">
              <div className="w-16 h-16 bg-pink-500/15 border border-pink-500/20 rounded-full flex items-center justify-center text-pink-400 shadow-lg shadow-pink-550/5">
                <Camera className="w-7 h-7" />
              </div>
              <div className="text-center">
                <p className="text-slate-200 font-extrabold text-base md:text-lg">Tarik Foto Dokumentasi ke Sini</p>
                <p className="text-slate-450 text-xs font-semibold mt-0.5">Atau klik untuk memilih file &bull; Maksimal 10MB (JPG, WebP, PNG)</p>
                <p className="text-[10px] text-slate-500 mt-1.5 max-w-sm mx-auto font-medium">Gambar akan otomatis dikompres demi keamanan memori lokal browser.</p>
              </div>
            </div>
          </div>

          {/* Compress Activity Status */}
          {isCompressing && (
            <div className="flex items-center gap-2 p-4 bg-slate-950/85 border-2 border-slate-800 rounded-2xl text-xs font-bold text-slate-405 animate-pulse">
              <span className="w-4 h-4 rounded-full border-2 border-pink-500 border-t-transparent animate-spin" />
              Mengompresi berkas foto... Silakan tunggu sejenak...
            </div>
          )}

          {/* Attached Photo Preview Grid */}
          {photos.length > 0 && (
            <div id="photo-preview-grid" className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 mt-4">
              {photos.map((p) => (
                <div
                  key={p.id}
                  id={`preview-photo-${p.id}`}
                  className="group relative bg-slate-950 rounded-2xl overflow-hidden border-2 border-slate-800 shadow-md aspect-square"
                >
                  <img
                    src={p.base64}
                    alt={p.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                  {/* Remove Overlay */}
                  <div className="absolute inset-0 bg-slate-950/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removePhoto(p.id);
                      }}
                      className="p-2 bg-pink-500 text-white rounded-xl hover:bg-pink-600 transition-colors shadow-lg cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  {/* Size chip */}
                  <div className="absolute bottom-1 right-1 bg-black/60 text-white font-mono text-[9px] px-1.5 py-0.5 rounded-lg leading-none select-none">
                    {(p.size / 1024).toFixed(0)} KB
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ACTIONS */}
        <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t-2 border-slate-850">
          <button
            onClick={onCancel}
            type="button"
            className="px-6 h-12 border-2 border-slate-800 hover:bg-slate-800 rounded-2xl text-sm font-black text-slate-350 transition-all cursor-pointer text-center uppercase tracking-wider"
          >
            Batal
          </button>
          
          <button
            type="submit"
            className="flex-1 py-4 bg-orange-500 hover:bg-orange-600 rounded-3xl text-white font-black text-lg uppercase tracking-tight shadow-xl shadow-orange-500/15 active:scale-95 transition flex items-center justify-center gap-3 cursor-pointer text-center"
          >
            <span>Simpan Laporan</span>
            <Check className="w-5 h-5 stroke-[3]" />
          </button>
        </div>
      </form>
    </div>
  );
}
