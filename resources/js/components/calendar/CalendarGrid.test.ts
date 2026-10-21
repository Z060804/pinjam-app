import { describe, it, expect } from 'vitest';
import { MasterPeminjaman } from '../../types';

// Helper mirroring getEventsForDate logic in CalendarGrid.tsx
function getEventsForDate(events: MasterPeminjaman[], cellDateStr: string): MasterPeminjaman[] {
  const matched = events.filter((ev) => {
    const start = (ev.tgl_mulai ?? ev.mulai ?? '').substring(0, 10);
    const end = (ev.tgl_selesai ?? ev.selesai ?? start).substring(0, 10);
    if (!start) return false;

    if (start === end) {
      return cellDateStr === start;
    }

    // Normal multi-day booking: continuous range from start to end
    return cellDateStr >= start && cellDateStr <= end;
  });

  const seen = new Set<string>();
  return matched.filter((ev) => {
    const key = ev.id || ev.id_peminjaman || '';
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function getRangeIndicator(ev: MasterPeminjaman, dateString: string): string | null {
  if (ev.range_indicator) return ev.range_indicator;
  if (ev.is_recurring && !ev.is_multiday) return null;

  if (ev.total_sessions && ev.total_sessions > 1 && ev.session_number) {
    if (ev.session_number === 1) return 'Mulai';
    if (ev.session_number === ev.total_sessions) return 'Habis';
    return 'Berlangsung';
  }

  const start = (ev.tgl_mulai ?? ev.mulai ?? '').substring(0, 10);
  const end = (ev.tgl_selesai ?? ev.selesai ?? start).substring(0, 10);
  if (!start || !end || start === end) return null;

  if (dateString === start) return 'Mulai';
  if (dateString === end) return 'Habis';
  if (dateString > start && dateString < end) return 'Berlangsung';
  return null;
}

describe('CalendarGrid Event Date Matching', () => {
  const normalMultiDayEvent: MasterPeminjaman = {
    id: 'PMJ-NORMAL-001',
    id_peminjaman: 'PMJ-NORMAL-001',
    nama_peminjam: 'Budi Santoso',
    unit_kerja: 'KUA Depok',
    mulai: '2026-10-02 08:00:00',
    selesai: '2026-10-06 10:00:00',
    tgl_mulai: '2026-10-02',
    tgl_selesai: '2026-10-06',
    waktu_mulai: '08:00',
    waktu_selesai: '10:00',
    keperluan: 'Bimtek Penghulu Multi-Hari',
    status: 'Disetujui',
    is_recurring: false,
    is_multiday: true,
  };

  it('displays continuous multi-day range on calendar: 2 Oct (Mulai), 3-5 Oct (Berlangsung), and 6 Oct (Habis)', () => {
    const events = [normalMultiDayEvent];

    // Must show on start date (2 Oct) with 'Mulai'
    const evStart = getEventsForDate(events, '2026-10-02');
    expect(evStart).toHaveLength(1);
    expect(getRangeIndicator(evStart[0], '2026-10-02')).toBe('Mulai');

    // Intermediate dates 3, 4, 5 Oct must show 'Berlangsung'
    const intermediateDates = ['2026-10-03', '2026-10-04', '2026-10-05'];
    intermediateDates.forEach((dateStr) => {
      const evMid = getEventsForDate(events, dateStr);
      expect(evMid).toHaveLength(1);
      expect(getRangeIndicator(evMid[0], dateStr)).toBe('Berlangsung');
    });

    // Must show on end date (6 Oct) with 'Habis'
    const evEnd = getEventsForDate(events, '2026-10-06');
    expect(evEnd).toHaveLength(1);
    expect(getRangeIndicator(evEnd[0], '2026-10-06')).toBe('Habis');

    // Must NOT show outside the range
    expect(getEventsForDate(events, '2026-10-01')).toHaveLength(0);
    expect(getEventsForDate(events, '2026-10-07')).toHaveLength(0);
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
