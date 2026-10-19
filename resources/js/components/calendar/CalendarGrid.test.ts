import { describe, it, expect } from 'vitest';
import { MasterPeminjaman } from '../../types';

// Helper mirroring getEventsForDate logic in CalendarGrid.tsx
function getEventsForDate(events: MasterPeminjaman[], cellDateStr: string): MasterPeminjaman[] {
  return events.filter((ev) => {
    const start = (ev.tgl_mulai ?? ev.mulai ?? '').substring(0, 10);
    const end = (ev.tgl_selesai ?? ev.selesai ?? start).substring(0, 10);
    if (!start) return false;

    if (start === end) {
      return cellDateStr === start;
    }

    // Normal multi-day booking: only show on start and end dates!
    return cellDateStr === start || cellDateStr === end;
  });
}

describe('CalendarGrid Event Date Matching', () => {
  const normalMultiDayEvent: MasterPeminjaman = {
    id: 'PMJ-NORMAL-001',
    id_peminjaman: 'PMJ-NORMAL-001',
    nama_peminjam: 'Budi Santoso',
    unit_kerja: 'KUA Depok',
    mulai: '2026-10-22 08:00:00',
    selesai: '2026-10-30 16:00:00',
    tgl_mulai: '2026-10-22',
    tgl_selesai: '2026-10-30',
    waktu_mulai: '08:00',
    waktu_selesai: '16:00',
    keperluan: 'Bimtek Penghulu Multi-Hari',
    status: 'Disetujui',
    is_recurring: false,
  };

  it('displays normal multi-day event on start date (22 Oct) and end date (30 Oct) only', () => {
    const events = [normalMultiDayEvent];

    // Must show on start date
    expect(getEventsForDate(events, '2026-10-22')).toHaveLength(1);

    // Must NOT show on intermediate dates 23..29 Oct
    expect(getEventsForDate(events, '2026-10-23')).toHaveLength(0);
    expect(getEventsForDate(events, '2026-10-24')).toHaveLength(0);
    expect(getEventsForDate(events, '2026-10-25')).toHaveLength(0);
    expect(getEventsForDate(events, '2026-10-26')).toHaveLength(0);
    expect(getEventsForDate(events, '2026-10-27')).toHaveLength(0);
    expect(getEventsForDate(events, '2026-10-28')).toHaveLength(0);
    expect(getEventsForDate(events, '2026-10-29')).toHaveLength(0);

    // Must show on end date
    expect(getEventsForDate(events, '2026-10-30')).toHaveLength(1);

    // Must NOT show outside the range
    expect(getEventsForDate(events, '2026-10-21')).toHaveLength(0);
    expect(getEventsForDate(events, '2026-10-31')).toHaveLength(0);
  });

  it('displays recurring sessions on their respective weekly dates (2, 9, 16, 23 Nov)', () => {
    const recurringSessions: MasterPeminjaman[] = [
      {
        id: 'PMJ-REC-001',
        id_peminjaman: 'PMJ-REC-001',
        tgl_mulai: '2026-11-02',
        tgl_selesai: '2026-11-02',
        mulai: '2026-11-02 08:00:00',
        selesai: '2026-11-02 16:00:00',
        is_recurring: true,
        session_label: 'Sesi 1 dari 4',
      },
      {
        id: 'PMJ-REC-002',
        id_peminjaman: 'PMJ-REC-002',
        parent_id: 'PMJ-REC-001',
        tgl_mulai: '2026-11-09',
        tgl_selesai: '2026-11-09',
        mulai: '2026-11-09 08:00:00',
        selesai: '2026-11-09 16:00:00',
        is_recurring: true,
        session_label: 'Sesi 2 dari 4',
      },
      {
        id: 'PMJ-REC-003',
        id_peminjaman: 'PMJ-REC-003',
        parent_id: 'PMJ-REC-001',
        tgl_mulai: '2026-11-16',
        tgl_selesai: '2026-11-16',
        mulai: '2026-11-16 08:00:00',
        selesai: '2026-11-16 16:00:00',
        is_recurring: true,
        session_label: 'Sesi 3 dari 4',
      },
      {
        id: 'PMJ-REC-004',
        id_peminjaman: 'PMJ-REC-004',
        parent_id: 'PMJ-REC-001',
        tgl_mulai: '2026-11-23',
        tgl_selesai: '2026-11-23',
        mulai: '2026-11-23 08:00:00',
        selesai: '2026-11-23 16:00:00',
        is_recurring: true,
        session_label: 'Sesi 4 dari 4',
      },
    ];

    expect(getEventsForDate(recurringSessions, '2026-11-02')).toHaveLength(1);
    expect(getEventsForDate(recurringSessions, '2026-11-03')).toHaveLength(0);
    expect(getEventsForDate(recurringSessions, '2026-11-09')).toHaveLength(1);
    expect(getEventsForDate(recurringSessions, '2026-11-10')).toHaveLength(0);
    expect(getEventsForDate(recurringSessions, '2026-11-16')).toHaveLength(1);
    expect(getEventsForDate(recurringSessions, '2026-11-23')).toHaveLength(1);
    expect(getEventsForDate(recurringSessions, '2026-11-24')).toHaveLength(0);
  });
});
