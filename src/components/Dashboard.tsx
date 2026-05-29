/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Calendar, CheckCircle2, AlertCircle, Clock, MapPin, Users, TrendingUp } from 'lucide-react';
import { JobEvent, AppStats } from '../types';
import { MONTH_NAMES_ID, formatIndonesianDate } from '../lib/utils';

interface DashboardProps {
  events: JobEvent[];
  onSelectEvent: (event: JobEvent) => void;
}

export default function Dashboard({ events, onSelectEvent }: DashboardProps) {
  // Compute statistics
  const totalEvents = events.length;
  const completedEvents = events.filter(e => e.status === 'Selesai').length;
  const ongoingEvents = events.filter(e => e.status === 'Berlangsung').length;
  const plannedEvents = events.filter(e => e.status === 'Direncanakan').length;

  const locations = events.map(e => e.location.trim()).filter(Boolean);
  const uniqueLocations = new Set(locations).size;

  const allTeammates = events.flatMap(e => e.team).filter(Boolean);
  const uniqueTeammates = new Set(allTeammates);
  const totalTeamMembers = uniqueTeammates.size;

  // Find top location
  const locCounts = locations.reduce((acc, loc) => {
    acc[loc] = (acc[loc] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const topLocation = Object.entries(locCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Belum ada data';

  // Find most active team member
  const teamCounts = allTeammates.reduce((acc, name) => {
    acc[name] = (acc[name] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const activeTeammatesSorted = Object.entries(teamCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // monthly event counts (for chart)
  const currentYear = new Date().getFullYear();
  const monthlyCounts = Array(12).fill(0);
  events.forEach(e => {
    if (e.year === currentYear) {
      const monthIdx = e.month - 1; // 1-12 to 0-11
      if (monthIdx >= 0 && monthIdx < 12) {
        monthlyCounts[monthIdx]++;
      }
    }
  });

  const maxMonthlyCount = Math.max(...monthlyCounts, 3); // minimum 3 for scale

  const stats: AppStats = {
    totalEvents,
    completedEvents,
    ongoingEvents,
    plannedEvents,
    uniqueLocations,
    totalTeamMembers
  };

  const statCards = [
    {
      id: "stat-total",
      label: 'Total Job-an',
      value: stats.totalEvents,
      icon: Calendar,
      color: 'bg-slate-900 border-2 border-slate-800 border-b-8 border-b-indigo-500 text-slate-100 shadow-xl shadow-black/20',
      iconColor: 'text-indigo-400'
    },
    {
      id: "stat-completed",
      label: 'Pecah Kelar (Selesai)',
      value: stats.completedEvents,
      icon: CheckCircle2,
      color: 'bg-slate-900 border-2 border-slate-800 border-b-8 border-b-pink-500 text-slate-100 shadow-xl shadow-black/20',
      iconColor: 'text-pink-400'
    },
    {
      id: "stat-ongoing",
      label: 'Lagi OTW (Berjalan)',
      value: stats.ongoingEvents,
      icon: Clock,
      color: 'bg-slate-900 border-2 border-slate-800 border-b-8 border-b-amber-500 text-slate-100 shadow-xl shadow-black/20',
      iconColor: 'text-amber-400'
    },
    {
      id: "stat-planned",
      label: 'Antrean Agenda',
      value: stats.plannedEvents,
      icon: AlertCircle,
      color: 'bg-slate-900 border-2 border-slate-800 border-b-8 border-b-cyan-500 text-slate-100 shadow-xl shadow-black/20',
      iconColor: 'text-cyan-400'
    }
  ];

  return (
    <div id="dashboard-container" className="space-y-8 animate-fade-in">
      {/* Cards stats grid */}
      <div id="stats-grid" className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.id}
              id={`card-${card.id}`}
              className={`p-4 sm:p-6 rounded-3xl transition-all hover:scale-[1.02] duration-305 ${card.color}`}
            >
              <div className="flex justify-between items-center mb-3">
                <span className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest leading-none">{card.label}</span>
                <div className="w-8 h-8 rounded-full bg-slate-950/80 flex items-center justify-center border border-slate-800">
                  <Icon className={`w-4 h-4 ${card.iconColor}`} />
                </div>
              </div>
              <div className="text-2xl sm:text-3.5xl font-black tracking-tight text-slate-50">{card.value}</div>
            </div>
          );
        })}
      </div>

      <div id="charts-and-insights-grid" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Event Stats Chart */}
        <div id="chart-card" className="lg:col-span-2 bg-slate-900 rounded-3xl border-2 border-slate-800 p-6 shadow-xl shadow-black/30 border-b-8 border-slate-800">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-lg font-black text-slate-100 uppercase tracking-tight">Grafik Gawean Kelar ({currentYear})</h3>
              <p className="text-xs text-slate-400 font-semibold mt-0.5">Histori laporan kelar milik Senyo pribadi buat stor ke bos</p>
            </div>
            <TrendingUp id="trending-icon" className="w-6 h-6 text-pink-400 bg-slate-950 p-1.5 rounded-xl border border-slate-800/80" />
          </div>

          {/* SVG Custom Responsive Bar Chart */}
          <div id="chart-bars-container" className="h-64 flex items-end gap-2 md:gap-4 pt-4 border-b-2 border-l-2 border-slate-800 px-2">
            {monthlyCounts.map((count, index) => {
              const heightPercent = `${(count / maxMonthlyCount) * 85}%`;
              return (
                <div key={`month-${index}`} id={`bar-item-${index}`} className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer relative">
                  {/* Tooltip on Hover */}
                  <div className="bg-slate-950 text-slate-200 text-[10px] pointer-events-none px-2 py-1.5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity mb-2 absolute translate-y-[-10px] shadow-2xl font-black border border-slate-800 z-10 whitespace-nowrap uppercase tracking-wider">
                    {count} Laporan
                  </div>
                  
                  {/* Interactive Bar */}
                  <div 
                    style={{ height: heightPercent }} 
                    className={`w-full max-w-[28px] rounded-t-xl transition-all duration-300 hover:scale-x-110 ${
                      count > 0 
                        ? 'bg-indigo-500 bg-gradient-to-t from-indigo-600 to-indigo-400 shadow-[0_4px_12px_rgba(99,102,241,0.2)] group-hover:from-pink-500 group-hover:to-pink-400' 
                        : 'bg-slate-800/60 group-hover:bg-slate-700'
                    }`}
                  />
                  
                  {/* Label */}
                  <span id={`month-lbl-${index}`} className="text-[10px] md:text-xs text-slate-400 font-black mt-2 select-none uppercase tracking-wider">
                    {MONTH_NAMES_ID[index].substring(0, 3)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Insights Card */}
        <div id="insights-card" className="bg-slate-900 rounded-3xl border-2 border-slate-800 p-6 shadow-xl shadow-black/30 border-b-8 border-pink-500/30 flex flex-col justify-between">
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-black text-slate-100 uppercase tracking-tight">Kuantitas & Jangkauan</h3>
              <p className="text-xs text-slate-400 font-semibold mt-0.5">Rasio keterlibatan lokasi dan personil aktif</p>
            </div>

            {/* Quick Numbers */}
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-950/50 border border-slate-800">
                <div className="p-3 bg-slate-800 text-indigo-400 rounded-xl shadow-md border border-slate-700">
                  <MapPin className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Ruang Kerja Terdaftar</div>
                  <div className="text-base font-black text-slate-100 truncate">{stats.uniqueLocations} Area Berbeda</div>
                  <div className="text-[10px] text-slate-400 truncate font-semibold mt-0.5">Terbanyak: <span className="font-black text-pink-400 uppercase tracking-tight">{topLocation}</span></div>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-950/50 border border-slate-800">
                <div className="p-3 bg-slate-800 text-pink-400 rounded-xl shadow-md border border-slate-700">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Anggota Terlibat</div>
                  <div className="text-base font-black text-slate-100">{stats.totalTeamMembers} Personil Lapangan</div>
                  <div className="text-[10px] text-slate-400 font-semibold mt-0.5">Aktif dalam basis roster personil</div>
                </div>
              </div>
            </div>

            {/* Top Team Members */}
            <div className="space-y-3">
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-500">Personil Lapangan Terpopuler</div>
              <div className="space-y-2">
                {activeTeammatesSorted.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">Belum ada personil yang terdaftar di penugasan.</p>
                ) : (
                  activeTeammatesSorted.map(([name, count], idx) => (
                    <div key={name} id={`team-top-${idx}`} className="flex justify-between items-center text-xs text-slate-200 py-1.5 border-b border-dashed border-slate-800/80 last:border-0">
                      <span className="font-bold flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-pink-500/15 text-pink-400 text-[9px] flex items-center justify-center font-black border border-pink-500/20">{idx + 1}</span>
                        {name}
                      </span>
                      <span className="font-black px-2.5 py-1 rounded-full bg-slate-950 text-indigo-400 text-[10px] uppercase border border-slate-805 tracking-wider">{count} Catatan</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activities Section */}
      <div id="recent-activities-card" className="bg-slate-900 rounded-3xl border-2 border-slate-800 p-6 shadow-xl shadow-black/30 border-b-8 border-slate-800 animate-scale-up">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-lg font-black text-slate-100 uppercase tracking-tight">List Joban Teranyar</h3>
            <p className="text-xs text-slate-400 font-semibold mt-0.5">Bukti laporan dinas pribadi Senyo yang udah beres</p>
          </div>
        </div>

        {events.length === 0 ? (
          <div className="text-center py-12 border-4 border-dashed border-slate-800 rounded-3xl bg-slate-950/40">
            <Calendar className="w-12 h-12 text-slate-700 mx-auto mb-3" />
            <p className="text-sm text-slate-300 font-bold">Belum ada job-an tercatat.</p>
            <p className="text-xs text-slate-550 mt-1">Yuk, catat gawean baru lo sekarang biar ngga lupa!</p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-6 px-6 sm:mx-0 sm:px-0">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="border-b-2 border-slate-800 text-slate-450 text-[10px] uppercase tracking-wider font-extrabold">
                  <th className="py-3 px-4 font-black">Tanggal</th>
                  <th className="py-3 px-4 font-black">Nama Event</th>
                  <th className="py-3 px-4 font-black">Instansi / Perusahaan</th>
                  <th className="py-3 px-4 font-black">Partner Kerja</th>
                  <th className="py-3 px-4 font-black">Status</th>
                  <th className="py-3 px-4 text-right font-black">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50 text-xs sm:text-sm">
                {events.slice(0, 5).map((e) => (
                  <tr key={e.id} id={`row-item-${e.id}`} className="hover:bg-slate-805/45 transition-colors border-b border-slate-800/30">
                    <td className="py-4 px-4 font-mono text-[11px] font-bold text-slate-400">
                      {formatIndonesianDate(e.date)}
                    </td>
                    <td className="py-4 px-4 font-black text-slate-100 uppercase tracking-tight text-xs sm:text-sm">
                      {e.eventName}
                    </td>
                    <td className="py-4 px-4 text-slate-300 text-xs font-semibold">
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-pink-500 flex-shrink-0" />
                        {e.location}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex flex-wrap gap-1 max-w-sm">
                        {e.team.length === 0 ? (
                          <span className="text-[10px] uppercase font-black tracking-wider text-slate-500 italic">Mandiri</span>
                        ) : (
                          e.team.map((person) => (
                            <span 
                              key={person} 
                              className="inline-block text-[9px] bg-pink-550/10 text-pink-400 px-2 py-0.5 rounded-full font-black border border-pink-500/20 uppercase tracking-wider"
                            >
                              {person}
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`inline-flex items-center gap-1.5 text-[9px] uppercase font-black tracking-widest px-2.5 py-1 rounded-full ${
                        e.status === 'Selesai' 
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                          : e.status === 'Berlangsung'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          e.status === 'Selesai' 
                            ? 'bg-emerald-400 animate-pulse' 
                            : e.status === 'Berlangsung'
                            ? 'bg-amber-400 animate-pulse'
                            : 'bg-indigo-400'
                        }`} />
                        {e.status}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <button
                        onClick={() => onSelectEvent(e)}
                        className="px-3.5 py-1.5 bg-indigo-650 hover:bg-pink-500 text-white font-black text-[10px] uppercase tracking-widest rounded-xl shadow-md transition-all cursor-pointer"
                      >
                        Detail
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
