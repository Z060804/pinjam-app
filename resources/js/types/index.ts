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
  nip: string;
  nama_peminjam: string;
  unit_kerja: string;
  nomor_hp?: string;
  mulai: string;
  selesai: string;
  keperluan: string;
  surat_peminjaman_name: string;
  selected_items: CartItem[];
}

export interface PeminjamanDetailItem extends ItemPeminjaman {
  item?: ItemJenis;
}

export interface PeminjamanFull extends MasterPeminjaman {
  items: PeminjamanDetailItem[];
}

export type ActiveTab = 'beranda' | 'ketersediaan' | 'ajukan' | 'pelacakan';
