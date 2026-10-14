import { describe, it, expect } from 'vitest';
import { formatDate } from './format';

describe('Format Utilities (format.ts)', () => {
  it('returns hyphen for null or undefined input', () => {
    expect(formatDate(null)).toBe('-');
    expect(formatDate(undefined)).toBe('-');
    expect(formatDate('')).toBe('-');
  });

  it('formats YYYY-MM-DD to long Indonesian date format', () => {
    const formatted = formatDate('2026-10-15', 'long');
    expect(formatted).toContain('15');
    expect(formatted).toContain('2026');
    expect(formatted.toLowerCase()).toContain('oktober');
  });

  it('formats YYYY-MM-DD to short Indonesian date format', () => {
    const formatted = formatDate('2026-10-15', 'short');
    expect(formatted).toContain('15');
    expect(formatted).toContain('2026');
  });

  it('handles datetime strings by stripping time portion without timezone shift', () => {
    const formatted = formatDate('2026-05-20 09:30:00');
    expect(formatted).toContain('20');
    expect(formatted).toContain('2026');
    expect(formatted.toLowerCase()).toContain('mei');
  });
});
