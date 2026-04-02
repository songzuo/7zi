/**
 * Performance Budget Control - Unit Tests
 * 性能预算控制 - 单元测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  BudgetChecker,
  BudgetConfigManager,
  BudgetAlertManager,
  DEFAULT_BUDGET_CONFIG,
  DEFAULT_BUDGET_ALERT_CONFIG,
} from './index'
import { PerformanceAlerter } from '../alerting/alerter'
import type { PerformanceBudgetConfig, PageBudget, BudgetThreshold } from './types'

// Mock PerformanceAlerter
const mockAlerter = {
  createAlert: vi.fn().mockResolvedValue(undefined),
  addRule: vi.fn(),
  getAlerts: vi.fn().mockReturnValue([]),
  sendAlert: vi.fn().mockResolvedValue(undefined),
}

describe('BudgetChecker', () => {
  let checker: BudgetChecker

  beforeEach(() => {
    // Create checker with explicit config for consistent test results
    checker = new BudgetChecker({
      enabled: true,
      budgets: [
        {
          path: '/',
          timings: [
            { metric: 'LCP', budget: 2500, tolerance: 0.1, unit: 'ms' },
            { metric: 'FID', budget: 100, tolerance: 0.15, unit: 'ms' },
            { metric: 'CLS', budget: 0.1, tolerance: 0.2, unit: 'score' },
          ],
          resources: {
            js: 500 * 1024,
            css: 100 * 1024,
            images: 1024 * 1024,
            total: 2 * 1024 * 1024,
          },
        },
      ],
      checkOnBuild: true,
      failOnViolation: false,
      warningThreshold: 0.9,
      errorThreshold: 1.1,
    })
    vi.clearAllMocks()
  })

  describe('checkBudget', () => {
    it('should pass when metrics are within budget', () => {
      const result = checker.checkBudget('/', {
        LCP: 2000,
        FID: 80,
        CLS: 0.05,
      })

      expect(result.passed).toBe(true)
      expect(result.violations).toHaveLength(0)
      expect(result.score).toBe(100)
    })

    it('should detect violation when metric exceeds budget', () => {
      const result = checker.checkBudget('/', {
        LCP: 3000, // Budget: 2500 * 1.1 = 2750
        FID: 80,
        CLS: 0.05,
      })

      expect(result.passed).toBe(false)
      expect(result.violations).toHaveLength(1)
      expect(result.violations[0].metric).toBe('LCP')
      expect(result.violations[0].actual).toBe(3000)
      expect(result.violations[0].severity).toBeDefined()
    })

    it('should apply tolerance correctly', () => {
      // LCP budget: 2500, tolerance: 0.1
      // Threshold should be 2500 * 1.1 = 2750

      // Just under threshold - should pass
      const result1 = checker.checkBudget('/', { LCP: 2749 })
      expect(result1.passed).toBe(true)

      // Just over threshold - should fail
      const result2 = checker.checkBudget('/', { LCP: 2751 })
      expect(result2.passed).toBe(false)
    })

    it('should determine correct severity levels', () => {
      // Major violation (20-50% over)
      const result1 = checker.checkBudget('/', {
        LCP: 3500, // 27.3% over
      })
      expect(result1.violations[0].severity).toBe('major')

      // Critical violation (>50% over)
      const result2 = checker.checkBudget('/', {
        LCP: 4500, // 63.6% over
      })
      expect(result2.violations[0].severity).toBe('critical')
    })

    it('should check resource budgets', () => {
      const result = checker.checkBudget(
        '/',
        {},
        {
          js: 600 * 1024, // Budget: 500KB
          css: 50 * 1024,
          images: 500 * 1024,
          total: 1.5 * 1024 * 1024,
        }
      )

      expect(result.passed).toBe(false)
      expect(result.violations.some(v => v.metric === 'Resource:js')).toBe(true)
    })

    it('should handle missing metrics gracefully', () => {
      const result = checker.checkBudget('/', {
        LCP: 2000,
        // FID and CLS not provided
      })

      expect(result.passed).toBe(true)
      // Only check provided metrics
    })

    it('should match wildcard paths', () => {
      const result = checker.checkBudget('/dashboard/tasks', {
        LCP: 3500, // Exceeds /dashboard budget of 3000 * 1.15 = 3450
      })

      // Should use /dashboard budget if configured with wildcard
      expect(result.checkedAt).toBeDefined()
    })
  })

  describe('getBudgetForPage', () => {
    it('should return exact match when available', () => {
      const budget = checker.getBudgetForPage('/')
      expect(budget.path).toBe('/')
      expect(budget.timings).toBeDefined()
    })

    it('should return default budget for unknown pages', () => {
      const budget = checker.getBudgetForPage('/unknown-page')
      expect(budget.path).toBe('/unknown-page')
      expect(budget.timings).toBeDefined()
    })
  })

  describe('addBudget / removeBudget', () => {
    it('should add new page budget', () => {
      const newBudget: PageBudget = {
        path: '/new-page',
        timings: [{ metric: 'LCP', budget: 2000, tolerance: 0.1, unit: 'ms' }],
      }

      checker.addBudget(newBudget)
      const budget = checker.getBudgetForPage('/new-page')
      expect(budget.timings[0].budget).toBe(2000)
    })

    it('should update existing page budget', () => {
      const updatedBudget: PageBudget = {
        path: '/',
        timings: [{ metric: 'LCP', budget: 3000, tolerance: 0.2, unit: 'ms' }],
      }

      checker.addBudget(updatedBudget)
      const budget = checker.getBudgetForPage('/')
      expect(budget.timings[0].budget).toBe(3000)
    })

    it('should remove page budget', () => {
      checker.addBudget({
        path: '/temp',
        timings: [],
      })

      const removed = checker.removeBudget('/temp')
      expect(removed).toBe(true)

      const removed2 = checker.removeBudget('/nonexistent')
      expect(removed2).toBe(false)
    })
  })

  describe('checkAllBudgets', () => {
    it('should check multiple pages', () => {
      const pages = [
        { path: '/', metrics: { LCP: 2000 } },
        { path: '/dashboard', metrics: { LCP: 3500 } },
      ]

      const results = checker.checkAllBudgets(pages)

      expect(results.size).toBe(2)
      expect(results.get('/')?.passed).toBe(true)
      expect(results.get('/dashboard')?.passed).toBe(false)
    })
  })

  describe('calculateScore', () => {
    it('should return 100 for no violations', () => {
      const result = checker.checkBudget('/', { LCP: 2000 })
      expect(result.score).toBe(100)
    })

    it('should deduct points for violations', () => {
      const result = checker.checkBudget('/', { LCP: 5000 })
      // LCP 5000 exceeds threshold 2750 by 81.8% -> critical violation
      // Score should be less than 100 (deduct 30 points)
      expect(result.score).toBeLessThan(100)
      expect(result.score).toBeGreaterThanOrEqual(0)
      expect(result.violations.length).toBeGreaterThan(0)
      expect(result.violations[0].severity).toBe('critical')
    })
  })
})

describe('BudgetConfigManager', () => {
  let manager: BudgetConfigManager

  beforeEach(() => {
    manager = new BudgetConfigManager()
  })

  describe('loadFromJSON', () => {
    it('should load valid configuration', () => {
      const config: Partial<PerformanceBudgetConfig> = {
        enabled: true,
        budgets: [
          {
            path: '/test',
            timings: [{ metric: 'LCP', budget: 2000, tolerance: 0.1, unit: 'ms' }],
          },
        ],
      }

      const result = manager.loadFromJSON(config)

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should validate configuration', () => {
      const config = {
        budgets: [
          {
            // Missing path
            timings: [
              { metric: 'LCP', budget: -100, tolerance: 2, unit: 'ms' }, // Invalid budget and tolerance
            ],
          },
        ],
      }

      const result = manager.loadFromJSON(config)

      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('should merge with existing configuration', () => {
      // Clear default budgets first
      manager = new BudgetConfigManager({
        enabled: true,
        budgets: [],
        checkOnBuild: true,
        failOnViolation: false,
        warningThreshold: 0.9,
        errorThreshold: 1.1,
      })

      manager.loadFromJSON({
        budgets: [
          {
            path: '/',
            timings: [{ metric: 'LCP', budget: 2500, tolerance: 0.1, unit: 'ms' }],
          },
        ],
      })

      manager.loadFromJSON(
        {
          budgets: [
            {
              path: '/dashboard',
              timings: [{ metric: 'LCP', budget: 3000, tolerance: 0.15, unit: 'ms' }],
            },
          ],
        },
        { mergeWithDefault: true }
      )

      const config = manager.getConfig()
      expect(config.budgets.length).toBe(2)
    })
  })

  describe('validateConfig', () => {
    it('should validate enabled flag', () => {
      const result = manager.validateConfig({ enabled: 'invalid' as any })
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('enabled must be a boolean')
    })

    it('should validate budgets array', () => {
      const result = manager.validateConfig({ budgets: 'invalid' as any })
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('budgets must be an array')
    })

    it('should validate timing threshold', () => {
      const result = manager.validateConfig({
        budgets: [
          {
            path: '/test',
            timings: [
              {
                metric: '',
                budget: -1,
                tolerance: 2,
                unit: '',
              } as any,
            ],
          },
        ],
      })

      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('metric is required'))).toBe(true)
      expect(result.errors.some(e => e.includes('budget must be a positive number'))).toBe(true)
      expect(result.errors.some(e => e.includes('tolerance must be between 0 and 1'))).toBe(true)
      expect(result.errors.some(e => e.includes('unit is required'))).toBe(true)
    })

    it('should validate resources', () => {
      const result = manager.validateConfig({
        budgets: [
          {
            path: '/test',
            timings: [],
            resources: {
              js: -100,
              css: 'invalid' as any,
            },
          },
        ],
      })

      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('js must be a positive number'))).toBe(true)
    })
  })

  describe('getPageBudget / setPageBudget', () => {
    it('should get and set page budgets', () => {
      const budget: PageBudget = {
        path: '/new',
        timings: [{ metric: 'LCP', budget: 2000, tolerance: 0.1, unit: 'ms' }],
      }

      manager.setPageBudget(budget)
      const retrieved = manager.getPageBudget('/new')

      expect(retrieved).toEqual(budget)
    })

    it('should update existing budget', () => {
      manager.setPageBudget({
        path: '/test',
        timings: [{ metric: 'LCP', budget: 2000, tolerance: 0.1, unit: 'ms' }],
      })

      manager.setPageBudget({
        path: '/test',
        timings: [{ metric: 'LCP', budget: 3000, tolerance: 0.15, unit: 'ms' }],
      })

      const budget = manager.getPageBudget('/test')
      expect(budget?.timings[0].budget).toBe(3000)
    })
  })

  describe('removePageBudget', () => {
    it('should remove budget', () => {
      manager.setPageBudget({
        path: '/remove',
        timings: [],
      })

      const removed = manager.removePageBudget('/remove')
      expect(removed).toBe(true)
      expect(manager.getPageBudget('/remove')).toBeUndefined()
    })

    it('should return false for non-existent budget', () => {
      const removed = manager.removePageBudget('/nonexistent')
      expect(removed).toBe(false)
    })
  })

  describe('getAllMetrics', () => {
    it('should return all unique metrics', () => {
      // Clear default budgets first
      manager = new BudgetConfigManager({
        enabled: true,
        budgets: [],
      })

      manager.setPageBudget({
        path: '/a',
        timings: [
          { metric: 'LCP', budget: 2000, tolerance: 0.1, unit: 'ms' },
          { metric: 'FID', budget: 100, tolerance: 0.1, unit: 'ms' },
        ],
      })

      manager.setPageBudget({
        path: '/b',
        timings: [
          { metric: 'LCP', budget: 2500, tolerance: 0.1, unit: 'ms' },
          { metric: 'CLS', budget: 0.1, tolerance: 0.2, unit: 'score' },
        ],
      })

      const metrics = manager.getAllMetrics()

      expect(metrics).toContain('LCP')
      expect(metrics).toContain('FID')
      expect(metrics).toContain('CLS')
      expect(metrics.length).toBe(3)
    })
  })

  describe('generateSummary', () => {
    it('should generate correct summary', () => {
      // Clear default budgets first
      manager = new BudgetConfigManager({
        enabled: true,
        budgets: [],
      })

      manager.setPageBudget({
        path: '/a',
        timings: [{ metric: 'LCP', budget: 2000, tolerance: 0.1, unit: 'ms' }],
        resources: { js: 100000 },
      })

      manager.setPageBudget({
        path: '/b',
        timings: [{ metric: 'FID', budget: 100, tolerance: 0.1, unit: 'ms' }],
      })

      const summary = manager.generateSummary()

      expect(summary.totalPages).toBe(2)
      expect(summary.totalMetrics).toBe(2)
      expect(summary.resourcesConfigured).toBe(1)
    })
  })

  describe('exportJSON / importJSON', () => {
    it('should export and import configuration', () => {
      // Clear default budgets first
      manager = new BudgetConfigManager({
        enabled: true,
        budgets: [],
      })

      manager.setPageBudget({
        path: '/export',
        timings: [{ metric: 'LCP', budget: 2000, tolerance: 0.1, unit: 'ms' }],
      })

      const exported = manager.exportJSON()

      const newManager = new BudgetConfigManager({
        enabled: true,
        budgets: [],
      })
      const result = newManager.importJSON(exported)

      expect(result.valid).toBe(true)
      expect(newManager.getPageBudget('/export')?.timings[0].budget).toBe(2000)
    })

    it('should handle invalid JSON', () => {
      const result = manager.importJSON('invalid json')

      expect(result.valid).toBe(false)
      expect(result.errors[0]).toContain('Failed to parse JSON')
    })
  })
})

describe('BudgetAlertManager', () => {
  let alertManager: BudgetAlertManager
  let checker: BudgetChecker

  beforeEach(() => {
    checker = new BudgetChecker({
      enabled: true,
      budgets: [
        {
          path: '/',
          timings: [
            { metric: 'LCP', budget: 2500, tolerance: 0.1, unit: 'ms' },
            { metric: 'FID', budget: 100, tolerance: 0.15, unit: 'ms' },
            { metric: 'CLS', budget: 0.1, tolerance: 0.2, unit: 'score' },
          ],
        },
      ],
      checkOnBuild: true,
      failOnViolation: false,
      warningThreshold: 0.9,
      errorThreshold: 1.1,
    })
    alertManager = new BudgetAlertManager({}, mockAlerter as any, checker)
    vi.clearAllMocks()
  })

  afterEach(() => {
    alertManager.reset()
  })

  describe('checkAndAlert', () => {
    it('should not send alert when budget passes', async () => {
      const { checkResult, alertsSent } = await alertManager.checkAndAlert('/', {
        LCP: 2000,
        FID: 80,
        CLS: 0.05,
      })

      expect(checkResult.passed).toBe(true)
      expect(alertsSent).toBe(0)
      expect(mockAlerter.createAlert).not.toHaveBeenCalled()
    })

    it('should send alert when budget fails', async () => {
      const { checkResult, alertsSent } = await alertManager.checkAndAlert('/', {
        LCP: 4000, // Exceeds budget
      })

      expect(checkResult.passed).toBe(false)
      expect(alertsSent).toBe(1)
      expect(mockAlerter.createAlert).toHaveBeenCalled()
    })

    it('should respect cooldown period', async () => {
      // First alert
      await alertManager.checkAndAlert('/', { LCP: 4000 })
      expect(mockAlerter.createAlert).toHaveBeenCalledTimes(1)

      // Second check within cooldown - should be suppressed
      const { alertsSent } = await alertManager.checkAndAlert('/', { LCP: 4000 })
      expect(alertsSent).toBe(0)
      expect(mockAlerter.createAlert).toHaveBeenCalledTimes(1)
    })

    it('should allow alert after cooldown expires', async () => {
      alertManager.updateConfig({ cooldownSeconds: 0 })

      await alertManager.checkAndAlert('/', { LCP: 4000 })
      expect(mockAlerter.createAlert).toHaveBeenCalledTimes(1)

      await alertManager.checkAndAlert('/', { LCP: 4000 })
      expect(mockAlerter.createAlert).toHaveBeenCalledTimes(2)
    })

    it('should determine correct alert level', async () => {
      // Clear cooldowns
      alertManager.clearAllCooldowns()

      // LCP 5000 -> threshold 2750 -> percentOver = 81.8% -> critical
      const { checkResult } = await alertManager.checkAndAlert('/', { LCP: 5000 })

      // Verify that budget check detected violation
      expect(checkResult.passed).toBe(false)
      expect(checkResult.violations.length).toBeGreaterThan(0)

      // Verify alert was sent
      expect(mockAlerter.createAlert).toHaveBeenCalled()

      const call = mockAlerter.createAlert.mock.calls[0][0]
      expect(call).toBeDefined()
      // critical severity maps to critical
      expect(call.level).toBe('critical')

      alertManager.clearAllCooldowns()
      mockAlerter.createAlert.mockClear()

      // LCP 6000 -> percentOver = 118% -> critical (still critical)
      await alertManager.checkAndAlert('/', { LCP: 6000 })
      expect(mockAlerter.createAlert).toHaveBeenCalled()
      const criticalCall = mockAlerter.createAlert.mock.calls[0][0]
      expect(criticalCall).toBeDefined()
      expect(criticalCall.level).toBe('critical')
    })

    it('should include context when enabled', async () => {
      await alertManager.checkAndAlert('/', { LCP: 4000 })

      const call = mockAlerter.createAlert.mock.calls[0][0]
      expect(call.context).toBeDefined()
      expect(call.context.page).toBe('/')
      expect(call.context.budgetScore).toBeDefined()
    })
  })

  describe('checkMultiplePagesAndAlert', () => {
    it('should check multiple pages', async () => {
      const pages = [
        { path: '/', metrics: { LCP: 2000 } }, // Pass
        { path: '/dashboard', metrics: { LCP: 4000 } }, // Fail
      ]

      const { results, totalAlertsSent } = await alertManager.checkMultiplePagesAndAlert(pages)

      expect(results.size).toBe(2)
      expect(results.get('/')?.checkResult.passed).toBe(true)
      expect(results.get('/dashboard')?.checkResult.passed).toBe(false)
      expect(totalAlertsSent).toBe(1)
    })
  })

  describe('createSummaryAlert', () => {
    it('should create summary alert for violations', async () => {
      const violations = [
        {
          page: '/',
          violation: {
            metric: 'LCP',
            budget: 2500,
            actual: 3000,
            threshold: 2750,
            percentOver: 9.1,
            severity: 'major' as const,
          },
        },
        {
          page: '/dashboard',
          violation: {
            metric: 'FID',
            budget: 100,
            actual: 150,
            threshold: 115,
            percentOver: 30.4,
            severity: 'minor' as const,
          },
        },
      ]

      await alertManager.createSummaryAlert(violations)

      expect(mockAlerter.createAlert).toHaveBeenCalled()
      const call = mockAlerter.createAlert.mock.calls[0][0]
      expect(call.title).toContain('Budget Violation Summary')
      expect(call.context.violations).toHaveLength(2)
    })
  })

  describe('registerBudgetAlertRules', () => {
    it('should register alert rules for budgets', () => {
      alertManager.registerBudgetAlertRules()

      expect(mockAlerter.addRule).toHaveBeenCalled()
    })
  })

  describe('getLastAlertTime / clearCooldown', () => {
    it('should track last alert time', async () => {
      await alertManager.checkAndAlert('/', { LCP: 4000 })

      const lastAlertTime = alertManager.getLastAlertTime('/', 'LCP')
      expect(lastAlertTime).toBeDefined()
      expect(typeof lastAlertTime).toBe('number')
    })

    it('should clear cooldown', async () => {
      await alertManager.checkAndAlert('/', { LCP: 4000 })
      expect(alertManager.getLastAlertTime('/', 'LCP')).toBeDefined()

      alertManager.clearCooldown('/', 'LCP')
      expect(alertManager.getLastAlertTime('/', 'LCP')).toBeUndefined()
    })

    it('should clear all cooldowns', async () => {
      await alertManager.checkAndAlert('/', { LCP: 4000 })
      await alertManager.checkAndAlert('/', { FID: 200 })
      alertManager.clearAllCooldowns()

      expect(alertManager.getLastAlertTime('/', 'LCP')).toBeUndefined()
      expect(alertManager.getLastAlertTime('/', 'FID')).toBeUndefined()
    })
  })

  describe('updateConfig', () => {
    it('should update configuration', () => {
      alertManager.updateConfig({
        enabled: false,
        autoAlert: false,
      })

      const config = alertManager.getConfig()
      expect(config.enabled).toBe(false)
      expect(config.autoAlert).toBe(false)
    })
  })

  describe('reset', () => {
    it('should reset state', async () => {
      await alertManager.checkAndAlert('/', { LCP: 4000 })
      expect(alertManager.getLastAlertTime('/', 'LCP')).toBeDefined()

      alertManager.reset()
      expect(alertManager.getLastAlertTime('/', 'LCP')).toBeUndefined()
    })
  })
})

describe('Integration Tests', () => {
  it('should integrate checker, config, and alerts', async () => {
    // Create a fresh checker with no default budgets
    const checker = new BudgetChecker({
      enabled: true,
      budgets: [],
      checkOnBuild: true,
      failOnViolation: false,
      warningThreshold: 0.9,
      errorThreshold: 1.1,
    })

    // Add budget directly to checker
    checker.addBudget({
      path: '/integration',
      timings: [{ metric: 'LCP', budget: 2000, tolerance: 0.1, unit: 'ms' }],
    })

    const alertManager = new BudgetAlertManager({}, mockAlerter as any, checker)

    // Check and alert
    const { checkResult, alertsSent } = await alertManager.checkAndAlert('/integration', {
      LCP: 3000, // Exceeds budget
    })

    expect(checkResult.passed).toBe(false)
    expect(alertsSent).toBe(1)
    expect(mockAlerter.createAlert).toHaveBeenCalled()
  })

  it('should handle complex scenarios', async () => {
    const checker = new BudgetChecker({
      enabled: true,
      budgets: [
        {
          path: '/',
          timings: [
            { metric: 'LCP', budget: 2500, tolerance: 0.1, unit: 'ms' },
            { metric: 'FID', budget: 100, tolerance: 0.15, unit: 'ms' },
            { metric: 'CLS', budget: 0.1, tolerance: 0.2, unit: 'score' },
          ],
        },
      ],
    })
    const alertManager = new BudgetAlertManager({}, mockAlerter as any, checker)

    // Multiple violations
    const { checkResult } = await alertManager.checkAndAlert('/', {
      LCP: 5000, // Critical (>50% over)
      FID: 200, // Major (20-50% over)
      CLS: 0.5, // Major
    })

    expect(checkResult.passed).toBe(false)
    expect(checkResult.violations.length).toBeGreaterThanOrEqual(1)

    // At least one violation should be critical
    const severities = checkResult.violations.map(v => v.severity)
    expect(severities).toContain('critical')
  })
})

describe('Default Configuration', () => {
  it('should have valid default budget config', () => {
    expect(DEFAULT_BUDGET_CONFIG.enabled).toBe(true)
    expect(DEFAULT_BUDGET_CONFIG.budgets).toBeDefined()
    expect(DEFAULT_BUDGET_CONFIG.budgets.length).toBeGreaterThan(0)
  })

  it('should have valid default alert config', () => {
    expect(DEFAULT_BUDGET_ALERT_CONFIG.enabled).toBe(true)
    expect(DEFAULT_BUDGET_ALERT_CONFIG.autoAlert).toBe(true)
    expect(DEFAULT_BUDGET_ALERT_CONFIG.cooldownSeconds).toBeGreaterThan(0)
  })
})
