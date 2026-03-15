/**
 * 测试 src/app/api/log-error 路由
 */

import { describe, it, expect, vi } from 'vitest';
import { GET, POST } from '@/app/api/log-error/route';
import { NextRequest } from 'next/server';

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
  getDbTransport: vi.fn(() => null),
}));

describe('/api/log-error', () => {
  describe('POST', () => {
    it('should log a valid client error', async () => {
      const url = new URL('http://localhost/api/log-error');
      const request = new NextRequest(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Uncaught TypeError: Cannot read property',
          stack: 'at App.tsx:25:30',
          url: 'https://example.com/page',
          userAgent: 'Mozilla/5.0',
          timestamp: new Date().toISOString(),
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data).toHaveProperty('requestId');
      expect(data.message).toBe('错误已记录');
    });

    it('should reject error without message field', async () => {
      const url = new URL('http://localhost/api/log-error');
      const request = new NextRequest(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stack: 'at App.tsx:25:30',
          url: 'https://example.com',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('INVALID_PAYLOAD');
    });

    it('should reject invalid JSON body', async () => {
      const url = new URL('http://localhost/api/log-error');
      const request = new NextRequest(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
    });

    it('should accept error with additional info', async () => {
      const url = new URL('http://localhost/api/log-error');
      const request = new NextRequest(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Custom error',
          additionalInfo: {
            userId: 'user-123',
            action: 'form_submit',
          },
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should use current timestamp if not provided', async () => {
      const url = new URL('http://localhost/api/log-error');
      const request = new NextRequest(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Error without timestamp',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe('GET', () => {
    it('should require authentication for admin access', async () => {
      const url = new URL('http://localhost/api/log-error');
      const request = new NextRequest(url);

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('UNAUTHORIZED');
    });

    it('should return 403 for non-admin users', async () => {
      const { extractToken, verifyToken, isAdmin } = await import('@/lib/security/auth');
      
      vi.mocked(extractToken).mockReturnValue('valid-token');
      vi.mocked(verifyToken).mockResolvedValue({ userId: 'user-1', role: 'user' });
      vi.mocked(isAdmin).mockReturnValue(false);

      const url = new URL('http://localhost/api/log-error');
      const request = new NextRequest(url);

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('FORBIDDEN');
    });

    it('should return error logs for admin users', async () => {
      const { extractToken, verifyToken, isAdmin } = await import('@/lib/security/auth');
      
      vi.mocked(extractToken).mockReturnValue('admin-token');
      vi.mocked(verifyToken).mockResolvedValue({ userId: 'admin-1', role: 'admin' });
      vi.mocked(isAdmin).mockReturnValue(true);

      const url = new URL('http://localhost/api/log-error?limit=10&offset=0');
      const request = new NextRequest(url);

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data).toHaveProperty('pagination');
    });

    it('should support pagination parameters', async () => {
      const { extractToken, verifyToken, isAdmin } = await import('@/lib/security/auth');
      
      vi.mocked(extractToken).mockReturnValue('admin-token');
      vi.mocked(verifyToken).mockResolvedValue({ userId: 'admin-1', role: 'admin' });
      vi.mocked(isAdmin).mockReturnValue(true);

      const url = new URL('http://localhost/api/log-error?limit=25&offset=50');
      const request = new NextRequest(url);

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.pagination.limit).toBe(25);
      expect(data.pagination.offset).toBe(50);
    });
  });
});
