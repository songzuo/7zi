/**
 * Logger Mock Stub
 *
 * This file provides a mock implementation of the logger for testing.
 * It's used when tests import '@/lib/logger' directly.
 */

export const logger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  fatal: vi.fn(),
};

import { vi } from 'vitest';
