/**
 * @fileoverview Stream/Health API route integration tests
 * @description Tests for /api/stream/health endpoint - SSE health stream
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '../route';
import { createMockNextRequest } from '@/test/utils/mock-request';

describe('/api/stream/health', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-18T08:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('GET request', () => {
    it('should return SSE response headers', async () => {
      const request = createMockNextRequest('http://localhost:3000/api/stream/health', {
          headers: {
          'Accept': 'text/event-stream',
        },
      });

      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('text/event-stream');
      expect(response.headers.get('cache-control')).toBe('no-cache, no-transform');
      expect(response.headers.get('connection')).toBe('keep-alive');
    });

    it('should return X-Client-ID header', async () => {
      const request = createMockNextRequest('http://localhost:3000/api/stream/health', {
          headers: {
          'Accept': 'text/event-stream',
        },
      });

      const response = await GET(request);
      const clientId = response.headers.get('X-Client-ID');

      expect(clientId).toBeDefined();
      expect(typeof clientId).toBe('string');
      expect(clientId!.length).toBeGreaterThan(0);
    });

    it('should reject non-SSE requests', async () => {
      const request = createMockNextRequest('http://localhost:3000/api/stream/health', {
          headers: {
          'Accept': 'application/json',
        },
      });

      const response = await GET(request);

      expect(response.status).toBe(400);
    });

    it('should return streaming response body', async () => {
      const request = createMockNextRequest('http://localhost:3000/api/stream/health', {
          headers: {
          'Accept': 'text/event-stream',
        },
      });

      const response = await GET(request);

      expect(response.body).toBeInstanceOf(ReadableStream);
    });
  });

  describe('response structure', () => {
    it('should send SSE-formatted events', async () => {
      const request = createMockNextRequest('http://localhost:3000/api/stream/health', {
          headers: {
          'Accept': 'text/event-stream',
        },
      });

      const response = await GET(request);

      if (!response.body) {
        throw new Error('Response body is null');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      // Read initial data
      const { value, done } = await reader.read();
      expect(done).toBe(false);

      const text = decoder.decode(value!);
      // Should contain SSE format (data:, event:, etc.)
      expect(text).toMatch(/data:|event:|id:/);
    });
  });

  describe('SSE headers validation', () => {
    it('should include standard SSE headers', async () => {
      const request = createMockNextRequest('http://localhost:3000/api/stream/health', {
          headers: {
          'Accept': 'text/event-stream',
        },
      });

      const response = await GET(request);
      const headers = response.headers;

      expect(headers.get('cache-control')).toContain('no-cache');
      expect(headers.get('connection')).toBe('keep-alive');
    });
  });

  describe('error handling', () => {
    it('should handle request without Accept header', async () => {
      const request = new NextRequest('http://localhost:3000/api/stream/health');

      const response = await GET(request);

      expect(response.status).toBe(400);
    });

    it('should handle invalid Accept header', async () => {
      const request = createMockNextRequest('http://localhost:3000/api/stream/health', {
          headers: {
          'Accept': 'text/html',
        },
      });

      const response = await GET(request);

      expect(response.status).toBe(400);
    });
  });
});
