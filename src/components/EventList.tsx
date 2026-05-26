/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Search, MapPin, Users, Calendar, Filter, Image, LayoutGrid, List, CheckCircle, Clock, AlertCircle, Edit, Trash, ChevronRight, Eye } from 'lucide-react';
import { JobEvent, EventStatus } from '../types';
import { MONTH_NAMES_ID, formatIndonesianDate } from '../lib/utils';

interface EventListProps {
  events: JobEvent[];
  onSelectEvent: (event: JobEvent) => void;
  onEditEvent: (event: JobEvent) => void;
  onDeleteEvent: (id: string) => void;
}

export default function EventList({
  events,
  onSelectEvent,
  onEditEvent,
  onDeleteEvent
}: EventListProps) {
  const [search, setSearch] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [layoutMode, setLayoutMode] = useState<'grid' | 'table'>('grid');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Get unique years dynamically from events for filters
  const uniqueYears = Array.from(new Set(events.map(e => String(e.year)))).sort((a,b) => b.localeCompare(a));

  // Filtering Logic
  const filteredEvents = events.filter((e) => {
    const matchesSearch = 
      e.eventName.toLowerCase().includes(search.toLowerCase()) ||
      e.location.toLowerCase().includes(search.toLowerCase()) ||
      e.team.some(member => member.toLowerCase().includes(search.toLowerCase())) ||
      e.notes.toLowerCase().includes(search.toLowerCase());

    const matchesMonth = selectedMonth === 'all' || Number(selectedMonth) === e.month;
    const matchesYear = selectedYear === 'all' || selectedYear === String(e.year);
    const matchesStatus = selectedStatus === 'all' || selectedStatus === e.status;

    return matchesSearch && matchesMonth && matchesYear && matchesStatus;
  });

  const handleDeleteClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirmDeleteId === id) {
      onDeleteEvent(id);
      setConfirmDeleteId(null);
    } else {
      setConfirmDeleteId(id);
    }
  };

  return (
    <div id="event-list-container" className="space-y-6 animate-fade-in">
      {/* FILTER PANEL */}
      <div id="list-controls-card" className="bg-slate-900 border-2 border-slate-800 rounded-3xl shadow-xl shadow-black/20 p-5 border-b-8 border-b-slate-800">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          
          {/* Text Search - spans 4 cols */}
          <div className="lg:col-span-4 relative">
            <input
              type="text"
              placeholder="Cari gawean, nama klien/instansi, partner..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-11 pl-10 pr-4 border-2 border-slate-800 rounded-2xl text-sm bg-slate-950 text-slate-100 focus:outline-none focus:border-pink-500 placeholder-slate-650 font-bold transition-all"
            />
            <Search className="absolute left-3.5 top-3.5 w-4.5 h-4.5 text-slate-600" />
          </div>

          {/* Month option dropdown - spans 2 cols */}
          <div className="lg:col-span-2 relative">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full h-11 pl-9 pr-2 border-2 border-slate-803 rounded-2xl text-xs font-black uppercase tracking-wider text-slate-300 bg-slate-950 cursor-pointer focus:outline-none focus:border-pink-500 appearance-none"
            >
              <option value="all">Semua Bulan</option>
              {MONTH_NAMES_ID.map((name, idx) => (
                <option key={name} value={idx + 1}>{name}</option>
              ))}
            </select>
            <Filter className="absolute left-3 top-4 w-3.5 h-3.5 text-pink-500" />
          </div>

          {/* Year option dropdown - spans 2 cols */}
          <div className="lg:col-span-2 relative">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full h-11 pl-9 pr-2 border-2 border-slate-803 rounded-2xl text-xs font-black uppercase tracking-wider text-slate-300 bg-slate-950 cursor-pointer focus:outline-none focus:border-pink-500 appearance-none"
            >
              <option value="all">Semua Tahun</option>
              {uniqueYears.map((yr) => (
                <option key={yr} value={yr}>{yr}</option>
              ))}
            </select>
            <Calendar className="absolute left-3 top-4 w-3.5 h-3.5 text-pink-500" />
          </div>

          {/* Status option dropdown - spans 2 cols */}
          <div className="lg:col-span-2 relative">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full h-11 pl-9 pr-2 border-2 border-slate-803 rounded-2xl text-xs font-black uppercase tracking-wider text-slate-300 bg-slate-950 cursor-pointer focus:outline-none focus:border-pink-500 appearance-none"
            >
              <option value="all">Semua Status</option>
              <option value="Selesai">Beres Kelar</option>
              <option value="Berlangsung">Sedang OTW</option>
              <option value="Direncanakan">Baru Rencana</option>
            </select>
            <CheckCircle className="absolute left-3 top-4 w-3.5 h-3.5 text-pink-500" />
          </div>

          {/* Layout switches - spans 2 cols */}
          <div className="lg:col-span-2 flex justify-end gap-1.5 items-center border-t-2 border-slate-800 lg:border-t-0 pt-3 lg:pt-0">
            <button
              onClick={() => setLayoutMode('grid')}
              className={`p-2.5 rounded-xl border-2 transition-all cursor-pointer ${
                layoutMode === 'grid' 
                  ? 'bg-pink-500 border-pink-500 text-white shadow-lg shadow-pink-500/15' 
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
              }`}
              title="Tampilan Grid Kartu"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setLayoutMode('table')}
              className={`p-2.5 rounded-xl border-2 transition-all cursor-pointer ${
                layoutMode === 'table' 
                  ? 'bg-pink-500 border-pink-500 text-white shadow-lg shadow-pink-500/15' 
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
              }`}
              title="Tampilan Daftar Padat"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

        </div>

        {/* Counter Results Label */}
        <div className="mt-4 flex flex-col sm:flex-row sm:justify-between sm:items-center text-xs text-slate-400 font-extrabold uppercase tracking-widest gap-2">
          <div>Menampilkan <span className="font-black text-pink-400">{filteredEvents.length}</span> dari {events.length} gawean kecatat</div>
          {(search || selectedMonth !== 'all' || selectedYear !== 'all' || selectedStatus !== 'all') && (
            <button
              onClick={() => {
                setSearch('');
                setSelectedMonth('all');
                setSelectedYear('all');
                setSelectedStatus('all');
              }}
              className="text-pink-400 hover:text-pink-300 underline font-black transition-all cursor-pointer"
            >
              Bersihkan Filter
            </button>
          )}
        </div>
      </div>

      {/* RENDER EVENT LISTINGS */}
      {filteredEvents.length === 0 ? (
        <div id="empty-results" className="text-center py-16 bg-slate-900 border-2 border-slate-800 rounded-3xl shadow-xl border-b-8 border-b-slate-800 max-w-lg mx-auto">
          <Search className="w-14 h-14 text-slate-700 mx-auto mb-4" />
          <h3 className="text-lg font-black text-slate-100 uppercase tracking-tight mb-1">Zonrk! Kga Ketemu</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto font-semibold leading-relaxed px-4">
            Cobain ganti keyword lo, ubah filter bulan / tahun, ato bikin laporan gawean baru biar ada isinya!
          </p>
        </div>
      ) : layoutMode === 'grid' ? (
        /* GRID MODE */
        <div id="events-grid-view" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvents.map((e) => {
            const hasPhotos = e.photos && e.photos.length > 0;
            return (
              <div
                key={e.id}
                id={`grid-event-${e.id}`}
                onClick={() => onSelectEvent(e)}
                className="group bg-slate-900 border-2 border-slate-800 rounded-3xl overflow-hidden shadow-xl shadow-black/35 hover:shadow-2xl hover:border-slate-705 hover:shadow-black/55 transition-all duration-300 cursor-pointer flex flex-col justify-between border-b-8 border-b-slate-800 animate-scale-up"
              >
                {/* Visual Header Image or Placeholder */}
                <div className="relative h-48 w-full bg-slate-950 overflow-hidden flex-shrink-0 border-b-2 border-slate-800">
                  {hasPhotos ? (
                    <img
                      src={e.photos[0].base64}
                      alt={e.eventName}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-600 bg-slate-950/45">
                      <Image className="w-10 h-10 opacity-30 mb-1.5" />
                      <span className="text-[10px] font-black tracking-widest uppercase opacity-45">Dokumentasi Kosong</span>
                    </div>
                  )}

                  {/* Status Badge */}
                  <div className="absolute top-3.5 left-3.5 select-none z-10">
                    <span className={`inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full shadow-md ${
                      e.status === 'Selesai'
                        ? 'bg-emerald-500 text-white'
                        : e.status === 'Berlangsung'
                        ? 'bg-amber-500 text-white'
                        : 'bg-indigo-600 text-white'
                    }`}>
                      {e.status}
                    </span>
                  </div>

                  {/* Photos count badge */}
                  {hasPhotos && (
                    <div className="absolute bottom-3.5 right-3.5 bg-black/75 text-white text-[9px] font-mono font-black uppercase tracking-widest px-2.5 py-1 rounded-full select-none flex items-center gap-1 z-10">
                      <Image className="w-3.5 h-3.5" />
                      {e.photos.length} Foto
                    </div>
                  )}
                </div>

                {/* Event Metadata card info */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4 bg-slate-900">
                  <div className="space-y-2">
                    {/* Event formatted date */}
                    <div className="text-[10px] font-mono text-slate-500 font-black uppercase tracking-wider">
                      {formatIndonesianDate(e.date)}
                    </div>
                     
                    {/* Event Name */}
                    <h4 className="text-base font-black text-slate-100 group-hover:text-pink-400 transition-colors line-clamp-2 leading-snug uppercase tracking-tight">
                      {e.eventName}
                    </h4>
                    
                    {/* Location */}
                    <p className="text-xs text-slate-350 font-semibold flex items-center gap-1.5 leading-snug truncate">
                      <MapPin className="w-3.5 h-3.5 text-pink-500 flex-shrink-0" />
                      {e.location}
                    </p>
                  </div>

                  {/* Crew list & Action items */}
                  <div className="pt-4 border-t-2 border-slate-800 flex items-center justify-between">
                    
                    {/* Crew list preview */}
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-300 font-bold truncate max-w-[150px]">
                      <Users className="w-4 h-4 text-pink-400 flex-shrink-0" />
                      {e.team.length === 0 ? (
                        <span className="italic text-slate-500">Jalan Mandiri</span>
                      ) : e.team.length === 1 ? (
                        <span>{e.team[0]}</span>
                      ) : (
                        <span>{e.team[0]} (+{e.team.length - 1} Orang)</span>
                      )}
                    </div>

                    {/* Quick editing buttons */}
                    <div className="flex items-center gap-1 z-10" onClick={(ev) => ev.stopPropagation()}>
                      <button
                        onClick={(ev) => {
                          ev.stopPropagation();
                          onEditEvent(e);
                        }}
                        className="p-2 hover:bg-slate-800 border-2 border-transparent hover:border-slate-700 text-slate-400 hover:text-slate-200 rounded-xl transition-all cursor-pointer"
                        title="Edit Pekerjaan"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      
                      {confirmDeleteId === e.id ? (
                        <button
                          onClick={(ev) => handleDeleteClick(e.id, ev)}
                          className="px-3 py-1.5 bg-pink-500 hover:bg-pink-600 text-white text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-lg shadow-pink-500/35"
                          title="Klik lagi untuk hapus"
                        >
                          Yakin?
                        </button>
                      ) : (
                        <button
                          onClick={(ev) => handleDeleteClick(e.id, ev)}
                          className="p-2 hover:bg-pink-500/10 border-2 border-transparent hover:border-pink-500/20 text-slate-400 hover:text-pink-400 rounded-xl transition-all cursor-pointer"
                          title="Hapus Pekerjaan"
                        >
                          <Trash className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* COMPACT TABLE MODE */
        <div id="events-table-view" className="bg-slate-900 border-2 border-slate-800 rounded-3xl overflow-hidden shadow-xl shadow-black/35 border-b-8 border-b-slate-800">
          <div className="overflow-x-auto overflow-y-hidden">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b-2 border-slate-800 bg-slate-950 text-slate-300 text-[10px] font-black uppercase tracking-wider">
                  <th className="py-4 px-5">Foto</th>
                  <th className="py-4 px-4">Tanggal</th>
                  <th className="py-4 px-4">Nama Event</th>
                  <th className="py-4 px-4">Lokasi</th>
                  <th className="py-4 px-4">Tim Pelaksana</th>
                  <th className="py-4 px-4">Status</th>
                  <th className="py-4 px-5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40 text-xs font-semibold text-slate-200">
                {filteredEvents.map((e) => {
                  const hasPhotos = e.photos && e.photos.length > 0;
                  return (
                    <tr
                      key={e.id}
                      id={`list-row-${e.id}`}
                      onClick={() => onSelectEvent(e)}
                      className="hover:bg-slate-805/45 cursor-pointer transition-colors border-b border-slate-800/30"
                    >
                      {/* Photo column */}
                      <td className="py-3.5 px-5">
                        <div className="w-12 h-10 rounded-xl bg-slate-950 overflow-hidden border-2 border-slate-800 flex-shrink-0">
                          {hasPhotos ? (
                            <img
                              src={e.photos[0].base64}
                              alt="thumb"
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-600 bg-slate-950/40">
                              <Image className="w-4 h-4 opacity-30" />
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Date column */}
                      <td className="py-3.5 px-4 font-mono text-[10px] text-slate-400 font-black uppercase">
                        {formatIndonesianDate(e.date)}
                      </td>

                      {/* Name column */}
                      <td className="py-3.5 px-4 font-black text-slate-100 uppercase tracking-tight text-xs truncate max-w-xs">
                        {e.eventName}
                      </td>

                      {/* Location column */}
                      <td className="py-3.5 px-4 text-slate-300 font-extrabold text-xs max-w-xs truncate">
                        {e.location}
                      </td>

                      {/* Teammates column */}
                      <td className="py-3.5 px-4 text-xs">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {e.team.length === 0 ? (
                            <span className="text-[9px] text-slate-550 font-black italic">Jalan Mandiri</span>
                          ) : (
                            e.team.map((person) => (
                              <span 
                                key={person} 
                                className="bg-pink-500/10 text-pink-400 px-2.5 py-0.5 rounded-full text-[9px] font-black border border-pink-500/20 uppercase tracking-wider"
                              >
                                {person}
                              </span>
                            ))
                          )}
                        </div>
                      </td>

                      {/* Status column */}
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full ${
                          e.status === 'Selesai'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : e.status === 'Berlangsung'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                        }`}>
                          {e.status}
                        </span>
                      </td>

                      {/* Actions column */}
                      <td className="py-3.5 px-5 text-right" onClick={(ev) => ev.stopPropagation()}>
                        <div className="flex gap-2 items-center justify-end">
                          <button
                            onClick={() => onSelectEvent(e)}
                            className="p-2 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-xl transition-all cursor-pointer border border-transparent hover:border-slate-700"
                            title="Detail"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          
                          <button
                            onClick={() => onEditEvent(e)}
                            className="p-2 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-xl transition-all cursor-pointer border border-transparent hover:border-slate-700"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          {confirmDeleteId === e.id ? (
                            <button
                              onClick={(ev) => handleDeleteClick(e.id, ev)}
                              className="px-2.5 py-1.5 bg-pink-500 hover:bg-pink-600 text-white text-[9px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-lg shadow-pink-500/25"
                            >
                              Yakin?
                            </button>
                          ) : (
                            <button
                              onClick={(ev) => handleDeleteClick(e.id, ev)}
                              className="p-2 hover:bg-pink-500/15 text-slate-400 hover:text-pink-400 rounded-xl transition-all cursor-pointer border border-transparent hover:border-pink-500/20"
                              title="Hapus"
                            >
                              <Trash className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
