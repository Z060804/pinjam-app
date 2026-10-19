import { describe, it, expect } from 'vitest';
import { groupPermohonanForRekap } from './rekapGrouping';
import { Permohonan } from '../types/admin';

describe('groupPermohonanForRekap', () => {
  const normalLoan: Permohonan = {
    id: 'PMJ-NORMAL-001',
    id_peminjaman: 'PMJ-NORMAL-001',
    tgl_pengajuan: '2026-10-15',
    pihak_pemohon: 'Internal Kemenag Sleman',
    unit_pemohon: 'Bimas Islam',
    nama_pemohon: 'Ahmad Fauzi',
    nomor_hp: '08123456789',
    penanggung_jawab: 'Ahmad Fauzi',
    jumlah_peserta: 20,
    ruangan: 'Smartroom',
    tgl_mulai: '2026-10-22',
    tgl_selesai: '2026-10-30',
    waktu_mulai: '08:00',
    waktu_selesai: '16:00',
    kegiatan: 'Bimtek Penghulu',
    status: 'Disetujui',
    surat_url: null,
    jenis: 'ruangan',
    item_dipinjam: 'Smartroom Balai Nikah',
    is_recurring: false,
    parent_id: null,
  };

  const recurringSessions: Permohonan[] = [
    {
      id: 'PMJ-REC-001',
      id_peminjaman: 'PMJ-REC-001',
      tgl_pengajuan: '2026-10-18',
      pihak_pemohon: 'Internal Kemenag Sleman',
      unit_pemohon: 'Penmad',
      nama_pemohon: 'H. Sudirman',
      nomor_hp: '08129876543',
      penanggung_jawab: 'H. Sudirman',
      jumlah_peserta: 40,
      ruangan: 'Aula',
      tgl_mulai: '2026-11-06',
      tgl_selesai: '2026-11-06',
      waktu_mulai: '08:00',
      waktu_selesai: '09:00',
      kegiatan: 'Kajian Rutin Jumat',
      status: 'Menunggu Persetujuan',
      surat_url: null,
      jenis: 'ruangan',
      item_dipinjam: 'Aula Lantai 3',
      is_recurring: true,
      parent_id: null,
    },
    {
      id: 'PMJ-REC-002',
      id_peminjaman: 'PMJ-REC-002',
      tgl_pengajuan: '2026-10-18',
      pihak_pemohon: 'Internal Kemenag Sleman',
      unit_pemohon: 'Penmad',
      nama_pemohon: 'H. Sudirman',
      nomor_hp: '08129876543',
      penanggung_jawab: 'H. Sudirman',
      jumlah_peserta: 40,
      ruangan: 'Aula',
      tgl_mulai: '2026-11-13',
      tgl_selesai: '2026-11-13',
      waktu_mulai: '08:00',
      waktu_selesai: '09:00',
      kegiatan: 'Kajian Rutin Jumat',
      status: 'Menunggu Persetujuan',
      surat_url: null,
      jenis: 'ruangan',
      item_dipinjam: 'Aula Lantai 3',
      is_recurring: true,
      parent_id: 'PMJ-REC-001',
    },
    {
      id: 'PMJ-REC-003',
      id_peminjaman: 'PMJ-REC-003',
      tgl_pengajuan: '2026-10-18',
      pihak_pemohon: 'Internal Kemenag Sleman',
      unit_pemohon: 'Penmad',
      nama_pemohon: 'H. Sudirman',
      nomor_hp: '08129876543',
      penanggung_jawab: 'H. Sudirman',
      jumlah_peserta: 40,
      ruangan: 'Aula',
      tgl_mulai: '2026-11-20',
      tgl_selesai: '2026-11-20',
      waktu_mulai: '08:00',
      waktu_selesai: '09:00',
      kegiatan: 'Kajian Rutin Jumat',
      status: 'Menunggu Persetujuan',
      surat_url: null,
      jenis: 'ruangan',
      item_dipinjam: 'Aula Lantai 3',
      is_recurring: true,
      parent_id: 'PMJ-REC-001',
    },
    {
      id: 'PMJ-REC-004',
      id_peminjaman: 'PMJ-REC-004',
      tgl_pengajuan: '2026-10-18',
      pihak_pemohon: 'Internal Kemenag Sleman',
      unit_pemohon: 'Penmad',
      nama_pemohon: 'H. Sudirman',
      nomor_hp: '08129876543',
      penanggung_jawab: 'H. Sudirman',
      jumlah_peserta: 40,
      ruangan: 'Aula',
      tgl_mulai: '2026-11-27',
      tgl_selesai: '2026-11-27',
      waktu_mulai: '08:00',
      waktu_selesai: '09:00',
      kegiatan: 'Kajian Rutin Jumat',
      status: 'Menunggu Persetujuan',
      surat_url: null,
      jenis: 'ruangan',
      item_dipinjam: 'Aula Lantai 3',
      is_recurring: true,
      parent_id: 'PMJ-REC-001',
    },
  ];

  it('keeps normal loan as exactly one row without recurring badge', () => {
    const res = groupPermohonanForRekap([normalLoan]);
    expect(res).toHaveLength(1);
    expect(res[0].id).toBe('PMJ-NORMAL-001');
    expect(res[0].is_recurring).toBeFalsy();
    expect(res[0].tgl_mulai).toBe('2026-10-22');
    expect(res[0].tgl_selesai).toBe('2026-10-30');
  });

  it('groups 4 recurring sessions into exactly ONE row with correct date span', () => {
    const allRecords = [normalLoan, ...recurringSessions];
    const res = groupPermohonanForRekap(allRecords);

    // Total rows must be exactly 2 (1 normal loan + 1 recurring series)
    expect(res).toHaveLength(2);

    const seriesRow = res.find((r) => r.id === 'PMJ-REC-001');
    expect(seriesRow).toBeDefined();
    expect(seriesRow?.is_recurring).toBe(true);
    expect(seriesRow?.total_sessions).toBe(4);
    expect(seriesRow?.session_label).toBe('4 Sesi');
    // Actual first and last session dates
    expect(seriesRow?.tgl_mulai).toBe('2026-11-06');
    expect(seriesRow?.tgl_selesai).toBe('2026-11-27');
    expect(seriesRow?.recurring_schedules).toHaveLength(4);
  });

  it('displays correct summary when one session is cancelled', () => {
    // Sesi 2 dibatalkan
    const modifiedSessions = recurringSessions.map((s) =>
      s.id === 'PMJ-REC-002' ? { ...s, status: 'Dibatalkan' as const } : s
    );

    const res = groupPermohonanForRekap(modifiedSessions);
    expect(res).toHaveLength(1);

    const series = res[0];
    expect(series.total_sessions).toBe(4);
    expect(series.active_sessions_count).toBe(3);
    expect(series.cancelled_sessions_count).toBe(1);
    expect(series.status_summary).toBe('3 aktif, 1 dibatalkan');
    expect(series.status).toBe('Menunggu Persetujuan'); // Induk & sesi aktif masih Menunggu
  });

  it('marks entire series as Dibatalkan if all sessions are cancelled', () => {
    const allCancelledSessions = recurringSessions.map((s) => ({
      ...s,
      status: 'Dibatalkan' as const,
    }));

    const res = groupPermohonanForRekap(allCancelledSessions);
    expect(res).toHaveLength(1);
    expect(res[0].status).toBe('Dibatalkan');
    expect(res[0].cancelled_sessions_count).toBe(4);
    expect(res[0].active_sessions_count).toBe(0);
  });

  it('orders records chronologically ascending: October comes before November', () => {
    // Buat data dengan tanggal bervariasi: 5, 7, 12, 15, 22 Oktober dan 6 November (seri berulang)
    const oct5: Permohonan = {
      ...normalLoan,
      id: 'PMJ-OCT-05',
      id_peminjaman: 'PMJ-OCT-05',
      tgl_mulai: '2026-10-05',
      tgl_selesai: '2026-10-05',
    };
    const oct7: Permohonan = {
      ...normalLoan,
      id: 'PMJ-OCT-07',
      id_peminjaman: 'PMJ-OCT-07',
      tgl_mulai: '2026-10-07',
      tgl_selesai: '2026-10-07',
    };
    const oct12: Permohonan = {
      ...normalLoan,
      id: 'PMJ-OCT-12',
      id_peminjaman: 'PMJ-OCT-12',
      tgl_mulai: '2026-10-12',
      tgl_selesai: '2026-10-12',
    };
    const oct15: Permohonan = {
      ...normalLoan,
      id: 'PMJ-OCT-15',
      id_peminjaman: 'PMJ-OCT-15',
      tgl_mulai: '2026-10-15',
      tgl_selesai: '2026-10-15',
    };
    const oct22: Permohonan = {
      ...normalLoan,
      id: 'PMJ-OCT-22',
      id_peminjaman: 'PMJ-OCT-22',
      tgl_mulai: '2026-10-22',
      tgl_selesai: '2026-10-30',
    };

    // Masukkan dalam urutan acak/terbalik
    const mixed = [
      ...recurringSessions, // mulai 2026-11-06
      oct22,
      oct12,
      oct5,
      oct15,
      oct7,
    ];

    const res = groupPermohonanForRekap(mixed);

    // Harus ada 6 baris (5 permohonan Oktober + 1 rangkaian November)
    expect(res).toHaveLength(6);

    // Verifikasi urutan tanggal awal secara tepat
    expect(res[0].tgl_mulai).toBe('2026-10-05');
    expect(res[1].tgl_mulai).toBe('2026-10-07');
    expect(res[2].tgl_mulai).toBe('2026-10-12');
    expect(res[3].tgl_mulai).toBe('2026-10-15');
    expect(res[4].tgl_mulai).toBe('2026-10-22');
    expect(res[5].tgl_mulai).toBe('2026-11-06'); // Rangkaian berulang November

    // Pastikan rangkaian berulang November tetap berupa 1 baris
    expect(res[5].id).toBe('PMJ-REC-001');
    expect(res[5].is_recurring).toBe(true);
    expect(res[5].total_sessions).toBe(4);
    expect(res[5].tgl_selesai).toBe('2026-11-27');
  });
});
