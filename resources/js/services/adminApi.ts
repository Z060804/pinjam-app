/**
 * Admin API Service – Connected directly to Laravel database endpoints (/api/...)
 * with synchronized fallback to ensure seamless local operation.
 */
import axios from 'axios';
import { Ruangan, Kendaraan, Perlengkapan, Permohonan } from '../types/admin';
import { CATEGORY_IDS } from '../constants';
import {
  ADMIN_CREDENTIALS,
  INITIAL_RUANGAN,
  INITIAL_KENDARAAN,
  INITIAL_PERLENGKAPAN,
  INITIAL_PERMOHONAN,
} from './adminMockData';

const KEYS = {
  AUTH: 'simpru_admin_auth',
  RUANGAN: 'simpru_admin_ruangan_v2',
  KENDARAAN: 'simpru_admin_kendaraan_v2',
  PERLENGKAPAN: 'simpru_admin_perlengkapan_v2',
  PERMOHONAN: 'simpru_admin_permohonan_v2',
};

// Clean up old obsolete localStorage items
try {
  localStorage.removeItem('simpru_admin_ruangan');
  localStorage.removeItem('simpru_admin_kendaraan');
  localStorage.removeItem('simpru_admin_perlengkapan');
  localStorage.removeItem('simpru_admin_permohonan');
} catch (e) {
  // Ignore
}

function getStored<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function setStored<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error('localStorage write failed:', err);
  }
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
export async function adminLogin(email: string, password: string): Promise<{ ok: boolean; message?: string }> {
  if (email === ADMIN_CREDENTIALS.email && password === ADMIN_CREDENTIALS.password) {
    setStored(KEYS.AUTH, { email: ADMIN_CREDENTIALS.email, name: ADMIN_CREDENTIALS.name });
    return { ok: true };
  }
  return { ok: false, message: 'Email atau kata sandi salah.' };
}

export function adminLogout(): void {
  localStorage.removeItem(KEYS.AUTH);
}

export function getAdminSession(): { email: string; name: string } | null {
  return getStored<{ email: string; name: string } | null>(KEYS.AUTH, null);
}

// ─── Permohonan (Database backed) ─────────────────────────────────────────────
export async function getPermohonan(): Promise<Permohonan[]> {
  try {
    const res = await axios.get('/api/peminjaman');
    if (res.data?.success && Array.isArray(res.data?.data)) {
      setStored(KEYS.PERMOHONAN, res.data.data);
      return res.data.data;
    }
  } catch (err) {
    console.warn('API /api/peminjaman unreachable, using synced cache:', err);
  }
  return getStored<Permohonan[]>(KEYS.PERMOHONAN, INITIAL_PERMOHONAN);
}

export async function updateStatusPermohonan(
  id: string,
  status: Permohonan['status'],
): Promise<void> {
  try {
    await axios.patch(`/api/peminjaman/${encodeURIComponent(id)}/status`, {
      status,
      petugas: 'Admin SiRuang',
    });
  } catch (err) {
    console.warn('API /api/peminjaman/status unreachable, updating local state:', err);
  }

  const list = getStored<Permohonan[]>(KEYS.PERMOHONAN, INITIAL_PERMOHONAN);
  const updated = list.map((p) => (p.id === id ? { ...p, status } : p));
  setStored(KEYS.PERMOHONAN, updated);
}

/**
 * Kirim DELETE item ke backend. Mengembalikan pesan penolakan kalau server
 * menolak (mis. 409 karena item sudah pernah dipinjam), atau null kalau boleh
 * dilanjutkan. Saat backend tidak terjangkau, dianggap boleh lanjut supaya
 * mode offline (localStorage) tidak ikut rusak.
 */
async function tryDeleteItemApi(id: number, label: string): Promise<string | null> {
  try {
    const res = await axios.delete(`/api/item/jenis/${id}`);
    if (res.data?.success === false) {
      return res.data?.message || `Item gagal dihapus (${label}).`;
    }
    return null;
  } catch (err) {
    const response = (err as { response?: { data?: { message?: string } } })?.response;
    if (response) {
      return response.data?.message || `Item gagal dihapus (${label}).`;
    }
    console.warn(`API error deleting ${label}:`, err);
    return null;
  }
}

// ─── Ruangan ─────────────────────────────────────────────────────────────────
export async function getRuangan(): Promise<Ruangan[]> {
  try {
    const res = await axios.get('/api/item/jenis', { params: { id_jenis: CATEGORY_IDS.RUANGAN } });
    if (res.data?.success && Array.isArray(res.data?.data)) {
      const items: Ruangan[] = res.data.data.map((it: any) => ({
        id: it.id,
        nama: it.nama,
        kapasitas: it.kapasitas || 0,
        fasilitas: it.fasilitas || it.keterangan || '-',
        is_active: Boolean(it.is_active),
      }));
      setStored(KEYS.RUANGAN, items);
      return items;
    }
  } catch (err) {
    console.warn('API /api/item/jenis unreachable, using local storage:', err);
  }
  return getStored<Ruangan[]>(KEYS.RUANGAN, INITIAL_RUANGAN);
}

