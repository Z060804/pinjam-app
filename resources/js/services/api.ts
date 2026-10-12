import axios, { InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import {
  MasterJenis,
  ItemJenis,
  MasterPeminjaman,
  ItemPeminjaman,
  PeminjamanFull,
  FormPeminjamanState,
} from '../types';
import {
  INITIAL_MASTER_JENIS,
  INITIAL_ITEM_JENIS,
  INITIAL_MASTER_PEMINJAMAN,
  INITIAL_ITEM_PEMINJAMAN,
} from './mockData';
import { STATUS_PEMINJAMAN } from '../constants';

const STORAGE_KEYS = {
  MASTER_JENIS: 'simpru_master_jenis_v2',
  ITEM_JENIS: 'simpru_item_jenis_v2',
  MASTER_PEMINJAMAN: 'simpru_master_peminjaman_v2',
  ITEM_PEMINJAMAN: 'simpru_item_peminjaman_v2',
};

// Clean out old conflicting localStorage keys from previous dummy sessions
try {
  localStorage.removeItem('simpru_master_peminjaman');
  localStorage.removeItem('simpru_item_peminjaman');
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
    console.error('Failed to write to localStorage:', err);
  }
}

let masterJenisList: MasterJenis[] = getStored(STORAGE_KEYS.MASTER_JENIS, INITIAL_MASTER_JENIS);
let itemJenisList: ItemJenis[] = getStored(STORAGE_KEYS.ITEM_JENIS, INITIAL_ITEM_JENIS);
let masterPeminjamanList: MasterPeminjaman[] = getStored(STORAGE_KEYS.MASTER_PEMINJAMAN, INITIAL_MASTER_PEMINJAMAN);
let itemPeminjamanList: ItemPeminjaman[] = getStored(STORAGE_KEYS.ITEM_PEMINJAMAN, INITIAL_ITEM_PEMINJAMAN);

const apiClient = axios.create({
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
});

