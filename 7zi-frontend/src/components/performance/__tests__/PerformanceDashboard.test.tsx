/**
 * Performance Dashboard Tests
 * 性能仪表板组件测试
 */

import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { PerformanceDashboard } from '../PerformanceDashboard'
import { webVitalsMonitor, customMetricsTracker, budgetManager } from '@/lib/performance'
import { calculateWebVitalsScore } from '@/lib/performance/web-vitals'
import type { Mock } from 'vitest'

// Mock performance modules
vi.mock('@/lib/performance/web-vitals', () => ({
  webVitalsMonitor: {
    getMetrics: vi.fn(),
    isMetricGood: vi.fn(),
  },
  calculateWebVitalsScore: vi.fn(),
}))

vi.mock('@/lib/performance/custom-metrics', () => ({
  customMetricsTracker: {
    getMetrics: vi.fn(),
  },
}))

vi.mock('@/lib/performance/budget-manager', () => ({
  budgetManager: {
    calculateBudgetReport: vi.fn(),
    getActiveNotifications: vi.fn(),
  },
}))

// Mock UI components
vi.mock('@/components/ui/Card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('@/components/ui/Badge', () => ({
  Badge: ({ children, variant }: { children: React.ReactNode; variant?: string }) => (
    <span data-variant={variant}>{children}</span>
  ),
}))

vi.mock('@/components/ui/Progress', () => ({
  Progress: ({ value }: { value: number }) => <div data-value={value} />,
}))

vi.mock('@/components/ui/Tabs', () => ({
  Tabs: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsList: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsTrigger: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
}))

vi.mock('lucide-react', () => ({
  Activity: () => <svg data-icon="activity" />,
  AlertTriangle: () => <svg data-icon="alert" />,
  CheckCircle: () => <svg data-icon="check" />,
  Clock: () => <svg data-icon="clock" />,
  Cpu: () => <svg data-icon="cpu" />,
  Database: () => <svg data-icon="database" />,
  Globe: () => <svg data-icon="globe" />,
  TrendingDown: () => <svg data-icon="trending-down" />,
  TrendingUp: () => <svg data-icon="trending-up" />,
  Zap: () => <svg data-icon="zap" />,
}))

