import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, vi, beforeEach } from 'vitest';

// Polyfill ReadableStream for jsdom environment (Node.js 18+)
if (typeof ReadableStream === 'undefined') {
  const { ReadableStream, WritableStream, TransformStream } = require('node:stream/web');
  // @ts-ignore - Polyfilling global
  global.ReadableStream = ReadableStream as any;
  // @ts-ignore - Polyfilling global
  global.WritableStream = WritableStream as any;
  // @ts-ignore - Polyfilling global
  global.TransformStream = TransformStream as any;
}

// Import vi-mocks to set up database and collaboration mocks
import '@/test/vi-mocks'

// Cleanup after each test
afterEach(() => {
  cleanup()
})

// Restore real timers after each test to avoid timer leakage
afterEach(() => {
  vi.useRealTimers()
})

// Reset all mocks before each test
beforeEach(() => {
  vi.clearAllMocks()
  // Reset locale mock to default 'zh'
  mockUseLocale.mockReturnValue('zh')
})

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn(),
    api: vi.fn(),
    auth: vi.fn(),
    perf: vi.fn(),
    user: vi.fn(),
    security: vi.fn(),
    business: vi.fn(),
    updateConfig: vi.fn(),
    setContext: vi.fn(),
    clearContext: vi.fn(),
    child: vi.fn(),
  },
  log: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn(),
    api: vi.fn(),
    auth: vi.fn(),
    perf: vi.fn(),
    user: vi.fn(),
    security: vi.fn(),
    business: vi.fn(),
  },
}))

// Mock better-sqlite3 globally for all tests
vi.mock('better-sqlite3', () => {
  // Create a mock database instance
  const createMockDatabase = () => ({
    pragma: vi.fn().mockReturnValue(undefined),
    exec: vi.fn().mockImplementation((sql: string) => {
      // Handle multi-statement SQL (like schema initialization)
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'))

      if (statements.some(s => s.match(/CREATE\s+(TABLE|INDEX)/i))) {
        return { changes: statements.length, lastInsertRowid: 1 }
      }

      return { changes: 1, lastInsertRowid: 1 }
    }),
    prepare: vi.fn().mockReturnValue({
      run: vi.fn().mockReturnValue({ changes: 1, lastInsertRowid: 1 }),
      get: vi.fn().mockReturnValue(null),
      all: vi.fn().mockReturnValue([]),
    }),
    close: vi.fn(),
    open: true,
  })

  // Return a mock constructor function
  const MockDatabase = function(this: typeof MockDatabase.prototype) {
    return createMockDatabase.call(this)
  } as unknown as { new(): ReturnType<typeof createMockDatabase> }

  // Create proper prototype from the mock object
  MockDatabase.prototype = Object.create(createMockDatabase())

  return {
    default: MockDatabase,
  }
})

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => '/',
}))

// Mock next-intl hooks
const mockUseLocale = vi.fn(() => 'zh');
const mockUseTranslations = vi.fn(() => (key: string) => key);

vi.mock('next-intl', () => ({
  useLocale: () => mockUseLocale(),
  useTranslations: () => mockUseTranslations(),
  NextIntlClientProvider: ({ children, locale }: { children: React.ReactNode; locale?: string }) => {
    // Update the mock locale when provider is called with a locale
    if (locale) {
      mockUseLocale.mockReturnValue(locale);
    }
    return <>{children}</>;
  },
}))

// Mock Next.js image
vi.mock('next/image', () => ({
  default: (props: unknown) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...(props as Record<string, unknown>)} />
  },
}))

// Global type extensions for mocked functions
declare global {
  namespace Vi {
    interface MockInstance<T = unknown> {
      mockResolvedValueOnce: (value: PromiseLike<T> | T) => MockInstance<T>;
      mockRejectedValueOnce: (reason: unknown) => MockInstance<T>;
      mockImplementation: (fn: (...args: unknown[]) => unknown) => MockInstance<T>;
    }
  }
}
