/**
 * API 错误处理工具测试
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock dependencies
vi.mock('@/lib/errors', () => ({
  AppError: class AppError extends Error {
    constructor(
      public code: string,
      public message: string,
      public category: string = 'general',
      public statusCode: number = 500,
      public severity: string = 'error'
    ) {
      super(message);
      this.name = 'AppError';
    }
  },
  ErrorCodes: {
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    UNAUTHORIZED: 'UNAUTHORIZED',
    FORBIDDEN: 'FORBIDDEN',
    NOT_FOUND: 'NOT_FOUND',
    DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',
    RATE_LIMITED: 'RATE_LIMITED',
    SERVER_ERROR: 'SERVER_ERROR',
    SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
    TIMEOUT: 'TIMEOUT',
    SESSION_EXPIRED: 'SESSION_EXPIRED',
    DATA_NOT_FOUND: 'DATA_NOT_FOUND',
    DATABASE_ERROR: 'DATABASE_ERROR',
    EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
    NETWORK_ERROR: 'NETWORK_ERROR',
  },
  ErrorCategory: {
    VALIDATION: 'validation',
    AUTH: 'auth',
    PERMISSION: 'permission',
    NOT_FOUND: 'not_found',
    CONFLICT: 'conflict',
    RATE_LIMIT: 'rate_limit',
    SERVER: 'server',
    EXTERNAL: 'external',
  },
  toAppError: vi.fn((error: Error) => ({
    code: 'SERVER_ERROR',
    message: error?.message || 'Unknown error',
    category: 'server',
    severity: 'error',
    timestamp: new Date().toISOString(),
  })),
  getUserFriendlyMessage: vi.fn((_code: string) => 'An error occurred'),
}));

vi.mock('@/lib/logger', () => ({
  apiLogger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Import after mocks
const {
  apiError,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  conflict,
  unprocessable,
  rateLimited,
  serverError,
  serviceUnavailable,
  unknownError,
  success,
  paginated,
  validateRequired,
  validateString,
  validateRange,
  validateEnum,
} = await import('@/lib/api-error');

// ============================================
// Helper
// ============================================

function createMockRequest(url: string, options: { method?: string; headers?: Record<string, string> } = {}) {
  return new NextRequest(new URL(url, 'http://localhost'), {
    method: options.method || 'GET',
    headers: new Headers(options.headers),
  });
}

// ============================================
// Tests
// ============================================

describe('apiError', () => {
  it('should return 400 for BAD_REQUEST', () => {
    const request = createMockRequest('/api/test');
    const response = apiError('BAD_REQUEST', request, { field: 'email' });
    expect(response.status).toBe(400);
  });

  it('should return 401 for UNAUTHORIZED', () => {
    const request = createMockRequest('/api/test');
    const response = apiError('UNAUTHORIZED', request);
    expect(response.status).toBe(401);
  });

  it('should return 403 for FORBIDDEN', () => {
    const request = createMockRequest('/api/test');
    const response = apiError('FORBIDDEN', request);
    expect(response.status).toBe(403);
  });

  it('should return 404 for NOT_FOUND', () => {
    const request = createMockRequest('/api/test');
    const response = apiError('NOT_FOUND', request);
    expect(response.status).toBe(404);
  });

  it('should return 500 for INTERNAL_SERVER_ERROR', () => {
    const request = createMockRequest('/api/test');
    const response = apiError('INTERNAL_SERVER_ERROR', request);
    expect(response.status).toBe(500);
  });
});

describe('shortcut error functions', () => {
  it('badRequest returns 400', () => {
    const response = badRequest();
    expect(response.status).toBe(400);
  });

  it('unauthorized returns 401', () => {
    const response = unauthorized();
    expect(response.status).toBe(401);
  });

  it('forbidden returns 403', () => {
    const response = forbidden();
    expect(response.status).toBe(403);
  });

  it('notFound returns 404', () => {
    const response = notFound();
    expect(response.status).toBe(404);
  });

  it('conflict returns 409', () => {
    const response = conflict();
    expect(response.status).toBe(409);
  });

  it('rateLimited returns 429', () => {
    const response = rateLimited();
    expect(response.status).toBe(429);
  });

  it('serverError returns 500', () => {
    const response = serverError();
    expect(response.status).toBe(500);
  });

  it('serviceUnavailable returns 503', () => {
    const response = serviceUnavailable();
    expect(response.status).toBe(503);
  });

  it('unknownError returns 500', () => {
    const response = unknownError();
    expect(response.status).toBe(500);
  });
});

describe('success', () => {
  it('should return success response', () => {
    const request = createMockRequest('/api/test');
    const response = success({ id: '1', name: 'Test' }, request);
    expect(response.status).toBe(200);
  });

  it('should include requestId when provided in body', async () => {
    const request = createMockRequest('/api/test', {
      headers: { 'x-request-id': 'test-123' },
    });
    const response = success({ data: true }, request);
    const json = await response.json();
    expect(json.requestId).toBe('test-123');
  });
});

describe('paginated', () => {
  it('should return paginated response', () => {
    const items = [{ id: '1' }, { id: '2' }];
    const response = paginated(items, 1, 10, 50);
    expect(response.status).toBe(200);
  });

  it('should calculate totalPages correctly', () => {
    const response = paginated([], 1, 3, 10);
    expect(response.status).toBe(200);
  });
});

describe('validation functions', () => {
  const request = createMockRequest('/api/test');

  describe('validateRequired', () => {
    it('should pass for valid value', () => {
      const result = validateRequired('test', 'name', request);
      expect(result).toBeNull();
    });

    it('should fail for null', () => {
      const result = validateRequired(null, 'name', request);
      expect(result?.status).toBe(400);
    });

    it('should fail for undefined', () => {
      const result = validateRequired(undefined, 'name', request);
      expect(result?.status).toBe(400);
    });

    it('should fail for empty string', () => {
      const result = validateRequired('', 'name', request);
      expect(result?.status).toBe(400);
    });
  });

  describe('validateString', () => {
    it('should pass for string', () => {
      const result = validateString('test', 'name', request);
      expect(result).toBeNull();
    });

    it('should fail for non-string', () => {
      const result = validateString(123, 'name', request);
      expect(result?.status).toBe(400);
    });
  });

  describe('validateRange', () => {
    it('should pass for value in range', () => {
      const result = validateRange(50, 'age', 1, 100, request);
      expect(result).toBeNull();
    });

    it('should fail for value below minimum', () => {
      const result = validateRange(0, 'age', 1, 100, request);
      expect(result?.status).toBe(400);
    });

    it('should fail for value above maximum', () => {
      const result = validateRange(101, 'age', 1, 100, request);
      expect(result?.status).toBe(400);
    });
  });

  describe('validateEnum', () => {
    const allowed = ['active', 'inactive', 'pending'] as const;

    it('should pass for valid enum value', () => {
      const result = validateEnum('active', 'status', allowed, request);
      expect(result).toBeNull();
    });

    it('should fail for invalid enum value', () => {
      const result = validateEnum('unknown', 'status', allowed, request);
      expect(result?.status).toBe(400);
    });
  });
});
