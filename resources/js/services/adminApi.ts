/**
 * Admin API Service – Connected directly to Laravel database endpoints (/api/...)
 * All data operations are strictly routed through Laravel and PostgreSQL/MySQL/SQLite backend.
 */
import axios from 'axios';
import { Ruangan, Kendaraan, Perlengkapan, Permohonan } from '../types/admin';
import { ItemJenis } from '../types';
import { CATEGORY_IDS } from '../constants';

const KEYS = {
  AUTH: 'simpru_admin_auth',
  TOKEN: 'simpru_admin_token',
};

// Clean up old obsolete localStorage items
try {
  localStorage.removeItem('simpru_admin_ruangan');
  localStorage.removeItem('simpru_admin_kendaraan');
  localStorage.removeItem('simpru_admin_perlengkapan');
  localStorage.removeItem('simpru_admin_permohonan');
  localStorage.removeItem('simpru_admin_ruangan_v2');
  localStorage.removeItem('simpru_admin_kendaraan_v2');
  localStorage.removeItem('simpru_admin_perlengkapan_v2');
  localStorage.removeItem('simpru_admin_permohonan_v2');
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
  }
}

export function getAdminSession(): { email: string; name: string } | null {
  return getStored<{ email: string; name: string } | null>(KEYS.AUTH, null);
}

// ─── Permohonan (Database backed) ─────────────────────────────────────────────
export async function getPermohonan(): Promise<Permohonan[]> {
  const token = getAdminToken();
  if (!token) {
    throw new Error('Sesi admin belum aktif. Silakan login terlebih dahulu.');
  }

  try {
    const res = await axios.get('/api/master/peminjaman', {
      headers: getAuthHeaders(),
    });
    if (res.data?.success && Array.isArray(res.data?.data)) {
      return res.data.data;
    }
    throw new Error(res.data?.message ?? 'Gagal memuat daftar peminjaman dari server.');
  } catch (err: unknown) {
    const status = (err as { response?: { status?: number } })?.response?.status;
    if (status === 401) {
      setAdminToken(null);
      localStorage.removeItem(KEYS.AUTH);
      throw new Error('Sesi admin telah berakhir (401). Silakan login kembali.');
    }
    const message = (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message
      ?? (err as Error)?.message
      ?? 'Gagal memuat data peminjaman dari backend.';
    throw new Error(message);
  }
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
  const res = await axios.get('/api/item/jenis', {
    params: { id_jenis: CATEGORY_IDS.RUANGAN },
    headers: getAuthHeaders(),
  });
  if (res.data?.success && Array.isArray(res.data?.data)) {
    return res.data.data.map((it: ItemJenis) => ({
      id: it.id,
      nama: it.nama,
      kapasitas: it.kapasitas ?? 0,
      fasilitas: it.fasilitas ?? it.keterangan ?? '-',
      is_active: Boolean(it.is_active),
    }));
  }
  throw new Error(res.data?.message ?? 'Gagal memuat data ruangan dari server.');
}

export async function addRuangan(data: Omit<Ruangan, 'id'>): Promise<Ruangan> {
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
    return {
      id: item.id,
      nama: item.nama,
      kapasitas: item.kapasitas ?? 0,
      fasilitas: item.fasilitas ?? '-',
      is_active: Boolean(item.is_active),
    };
  }
  throw new Error(res.data?.message ?? 'Gagal menambahkan ruangan ke database.');
}

export async function deleteRuangan(id: number): Promise<string | null> {
  return await tryDeleteItemApi(id, 'ruangan');
}

export async function updateRuangan(id: number, data: Partial<Omit<Ruangan, 'id'>>): Promise<void> {
  const res = await axios.put(
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
  if (res.data?.success === false) {
    throw new Error(res.data?.message ?? 'Gagal memperbarui data ruangan di database.');
  }
}

// ─── Kendaraan ───────────────────────────────────────────────────────────────
export async function getKendaraan(): Promise<Kendaraan[]> {
  const res = await axios.get('/api/item/jenis', {
    params: { id_jenis: CATEGORY_IDS.KENDARAAN },
    headers: getAuthHeaders(),
  });
  if (res.data?.success && Array.isArray(res.data?.data)) {
    return res.data.data.map((it: ItemJenis) => ({
      id: it.id,
      nama: it.nama,
      nopol: it.registration_id ?? '-',
      kapasitas: it.kapasitas ?? 7,
      keterangan: it.keterangan ?? it.fasilitas ?? '-',
      is_active: Boolean(it.is_active),
    }));
  }
  throw new Error(res.data?.message ?? 'Gagal memuat data kendaraan dari server.');
}

export async function addKendaraan(data: Omit<Kendaraan, 'id'>): Promise<Kendaraan> {
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
    return {
      id: item.id,
      nama: item.nama,
      nopol: item.registration_id ?? '-',
      kapasitas: item.kapasitas ?? 7,
      keterangan: item.keterangan ?? '-',
      is_active: Boolean(item.is_active),
    };
  }
  throw new Error(res.data?.message ?? 'Gagal menambahkan kendaraan ke database.');
}

export async function deleteKendaraan(id: number): Promise<string | null> {
  return await tryDeleteItemApi(id, 'kendaraan');
}

export async function updateKendaraan(id: number, data: Partial<Omit<Kendaraan, 'id'>>): Promise<void> {
  const res = await axios.put(
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
  if (res.data?.success === false) {
    throw new Error(res.data?.message ?? 'Gagal memperbarui data kendaraan di database.');
  }
}

// ─── Perlengkapan ─────────────────────────────────────────────────────────────
export async function getPerlengkapan(): Promise<Perlengkapan[]> {
  const res = await axios.get('/api/item/jenis', {
    params: { id_jenis: CATEGORY_IDS.ALAT },
    headers: getAuthHeaders(),
  });
  if (res.data?.success && Array.isArray(res.data?.data)) {
    return res.data.data.map((it: ItemJenis) => ({
      id: it.id,
      nama: it.nama,
      kode: it.registration_id ?? '-',
      jumlah: it.quantity ?? 1,
      keterangan: it.keterangan ?? it.fasilitas ?? '-',
      is_active: Boolean(it.is_active),
    }));
  }
  throw new Error(res.data?.message ?? 'Gagal memuat data perlengkapan dari server.');
}

export async function addPerlengkapan(data: Omit<Perlengkapan, 'id'>): Promise<Perlengkapan> {
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
    return {
      id: item.id,
      nama: item.nama,
      kode: item.registration_id ?? '-',
      jumlah: item.quantity ?? 1,
      keterangan: item.keterangan ?? '-',
      is_active: Boolean(item.is_active),
    };
  }
  throw new Error(res.data?.message ?? 'Gagal menambahkan perlengkapan ke database.');
}

export async function deletePerlengkapan(id: number): Promise<string | null> {
  return await tryDeleteItemApi(id, 'perlengkapan');
}

export async function updatePerlengkapan(id: number, data: Partial<Omit<Perlengkapan, 'id'>>): Promise<void> {
  const res = await axios.put(
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
  if (res.data?.success === false) {
    throw new Error(res.data?.message ?? 'Gagal memperbarui data perlengkapan di database.');
  }
}
