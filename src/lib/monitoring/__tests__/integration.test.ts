/**
 * Integration Tests for Performance Monitoring System
 * Tests integration between metrics collector, root cause analyzer, budget controller, and alert manager
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { RootCauseAnalyzer } from '../root-cause'
import { BudgetController } from '../budget-controller'
import { AlertManager } from '../alert-manager'
import { AlertSystem } from '../alerts'

describe('Performance Monitoring System Integration', () => {
  let rootCauseAnalyzer: RootCauseAnalyzer
  let budgetController: BudgetController
  let alertManager: AlertManager
  let alertSystem: AlertSystem

  beforeEach(() => {
    alertSystem = new AlertSystem({})
    rootCauseAnalyzer = new RootCauseAnalyzer()
    budgetController = new BudgetController({ alertSystem })
    alertManager = new AlertManager(alertSystem)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('end-to-end workflow', () => {
    it('should process performance metrics through all modules', () => {
      // Simulate performance metrics
      const metrics = {
        LCP: 4500,
        FID: 200,
        CLS: 0.15,
        totalTransferSize: 2 * 1024 * 1024,
        requestCount: 80,
        memoryUsage: 75,
      }

      // 1. Root cause analysis
      const profile = {
        totalTransferSize: metrics.totalTransferSize as number,
        requestCount: metrics.requestCount as number,
        slowRequests: 5,
        averageResponseTime: 800,
        firstContentfulPaint: 2500,
        largestContentfulPaint: metrics.LCP as number,
        firstInputDelay: metrics.FID as number,
        cumulativeLayoutShift: metrics.CLS as number,
        timeToInteractive: 4000,
        scriptExecutionTime: 80,
        blockingScriptTime: 150,
        scriptErrors: 2,
        domNodes: 1500,
        domDepth: 20,
        iframeCount: 2,
        memoryUsed: ((metrics.memoryUsage as number) / 100) * 100 * 1024 * 1024,
        memoryLimit: 100 * 1024 * 1024,
      }

      const rootCauseResult = rootCauseAnalyzer.analyze(profile)

      expect(rootCauseResult.overallHealth).toBeDefined()
      expect(rootCauseResult.indicators.length).toBeGreaterThan(0)
      expect(rootCauseResult.actionPlan.length).toBeGreaterThan(0)

      // 2. Budget checking
      const budgetResults = budgetController.checkMetrics(metrics)

      expect(budgetResults.length).toBeGreaterThan(0)
      const failedBudgets = budgetResults.filter(r => !r.passed)
      expect(failedBudgets.length).toBeGreaterThan(0)

      // 3. Alert evaluation
      const alertResults = alertManager.evaluate(metrics)

      expect(alertResults.length).toBeGreaterThan(0)
    })

    it('should generate comprehensive report from all modules', () => {
      const metrics = {
        LCP: 3500,
        FID: 150,
        CLS: 0.2,
      }

      // Get results from all modules
      const profile = {
        totalTransferSize: 1024 * 1024,
        requestCount: 50,
        slowRequests: 3,
        averageResponseTime: 600,
        firstContentfulPaint: 2000,
        largestContentfulPaint: metrics.LCP as number,
        firstInputDelay: metrics.FID as number,
        cumulativeLayoutShift: metrics.CLS as number,
        timeToInteractive: 3500,
        scriptExecutionTime: 60,
        blockingScriptTime: 100,
        scriptErrors: 1,
        domNodes: 1200,
        domDepth: 15,
        iframeCount: 1,
        memoryUsed: 60 * 1024 * 1024,
        memoryLimit: 100 * 1024 * 1024,
      }

      const rootCauseResult = rootCauseAnalyzer.analyze(profile)
      const budgetResults = budgetController.checkMetrics(metrics)
      const budgetReport = budgetController.generateReport(metrics)
      const alertResults = alertManager.evaluate(metrics)
      const alertStats = alertManager.getStats()

      // Generate comprehensive report
      const report = {
        timestamp: new Date(),
        overallHealth: rootCauseResult.overallHealth,
        budgetStatus: {
          score: budgetReport.summary.score,
          passRate: budgetReport.passRate,
          criticalViolations: budgetReport.criticalChecks,
        },
        alertStatus: {
          totalAlerts: alertStats.totalAlerts,
          activeAlerts: alertStats.activeAlerts,
          byLevel: alertStats.byLevel,
        },
        issues: rootCauseResult.indicators.map(i => ({
          type: i.type,
          severity: 'severity' in i ? i.severity : 'unknown',
          name: 'name' in i ? i.name : i.type,
        })),
        recommendations: rootCauseResult.actionPlan.map(a => ({
          priority: a.priority,
          title: a.title,
          effort: a.effort,
          impact: a.estimatedImpact,
        })),
      }

      expect(report).toBeDefined()
      expect(report.overallHealth).toBeDefined()
      expect(report.budgetStatus.score).toBeGreaterThanOrEqual(0)
      expect(report.budgetStatus.score).toBeLessThanOrEqual(100)
      expect(report.issues).toBeInstanceOf(Array)
      expect(report.recommendations).toBeInstanceOf(Array)
    })
  })

  describe('data flow between modules', () => {
    it('should share metrics data between modules', () => {
      const metrics = {
        LCP: 4500, // > 4000 to trigger critical
        FID: 250,
        CLS: 0.3,
      }

      // Budget controller should detect violations
      const budgetResults = budgetController.checkMetrics(metrics)
      expect(budgetResults.some(r => !r.passed && r.rule.metric === 'LCP')).toBe(true)

      // Alert manager should trigger alerts
      const alertResults = alertManager.evaluate(metrics)
      expect(alertResults.some(a => a.ruleId === 'lcp-critical')).toBe(true)
      expect(alertResults.length).toBeGreaterThan(0)

      // Alert stats should reflect the alerts
      const stats = alertManager.getStats()
      expect(stats.totalAlerts).toBeGreaterThan(0)
    })

    it('should coordinate escalation based on severity', () => {
      const metrics = {
        LCP: 5000, // Critical
      }

      // Budget check should mark as critical
      const budgetResults = budgetController.checkMetrics(metrics)
      const lcpCriticalResult = budgetResults.find(
        r => r.rule.metric === 'LCP' && r.rule.id === 'lcp-critical'
      )
      expect(lcpCriticalResult?.severity).toBe('critical')

      // Alert manager should trigger P0 alert
      const alertResults = alertManager.evaluate(metrics)
      const lcpAlert = alertResults.find(a => a.ruleId === 'lcp-critical')
      expect(lcpAlert?.level).toBe('p0')
    })
  })

  describe('correlation analysis', () => {
    it('should correlate metrics across modules', () => {
      const metrics = {
        LCP: 4500,
        totalTransferSize: 2.5 * 1024 * 1024,
        requestCount: 90,
      }

      // Budget should detect multiple violations
      const budgetResults = budgetController.checkMetrics(metrics)
      const violations = budgetResults.filter(r => !r.passed)
      expect(violations.length).toBeGreaterThan(1)

      // Root cause should detect correlations
      const profile = {
        totalTransferSize: metrics.totalTransferSize as number,
        requestCount: metrics.requestCount as number,
        slowRequests: 8,
        averageResponseTime: 900,
        firstContentfulPaint: 2500,
        largestContentfulPaint: metrics.LCP as number,
        firstInputDelay: 120,
        cumulativeLayoutShift: 0.1,
        timeToInteractive: 4000,
        scriptExecutionTime: 70,
        blockingScriptTime: 140,
        scriptErrors: 2,
        domNodes: 1300,
        domDepth: 18,
        iframeCount: 2,
        memoryUsed: 55 * 1024 * 1024,
        memoryLimit: 100 * 1024 * 1024,
      }

      const rootCauseResult = rootCauseAnalyzer.analyze(profile)
      expect(rootCauseResult.correlations.length).toBeGreaterThan(0)

      // Should find correlation between transfer size and LCP
      const lcpTransferCorrelation = rootCauseResult.correlations.find(
        c => c.metrics.includes('totalTransferSize') && c.metrics.includes('largestContentfulPaint')
      )
      expect(lcpTransferCorrelation).toBeDefined()
    })
  })

  describe('alert aggregation and deduplication', () => {
    it('should deduplicate similar alerts across modules', () => {
      const metrics = {
        LCP: 5000,
        FID: 400,
        CLS: 0.3,
      }

      // Budget violations
      const budgetResults = budgetController.checkMetrics(metrics)

      // Alert triggers
      const alertResults = alertManager.evaluate(metrics)

      // Alert manager should throttle rapid repeated alerts
      const secondEval = alertManager.evaluate(metrics)
      const throttled = secondEval.find(a => a.suppressed)
      expect(throttled).toBeDefined()
    })

    it('should aggregate alerts by rule', () => {
      const metrics = { LCP: 5000 }

      // Trigger multiple evaluations
      alertManager.evaluate(metrics)
      alertManager.evaluate(metrics)
      alertManager.evaluate(metrics)

      const stats = alertManager.getStats()
      expect(stats.totalAlerts).toBeGreaterThanOrEqual(3)

      // Should track alert count for the rule
      const activeAlerts = alertManager.getActiveAlerts()
      const lcpAlert = activeAlerts.find(a => a.ruleId === 'lcp-critical')
      expect(lcpAlert?.count).toBeGreaterThanOrEqual(3)
    })
  })

  describe('silencing and suppression coordination', () => {
    it('should coordinate silencing across modules', () => {
      // Silence LCP critical rule
      alertManager.suppressRule('lcp-critical', 60000)

      const metrics = { LCP: 5000 }

      // Alert manager should not fire
      const alertResults = alertManager.evaluate(metrics)
      expect(alertResults.length).toBe(0)

      // Budget controller still detects violation but doesn't alert
      // (alerting is handled by budget controller's alert system)
    })
  })

  describe('action plan generation coordination', () => {
    it('should generate action plan from root cause and budget violations', () => {
      const metrics = {
        LCP: 5000,
        FID: 400,
        totalTransferSize: 2 * 1024 * 1024,
        requestCount: 80,
      }

      const profile = {
        totalTransferSize: metrics.totalTransferSize as number,
        requestCount: metrics.requestCount as number,
        slowRequests: 8,
        averageResponseTime: 800,
        firstContentfulPaint: 2500,
        largestContentfulPaint: metrics.LCP as number,
        firstInputDelay: metrics.FID as number,
        cumulativeLayoutShift: 0.15,
        timeToInteractive: 4000,
        scriptExecutionTime: 80,
        blockingScriptTime: 150,
        scriptErrors: 2,
        domNodes: 1500,
        domDepth: 20,
        iframeCount: 2,
        memoryUsed: 65 * 1024 * 1024,
        memoryLimit: 100 * 1024 * 1024,
      }

      const rootCauseResult = rootCauseAnalyzer.analyze(profile)
      const budgetReport = budgetController.generateReport(metrics)

      // Both should generate recommendations
      expect(rootCauseResult.actionPlan.length).toBeGreaterThan(0)
      expect(budgetReport.recommendations.length).toBeGreaterThan(0)

      // Action plan should have prioritized items
      const highPriorityActions = rootCauseResult.actionPlan.filter(
        a => a.priority === 'p0' || a.priority === 'p1'
      )
      expect(highPriorityActions.length).toBeGreaterThan(0)
    })
  })

  describe('health status coordination', () => {
    it('should coordinate health status across modules', () => {
      const healthyMetrics = {
        LCP: 2000,
        FID: 50,
        CLS: 0.05,
      }

      const criticalMetrics = {
        LCP: 5000,
        FID: 400,
        CLS: 0.3,
      }

      // Healthy scenario
      const healthyProfile = {
        totalTransferSize: 500 * 1024,
        requestCount: 20,
        slowRequests: 0,
        averageResponseTime: 200,
        firstContentfulPaint: 1200,
        largestContentfulPaint: healthyMetrics.LCP as number,
        firstInputDelay: healthyMetrics.FID as number,
        cumulativeLayoutShift: healthyMetrics.CLS as number,
        timeToInteractive: 2500,
        scriptExecutionTime: 30,
        blockingScriptTime: 50,
        scriptErrors: 0,
        domNodes: 800,
        domDepth: 12,
        iframeCount: 0,
        memoryUsed: 50 * 1024 * 1024,
        memoryLimit: 100 * 1024 * 1024,
      }

      const healthyRootCause = rootCauseAnalyzer.analyze(healthyProfile)
      const healthyBudget = budgetController.generateReport(healthyMetrics)
      const healthyAlerts = alertManager.evaluate(healthyMetrics)

      expect(healthyRootCause.overallHealth).toBe('healthy')
      expect(healthyBudget.summary.overallStatus).toBe('healthy')
      expect(healthyAlerts.length).toBe(0)

      // Critical scenario
      const criticalProfile = {
        totalTransferSize: 2 * 1024 * 1024,
        requestCount: 80,
        slowRequests: 8,
        averageResponseTime: 800,
        firstContentfulPaint: 2500,
        largestContentfulPaint: criticalMetrics.LCP as number,
        firstInputDelay: criticalMetrics.FID as number,
        cumulativeLayoutShift: criticalMetrics.CLS as number,
        timeToInteractive: 4000,
        scriptExecutionTime: 80,
        blockingScriptTime: 150,
        scriptErrors: 2,
        domNodes: 1500,
        domDepth: 20,
        iframeCount: 2,
        memoryUsed: 75 * 1024 * 1024,
        memoryLimit: 100 * 1024 * 1024,
      }

      const criticalRootCause = rootCauseAnalyzer.analyze(criticalProfile)
      const criticalBudget = budgetController.generateReport(criticalMetrics)
      const criticalAlerts = alertManager.evaluate(criticalMetrics)

      expect(criticalRootCause.overallHealth).not.toBe('healthy')
      expect(criticalBudget.summary.overallStatus).not.toBe('healthy')
      expect(criticalAlerts.length).toBeGreaterThan(0)
    })
  })

  describe('error handling', () => {
    it('should handle invalid metrics gracefully', () => {
      const invalidMetrics = {
        LCP: 'invalid' as any,
        FID: null as any,
        CLS: undefined as any,
      }

      // Should not throw errors
      expect(() => {
        budgetController.checkMetrics(invalidMetrics)
        alertManager.evaluate(invalidMetrics)
      }).not.toThrow()
    })

    it('should handle missing metrics gracefully', () => {
      const emptyMetrics = {}

      expect(() => {
        budgetController.checkMetrics(emptyMetrics)
        alertManager.evaluate(emptyMetrics)
      }).not.toThrow()

      const budgetResults = budgetController.checkMetrics(emptyMetrics)
      expect(budgetResults).toBeInstanceOf(Array)

      const alertResults = alertManager.evaluate(emptyMetrics)
      expect(alertResults).toBeInstanceOf(Array)
    })
  })
})
