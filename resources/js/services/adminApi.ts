/**
 * Admin API Service – Connected directly to Laravel database endpoints (/api/...)
 * with synchronized fallback to ensure seamless local operation.
 */
import axios from 'axios';
import { Ruangan, Kendaraan, Perlengkapan, Permohonan } from '../types/admin';
import { ItemJenis } from '../types';
import { CATEGORY_IDS } from '../constants';
import {
  INITIAL_RUANGAN,
  INITIAL_KENDARAAN,
  INITIAL_PERLENGKAPAN,
  INITIAL_PERMOHONAN,
} from './adminMockData';

const KEYS = {
  AUTH: 'simpru_admin_auth',
  TOKEN: 'simpru_admin_token',
  RUANGAN: 'simpru_admin_ruangan_v2',
  KENDARAAN: 'simpru_admin_kendaraan_v2',
  PERLENGKAPAN: 'simpru_admin_perlengkapan_v2',
  PERMOHONAN: 'simpru_admin_permohonan_v2',
};

// Clean up old obsolete localStorage items or contaminated masked cache
try {
  localStorage.removeItem('simpru_admin_ruangan');
  localStorage.removeItem('simpru_admin_kendaraan');
  localStorage.removeItem('simpru_admin_perlengkapan');
  localStorage.removeItem('simpru_admin_permohonan');
  const cachedPermohonan = localStorage.getItem(KEYS.PERMOHONAN);
  if (cachedPermohonan && cachedPermohonan.includes('**')) {
    localStorage.removeItem(KEYS.PERMOHONAN);
  }
} catch {
  // Ignore in environments without localStorage
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
  } catch {
    // Ignore storage quota or access errors in restricted sandbox
  }
}

export function getAdminToken(): string | null {
  try {
    return localStorage.getItem(KEYS.TOKEN);
  } catch {
    return null;
  }
}

export function setAdminToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem(KEYS.TOKEN, token);
    } else {
      localStorage.removeItem(KEYS.TOKEN);
    }
  } catch {
    // Ignore in restricted environments
  }
}

export function getAuthHeaders(): Record<string, string> {
  const token = getAdminToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
export async function adminLogin(email: string, password: string): Promise<{ ok: boolean; message?: string }> {
  try {
    const res = await axios.post('/api/admin/login', { email, password });
    if (res.data?.success && res.data?.token) {
      setAdminToken(res.data.token);
      const user = res.data.user ?? { email, name: 'Administrator Kemenag' };
      setStored(KEYS.AUTH, user);
      return { ok: true };
    }
    return { ok: false, message: res.data?.message ?? 'Login gagal.' };
  } catch (err: unknown) {
    const errorObj = err as { response?: { data?: { message?: string } }; message?: string };
    const msg = errorObj.response?.data?.message ?? errorObj.message ?? 'Email atau kata sandi salah.';
    return { ok: false, message: msg };
  }
}

export async function adminLogout(): Promise<void> {
  try {
    const token = getAdminToken();
    if (token) {
      await axios.post('/api/admin/logout', {}, {
        headers: getAuthHeaders(),
      });
    }
  } catch {
    // Best-effort remote logout
  } finally {
    setAdminToken(null);
    localStorage.removeItem(KEYS.AUTH);
    localStorage.removeItem(KEYS.PERMOHONAN);
  }
}

export function getAdminSession(): { email: string; name: string } | null {
  return getStored<{ email: string; name: string } | null>(KEYS.AUTH, null);
}

// ─── Permohonan (Database backed) ─────────────────────────────────────────────
export async function getPermohonan(): Promise<Permohonan[]> {
  const token = getAdminToken();
  if (token) {
    try {
      const res = await axios.get('/api/master/peminjaman', {
        headers: getAuthHeaders(),
      });
      if (res.data?.success && Array.isArray(res.data?.data)) {
        setStored(KEYS.PERMOHONAN, res.data.data);
        return res.data.data;
      }
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 401) {
        setAdminToken(null);
        localStorage.removeItem(KEYS.AUTH);
        localStorage.removeItem(KEYS.PERMOHONAN);
        window.location.reload();
        return INITIAL_PERMOHONAN;
      }
    }
  }

  // Gunakan data cache jika tidak ada token, namun bersihkan jika ada nama tersensor
  const cached = getStored<Permohonan[]>(KEYS.PERMOHONAN, INITIAL_PERMOHONAN);
  if (Array.isArray(cached) && cached.some((p) => p.nama_pemohon?.includes('**'))) {
    setStored(KEYS.PERMOHONAN, INITIAL_PERMOHONAN);
    return INITIAL_PERMOHONAN;
  }
  return cached;
}