describe('PerformanceDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render dashboard title', () => {
      ;(webVitalsMonitor.getMetrics as Mock).mockReturnValue({})
      ;(calculateWebVitalsScore as Mock).mockReturnValue(90)
      ;(customMetricsTracker.getMetrics as Mock).mockReturnValue({})
      ;(budgetManager.calculateBudgetReport as Mock).mockReturnValue({
        overallScore: 85,
        webVitalsScore: 90,
        customMetricsScore: 80,
        resourceScore: 85,
        status: 'pass',
        violations: [],
        recommendations: [],
      })
      ;(budgetManager.getActiveNotifications as Mock).mockReturnValue([])

      render(<PerformanceDashboard />)

      expect(screen.getByText('Performance Dashboard')).toBeInTheDocument()
      expect(
        screen.getByText('Real-time performance monitoring and analysis')
      ).toBeInTheDocument()
    })

    it('should render tabs', () => {
      ;(webVitalsMonitor.getMetrics as Mock).mockReturnValue({})
      ;(calculateWebVitalsScore as Mock).mockReturnValue(90)
      ;(customMetricsTracker.getMetrics as Mock).mockReturnValue({})
      ;(budgetManager.calculateBudgetReport as Mock).mockReturnValue({
        overallScore: 85,
        webVitalsScore: 90,
        customMetricsScore: 80,
        resourceScore: 85,
        status: 'pass',
        violations: [],
        recommendations: [],
      })
      ;(budgetManager.getActiveNotifications as Mock).mockReturnValue([])

      render(<PerformanceDashboard />)

      expect(screen.getAllByText('Web Vitals').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Custom Metrics').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Performance Budget').length).toBeGreaterThan(0)
    })
  })

  describe('Web Vitals Dashboard', () => {
    it('should display Web Vitals metrics', () => {
      const mockMetrics = {
        LCP: 2500,
        CLS: 0.1,
        INP: 200,
        FCP: 1800,
        TTFB: 800,
      }

      ;(webVitalsMonitor.getMetrics as Mock).mockReturnValue(mockMetrics)
      ;(calculateWebVitalsScore as Mock).mockReturnValue(90)
      ;(webVitalsMonitor.isMetricGood as Mock).mockReturnValue(true)

      render(<PerformanceDashboard />)

      expect(screen.getByText('LCP')).toBeInTheDocument()
      expect(screen.getByText('CLS')).toBeInTheDocument()
      expect(screen.getByText('INP')).toBeInTheDocument()
      expect(screen.getByText('FCP')).toBeInTheDocument()
      expect(screen.getByText('TTFB')).toBeInTheDocument()
    })

    it('should display overall score', () => {
      ;(webVitalsMonitor.getMetrics as Mock).mockReturnValue({
        LCP: 2500,
        CLS: 0.1,
        INP: 200,
      })
      ;(calculateWebVitalsScore as Mock).mockReturnValue(90)
      ;(customMetricsTracker.getMetrics as Mock).mockReturnValue({})
      ;(budgetManager.calculateBudgetReport as Mock).mockReturnValue({
        overallScore: 90,
        webVitalsScore: 90,
        customMetricsScore: 85,
        resourceScore: 90,
        status: 'pass',
        violations: [],
        recommendations: [],
      })
      ;(budgetManager.getActiveNotifications as Mock).mockReturnValue([])

      render(<PerformanceDashboard />)

      expect(screen.getAllByText(/90\/100/).length).toBeGreaterThan(0)
    })

    it('should display Good badge for good score', () => {
      ;(webVitalsMonitor.getMetrics as Mock).mockReturnValue({})
      ;(calculateWebVitalsScore as Mock).mockReturnValue(90)
      ;(customMetricsTracker.getMetrics as Mock).mockReturnValue({})
      ;(budgetManager.calculateBudgetReport as Mock).mockReturnValue({
        overallScore: 90,
        webVitalsScore: 90,
        customMetricsScore: 85,
        resourceScore: 90,
        status: 'pass',
        violations: [],
        recommendations: [],
      })
      ;(budgetManager.getActiveNotifications as Mock).mockReturnValue([])

      render(<PerformanceDashboard />)

      expect(screen.getByText('Good')).toBeInTheDocument()
    })
  })

  describe('Custom Metrics Dashboard', () => {
    it('should display custom metrics', () => {
      const mockMetrics = {
        pageLoadTime: 3000,
        domContentLoaded: 2000,
        apiAverageResponseTime: 500,
        apiSuccessRate: 0.95,
        memoryUsagePercent: 70,
        wsLatency: 50,
      }

      ;(webVitalsMonitor.getMetrics as Mock).mockReturnValue({})
      ;(customMetricsTracker.getMetrics as Mock).mockReturnValue(mockMetrics)
      ;(budgetManager.calculateBudgetReport as Mock).mockReturnValue({
        overallScore: 85,
        webVitalsScore: 85,
        customMetricsScore: 85,
        resourceScore: 85,
        status: 'pass',
        violations: [],
        recommendations: [],
      })
      ;(budgetManager.getActiveNotifications as Mock).mockReturnValue([])

      render(<PerformanceDashboard />)

      expect(screen.getByText('Page Load Time')).toBeInTheDocument()
      expect(screen.getByText('API Response Time')).toBeInTheDocument()
      expect(screen.getByText('Memory Usage')).toBeInTheDocument()
      expect(screen.getByText('WebSocket Latency')).toBeInTheDocument()
    })
  })

  describe('Performance Budget Dashboard', () => {
    it('should display performance budget report', () => {
      ;(webVitalsMonitor.getMetrics as Mock).mockReturnValue({})
      ;(customMetricsTracker.getMetrics as Mock).mockReturnValue({})
      ;(budgetManager.calculateBudgetReport as Mock).mockReturnValue({
        overallScore: 85,
        webVitalsScore: 90,
        customMetricsScore: 80,
        resourceScore: 85,
        status: 'pass',
        violations: [],
        recommendations: [],
      })
      ;(budgetManager.getActiveNotifications as Mock).mockReturnValue([])

      render(<PerformanceDashboard />)

      expect(screen.getByText('Web Vitals Score')).toBeInTheDocument()
      expect(screen.getByText('Custom Metrics Score')).toBeInTheDocument()
      expect(screen.getByText('Resource Score')).toBeInTheDocument()
    })

    it('should display budget violations', () => {
      ;(webVitalsMonitor.getMetrics as Mock).mockReturnValue({})
      ;(customMetricsTracker.getMetrics as Mock).mockReturnValue({})
      ;(budgetManager.calculateBudgetReport as Mock).mockReturnValue({
        overallScore: 60,
        webVitalsScore: 50,
        customMetricsScore: 70,
        resourceScore: 60,
        status: 'warning',
        violations: [
          {
            metric: 'LCP',
            currentValue: 4000,
            threshold: 2500,
            severity: 'high',
            impact: 'Affects perceived load speed',
          },
        ],
        recommendations: ['Optimize LCP'],
      })
      ;(budgetManager.getActiveNotifications as Mock).mockReturnValue([])

      render(<PerformanceDashboard />)

      expect(screen.getByText('Budget Violations')).toBeInTheDocument()
      expect(screen.getAllByText('LCP').length).toBeGreaterThan(0)
    })

    it('should display active alarms', () => {
      ;(webVitalsMonitor.getMetrics as Mock).mockReturnValue({})
      ;(customMetricsTracker.getMetrics as Mock).mockReturnValue({})
      ;(budgetManager.calculateBudgetReport as Mock).mockReturnValue({
        overallScore: 85,
        webVitalsScore: 85,
        customMetricsScore: 85,
        resourceScore: 85,
        status: 'pass',
        violations: [],
        recommendations: [],
      })
      ;(budgetManager.getActiveNotifications as Mock).mockReturnValue([
        {
          id: 'alarm-1',
          ruleId: 'lcp-exceeded',
          ruleName: 'LCP Exceeded',
          severity: 'high',
          metric: 'LCP',
          currentValue: 4000,
          threshold: 2500,
          condition: 'greater',
          message: 'LCP is high: 4000ms',
          timestamp: Date.now(),
          acknowledged: false,
          resolved: false,
        },
      ])

      render(<PerformanceDashboard />)

      expect(screen.getByText('Active Alarms')).toBeInTheDocument()
      expect(screen.getByText('LCP Exceeded')).toBeInTheDocument()
    })

    it('should display recommendations', () => {
      ;(webVitalsMonitor.getMetrics as Mock).mockReturnValue({})
      ;(customMetricsTracker.getMetrics as Mock).mockReturnValue({})
      ;(budgetManager.calculateBudgetReport as Mock).mockReturnValue({
        overallScore: 70,
        webVitalsScore: 70,
        customMetricsScore: 70,
        resourceScore: 70,
        status: 'warning',
        violations: [],
        recommendations: [
          'Optimize LCP',
          'Reduce memory usage',
          'Improve API response time',
        ],
      })
      ;(budgetManager.getActiveNotifications as Mock).mockReturnValue([])

      render(<PerformanceDashboard />)

      expect(screen.getByText('Recommendations')).toBeInTheDocument()
      expect(screen.getByText('Optimize LCP')).toBeInTheDocument()
      expect(screen.getByText('Reduce memory usage')).toBeInTheDocument()
    })
  })

  describe('Auto-update', () => {
    it('should update metrics periodically', async () => {
      let callCount = 0
      ;(webVitalsMonitor.getMetrics as Mock).mockImplementation(() => {
        callCount++
        return {}
      })
      ;(customMetricsTracker.getMetrics as Mock).mockReturnValue({})
      ;(budgetManager.calculateBudgetReport as Mock).mockReturnValue({
        overallScore: 85,
        webVitalsScore: 85,
        customMetricsScore: 85,
        resourceScore: 85,
        status: 'pass',
        violations: [],
        recommendations: [],
      })
      ;(budgetManager.getActiveNotifications as Mock).mockReturnValue([])

      render(<PerformanceDashboard />)

      const initialCount = callCount

      // Wait for auto-update
      await waitFor(
        () => {
          expect(callCount).toBeGreaterThan(initialCount)
        },
        { timeout: 10000 }
      )
    })
  })
})
