import axios from '../../services/api';
import { FormPeminjamanState } from '../../types';

export interface SubmitPeminjamanResult {
  id_peminjaman: string;
  status: string;
  is_recurring?: boolean;
  recurring_frequency?: string | null;
  recurring_end_date?: string | null;
  recurring_schedules?: Array<{
    id_peminjaman: string;
    tgl_mulai: string;
    waktu_mulai: string;
    waktu_selesai: string;
    status: string;
  }>;
}

export const normalizeDate = (dt: string): string => {
  if (!dt) return '';
  const clean = dt.includes('T') ? dt.replace('T', ' ') : dt;
  return clean.length === 16 ? `${clean}:00` : clean;
};

export const submitPeminjaman = async (
  form: FormPeminjamanState,
  uploadedFile: File | null
): Promise<SubmitPeminjamanResult> => {
  if (uploadedFile) {
    if (!uploadedFile.name.toLowerCase().endsWith('.pdf') || uploadedFile.size > 1048576) {
      throw new Error('Berkas surat permohonan harus berformat PDF (.pdf) dengan ukuran maksimal 1 MB (1.048.576 byte).');
    }
    const formData = new FormData();
    formData.append('applicant_type', form.applicant_type);
    formData.append('pihak_pemohon', form.pihak_pemohon);
    if (form.applicant_type === 'internal') {
      formData.append('nip', form.nip);
    }
    formData.append('nama_peminjam', form.nama_peminjam);
    formData.append('unit_kerja', form.unit_kerja);
    if (form.nomor_hp) formData.append('nomor_hp', form.nomor_hp);
    const sessionEndDate = form.is_recurring ? form.mulai.substring(0, 10) : form.selesai.substring(0, 10);
    const sessionEndTime = form.selesai.includes('T') ? form.selesai.split('T')[1] : (form.selesai.includes(' ') ? form.selesai.split(' ')[1] : '16:00:00');
    const resolvedSelesai = form.is_recurring
      ? normalizeDate(`${sessionEndDate} ${sessionEndTime}`)
      : normalizeDate(form.selesai);

    formData.append('mulai', normalizeDate(form.mulai));
    formData.append('selesai', resolvedSelesai);
    formData.append('keperluan', form.keperluan);
    formData.append('surat_peminjaman_name', uploadedFile.name);
    formData.append('surat_file', uploadedFile);
    formData.append('selected_items', JSON.stringify(form.selected_items));

    if (form.is_recurring) {
      formData.append('is_recurring', '1');
      formData.append('recurring_frequency', form.recurring_frequency || 'weekly');
      if (form.recurring_end_date) {
        formData.append('recurring_end_date', form.recurring_end_date);
      }
    }

    const response = await axios.post('/api/peminjaman', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    const data = response.data?.data;
    if (!data?.id_peminjaman && !data?.id) {
      throw new Error('Respons backend tidak valid: ID peminjaman tidak ditemukan.');
    }

    return {
      id_peminjaman: data.id_peminjaman ?? data.id,
      status: data.status ?? 'Menunggu Persetujuan',
      is_recurring: Boolean(data.is_recurring),
      recurring_frequency: data.recurring_frequency,
      recurring_end_date: data.recurring_end_date,
      recurring_schedules: data.recurring_schedules,
    };
  }

  const sessionEndDate = form.is_recurring ? form.mulai.substring(0, 10) : form.selesai.substring(0, 10);
  const sessionEndTime = form.selesai.includes('T') ? form.selesai.split('T')[1] : (form.selesai.includes(' ') ? form.selesai.split(' ')[1] : '16:00:00');
  const resolvedSelesai = form.is_recurring
    ? normalizeDate(`${sessionEndDate} ${sessionEndTime}`)
    : normalizeDate(form.selesai);

  const response = await axios.post('/api/peminjaman', {
    ...form,
    nip: form.applicant_type === 'internal' ? form.nip : null,
    surat_peminjaman_name: form.surat_peminjaman_name || null,
    mulai: normalizeDate(form.mulai),
    selesai: resolvedSelesai,
    is_recurring: Boolean(form.is_recurring),
    recurring_frequency: form.is_recurring ? (form.recurring_frequency || 'weekly') : null,
    recurring_end_date: form.is_recurring ? form.recurring_end_date : null,
  });

  const data = response.data?.data;
  if (!data?.id_peminjaman && !data?.id) {
    throw new Error('Respons backend tidak valid: ID peminjaman tidak ditemukan.');
  }

  return {
    id_peminjaman: data.id_peminjaman ?? data.id,
    status: data.status ?? 'Menunggu Persetujuan',
    is_recurring: Boolean(data.is_recurring),
    recurring_frequency: data.recurring_frequency,
    recurring_end_date: data.recurring_end_date,
    recurring_schedules: data.recurring_schedules,
  };
};
