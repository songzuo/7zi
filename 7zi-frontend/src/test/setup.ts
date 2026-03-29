/**
 * Vitest 测试设置文件
 */

import '@testing-library/jest-dom';
import { vi } from 'vitest';

// 真实 localStorage (用于 Zustand persist 测试)
const localStorageImpl = {
  store: new Map<string, string>(),

  getItem(key: string): string | null {
    return this.store.get(key) || null;
  },

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  },

  removeItem(key: string): void {
    this.store.delete(key);
  },

  clear(): void {
    this.store.clear();
  },
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageImpl,
});

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // Deprecated
    removeListener: vi.fn(), // Deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock fetch
global.fetch = vi.fn();

// Mock crypto.randomUUID
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: vi.fn(() => 'mock-uuid-' + Math.random().toString(36).substr(2, 9)),
  },
});
