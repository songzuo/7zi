/**
 * Performance Dashboard Tests
 * 性能仪表板组件测试
 */

import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { PerformanceDashboard } from './PerformanceDashboard'
import { webVitalsMonitor, customMetricsTracker, budgetManager } from '@/lib/performance'

// Mock performance modules
jest.mock('@/lib/performance/web-vitals', () => ({
  webVitalsMonitor: {
    getMetrics: jest.fn(),
    isMetricGood: jest.fn(),
  },
  calculateWebVitalsScore: jest.fn(),
}))

jest.mock('@/lib/performance/custom-metrics', () => ({
  customMetricsTracker: {
    getMetrics: jest.fn(),
  },
}))

jest.mock('@/lib/performance/budget-manager', () => ({
  budgetManager: {
    calculateBudgetReport: jest.fn(),
    getActiveNotifications: jest.fn(),
  },
}))

// Mock UI components
jest.mock('@/components/ui/Card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

jest.mock('@/components/ui/Badge', () => ({
  Badge: ({ children, variant }: { children: React.ReactNode; variant?: string }) => (
    <span data-variant={variant}>{children}</span>
  ),
}))

jest.mock('@/components/ui/Progress', () => ({
  Progress: ({ value }: { value: number }) => <div data-value={value} />,
}))

jest.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsList: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsTrigger: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
}))