function resolveMockResponse(config: InternalAxiosRequestConfig): AxiosResponse {
  const url = config.url ?? '';
  const method = (config.method ?? 'get').toLowerCase();

  if (method === 'get' && url === '/api/master/jenis') {
    return { data: { success: true, data: masterJenisList }, status: 200, statusText: 'OK', headers: {}, config };
  }

  if (method === 'get' && url.startsWith('/api/item/jenis')) {
    const params = config.params || {};
    const idJenis = params.id_jenis ? Number(params.id_jenis) : null;
    const filtered = idJenis ? itemJenisList.filter((it) => it.id_jenis === idJenis) : itemJenisList;
    return { data: { success: true, data: filtered }, status: 200, statusText: 'OK', headers: {}, config };
  }

  if (method === 'get' && (url === '/api/master/peminjaman' || url === '/api/peminjaman')) {
    return { data: { success: true, data: [...masterPeminjamanList] }, status: 200, statusText: 'OK', headers: {}, config };
  }

  if (method === 'get' && url === '/api/item/peminjaman') {
    return { data: { success: true, data: [...itemPeminjamanList] }, status: 200, statusText: 'OK', headers: {}, config };
  }

  if (method === 'get' && url.startsWith('/api/peminjaman/')) {
    const id = url.replace('/api/peminjaman/', '').trim();
    const peminjaman = masterPeminjamanList.find((p) => (p.id_peminjaman || p.id || '').toLowerCase() === id.toLowerCase());
    if (!peminjaman) {
      return { data: { success: false, message: 'Peminjaman tidak ditemukan' }, status: 404, statusText: 'Not Found', headers: {}, config };
    }
    const relatedItems = itemPeminjamanList
      .filter((ip) => ip.id_peminjaman === (peminjaman.id_peminjaman || peminjaman.id))
      .map((ip) => ({
        ...ip,
        item: itemJenisList.find((ij) => ij.id === ip.item_id),
      }));
    const result: PeminjamanFull = { ...peminjaman, items: relatedItems };
    return { data: { success: true, data: result }, status: 200, statusText: 'OK', headers: {}, config };
  }

  if (method === 'post' && url === '/api/peminjaman') {
    const body: FormPeminjamanState = typeof config.data === 'string' ? JSON.parse(config.data) : config.data;

    // Check mock schedule conflict
    const reqMulai = new Date(body.mulai).getTime();
    const reqSelesai = new Date(body.selesai).getTime();

    for (const cartItem of body.selected_items || []) {
      let alreadyBooked = 0;
      const approvedBookings = masterPeminjamanList.filter((p) => p.status === STATUS_PEMINJAMAN.DISETUJUI);

      for (const booking of approvedBookings) {
        const bMulai = new Date(booking.mulai || booking.tgl_mulai || '').getTime();
        const bSelesai = new Date(booking.selesai || booking.tgl_selesai || '').getTime();
        const isOverlap = bMulai < reqSelesai && bSelesai > reqMulai;

        if (isOverlap) {
          const bookedItem = itemPeminjamanList.find(
            (ip) => (ip.id_peminjaman === (booking.id_peminjaman || booking.id)) && ip.item_id === cartItem.item.id
          );
          if (bookedItem) alreadyBooked += bookedItem.jumlah;
        }
      }

      if (alreadyBooked + cartItem.jumlah > cartItem.item.quantity) {
        return {
          data: {
            success: false,
            message: `Jadwal bentrok: ${cartItem.item.nama} sudah dipinjam pada rentang waktu yang sama.`,
          },
          status: 422,
          statusText: 'Unprocessable Content',
          headers: {},
          config,
        };
      }
    }

    const now = new Date();
    const seq = String(masterPeminjamanList.length + 1).padStart(3, '0');
    const newId = `PMJ-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${seq}`;

    const newMaster: MasterPeminjaman = {
      id_peminjaman: newId,
      tgl_pengajuan: now.toISOString().split('T')[0],
      nip: body.nip,
      nama_peminjam: body.nama_peminjam,
      unit_kerja: body.unit_kerja,
      mulai: body.mulai,
      selesai: body.selesai,
      keperluan: body.keperluan,
      surat_peminjaman: body.surat_peminjaman_name || 'surat_permohonan.pdf',
      status: STATUS_PEMINJAMAN.MENUNGGU,
      petugas: null,
    };

    const newItems: ItemPeminjaman[] = (body.selected_items || []).map((cart, idx) => ({
      id: itemPeminjamanList.length + idx + 1,
      id_peminjaman: newId,
      item_id: cart.item.id,
      jumlah: cart.jumlah,
    }));

    masterPeminjamanList = [newMaster, ...masterPeminjamanList];
    itemPeminjamanList = [...itemPeminjamanList, ...newItems];

    setStored(STORAGE_KEYS.MASTER_PEMINJAMAN, masterPeminjamanList);
    setStored(STORAGE_KEYS.ITEM_PEMINJAMAN, itemPeminjamanList);

    return {
      data: {
        success: true,
        message: 'Pengajuan peminjaman berhasil disimpan',
        data: {
          ...newMaster,
          items: newItems.map((ni) => ({
            ...ni,
            item: itemJenisList.find((ij) => ij.id === ni.item_id),
          })),
        },
      },
      status: 201,
      statusText: 'Created',
      headers: {},
      config,
    };
  }

  return { data: { success: false, message: 'Not found' }, status: 404, statusText: 'Not Found', headers: {}, config };
}

apiClient.interceptors.response.use(
  (response) => {
    // Sync backend responses to local storage for seamless offline persistence
    if (response.config.url === '/api/master/jenis' && response.data?.data) {
      masterJenisList = response.data.data;
      setStored(STORAGE_KEYS.MASTER_JENIS, masterJenisList);
    } else if (response.config.url?.startsWith('/api/item/jenis') && response.data?.data) {
      if (!response.config.params?.id_jenis) {
        itemJenisList = response.data.data;
        setStored(STORAGE_KEYS.ITEM_JENIS, itemJenisList);
      }
    } else if ((response.config.url === '/api/peminjaman' || response.config.url === '/api/master/peminjaman') && response.data?.data) {
      masterPeminjamanList = response.data.data;
      setStored(STORAGE_KEYS.MASTER_PEMINJAMAN, masterPeminjamanList);
    }
    return response;
  },
  (error) => {
    if (error.config && (!error.response || error.code === 'ERR_NETWORK')) {
      console.warn('Backend unreachable (network error), using local fallback:', error.config.url);
      return Promise.resolve(resolveMockResponse(error.config));
    }
    return Promise.reject(error);
  }
);

export default apiClient;
