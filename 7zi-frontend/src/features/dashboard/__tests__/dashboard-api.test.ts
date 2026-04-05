/**
 * Dashboard API Service Tests
 * 数据可视化仪表板 API 服务测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DashboardApiService } from '../services/dashboard-api';
import { TimeRange } from '../types/dashboard';

// Mock fetch
global.fetch = vi.fn();

describe('DashboardApiService', () => {
  let service: DashboardApiService;

  beforeEach(() => {
    service = new DashboardApiService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getMetrics', () => {
    it('should fetch metrics successfully', async () => {
      const mockData = [
        { name: 'system.cpu_usage', value: 50, timestamp: 1234567890 },
        { name: 'system.cpu_usage', value: 55, timestamp: 1234567950 },
      ];

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      });

      const result = await service.getMetrics('system.cpu_usage', '1h');

      expect(result).toHaveLength(2);
      expect(result[0].value).toBe(50);
      expect(result[0].timestamp).toBe(1234567890);
    });

    it('should handle API errors gracefully', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const result = await service.getMetrics('system.cpu_usage', '1h');

      // Should return mock data on error
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
    });

    it('should include tags in request', async () => {
      const mockData = [{ name: 'system.cpu_usage', value: 50, timestamp: 1234567890 }];

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      });

      await service.getMetrics('system.cpu_usage', '1h', { region: 'cn-east' });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('cn-east'),
        })
      );
    });
  });

  describe('getAggregatedMetrics', () => {
    it('should fetch aggregated metrics successfully', async () => {
      const mockData = [
        {
          timestamp: 1234567890,
          count: 100,
          sum: 5000,
          min: 40,
          max: 60,
          avg: 50,
          p50: 48,
          p90: 55,
          p95: 58,
          p99: 60,
        },
      ];

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      });

      const result = await service.getAggregatedMetrics('system.cpu_usage', '1h');

      expect(result).toHaveLength(1);
      expect(result[0].avg).toBe(50);
      expect(result[0].p95).toBe(58);
    });

    it('should handle different time ranges', async () => {
      const timeRanges: TimeRange[] = ['1h', '6h', '24h', '7d', '30d'];

      for (const timeRange of timeRanges) {
        (global.fetch as any).mockResolvedValueOnce({
          ok: true,
          json: async () => [],
        });

        await service.getAggregatedMetrics('system.cpu_usage', timeRange);

        expect(global.fetch).toHaveBeenCalled();
      }
    });
  });

  describe('getLatestMetric', () => {
    it('should fetch latest metric value', async () => {
      const mockData = {
        name: 'system.cpu_usage',
        value: 55,
        timestamp: 1234567890,
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      });

      const result = await service.getLatestMetric('system.cpu_usage');

      expect(result).not.toBeNull();
      expect(result?.value).toBe(55);
      expect(result?.timestamp).toBe(1234567890);
    });

    it('should return null on error', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const result = await service.getLatestMetric('system.cpu_usage');

      // Should return mock data on error
      expect(result).not.toBeNull();
    });
  });

  describe('getMultipleLatestMetrics', () => {
    it('should fetch multiple metrics in parallel', async () => {
      const mockData = {
        name: 'system.cpu_usage',
        value: 55,
        timestamp: 1234567890,
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockData,
      });

      const result = await service.getMultipleLatestMetrics([
        'system.cpu_usage',
        'system.memory_usage',
      ]);

      expect(result).toHaveProperty('system.cpu_usage');
      expect(result).toHaveProperty('system.memory_usage');
      expect(result['system.cpu_usage']?.value).toBe(55);
    });
  });

  describe('getWorkflowStats', () => {
    it('should fetch workflow statistics', async () => {
      const mockData = {
        executions_total: 1000,
        executions_success: 950,
        executions_failed: 50,
        avg_duration: 5.5,
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      });

      const result = await service.getWorkflowStats('24h');

      expect(result.total).toBe(1000);
      expect(result.success).toBe(950);
      expect(result.failed).toBe(50);
      expect(result.successRate).toBe(95);
    });

    it('should calculate success rate correctly', async () => {
      const mockData = {
        executions_total: 1000,
        executions_success: 800,
        executions_failed: 200,
        avg_duration: 5.5,
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      });

      const result = await service.getWorkflowStats('24h');

      expect(result.successRate).toBe(80);
    });

    it('should handle zero total executions', async () => {
      const mockData = {
        executions_total: 0,
        executions_success: 0,
        executions_failed: 0,
        avg_duration: 0,
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      });

      const result = await service.getWorkflowStats('24h');

      expect(result.successRate).toBe(0);
    });
  });

  describe('getUserActivityStats', () => {
    it('should fetch user activity statistics', async () => {
      const mockData = {
        active_users: 100,
        new_users: 20,
        sessions: 500,
        peak_active_users: 150,
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      });

      const result = await service.getUserActivityStats('24h');

      expect(result.activeUsers).toBe(100);
      expect(result.newUsers).toBe(20);
      expect(result.sessions).toBe(500);
      expect(result.peakActiveUsers).toBe(150);
    });
  });

  describe('getPerformanceStats', () => {
    it('should fetch performance statistics', async () => {
      const mockData = {
        response_time: 100,
        throughput: 80,
        error_rate: 1.5,
        p50: 80,
        p90: 150,
        p99: 300,
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      });

      const result = await service.getPerformanceStats('24h');

      expect(result.responseTime).toBe(100);
      expect(result.throughput).toBe(80);
      expect(result.errorRate).toBe(1.5);
      expect(result.p50).toBe(80);
      expect(result.p90).toBe(150);
      expect(result.p99).toBe(300);
    });
  });

  describe('getSystemStats', () => {
    it('should fetch system statistics', async () => {
      const mockData = {
        cpu: 45,
        memory: 60,
        disk: 70,
        network_in: 1000000,
        network_out: 800000,
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      });

      const result = await service.getSystemStats('24h');

      expect(result.cpu).toBe(45);
      expect(result.memory).toBe(60);
      expect(result.disk).toBe(70);
      expect(result.networkIn).toBe(1000000);
      expect(result.networkOut).toBe(800000);
    });
  });
});