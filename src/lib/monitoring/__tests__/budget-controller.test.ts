// @ts-nocheck
/**
 * Tests for Budget Controller
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  BudgetController,
  budgetController,
  DEFAULT_BUDGET_RULES,
  type BudgetRule,
  type BudgetCheckResult,
  type BudgetReport,
} from '../budget-controller'
import { AlertSystem } from '../alerts'

describe('BudgetController', () => {
  let controller: BudgetController
  let mockAlertSystem: AlertSystem

  beforeEach(() => {
    mockAlertSystem = new AlertSystem({})
    controller = new BudgetController({ alertSystem: mockAlertSystem })
  })

  describe('initialization', () => {
    it('should initialize with default rules', () => {
      const rules = controller.getAllRules()
      expect(rules.length).toBeGreaterThan(0)
    })

    it('should load all default budget rules', () => {
      const rules = controller.getAllRules()
      expect(rules.length).toBe(DEFAULT_BUDGET_RULES.length)
    })
  })

  describe('rule management', () => {
    it('should add a new rule', () => {
      const rule: BudgetRule = {
        id: 'test-rule',
        name: 'Test Rule',
        metric: 'testMetric',
        threshold: 100,
        unit: 'ms',
        comparison: 'lte',
        enabled: true,
        priority: 'p2',
        description: 'Test description',
        tags: ['test'],
      }

      controller.addRule(rule)
      const retrieved = controller.getRule('test-rule')
      expect(retrieved).toEqual(rule)
    })

    it('should remove a rule', () => {
      controller.removeRule('lcp-warning')
      const retrieved = controller.getRule('lcp-warning')
      expect(retrieved).toBeUndefined()
    })

    it('should enable/disable a rule', () => {
      controller.setRuleEnabled('lcp-warning', false)
      const rule = controller.getRule('lcp-warning')
      expect(rule?.enabled).toBe(false)

      controller.setRuleEnabled('lcp-warning', true)
      expect(rule?.enabled).toBe(true)
    })
  })

  describe('checkMetric', () => {
    it('should check a metric against applicable rules', () => {
      const results = controller.checkMetric('LCP', 3000)
      expect(results.length).toBeGreaterThan(0)
    })

    it('should pass when metric is within threshold', () => {
      const results = controller.checkMetric('LCP', 2000) // 2s, under 2.5s threshold
      expect(results.length).toBeGreaterThan(0)
      expect(results.every(r => r.passed)).toBe(true)
    })

    it('should fail when metric exceeds warning threshold', () => {
      const results = controller.checkMetric('LCP', 3000) // 3s, over 2.5s but under 4s
      const warningResult = results.find(r => r.rule.id === 'lcp-warning')
      expect(warningResult).toBeDefined()
      expect(warningResult?.passed).toBe(false)
      expect(warningResult?.severity).toBe('warning')
    })

    it('should fail with critical severity when metric exceeds critical threshold', () => {
      const results = controller.checkMetric('LCP', 4500) // 4.5s, over 4s
      const criticalResult = results.find(r => r.rule.id === 'lcp-critical')
      expect(criticalResult).toBeDefined()
      expect(criticalResult?.passed).toBe(false)
      expect(criticalResult?.severity).toBe('critical')
    })

    it('should calculate deviation correctly', () => {
      const results = controller.checkMetric('LCP', 5000) // 5s, 25% over 4s threshold
      const criticalResult = results.find(r => r.rule.id === 'lcp-critical')
      expect(criticalResult?.deviation).toBe(25)
    })

    it('should skip disabled rules', () => {
      controller.setRuleEnabled('lcp-warning', false)
      const results = controller.checkMetric('LCP', 3000)
      expect(results.length).toBe(1) // Only critical rule should apply
    })
  })

  describe('checkMetrics', () => {
    it('should check multiple metrics at once', () => {
      const metrics = {
        LCP: 3000,
        FID: 150,
        CLS: 0.15,
      }

      const results = controller.checkMetrics(metrics)
      expect(results.length).toBeGreaterThan(2)
    })

    it('should include results for all metrics', () => {
      const metrics = {
        LCP: 3000,
        FID: 150,
        CLS: 0.15,
      }

      const results = controller.checkMetrics(metrics)
      const lcpResults = results.filter(r => r.rule.metric === 'LCP')
      const fidResults = results.filter(r => r.rule.metric === 'FID')
      const clsResults = results.filter(r => r.rule.metric === 'CLS')

      expect(lcpResults.length).toBeGreaterThan(0)
      expect(fidResults.length).toBeGreaterThan(0)
      expect(clsResults.length).toBeGreaterThan(0)
    })
  })

  describe('generateReport', () => {
    it('should generate a budget report', () => {
      const metrics = {
        LCP: 3000,
        FID: 150,
        CLS: 0.15,
      }

      const report = controller.generateReport(metrics)

      expect(report).toBeDefined()
      expect(report.timestamp).toBeInstanceOf(Date)
      expect(report.period).toBeDefined()
      expect(report.period.start).toBeInstanceOf(Date)
      expect(report.period.end).toBeInstanceOf(Date)
      expect(report.totalChecks).toBeGreaterThan(0)
      expect(report.passedChecks).toBeGreaterThanOrEqual(0)
      expect(report.failedChecks).toBeGreaterThanOrEqual(0)
      expect(report.passRate).toBeGreaterThanOrEqual(0)
      expect(report.passRate).toBeLessThanOrEqual(100)
    })

    it('should calculate pass rate correctly', () => {
      const metrics = {
        LCP: 2000, // Pass
        FID: 50, // Pass
        CLS: 0.05, // Pass
      }

      const report = controller.generateReport(metrics)
      expect(report.passRate).toBe(100)
    })

    it('should count warning and critical checks correctly', () => {
      const metrics = {
        LCP: 3000, // Warning
        FID: 150, // Warning
        CLS: 0.3, // Critical
      }

      const report = controller.generateReport(metrics)
      expect(report.warningChecks).toBe(2)
      expect(report.criticalChecks).toBe(1)
    })

    it('should include summary with top violations', () => {
      const metrics = {
        LCP: 5000,
        FID: 400,
        CLS: 0.3,
      }

      const report = controller.generateReport(metrics)
      expect(report.summary).toBeDefined()
      expect(report.summary.topViolations).toBeInstanceOf(Array)
      expect(report.summary.score).toBeGreaterThanOrEqual(0)
      expect(report.summary.score).toBeLessThanOrEqual(100)
    })

    it('should generate recommendations', () => {
      const metrics = {
        LCP: 5000,
        FID: 400,
      }

      const report = controller.generateReport(metrics)
      expect(report.recommendations).toBeInstanceOf(Array)
      expect(report.recommendations.length).toBeGreaterThan(0)
    })
  })

  describe('suppression rules', () => {
    it('should add and remove suppression rules', () => {
      const suppressionRule = {
        ruleId: 'lcp-warning',
        durationMs: 60000,
        maxViolations: 5,
        since: new Date(),
        reason: 'Test suppression',
      }

      controller.addSuppressionRule(suppressionRule)
      const removed = controller.removeSuppressionRule('lcp-warning')
      expect(removed).toBe(true)
    })

    it('should suppress violations within window', () => {
      const suppressionRule = {
        ruleId: 'lcp-warning',
        durationMs: 60000,
        maxViolations: 0, // Suppress all
        since: new Date(),
      }

      controller.addSuppressionRule(suppressionRule)

      // This should be suppressed - no alert should be sent
      const results = controller.checkMetric('LCP', 3000)

      // The result still exists (budget check is done), but violation should be suppressed
      const warningResult = results.find(r => r.rule.id === 'lcp-warning')

      // Verify the check was performed
      expect(results.length).toBeGreaterThan(0)

      // The violation should not trigger an alert (checked via violation history)
      const history = controller.getViolationHistory()
      const suppressedViolation = history.find(v => v.ruleId === 'lcp-warning')
      expect(suppressedViolation).toBeUndefined()
    })
  })

  describe('violation history', () => {
    it('should track violation history', () => {
      controller.checkMetric('LCP', 5000) // Trigger violation

      const history = controller.getViolationHistory()
      expect(history.length).toBeGreaterThan(0)
    })

    it('should clear violation history', () => {
      controller.checkMetric('LCP', 5000)
      controller.clearViolationHistory()

      const history = controller.getViolationHistory()
      expect(history.length).toBe(0)
    })

    it('should calculate violation statistics', () => {
      controller.checkMetric('LCP', 5000)
      controller.checkMetric('LCP', 4500)

      const stats = controller.getViolationStats()
      expect(stats).toBeDefined()
      expect(Object.keys(stats).length).toBeGreaterThan(0)
    })
  })

  describe('alert integration', () => {
    it('should send alerts for critical violations', async () => {
      const sendSpy = vi.spyOn(mockAlertSystem, 'sendAlert').mockResolvedValue({
        slack: false,
        email: false,
        webhook: false,
        discord: false,
        telegram: false,
      })

      controller.checkMetric('LCP', 5000) // Critical violation

      // Wait for async alert sending
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(sendSpy).toHaveBeenCalled()
      sendSpy.mockRestore()
    })
  })

  describe('Core Web Vitals rules', () => {
    it('should have LCP rules with correct thresholds', () => {
      const warningRule = controller.getRule('lcp-warning')
      const criticalRule = controller.getRule('lcp-critical')

      expect(warningRule?.threshold).toBe(2500)
      expect(criticalRule?.threshold).toBe(4000)
    })

    it('should have FID rules with correct thresholds', () => {
      const warningRule = controller.getRule('fid-warning')
      const criticalRule = controller.getRule('fid-critical')

      expect(warningRule?.threshold).toBe(100)
      expect(criticalRule?.threshold).toBe(300)
    })

    it('should have CLS rules with correct thresholds', () => {
      const warningRule = controller.getRule('cls-warning')
      const criticalRule = controller.getRule('cls-critical')

      expect(warningRule?.threshold).toBe(0.1)
      expect(criticalRule?.threshold).toBe(0.25)
    })

    it('should have TTFB rules with correct thresholds', () => {
      const warningRule = controller.getRule('ttfb-warning')
      const criticalRule = controller.getRule('ttfb-critical')

      expect(warningRule?.threshold).toBe(800)
      expect(criticalRule?.threshold).toBe(1800)
    })
  })

  describe('singleton instance', () => {
    it('should export a singleton instance', () => {
      expect(budgetController).toBeInstanceOf(BudgetController)
    })
  })
})
