import { describe, it, expect, vi, beforeEach } from 'vitest';
import { normalizeDate, submitPeminjaman } from './ajukanSubmit';
import axios from '../../services/api';

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

  it('submits JSON payload when no file is uploaded', async () => {
    vi.mocked(axios.post).mockResolvedValueOnce({
      data: { success: true, data: { id_peminjaman: 'PMJ-202610-099' } },
    });

    const form = {
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

    const id = await submitPeminjaman(form, null);
    expect(id).toBe('PMJ-202610-099');
    expect(axios.post).toHaveBeenCalledWith(
      '/api/peminjaman',
      expect.objectContaining({
        nip: '198501012010011001',
        mulai: '2026-10-15 08:00:00',
        selesai: '2026-10-15 16:00:00',
      })
    );
  });

  it('submits FormData multipart when file is attached', async () => {
    vi.mocked(axios.post).mockResolvedValueOnce({
      data: { success: true, data: { id_peminjaman: 'PMJ-202610-100' } },
    });

    const form = {
      nip: '198501012010011001',
      nama_peminjam: 'Ahmad Subarkah',
      unit_kerja: 'Bimas Islam',
      nomor_hp: '08123456789',
      mulai: '2026-10-15T08:00',
      selesai: '2026-10-15T16:00',
      keperluan: 'Bimbingan Teknis',
      surat_peminjaman_name: 'surat.pdf',
      selected_items: [],
    };

    const fakeFile = new File(['content'], 'surat_dinas.pdf', { type: 'application/pdf' });
    const id = await submitPeminjaman(form, fakeFile);

    expect(id).toBe('PMJ-202610-100');
    expect(axios.post).toHaveBeenCalledWith(
      '/api/peminjaman',
      expect.any(FormData),
      expect.objectContaining({
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    );
  });

  it('rejects file larger than 1 MB before making API request', async () => {
    const form = {
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
    const form = {
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