export async function updateStatusPermohonan(
  id: string,
  status: Permohonan['status'],
): Promise<void> {
  const res = await axios.patch(
    `/api/peminjaman/${encodeURIComponent(id)}/status`,
    {
      status,
      petugas: 'Admin SiRuang',
    },
    {
      headers: getAuthHeaders(),
    }
  );

  if (res.data?.success === false) {
    throw new Error(res.data?.message ?? 'Gagal memperbarui status di database.');
  }

  // Hanya perbarui cache lokal JIKA request ke server database berhasil
  const list = getStored<Permohonan[]>(KEYS.PERMOHONAN, INITIAL_PERMOHONAN);
  const updated = list.map((p) => (p.id === id ? { ...p, status } : p));
  setStored(KEYS.PERMOHONAN, updated);
}

/**
 * Kirim DELETE item ke backend dengan Bearer token.
 */
async function tryDeleteItemApi(id: number, label: string): Promise<string | null> {
  try {
    const res = await axios.delete(`/api/item/jenis/${id}`, {
      headers: getAuthHeaders(),
    });
    if (res.data?.success === false) {
      return res.data?.message ?? `Item gagal dihapus (${label}).`;
    }
    return null;
  } catch (err) {
    const response = (err as { response?: { data?: { message?: string } } })?.response;
    if (response) {
      return response.data?.message ?? `Item gagal dihapus (${label}).`;
    }
    throw err;
  }
}

// ─── Ruangan ─────────────────────────────────────────────────────────────────
export async function getRuangan(): Promise<Ruangan[]> {
  try {
    const res = await axios.get('/api/item/jenis', { params: { id_jenis: CATEGORY_IDS.RUANGAN } });
    if (res.data?.success && Array.isArray(res.data?.data)) {
      const items: Ruangan[] = res.data.data.map((it: ItemJenis) => ({
        id: it.id,
        nama: it.nama,
        kapasitas: it.kapasitas ?? 0,
        fasilitas: it.fasilitas ?? it.keterangan ?? '-',
        is_active: Boolean(it.is_active),
      }));
      setStored(KEYS.RUANGAN, items);
      return items;
    }
  } catch {
    // Fallback to local storage
  }
  return getStored<Ruangan[]>(KEYS.RUANGAN, INITIAL_RUANGAN);
}

