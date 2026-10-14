import { describe, it, expect, beforeEach } from 'vitest';

const store: Record<string, string> = {};
const mockLocalStorage = {
  getItem: (k: string) => store[k] ?? null,
  setItem: (k: string, v: string) => {
    store[k] = String(v);
  },
  removeItem: (k: string) => {
    delete store[k];
  },
  clear: () => {
    Object.keys(store).forEach((k) => delete store[k]);
  },
};
Object.defineProperty(globalThis, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

import {
  getAdminToken,
  setAdminToken,
  getAuthHeaders,
  getAdminSession,
} from './adminApi';

describe('Admin API Service (adminApi.ts)', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
  });

  it('manages admin token correctly in storage', () => {
    expect(getAdminToken()).toBeNull();

    setAdminToken('test-bearer-token-123');
    expect(getAdminToken()).toBe('test-bearer-token-123');

    setAdminToken(null);
    expect(getAdminToken()).toBeNull();
  });

  it('builds Authorization Bearer header if token exists', () => {
    expect(getAuthHeaders()).toEqual({});

    setAdminToken('secret-token-xyz');
    expect(getAuthHeaders()).toEqual({
      Authorization: 'Bearer secret-token-xyz',
    });
  });

  it('retrieves admin session or null', () => {
    expect(getAdminSession()).toBeNull();

    mockLocalStorage.setItem(
      'simpru_admin_auth',
      JSON.stringify({ email: 'admin@kemenag.go.id', name: 'Admin Kemenag' })
    );
    expect(getAdminSession()).toEqual({
      email: 'admin@kemenag.go.id',
      name: 'Admin Kemenag',
    });
  });
});
