export interface MasterJenis {
  id: number;
  nama: string;
}

export interface ItemJenis {
  id: number;
  id_jenis: number;
  nama: string;
  is_active: boolean;
  registration_id: string | null;
  quantity: number;
  kapasitas?: number | null;
  fasilitas?: string | null;
  image_url: string | null;
  keterangan: string | null;
}

export interface MasterPeminjaman {
  id?: string;
  id_peminjaman: string;
  tgl_pengajuan: string;
  applicant_type?: 'internal' | 'external' | string;
  pihak_pemohon?: string;
  nip?: string;
  nama_peminjam: string;
  nama_pemohon?: string;
  unit_kerja: string;
  unit_pemohon?: string;
  tgl_mulai?: string;
  tgl_selesai?: string;
  waktu_mulai?: string;
  waktu_selesai?: string;
  mulai: string;
  selesai: string;
  keperluan: string;
  kegiatan?: string;
  surat_peminjaman: string | null;
  surat_url?: string | null;
  surat_terlampir?: boolean;
  status: string;
  petugas: string | null;
  nomor_hp?: string | null;
  penanggung_jawab?: string | null;
  item_dipinjam?: string;
  ruangan?: string;
  jenis?: 'ruangan' | 'kendaraan' | 'perlengkapan' | string;
  parent_id?: string | null;
  parent_registration_id?: string | null;
  booking_type?: 'single' | 'multiday' | 'recurring' | string;
  is_multiday?: boolean;
  is_recurring?: boolean;
  is_series?: boolean;
  session_number?: number | null;
  total_sessions?: number | null;
  session_label?: string | null;
  range_indicator?: 'Mulai' | 'Berlangsung' | 'Habis' | null;
  computed_status?: string | null;
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
    computed_status?: string;
    is_current_active?: boolean;
    range_indicator?: 'Mulai' | 'Berlangsung' | 'Habis' | null;
    is_parent: boolean;
    can_cancel?: boolean;
  }>;
}

export interface ItemPeminjaman {
  id: number;
  id_peminjaman: string;
  item_id: number;
  jumlah: number;
}

export interface CartItem {
  item: ItemJenis;
  jumlah: number;
}

export interface FormPeminjamanState {
  applicant_type: 'internal' | 'external';
  pihak_pemohon: string;
  nip: string;
  nama_peminjam: string;
  unit_kerja: string;
  nomor_hp?: string;
  mulai: string;
  selesai: string;
  keperluan: string;
  surat_peminjaman_name: string;
  selected_items: CartItem[];
  is_recurring?: boolean;
  recurring_frequency?: 'weekly' | string;
  recurring_end_date?: string;
}

export interface PeminjamanDetailItem extends ItemPeminjaman {
  item?: ItemJenis;
}

export interface PeminjamanFull extends MasterPeminjaman {
  items: PeminjamanDetailItem[];
}

export type ActiveTab = 'beranda' | 'ketersediaan' | 'ajukan' | 'pelacakan';
