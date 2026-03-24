/**
 * 测试设置文件
 *
 * 配置全局测试环境和工具
 */

import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Import global mocks (must be before any test code runs)
import '@/test/vi-mocks';

// Add TextEncoder/TextDecoder polyfill for jsdom environment
if (typeof global.TextEncoder === 'undefined') {
  const { TextEncoder, TextDecoder } = require('util');
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder;
}

// Fix for jose v6 in Node.js environment
// Ensure crypto module is properly polyfilled
if (typeof global.crypto === 'undefined') {
  const { webcrypto } = require('crypto');
  global.crypto = webcrypto;

  // Additional polyfills for jose v6 compatibility
  if (!global.crypto.subtle) {
    global.crypto.subtle = webcrypto.subtle;
  }
}

// Ensure TextEncoder/TextDecoder are available globally
if (typeof global.TextEncoder === 'undefined') {
  const { TextEncoder, TextDecoder } = require('util');
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder;
}

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: vi.fn(),
      replace: vi.fn(),
      prefetch: vi.fn(),
      back: vi.fn(),
      pathname: '/',
      query: {},
      asPath: '/',
    };
  },
  usePathname() {
    return '/';
  },
  useSearchParams() {
    return new URLSearchParams();
  },
}));

// Mock Next.js Link
vi.mock('next/link', () => ({
  default: vi.fn(),
}));

// Mock Next.js Image
vi.mock('next/image', () => ({
  default: vi.fn(),
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Bell: vi.fn(() => null),
  Settings: vi.fn(() => null),
  User: vi.fn(() => null),
  X: vi.fn(() => null),
  Check: vi.fn(() => null),
  AlertTriangle: vi.fn(() => null),
  Info: vi.fn(() => null),
  Search: vi.fn(() => null),
  Plus: vi.fn(() => null),
  Trash: vi.fn(() => null),
}));

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.OPEN;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  send = vi.fn();
  close = vi.fn();

  constructor(url: string) {
    setTimeout(() => {
      if (this.onopen) this.onopen();
    }, 0);
  }
}

global.WebSocket = MockWebSocket as any;

// Mock IntersectionObserver with callback support
class MockIntersectionObserver {
  callback: IntersectionObserverCallback;
  targets: Set<Element>;

  constructor(callback: IntersectionObserverCallback, _options?: IntersectionObserverInit) {
    this.callback = callback;
    this.targets = new Set();
  }

  observe(target: Element) {
    this.targets.add(target);
  }

  disconnect() {
    this.targets.clear();
  }

  unobserve(target: Element) {
    this.targets.delete(target);
  }
}

global.IntersectionObserver = MockIntersectionObserver as any;

// Mock ResizeObserver
class MockResizeObserver {
  observe = vi.fn();
  disconnect = vi.fn();
  unobserve = vi.fn();
}

global.ResizeObserver = MockResizeObserver as any;

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    },
  };
})();

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Mock sessionStorage
const sessionStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(global, 'sessionStorage', {
  value: sessionStorageMock,
  writable: true,
});

// Mock matchMedia (only in jsdom environment)
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn(),
  },
}));

// Mock web-vitals
vi.mock('web-vitals', () => ({
  onLCP: vi.fn(),
  onCLS: vi.fn(),
  onTTFB: vi.fn(),
  onFCP: vi.fn(),
  onINP: vi.fn(),
}));

// Mock Performance API
if (typeof performance === 'undefined') {
  global.performance = {} as any;
}

if (!performance.mark) {
  performance.mark = vi.fn();
}
if (!performance.measure) {
  performance.measure = vi.fn();
}
if (!performance.clearMarks) {
  performance.clearMarks = vi.fn();
}
if (!performance.clearMeasures) {
  performance.clearMeasures = vi.fn();
}
if (!performance.getEntriesByType) {
  performance.getEntriesByType = vi.fn(() => []);
}
if (!performance.getEntries) {
  performance.getEntries = vi.fn(() => []);
}

// Mock requestIdleCallback
if (typeof window !== 'undefined' && !window.requestIdleCallback) {
  window.requestIdleCallback = vi.fn((cb: any) => setTimeout(cb, 0)) as any;
  window.cancelIdleCallback = vi.fn(clearTimeout) as any;
}

// Suppress console warnings for React 18 strict mode
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render')
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});