export async function addRuangan(data: Omit<Ruangan, 'id'>): Promise<Ruangan> {
  try {
    const res = await axios.post('/api/item/jenis', {
      id_jenis: CATEGORY_IDS.RUANGAN,
      nama: data.nama,
      kapasitas: data.kapasitas,
      fasilitas: data.fasilitas,
      keterangan: data.fasilitas,
      is_active: data.is_active,
    });
    if (res.data?.success && res.data?.data) {
      const item = res.data.data;
      const newRuangan: Ruangan = {
        id: item.id,
        nama: item.nama,
        kapasitas: item.kapasitas || 0,
        fasilitas: item.fasilitas || '-',
        is_active: Boolean(item.is_active),
      };
      const list = getStored<Ruangan[]>(KEYS.RUANGAN, INITIAL_RUANGAN);
      setStored(KEYS.RUANGAN, [newRuangan, ...list]);
      return newRuangan;
    }
  } catch (err) {
    console.warn('API error adding ruangan:', err);
  }

  const list = getStored<Ruangan[]>(KEYS.RUANGAN, INITIAL_RUANGAN);
  const newItem: Ruangan = { ...data, id: Date.now() };
  setStored(KEYS.RUANGAN, [newItem, ...list]);
  return newItem;
}

export async function deleteRuangan(id: number): Promise<string | null> {
  const blocked = await tryDeleteItemApi(id, 'ruangan');
  if (blocked) return blocked;

  const list = getStored<Ruangan[]>(KEYS.RUANGAN, INITIAL_RUANGAN);
  setStored(KEYS.RUANGAN, list.filter((r) => r.id !== id));
  return null;
}

export async function updateRuangan(id: number, data: Partial<Omit<Ruangan, 'id'>>): Promise<void> {
  try {
    await axios.put(`/api/item/jenis/${id}`, {
      id_jenis: CATEGORY_IDS.RUANGAN,
      nama: data.nama,
      kapasitas: data.kapasitas,
      fasilitas: data.fasilitas,
      keterangan: data.fasilitas,
      is_active: data.is_active,
    });
  } catch (err) {
    console.warn('API error updating ruangan:', err);
  }
  const list = getStored<Ruangan[]>(KEYS.RUANGAN, INITIAL_RUANGAN);
  const updated = list.map((r) => (r.id === id ? { ...r, ...data } : r));
  setStored(KEYS.RUANGAN, updated);
}

// ─── Kendaraan ───────────────────────────────────────────────────────────────
export async function getKendaraan(): Promise<Kendaraan[]> {
  try {
    const res = await axios.get('/api/item/jenis', { params: { id_jenis: CATEGORY_IDS.KENDARAAN } });
    if (res.data?.success && Array.isArray(res.data?.data)) {
      const items: Kendaraan[] = res.data.data.map((it: any) => ({
        id: it.id,
        nama: it.nama,
        nopol: it.registration_id || '-',
        kapasitas: it.kapasitas || 7,
        keterangan: it.keterangan || it.fasilitas || '-',
        is_active: Boolean(it.is_active),
      }));
      setStored(KEYS.KENDARAAN, items);
      return items;
    }
  } catch (err) {
    console.warn('API error fetching kendaraan:', err);
  }
  return getStored<Kendaraan[]>(KEYS.KENDARAAN, INITIAL_KENDARAAN);
}

export async function addKendaraan(data: Omit<Kendaraan, 'id'>): Promise<Kendaraan> {
  try {
    const res = await axios.post('/api/item/jenis', {
      id_jenis: CATEGORY_IDS.KENDARAAN,
      nama: data.nama,
      registration_id: data.nopol,
      kapasitas: data.kapasitas,
      keterangan: data.keterangan,
      is_active: data.is_active,
    });
    if (res.data?.success && res.data?.data) {
      const item = res.data.data;
      const newKendaraan: Kendaraan = {
        id: item.id,
        nama: item.nama,
        nopol: item.registration_id || '-',
        kapasitas: item.kapasitas || 7,
        keterangan: item.keterangan || '-',
        is_active: Boolean(item.is_active),
      };
      const list = getStored<Kendaraan[]>(KEYS.KENDARAAN, INITIAL_KENDARAAN);
      setStored(KEYS.KENDARAAN, [newKendaraan, ...list]);
      return newKendaraan;
    }
  } catch (err) {
    console.warn('API error adding kendaraan:', err);
  }

  const list = getStored<Kendaraan[]>(KEYS.KENDARAAN, INITIAL_KENDARAAN);
  const newItem: Kendaraan = { ...data, id: Date.now() };
  setStored(KEYS.KENDARAAN, [newItem, ...list]);
  return newItem;
}

