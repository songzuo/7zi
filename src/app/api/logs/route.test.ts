/**
 * Logs API Route Tests
 * Tests for log query and cleanup operations
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GET, DELETE } from '@/app/api/logs/route';
import { NextRequest } from 'next/server';
import { verifyToken, extractToken, isAdmin } from '@/lib/security/auth';
import { createCsrfMiddleware } from '@/lib/security/csrf';

// Mock dependencies
vi.mock('@/lib/security/auth', () => ({
  verifyToken: vi.fn(),
  extractToken: vi.fn(),
  isAdmin: vi.fn(),
}));

vi.mock('@/lib/security/csrf', () => ({
  createCsrfMiddleware: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  apiLogger: {
    info: vi.fn(),
    audit: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/lib/logger/database-transport', () => ({
  getDbTransport: vi.fn(() => ({
    query: vi.fn(() => ({
      logs: [
        { id: 'log-001', level: 'info', message: 'Test log', timestamp: '2026-03-11T10:00:00Z' },
        { id: 'log-002', level: 'error', message: 'Error log', timestamp: '2026-03-11T11:00:00Z' },
      ],
      total: 2,
      page: 1,
      limit: 100,
    })),
    cleanup: vi.fn(() => 5),
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

  const init = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };

  // Cast to Next.js RequestInit to avoid signal type incompatibility
  return new NextRequest(new URL(url, 'http://localhost:3000'), init as RequestInit);
}

describe('/api/logs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createCsrfMiddleware).mockReturnValue(() => Promise.resolve(null));
    vi.mocked(extractToken).mockReturnValue(null);
    vi.mocked(verifyToken).mockResolvedValue(null);
    vi.mocked(isAdmin).mockReturnValue(false);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('GET', () => {
    it('should return logs without authentication', async () => {
      const request = createRequest('/api/logs');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('logs');
      expect(data.data).toHaveProperty('total');
    });

    it('should accept query parameters for filtering', async () => {
      const request = createRequest('/api/logs?levels=error,warn&search=test&page=1&limit=50');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should return error for invalid token', async () => {
      vi.mocked(extractToken).mockReturnValue('invalid-token');
      vi.mocked(verifyToken).mockResolvedValue(null);

      const request = createRequest('/api/logs');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain('Invalid');
    });

    it('should accept valid token', async () => {
      vi.mocked(extractToken).mockReturnValue('valid-token');
      vi.mocked(verifyToken).mockResolvedValue({
        sub: 'user-123',
        email: 'test@example.com',
        role: 'user',
        iat: Date.now(),
        exp: Date.now() + 3600,
      });

      const request = createRequest('/api/logs');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should handle query errors gracefully', async () => {
      const { getDbTransport } = await import('@/lib/logger/database-transport');
      vi.mocked(getDbTransport).mockReturnValueOnce({
        query: vi.fn(() => {
          throw new Error('Database error');
        }),
        cleanup: vi.fn(),
      } as unknown as ReturnType<typeof getDbTransport>);

      const request = createRequest('/api/logs');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Failed to query logs');
    });
  });

  describe('DELETE', () => {
    it('should require authentication', async () => {
      vi.mocked(extractToken).mockReturnValue(null);

      const request = createRequest('/api/logs?days=30', { method: 'DELETE' });
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain('Authentication');
      expect(data.code).toBe('AUTH_REQUIRED');
    });

    it('should reject invalid token', async () => {
      vi.mocked(extractToken).mockReturnValue('invalid-token');
      vi.mocked(verifyToken).mockResolvedValue(null);

      const request = createRequest('/api/logs?days=30', { method: 'DELETE' });
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.code).toBe('AUTH_INVALID');
    });

    it('should require admin role', async () => {
      vi.mocked(extractToken).mockReturnValue('valid-token');
      vi.mocked(verifyToken).mockResolvedValue({
        sub: 'user-123',
        email: 'user@example.com',
        role: 'user',
        iat: Date.now(),
        exp: Date.now() + 3600,
      });
      vi.mocked(isAdmin).mockReturnValue(false);

      const request = createRequest('/api/logs?days=30', { method: 'DELETE' });
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.code).toBe('ADMIN_REQUIRED');
    });

    it('should validate days parameter', async () => {
      vi.mocked(extractToken).mockReturnValue('valid-token');
      vi.mocked(verifyToken).mockResolvedValue({
        sub: 'admin-123',
        email: 'admin@example.com',
        role: 'admin',
        iat: Date.now(),
        exp: Date.now() + 3600,
      });
      vi.mocked(isAdmin).mockReturnValue(true);

      // Test invalid days (too low)
      const request1 = createRequest('/api/logs?days=0', { method: 'DELETE' });
      const response1 = await DELETE(request1);
      const data1 = await response1.json();

      expect(response1.status).toBe(400);
      expect(data1.error).toContain('Invalid days');

      // Test invalid days (too high)
      const request2 = createRequest('/api/logs?days=400', { method: 'DELETE' });
      const response2 = await DELETE(request2);
      const data2 = await response2.json();

      expect(response2.status).toBe(400);
      expect(data2.error).toContain('Invalid days');
    });

    it('should delete logs as admin with valid parameters', async () => {
      vi.mocked(extractToken).mockReturnValue('valid-token');
      vi.mocked(verifyToken).mockResolvedValue({
        sub: 'admin-123',
        email: 'admin@example.com',
        role: 'admin',
        iat: Date.now(),
        exp: Date.now() + 3600,
      });
      vi.mocked(isAdmin).mockReturnValue(true);

      const request = createRequest('/api/logs?days=30', { method: 'DELETE' });
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.deleted).toBe(5);
      expect(data.data.message).toContain('5');
    });

    it('should use default days parameter (30)', async () => {
      vi.mocked(extractToken).mockReturnValue('valid-token');
      vi.mocked(verifyToken).mockResolvedValue({
        sub: 'admin-123',
        email: 'admin@example.com',
        role: 'admin',
        iat: Date.now(),
        exp: Date.now() + 3600,
      });
      vi.mocked(isAdmin).mockReturnValue(true);

      const request = createRequest('/api/logs', { method: 'DELETE' });
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should handle CSRF failure', async () => {
      vi.mocked(createCsrfMiddleware).mockReturnValue(() =>
        Promise.resolve(new Response(JSON.stringify({ error: 'CSRF token invalid' }), { status: 403 }))
      );

      const request = createRequest('/api/logs?days=30', { method: 'DELETE' });
      const response = await DELETE(request);

      expect(response.status).toBe(403);
    });

    it('should record audit log on successful deletion', async () => {
      const { apiLogger } = await import('@/lib/logger');
      
      vi.mocked(extractToken).mockReturnValue('valid-token');
      vi.mocked(verifyToken).mockResolvedValue({
        sub: 'admin-123',
        email: 'admin@example.com',
        role: 'admin',
        iat: Date.now(),
        exp: Date.now() + 3600,
      });
      vi.mocked(isAdmin).mockReturnValue(true);

      const request = createRequest('/api/logs?days=30', { method: 'DELETE' });
      await DELETE(request);

      expect(apiLogger.audit).toHaveBeenCalledWith(
        'Logs deleted by admin',
        expect.objectContaining({
          userId: 'admin-123',
          userEmail: 'admin@example.com',
        })
      );
    });
  });
});