jest.mock('lucide-react', () => ({
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
    jest.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render dashboard title', () => {
      ;(webVitalsMonitor.getMetrics as jest.Mock).mockReturnValue({})
      ;(customMetricsTracker.getMetrics as jest.Mock).mockReturnValue({})
      ;(budgetManager.calculateBudgetReport as jest.Mock).mockReturnValue({
        overallScore: 85,
        webVitalsScore: 90,
        customMetricsScore: 80,
        resourceScore: 85,
        status: 'pass',
        violations: [],
        recommendations: [],
      })
      ;(budgetManager.getActiveNotifications as jest.Mock).mockReturnValue([])

      render(<PerformanceDashboard />)

      expect(screen.getByText('Performance Dashboard')).toBeInTheDocument()
      expect(
        screen.getByText('Real-time performance monitoring and analysis')
      ).toBeInTheDocument()
    })

    it('should render tabs', () => {
      ;(webVitalsMonitor.getMetrics as jest.Mock).mockReturnValue({})
      ;(customMetricsTracker.getMetrics as jest.Mock).mockReturnValue({})
      ;(budgetManager.calculateBudgetReport as jest.Mock).mockReturnValue({
        overallScore: 85,
        webVitalsScore: 90,
        customMetricsScore: 80,
        resourceScore: 85,
        status: 'pass',
        violations: [],
        recommendations: [],
      })
      ;(budgetManager.getActiveNotifications as jest.Mock).mockReturnValue([])

      render(<PerformanceDashboard />)

      expect(screen.getByText('Web Vitals')).toBeInTheDocument()
      expect(screen.getByText('Custom Metrics')).toBeInTheDocument()
      expect(screen.getByText('Performance Budget')).toBeInTheDocument()
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

      ;(webVitalsMonitor.getMetrics as jest.Mock).mockReturnValue(mockMetrics)
      ;(calculateWebVitalsScore as jest.Mock).mockReturnValue(90)
      ;(webVitalsMonitor.isMetricGood as jest.Mock).mockReturnValue(true)

      render(<PerformanceDashboard />)

      expect(screen.getByText('LCP')).toBeInTheDocument()
      expect(screen.getByText('CLS')).toBeInTheDocument()
      expect(screen.getByText('INP')).toBeInTheDocument()
      expect(screen.getByText('FCP')).toBeInTheDocument()
      expect(screen.getByText('TTFB')).toBeInTheDocument()
    })

    it('should display overall score', () => {
      ;(webVitalsMonitor.getMetrics as jest.Mock).mockReturnValue({
        LCP: 2500,
        CLS: 0.1,
        INP: 200,
      })
      ;(calculateWebVitalsScore as jest.Mock).mockReturnValue(90)
      ;(customMetricsTracker.getMetrics as jest.Mock).mockReturnValue({})
      ;(budgetManager.calculateBudgetReport as jest.Mock).mockReturnValue({
        overallScore: 90,
        webVitalsScore: 90,
        customMetricsScore: 85,
        resourceScore: 90,
        status: 'pass',
        violations: [],
        recommendations: [],
      })
      ;(budgetManager.getActiveNotifications as jest.Mock).mockReturnValue([])

      render(<PerformanceDashboard />)

      expect(screen.getByText(/90\/100/)).toBeInTheDocument()
    })

    it('should display Good badge for good score', () => {
      ;(webVitalsMonitor.getMetrics as jest.Mock).mockReturnValue({})
      ;(calculateWebVitalsScore as jest.Mock).mockReturnValue(90)
      ;(customMetricsTracker.getMetrics as jest.Mock).mockReturnValue({})
      ;(budgetManager.calculateBudgetReport as jest.Mock).mockReturnValue({
        overallScore: 90,
        webVitalsScore: 90,
        customMetricsScore: 85,
        resourceScore: 90,
        status: 'pass',
        violations: [],
        recommendations: [],
      })
      ;(budgetManager.getActiveNotifications as jest.Mock).mockReturnValue([])

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

      ;(webVitalsMonitor.getMetrics as jest.Mock).mockReturnValue({})
      ;(customMetricsTracker.getMetrics as jest.Mock).mockReturnValue(mockMetrics)
      ;(budgetManager.calculateBudgetReport as jest.Mock).mockReturnValue({
        overallScore: 85,
        webVitalsScore: 85,
        customMetricsScore: 85,
        resourceScore: 85,
        status: 'pass',
        violations: [],
        recommendations: [],
      })
      ;(budgetManager.getActiveNotifications as jest.Mock).mockReturnValue([])

      render(<PerformanceDashboard />)

      expect(screen.getByText('Page Load Time')).toBeInTheDocument()
      expect(screen.getByText('API Response Time')).toBeInTheDocument()
      expect(screen.getByText('Memory Usage')).toBeInTheDocument()
      expect(screen.getByText('WebSocket Latency')).toBeInTheDocument()
    })
  })

  describe('Performance Budget Dashboard', () => {
    it('should display performance budget report', () => {
      ;(webVitalsMonitor.getMetrics as jest.Mock).mockReturnValue({})
      ;(customMetricsTracker.getMetrics as jest.Mock).mockReturnValue({})
      ;(budgetManager.calculateBudgetReport as jest.Mock).mockReturnValue({
        overallScore: 85,
        webVitalsScore: 90,
        customMetricsScore: 80,
        resourceScore: 85,
        status: 'pass',
        violations: [],
        recommendations: [],
      })
      ;(budgetManager.getActiveNotifications as jest.Mock).mockReturnValue([])

      render(<PerformanceDashboard />)

      expect(screen.getByText('Web Vitals Score')).toBeInTheDocument()
      expect(screen.getByText('Custom Metrics Score')).toBeInTheDocument()
      expect(screen.getByText('Resource Score')).toBeInTheDocument()
    })

    it('should display budget violations', () => {
      ;(webVitalsMonitor.getMetrics as jest.Mock).mockReturnValue({})
      ;(customMetricsTracker.getMetrics as jest.Mock).mockReturnValue({})
      ;(budgetManager.calculateBudgetReport as jest.Mock).mockReturnValue({
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
      ;(budgetManager.getActiveNotifications as jest.Mock).mockReturnValue([])

      render(<PerformanceDashboard />)

      expect(screen.getByText('Budget Violations')).toBeInTheDocument()
      expect(screen.getByText('LCP')).toBeInTheDocument()
    })

    it('should display active alarms', () => {
      ;(webVitalsMonitor.getMetrics as jest.Mock).mockReturnValue({})
      ;(customMetricsTracker.getMetrics as jest.Mock).mockReturnValue({})
      ;(budgetManager.calculateBudgetReport as jest.Mock).mockReturnValue({
        overallScore: 85,
        webVitalsScore: 85,
        customMetricsScore: 85,
        resourceScore: 85,
        status: 'pass',
        violations: [],
        recommendations: [],
      })
      ;(budgetManager.getActiveNotifications as jest.Mock).mockReturnValue([
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
      ;(webVitalsMonitor.getMetrics as jest.Mock).mockReturnValue({})
      ;(customMetricsTracker.getMetrics as jest.Mock).mockReturnValue({})
      ;(budgetManager.calculateBudgetReport as jest.Mock).mockReturnValue({
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
      ;(budgetManager.getActiveNotifications as jest.Mock).mockReturnValue([])

      render(<PerformanceDashboard />)

      expect(screen.getByText('Recommendations')).toBeInTheDocument()
      expect(screen.getByText('Optimize LCP')).toBeInTheDocument()
      expect(screen.getByText('Reduce memory usage')).toBeInTheDocument()
    })
  })

  describe('Auto-update', () => {
    it('should update metrics periodically', async () => {
      let callCount = 0
      ;(webVitalsMonitor.getMetrics as jest.Mock).mockImplementation(() => {
        callCount++
        return {}
      })
      ;(customMetricsTracker.getMetrics as jest.Mock).mockReturnValue({})
      ;(budgetManager.calculateBudgetReport as jest.Mock).mockReturnValue({
        overallScore: 85,
        webVitalsScore: 85,
        customMetricsScore: 85,
        resourceScore: 85,
        status: 'pass',
        violations: [],
        recommendations: [],
      })
      ;(budgetManager.getActiveNotifications as jest.Mock).mockReturnValue([])

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