export async function deleteKendaraan(id: number): Promise<string | null> {
  const blocked = await tryDeleteItemApi(id, 'kendaraan');
  if (blocked) return blocked;

  const list = getStored<Kendaraan[]>(KEYS.KENDARAAN, INITIAL_KENDARAAN);
  setStored(KEYS.KENDARAAN, list.filter((k) => k.id !== id));
  return null;
}

export async function updateKendaraan(id: number, data: Partial<Omit<Kendaraan, 'id'>>): Promise<void> {
  try {
    await axios.put(`/api/item/jenis/${id}`, {
      id_jenis: CATEGORY_IDS.KENDARAAN,
      nama: data.nama,
      registration_id: data.nopol,
      kapasitas: data.kapasitas,
      keterangan: data.keterangan,
      is_active: data.is_active,
    });
  } catch (err) {
    console.warn('API error updating kendaraan:', err);
  }
  const list = getStored<Kendaraan[]>(KEYS.KENDARAAN, INITIAL_KENDARAAN);
  const updated = list.map((k) => (k.id === id ? { ...k, ...data } : k));
  setStored(KEYS.KENDARAAN, updated);
}

// ─── Perlengkapan ─────────────────────────────────────────────────────────────
export async function getPerlengkapan(): Promise<Perlengkapan[]> {
  try {
    const res = await axios.get('/api/item/jenis', { params: { id_jenis: CATEGORY_IDS.ALAT } });
    if (res.data?.success && Array.isArray(res.data?.data)) {
      const items: Perlengkapan[] = res.data.data.map((it: any) => ({
        id: it.id,
        nama: it.nama,
        kode: it.registration_id || '-',
        jumlah: it.quantity || 1,
        keterangan: it.keterangan || it.fasilitas || '-',
        is_active: Boolean(it.is_active),
      }));
      setStored(KEYS.PERLENGKAPAN, items);
      return items;
    }
  } catch (err) {
    console.warn('API error fetching perlengkapan:', err);
  }
  return getStored<Perlengkapan[]>(KEYS.PERLENGKAPAN, INITIAL_PERLENGKAPAN);
}

export async function addPerlengkapan(data: Omit<Perlengkapan, 'id'>): Promise<Perlengkapan> {
  try {
    const res = await axios.post('/api/item/jenis', {
      id_jenis: CATEGORY_IDS.ALAT,
      nama: data.nama,
      registration_id: data.kode,
      quantity: data.jumlah,
      keterangan: data.keterangan,
      is_active: data.is_active,
    });
    if (res.data?.success && res.data?.data) {
      const item = res.data.data;
      const newPerlengkapan: Perlengkapan = {
        id: item.id,
        nama: item.nama,
        kode: item.registration_id || '-',
        jumlah: item.quantity || 1,
        keterangan: item.keterangan || '-',
        is_active: Boolean(item.is_active),
      };
      const list = getStored<Perlengkapan[]>(KEYS.PERLENGKAPAN, INITIAL_PERLENGKAPAN);
      setStored(KEYS.PERLENGKAPAN, [newPerlengkapan, ...list]);
      return newPerlengkapan;
    }
  } catch (err) {
    console.warn('API error adding perlengkapan:', err);
  }

  const list = getStored<Perlengkapan[]>(KEYS.PERLENGKAPAN, INITIAL_PERLENGKAPAN);
  const newItem: Perlengkapan = { ...data, id: Date.now() };
  setStored(KEYS.PERLENGKAPAN, [newItem, ...list]);
  return newItem;
}

export async function deletePerlengkapan(id: number): Promise<string | null> {
  const blocked = await tryDeleteItemApi(id, 'perlengkapan');
  if (blocked) return blocked;

  const list = getStored<Perlengkapan[]>(KEYS.PERLENGKAPAN, INITIAL_PERLENGKAPAN);
  setStored(KEYS.PERLENGKAPAN, list.filter((p) => p.id !== id));
  return null;
}

export async function updatePerlengkapan(id: number, data: Partial<Omit<Perlengkapan, 'id'>>): Promise<void> {
  try {
    await axios.put(`/api/item/jenis/${id}`, {
      id_jenis: CATEGORY_IDS.ALAT,
      nama: data.nama,
      registration_id: data.kode,
      quantity: data.jumlah,
      keterangan: data.keterangan,
      is_active: data.is_active,
    });
  } catch (err) {
    console.warn('API error updating perlengkapan:', err);
  }
  const list = getStored<Perlengkapan[]>(KEYS.PERLENGKAPAN, INITIAL_PERLENGKAPAN);
  const updated = list.map((p) => (p.id === id ? { ...p, ...data } : p));
  setStored(KEYS.PERLENGKAPAN, updated);
}
