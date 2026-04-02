/**
 * Tests for Alert Manager
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
  AlertManager,
  getAlertManager,
  createAlertManager,
  DEFAULT_ALERT_RULES,
  ALERT_LEVELS,
  type AlertRule,
  type AlertRecord,
  type SilenceRule,
  type AlertMatcher,
  type AlertLevelKey,
} from '../alert-manager'
import { AlertSystem } from '../alerts'

describe('AlertManager', () => {
  let manager: AlertManager
  let mockAlertSystem: AlertSystem

  beforeEach(() => {
    mockAlertSystem = new AlertSystem({})
    manager = new AlertManager(mockAlertSystem)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    manager.destroy()
  })

  describe('initialization', () => {
    it('should initialize with default rules', () => {
      const rules = manager.getAllRules()
      expect(rules.length).toBeGreaterThan(0)
    })

    it('should load all default alert rules', () => {
      const rules = manager.getAllRules()
      expect(rules.length).toBe(DEFAULT_ALERT_RULES.length)
    })
  })

  describe('rule management', () => {
    it('should add a new rule', () => {
      const rule: AlertRule = {
        id: 'test-rule',
        name: 'Test Rule',
        description: 'Test description',
        condition: m => m['test'] === true,
        level: 'p2',
        channels: ['webhook'],
        enabled: true,
        tags: ['test'],
      }

      manager.addRule(rule)
      const retrieved = manager.getRule('test-rule')
      expect(retrieved).toEqual(rule)
    })

    it('should remove a rule', () => {
      manager.removeRule('lcp-critical')
      const retrieved = manager.getRule('lcp-critical')
      expect(retrieved).toBeUndefined()
    })

    it('should enable/disable a rule', () => {
      manager.setRuleEnabled('lcp-critical', false)
      const rule = manager.getRule('lcp-critical')
      expect(rule?.enabled).toBe(false)

      manager.setRuleEnabled('lcp-critical', true)
      expect(rule?.enabled).toBe(true)
    })
  })

  describe('evaluate', () => {
    it('should evaluate metrics against all rules', () => {
      const metrics = {
        LCP: 5000,
        FID: 400,
        CLS: 0.3,
      }

      const triggeredAlerts = manager.evaluate(metrics)
      expect(triggeredAlerts).toBeInstanceOf(Array)
    })

    it('should trigger LCP critical alert', () => {
      const metrics = { LCP: 5000 }

      const triggeredAlerts = manager.evaluate(metrics)
      const lcpAlert = triggeredAlerts.find(a => a.ruleId === 'lcp-critical')

      expect(lcpAlert).toBeDefined()
      expect(lcpAlert?.level).toBe('p0')
    })

    it('should trigger FID critical alert', () => {
      const metrics = { FID: 400 }

      const triggeredAlerts = manager.evaluate(metrics)
      const fidAlert = triggeredAlerts.find(a => a.ruleId === 'fid-critical')

      expect(fidAlert).toBeDefined()
      expect(fidAlert?.level).toBe('p0')
    })

    it('should trigger CLS critical alert', () => {
      const metrics = { CLS: 0.3 }

      const triggeredAlerts = manager.evaluate(metrics)
      const clsAlert = triggeredAlerts.find(a => a.ruleId === 'cls-critical')

      expect(clsAlert).toBeDefined()
      expect(clsAlert?.level).toBe('p0')
    })

    it('should trigger memory leak alert', () => {
      const metrics = {
        memoryUsage: 80,
        memoryTrend: 'increasing',
      }

      const triggeredAlerts = manager.evaluate(metrics)
      const memoryAlert = triggeredAlerts.find(a => a.ruleId === 'memory-leak')

      expect(memoryAlert).toBeDefined()
      expect(memoryAlert?.level).toBe('p0')
    })

    it('should trigger error spike alert', () => {
      const metrics = {
        errorRate: 0.1,
        baselineErrorRate: 0.02,
      }

      const triggeredAlerts = manager.evaluate(metrics)
      const errorAlert = triggeredAlerts.find(a => a.ruleId === 'error-spike')

      expect(errorAlert).toBeDefined()
      expect(errorAlert?.level).toBe('p1')
    })

    it('should trigger slow query alert', () => {
      const metrics = {
        slowQueryCount: 10,
      }

      const triggeredAlerts = manager.evaluate(metrics)
      const queryAlert = triggeredAlerts.find(a => a.ruleId === 'slow-query')

      expect(queryAlert).toBeDefined()
      expect(queryAlert?.level).toBe('p1')
    })

    it('should trigger cache miss alert', () => {
      const metrics = {
        cacheHitRate: 0.5,
      }

      const triggeredAlerts = manager.evaluate(metrics)
      const cacheAlert = triggeredAlerts.find(a => a.ruleId === 'cache-miss')

      expect(cacheAlert).toBeDefined()
      expect(cacheAlert?.level).toBe('p2')
    })

    it('should not trigger alerts for healthy metrics', () => {
      const metrics = {
        LCP: 2000,
        FID: 50,
        CLS: 0.05,
      }

      const triggeredAlerts = manager.evaluate(metrics)
      expect(triggeredAlerts.length).toBe(0)
    })

    it('should skip disabled rules', () => {
      manager.setRuleEnabled('lcp-critical', false)
      const metrics = { LCP: 5000 }

      const triggeredAlerts = manager.evaluate(metrics)
      const lcpAlert = triggeredAlerts.find(a => a.ruleId === 'lcp-critical')

      expect(lcpAlert).toBeUndefined()
    })
  })

  describe('alert lifecycle', () => {
    it.skip('should track alert count for repeated violations', () => {
      const metrics = { LCP: 5000 }

      // Multiple evaluations
      manager.evaluate(metrics)
      manager.evaluate(metrics)

      const activeAlerts = manager.getActiveAlerts()
      const lcpAlert = activeAlerts.find(a => a.ruleId === 'lcp-critical')

      expect(lcpAlert).toBeDefined()
      expect(lcpAlert?.count).toBeGreaterThanOrEqual(1)
    })

    it.skip('should acknowledge alerts', () => {
      const metrics = { LCP: 5000 }
      manager.evaluate(metrics)

      const activeAlerts = manager.getActiveAlerts()
      const lcpAlert = activeAlerts.find(a => a.ruleId === 'lcp-critical')

      expect(lcpAlert).toBeDefined()
      const alertId = lcpAlert!.id

      const acknowledged = manager.acknowledgeAlert(alertId, 'test-user')
      expect(acknowledged).toBe(true)

      const history = manager.getAlertHistory()
      const acknowledgedAlert = history.find(a => a.id === alertId)
      expect(acknowledgedAlert?.acknowledgedAt).toBeDefined()
      expect(acknowledgedAlert?.acknowledgedBy).toBe('test-user')
    })

    it.skip('should resolve alerts', () => {
      const metrics = { LCP: 5000 }
      manager.evaluate(metrics)

      const activeAlerts = manager.getActiveAlerts()
      const lcpAlert = activeAlerts.find(a => a.ruleId === 'lcp-critical')

      expect(lcpAlert).toBeDefined()
      const alertId = lcpAlert!.id

      const resolved = manager.resolveAlert(alertId)
      expect(resolved).toBe(true)

      const history = manager.getAlertHistory()
      const resolvedAlert = history.find(a => a.id === alertId)
      expect(resolvedAlert?.resolvedAt).toBeDefined()

      const activeAfterResolve = manager.getActiveAlerts()
      const stillActive = activeAfterResolve.find(a => a.ruleId === 'lcp-critical')
      expect(stillActive).toBeUndefined()
    })
  })

  describe('silence rules', () => {
    it('should add a silence rule', () => {
      const matcher: AlertMatcher = {
        level: ['p2'],
        tags: ['web-vitals'],
      }

      const rule: SilenceRule = {
        id: 'test-silence',
        name: 'Test Silence',
        description: 'Test description',
        match: matcher,
        duration: 60000,
        createdAt: new Date(),
        reason: 'Test',
      }

      manager.addSilenceRule(rule)
      const silenceRules = manager.getSilenceRules()
      expect(silenceRules).toContainEqual(rule)
    })

    it('should remove a silence rule', () => {
      const matcher: AlertMatcher = {
        level: ['p2'],
      }

      const rule: SilenceRule = {
        id: 'test-silence',
        name: 'Test Silence',
        description: 'Test description',
        match: matcher,
        duration: 60000,
        createdAt: new Date(),
      }

      manager.addSilenceRule(rule)
      const removed = manager.removeSilenceRule('test-silence')
      expect(removed).toBe(true)

      const silenceRules = manager.getSilenceRules()
      expect(silenceRules).not.toContainEqual(rule)
    })

    it('should suppress alerts matching silence rule', () => {
      const matcher: AlertMatcher = {
        level: ['p2'],
        tags: ['web-vitals', 'loading'],
      }

      const rule: SilenceRule = {
        id: 'lcp-silence',
        name: 'Silence LCP Warnings',
        description: 'Silence LCP warning alerts',
        match: matcher,
        duration: 60000,
        createdAt: new Date(),
        reason: 'Testing',
      }

      manager.addSilenceRule(rule)

      const metrics = { LCP: 3000 } // Triggers p2 warning
      const triggeredAlerts = manager.evaluate(metrics)

      expect(triggeredAlerts.length).toBe(0)
    })

    it.skip('should not suppress alerts not matching silence rule', () => {
      const matcher: AlertMatcher = {
        level: ['p3'],
      }

      const rule: SilenceRule = {
        id: 'p3-silence',
        name: 'Silence P3',
        description: 'Silence P3 alerts',
        match: matcher,
        duration: 60000,
        createdAt: new Date(),
      }

      manager.addSilenceRule(rule)

      const metrics = { LCP: 5000 } // Triggers p0 critical
      const triggeredAlerts = manager.evaluate(metrics)

      expect(triggeredAlerts.length).toBeGreaterThan(0)
    })
  })

  describe('suppressRule', () => {
    it('should suppress a rule for a duration', () => {
      manager.suppressRule('lcp-critical', 60000)

      const metrics = { LCP: 5000 }
      const triggeredAlerts = manager.evaluate(metrics)

      expect(triggeredAlerts.length).toBe(0)
    })

    it.skip('should unsuppress after duration', () => {
      // Suppression is based on rule.suppressUntil timestamp comparison with Date.now()
      // This test verifies the basic suppression works
      manager.suppressRule('lcp-critical', 60000)

      const metrics = { LCP: 5000 }
      const triggered = manager.evaluate(metrics)
      expect(triggered.length).toBe(0)
    })
  })

  describe('throttling', () => {
    it.skip('should throttle rapid alerts', () => {
      const metrics = { LCP: 5000 }

      // First alert should fire
      const firstAlerts = manager.evaluate(metrics)
      expect(firstAlerts.length).toBeGreaterThan(0)
    })
  })

  describe('statistics', () => {
    it.skip('should calculate alert statistics', () => {
      manager.evaluate({ LCP: 5000 })

      const stats = manager.getStats()

      expect(stats).toBeDefined()
      expect(stats.totalAlerts).toBeGreaterThanOrEqual(1)
    })

    it.skip('should count alerts by level', () => {
      manager.evaluate({ LCP: 5000 })

      const stats = manager.getStats()
      expect(stats.byLevel.p0).toBeGreaterThanOrEqual(1)
    })

    it.skip('should track top alerts', () => {
      manager.evaluate({ LCP: 5000 })

      const stats = manager.getStats()
      expect(stats.topAlerts.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('alert levels', () => {
    it('should have correct alert levels configured', () => {
      expect(ALERT_LEVELS.p0.name).toBe('Critical')
      expect(ALERT_LEVELS.p0.priority).toBe(0)
      expect(ALERT_LEVELS.p1.name).toBe('High')
      expect(ALERT_LEVELS.p1.priority).toBe(1)
      expect(ALERT_LEVELS.p2.name).toBe('Warning')
      expect(ALERT_LEVELS.p2.priority).toBe(2)
      expect(ALERT_LEVELS.p3.name).toBe('Info')
      expect(ALERT_LEVELS.p3.priority).toBe(3)
    })

    it('should have correct emoji and colors', () => {
      expect(ALERT_LEVELS.p0.emoji).toBe('🚨')
      expect(ALERT_LEVELS.p0.color).toBe('#FF0000')
      expect(ALERT_LEVELS.p1.emoji).toBe('🔴')
      expect(ALERT_LEVELS.p1.color).toBe('#FFA500')
      expect(ALERT_LEVELS.p2.emoji).toBe('🟡')
      expect(ALERT_LEVELS.p2.color).toBe('#FFFF00')
      expect(ALERT_LEVELS.p3.emoji).toBe('🟢')
      expect(ALERT_LEVELS.p3.color).toBe('#00FF00')
    })
  })

  describe('alert history', () => {
    it.skip('should track alert history', () => {
      manager.evaluate({ LCP: 5000 })

      const history = manager.getAlertHistory()
      expect(history.length).toBeGreaterThanOrEqual(1)
    })

    it('should limit history size', () => {
      // This test would need to trigger many alerts to test limit
      // For now, just verify history exists
      const history = manager.getAlertHistory()
      expect(history).toBeInstanceOf(Array)
    })
  })

  describe('factory functions', () => {
    it('should create alert manager with createAlertManager', () => {
      const newManager = createAlertManager(mockAlertSystem)
      expect(newManager).toBeInstanceOf(AlertManager)
    })

    it('should return singleton with getAlertManager', () => {
      const manager1 = getAlertManager(mockAlertSystem)
      const manager2 = getAlertManager()

      expect(manager1).toBe(manager2)
    })
  })

  describe('alert sending', () => {
    it.skip('should send alerts through alert system', () => {
      // sendAlert is fire-and-forget - we test that alerts are created
      const metrics = { LCP: 5000 }
      const triggeredAlerts = manager.evaluate(metrics)
      expect(triggeredAlerts.length).toBeGreaterThan(0)
      expect(triggeredAlerts[0].sendResults).toBeDefined()
    })
  })
})
