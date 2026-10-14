import { describe, it, expect } from 'vitest';
import {
  extractDateParts,
  formatDateDisplay,
  formatTimeDisplay,
  formatDateTimeDisplay,
  formatTimeRangeDisplay,
} from './date';

describe('Date Utilities (date.ts)', () => {
  it('extracts date and time correctly from ISO T-format', () => {
    const parts = extractDateParts('2026-10-15T08:30:00');
    expect(parts.date).toBe('2026-10-15');
    expect(parts.time).toBe('08:30');
  });

  it('extracts date and time correctly from space-separated format', () => {
    const parts = extractDateParts('2026-10-15 14:00:00');
    expect(parts.date).toBe('2026-10-15');
    expect(parts.time).toBe('14:00');
  });

  it('handles empty or falsy date strings defensively', () => {
    expect(extractDateParts('')).toEqual({ date: '', time: '' });
    expect(formatDateDisplay('')).toBe('-');
    expect(formatDateTimeDisplay('')).toBe('-');
    expect(formatTimeDisplay('')).toBe('');
    expect(formatTimeRangeDisplay('', '')).toBe('-');
  });

  it('formats date display into Indonesian short month', () => {
    expect(formatDateDisplay('2026-10-15')).toBe('15 Okt 2026');
    expect(formatDateDisplay('2026-01-01')).toBe('01 Jan 2026');
  });

  it('formats full date and time display with WIB suffix', () => {
    expect(formatDateTimeDisplay('2026-10-15 08:30:00')).toBe('15 Okt 2026, 08:30 WIB');
    expect(formatDateTimeDisplay('2026-10-15')).toBe('15 Okt 2026');
  });

  it('formats single-day time range display', () => {
    const range = formatTimeRangeDisplay('2026-10-15 08:00', '2026-10-15 16:00');
    expect(range).toBe('15 Okt 2026 (08:00 - 16:00 WIB)');
  });

  it('formats multi-day time range display', () => {
    const range = formatTimeRangeDisplay('2026-10-15 08:00', '2026-10-17 12:00');
    expect(range).toBe('15 Okt 2026 08:00 s/d 17 Okt 2026 12:00 WIB');
  });
});
