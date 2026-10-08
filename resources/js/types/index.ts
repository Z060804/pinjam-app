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
  image_url: string | null;
  keterangan: string | null;
}

export interface MasterPeminjaman {
  id_peminjaman: string;
  tgl_pengajuan: string;
  nip: string;
  nama_peminjam: string;
  unit_kerja: string;
  mulai: string;
  selesai: string;
  keperluan: string;
  surat_peminjaman: string | null;
  status: string;
  petugas: string | null;
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
