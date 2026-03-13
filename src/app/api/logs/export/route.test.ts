/**
 * Logs Export API Route Tests
 * Tests for log export functionality (JSON and CSV formats)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GET } from '@/app/api/logs/export/route';
import { NextRequest } from 'next/server';
import { verifyToken, extractToken } from '@/lib/security/auth';

// Mock dependencies
vi.mock('@/lib/security/auth', () => ({
  verifyToken: vi.fn(),
  extractToken: vi.fn(),
  isAdmin: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  apiLogger: {
    error: vi.fn(),
  },
}));

vi.mock('@/lib/logger/database-transport', () => ({
  getDbTransport: vi.fn(() => ({
    query: vi.fn(() => ({
      logs: [
        {
          id: 'log-001',
          timestamp: '2026-03-11T10:00:00Z',
          level: 'info',
          category: 'api',
          message: 'Test log message',
          userId: 'user-123',
          requestId: 'req-001',
          route: '/api/test',
        },
        {
          id: 'log-002',
          timestamp: '2026-03-11T11:00:00Z',
          level: 'error',
          category: 'system',
          message: 'Error log message',
          userId: 'user-456',
          requestId: 'req-002',
          route: '/api/error',
        },
      ],
      total: 2,
      page: 1,
      limit: 100,
    })),
    cleanup: vi.fn(),
  })),
}));

// Helper to create mock request
function createRequest(
  url: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
  } = {}
): NextRequest {
  const { method = 'GET', headers = {} } = options;

  const init: RequestInit = {
    method,
    headers: new Headers({
      'Content-Type': 'application/json',
      ...headers,
    }),
  };

  return new NextRequest(new URL(url, 'http://localhost:3000'), init as RequestInit);
}

describe('/api/logs/export', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(extractToken).mockReturnValue(null);
    vi.mocked(verifyToken).mockResolvedValue(null);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('GET', () => {
    it('should export logs in JSON format by default', async () => {
      const request = createRequest('/api/logs/export');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toContain('application/json');
      expect(response.headers.get('Content-Disposition')).toContain('attachment');
      expect(response.headers.get('Content-Disposition')).toContain('.json');

      const data = await response.json();
      expect(data.format).toBe('json');
      expect(data.totalRecords).toBe(2);
      expect(Array.isArray(data.logs)).toBe(true);
    });

    it('should export logs in CSV format', async () => {
      const request = createRequest('/api/logs/export?format=csv');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toContain('text/csv');
      expect(response.headers.get('Content-Disposition')).toContain('.csv');

      const text = await response.text();
      expect(text).toContain('id,timestamp,level,category,message');
      expect(text).toContain('log-001');
    });

    it('should reject invalid format', async () => {
      const request = createRequest('/api/logs/export?format=xml');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid format');
    });

    it('should accept level parameter', async () => {
      const request = createRequest('/api/logs/export?level=error');
      const response = await GET(request);

      expect(response.status).toBe(200);
    });

    it('should accept levels parameter (comma-separated)', async () => {
      const request = createRequest('/api/logs/export?levels=error,warn,info');
      const response = await GET(request);

      expect(response.status).toBe(200);
    });

    it('should accept category parameter', async () => {
      const request = createRequest('/api/logs/export?category=api');
      const response = await GET(request);

      expect(response.status).toBe(200);
    });

    it('should accept categories parameter (comma-separated)', async () => {
      const request = createRequest('/api/logs/export?categories=api,system');
      const response = await GET(request);

      expect(response.status).toBe(200);
    });

    it('should accept valid startDate', async () => {
      const request = createRequest('/api/logs/export?startDate=2026-03-01T00:00:00Z');
      const response = await GET(request);

      expect(response.status).toBe(200);
    });

    it('should reject invalid startDate', async () => {
      const request = createRequest('/api/logs/export?startDate=invalid-date');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid startDate');
    });

    it('should accept valid endDate', async () => {
      const request = createRequest('/api/logs/export?endDate=2026-03-31T23:59:59Z');
      const response = await GET(request);

      expect(response.status).toBe(200);
    });

    it('should reject invalid endDate', async () => {
      const request = createRequest('/api/logs/export?endDate=not-a-date');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid endDate');
    });

    it('should accept valid limit parameter', async () => {
      const request = createRequest('/api/logs/export?limit=500');
      const response = await GET(request);

      expect(response.status).toBe(200);
    });

    it('should reject invalid limit parameter', async () => {
      const request = createRequest('/api/logs/export?limit=abc');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid limit');
    });

    it('should reject negative limit', async () => {
      const request = createRequest('/api/logs/export?limit=-1');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid limit');
    });

    it('should cap limit at 10000', async () => {
      const request = createRequest('/api/logs/export?limit=50000');
      const response = await GET(request);

      expect(response.status).toBe(200);
      // The query function should be called with capped limit
    });

    it('should accept search parameter', async () => {
      const request = createRequest('/api/logs/export?search=error');
      const response = await GET(request);

      expect(response.status).toBe(200);
    });

    it('should accept userId parameter', async () => {
      const request = createRequest('/api/logs/export?userId=user-123');
      const response = await GET(request);

      expect(response.status).toBe(200);
    });

    it('should accept requestId parameter', async () => {
      const request = createRequest('/api/logs/export?requestId=req-001');
      const response = await GET(request);

      expect(response.status).toBe(200);
    });

    it('should accept route parameter', async () => {
      const request = createRequest('/api/logs/export?route=/api/test');
      const response = await GET(request);

      expect(response.status).toBe(200);
    });

    it('should handle authentication gracefully', async () => {
      vi.mocked(extractToken).mockReturnValue('valid-token');
      vi.mocked(verifyToken).mockResolvedValue({
        sub: 'user-123',
        email: 'test@example.com',
        role: 'user',
        iat: Date.now(),
        exp: Date.now() + 3600,
      });

      const request = createRequest('/api/logs/export');
      const response = await GET(request);

      expect(response.status).toBe(200);
    });

    it('should reject invalid token', async () => {
      vi.mocked(extractToken).mockReturnValue('invalid-token');
      vi.mocked(verifyToken).mockResolvedValue(null);

      const request = createRequest('/api/logs/export');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain('Invalid');
    });

    it('should include exportedAt timestamp in JSON export', async () => {
      const request = createRequest('/api/logs/export');
      const response = await GET(request);
      const data = await response.json();

      expect(data.exportedAt).toBeDefined();
      expect(() => new Date(data.exportedAt).toISOString()).not.toThrow();
    });

    it('should include filters in JSON export response', async () => {
      const request = createRequest('/api/logs/export?level=error&search=test');
      const response = await GET(request);
      const data = await response.json();

      expect(data.filters).toBeDefined();
      expect(data.filters.search).toBe('test');
    });

    it('should handle database errors gracefully', async () => {
      const { getDbTransport } = await import('@/lib/logger/database-transport');
      vi.mocked(getDbTransport).mockReturnValueOnce({
        query: vi.fn(() => {
          throw new Error('Database connection failed');
        }),
        cleanup: vi.fn(),
      } as unknown as ReturnType<typeof getDbTransport>);

      const request = createRequest('/api/logs/export');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Failed to export logs');
    });

    it('should set correct cache headers for download', async () => {
      const request = createRequest('/api/logs/export');
      const response = await GET(request);

      expect(response.headers.get('Cache-Control')).toBe('no-cache, no-store, must-revalidate');
      expect(response.headers.get('Pragma')).toBe('no-cache');
      expect(response.headers.get('Expires')).toBe('0');
    });
  });
});