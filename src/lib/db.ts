/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { JobEvent, Teammate } from '../types';

const DB_NAME = 'PendataanPekerjaanDB';
const DB_VERSION = 1;
const EVENTS_STORE = 'events';
const TEAMMATES_STORE = 'teammates';

function getDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error('Gagal membuka database lokal.'));
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(EVENTS_STORE)) {
        db.createObjectStore(EVENTS_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(TEAMMATES_STORE)) {
        db.createObjectStore(TEAMMATES_STORE, { keyPath: 'id' });
      }
    };
  });
}

export async function getAllEvents(): Promise<JobEvent[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(EVENTS_STORE, 'readonly');
    const store = transaction.objectStore(transaction.objectStoreNames[0]);
    const request = store.getAll();

    request.onsuccess = () => {
      const result = request.result as JobEvent[];
      // Sort by date descending, then by createdAt descending
      result.sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        if (dateB !== dateA) return dateB - dateA;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      resolve(result);
    };

    request.onerror = () => {
      reject(new Error('Gagal memuat daftar pekerjaan.'));
    };
  });
}

export async function saveEvent(event: JobEvent): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(EVENTS_STORE, 'readwrite');
    const store = transaction.objectStore(EVENTS_STORE);
    const request = store.put(event);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(new Error('Gagal menyimpan detail pekerjaan.'));
    };
  });
}

export async function deleteEvent(id: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(EVENTS_STORE, 'readwrite');
    const store = transaction.objectStore(EVENTS_STORE);
    const request = store.delete(id);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(new Error('Gagal menghapus catatan pekerjaan.'));
    };
  });
}

export async function getAllTeammates(): Promise<Teammate[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(TEAMMATES_STORE, 'readonly');
    const store = transaction.objectStore(TEAMMATES_STORE);
    const request = store.getAll();

    request.onsuccess = () => {
      resolve(request.result as Teammate[]);
    };

    request.onerror = () => {
      reject(new Error('Gagal memuat daftar anggota tim.'));
    };
  });
}

export async function saveTeammate(teammate: Teammate): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(TEAMMATES_STORE, 'readwrite');
    const store = transaction.objectStore(TEAMMATES_STORE);
    const request = store.put(teammate);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(new Error('Gagal menyimpan anggota tim.'));
    };
  });
}

export async function deleteTeammate(id: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(TEAMMATES_STORE, 'readwrite');
    const store = transaction.objectStore(TEAMMATES_STORE);
    const request = store.delete(id);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(new Error('Gagal menghapus anggota tim.'));
    };
  });
}

// Initial seeding of teammates and events if empty
export async function seedInitialDataIfNeeded(): Promise<void> {
  const teammates = await getAllTeammates();
  if (teammates.length === 0) {
    const defaults: Teammate[] = [
      { id: '1', name: 'Senyo (Mandiri)', role: 'Kreator Utama', isActive: true },
      { id: '2', name: 'Andi Pratama', role: 'Dokumentasi', isActive: true },
      { id: '3', name: 'Budi Santoso', role: 'Teknisi Lapangan', isActive: true },
    ];
    for (const d of defaults) {
      await saveTeammate(d);
    }
  }

  const events = await getAllEvents();
  if (events.length === 0) {
    const defaultEvents: JobEvent[] = [
      {
        id: 'ev-seed-1',
        date: '2026-05-20',
        day: 20,
        month: 5,
        year: 2026,
        eventName: 'Event Photobooth AI',
        team: [], // Pekerjaan Pribadi
        location: 'CORO.AI',
        notes: 'Laporan pekerjaan selesai untuk instalasi dan pendampingan Event Photobooth AI bersama perusahaan partner CORO.AI. Sistem berjalan lancar dan interaksi user sangat tinggi.',
        photos: [],
        status: 'Selesai',
        createdAt: new Date(Date.now() - 3600000 * 24).toISOString() // 1 day ago
      },
      {
        id: 'ev-seed-2',
        date: '2026-05-25',
        day: 25,
        month: 5,
        year: 2026,
        eventName: 'Videographer & Editing Only',
        team: [], // Pekerjaan Pribadi
        location: 'AVACINEMA',
        notes: 'Dinas mandiri untuk produksi video berkualitas tinggi serta penyuntingan (editing only) bersama perusahaan AVACINEMA. Berkas final telah diserahkan dan disetujui.',
        photos: [],
        status: 'Selesai',
        createdAt: new Date().toISOString()
      }
    ];

    for (const ev of defaultEvents) {
      await saveEvent(ev);
    }
  }
}

export async function resetToDefaults(): Promise<void> {
  const db = await getDB();
  
  // Clear events
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(EVENTS_STORE, 'readwrite');
    const store = transaction.objectStore(EVENTS_STORE);
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(new Error('Gagal mereset events.'));
  });

  // Clear teammates
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(TEAMMATES_STORE, 'readwrite');
    const store = transaction.objectStore(TEAMMATES_STORE);
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(new Error('Gagal mereset teammates.'));
  });

  // Re-seed
  const defaults: Teammate[] = [
    { id: '1', name: 'Senyo (Mandiri)', role: 'Kreator Utama', isActive: true },
    { id: '2', name: 'Andi Pratama', role: 'Dokumentasi', isActive: true },
    { id: '3', name: 'Budi Santoso', role: 'Teknisi Lapangan', isActive: true },
  ];
  for (const d of defaults) {
    await saveTeammate(d);
  }

  const defaultEvents: JobEvent[] = [
    {
      id: 'ev-seed-1',
      date: '2026-05-20',
      day: 20,
      month: 5,
      year: 2026,
      eventName: 'Event Photobooth AI',
      team: [], // Pekerjaan Pribadi
      location: 'CORO.AI',
      notes: 'Laporan pekerjaan selesai untuk instalasi dan pendampingan Event Photobooth AI bersama perusahaan partner CORO.AI. Sistem berjalan lancar dan interaksi user sangat tinggi.',
      photos: [],
      status: 'Selesai',
      createdAt: new Date(Date.now() - 3600000 * 24).toISOString() // 1 day ago
    },
    {
      id: 'ev-seed-2',
      date: '2026-05-25',
      day: 25,
      month: 5,
      year: 2026,
      eventName: 'Videographer & Editing Only',
      team: [], // Pekerjaan Pribadi
      location: 'AVACINEMA',
      notes: 'Dinas mandiri untuk produksi video berkualitas tinggi serta penyuntingan (editing only) bersama perusahaan AVACINEMA. Berkas final telah diserahkan dan disetujui.',
      photos: [],
      status: 'Selesai',
      createdAt: new Date().toISOString()
    }
  ];

  for (const ev of defaultEvents) {
    await saveEvent(ev);
  }
}
