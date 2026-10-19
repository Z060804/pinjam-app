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
export interface PermohonanItemDetail {
  id?: number;
  item_id: number;
  jumlah: number;
  nama: string;
  registration_id?: string | null;
  id_jenis?: number;
  kategori?: string;
}

export interface Permohonan {
  id: string;
  id_peminjaman?: string;
  tgl_pengajuan: string;
  applicant_type?: 'internal' | 'external' | string;
  pihak_pemohon: string; // e.g. "Internal Kemenag Sleman"
  unit_pemohon: string;
  nama_pemohon: string;
  nip?: string;
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
  surat_peminjaman?: string | null;
  // generic: for perlengkapan / kendaraan / ruangan / kombinasi
  jenis: 'ruangan' | 'kendaraan' | 'perlengkapan' | 'kombinasi' | string;
  kategori_list?: string[];
  is_multi_item?: boolean;
  item_dipinjam: string; // nama item
  items?: PermohonanItemDetail[];
  parent_id?: string | null;
  parent_registration_id?: string | null;
  is_recurring?: boolean;
  session_number?: number | null;
  total_sessions?: number | null;
  active_sessions_count?: number | null;
  cancelled_sessions_count?: number | null;
  status_summary?: string | null;
  session_label?: string | null;
  next_session_date?: string | null;
  recurring_frequency?: string | null;
  recurring_end_date?: string | null;
  recurring_schedules?: Array<{
    index: number;
    session_number?: number;
    total_sessions?: number;
    id?: string;
    id_peminjaman: string;
    parent_id?: string | null;
    tgl_mulai: string;
    waktu_mulai: string;
    waktu_selesai: string;
    mulai: string;
    selesai: string;
    status: string;
    is_parent: boolean;
    can_cancel?: boolean;
  }>;
}

export type AdminActiveTab = 'rekap' | 'ruangan' | 'kendaraan' | 'perlengkapan';
export type RekapStatusFilter = 'Semua' | 'Menunggu Persetujuan' | 'Disetujui' | 'Tidak Disetujui' | 'Dibatalkan';
