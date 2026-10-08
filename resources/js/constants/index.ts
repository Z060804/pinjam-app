export const STATUS_PEMINJAMAN = {
  MENUNGGU: 'Menunggu Persetujuan',
  DISETUJUI: 'Disetujui',
  DITOLAK: 'Ditolak',
  SELESAI: 'Selesai',
} as const;

export const CATEGORY_IDS = {
  RUANGAN: 1,
  KENDARAAN: 2,
  ALAT: 3,
} as const;

export const THEME = {
  PRIMARY: '#009966',
  PRIMARY_HOVER: '#008055',
  PRIMARY_LIGHT: '#e6f7f0',
  APP_BG: '#f8fafc',
  CARD_BG: '#ffffff',
} as const;

export const STEP_NAMES = [
  'Pilih Item',
  'Data Peminjam',
  'Waktu & Keperluan',
  'Unggah Surat & Ringkasan',
] as const;

export const DEBOUNCE_DELAY_MS = 350;
export const API_SIMULATED_DELAY_MS = 250;
