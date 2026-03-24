import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GET, POST } from './route';
import { NextRequest } from 'next/server';

// Mock database functions
vi.mock('@/lib/db', () => ({
  getDatabase: vi.fn(() => ({
    prepare: vi.fn(() => ({
      all: vi.fn(),
      get: vi.fn(),
      run: vi.fn(),
      finalize: vi.fn(),
    })),
  })),
}));

// Mock logger
const mockLogger = {
  info: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
  warn: vi.fn(),
};

vi.mock('@/lib/logger', () => ({
  logger: mockLogger,
}));

describe('Multimodal Image API - GET /api/multimodal/image', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('应该返回 API 信息', async () => {
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('endpoint', '/api/multimodal/image');
    expect(data).toHaveProperty('methods');
    expect(Array.isArray(data.methods)).toBe(true);
  });

  it('应该包含支持的图像类型', async () => {
    const response = await GET();
    const data = await response.json();

    expect(data).toHaveProperty('supportedTypes');
    expect(Array.isArray(data.supportedTypes)).toBe(true);
  });

  it('应该包含 API 版本信息', async () => {
    const response = await GET();
    const data = await response.json();

    expect(data).toHaveProperty('version');
    expect(typeof data.version).toBe('string');
  });
});
