/**
 * 测试设置文件
 *
 * 配置全局测试环境和工具
 */

import '@testing-library/jest-dom';
import { vi } from 'vitest';
import React from 'react';

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
  default({ children, href }: { children: React.ReactNode; href: string }) {
    return React.createElement('a', { href }, children);
  },
}));

// Mock Next.js Image
vi.mock('next/image', () => ({
  default({ src, alt, ...props }: any) {
    return React.createElement('img', { src, alt, ...props });
  },
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Bell: () => React.createElement('span', { 'data-testid': 'icon-bell' }),
  Settings: () => React.createElement('span', { 'data-testid': 'icon-settings' }),
  User: () => React.createElement('span', { 'data-testid': 'icon-user' }),
  X: () => React.createElement('span', { 'data-testid': 'icon-x' }),
  Check: () => React.createElement('span', { 'data-testid': 'icon-check' }),
  AlertTriangle: () => React.createElement('span', { 'data-testid': 'icon-alert' }),
  Info: () => React.createElement('span', { 'data-testid': 'icon-info' }),
  Search: () => React.createElement('span', { 'data-testid': 'icon-search' }),
  Plus: () => React.createElement('span', { 'data-testid': 'icon-plus' }),
  Trash: () => React.createElement('span', { 'data-testid': 'icon-trash' }),
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

(global as any).WebSocket = MockWebSocket;

// Mock IntersectionObserver
class MockIntersectionObserver {
  observe = vi.fn();
  disconnect = vi.fn();
  unobserve = vi.fn();
}

(global as any).IntersectionObserver = MockIntersectionObserver;

// Mock ResizeObserver
class MockResizeObserver {
  observe = vi.fn();
  disconnect = vi.fn();
  unobserve = vi.fn();
}

(global as any).ResizeObserver = MockResizeObserver;

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

// Mock matchMedia
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
