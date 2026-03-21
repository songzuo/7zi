/**
 * Performance Monitoring Integration Tests
 * End-to-end tests for performance monitoring system
 */

import {describe, it, expect, beforeAll, afterAll} from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PerformanceDashboard from '@/app/[locale]/performance/page';

// ========================================
// Mock API Responses
// ========================================

const mockMetrics = [
  { id: '1', name: 'LCP', value: 2500, rating: 'good', timestamp: Date.now(), route: '/', deviceType: 'desktop', connectionType: '4g' },
  { id: '2', name: 'FID', value: 100, rating: 'good', timestamp: Date.now(), route: '/', deviceType: 'desktop', connectionType: '4g' },
  { id: '3', name: 'CLS', value: 0.05, rating: 'good', timestamp: Date.now(), route: '/', deviceType: 'desktop', connectionType: '4g' },
  { id: '4', name: 'INP', value: 150, rating: 'good', timestamp: Date.now(), route: '/', deviceType: 'desktop', connectionType: '4g' },
  { id: '5', name: 'TTFB', value: 600, rating: 'good', timestamp: Date.now(), route: '/', deviceType: 'desktop', connectionType: '4g' },
];

const mockAlerts = [
  {
    id: 'alert-1',
    ruleId: 'lcp-poor',
    metric: 'LCP',
    value: 4500,
    threshold: 4000,
    severity: 'critical',
    timestamp: Date.now(),
    route: '/',
    message: 'LCP is 4500 (threshold: 4000) on /',
    acknowledged: false,
  },
  {
    id: 'alert-2',
    ruleId: 'fid-needs-improvement',
    metric: 'FID',
    value: 150,
    threshold: 100,
    severity: 'medium',
    timestamp: Date.now(),
    route: '/dashboard',
    message: 'FID is 150 (threshold: 100) on /dashboard',
    acknowledged: false,
  },
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
      } else if (url.includes('/api/performance/alerts')) {
        resolve({
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            alerts: mockAlerts,
            rules: [],
            summary: {
              total: 2,
              unacknowledged: 2,
              bySeverity: { low: 0, medium: 1, high: 0, critical: 1 },
              byMetric: { LCP: 1, FID: 1, CLS: 0, INP: 0, TTFB: 0 },
            },
          }),
        } as Response);
      } else if (options?.method === 'POST' && url.includes('/api/performance/alerts')) {
        const body = JSON.parse(options.body as string);
        if (body.action === 'acknowledge') {
          resolve({
            ok: true,
            status: 200,
            json: async () => ({ success: true, alert: { ...mockAlerts[0], acknowledged: true } }),
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

describe('Performance Dashboard Integration', () => {
  beforeAll(() => {
    global.fetch = mockFetch as any;
  });

  afterAll(() => {
    // Restore original fetch
    delete (global as any).fetch;
  });

  describe('Dashboard Rendering', () => {
    it('should render the dashboard with metrics', async () => {
      render(<PerformanceDashboard />);

      await waitFor(() => {
        expect(screen.getByText(/performance dashboard/i)).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByText(/lcp/i)).toBeInTheDocument();
        expect(screen.getByText(/fid/i)).toBeInTheDocument();
        expect(screen.getByText(/cls/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should display overall performance rating', async () => {
      render(<PerformanceDashboard />);

      await waitFor(() => {
        expect(screen.getByText(/needs-improvement performance/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should display active alerts', async () => {
      render(<PerformanceDashboard />);

      await waitFor(() => {
        expect(screen.getByText(/active alerts/i)).toBeInTheDocument();
      }, { timeout: 3000 });

      await waitFor(() => {
        expect(screen.getByText(/lcp is 4500/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should display metric statistics', async () => {
      render(<PerformanceDashboard />);

      await waitFor(() => {
        expect(screen.getByText(/2800ms/)).toBeInTheDocument(); // LCP avg
        expect(screen.getByText(/120ms/)).toBeInTheDocument(); // FID avg
        expect(screen.getByText(/0.08/)).toBeInTheDocument(); // CLS avg
      }, { timeout: 3000 });
    });

    it('should display trend indicators', async () => {
      render(<PerformanceDashboard />);

      await waitFor(() => {
        expect(screen.getByText(/8.5%/)).toBeInTheDocument(); // LCP trend
        expect(screen.getByText(/12.3%/)).toBeInTheDocument(); // CLS trend
      }, { timeout: 3000 });
    });
  });

  describe('User Interactions', () => {
    it('should allow changing time period', async () => {
      const user = userEvent.setup();
      render(<PerformanceDashboard />);

      await waitFor(() => {
        const select = screen.getByRole('combobox');
        expect(select).toBeInTheDocument();
      }, { timeout: 3000 });

      const select = screen.getByRole('combobox');
      await user.click(select);

      // Should have period options
      expect(screen.getByText(/last 1 hour/i)).toBeInTheDocument();
      expect(screen.getByText(/last 24 hours/i)).toBeInTheDocument();
      expect(screen.getByText(/last 7 days/i)).toBeInTheDocument();
    });

    it('should allow refreshing data', async () => {
      const user = userEvent.setup();
      render(<PerformanceDashboard />);

      await waitFor(() => {
        expect(screen.getByText(/refresh/i)).toBeInTheDocument();
      }, { timeout: 3000 });

      const refreshButton = screen.getByText(/refresh/i);
      await user.click(refreshButton);

      // Should trigger a fetch call (can't test directly without more complex mocking)
    });

    it('should allow acknowledging alerts', async () => {
      const user = userEvent.setup();
      render(<PerformanceDashboard />);

      await waitFor(() => {
        expect(screen.getByText(/acknowledge/i)).toBeInTheDocument();
      }, { timeout: 3000 });

      const acknowledgeButtons = screen.getAllByText(/acknowledge/i);
      await user.click(acknowledgeButtons[0]);

      // Should trigger an API call
    });
  });

  describe('Data Visualization', () => {
    it('should display metric charts when selected', async () => {
      const user = userEvent.setup();
      render(<PerformanceDashboard />);

      await waitFor(() => {
        expect(screen.getByText(/largest contentful paint/i)).toBeInTheDocument();
      }, { timeout: 3000 });

      // Chart should be rendered
      // Can't test Recharts directly without more complex setup
    });
  });
});

describe('Performance Monitoring System', () => {
  beforeAll(() => {
    global.fetch = mockFetch as any;
  });

  afterAll(() => {
    delete (global as any).fetch;
  });

  describe('End-to-End Flow', () => {
    it('should collect, store, and display metrics', async () => {
      // 1. Simulate metric collection
      const metricData = {
        metrics: mockMetrics,
        metadata: {
          route: '/',
          deviceType: 'desktop',
          connectionType: '4g',
          url: 'http://localhost',
          viewportWidth: 1920,
          viewportHeight: 1080,
        },
      };

      // 2. Send metrics to API
      const response = await fetch('/api/performance/metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(metricData),
      });

      expect(response.ok).toBe(true);

      // 3. Retrieve metrics from API
      const getResponse = await fetch('/api/performance/metrics?limit=10');
      const getData = await getResponse.json();

      expect(getResponse.ok).toBe(true);
      expect(getData.success).toBe(true);
      expect(getData.metrics).toBeDefined();
    });

    it('should generate and display performance report', async () => {
      // Generate report
      const response = await fetch('/api/performance/report?period=24h');
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
      expect(data.report).toBeDefined();
      expect(data.report.metrics).toBeDefined();
      expect(data.report.summary).toBeDefined();

      // Check summary
      expect(data.report.summary.totalMetrics).toBeGreaterThan(0);
      expect(data.report.summary.overallRating).toBeDefined();
    });

    it('should trigger alerts based on thresholds', async () => {
      // Send poor metric
      const poorMetric = {
        metrics: [
          {
            id: 'poor-metric',
            name: 'LCP',
            value: 4500,
            rating: 'poor',
            timestamp: Date.now(),
            route: '/',
            deviceType: 'desktop',
            connectionType: '4g',
          },
        ],
        metadata: {
          route: '/',
          deviceType: 'desktop',
          connectionType: '4g',
          url: 'http://localhost',
          viewportWidth: 1920,
          viewportHeight: 1080,
        },
      };

      await fetch('/api/performance/metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(poorMetric),
      });

      // Check for alerts
      const alertsResponse = await fetch('/api/performance/alerts');
      const alertsData = await alertsResponse.json();

      expect(alertsResponse.ok).toBe(true);
      expect(alertsData.success).toBe(true);
      expect(alertsData.alerts).toBeDefined();
    });

    it('should allow alert rule management', async () => {
      // Create new rule
      const newRule = {
        action: 'create-rule',
        rule: {
          name: 'Test Rule',
          metric: 'LCP',
          condition: 'gt',
          threshold: 5000,
          enabled: true,
          severity: 'critical',
          notificationChannels: ['console'],
        },
      };

      const createResponse = await fetch('/api/performance/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRule),
      });

      const createData = await createResponse.json();

      expect(createResponse.ok).toBe(true);
      expect(createData.success).toBe(true);
      expect(createData.rule).toBeDefined();
      expect(createData.rule.name).toBe('Test Rule');
    });

    it('should support data export', async () => {
      // This is a placeholder for export functionality
      // In a real implementation, this would test CSV/JSON export

      const response = await fetch('/api/performance/metrics?limit=100');
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.metrics).toBeDefined();
      expect(Array.isArray(data.metrics)).toBe(true);

      // Simulate export
      const exportData = JSON.stringify(data.metrics, null, 2);
      expect(exportData).toBeDefined();
      expect(exportData.length).toBeGreaterThan(0);
    });
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
    expect(p90).toBe(100); // 10 * 0.9 = 9, Math.floor(9) = 9, sortedValues[9] = 100
    expect(p95).toBe(100); // 10 * 0.95 = 9.5, Math.floor(9.5) = 9, sortedValues[9] = 100
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
