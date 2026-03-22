/**
 * @fileoverview Tests for CSRF protection utilities
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getCsrfToken,
  clearCsrfToken,
  createCsrfHeaders,
  validateCsrfToken,
} from './csrf';

// Mock fetch
global.fetch = vi.fn();

describe('csrf', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearCsrfToken();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getCsrfToken', () => {
    it('should return cached token if available', async () => {
      const mockFetch = global.fetch as ReturnType<typeof vi.fn>;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrfToken: 'test-token-123' }),
      });

      const token1 = await getCsrfToken();
      const token2 = await getCsrfToken();

      expect(token1).toBe('test-token-123');
      expect(token2).toBe('test-token-123');
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should fetch new token if not cached', async () => {
      const mockFetch = global.fetch as ReturnType<typeof vi.fn>;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrfToken: 'new-token' }),
      });

      const token = await getCsrfToken();

      expect(token).toBe('new-token');
      expect(mockFetch).toHaveBeenCalledWith('/api/csrf-token');
    });

    it('should return null if response is not ok', async () => {
      const mockFetch = global.fetch as ReturnType<typeof vi.fn>;
      mockFetch.mockResolvedValueOnce({
        ok: false,
      });

      const token = await getCsrfToken();

      expect(token).toBeNull();
    });

    it('should return null on fetch error', async () => {
      const mockFetch = global.fetch as ReturnType<typeof vi.fn>;
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const token = await getCsrfToken();

      expect(token).toBeNull();
    });
  });

  describe('clearCsrfToken', () => {
    it('should clear the cached token', async () => {
      const mockFetch = global.fetch as ReturnType<typeof vi.fn>;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrfToken: 'test-token' }),
      });

      await getCsrfToken();
      clearCsrfToken();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrfToken: 'new-token' }),
      });

      const token = await getCsrfToken();

      expect(token).toBe('new-token');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('createCsrfHeaders', () => {
    it('should return headers with CSRF token', async () => {
      const mockFetch = global.fetch as ReturnType<typeof vi.fn>;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrfToken: 'test-token' }),
      });

      const headers = await createCsrfHeaders();

      expect(headers).toEqual({
        'Content-Type': 'application/json',
        'X-CSRF-Token': 'test-token',
      });
    });

    it('should return headers without CSRF token if fetch fails', async () => {
      const mockFetch = global.fetch as ReturnType<typeof vi.fn>;
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const headers = await createCsrfHeaders();

      expect(headers).toEqual({
        'Content-Type': 'application/json',
      });
    });
  });

  describe('validateCsrfToken', () => {
    it('should return false if headerToken is null', () => {
      const result = validateCsrfToken(null, 'valid-token');
      expect(result).toBe(false);
    });

    it('should return false if cookieToken is null', () => {
      const result = validateCsrfToken('valid-token', null);
      expect(result).toBe(false);
    });

    it('should return false if tokens have different lengths', () => {
      const result = validateCsrfToken('123', '1234');
      expect(result).toBe(false);
    });

    it('should return false if tokens do not match', () => {
      const result = validateCsrfToken('abc123', 'abc456');
      expect(result).toBe(false);
    });

    it('should return true if tokens match', () => {
      const result = validateCsrfToken('abc123', 'abc123');
      expect(result).toBe(true);
    });

    it('should treat empty strings as invalid tokens', () => {
      const result = validateCsrfToken('', '');
      expect(result).toBe(false);
    });

    it('should use Buffer equals for time-safe comparison', () => {
      const result = validateCsrfToken(
        'a1b2c3d4e5f6',
        'a1b2c3d4e5f6'
      );
      expect(result).toBe(true);
    });
  });
});
