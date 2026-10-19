import { describe, it, expect, vi, beforeEach } from 'vitest';
import { normalizeDate, submitPeminjaman } from './ajukanSubmit';
import axios from '../../services/api';
import { FormPeminjamanState } from '../../types';

vi.mock('../../services/api', () => ({
  default: {
    post: vi.fn(),
  },
}));

describe('Ajukan Submit Helper (ajukanSubmit.ts)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('normalizes ISO date string with T to SQL space format with seconds', () => {
    expect(normalizeDate('2026-10-15T08:00')).toBe('2026-10-15 08:00:00');
    expect(normalizeDate('2026-10-15T08:00:30')).toBe('2026-10-15 08:00:30');
    expect(normalizeDate('2026-10-15 08:00:00')).toBe('2026-10-15 08:00:00');
  });

  it('submits JSON payload when no file is uploaded for internal applicant', async () => {
    vi.mocked(axios.post).mockResolvedValueOnce({
      data: { success: true, data: { id_peminjaman: 'PMJ-202610-099' } },
    });

    const form: FormPeminjamanState = {
      applicant_type: 'internal',
      pihak_pemohon: 'Internal Kemenag Sleman',
      nip: '198501012010011001',
      nama_peminjam: 'Ahmad Subarkah',
      unit_kerja: 'Bimas Islam',
      nomor_hp: '08123456789',
      mulai: '2026-10-15T08:00',
      selesai: '2026-10-15T16:00',
      keperluan: 'Bimbingan Teknis',
      surat_peminjaman_name: '',
      selected_items: [],
    };

    const res = await submitPeminjaman(form, null);
    expect(res.id_peminjaman).toBe('PMJ-202610-099');
    expect(axios.post).toHaveBeenCalledWith(
      '/api/peminjaman',
      expect.objectContaining({
        applicant_type: 'internal',
        pihak_pemohon: 'Internal Kemenag Sleman',
        nip: '198501012010011001',
        mulai: '2026-10-15 08:00:00',
        selesai: '2026-10-15 16:00:00',
      })
    );
  });

  it('submits FormData multipart with applicant_type and file when file is attached', async () => {
    vi.mocked(axios.post).mockResolvedValueOnce({
      data: { success: true, data: { id_peminjaman: 'PMJ-202610-100' } },
    });

    const form: FormPeminjamanState = {
      applicant_type: 'external',
      pihak_pemohon: 'Eksternal (Madrasah/KUA/Lainnya)',
      nip: '',
      nama_peminjam: 'Siti Nurjanah',
      unit_kerja: 'MTs Negeri 1',
      nomor_hp: '08123456789',
      mulai: '2026-10-15T08:00',
      selesai: '2026-10-15 16:00',
      keperluan: 'Lomba Sains',
      surat_peminjaman_name: 'surat.pdf',
      selected_items: [],
    };

    const fakeFile = new File(['content'], 'surat_dinas.pdf', { type: 'application/pdf' });
    const res = await submitPeminjaman(form, fakeFile);

    expect(res.id_peminjaman).toBe('PMJ-202610-100');
    expect(axios.post).toHaveBeenCalledWith(
      '/api/peminjaman',
      expect.any(FormData),
      expect.objectContaining({
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    );
  });

  it('submits recurring parameters when is_recurring is true', async () => {
    vi.mocked(axios.post).mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          id_peminjaman: 'PMJ-202610-101',
          is_recurring: true,
          recurring_frequency: 'weekly',
          recurring_end_date: '2026-11-23',
          recurring_schedules: [{ mulai: '2026-10-19 08:00:00' }, { mulai: '2026-10-26 08:00:00' }],
        },
      },
    });

    const form: FormPeminjamanState = {
      applicant_type: 'internal',
      pihak_pemohon: 'Internal Kemenag Sleman',
      nip: '198501012010011001',
      nama_peminjam: 'Ahmad Subarkah',
      unit_kerja: 'Bimas Islam',
      nomor_hp: '08123456789',
      mulai: '2026-10-19T08:00',
      selesai: '2026-10-19T12:00',
      keperluan: 'Kegiatan Berulang',
      surat_peminjaman_name: '',
      selected_items: [],
      is_recurring: true,
      recurring_frequency: 'weekly',
      recurring_end_date: '2026-11-23',
    };

    const res = await submitPeminjaman(form, null);
    expect(res.id_peminjaman).toBe('PMJ-202610-101');
    expect(res.is_recurring).toBe(true);
    expect(res.recurring_schedules).toHaveLength(2);
    expect(axios.post).toHaveBeenCalledWith(
      '/api/peminjaman',
      expect.objectContaining({
        is_recurring: true,
        recurring_frequency: 'weekly',
        recurring_end_date: '2026-11-23',
      })
    );
  });

  it('rejects file larger than 1 MB before making API request', async () => {
    const form: FormPeminjamanState = {
      applicant_type: 'internal',
      pihak_pemohon: 'Internal Kemenag Sleman',
      nip: '198501012010011001',
      nama_peminjam: 'Ahmad Subarkah',
      unit_kerja: 'Bimas Islam',
      nomor_hp: '08123456789',
      mulai: '2026-10-15T08:00',
      selesai: '2026-10-15T16:00',
      keperluan: 'Bimbingan Teknis',
      surat_peminjaman_name: 'oversized.pdf',
      selected_items: [],
    };

    // Create file > 1 MB (1048577 bytes)
    const largeContent = new Uint8Array(1048577);
    const oversizedFile = new File([largeContent], 'oversized.pdf', { type: 'application/pdf' });

    await expect(submitPeminjaman(form, oversizedFile)).rejects.toThrow(
      /1 MB/i
    );
    expect(axios.post).not.toHaveBeenCalled();
  });

  it('rejects non-PDF files before making API request', async () => {
    const form: FormPeminjamanState = {
      applicant_type: 'internal',
      pihak_pemohon: 'Internal Kemenag Sleman',
      nip: '198501012010011001',
      nama_peminjam: 'Ahmad Subarkah',
      unit_kerja: 'Bimas Islam',
      nomor_hp: '08123456789',
      mulai: '2026-10-15T08:00',
      selesai: '2026-10-15T16:00',
      keperluan: 'Bimbingan Teknis',
      surat_peminjaman_name: 'gambar.png',
      selected_items: [],
    };

    const imageFile = new File(['fakeimage'], 'gambar.png', { type: 'image/png' });

    await expect(submitPeminjaman(form, imageFile)).rejects.toThrow(
      /PDF/i
    );
    expect(axios.post).not.toHaveBeenCalled();
  });
});
