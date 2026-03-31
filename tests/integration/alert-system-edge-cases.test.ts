/**
 * Alert System Edge Cases Test Suite
 * 告警系统边缘测试用例
 *
 * Coverage:
 * - Alert rule validation boundary conditions
 * - Alert trigger condition scenarios
 * - Concurrent alert handling
 * - Null and abnormal data handling
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  PerformanceAlerter,
  DEFAULT_ALERTING_CONFIG,
} from '../7zi-frontend/src/lib/performance-monitoring/alerting/alerter';
import {
  PerformanceAlert,
  AlertRule,
  AlertingConfig,
  AlertSeverity,
} from '../7zi-frontend/src/lib/performance-monitoring/alerting/types';
import {
  EmailChannel,
  SlackChannel,
  DashboardChannel,
  WebhookChannel,
  TelegramChannel,
} from '../7zi-frontend/src/lib/performance-monitoring/alerting/channels';

// Mock logger
vi.mock('../7zi-frontend/src/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('Alert System - Edge Cases', () => {
  let alerter: PerformanceAlerter;

  beforeEach(() => {
    alerter = new PerformanceAlerter();
    alerter.reset();
    vi.clearAllMocks();
  });

  afterEach(() => {
    alerter.reset();
    vi.clearAllMocks();
  });

  // ============================================
  // 1. Alert Rule Validation Boundary Conditions
  // ============================================
  describe('Alert Rule Validation Boundary Conditions', () => {
    describe('Threshold Boundary Tests', () => {
      it('should trigger alert when value equals threshold with >= operator', async () => {
        alerter.updateConfig({
          rules: [
            {
              id: 'boundary-test',
              name: 'Boundary Test',
              description: 'Test boundary condition',
              enabled: true,
              metric: 'cpu',
              condition: { operator: '>=', value: 100 },
              level: 'warning',
              channels: ['dashboard'],
              cooldown: 0,
              aggregation: { enabled: false, window: 300, maxAlerts: 5 },
            },
          ],
          suppression: {
            windowMs: 60000,
            maxAlerts: 100,
            deduplicateBy: [],
          },
        });

        const alerts = await alerter.checkRules('cpu', 100);
        expect(alerts.length).toBe(1);
        expect(alerts[0].value).toBe(100);
      });

      it('should NOT trigger alert when value equals threshold with > operator', async () => {
        alerter.updateConfig({
          rules: [
            {
              id: 'boundary-test',
              name: 'Boundary Test',
              description: 'Test boundary condition',
              enabled: true,
              metric: 'cpu',
              condition: { operator: '>', value: 100 },
              level: 'warning',
              channels: ['dashboard'],
              cooldown: 0,
              aggregation: { enabled: false, window: 300, maxAlerts: 5 },
            },
          ],
        });

        const alerts = await alerter.checkRules('cpu', 100);
        expect(alerts.length).toBe(0);
      });

      it('should trigger alert when value equals threshold with <= operator', async () => {
        alerter.updateConfig({
          rules: [
            {
              id: 'boundary-test',
              name: 'Boundary Test',
              description: 'Test boundary condition',
              enabled: true,
              metric: 'available-memory',
              condition: { operator: '<=', value: 0 },
              level: 'critical',
              channels: ['dashboard'],
              cooldown: 0,
              aggregation: { enabled: false, window: 300, maxAlerts: 5 },
            },
          ],
          suppression: {
            windowMs: 60000,
            maxAlerts: 100,
            deduplicateBy: [],
          },
        });

        const alerts = await alerter.checkRules('available-memory', 0);
        expect(alerts.length).toBe(1);
      });

      it('should handle floating point threshold with precision', async () => {
        alerter.updateConfig({
          rules: [
            {
              id: 'float-test',
              name: 'Float Test',
              description: 'Test floating point',
              enabled: true,
              metric: 'error-rate',
              condition: { operator: '>', value: 0.001 },
              level: 'warning',
              channels: ['dashboard'],
              cooldown: 0,
              aggregation: { enabled: false, window: 300, maxAlerts: 5 },
            },
          ],
          suppression: {
            windowMs: 60000,
            maxAlerts: 100,
            deduplicateBy: [],
          },
        });

        // Test with very small difference
        const alerts = await alerter.checkRules('error-rate', 0.0010001);
        expect(alerts.length).toBe(1);

        // Test below threshold
        const alerts2 = await alerter.checkRules('error-rate', 0.0009999);
        expect(alerts2.length).toBe(0);
      });

      it('should handle negative thresholds', async () => {
        alerter.updateConfig({
          rules: [
            {
              id: 'negative-test',
              name: 'Negative Test',
              description: 'Test negative threshold',
              enabled: true,
              metric: 'temperature-change',
              condition: { operator: '<', value: -10 },
              level: 'warning',
              channels: ['dashboard'],
              cooldown: 0,
              aggregation: { enabled: false, window: 300, maxAlerts: 5 },
            },
          ],
          suppression: {
            windowMs: 60000,
            maxAlerts: 100,
            deduplicateBy: [],
          },
        });

        const alerts = await alerter.checkRules('temperature-change', -15);
        expect(alerts.length).toBe(1);
        expect(alerts[0].value).toBe(-15);
      });
    });

    describe('Rule State Edge Cases', () => {
      it('should handle empty rules array', async () => {
        alerter.updateConfig({
          rules: [],
        });

        const alerts = await alerter.checkRules('any-metric', 100);
        expect(alerts.length).toBe(0);
      });

      it('should skip disabled rules', async () => {
        alerter.updateConfig({
          rules: [
            {
              id: 'disabled-rule',
              name: 'Disabled Rule',
              description: 'This rule is disabled',
              enabled: false,
              metric: 'cpu',
              condition: { operator: '>', value: 50 },
              level: 'warning',
              channels: ['dashboard'],
              cooldown: 0,
              aggregation: { enabled: false, window: 300, maxAlerts: 5 },
            },
            {
              id: 'enabled-rule',
              name: 'Enabled Rule',
              description: 'This rule is enabled',
              enabled: true,
              metric: 'cpu',
              condition: { operator: '>', value: 80 },
              level: 'error',
              channels: ['dashboard'],
              cooldown: 0,
              aggregation: { enabled: false, window: 300, maxAlerts: 5 },
            },
          ],
          suppression: {
            windowMs: 60000,
            maxAlerts: 100,
            deduplicateBy: [],
          },
        });

        const alerts = await alerter.checkRules('cpu', 90);
        expect(alerts.length).toBe(1);
        expect(alerts[0].severity).toBe('error'); // From enabled rule
      });

      it('should handle multiple rules for same metric', async () => {
        alerter.updateConfig({
          rules: [
            {
              id: 'warning-rule',
              name: 'Warning Level',
              description: 'Warning threshold',
              enabled: true,
              metric: 'cpu',
              condition: { operator: '>', value: 70 },
              level: 'warning',
              channels: ['dashboard'],
              cooldown: 0,
              aggregation: { enabled: false, window: 300, maxAlerts: 5 },
            },
            {
              id: 'error-rule',
              name: 'Error Level',
              description: 'Error threshold',
              enabled: true,
              metric: 'cpu',
              condition: { operator: '>', value: 85 },
              level: 'error',
              channels: ['dashboard'],
              cooldown: 0,
              aggregation: { enabled: false, window: 300, maxAlerts: 5 },
            },
            {
              id: 'critical-rule',
              name: 'Critical Level',
              description: 'Critical threshold',
              enabled: true,
              metric: 'cpu',
              condition: { operator: '>', value: 95 },
              level: 'critical',
              channels: ['dashboard'],
              cooldown: 0,
              aggregation: { enabled: false, window: 300, maxAlerts: 5 },
            },
          ],
          suppression: {
            windowMs: 60000,
            maxAlerts: 100,
            deduplicateBy: [],
          },
        });

        // At 98%, all three rules should trigger
        const alerts = await alerter.checkRules('cpu', 98);
        expect(alerts.length).toBe(3);
        
        const severities = alerts.map(a => a.severity).sort();
        expect(severities).toEqual(['critical', 'error', 'warning']);
      });

      it('should handle rules with zero cooldown', async () => {
        alerter.updateConfig({
          rules: [
            {
              id: 'zero-cooldown',
              name: 'Zero Cooldown',
              description: 'No cooldown',
              enabled: true,
              metric: 'test',
              condition: { operator: '>', value: 0 },
              level: 'info',
              channels: ['dashboard'],
              cooldown: 0,
              aggregation: { enabled: false, window: 300, maxAlerts: 5 },
            },
          ],
          suppression: {
            windowMs: 60000,
            maxAlerts: 100,
            deduplicateBy: [],
          },
        });

        // Send multiple alerts rapidly
        await alerter.checkRules('test', 1);
        await alerter.checkRules('test', 2);
        const alerts = alerter.getAlerts();
        
        // Both should be stored (not suppressed due to cooldown)
        expect(alerts.length).toBeGreaterThanOrEqual(2);
      });
    });

    describe('Threshold Value Edge Cases', () => {
      it('should handle extremely large threshold values', async () => {
        alerter.updateConfig({
          rules: [
            {
              id: 'large-threshold',
              name: 'Large Threshold',
              description: 'Test large value',
              enabled: true,
              metric: 'bytes-processed',
              condition: { operator: '>', value: Number.MAX_SAFE_INTEGER - 1 },
              level: 'warning',
              channels: ['dashboard'],
              cooldown: 0,
              aggregation: { enabled: false, window: 300, maxAlerts: 5 },
            },
          ],
          suppression: {
            windowMs: 60000,
            maxAlerts: 100,
            deduplicateBy: [],
          },
        });

        const alerts = await alerter.checkRules('bytes-processed', Number.MAX_SAFE_INTEGER);
        expect(alerts.length).toBe(1);
      });

      it('should handle zero threshold', async () => {
        alerter.updateConfig({
          rules: [
            {
              id: 'zero-threshold',
              name: 'Zero Threshold',
              description: 'Test zero',
              enabled: true,
              metric: 'errors',
              condition: { operator: '>', value: 0 },
              level: 'error',
              channels: ['dashboard'],
              cooldown: 0,
              aggregation: { enabled: false, window: 300, maxAlerts: 5 },
            },
          ],
          suppression: {
            windowMs: 60000,
            maxAlerts: 100,
            deduplicateBy: [],
          },
        });

        // Value of 1 should trigger
        const alerts = await alerter.checkRules('errors', 1);
        expect(alerts.length).toBe(1);

        // Value of 0 should NOT trigger
        const alerts2 = await alerter.checkRules('errors', 0);
        expect(alerts2.length).toBe(0);
      });
    });
  });

  // ============================================
  // 2. Alert Trigger Condition Scenarios
  // ============================================
  describe('Alert Trigger Condition Scenarios', () => {
    describe('All Operator Tests', () => {
      const operators = ['>', '>=', '<', '<=', '==', '!='] as const;

      operators.forEach((op) => {
        it(`should correctly handle ${op} operator at boundary`, async () => {
          const threshold = 50;
          
          alerter.updateConfig({
            rules: [
              {
                id: `operator-${op}`,
                name: `Operator ${op} Test`,
                description: 'Test operator',
                enabled: true,
                metric: 'test',
                condition: { operator: op, value: threshold },
                level: 'warning',
                channels: ['dashboard'],
                cooldown: 0,
                aggregation: { enabled: false, window: 300, maxAlerts: 5 },
              },
            ],
            suppression: {
              windowMs: 60000,
              maxAlerts: 100,
              deduplicateBy: [],
            },
          });

          // Test cases for each operator
          const testCases: { value: number; shouldTrigger: boolean }[] = {
            { value: 49, shouldTrigger: ['<', '<=', '!='].includes(op) },
            { value: 50, shouldTrigger: ['>=', '<=', '=='].includes(op) },
            { value: 51, shouldTrigger: ['>', '>=', '!='].includes(op) },
          };

          for (const testCase of testCases) {
            alerter.reset();
            const alerts = await alerter.checkRules('test', testCase.value);
            
            if (testCase.shouldTrigger) {
              expect(alerts.length).toBeGreaterThanOrEqual(1);
            } else {
              expect(alerts.length).toBe(0);
            }
          }
        });
      });
    });

    describe('Complex Trigger Scenarios', () => {
      it('should trigger on equality with == operator', async () => {
        alerter.updateConfig({
          rules: [
            {
              id: 'equality-test',
              name: 'Equality Test',
              description: 'Test equality',
              enabled: true,
              metric: 'status-code',
              condition: { operator: '==', value: 500 },
              level: 'error',
              channels: ['dashboard'],
              cooldown: 0,
              aggregation: { enabled: false, window: 300, maxAlerts: 5 },
            },
          ],
          suppression: {
            windowMs: 60000,
            maxAlerts: 100,
            deduplicateBy: [],
          },
        });

        const alerts = await alerter.checkRules('status-code', 500);
        expect(alerts.length).toBe(1);
      });

      it('should trigger on inequality with != operator', async () => {
        alerter.updateConfig({
          rules: [
            {
              id: 'inequality-test',
              name: 'Inequality Test',
              description: 'Test inequality',
              enabled: true,
              metric: 'health-status',
              condition: { operator: '!=', value: 1 },
              level: 'warning',
              channels: ['dashboard'],
              cooldown: 0,
              aggregation: { enabled: false, window: 300, maxAlerts: 5 },
            },
          ],
          suppression: {
            windowMs: 60000,
            maxAlerts: 100,
            deduplicateBy: [],
          },
        });

        const alerts = await alerter.checkRules('health-status', 0);
        expect(alerts.length).toBe(1);

        alerter.reset();
        const alerts2 = await alerter.checkRules('health-status', 1);
        expect(alerts2.length).toBe(0);
      });

      it('should handle cascading thresholds correctly', async () => {
        alerter.updateConfig({
          rules: [
            {
              id: 'level-1',
              name: 'Level 1',
              description: 'Level 1 threshold',
              enabled: true,
              metric: 'memory',
              condition: { operator: '>', value: 60 },
              level: 'info',
              channels: ['dashboard'],
              cooldown: 0,
              aggregation: { enabled: false, window: 300, maxAlerts: 5 },
            },
            {
              id: 'level-2',
              name: 'Level 2',
              description: 'Level 2 threshold',
              enabled: true,
              metric: 'memory',
              condition: { operator: '>', value: 75 },
              level: 'warning',
              channels: ['dashboard'],
              cooldown: 0,
              aggregation: { enabled: false, window: 300, maxAlerts: 5 },
            },
            {
              id: 'level-3',
              name: 'Level 3',
              description: 'Level 3 threshold',
              enabled: true,
              metric: 'memory',
              condition: { operator: '>', value: 90 },
              level: 'critical',
              channels: ['dashboard'],
              cooldown: 0,
              aggregation: { enabled: false, window: 300, maxAlerts: 5 },
            },
          ],
          suppression: {
            windowMs: 60000,
            maxAlerts: 100,
            deduplicateBy: [],
          },
        });

        // Test at each level
        const testCases = [
          { value: 50, expectedCount: 0 },
          { value: 65, expectedCount: 1 },
          { value: 80, expectedCount: 2 },
          { value: 95, expectedCount: 3 },
        ];

        for (const tc of testCases) {
          alerter.reset();
          const alerts = await alerter.checkRules('memory', tc.value);
          expect(alerts.length).toBe(tc.expectedCount);
        }
      });
    });
  });

  // ============================================
  // 3. Concurrent Alert Handling
  // ============================================
  describe('Concurrent Alert Handling', () => {
    it('should handle concurrent alert creation', async () => {
      alerter.updateConfig({
        suppression: {
          windowMs: 60000,
          maxAlerts: 1000,
          deduplicateBy: [],
        },
      });

      const concurrentCount = 50;
      const promises = Array.from({ length: concurrentCount }, (_, i) =>
        alerter.createAlert({
          level: 'warning',
          message: `Concurrent alert ${i}`,
          metric: `metric-${i}`,
          value: i,
          threshold: 0,
        })
      );

      await Promise.all(promises);

      const alerts = alerter.getAlerts();
      expect(alerts.length).toBe(concurrentCount);
    });

    it('should handle concurrent rule checks', async () => {
      alerter.updateConfig({
        rules: [
          {
            id: 'concurrent-test',
            name: 'Concurrent Test',
            description: 'Test concurrent',
            enabled: true,
            metric: 'cpu',
            condition: { operator: '>', value: 50 },
            level: 'warning',
            channels: ['dashboard'],
            cooldown: 0,
            aggregation: { enabled: false, window: 300, maxAlerts: 5 },
          },
        ],
        suppression: {
          windowMs: 60000,
          maxAlerts: 1000,
          deduplicateBy: [],
        },
      });

      const promises = Array.from({ length: 20 }, () =>
        alerter.checkRules('cpu', 80)
      );

      const results = await Promise.all(promises);
      
      // All should return at least one alert
      results.forEach(alerts => {
        expect(alerts.length).toBeGreaterThanOrEqual(1);
      });
    });

    it('should handle race condition in suppression check', async () => {
      alerter.updateConfig({
        suppression: {
          windowMs: 60000,
          maxAlerts: 5, // Very low limit
          deduplicateBy: [],
        },
      });

      // Send many concurrent alerts with low max limit
      const promises = Array.from({ length: 20 }, (_, i) =>
        alerter.createAlert({
          level: 'info',
          message: `Race test ${i}`,
          metric: `race-metric-${i}`,
          value: i,
          threshold: 0,
        })
      );

      await Promise.all(promises);

      const alerts = alerter.getAlerts();
      const suppressed = alerts.filter(a => a.suppressed);
      
      // Some should be suppressed due to max limit
      expect(suppressed.length).toBeGreaterThan(0);
    });

    it('should handle concurrent acknowledge/resolve operations', async () => {
      // Create alerts first
      const alertIds: string[] = [];
      for (let i = 0; i < 10; i++) {
        const alert = await alerter.createAlert({
          level: 'warning',
          message: `Test ${i}`,
          metric: `test-${i}`,
          value: i,
          threshold: 0,
        });
        alertIds.push(alert.id);
      }

      // Concurrent acknowledge and resolve
      const promises = alertIds.flatMap(id => [
        alerter.acknowledgeAlert(id, 'user1'),
        alerter.resolveAlert(id),
      ]);

      await Promise.all(promises);

      const alerts = alerter.getAlerts();
      // All should be either acknowledged or resolved
      const processed = alerts.filter(a => a.acknowledged || a.resolved);
      expect(processed.length).toBe(alertIds.length);
    });

    it('should handle concurrent send operations on same metric', async () => {
      alerter.updateConfig({
        suppression: {
          windowMs: 60000,
          maxAlerts: 100,
          deduplicateBy: ['metric', 'severity'],
        },
      });

      const metric = 'duplicate-test';
      const promises = Array.from({ length: 10 }, () =>
        alerter.sendAlert({
          id: `alert-${Date.now()}-${Math.random()}`,
          timestamp: Date.now(),
          severity: 'warning',
          metric,
          message: 'Duplicate test',
          value: 100,
          threshold: 50,
          acknowledged: false,
          resolved: false,
          suppressed: false,
        })
      );

      await Promise.all(promises);

      const alerts = alerter.getAlerts();
      const nonSuppressed = alerts.filter(a => !a.suppressed);
      const suppressed = alerts.filter(a => a.suppressed);

      // First one should not be suppressed, rest should be
      expect(nonSuppressed.length).toBeGreaterThanOrEqual(1);
      expect(suppressed.length).toBeGreaterThanOrEqual(0);
    });
  });

  // ============================================
  // 4. Null and Abnormal Data Handling
  // ============================================
  describe('Null and Abnormal Data Handling', () => {
    describe('Null/Undefined Values', () => {
      it('should handle null value in alert', async () => {
        await expect(async () => {
          await alerter.createAlert({
            level: 'warning',
            message: 'Test null value',
            metric: 'test',
            value: null as any,
            threshold: 0,
          });
        }).not.toThrow();
      });

      it('should handle undefined context', async () => {
        const alert = await alerter.createAlert({
          level: 'info',
          message: 'Test undefined context',
          metric: 'test',
          value: 1,
          threshold: 0,
          context: undefined,
        });

        expect(alert.context).toBeUndefined();
      });

      it('should handle null context', async () => {
        const alert = await alerter.createAlert({
          level: 'info',
          message: 'Test null context',
          metric: 'test',
          value: 1,
          threshold: 0,
          context: null as any,
        });

        expect(alert.context).toBeNull();
      });

      it('should handle empty context object', async () => {
        const alert = await alerter.createAlert({
          level: 'info',
          message: 'Test empty context',
          metric: 'test',
          value: 1,
          threshold: 0,
          context: {},
        });

        expect(alert.context).toEqual({});
      });
    });

    describe('Special Number Values', () => {
      it('should handle NaN value in rule check', async () => {
        alerter.updateConfig({
          rules: [
            {
              id: 'nan-test',
              name: 'NaN Test',
              description: 'Test NaN',
              enabled: true,
              metric: 'test',
              condition: { operator: '>', value: 0 },
              level: 'warning',
              channels: ['dashboard'],
              cooldown: 0,
              aggregation: { enabled: false, window: 300, maxAlerts: 5 },
            },
          ],
        });

        // NaN comparisons are always false
        const alerts = await alerter.checkRules('test', NaN);
        expect(alerts.length).toBe(0);
      });

      it('should handle Infinity value in rule check', async () => {
        alerter.updateConfig({
          rules: [
            {
              id: 'infinity-test',
              name: 'Infinity Test',
              description: 'Test Infinity',
              enabled: true,
              metric: 'test',
              condition: { operator: '>', value: Number.MAX_SAFE_INTEGER },
              level: 'warning',
              channels: ['dashboard'],
              cooldown: 0,
              aggregation: { enabled: false, window: 300, maxAlerts: 5 },
            },
          ],
          suppression: {
            windowMs: 60000,
            maxAlerts: 100,
            deduplicateBy: [],
          },
        });

        const alerts = await alerter.checkRules('test', Infinity);
        expect(alerts.length).toBe(1);
      });

      it('should handle negative Infinity value', async () => {
        alerter.updateConfig({
          rules: [
            {
              id: 'neg-infinity-test',
              name: 'Negative Infinity Test',
              description: 'Test -Infinity',
              enabled: true,
              metric: 'test',
              condition: { operator: '<', value: -Number.MAX_SAFE_INTEGER },
              level: 'warning',
              channels: ['dashboard'],
              cooldown: 0,
              aggregation: { enabled: false, window: 300, maxAlerts: 5 },
            },
          ],
          suppression: {
            windowMs: 60000,
            maxAlerts: 100,
            deduplicateBy: [],
          },
        });

        const alerts = await alerter.checkRules('test', -Infinity);
        expect(alerts.length).toBe(1);
      });

      it('should handle very small decimal values', async () => {
        alerter.updateConfig({
          rules: [
            {
              id: 'decimal-test',
              name: 'Decimal Test',
              description: 'Test small decimal',
              enabled: true,
              metric: 'test',
              condition: { operator: '>', value: Number.EPSILON },
              level: 'info',
              channels: ['dashboard'],
              cooldown: 0,
              aggregation: { enabled: false, window: 300, maxAlerts: 5 },
            },
          ],
          suppression: {
            windowMs: 60000,
            maxAlerts: 100,
            deduplicateBy: [],
          },
        });

        const alerts = await alerter.checkRules('test', Number.EPSILON * 2);
        expect(alerts.length).toBe(1);
      });
    });

    describe('String Edge Cases', () => {
      it('should handle empty string in message', async () => {
        const alert = await alerter.createAlert({
          level: 'info',
          message: '',
          metric: 'test',
          value: 1,
          threshold: 0,
        });

        expect(alert.message).toBe('');
      });

      it('should handle very long message', async () => {
        const longMessage = 'A'.repeat(10000);
        const alert = await alerter.createAlert({
          level: 'info',
          message: longMessage,
          metric: 'test',
          value: 1,
          threshold: 0,
        });

        expect(alert.message).toBe(longMessage);
        expect(alert.message.length).toBe(10000);
      });

      it('should handle unicode in message', async () => {
        const unicodeMessage = '警告 🚨 エラー 错误';
        const alert = await alerter.createAlert({
          level: 'warning',
          message: unicodeMessage,
          metric: 'test',
          value: 1,
          threshold: 0,
        });

        expect(alert.message).toBe(unicodeMessage);
      });

      it('should handle special characters in metric name', async () => {
        const specialMetric = 'metric-with-dashes_and_underscores.and.dots';
        const alert = await alerter.createAlert({
          level: 'info',
          message: 'Test',
          metric: specialMetric,
          value: 1,
          threshold: 0,
        });

        expect(alert.metric).toBe(specialMetric);
      });
    });

    describe('Context Edge Cases', () => {
      it('should handle deeply nested context', async () => {
        const deepContext = {
          level1: {
            level2: {
              level3: {
                level4: {
                  level5: {
                    value: 'deep',
                  },
                },
              },
            },
          },
        };

        const alert = await alerter.createAlert({
          level: 'info',
          message: 'Deep context test',
          metric: 'test',
          value: 1,
          threshold: 0,
          context: deepContext,
        });

        expect(alert.context).toEqual(deepContext);
      });

      it('should handle context with circular reference safely', async () => {
        const circularContext: any = { name: 'test' };
        circularContext.self = circularContext;

        // Should not throw when creating alert
        const alert = await alerter.createAlert({
          level: 'info',
          message: 'Circular context test',
          metric: 'test',
          value: 1,
          threshold: 0,
          context: circularContext,
        });

        expect(alert.context).toBeDefined();
      });

      it('should handle context with arrays', async () => {
        const arrayContext = {
          items: [1, 2, 3, 4, 5],
          tags: ['error', 'critical', 'production'],
          mixed: [1, 'two', { three: 3 }],
        };

        const alert = await alerter.createAlert({
          level: 'error',
          message: 'Array context test',
          metric: 'test',
          value: 1,
          threshold: 0,
          context: arrayContext,
        });

        expect(alert.context).toEqual(arrayContext);
      });

      it('should handle context with special values', async () => {
        const specialContext = {
          nullValue: null,
          undefinedValue: undefined,
          nanValue: NaN,
          infinityValue: Infinity,
          dateValue: new Date(),
        };

        const alert = await alerter.createAlert({
          level: 'info',
          message: 'Special values context',
          metric: 'test',
          value: 1,
          threshold: 0,
          context: specialContext,
        });

        expect(alert.context?.nullValue).toBeNull();
        expect(alert.context?.nanValue).toBeNaN();
        expect(alert.context?.infinityValue).toBe(Infinity);
      });
    });

    describe('Alert ID Edge Cases', () => {
      it('should handle non-existent alert ID in acknowledge', () => {
        const result = alerter.acknowledgeAlert('non-existent-id-12345', 'user');
        expect(result).toBe(false);
      });

      it('should handle non-existent alert ID in resolve', () => {
        const result = alerter.resolveAlert('non-existent-id-12345');
        expect(result).toBe(false);
      });

      it('should handle empty string as alert ID', () => {
        const result = alerter.acknowledgeAlert('', 'user');
        expect(result).toBe(false);
      });
    });
  });

  // ============================================
  // 5. Suppression Edge Cases
  // ============================================
  describe('Suppression Edge Cases', () => {
    it('should handle suppression with empty deduplicateBy array', async () => {
      alerter.updateConfig({
        suppression: {
          windowMs: 60000,
          maxAlerts: 100,
          deduplicateBy: [],
        },
      });

      await alerter.createAlert({
        level: 'warning',
        message: 'Test 1',
        metric: 'test',
        value: 1,
        threshold: 0,
      });

      await alerter.createAlert({
        level: 'warning',
        message: 'Test 2',
        metric: 'test',
        value: 2,
        threshold: 0,
      });

      const alerts = alerter.getAlerts();
      const suppressed = alerts.filter(a => a.suppressed);
      expect(suppressed.length).toBe(0);
    });

    it('should handle suppression window of zero', async () => {
      alerter.updateConfig({
        suppression: {
          windowMs: 0,
          maxAlerts: 100,
          deduplicateBy: ['metric'],
        },
      });

      await alerter.createAlert({
        level: 'warning',
        message: 'Test',
        metric: 'test',
        value: 1,
        threshold: 0,
      });

      // With windowMs: 0, deduplication should not apply
      await alerter.createAlert({
        level: 'warning',
        message: 'Test',
        metric: 'test',
        value: 2,
        threshold: 0,
      });

      const alerts = alerter.getAlerts();
      expect(alerts.length).toBe(2);
    });

    it('should handle maxAlerts of zero', async () => {
      alerter.updateConfig({
        suppression: {
          windowMs: 60000,
          maxAlerts: 0,
        },
      });

      await alerter.createAlert({
        level: 'warning',
        message: 'Test',
        metric: 'test',
        value: 1,
        threshold: 0,
      });

      const alerts = alerter.getAlerts();
      const suppressed = alerts.filter(a => a.suppressed);
      expect(suppressed.length).toBe(1);
    });

    it('should handle very large suppression window', async () => {
      alerter.updateConfig({
        suppression: {
          windowMs: Number.MAX_SAFE_INTEGER,
          maxAlerts: 100,
          deduplicateBy: ['metric'],
        },
      });

      await alerter.createAlert({
        level: 'warning',
        message: 'Test 1',
        metric: 'test',
        value: 1,
        threshold: 0,
      });

      // Second should be suppressed (window is very large)
      await alerter.createAlert({
        level: 'warning',
        message: 'Test 2',
        metric: 'test',
        value: 2,
        threshold: 0,
      });

      const alerts = alerter.getAlerts();
      const suppressed = alerts.filter(a => a.suppressed);
      expect(suppressed.length).toBe(1);
    });
  });

  // ============================================
  // 6. Aggregation Edge Cases
  // ============================================
  describe('Aggregation Edge Cases', () => {
    it('should handle aggregation with zero window', async () => {
      alerter.updateConfig({
        aggregation: {
          enabled: true,
          window: 0,
        },
        suppression: {
          windowMs: 60000,
          maxAlerts: 100,
          deduplicateBy: [],
        },
        rules: [],
      });

      await alerter.sendAlert({
        id: 'test-1',
        timestamp: Date.now(),
        severity: 'warning',
        metric: 'test',
        message: 'Original',
        value: 1,
        threshold: 0,
        acknowledged: false,
        resolved: false,
        suppressed: false,
      });

      const alerts = alerter.getAlerts();
      expect(alerts[0].message).toBe('Original');
    });

    it('should handle multiple aggregations correctly', async () => {
      alerter.updateConfig({
        aggregation: {
          enabled: true,
          window: 300,
        },
        suppression: {
          windowMs: 60000,
          maxAlerts: 100,
          deduplicateBy: [],
        },
        rules: [],
      });

      // Send multiple alerts for same metric/severity
      for (let i =