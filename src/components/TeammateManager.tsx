/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Users, Plus, Trash2, CheckCircle2, AlertCircle, X, ShieldAlert, Award } from 'lucide-react';
import { Teammate } from '../types';

interface TeammateManagerProps {
  teammates: Teammate[];
  onSaveTeammate: (teammate: Teammate) => Promise<void>;
  onDeleteTeammate: (id: string) => Promise<void>;
  onClose: () => void;
}

export default function TeammateManager({
  teammates,
  onSaveTeammate,
  onDeleteTeammate,
  onClose
}: TeammateManagerProps) {
  const [name, setName] = useState<string>('');
  const [role, setRole] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const nameTrimmed = name.trim();
    if (!nameTrimmed) {
      setErrorMsg('Nama lengkap personil harus diisi.');
      return;
    }

    // Check pre-existence
    const preExists = teammates.some(t => t.name.toLowerCase() === nameTrimmed.toLowerCase());
    if (preExists) {
      setErrorMsg('Personil dengan nama ini sudah terdaftar.');
      return;
    }

    const newTeammate: Teammate = {
      id: Math.random().toString(36).substring(2, 9),
      name: nameTrimmed,
      role: role.trim() || 'Anggota Tim',
      isActive: true
    };

    await onSaveTeammate(newTeammate);
    setName('');
    setRole('');
    setErrorMsg('');
  };

  return (
    <div id="teammate-manager-card" className="bg-slate-900 border-2 border-slate-800 rounded-3xl shadow-2xl shadow-black/45 p-6 max-w-2xl mx-auto animate-scale-up border-b-8 border-b-slate-800">
      <div className="flex border-b-2 border-slate-800 pb-4 mb-5 items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-100 uppercase tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-pink-500 stroke-[2.5]" /> Kelola Roster Personil
          </h2>
          <p className="text-xs text-slate-400 font-semibold leading-relaxed mt-0.5">
            Daftarkan personil secara permanen untuk seleksi cepat otomatis di dalam formulir laporan pekerjaan.
          </p>
        </div>
        <button
          onClick={onClose}
          type="button"
          className="p-2 rounded-xl border-2 border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-pink-400 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {errorMsg && (
        <div className="flex gap-2 p-4 bg-pink-500/10 border-2 border-pink-500/20 text-pink-400 rounded-3xl text-xs font-black uppercase tracking-wider mb-4 items-center shadow-lg">
          <AlertCircle className="w-4 h-4 flex-shrink-0 stroke-[3]" />
          {errorMsg}
        </div>
      )}

      {/* FORM: TAMBAH PERSONIL BARU */}
      <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-12 gap-4 pb-6 mb-5 border-b-2 border-slate-800">
        <div className="sm:col-span-5">
          <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Nama Lengkap</label>
          <input
            type="text"
            placeholder="Contoh: Muhammad Rafli"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full h-11 px-4 border-2 border-slate-800 bg-slate-950 rounded-2xl text-xs font-bold text-slate-100 focus:outline-none focus:border-pink-500 placeholder:text-slate-600 focus:bg-slate-900 transition-all font-mono"
          />
        </div>
        <div className="sm:col-span-5">
          <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Peran / Jabatan (Opsional)</label>
          <input
            type="text"
            placeholder="Contoh: Fotografer / Teknisi"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full h-11 px-4 border-2 border-slate-800 bg-slate-950 rounded-2xl text-xs font-bold text-slate-100 focus:outline-none focus:border-pink-500 placeholder:text-slate-600 focus:bg-slate-900 transition-all font-mono"
          />
        </div>
        <div className="sm:col-span-2 flex items-end">
          <button
            type="submit"
            className="w-full h-11 bg-pink-500 hover:bg-pink-600 text-white rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1 shadow-md transition-all cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" /> TAMBAH
          </button>
        </div>
      </form>

      {/* LIST OF REGISTERED TEAMMATES */}
      <div className="space-y-3">
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">
          Daftar Personil Terdaftar ({teammates.length})
        </h3>

        {teammates.length === 0 ? (
          <div className="text-center py-10 bg-slate-950/40 border-4 border-dashed border-slate-800 rounded-3xl text-xs font-bold text-slate-500 leading-relaxed px-4">
            Belum ada rekan kerja yang terdaftar. Gunakan kolom formulir di atas untuk mendaftarkannya sekarang.
          </div>
        ) : (
          <div className="max-h-64 overflow-y-auto border-2 border-slate-800 rounded-3xl divide-y divide-slate-800 bg-slate-950">
            {teammates.map((teammate) => (
              <div
                key={teammate.id}
                id={`roster-item-${teammate.id}`}
                className="flex items-center justify-between p-4 hover:bg-slate-900/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-pink-500/15 border border-pink-500/25 text-pink-400 flex items-center justify-center font-black text-sm shadow-xs font-mono">
                    {teammate.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-black text-slate-100 leading-none">{teammate.name}</h4>
                    <span className="text-[10px] text-slate-400 mt-1 block flex items-center gap-0.5 font-bold">
                      <Award className="w-3.5 h-3.5 text-pink-500" /> {teammate.role || 'Anggota Tim'}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onDeleteTeammate(teammate.id)}
                  className="p-2 text-slate-405 hover:text-pink-400 hover:bg-pink-500/10 rounded-xl transition-all border border-transparent hover:border-pink-500/20 cursor-pointer"
                  title="Hapus dari Roster"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end pt-5 mt-5 border-t-2 border-slate-800">
        <button
          type="button"
          onClick={onClose}
          className="px-6 h-12 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl text-sm font-black uppercase tracking-wider shadow-lg shadow-orange-500/10 transition-all cursor-pointer text-center"
        >
          Selesai & Keluar
        </button>
      </div>

    </div>
  );
}
