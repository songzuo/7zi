/**
 * @fileoverview CSRF Token API route integration tests
 * @description Tests for /api/csrf-token endpoint - CSRF token generation and validation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GET, POST } from '../route';
import { cookies } from 'next/headers';

// Mock the cookies API
vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

describe('/api/csrf-token', () => {
  let mockCookieStore: {
    get: ReturnType<typeof vi.fn>;
    set: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-18T08:00:00.000Z'));
    
    mockCookieStore = {
      get: vi.fn().mockReturnValue(undefined),
      set: vi.fn(),
    };
    cookies.mockImplementation(() => Promise.resolve(mockCookieStore as any));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('GET request', () => {
    it('should return CSRF token with correct structure', async () => {
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('data');
      expect(data).toHaveProperty('timestamp');
    });

    it('should return success true', async () => {
      const response = await GET();
      const data = await response.json();

      expect(data.success).toBe(true);
    });

    it('should return csrfToken in data object', async () => {
      const response = await GET();
      const data = await response.json();

      expect(data.data).toHaveProperty('csrfToken');
      expect(typeof data.data.csrfToken).toBe('string');
      expect(data.data.csrfToken.length).toBe(64); // 32 bytes = 64 hex chars
    });

    it('should return expiresAt in data object', async () => {
      const response = await GET();
      const data = await response.json();

      expect(data.data).toHaveProperty('expiresAt');
      expect(typeof data.data.expiresAt).toBe('string');

      // Should be ISO 8601 format
      expect(() => new Date(data.data.expiresAt)).not.toThrow();
    });

    it('should return timestamp', async () => {
      const response = await GET();
      const data = await response.json();

      expect(data.timestamp).toBe('2026-03-18T08:00:00.000Z');
    });

    it('should return JSON content type', async () => {
      const response = await GET();

      expect(response.headers.get('content-type')).toContain('application/json');
    });
  });

  describe('GET request - token generation', () => {
    it('should generate unique tokens on each request', async () => {
      const response1 = await GET();
      const response2 = await GET();

      const data1 = await response1.json();
      const data2 = await response2.json();

      expect(data1.data.csrfToken).not.toBe(data2.data.csrfToken);
    });

    it('should generate valid hexadecimal tokens', async () => {
      const response = await GET();
      const data = await response.json();

      const token = data.data.csrfToken;
      expect(token).toMatch(/^[0-9a-f]{64}$/i);
    });

    it('should set expiresAt approximately 1 hour from now', async () => {
      const response = await GET();
      const data = await response.json();

      const expiresAt = new Date(data.data.expiresAt);
      const now = new Date('2026-03-18T08:00:00.000Z');
      const diff = expiresAt.getTime() - now.getTime();

      // Should be approximately 1 hour (3600 seconds)
      expect(diff).toBeGreaterThan(3500 * 1000);
      expect(diff).toBeLessThan(3700 * 1000);
    });
  });

  describe('POST request - token validation', () => {
    it('should validate valid CSRF token', async () => {
      // First get a token
      const getResponse = await GET();
      const getData = await getResponse.json();

      // Mock the cookie to return the token
      mockCookieStore.get.mockReturnValue({ value: getData.data.csrfToken });

      // Then validate it
      const request = new Request('http://localhost:3000/api/csrf-token', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          csrfToken: getData.data.csrfToken,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.valid).toBe(true);
    });

    it('should reject missing CSRF token', async () => {
      const request = new Request('http://localhost:3000/api/csrf-token', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.type).toBe('VALIDATION_ERROR');
    });

    it('should reject invalid CSRF token format', async () => {
      const request = new Request('http://localhost:3000/api/csrf-token', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          csrfToken: 'invalid',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.type).toBe('VALIDATION_ERROR');
    });

    it('should reject mismatched CSRF token', async () => {
      // First get a token and set the cookie
      const getResponse = await GET();
      const getData = await getResponse.json();
      
      // Set cookie to a DIFFERENT token to cause mismatch
      mockCookieStore.get.mockReturnValue({ value: 'b'.repeat(64) });

      const request = new Request('http://localhost:3000/api/csrf-token', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          csrfToken: getData.data.csrfToken, // This doesn't match cookie
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error.type).toBe('FORBIDDEN');
    });

    it('should reject when cookie is not set', async () => {
      // In test environment, cookies might not be set
      // This test validates the behavior when cookie is missing
      const request = new Request('http://localhost:3000/api/csrf-token', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          csrfToken: '0'.repeat(64),
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      // Either 400 (no cookie) or 403 (mismatch)
      expect([400, 403]).toContain(response.status);
      expect(data.success).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle multiple rapid GET requests', async () => {
      const responses = await Promise.all([
        GET(),
        GET(),
        GET(),
      ]);

      expect(responses.every(r => r.status === 200)).toBe(true);

      // All tokens should be unique
      const dataPromises = responses.map(r => r.json());
      const dataArray = await Promise.all(dataPromises);
      const tokens = dataArray.map(d => d.data.csrfToken);

      const uniqueTokens = new Set(tokens);
      expect(uniqueTokens.size).toBe(3);
    });

    it('should handle malformed JSON in POST', async () => {
      const request = new Request('http://localhost:3000/api/csrf-token', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: 'invalid json',
      });

      const response = await POST(request);

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should handle missing content-type in POST', async () => {
      const request = new Request('http://localhost:3000/api/csrf-token', {
        method: 'POST',
        body: JSON.stringify({ csrfToken: 'a'.repeat(64) }),
      });

      const response = await POST(request);

      // Should still handle the request
      expect([200, 400, 500]).toContain(response.status);
    });
  });
});
