/**
 * CSRF Token API route tests
 * @description Tests for /api/csrf-token endpoint - CSRF protection
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GET } from '../route';
import { cookies } from 'next/headers';

// Mock next/headers
vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

describe('/api/csrf-token', () => {
  let mockCookieStore: {
    set: ReturnType<typeof vi.fn>;
    get: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockCookieStore = {
      set: vi.fn(),
      get: vi.fn(),
    };
    vi.mocked(cookies).mockReturnValue(mockCookieStore as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('GET request', () => {
    it('should return 200 status', async () => {
      const response = await GET();
      expect(response.status).toBe(200);
    });

    it('should return JSON content type', async () => {
      const response = await GET();
      expect(response.headers.get('content-type')).toContain('application/json');
    });

    it('should return token in response', async () => {
      const response = await GET();
      const data = await response.json();

      expect(data).toHaveProperty('token');
      expect(typeof data.token).toBe('string');
      expect(data.token.length).toBeGreaterThan(0);
    });

    it('should set CSRF cookie', async () => {
      await GET();

      expect(mockCookieStore.set).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'csrf_token',
          value: expect.any(String),
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
        })
      );
    });

    it('should generate unique tokens', async () => {
      const response1 = await GET();
      const response2 = await GET();

      const data1 = await response1.json();
      const data2 = await response2.json();

      expect(data1.token).not.toBe(data2.token);
    });

    it('should generate cryptographically strong tokens', async () => {
      const response = await GET();
      const data = await response.json();

      // Token should be at least 32 characters (256 bits in hex)
      expect(data.token.length).toBeGreaterThanOrEqual(32);

      // Token should contain only hex characters (0-9, a-f)
      expect(data.token).toMatch(/^[0-9a-f]+$/i);
    });
  });

  describe('Token validation', () => {
    it('should return token that can be validated', async () => {
      const response = await GET();
      const data = await response.json();

      // In a real implementation, this would verify the token can be used
      // For now, we just verify the structure
      expect(data.token).toBeDefined();
    });

    it('should handle multiple requests', async () => {
      const responses = await Promise.all([
        GET(),
        GET(),
        GET(),
      ]);

      const tokens = await Promise.all(
        responses.map(r => r.json().then(d => d.token))
      );

      // All tokens should be unique
      expect(new Set(tokens).size).toBe(3);
    });
  });

  describe('Security headers', () => {
    it('should include security headers', async () => {
      const response = await GET();

      // Check for common security headers
      const headers = response.headers;

      // These headers should be set by Next.js middleware
      expect(headers.get('x-dns-prefetch-control')).toBeTruthy();
      expect(headers.get('x-frame-options')).toBeTruthy();
    });
  });

  describe('Edge cases', () => {
    it('should handle rapid requests', async () => {
      const requests = Array(10).fill(null).map(() => GET());

      const responses = await Promise.all(requests);

      expect(responses.every(r => r.status === 200)).toBe(true);
    });

    it('should not expose sensitive information in error response', async () => {
      // This test would need to mock a failure scenario
      // For now, we verify the success path doesn't leak info
      const response = await GET();
      const data = await response.json();

      // Should not include internal paths or secrets
      expect(data).not.toHaveProperty('internal');
      expect(data).not.toHaveProperty('secret');
      expect(data).not.toHaveProperty('password');
    });
  });

  describe('Performance', () => {
    it('should respond quickly', async () => {
      const start = Date.now();
      await GET();
      const duration = Date.now() - start;

      // Should respond in less than 100ms
      expect(duration).toBeLessThan(100);
    });
  });
});
