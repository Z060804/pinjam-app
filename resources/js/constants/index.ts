/**
 * Harus sama persis dengan enum backend di SimpruController::updateStatus()
 * (app/Http/Controllers/SimpruController.php), karena nilai ini dicocokkan
 * langsung dengan `status` yang dikirim API.
 */
export const STATUS_PEMINJAMAN = {
  MENUNGGU: 'Menunggu Persetujuan',
  DISETUJUI: 'Disetujui',
  DITOLAK: 'Tidak Disetujui',
  DIBATALKAN: 'Dibatalkan',
} as const;

export const CATEGORY_IDS = {
  RUANGAN: 1,
  KENDARAAN: 2,
  ALAT: 3,
} as const;

/**
 * Daftar jenis layanan beserta id-nya. Dipusatkan di sini supaya label jenis
 * tidak bisa lepas sinkron dengan pemetaan id di CATEGORY_IDS — sebelumnya
 * daftar ini disalin ulang di INITIAL_MASTER_JENIS dan sempat berbeda
 * ('Alat' vs 'Perlengkapan').
 *
 * Catatan: deskripsi & ikon untuk kartu di beranda sengaja tidak di sini,
 * karena itu copy tampilan yang berdiri sendiri.
 */
export const CATEGORIES = [
  { id: CATEGORY_IDS.RUANGAN, name: 'Ruangan' },
  { id: CATEGORY_IDS.KENDARAAN, name: 'Kendaraan' },
  { id: CATEGORY_IDS.ALAT, name: 'Alat' },
] as const;

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
