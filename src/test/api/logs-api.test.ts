/**
 * Logs API 单元测试
 * 测试日志 API 的所有端点
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, DELETE } from '@/app/api/logs/route';

// Mock database transport
const mockQueryResult = {
  logs: [
    {
      id: 'log-001',
      level: 'info',
      message: 'Test log entry',
      timestamp: '2024-01-01T00:00:00.000Z',
      category: 'api',
    },
  ],
  total: 1,
  page: 1,
  limit: 100,
};

const mockDbTransport = {
  query: vi.fn(() => mockQueryResult),
  cleanup: vi.fn(() => 10),
};

vi.mock('@/lib/logger/database-transport', () => ({
  getDbTransport: vi.fn(() => mockDbTransport),
}));

// Mock auth
vi.mock('@/lib/security/auth', () => ({
  verifyToken: vi.fn(),
  extractToken: vi.fn(),
  isAdmin: vi.fn((user) => user?.role === 'admin'),
  generateAccessToken: vi.fn(),
  generateRefreshToken: vi.fn(),
}));

// Mock CSRF
vi.mock('@/lib/security/csrf', () => ({
  createCsrfMiddleware: vi.fn(() => vi.fn(() => null)),
  generateCsrfToken: vi.fn(() => 'mock-csrf-token'),
  setCsrfTokenCookie: vi.fn(() => new Headers()),
}));

// Mock logger
vi.mock('@/lib/logger', () => ({
  apiLogger: {
    audit: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('Logs API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('GET /api/logs', () => {
    it('should return logs with default parameters', async () => {
      const request = new NextRequest('http://localhost:3000/api/logs');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
    });

    it('should query logs with pagination', async () => {
      const request = new NextRequest('http://localhost:3000/api/logs?page=2&limit=50');
      await GET(request);

      expect(mockDbTransport.query).toHaveBeenCalled();
    });

    it('should filter logs by level', async () => {
      const request = new NextRequest('http://localhost:3000/api/logs?levels=error,warn');
      await GET(request);

      expect(mockDbTransport.query).toHaveBeenCalled();
    });

    it('should filter logs by category', async () => {
      const request = new NextRequest('http://localhost:3000/api/logs?categories=api,auth');
      await GET(request);

      expect(mockDbTransport.query).toHaveBeenCalled();
    });

    it('should search logs', async () => {
      const request = new NextRequest('http://localhost:3000/api/logs?search=error');
      await GET(request);

      expect(mockDbTransport.query).toHaveBeenCalled();
    });

    it('should filter by time range', async () => {
      const startTime = '2024-01-01T00:00:00Z';
      const endTime = '2024-01-02T00:00:00Z';
      const request = new NextRequest(`http://localhost:3000/api/logs?startTime=${startTime}&endTime=${endTime}`);
      await GET(request);

      expect(mockDbTransport.query).toHaveBeenCalled();
    });

    it('should filter by userId', async () => {
      const request = new NextRequest('http://localhost:3000/api/logs?userId=user-123');
      await GET(request);

      expect(mockDbTransport.query).toHaveBeenCalled();
    });

    it('should filter by requestId', async () => {
      const request = new NextRequest('http://localhost:3000/api/logs?requestId=req-456');
      await GET(request);

      expect(mockDbTransport.query).toHaveBeenCalled();
    });

    it('should filter by route', async () => {
      const request = new NextRequest('http://localhost:3000/api/logs?route=/api/tasks');
      await GET(request);

      expect(mockDbTransport.query).toHaveBeenCalled();
    });

    it('should sort logs by timestamp', async () => {
      const request = new NextRequest('http://localhost:3000/api/logs?orderBy=timestamp&order=desc');
      await GET(request);

      expect(mockDbTransport.query).toHaveBeenCalled();
    });

    it('should handle invalid token gracefully', async () => {
      const { verifyToken, extractToken } = await import('@/lib/security/auth');
      vi.mocked(extractToken).mockReturnValue('invalid-token');
      vi.mocked(verifyToken).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/logs', {
        headers: { Authorization: 'Bearer invalid-token' },
      });
      const response = await GET(request);

      expect(response.status).toBe(401);
    });

    it('should limit query results', async () => {
      const request = new NextRequest('http://localhost:3000/api/logs?limit=10000');
      await GET(request);

      // Should cap the limit at 1000
      expect(mockDbTransport.query).toHaveBeenCalled();
    });
  });

  describe('DELETE /api/logs', () => {
    it('should require authentication', async () => {
      const { extractToken } = await import('@/lib/security/auth');
      vi.mocked(extractToken).mockReturnValue(null);

      const request = new NextRequest('http://localhost:3000/api/logs?days=30', {
        method: 'DELETE',
      });
      const response = await DELETE(request);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toContain('Authentication required');
    });

    it('should require admin role', async () => {
      const { extractToken, verifyToken, isAdmin } = await import('@/lib/security/auth');
      vi.mocked(extractToken).mockReturnValue('valid-token');
      vi.mocked(verifyToken).mockResolvedValue({ sub: 'user-123', role: 'user', email: 'user@test.com' } as any);
      vi.mocked(isAdmin).mockReturnValue(false);

      const request = new NextRequest('http://localhost:3000/api/logs?days=30', {
        method: 'DELETE',
      });
      const response = await DELETE(request);

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toContain('Admin access required');
    });

    it('should delete logs for admin user', async () => {
      const { extractToken, verifyToken, isAdmin } = await import('@/lib/security/auth');
      vi.mocked(extractToken).mockReturnValue('valid-token');
      vi.mocked(verifyToken).mockResolvedValue({ sub: 'admin-123', role: 'admin', email: 'admin@test.com' } as any);
      vi.mocked(isAdmin).mockReturnValue(true);

      const request = new NextRequest('http://localhost:3000/api/logs?days=30', {
        method: 'DELETE',
      });
      const response = await DELETE(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(mockDbTransport.cleanup).toHaveBeenCalledWith(30);
    });

    it('should validate days parameter', async () => {
      const { extractToken, verifyToken, isAdmin } = await import('@/lib/security/auth');
      vi.mocked(extractToken).mockReturnValue('valid-token');
      vi.mocked(verifyToken).mockResolvedValue({ sub: 'admin-123', role: 'admin', email: 'admin@test.com' } as any);
      vi.mocked(isAdmin).mockReturnValue(true);

      const request = new NextRequest('http://localhost:3000/api/logs?days=500', {
        method: 'DELETE',
      });
      const response = await DELETE(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Invalid days');
    });

    it('should reject negative days', async () => {
      const { extractToken, verifyToken, isAdmin } = await import('@/lib/security/auth');
      vi.mocked(extractToken).mockReturnValue('valid-token');
      vi.mocked(verifyToken).mockResolvedValue({ sub: 'admin-123', role: 'admin', email: 'admin@test.com' } as any);
      vi.mocked(isAdmin).mockReturnValue(true);

      const request = new NextRequest('http://localhost:3000/api/logs?days=-1', {
        method: 'DELETE',
      });
      const response = await DELETE(request);

      expect(response.status).toBe(400);
    });

    it('should default to 30 days', async () => {
      const { extractToken, verifyToken, isAdmin } = await import('@/lib/security/auth');
      vi.mocked(extractToken).mockReturnValue('valid-token');
      vi.mocked(verifyToken).mockResolvedValue({ sub: 'admin-123', role: 'admin', email: 'admin@test.com' } as any);
      vi.mocked(isAdmin).mockReturnValue(true);

      const request = new NextRequest('http://localhost:3000/api/logs', {
        method: 'DELETE',
      });
      const response = await DELETE(request);

      expect(response.status).toBe(200);
      expect(mockDbTransport.cleanup).toHaveBeenCalledWith(30);
    });

    it('should return deleted count', async () => {
      const { extractToken, verifyToken, isAdmin } = await import('@/lib/security/auth');
      vi.mocked(extractToken).mockReturnValue('valid-token');
      vi.mocked(verifyToken).mockResolvedValue({ sub: 'admin-123', role: 'admin', email: 'admin@test.com' } as any);
      vi.mocked(isAdmin).mockReturnValue(true);
      mockDbTransport.cleanup.mockReturnValue(25);

      const request = new NextRequest('http://localhost:3000/api/logs?days=7', {
        method: 'DELETE',
      });
      const response = await DELETE(request);

      const data = await response.json();
      expect(data.data.deleted).toBe(25);
    });
  });
});