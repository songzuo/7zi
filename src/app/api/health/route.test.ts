/**
 * Health API Route Tests
 * Tests for health check endpoints
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, HEAD } from '@/app/api/health/route';
import { basicHealthCheck } from '@/lib/monitoring';

// Mock the monitoring module
vi.mock('@/lib/monitoring', () => ({
  basicHealthCheck: vi.fn(),
}));

describe('/api/health', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET', () => {
    it('should return health status', async () => {
      vi.mocked(basicHealthCheck).mockReturnValue({
        status: 'ok',
        timestamp: '2026-03-11T15:00:00Z',
        version: '1.0.0',
      });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('ok');
      expect(data.timestamp).toBe('2026-03-11T15:00:00Z');
      expect(basicHealthCheck).toHaveBeenCalledOnce();
    });

    it('should return 200 even with degraded status', async () => {
      vi.mocked(basicHealthCheck).mockReturnValue({
        status: 'degraded',
        timestamp: '2026-03-11T15:00:00Z',
        version: '1.0.0',
        checks: {
          database: 'degraded',
        },
      });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('degraded');
    });

    it('should return 200 even with unhealthy status', async () => {
      vi.mocked(basicHealthCheck).mockReturnValue({
        status: 'unhealthy',
        timestamp: '2026-03-11T15:00:00Z',
        version: '1.0.0',
        checks: {
          database: 'failed',
        },
      });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('unhealthy');
    });

    it('should include version in response', async () => {
      vi.mocked(basicHealthCheck).mockReturnValue({
        status: 'ok',
        timestamp: '2026-03-11T15:00:00Z',
        version: '2.0.0',
      });

      const response = await GET();
      const data = await response.json();

      expect(data.version).toBe('2.0.0');
    });

    it('should call basicHealthCheck once', async () => {
      vi.mocked(basicHealthCheck).mockReturnValue({
        status: 'ok',
        timestamp: '2026-03-11T15:00:00Z',
      });

      await GET();

      expect(basicHealthCheck).toHaveBeenCalledTimes(1);
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

    it('should not call basicHealthCheck', async () => {
      await HEAD();

      expect(basicHealthCheck).not.toHaveBeenCalled();
    });
  });
});
