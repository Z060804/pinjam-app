import axios from '../../services/api';
import { FormPeminjamanState } from '../../types';

export const normalizeDate = (dt: string): string => {
  return dt.includes('T') ? dt.replace('T', ' ') + (dt.length === 16 ? ':00' : '') : dt;
};

export const submitPeminjaman = async (
  form: FormPeminjamanState,
  uploadedFile: File | null
): Promise<string> => {
  if (uploadedFile) {
    const formData = new FormData();
    formData.append('nip', form.nip);
    formData.append('nama_peminjam', form.nama_peminjam);
    formData.append('unit_kerja', form.unit_kerja);
    if (form.nomor_hp) formData.append('nomor_hp', form.nomor_hp);
    formData.append('mulai', normalizeDate(form.mulai));
    formData.append('selesai', normalizeDate(form.selesai));
    formData.append('keperluan', form.keperluan);
    formData.append('surat_peminjaman_name', uploadedFile.name);
    formData.append('surat_file', uploadedFile);
    formData.append('selected_items', JSON.stringify(form.selected_items));

    const response = await axios.post('/api/peminjaman', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data?.data?.id_peminjaman ?? 'PMJ-SUCCESS';
  }

  const response = await axios.post('/api/peminjaman', {
    ...form,
    surat_peminjaman_name: form.surat_peminjaman_name || null,
    mulai: normalizeDate(form.mulai),
    selesai: normalizeDate(form.selesai),
  });
  return response.data?.data?.id_peminjaman ?? 'PMJ-SUCCESS';
};
