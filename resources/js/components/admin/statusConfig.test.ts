import { describe, it, expect } from 'vitest';
import { STATUS_CONFIG, STATUS_TABS } from './statusConfig';
import { Permohonan } from '../../types/admin';

describe('Admin Status Config (statusConfig.ts)', () => {
  const allStatuses: Permohonan['status'][] = [
    'Menunggu Persetujuan',
    'Disetujui',
    'Tidak Disetujui',
    'Dibatalkan',
  ];

  it('provides complete styling config for all application statuses', () => {
    allStatuses.forEach((st) => {
      const cfg = STATUS_CONFIG[st];
      expect(cfg).toBeDefined();
      expect(cfg.label).toBeTruthy();
      expect(cfg.color).toMatch(/^text-/);
      expect(cfg.bg).toMatch(/^bg-/);
      expect(cfg.border).toMatch(/^border-/);
      expect(cfg.icon).toBeDefined();
    });
  });

  it('includes Semua and all statuses in STATUS_TABS', () => {
    expect(STATUS_TABS[0]).toBe('Semua');
    allStatuses.forEach((st) => {
      expect(STATUS_TABS).toContain(st);
    });
  });
});
