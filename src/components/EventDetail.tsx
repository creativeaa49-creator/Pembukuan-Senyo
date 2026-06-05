/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Calendar, MapPin, Users, FileText, Camera, ArrowLeft, Printer, Trash, Edit, CheckCircle, ChevronLeft, ChevronRight, X, ShieldAlert, Download, Coins } from 'lucide-react';
import { JobEvent, EventPhoto } from '../types';
import { formatIndonesianDate, MONTH_NAMES_ID } from '../lib/utils';

interface EventDetailProps {
  event: JobEvent;
  onClose: () => void;
  onEdit: (event: JobEvent) => void;
  onDelete: (id: string) => void;
}

export default function EventDetail({
  event,
  onClose,
  onEdit,
  onDelete
}: EventDetailProps) {
  const [activePhoto, setActivePhoto] = useState<EventPhoto | null>(null);
  const [activePhotoIdx, setActivePhotoIdx] = useState<number>(0);
  const [confirmDelete, setConfirmDelete] = useState<boolean>(false);

  const hasPhotos = event.photos && event.photos.length > 0;

  const handleOpenLightbox = (photo: EventPhoto, index: number) => {
    setActivePhoto(photo);
    setActivePhotoIdx(index);
  };

  const handlePrevPhoto = (ev: React.MouseEvent) => {
    ev.stopPropagation();
    if (!hasPhotos) return;
    const newIdx = activePhotoIdx === 0 ? event.photos.length - 1 : activePhotoIdx - 1;
    setActivePhoto(event.photos[newIdx]);
    setActivePhotoIdx(newIdx);
  };

  const handleNextPhoto = (ev: React.MouseEvent) => {
    ev.stopPropagation();
    if (!hasPhotos) return;
    const newIdx = activePhotoIdx === event.photos.length - 1 ? 0 : activePhotoIdx + 1;
    setActivePhoto(event.photos[newIdx]);
    setActivePhotoIdx(newIdx);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDeleteConfirm = () => {
    onDelete(event.id);
    onClose();
  };

  return (
    <div id="event-detail-card" className="bg-slate-900 border-2 border-slate-800 rounded-3xl shadow-2xl shadow-black/45 overflow-hidden max-w-4xl mx-auto animate-scale-up border-b-8 border-b-slate-800">
      
      {/* HEADER CONTROLS (Non-Printable Section) */}
      <div className="flex border-b-2 border-slate-800 p-4 md:p-5 items-center justify-between bg-slate-950/45 print:hidden">
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-100 font-extrabold uppercase tracking-widest cursor-pointer bg-slate-900 border border-slate-750 px-3.5 py-2.5 rounded-2xl transition-all"
        >
          <ArrowLeft className="w-4 h-4 text-pink-500 stroke-[3]" /> Kembali
        </button>

        <div className="flex items-center gap-2">
          {/* Print button */}
          <button
            onClick={handlePrint}
            className="p-2.5 bg-slate-950 border border-slate-800 hover:bg-slate-800 rounded-2xl text-slate-300 transition-colors cursor-pointer shadow-md hover:border-slate-700"
            title="Cetak Berkas"
          >
            <Printer className="w-4 h-4 stroke-[2.5]" />
          </button>
          
          {/* Edit button */}
          <button
            onClick={() => onEdit(event)}
            className="p-2.5 bg-slate-950 border border-slate-800 hover:bg-slate-800 rounded-2xl text-slate-300 transition-colors cursor-pointer shadow-md hover:border-slate-700"
            title="Edit Rekaman ini"
          >
            <Edit className="w-4 h-4 stroke-[2.5]" />
          </button>
          
          {/* Delete prompt */}
          {confirmDelete ? (
            <div className="flex items-center gap-1.5 bg-pink-500/10 border-2 border-pink-500/20 text-pink-400 rounded-2xl p-1 shadow-md">
              <span className="text-[10px] text-pink-400 font-black px-1.5 uppercase tracking-wide">Yakin hapus?</span>
              <button
                onClick={handleDeleteConfirm}
                className="bg-red-500 hover:bg-red-650 text-white text-[10px] font-black px-2.5 py-1 rounded-xl cursor-pointer"
              >
                YA
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-black px-2.5 py-1 rounded-xl cursor-pointer"
              >
                TIDAK
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="p-2.5 bg-slate-950 border border-slate-800 hover:bg-pink-500/10 rounded-2xl text-slate-400 hover:text-pink-450 transition-colors cursor-pointer shadow-md hover:border-pink-500/20"
              title="Hapus Rekaman ini"
            >
              <Trash className="w-4 h-4 stroke-[2.5]" />
            </button>
          )}
        </div>
      </div>

      {/* DETAIL CONTENT AREA (Printable Section) */}
      <div id="print-area-content" className="p-6 md:p-8 space-y-8 select-text">
        {/* Banner header inside detail */}
        <div className="border-b-2 border-slate-800 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-3">
            
            {/* Split Date Indicators (Visually highly satisfying representation of tag, month, year) */}
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-slate-300 bg-slate-950 border-2 border-slate-800 w-max px-3.5 py-1.5 rounded-full font-black">
              <span>{event.day}</span>
              <span className="text-slate-700">&bull;</span>
              <span>{MONTH_NAMES_ID[event.month - 1] || event.month}</span>
              <span className="text-slate-700">&bull;</span>
              <span>{event.year}</span>
            </div>

            <h1 className="text-2xl md:text-3xl font-black text-slate-100 leading-tight uppercase tracking-tight">
              {event.eventName}
            </h1>

            <div className="flex flex-wrap gap-2.5">
              <span className="text-xs text-slate-400 font-semibold flex items-center gap-1.5 bg-slate-950 border border-slate-800/80 px-3 py-1.5 rounded-2xl w-max">
                <MapPin className="w-4 h-4 text-pink-500 stroke-[2.5]" /> {event.location}
              </span>
              {event.rate && event.rate > 0 ? (
                <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1.5 bg-slate-950 border border-emerald-500/20 px-3 py-1.5 rounded-2xl w-max">
                  <Coins className="w-4 h-4 text-emerald-400 stroke-[2.5]" /> Budget: Rp {event.rate.toLocaleString('id-ID')}
                </span>
              ) : null}
            </div>
          </div>

          {/* Status stamp */}
          <div className="flex-shrink-0">
            <div className={`p-4 rounded-3xl border-2 text-center uppercase tracking-widest font-black text-xs flex flex-col justify-center items-center h-20 w-36 shadow-lg border-b-4 ${
              event.status === 'Selesai' 
                ? 'border-emerald-500 bg-emerald-500/15 text-emerald-400 shadow-emerald-500/5' 
                : event.status === 'Berlangsung'
                ? 'border-amber-500 bg-amber-500/15 text-amber-500 shadow-amber-500/5'
                : 'border-indigo-600 bg-indigo-600/15 text-indigo-400 shadow-indigo-500/5'
            }`}>
              <span className="text-[9px] opacity-80 font-black mb-1">Status Kelar</span>
              <span className="text-xs font-black tracking-wider">
                {event.status === 'Selesai' ? 'Beres Kelar' : event.status === 'Berlangsung' ? 'Sedang OTW' : 'Baru Rencana'}
              </span>
            </div>
          </div>
        </div>

        {/* DETAILS SECTION */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* LEFT/TOP: TEAM LIST INVOLVED */}
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-100 flex items-center gap-1.5">
              <Users className="w-5 h-5 text-pink-500" /> Kru / Partner
            </h3>
            <div id="crew-list-detail" className="bg-slate-950/40 border border-slate-800 rounded-3xl p-5 space-y-2">
              {event.team.length === 0 ? (
                <div className="text-xs text-slate-500 font-semibold italic">Pekerjaan Mandiri (Solo Run, No Drama).</div>
              ) : (
                event.team.map((name) => (
                  <div key={name} className="flex items-center gap-2.5 py-1.5 px-3 bg-slate-900 rounded-2xl border border-slate-800/80 shadow-md">
                    <div className="w-2.5 h-2.5 rounded-full bg-pink-500 border-2 border-pink-100 shrink-0" />
                    <span className="text-xs md:text-sm text-slate-200 font-extrabold">{name}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* RIGHT/BOTTOM: DETAILED NOTES */}
          <div className="md:col-span-2 space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-100 flex items-center gap-1.5">
              <FileText className="w-5 h-5 text-pink-500" /> Detail Laporan (Notes)
            </h3>
            <div 
              id="notes-detail-box" 
              className="bg-slate-950/40 border-2 border-slate-800 rounded-3xl p-5 text-sm text-slate-300 leading-relaxed font-semibold min-h-[140px] shadow-sm select-text whitespace-pre-wrap animate-scale-up"
            >
              {event.notes ? event.notes : (
                <span className="italic text-slate-500 text-xs font-normal">Kga ada catatan tambahan buat job ini.</span>
              )}
            </div>
          </div>

        </div>

        {/* PHOTO DOCUMENTATION GALERIES */}
        <div className="space-y-4 pb-6 border-b-2 border-slate-800">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-100 flex items-center gap-1.5">
            <Camera className="w-5 h-5 text-pink-500" /> Foto Lampiran Kegiatan ({event.photos.length} Gambar)
          </h3>

          {!hasPhotos ? (
            <div className="text-center py-12 bg-slate-950/30 border-4 border-dashed border-slate-800 rounded-3xl">
              <Camera className="w-12 h-12 text-slate-700 mx-auto mb-3" />
              <p className="text-xs text-slate-500 font-bold">Belum ada lampiran visual kegiatan yang terunggah.</p>
            </div>
          ) : (
            <div id="active-gallery-grid" className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
              {event.photos.map((photo, index) => (
                <div
                  key={photo.id}
                  onClick={() => handleOpenLightbox(photo, index)}
                  className="group relative rounded-2xl border border-slate-800 overflow-hidden shadow-md aspect-square bg-slate-950 cursor-zoom-in transition-all hover:border-pink-500 hover:ring-2 hover:ring-pink-500/20 hover:shadow-lg active:scale-95"
                >
                  <img
                    src={photo.base64}
                    alt={photo.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                  
                  {/* Hover visual details */}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/90 to-transparent p-3 text-slate-100 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end items-start gap-1">
                    <span className="text-[10px] font-black truncate w-full">{photo.name}</span>
                    <span className="text-[9px] font-mono select-none opacity-70 font-black">{(photo.size / 1024).toFixed(0)} KB</span>
                  </div>

                  <div className="absolute top-2 right-2 p-1.5 bg-black/60 text-white rounded-xl opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="w-3.5 h-3.5" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Document Footer details (helpful for print) */}
        <div className="hidden print:flex justify-between items-center text-[10px] text-slate-450 border-t border-slate-200 pt-6 mt-10">
          <span>Dicetak dengan Aplikasi CatatPekerjaan</span>
          <span>Selesai diunggah: {new Date(event.createdAt).toLocaleString('id-ID')}</span>
        </div>

      </div>

      {/* FULLSCREEN LIGHTBOX FOR PHOTOS (Non-Printable) */}
      {activePhoto && (
        <div
          id="lightbox-fullscreen"
          className="fixed inset-0 bg-black/95 backdrop-blur-md z-50 flex flex-col justify-between p-4 print:hidden animate-fade-in"
          onClick={() => setActivePhoto(null)}
        >
          {/* Header Lightbox */}
          <div className="flex justify-between items-center text-white py-2 px-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl mx-2 my-2">
            <div className="truncate pr-4">
              <h4 className="text-[10px] font-black text-pink-500 uppercase tracking-widest leading-none">Dokumentasi Preview</h4>
              <p className="text-xs font-black text-slate-100 mt-1 truncate">{activePhoto.name}</p>
            </div>
            
            <button
              onClick={() => setActivePhoto(null)}
              className="p-2 text-slate-400 hover:text-pink-550 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Photo Slide Wrapper */}
          <div className="flex-1 flex items-center justify-between pointer-events-none px-2 py-4">
            
            {/* Prev Switch */}
            <button
              onClick={handlePrevPhoto}
              className="pointer-events-auto p-4 m-1 bg-slate-900 text-slate-300 hover:text-pink-400 hover:bg-slate-800 border border-slate-810 rounded-full z-10 cursor-pointer shadow-lg active:scale-90 transition-transform"
            >
              <ChevronLeft className="w-6 h-6 stroke-[3]" />
            </button>

            {/* Main high quality image */}
            <div className="max-w-4xl max-h-[72vh] flex items-center justify-center relative overflow-hidden pointer-events-auto">
              <img
                src={activePhoto.base64}
                alt={activePhoto.name}
                referrerPolicy="no-referrer"
                className="max-w-full max-h-[72vh] object-contain rounded-3xl shadow-2xl border-4 border-slate-850 animate-scale-up"
              />
            </div>

            {/* Next Switch */}
            <button
              onClick={handleNextPhoto}
              className="pointer-events-auto p-4 m-1 bg-slate-900 text-slate-300 hover:text-pink-400 hover:bg-slate-800 border border-slate-810 rounded-full z-10 cursor-pointer shadow-lg active:scale-90 transition-transform"
            >
              <ChevronRight className="w-6 h-6 stroke-[3]" />
            </button>

          </div>

          {/* Bottom metadata */}
          <div className="bg-slate-950/90 text-center text-slate-400 text-xs py-3.5 select-none border-t border-slate-850">
            <span className="font-extrabold uppercase tracking-wide">Lampiran {activePhotoIdx + 1} dari {event.photos.length}</span>
            <span className="mx-3 text-slate-700">&bull;</span>
            <span className="font-mono">Ukuran: {(activePhoto.size / 1024).toFixed(1)} KB</span>
          </div>

        </div>
      )}

    </div>
  );
}
