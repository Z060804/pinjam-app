import axios, { AxiosResponse, InternalAxiosRequestConfig } from 'axios';
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
import { API_SIMULATED_DELAY_MS, STATUS_PEMINJAMAN } from '../constants';

const STORAGE_KEYS = {
  MASTER_JENIS: 'simpru_master_jenis',
  ITEM_JENIS: 'simpru_item_jenis',
  MASTER_PEMINJAMAN: 'simpru_master_peminjaman',
  ITEM_PEMINJAMAN: 'simpru_item_peminjaman',
};

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

// Initializing store
let masterJenisList: MasterJenis[] = getStored(STORAGE_KEYS.MASTER_JENIS, INITIAL_MASTER_JENIS);
let itemJenisList: ItemJenis[] = getStored(STORAGE_KEYS.ITEM_JENIS, INITIAL_ITEM_JENIS);
let masterPeminjamanList: MasterPeminjaman[] = getStored(STORAGE_KEYS.MASTER_PEMINJAMAN, INITIAL_MASTER_PEMINJAMAN);
let itemPeminjamanList: ItemPeminjaman[] = getStored(STORAGE_KEYS.ITEM_PEMINJAMAN, INITIAL_ITEM_PEMINJAMAN);

// Custom Axios Adapter for simulated endpoints
axios.defaults.adapter = async (config: InternalAxiosRequestConfig): Promise<AxiosResponse> => {
  await new Promise((resolve) => setTimeout(resolve, API_SIMULATED_DELAY_MS));
  const url = config.url ?? '';
  const method = (config.method ?? 'get').toLowerCase();

  // GET /api/master/jenis
  if (method === 'get' && url === '/api/master/jenis') {
    return {
      data: { success: true, data: masterJenisList },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    };
  }

  // GET /api/item/jenis
  if (method === 'get' && url.startsWith('/api/item/jenis')) {
    const params = config.params || {};
    const idJenis = params.id_jenis ? Number(params.id_jenis) : null;
    const filtered = idJenis ? itemJenisList.filter((it) => it.id_jenis === idJenis) : itemJenisList;
    return {
      data: { success: true, data: filtered },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    };
  }

  // GET /api/master/peminjaman
  if (method === 'get' && url === '/api/master/peminjaman') {
    return {
      data: { success: true, data: [...masterPeminjamanList] },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    };
  }

  // GET /api/item/peminjaman
  if (method === 'get' && url === '/api/item/peminjaman') {
    return {
      data: { success: true, data: [...itemPeminjamanList] },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    };
  }

  // GET /api/peminjaman/:id
  if (method === 'get' && url.startsWith('/api/peminjaman/')) {
    const id = url.replace('/api/peminjaman/', '').trim();
    const peminjaman = masterPeminjamanList.find((p) => p.id_peminjaman.toLowerCase() === id.toLowerCase());
    if (!peminjaman) {
      return {
        data: { success: false, message: 'Peminjaman tidak ditemukan' },
        status: 404,
        statusText: 'Not Found',
        headers: {},
        config,
      };
    }
    const relatedItems = itemPeminjamanList
      .filter((ip) => ip.id_peminjaman === peminjaman.id_peminjaman)
      .map((ip) => ({
        ...ip,
        item: itemJenisList.find((ij) => ij.id === ip.item_id),
      }));

    const result: PeminjamanFull = {
      ...peminjaman,
      items: relatedItems,
    };

    return {
      data: { success: true, data: result },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    };
  }

  // POST /api/peminjaman
  if (method === 'post' && url === '/api/peminjaman') {
    const body: FormPeminjamanState = typeof config.data === 'string' ? JSON.parse(config.data) : config.data;
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

    const newItems: ItemPeminjaman[] = body.selected_items.map((cart, idx) => ({
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
        message: 'Pengajuan peminjaman berhasil dikirim',
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

  return {
    data: { success: false, message: 'Endpoint not simulated' },
    status: 404,
    statusText: 'Not Found',
    headers: {},
    config,
  };
};

export default axios;
