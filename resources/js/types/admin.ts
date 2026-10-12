// ─── Ruangan (Rooms) ─────────────────────────────────────────────────────────
export interface Ruangan {
  id: number;
  nama: string;
  kapasitas: number;
  fasilitas: string;
  is_active: boolean;
}

// ─── Kendaraan (Vehicles) ────────────────────────────────────────────────────
export interface Kendaraan {
  id: number;
  nama: string;
  nopol: string;
  kapasitas: number;
  keterangan: string;
  is_active: boolean;
}

// ─── Perlengkapan (Equipment) ─────────────────────────────────────────────────
export interface Perlengkapan {
  id: number;
  nama: string;
  kode: string;
  jumlah: number;
  keterangan: string;
  is_active: boolean;
}

// ─── Permohonan / Rekap ──────────────────────────────────────────────────────
export interface Permohonan {
  id: string;
  tgl_pengajuan: string;
  pihak_pemohon: string; // e.g. "Internal Kemenag Sleman"
  unit_pemohon: string;
  nama_pemohon: string;
  nomor_hp: string;
  penanggung_jawab: string;
  jumlah_peserta: number;
  ruangan: string;
  tgl_mulai: string;   // ISO date
  tgl_selesai: string;
  waktu_mulai: string; // HH:mm
  waktu_selesai: string;
  kegiatan: string;
  status: 'Menunggu Persetujuan' | 'Disetujui' | 'Tidak Disetujui' | 'Dibatalkan';
  surat_url: string | null;
  // generic: for perlengkapan / kendaraan booking
  jenis: 'ruangan' | 'kendaraan' | 'perlengkapan';
  item_dipinjam: string; // nama item
}

export type AdminActiveTab = 'rekap' | 'ruangan' | 'kendaraan' | 'perlengkapan';
export type RekapStatusFilter = 'Semua' | 'Menunggu Persetujuan' | 'Disetujui' | 'Tidak Disetujui' | 'Dibatalkan';
