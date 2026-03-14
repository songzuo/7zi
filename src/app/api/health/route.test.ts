/**
 * Health API Route Tests
 * Tests for health check endpoints
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, HEAD } from '@/app/api/health/route';
import { enhancedHealthReport } from '@/lib/monitoring';

// Mock the monitoring module
vi.mock('@/lib/monitoring', () => ({
  basicHealthCheck: vi.fn(),
  enhancedHealthReport: vi.fn(),
  healthResponse: vi.fn(),
}));

// Create a mock request helper
const createMockRequest = (url: string = 'http://localhost/api/health') => {
  return new Request(url, { method: 'GET' });
};

describe('/api/health', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET', () => {
    it('should return health status', async () => {
      vi.mocked(enhancedHealthReport).mockResolvedValue({
        status: 'ok' as const,
        timestamp: '2026-03-11T15:00:00Z',
        version: '2.0.0',
        uptime: 100,
        environment: 'test',
        components: {
          cache: { status: 'ok' as const },
          auth: { status: 'ok' as const },
          logger: { status: 'ok' as const },
        },
      });

      const response = await GET(createMockRequest());
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('ok');
      expect(data.timestamp).toBe('2026-03-11T15:00:00Z');
    });

    it('should return 200 even with degraded status', async () => {
      vi.mocked(enhancedHealthReport).mockResolvedValue({
        status: 'degraded' as const,
        timestamp: '2026-03-11T15:00:00Z',
        version: '2.0.0',
        uptime: 100,
        environment: 'test',
        components: {
          cache: { status: 'warning' as const, message: 'Slow response' },
          auth: { status: 'ok' as const },
          logger: { status: 'ok' as const },
        },
      });

      const response = await GET(createMockRequest());
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('degraded');
    });

    it('should return 200 even with unhealthy status', async () => {
      vi.mocked(enhancedHealthReport).mockResolvedValue({
        status: 'error' as const,
        timestamp: '2026-03-11T15:00:00Z',
        version: '2.0.0',
        uptime: 100,
        environment: 'test',
        components: {
          cache: { status: 'error' as const, message: 'Connection failed' },
          auth: { status: 'error' as const },
          logger: { status: 'ok' as const },
        },
      });

      const response = await GET(createMockRequest());
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.status).toBe('error');
    });

    it('should include version in response', async () => {
      vi.mocked(enhancedHealthReport).mockResolvedValue({
        status: 'ok' as const,
        timestamp: '2026-03-11T15:00:00Z',
        version: '2.0.0',
        uptime: 100,
        environment: 'test',
        components: {
          cache: { status: 'ok' as const },
          auth: { status: 'ok' as const },
          logger: { status: 'ok' as const },
        },
      });

      const response = await GET(createMockRequest());
      const data = await response.json();

      expect(data.version).toBe('2.0.0');
    });

    it('should include history when requested', async () => {
      vi.mocked(enhancedHealthReport).mockResolvedValue({
        status: 'ok' as const,
        timestamp: '2026-03-11T15:00:00Z',
        version: '1.0.0',
        uptime: 100,
        environment: 'test',
        components: {
          cache: { status: 'ok' as const },
          auth: { status: 'ok' as const },
          logger: { status: 'ok' as const },
        },
        history: [
          { timestamp: '2026-03-11T15:00:00Z', status: 'ok' as const, responseTime: 50, checksCount: 5, errorsCount: 0 },
        ],
      });

      const response = await GET(createMockRequest('http://localhost/api/health?history=true'));
      const data = await response.json();

      expect(data).toHaveProperty('history');
    });
  });

  describe('HEAD', () => {
    it('should return 200 status', async () => {
      const response = await HEAD();

      expect(response.status).toBe(200);
    });

    it('should return empty body', async () => {
      const response = await HEAD();
      const text = await response.text();

      expect(text).toBe('');
    });
  });
});
