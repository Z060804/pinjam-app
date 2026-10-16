import { describe, it, expect } from 'vitest';
import {
  extractDateParts,
  formatDateDisplay,
  formatTimeDisplay,
  formatDateTimeDisplay,
  formatTimeRangeDisplay,
  buildDateTimeString,
  isDateTimeRangeValid,
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

  it('builds date-time string without timezone drift', () => {
    expect(buildDateTimeString('2026-10-15', '09:30')).toBe('2026-10-15T09:30');
    expect(buildDateTimeString('2026-10-15', '')).toBe('2026-10-15T08:00');
    expect(buildDateTimeString('', '09:30')).toBe('');
  });

  it('validates date-time range correctly for same-day and multi-day', () => {
    // Same day: valid
    expect(isDateTimeRangeValid('2026-10-15T08:00', '2026-10-15T15:00')).toBe(true);
    expect(isDateTimeRangeValid('2026-10-15 08:00', '2026-10-15 15:00')).toBe(true);

    // Same day: same time or end earlier -> invalid
    expect(isDateTimeRangeValid('2026-10-15T08:00', '2026-10-15T08:00')).toBe(false);
    expect(isDateTimeRangeValid('2026-10-15T16:00', '2026-10-15T08:00')).toBe(false);

    // Multi-day: valid
    expect(isDateTimeRangeValid('2026-10-15T16:00', '2026-10-16T08:00')).toBe(true);

    // End date earlier than start date -> invalid
    expect(isDateTimeRangeValid('2026-10-16T08:00', '2026-10-15T15:00')).toBe(false);

    // Empty or malformed input -> invalid
    expect(isDateTimeRangeValid('', '2026-10-15T15:00')).toBe(false);
    expect(isDateTimeRangeValid('2026-10-15T08:00', '')).toBe(false);
  });
});
