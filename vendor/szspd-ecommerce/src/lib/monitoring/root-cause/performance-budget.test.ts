// @ts-nocheck
/**
 * Performance Budget Controller Tests
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  PerformanceBudgetController,
  DEFAULT_BUDGET_THRESHOLDS,
  createMockPerformanceMetrics,
  type BudgetThreshold,
} from './performance-budget'

describe('PerformanceBudgetController', () => {
  let controller: PerformanceBudgetController

  beforeEach(() => {
    controller = new PerformanceBudgetController()
  })

  describe('checkBudgets', () => {
    it('should return compliant report for healthy metrics', () => {
      const metrics = createMockPerformanceMetrics({
        FCP: 1200,
        LCP: 2000,
        CLS: 0.05,
        INP: 100,
        totalTransferSize: 500 * 1024,
        scriptSize: 200 * 1024,
        cssSize: 50 * 1024,
        imageSize: 250 * 1024,
        requestCount: 25,
        thirdPartyRequestCount: 10,
        domContentLoaded: 1500,
        windowLoad: 2500,
        memoryUsage: 80 * 1024 * 1024,
        memoryUsageRatio: 0.6,
        domNodeCount: 1200,
        domDepth: 20,
      })

      const report = controller.checkBudgets(metrics)

      expect(report).toBeDefined()
      expect(report.complianceStatus).toBe('compliant')
      expect(report.overallScore).toBe(100)
      expect(report.violations).toHaveLength(0)
      expect(report.warnings).toHaveLength(0)
      expect(report.errors).toHaveLength(0)
      expect(report.passedMetrics.length).toBeGreaterThan(0)
      expect(report.summary).toContain('within acceptable limits')
    })

    it('should detect FCP violation', () => {
      const metrics = createMockPerformanceMetrics({
        FCP: 2500, // Exceeds 1800ms threshold
      })

      const report = controller.checkBudgets(metrics)

      expect(report.complianceStatus).toBe('violated')
      const fcpViolation = report.violations.find(v => v.metric === 'FCP')
      expect(fcpViolation).toBeDefined()
      expect(fcpViolation?.severity).toBe('error')
      expect(fcpViolation?.actualValue).toBe(2500)
      expect(fcpViolation?.threshold).toBe(1800)
      expect(fcpViolation?.deviation).toBeGreaterThan(0)
    })

    it('should detect LCP violation', () => {
      const metrics = createMockPerformanceMetrics({
        LCP: 3500, // Exceeds 2500ms threshold
      })

      const report = controller.checkBudgets(metrics)

      const lcpViolation = report.violations.find(v => v.metric === 'LCP')
      expect(lcpViolation).toBeDefined()
      expect(lcpViolation?.severity).toBe('error')
    })

    it('should detect CLS violation', () => {
      const metrics = createMockPerformanceMetrics({
        CLS: 0.2, // Exceeds 0.1 threshold
      })

      const report = controller.checkBudgets(metrics)

      const clsViolation = report.violations.find(v => v.metric === 'CLS')
      expect(clsViolation).toBeDefined()
      expect(clsViolation?.severity).toBe('error')
    })

    it('should detect INP violation', () => {
      const metrics = createMockPerformanceMetrics({
        INP: 300, // Exceeds 200ms threshold
      })

      const report = controller.checkBudgets(metrics)

      const inpViolation = report.violations.find(v => v.metric === 'INP')
      expect(inpViolation).toBeDefined()
      expect(inpViolation?.severity).toBe('error')
    })

    it('should detect TTFB violation', () => {
      const metrics = createMockPerformanceMetrics({
        TTFB: 1200, // Exceeds 800ms threshold
      })

      const report = controller.checkBudgets(metrics)

      const ttfbViolation = report.violations.find(v => v.metric === 'TTFB')
      expect(ttfbViolation).toBeDefined()
      expect(ttfbViolation?.severity).toBe('error')
    })

    it('should detect totalTransferSize violation', () => {
      const metrics = createMockPerformanceMetrics({
        totalTransferSize: 2 * 1024 * 1024, // 2MB, exceeds 1MB
      })

      const report = controller.checkBudgets(metrics)

      const transferViolation = report.violations.find(v => v.metric === 'totalTransferSize')
      expect(transferViolation).toBeDefined()
      expect(transferViolation?.severity).toBe('error')
    })

    it('should detect scriptSize violation', () => {
      const metrics = createMockPerformanceMetrics({
        scriptSize: 400 * 1024, // 400KB, exceeds 300KB
      })

      const report = controller.checkBudgets(metrics)

      const scriptViolation = report.violations.find(v => v.metric === 'scriptSize')
      expect(scriptViolation).toBeDefined()
      expect(scriptViolation?.severity).toBe('error')
    })

    it('should detect imageSize violation', () => {
      const metrics = createMockPerformanceMetrics({
        imageSize: 600 * 1024, // 600KB, exceeds 500KB
      })

      const report = controller.checkBudgets(metrics)

      const imageViolation = report.violations.find(v => v.metric === 'imageSize')
      expect(imageViolation).toBeDefined()
      expect(imageViolation?.severity).toBe('error')
    })

    it('should detect thirdPartyRequestCount violation', () => {
      const metrics = createMockPerformanceMetrics({
        thirdPartyRequestCount: 25, // Exceeds 20
      })

      const report = controller.checkBudgets(metrics)

      const thirdPartyViolation = report.violations.find(v => v.metric === 'thirdPartyRequestCount')
      expect(thirdPartyViolation).toBeDefined()
      expect(thirdPartyViolation?.severity).toBe('error')
    })

    it('should detect memoryUsageRatio violation', () => {
      const metrics = createMockPerformanceMetrics({
        memoryUsageRatio: 0.8, // Exceeds 0.7
      })

      const report = controller.checkBudgets(metrics)

      const memoryViolation = report.violations.find(v => v.metric === 'memoryUsageRatio')
      expect(memoryViolation).toBeDefined()
      expect(memoryViolation?.severity).toBe('error')
    })

    it('should detect warning for TBT', () => {
      const metrics = createMockPerformanceMetrics({
        TBT: 300, // Exceeds 200ms warning threshold
      })

      const report = controller.checkBudgets(metrics)

      const tbtViolation = report.violations.find(v => v.metric === 'TBT')
      expect(tbtViolation).toBeDefined()
      expect(tbtViolation?.severity).toBe('warning')
      expect(report.warnings).toContain(tbtViolation)
    })

    it('should detect warning for TTI', () => {
      const metrics = createMockPerformanceMetrics({
        TTI: 4500, // Exceeds 3800ms warning threshold
      })

      const report = controller.checkBudgets(metrics)

      const ttiViolation = report.violations.find(v => v.metric === 'TTI')
      expect(ttiViolation).toBeDefined()
      expect(ttiViolation?.severity).toBe('warning')
    })

    it('should detect warning for documentSize', () => {
      const metrics = createMockPerformanceMetrics({
        documentSize: 70 * 1024, // 70KB, exceeds 50KB
      })

      const report = controller.checkBudgets(metrics)

      const docViolation = report.violations.find(v => v.metric === 'documentSize')
      expect(docViolation).toBeDefined()
      expect(docViolation?.severity).toBe('warning')
    })

    it('should detect warning for cssSize', () => {
      const metrics = createMockPerformanceMetrics({
        cssSize: 120 * 1024, // 120KB, exceeds 100KB
      })

      const report = controller.checkBudgets(metrics)

      const cssViolation = report.violations.find(v => v.metric === 'cssSize')
      expect(cssViolation).toBeDefined()
      expect(cssViolation?.severity).toBe('warning')
    })

    it('should detect warning for requestCount', () => {
      const metrics = createMockPerformanceMetrics({
        requestCount: 60, // Exceeds 50
      })

      const report = controller.checkBudgets(metrics)

      const requestViolation = report.violations.find(v => v.metric === 'requestCount')
      expect(requestViolation).toBeDefined()
      expect(requestViolation?.severity).toBe('warning')
    })

    it('should detect warning for domContentLoaded', () => {
      const metrics = createMockPerformanceMetrics({
        domContentLoaded: 2500, // Exceeds 2000ms
      })

      const report = controller.checkBudgets(metrics)

      const dclViolation = report.violations.find(v => v.metric === 'domContentLoaded')
      expect(dclViolation).toBeDefined()
      expect(dclViolation?.severity).toBe('warning')
    })

    it('should detect warning for windowLoad', () => {
      const metrics = createMockPerformanceMetrics({
        windowLoad: 3500, // Exceeds 3000ms
      })

      const report = controller.checkBudgets(metrics)

      const loadViolation = report.violations.find(v => v.metric === 'windowLoad')
      expect(loadViolation).toBeDefined()
      expect(loadViolation?.severity).toBe('warning')
    })

    it('should detect warning for memoryUsage', () => {
      const metrics = createMockPerformanceMetrics({
        memoryUsage: 120 * 1024 * 1024, // 120MB, exceeds 100MB
      })

      const report = controller.checkBudgets(metrics)

      const memoryViolation = report.violations.find(v => v.metric === 'memoryUsage')
      expect(memoryViolation).toBeDefined()
      expect(memoryViolation?.severity).toBe('warning')
    })

    it('should detect warning for domNodeCount', () => {
      const metrics = createMockPerformanceMetrics({
        domNodeCount: 2000, // Exceeds 1500
      })

      const report = controller.checkBudgets(metrics)

      const domViolation = report.violations.find(v => v.metric === 'domNodeCount')
      expect(domViolation).toBeDefined()
      expect(domViolation?.severity).toBe('warning')
    })

    it('should detect warning for domDepth', () => {
      const metrics = createMockPerformanceMetrics({
        domDepth: 40, // Exceeds 32
      })

      const report = controller.checkBudgets(metrics)

      const depthViolation = report.violations.find(v => v.metric === 'domDepth')
      expect(depthViolation).toBeDefined()
      expect(depthViolation?.severity).toBe('warning')
    })

    it('should calculate overall score correctly', () => {
      const metrics = createMockPerformanceMetrics({
        FCP: 3500, // Error - ~94% over
        LCP: 2000,
        CLS: 0.05,
        INP: 100,
      })

      const report = controller.checkBudgets(metrics)
      expect(report.overallScore).toBeGreaterThanOrEqual(0)
      expect(report.overallScore).toBeLessThanOrEqual(100)
      expect(report.overallScore).toBeLessThan(100) // Should be reduced due to FCP violation
    })

    it('should determine warning status for warning violations', () => {
      const metrics = createMockPerformanceMetrics({
        TBT: 300, // Warning
      })

      const report = controller.checkBudgets(metrics)
      expect(report.complianceStatus).toBe('warning')
    })

    it('should generate summary text', () => {
      const metrics = createMockPerformanceMetrics({
        FCP: 3500,
      })

      const report = controller.checkBudgets(metrics)
      expect(report.summary).toBeTruthy()
      expect(report.summary.toLowerCase()).toContain('violation')
    })

    it('should generate recommendations for violations', () => {
      const metrics = createMockPerformanceMetrics({
        FCP: 3500,
        LCP: 2000,
        CLS: 0.05,
        INP: 100,
      })

      const report = controller.checkBudgets(metrics)
      expect(report.recommendations.length).toBeGreaterThan(0)
      expect(report.recommendations.length).toBeLessThanOrEqual(10)
    })

    it('should store report in history', () => {
      const metrics = createMockPerformanceMetrics()
      controller.checkBudgets(metrics)

      const history = controller.getHistory()
      expect(history.length).toBe(1)
      expect(history[0].timestamp).toBeInstanceOf(Date)
      expect(history[0].score).toBe(100)
    })

    it('should include URL in report if provided', () => {
      const url = 'https://example.com'
      const metrics = createMockPerformanceMetrics()

      const report = controller.checkBudgets(metrics, url)
      expect(report.url).toBe(url)

      const history = controller.getHistory()
      expect(history[0].url).toBe(url)
    })
  })

  describe('threshold management', () => {
    it('should return default thresholds', () => {
      const thresholds = controller.getThresholds()
      expect(thresholds).toHaveLength(DEFAULT_BUDGET_THRESHOLDS.length)
      expect(thresholds[0]).toEqual(DEFAULT_BUDGET_THRESHOLDS[0])
    })

    it('should set new thresholds', () => {
      const newThresholds: BudgetThreshold[] = [
        {
          metric: 'CUSTOM_METRIC',
          threshold: 100,
          unit: 'ms',
          comparison: 'lte',
          severity: 'error',
          category: 'custom',
          description: 'Custom metric',
        },
      ]

      controller.setThresholds(newThresholds)
      const thresholds = controller.getThresholds()
      expect(thresholds).toEqual(newThresholds)
    })

    it('should add a new threshold', () => {
      const newThreshold: BudgetThreshold = {
        metric: 'CUSTOM_METRIC',
        threshold: 100,
        unit: 'ms',
        comparison: 'lte',
        severity: 'error',
        category: 'custom',
        description: 'Custom metric',
      }

      controller.setThreshold(newThreshold)
      const thresholds = controller.getThresholds()
      expect(thresholds.some(t => t.metric === 'CUSTOM_METRIC')).toBe(true)
    })

    it('should update an existing threshold', () => {
      const updatedThreshold: BudgetThreshold = {
        metric: 'FCP',
        threshold: 2000,
        unit: 'ms',
        comparison: 'lte',
        severity: 'error',
        category: 'web-vitals',
        description: 'Updated FCP threshold',
      }

      controller.setThreshold(updatedThreshold)
      const thresholds = controller.getThresholds()
      const fcpThreshold = thresholds.find(t => t.metric === 'FCP')
      expect(fcpThreshold?.threshold).toBe(2000)
      expect(fcpThreshold?.description).toBe('Updated FCP threshold')
    })

    it('should remove a threshold', () => {
      controller.removeThreshold('FCP')
      const thresholds = controller.getThresholds()
      expect(thresholds.some(t => t.metric === 'FCP')).toBe(false)
    })
  })

  describe('alert management', () => {
    it('should create alerts for violations', () => {
      const metrics = createMockPerformanceMetrics({
        FCP: 3500,
      })

      controller.checkBudgets(metrics)
      const alerts = controller.getAlerts()

      expect(alerts.length).toBeGreaterThan(0)
      expect(alerts[0].violation.metric).toBe('FCP')
      expect(alerts[0].suppressed).toBe(false)
      expect(alerts[0].alertSent).toBe(false)
    })

    it('should not create duplicate alerts', () => {
      const metrics = createMockPerformanceMetrics({
        FCP: 3500,
      })

      controller.checkBudgets(metrics)
      controller.checkBudgets(metrics) // Same violation

      const alerts = controller.getAlerts()
      const fcpAlerts = alerts.filter(a => a.violation.metric === 'FCP')
      expect(fcpAlerts.length).toBe(1)
    })

    it('should suppress an alert', () => {
      const metrics = createMockPerformanceMetrics({
        FCP: 3500,
      })

      controller.checkBudgets(metrics)
      const suppressed = controller.suppressAlert('FCP')

      expect(suppressed).toBe(true)
      const alerts = controller.getAlerts()
      expect(alerts[0].suppressed).toBe(true)
      expect(alerts[0].suppressionReason).toBeUndefined()
    })

    it('should suppress an alert with reason', () => {
      const metrics = createMockPerformanceMetrics({
        FCP: 3500,
      })

      controller.checkBudgets(metrics)
      controller.suppressAlert('FCP', 'Known issue, will fix later')

      const alerts = controller.getAlerts()
      expect(alerts[0].suppressionReason).toBe('Known issue, will fix later')
    })

    it('should unsuppress an alert', () => {
      const metrics = createMockPerformanceMetrics({
        FCP: 3500,
      })

      controller.checkBudgets(metrics)
      controller.suppressAlert('FCP')
      const unsuppressed = controller.unsuppressAlert('FCP')

      expect(unsuppressed).toBe(true)
      const alerts = controller.getAlerts()
      expect(alerts[0].suppressed).toBe(false)
    })

    it('should clear alerts', () => {
      const metrics = createMockPerformanceMetrics({
        FCP: 3500,
        LCP: 4500,
      })

      controller.checkBudgets(metrics)
      controller.clearAlerts()

      const alerts = controller.getAlerts()
      expect(alerts).toHaveLength(0)
    })

    it('should get violated metrics', () => {
      const metrics = createMockPerformanceMetrics({
        FCP: 3500,
        LCP: 2000,
        TBT: 300, // Warning
      })

      controller.checkBudgets(metrics)
      const violatedMetrics = controller.getViolatedMetrics()

      expect(violatedMetrics).toContain('FCP')
      expect(violatedMetrics).not.toContain('TBT')
    })

    it('should get warning metrics', () => {
      const metrics = createMockPerformanceMetrics({
        FCP: 2000,
        TBT: 300, // Warning
      })

      controller.checkBudgets(metrics)
      const warningMetrics = controller.getWarningMetrics()

      expect(warningMetrics).toContain('TBT')
      expect(warningMetrics).not.toContain('FCP')
    })
  })

  describe('history management', () => {
    it('should store multiple reports in history', () => {
      const metrics = createMockPerformanceMetrics()

      controller.checkBudgets(metrics)
      controller.checkBudgets(metrics)
      controller.checkBudgets(metrics)

      const history = controller.getHistory()
      expect(history.length).toBe(3)
    })

    it('should limit history length', () => {
      const metrics = createMockPerformanceMetrics()

      // Add more than max history length
      for (let i = 0; i < 150; i++) {
        controller.checkBudgets(metrics)
      }

      const history = controller.getHistory()
      expect(history.length).toBeLessThanOrEqual(100)
    })

    it('should clear history', () => {
      const metrics = createMockPerformanceMetrics()
      controller.checkBudgets(metrics)

      controller.clearHistory()
      const history = controller.getHistory()

      expect(history).toHaveLength(0)
    })

    it('should get performance trend', () => {
      const metrics = createMockPerformanceMetrics()

      controller.checkBudgets(metrics)
      controller.checkBudgets(metrics)

      const trend = controller.getPerformanceTrend(24)
      expect(trend.length).toBe(2)
      expect(trend[0].timestamp).toBeInstanceOf(Date)
      expect(trend[0].score).toBe(100)
      expect(trend[0].status).toBe('compliant')
    })
  })

  describe('compliance report by URL', () => {
    it('should return null for URL without history', () => {
      const report = controller.getComplianceReportByUrl('https://example.com')
      expect(report).toBeNull()
    })

    it('should return compliance report for URL with history', () => {
      const url = 'https://example.com'
      const metrics = createMockPerformanceMetrics()

      controller.checkBudgets(metrics, url)

      const report = controller.getComplianceReportByUrl(url)
      expect(report).toBeDefined()
      expect(report?.url).toBe(url)
      expect(report?.overallScore).toBe(100)
    })

    it('should filter by date range', () => {
      const url = 'https://example.com'
      const metrics = createMockPerformanceMetrics()

      controller.checkBudgets(metrics, url)

      const startDate = new Date(Date.now() - 30000) // 30 seconds ago
      const endDate = new Date()

      const report = controller.getComplianceReportByUrl(url, startDate, endDate)
      expect(report).toBeDefined()
    })

    it('should calculate average score correctly', () => {
      const url = 'https://example.com'

      // Mix of good and bad metrics
      controller.checkBudgets(createMockPerformanceMetrics(), url)
      controller.checkBudgets(createMockPerformanceMetrics({ FCP: 3500 }), url)

      const report = controller.getComplianceReportByUrl(url)
      expect(report?.overallScore).toBeGreaterThan(50)
      expect(report?.overallScore).toBeLessThan(100)
    })
  })

  describe('reset', () => {
    it('should reset to default thresholds', () => {
      const customThreshold: BudgetThreshold = {
        metric: 'CUSTOM',
        threshold: 100,
        unit: 'ms',
        comparison: 'lte',
        severity: 'error',
        category: 'custom',
        description: 'Custom',
      }

      controller.setThreshold(customThreshold)
      controller.checkBudgets(createMockPerformanceMetrics())

      controller.reset()

      const thresholds = controller.getThresholds()
      expect(thresholds).toEqual(DEFAULT_BUDGET_THRESHOLDS)
      expect(controller.getAlerts()).toHaveLength(0)
      expect(controller.getHistory()).toHaveLength(0)
    })
  })

  describe('mock utilities', () => {
    it('should create mock performance metrics', () => {
      const metrics = createMockPerformanceMetrics({
        FCP: 1500,
        LCP: 2500,
      })

      expect(metrics).toBeDefined()
      expect(metrics.FCP).toBe(1500)
      expect(metrics.LCP).toBe(2500)
      expect(metrics.CLS).toBe(0.05) // Default
      expect(metrics.INP).toBe(100) // Default
      expect(metrics.totalTransferSize).toBeDefined()
      expect(metrics.requestCount).toBeDefined()
    })

    it('should override all default values', () => {
      const metrics = createMockPerformanceMetrics({
        FCP: 1000,
        LCP: 1500,
        CLS: 0.02,
        FID: 30,
        INP: 80,
        TTFB: 500,
        TBT: 100,
        TTI: 2000,
        totalTransferSize: 300 * 1024,
        documentSize: 20 * 1024,
        scriptSize: 100 * 1024,
        cssSize: 30 * 1024,
        imageSize: 100 * 1024,
        requestCount: 15,
        thirdPartyRequestCount: 5,
        domContentLoaded: 1000,
        windowLoad: 1500,
        memoryUsage: 50 * 1024 * 1024,
        memoryUsageRatio: 0.5,
        domNodeCount: 800,
        domDepth: 15,
      })

      expect(metrics.FCP).toBe(1000)
      expect(metrics.memoryUsageRatio).toBe(0.5)
      expect(metrics.domDepth).toBe(15)
    })
  })
})
