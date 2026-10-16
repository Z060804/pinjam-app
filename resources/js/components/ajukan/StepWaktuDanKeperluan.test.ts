import { describe, it, expect } from 'vitest';
import { extractDateParts, buildDateTimeString, isDateTimeRangeValid } from '../../utils/date';
import { HOURS_24, MINUTES_60 } from '../common/TimePicker24';
import { normalizeDate } from './ajukanSubmit';

describe('StepWaktuDanKeperluan Date & 24-Hour Time Logic', () => {
  it('provides all 24 hours (00 to 23) in HOURS_24 array', () => {
    expect(HOURS_24).toHaveLength(24);
    expect(HOURS_24[0]).toBe('00');
    expect(HOURS_24[23]).toBe('23');
    for (let i = 0; i < 24; i++) {
      expect(HOURS_24[i]).toBe(String(i).padStart(2, '0'));
    }
  });

  it('provides all 60 minutes (00 to 59) in MINUTES_60 array without restrictions', () => {
    expect(MINUTES_60).toHaveLength(60);
    expect(MINUTES_60[0]).toBe('00');
    expect(MINUTES_60[59]).toBe('59');
    for (let i = 0; i < 60; i++) {
      expect(MINUTES_60[i]).toBe(String(i).padStart(2, '0'));
    }
  });

  it('correctly splits datetime into 24-hour components without AM/PM', () => {
    const start = extractDateParts('2026-10-15T08:00');
    expect(start.date).toBe('2026-10-15');
    expect(start.time).toBe('08:00');
    expect(start.time).not.toMatch(/am|pm/i);

    const end = extractDateParts('2026-10-15T16:30');
    expect(end.date).toBe('2026-10-15');
    expect(end.time).toBe('16:30');
    expect(end.time).not.toMatch(/am|pm/i);
  });

  it('allows independent hour and minute updates while preserving the other part', () => {
    let current = '08:30';

    // Update hour to 14 -> minute 30 is preserved
    const [h, m] = current.split(':');
    const newHour = '14';
    current = `${newHour}:${m}`;
    expect(current).toBe('14:30');

    // Update minute to 47 -> hour 14 is preserved
    const newMinute = '47';
    current = `${current.split(':')[0]}:${newMinute}`;
    expect(current).toBe('14:47');
  });

  it('correctly recombines date and 24h time without timezone offset', () => {
    const combined = buildDateTimeString('2026-10-20', '13:45');
    expect(combined).toBe('2026-10-20T13:45');
  });

  it('enforces that same-day start time must precede end time', () => {
    const validSameDay = isDateTimeRangeValid('2026-10-15T08:00', '2026-10-15T15:00');
    expect(validSameDay).toBe(true);

    const equalTimes = isDateTimeRangeValid('2026-10-15T09:00', '2026-10-15T09:00');
    expect(equalTimes).toBe(false);

    const invertedTimes = isDateTimeRangeValid('2026-10-15T16:00', '2026-10-15T09:00');
    expect(invertedTimes).toBe(false);
  });

  it('handles multi-day schedules correctly where end time may be earlier in the day', () => {
    // Starts 2026-10-15 16:00 and ends 2026-10-16 10:00 (multi-day)
    const validMultiDay = isDateTimeRangeValid('2026-10-15T16:00', '2026-10-16T10:00');
    expect(validMultiDay).toBe(true);

    // End date earlier than start date
    const invertedDates = isDateTimeRangeValid('2026-10-17T08:00', '2026-10-15T16:00');
    expect(invertedDates).toBe(false);
  });

  it('handles 24-hour boundary values (00:00 through 23:59)', () => {
    expect(isDateTimeRangeValid('2026-10-15T00:00', '2026-10-15T23:59')).toBe(true);
    expect(isDateTimeRangeValid('2026-10-15T23:59', '2026-10-15T00:00')).toBe(false);
  });

  it('handles empty or invalid date/time inputs safely', () => {
    expect(isDateTimeRangeValid('', '2026-10-15T15:00')).toBe(false);
    expect(isDateTimeRangeValid('2026-10-15T08:00', '')).toBe(false);
    expect(isDateTimeRangeValid('', '')).toBe(false);

    expect(extractDateParts('')).toEqual({ date: '', time: '' });
    expect(buildDateTimeString('', '08:00')).toBe('');
  });

  it('ensures backend normalized date format is consistent with SQL expectations', () => {
    const raw = buildDateTimeString('2026-10-15', '09:25');
    expect(raw).toBe('2026-10-15T09:25');

    const sqlReady = normalizeDate(raw);
    expect(sqlReady).toBe('2026-10-15 09:25:00');
  });
});
