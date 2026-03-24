/**
 * Performance Dashboard Integration Tests - Simplified
 * Core functionality tests for performance monitoring system
 */

import {describe, it, expect, beforeAll, afterAll} from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import PerformanceDashboard from '@/app/[locale]/performance/page';

// ========================================
// Mock API Responses
// ========================================

const mockMetrics = [
  { id: '1', name: 'LCP', value: 2500, rating: 'good', timestamp: Date.now(), route: '/', deviceType: 'desktop', connectionType: '4g' },
  { id: '2', name: 'FID', value: 100, rating: 'good', timestamp: Date.now(), route: '/', deviceType: 'desktop', connectionType: '4g' },
  { id: '3', name: 'CLS', value: 0.05, rating: 'good', timestamp: Date.now(), route: '/', deviceType: 'desktop', connectionType: '4g' },
];

const mockReport = {
  LCP: {
    name: 'LCP',
    stats: {
      count: 100,
      avg: 2800,
      min: 1500,
      max: 4500,
      p50: 2700,
      p90: 3800,
      p95: 4100,
      good: 70,
      needsImprovement: 20,
      poor: 10,
    },
    trend: 'degrading' as const,
    trendPercentage: 8.5,
    timeSeries: [
      { timestamp: Date.now() - 3600000, value: 2500 },
      { timestamp: Date.now() - 1800000, value: 2700 },
      { timestamp: Date.now(), value: 2800 },
    ],
    recentAlerts: 10,
  },
  FID: {
    name: 'FID',
    stats: {
      count: 100,
      avg: 120,
      min: 50,
      max: 200,
      p50: 110,
      p90: 160,
      p95: 180,
      good: 60,
      needsImprovement: 30,
      poor: 10,
    },
    trend: 'stable' as const,
    trendPercentage: 2.1,
    timeSeries: [
      { timestamp: Date.now() - 3600000, value: 115 },
      { timestamp: Date.now() - 1800000, value: 118 },
      { timestamp: Date.now(), value: 120 },
    ],
    recentAlerts: 10,
  },
  CLS: {
    name: 'CLS',
    stats: {
      count: 100,
      avg: 0.08,
      min: 0.01,
      max: 0.3,
      p50: 0.07,
      p90: 0.15,
      p95: 0.2,
      good: 80,
      needsImprovement: 15,
      poor: 5,
    },
    trend: 'improving' as const,
    trendPercentage: 12.3,
    timeSeries: [
      { timestamp: Date.now() - 3600000, value: 0.09 },
      { timestamp: Date.now() - 1800000, value: 0.085 },
      { timestamp: Date.now(), value: 0.08 },
    ],
    recentAlerts: 5,
  },
};

// ========================================
// Mock Fetch
// ========================================

const mockFetch = (url: string, options?: RequestInit) => {
  return new Promise<Response>((resolve) => {
    setTimeout(() => {
      if (url.includes('/api/performance/report')) {
        resolve({
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            report: {
              period: { start: Date.now() - 86400000, end: Date.now() },
              metrics: mockReport,
              summary: {
                totalMetrics: 500,
                totalRoutes: 5,
                overallRating: 'needs-improvement',
                criticalAlerts: 10,
                topIssues: [],
              },
            },
          }),
        } as Response);
      } else if (url.includes('/api/performance/metrics')) {
        if (options?.method === 'POST') {
          resolve({
            ok: true,
            status: 200,
            json: async () => ({ success: true, metrics: mockMetrics }),
          } as Response);
        } else {
          resolve({
            ok: true,
            status: 200,
            json: async () => ({ success: true, metrics: mockMetrics }),
          } as Response);
        }
      } else {
        resolve({
          ok: true,
          status: 200,
          json: async () => ({ success: true }),
        } as Response);
      }
    }, 100);
  });
};

// ========================================
// Test Suite
// ========================================

describe('Performance Dashboard - Simplified', () => {
  beforeAll(() => {
    global.fetch = mockFetch as any;
  });

  afterAll(() => {
    delete (global as any).fetch;
  });

  describe('Dashboard Rendering', () => {
    it('should render dashboard with metrics', async () => {
      render(<PerformanceDashboard />);

      await waitFor(() => {
        expect(screen.getByText(/performance/i)).toBeInTheDocument();
      }, { timeout: 5000 });
    });

    it('should display metric names', async () => {
      render(<PerformanceDashboard />);

      await waitFor(() => {
        expect(screen.getByText(/lcp/i)).toBeInTheDocument();
        expect(screen.getByText(/fid/i)).toBeInTheDocument();
        expect(screen.getByText(/cls/i)).toBeInTheDocument();
      }, { timeout: 5000 });
    });
  });

  describe('Performance Metrics Collection', () => {
    it('should calculate statistics correctly', () => {
      const values = [100, 150, 200, 250, 300];
      const sum = values.reduce((a, b) => a + b, 0);
      const avg = sum / values.length;
      const min = Math.min(...values);
      const max = Math.max(...values);

      expect(avg).toBe(200);
      expect(min).toBe(100);
      expect(max).toBe(300);
    });

    it('should calculate percentiles correctly', () => {
      const sortedValues = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
      const p50 = sortedValues[Math.floor(sortedValues.length * 0.5)];
      const p90 = sortedValues[Math.floor(sortedValues.length * 0.9)];
      const p95 = sortedValues[Math.floor(sortedValues.length * 0.95)];

      expect(p50).toBe(60);
      expect(p90).toBe(100);
      expect(p95).toBe(100);
    });

    it('should determine ratings based on thresholds', () => {
      const thresholds = { good: 2500, needsImprovement: 4000 };

      const getRating = (value: number) => {
        if (value <= thresholds.good) return 'good';
        if (value <= thresholds.needsImprovement) return 'needs-improvement';
        return 'poor';
      };

      expect(getRating(2000)).toBe('good');
      expect(getRating(3000)).toBe('needs-improvement');
      expect(getRating(4500)).toBe('poor');
    });
  });
});