export async function addRuangan(data: Omit<Ruangan, 'id'>): Promise<Ruangan> {
  try {
    const res = await axios.post(
      '/api/item/jenis',
      {
        id_jenis: CATEGORY_IDS.RUANGAN,
        nama: data.nama,
        kapasitas: data.kapasitas,
        fasilitas: data.fasilitas,
        keterangan: data.fasilitas,
        is_active: data.is_active,
      },
      { headers: getAuthHeaders() }
    );
    if (res.data?.success && res.data?.data) {
      const item: ItemJenis = res.data.data;
      const newRuangan: Ruangan = {
        id: item.id,
        nama: item.nama,
        kapasitas: item.kapasitas ?? 0,
        fasilitas: item.fasilitas ?? '-',
        is_active: Boolean(item.is_active),
      };
      const list = getStored<Ruangan[]>(KEYS.RUANGAN, INITIAL_RUANGAN);
      setStored(KEYS.RUANGAN, [newRuangan, ...list]);
      return newRuangan;
    }
  } catch (err) {
    throw err;
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
  await axios.put(
    `/api/item/jenis/${id}`,
    {
      id_jenis: CATEGORY_IDS.RUANGAN,
      nama: data.nama,
      kapasitas: data.kapasitas,
      fasilitas: data.fasilitas,
      keterangan: data.fasilitas,
      is_active: data.is_active,
    },
    { headers: getAuthHeaders() }
  );
  const list = getStored<Ruangan[]>(KEYS.RUANGAN, INITIAL_RUANGAN);
  const updated = list.map((r) => (r.id === id ? { ...r, ...data } : r));
  setStored(KEYS.RUANGAN, updated);
}

// ─── Kendaraan ───────────────────────────────────────────────────────────────
export async function getKendaraan(): Promise<Kendaraan[]> {
  try {
    const res = await axios.get('/api/item/jenis', { params: { id_jenis: CATEGORY_IDS.KENDARAAN } });
    if (res.data?.success && Array.isArray(res.data?.data)) {
      const items: Kendaraan[] = res.data.data.map((it: ItemJenis) => ({
        id: it.id,
        nama: it.nama,
        nopol: it.registration_id ?? '-',
        kapasitas: it.kapasitas ?? 7,
        keterangan: it.keterangan ?? it.fasilitas ?? '-',
        is_active: Boolean(it.is_active),
      }));
      setStored(KEYS.KENDARAAN, items);
      return items;
    }
  } catch {
    // Fallback to local storage
  }
  return getStored<Kendaraan[]>(KEYS.KENDARAAN, INITIAL_KENDARAAN);
}

export async function addKendaraan(data: Omit<Kendaraan, 'id'>): Promise<Kendaraan> {
  try {
    const res = await axios.post(
      '/api/item/jenis',
      {
        id_jenis: CATEGORY_IDS.KENDARAAN,
        nama: data.nama,
        registration_id: data.nopol,
        kapasitas: data.kapasitas,
        keterangan: data.keterangan,
        is_active: data.is_active,
      },
      { headers: getAuthHeaders() }
    );
    if (res.data?.success && res.data?.data) {
      const item: ItemJenis = res.data.data;
      const newKendaraan: Kendaraan = {
        id: item.id,
        nama: item.nama,
        nopol: item.registration_id ?? '-',
        kapasitas: item.kapasitas ?? 7,
        keterangan: item.keterangan ?? '-',
        is_active: Boolean(item.is_active),
      };
      const list = getStored<Kendaraan[]>(KEYS.KENDARAAN, INITIAL_KENDARAAN);
      setStored(KEYS.KENDARAAN, [newKendaraan, ...list]);
      return newKendaraan;
    }
  } catch (err) {
    throw err;
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
  await axios.put(
    `/api/item/jenis/${id}`,
    {
      id_jenis: CATEGORY_IDS.KENDARAAN,
      nama: data.nama,
      registration_id: data.nopol,
      kapasitas: data.kapasitas,
      keterangan: data.keterangan,
      is_active: data.is_active,
    },
    { headers: getAuthHeaders() }
  );
  const list = getStored<Kendaraan[]>(KEYS.KENDARAAN, INITIAL_KENDARAAN);
  const updated = list.map((k) => (k.id === id ? { ...k, ...data } : k));
  setStored(KEYS.KENDARAAN, updated);
}

// ─── Perlengkapan ─────────────────────────────────────────────────────────────
export async function getPerlengkapan(): Promise<Perlengkapan[]> {
  try {
    const res = await axios.get('/api/item/jenis', { params: { id_jenis: CATEGORY_IDS.ALAT } });
    if (res.data?.success && Array.isArray(res.data?.data)) {
      const items: Perlengkapan[] = res.data.data.map((it: ItemJenis) => ({
        id: it.id,
        nama: it.nama,
        kode: it.registration_id ?? '-',
        jumlah: it.quantity ?? 1,
        keterangan: it.keterangan ?? it.fasilitas ?? '-',
        is_active: Boolean(it.is_active),
      }));
      setStored(KEYS.PERLENGKAPAN, items);
      return items;
    }
  } catch {
    // Fallback to local storage
  }
  return getStored<Perlengkapan[]>(KEYS.PERLENGKAPAN, INITIAL_PERLENGKAPAN);
}

export async function addPerlengkapan(data: Omit<Perlengkapan, 'id'>): Promise<Perlengkapan> {
  try {
    const res = await axios.post(
      '/api/item/jenis',
      {
        id_jenis: CATEGORY_IDS.ALAT,
        nama: data.nama,
        registration_id: data.kode,
        quantity: data.jumlah,
        keterangan: data.keterangan,
        is_active: data.is_active,
      },
      { headers: getAuthHeaders() }
    );
    if (res.data?.success && res.data?.data) {
      const item: ItemJenis = res.data.data;
      const newPerlengkapan: Perlengkapan = {
        id: item.id,
        nama: item.nama,
        kode: item.registration_id ?? '-',
        jumlah: item.quantity ?? 1,
        keterangan: item.keterangan ?? '-',
        is_active: Boolean(item.is_active),
      };
      const list = getStored<Perlengkapan[]>(KEYS.PERLENGKAPAN, INITIAL_PERLENGKAPAN);
      setStored(KEYS.PERLENGKAPAN, [newPerlengkapan, ...list]);
      return newPerlengkapan;
    }
  } catch (err) {
    throw err;
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
  await axios.put(
    `/api/item/jenis/${id}`,
    {
      id_jenis: CATEGORY_IDS.ALAT,
      nama: data.nama,
      registration_id: data.kode,
      quantity: data.jumlah,
      keterangan: data.keterangan,
      is_active: data.is_active,
    },
    { headers: getAuthHeaders() }
  );
  const list = getStored<Perlengkapan[]>(KEYS.PERLENGKAPAN, INITIAL_PERLENGKAPAN);
  const updated = list.map((p) => (p.id === id ? { ...p, ...data } : p));
  setStored(KEYS.PERLENGKAPAN, updated);
}
