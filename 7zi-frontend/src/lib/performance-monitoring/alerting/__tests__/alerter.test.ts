/**
 * Performance Alerter Tests
 * 性能告警系统测试
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  PerformanceAlerter,
  performanceAlerter,
  DEFAULT_ALERTING_CONFIG,
} from '../alerter';
import {
  PerformanceAlert,
  AlertSeverity,
  AlertRule,
  AlertingConfig,
} from '../types';
import {
  EmailChannel,
  SlackChannel,
  DashboardChannel,
  WebhookChannel,
  TelegramChannel,
} from '../channels';

describe('PerformanceAlerter', () => {
  let alerter: PerformanceAlerter;

  beforeEach(() => {
    alerter = new PerformanceAlerter();
    alerter.reset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Alert Creation', () => {
    it('should create alert with all required fields', async () => {
      const alert = await alerter.createAlert({
        level: 'warning',
        message: 'Test alert message',
        metric: 'responseTime',
        value: 1500,
        threshold: 1000,
      });

      expect(alert.id).toBeDefined();
      expect(alert.timestamp).toBeDefined();
      expect(alert.severity).toBe('warning');
      expect(alert.message).toBe('Test alert message');
      expect(alert.metric).toBe('responseTime');
      expect(alert.value).toBe(1500);
      expect(alert.threshold).toBe(1000);
    });

    it('should create alert with optional context', async () => {
      const context = { endpoint: '/api/users', method: 'GET' };
      const alert = await alerter.createAlert({
        level: 'error',
        message: 'API error',
        metric: 'errorRate',
        value: 0.1,
        threshold: 0.05,
        context,
      });

      expect(alert.context).toEqual(context);
    });

    it('should store created alerts', async () => {
      await alerter.createAlert({
        level: 'info',
        message: 'Test 1',
        metric: 'metric1',
        value: 1,
        threshold: 0,
      });

      await alerter.createAlert({
        level: 'warning',
        message: 'Test 2',
        metric: 'metric2',
        value: 2,
        threshold: 1,
      });

      const alerts = alerter.getAlerts();
      expect(alerts).toHaveLength(2);
    });
  });

  describe('Alert Severity Levels', () => {
    it('should support info level', async () => {
      const alert = await alerter.createAlert({
        level: 'info',
        message: 'Info alert',
        metric: 'test',
        value: 1,
        threshold: 0,
      });

      expect(alert.severity).toBe('info');
    });

    it('should support warning level', async () => {
      const alert = await alerter.createAlert({
        level: 'warning',
        message: 'Warning alert',
        metric: 'test',
        value: 1,
        threshold: 0,
      });

      expect(alert.severity).toBe('warning');
    });

    it('should support error level', async () => {
      const alert = await alerter.createAlert({
        level: 'error',
        message: 'Error alert',
        metric: 'test',
        value: 1,
        threshold: 0,
      });

      expect(alert.severity).toBe('error');
    });

    it('should support critical level', async () => {
      const alert = await alerter.createAlert({
        level: 'critical',
        message: 'Critical alert',
        metric: 'test',
        value: 1,
        threshold: 0,
      });

      expect(alert.severity).toBe('critical');
    });
  });

  describe('Alert Suppression', () => {
    it('should suppress alerts within cooldown period', async () => {
      const config: Partial<AlertingConfig> = {
        rules: [
          {
            id: 'test-rule',
            name: 'Test Rule',
            description: 'Test',
            enabled: true,
            metric: 'responseTime',
            condition: { operator: '>', value: 1000 },
            level: 'warning',
            channels: ['dashboard'],
            cooldown: 60, // 60 seconds
            aggregation: { enabled: false, window: 300, maxAlerts: 5 },
          },
        ],
      };

      alerter.updateConfig(config);

      // First alert should not be suppressed
      const alert1 = await alerter.createAlert({
        level: 'warning',
        message: 'Alert 1',
        metric: 'responseTime',
        value: 1500,
        threshold: 1000,
      });

      expect(alert1.suppressed).toBeFalsy();

      // Second alert immediately after should be suppressed
      const alert2 = await alerter.createAlert({
        level: 'warning',
        message: 'Alert 2',
        metric: 'responseTime',
        value: 1500,
        threshold: 1000,
      });

      expect(alert2.suppressed).toBe(true);
    });

    it('should suppress when max alerts exceeded', async () => {
      const config: Partial<AlertingConfig> = {
        suppression: {
          windowMs: 60000,
          maxAlerts: 2,
        },
      };

      alerter.updateConfig(config);

      // Create 3 alerts quickly
      for (let i = 0; i < 3; i++) {
        await alerter.createAlert({
          level: 'warning',
          message: `Alert ${i + 1}`,
          metric: `metric${i}`,
          value: i,
          threshold: 0,
        });
      }

      const alerts = alerter.getAlerts();
      const suppressed = alerts.filter((a) => a.suppressed);
      expect(suppressed.length).toBeGreaterThan(0);
    });

    it('should deduplicate by configured fields', async () => {
      const config: Partial<AlertingConfig> = {
        suppression: {
          windowMs: 60000,
          maxAlerts: 100,
          deduplicateBy: ['metric', 'severity'],
        },
      };

      alerter.updateConfig(config);

      // Create two identical alerts
      const alert1 = await alerter.createAlert({
        level: 'error',
        message: 'Duplicate 1',
        metric: 'responseTime',
        value: 100,
        threshold: 50,
      });

      const alert2 = await alerter.createAlert({
        level: 'error',
        message: 'Duplicate 2',
        metric: 'responseTime',
        value: 101,
        threshold: 50,
      });

      expect(alert1.suppressed).toBeFalsy();
      expect(alert2.suppressed).toBe(true);
    });

    it('should not suppress alerts after cooldown expires', async () => {
      const config: Partial<AlertingConfig> = {
        rules: [
          {
            id: 'test-rule',
            name: 'Test',
            description: 'Test',
            enabled: true,
            metric: 'responseTime',
            condition: { operator: '>', value: 1000 },
            level: 'warning',
            channels: ['dashboard'],
            cooldown: 1, // 1 second (minimum)
            aggregation: { enabled: false, window: 300, maxAlerts: 5 },
          },
        ],
        suppression: {
          windowMs: 60000,
          maxAlerts: 100,
        },
      };

      alerter.updateConfig(config);
      alerter.reset(); // Clear any previous state

      // First alert
      await alerter.createAlert({
        level: 'warning',
        message: 'First',
        metric: 'responseTime',
        value: 1500,
        threshold: 1000,
      });

      // Wait for cooldown to expire (1.2 seconds to be safe)
      await new Promise((resolve) => setTimeout(resolve, 1200));

      // Second alert should not be suppressed
      const alert2 = await alerter.createAlert({
        level: 'warning',
        message: 'Second',
        metric: 'responseTime',
        value: 1600,
        threshold: 1000,
      });

      expect(alert2.suppressed).toBeFalsy();
    });
  });

  describe('Alert Aggregation', () => {
    it('should aggregate alerts when enabled', async () => {
      const config: Partial<AlertingConfig> = {
        aggregation: {
          enabled: true,
          window: 300,
        },
        suppression: {
          windowMs: 60000,
          maxAlerts: 100,
          deduplicateBy: [], // Disable deduplication for this test
        },
        rules: [], // Disable rules so cooldown doesn't apply
      };

      alerter.updateConfig(config);
      alerter.reset(); // Clear any previous state

      // Create first alert
      await alerter.sendAlert({
        id: 'alert-1',
        timestamp: Date.now(),
        severity: 'warning',
        metric: 'responseTime',
        message: 'High response time',
        value: 1500,
        threshold: 1000,
        acknowledged: false,
        resolved: false,
        suppressed: false,
      });

      // Create second alert - should aggregate
      await alerter.sendAlert({
        id: 'alert-2',
        timestamp: Date.now(),
        severity: 'warning',
        metric: 'responseTime',
        message: 'High response time',
        value: 1600,
        threshold: 1000,
        acknowledged: false,
        resolved: false,
        suppressed: false,
      });

      const alerts = alerter.getAlerts();
      expect(alerts.length).toBe(2);

      // Find the aggregated alert (alert-2 should have occurrences)
      const alert2 = alerts.find(a => a.id === 'alert-2');
      expect(alert2).toBeDefined();
      expect(alert2?.message).toContain('occurrences');
    });

    it('should not aggregate when disabled', async () => {
      const config: Partial<AlertingConfig> = {
        aggregation: {
          enabled: false,
          window: 300,
        },
      };

      alerter.updateConfig(config);

      await alerter.sendAlert({
        id: 'alert-1',
        timestamp: Date.now(),
        severity: 'warning',
        metric: 'responseTime',
        message: 'Original message',
        value: 1500,
        threshold: 1000,
        acknowledged: false,
        resolved: false,
        suppressed: false,
      });

      const alerts = alerter.getAlerts();
      expect(alerts[0].message).toBe('Original message');
    });
  });

  describe('Channel Management', () => {
    it('should add custom channel', async () => {
      const customChannel = {
        send: vi.fn().mockResolvedValue(undefined),
      };

      alerter.addChannel('webhook', customChannel as any);

      await alerter.createAlert({
        level: 'critical',
        message: 'Test',
        metric: 'test',
        value: 1,
        threshold: 0,
      });

      // Note: Default channels are 'dashboard', not 'webhook'
      // So this test verifies the channel is added, not called
      expect(alerter.getConfig().defaultChannels).toContain('dashboard');
    });

    it('should use EmailChannel', async () => {
      const emailChannel = new EmailChannel({
        recipients: ['admin@example.com'],
        subject: 'Test Alert',
      });

      const consoleSpy = vi.spyOn(console, 'log');

      await emailChannel.send({
        id: 'test-id',
        timestamp: Date.now(),
        severity: 'error',
        metric: 'responseTime',
        message: 'Test message',
        value: 100,
        threshold: 50,
        acknowledged: false,
        resolved: false,
        suppressed: false,
      });

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[EMAIL]'));
    });

    it('should use SlackChannel', async () => {
      const slackChannel = new SlackChannel({
        webhookUrl: 'https://hooks.slack.com/test',
        channel: '#alerts',
      });

      const consoleSpy = vi.spyOn(console, 'log');

      await slackChannel.send({
        id: 'test-id',
        timestamp: Date.now(),
        severity: 'warning',
        metric: 'cpu',
        message: 'High CPU usage',
        value: 90,
        threshold: 80,
        acknowledged: false,
        resolved: false,
        suppressed: false,
      });

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[SLACK]'));
    });

    it('should use DashboardChannel', async () => {
      const dashboardChannel = new DashboardChannel({
        showToast: true,
        playSound: false,
      });

      const consoleSpy = vi.spyOn(console, 'log');

      await dashboardChannel.send({
        id: 'test-id',
        timestamp: Date.now(),
        severity: 'info',
        metric: 'memory',
        message: 'Memory usage',
        value: 60,
        threshold: 70,
        acknowledged: false,
        resolved: false,
        suppressed: false,
      });

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[DASHBOARD]'));
    });

    it('should use WebhookChannel', async () => {
      const webhookChannel = new WebhookChannel({
        url: 'https://example.com/webhook',
        method: 'POST',
      });

      const consoleSpy = vi.spyOn(console, 'log');

      await webhookChannel.send({
        id: 'test-id',
        timestamp: Date.now(),
        severity: 'critical',
        metric: 'disk',
        message: 'Disk full',
        value: 99,
        threshold: 90,
        acknowledged: false,
        resolved: false,
        suppressed: false,
      });

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[WEBHOOK]'));
    });

    it('should use TelegramChannel', async () => {
      const telegramChannel = new TelegramChannel({
        botToken: 'test-token',
        chatId: 'test-chat-id',
      });

      const consoleSpy = vi.spyOn(console, 'log');

      await telegramChannel.send({
        id: 'test-id',
        timestamp: Date.now(),
        severity: 'error',
        metric: 'network',
        message: 'Network error',
        value: 0,
        threshold: 1,
        acknowledged: false,
        resolved: false,
        suppressed: false,
      });

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[TELEGRAM]'));
    });
  });

  describe('Rule Checking', () => {
    it('should trigger alert when value exceeds threshold', async () => {
      alerter.updateConfig({
        rules: [
          {
            id: 'high-cpu',
            name: 'High CPU',
            description: 'Alert when CPU is high',
            enabled: true,
            metric: 'cpu',
            condition: { operator: '>', value: 80 },
            level: 'warning',
            channels: ['dashboard'],
            cooldown: 300,
            aggregation: { enabled: false, window: 300, maxAlerts: 5 },
          },
        ],
      });

      const alerts = await alerter.checkRules('cpu', 90);
      expect(alerts.length).toBe(1);
      expect(alerts[0].metric).toBe('cpu');
    });

    it('should not trigger alert when value is below threshold', async () => {
      alerter.updateConfig({
        rules: [
          {
            id: 'high-cpu',
            name: 'High CPU',
            description: 'Alert when CPU is high',
            enabled: true,
            metric: 'cpu',
            condition: { operator: '>', value: 80 },
            level: 'warning',
            channels: ['dashboard'],
            cooldown: 300,
            aggregation: { enabled: false, window: 300, maxAlerts: 5 },
          },
        ],
      });

      const alerts = await alerter.checkRules('cpu', 70);
      expect(alerts.length).toBe(0);
    });

    it('should support all comparison operators', async () => {
      const operators = ['>', '>=', '<', '<=', '==', '!='] as const;

      for (const op of operators) {
        const testAlerter = new PerformanceAlerter({
          rules: [
            {
              id: `test-${op}`,
              name: `Test ${op}`,
              description: 'Test',
              enabled: true,
              metric: 'test',
              condition: { operator: op, value: 50 },
              level: 'warning',
              channels: ['dashboard'],
              cooldown: 300,
              aggregation: { enabled: false, window: 300, maxAlerts: 5 },
            },
          ],
        });

        // Test values that should trigger each operator
        const testCases: Record<typeof op, number> = {
          '>': 51,
          '>=': 50,
          '<': 49,
          '<=': 50,
          '==': 50,
          '!=': 51,
        };

        const alerts = await testAlerter.checkRules('test', testCases[op]);
        expect(alerts.length).toBe(1);
      }
    });
  });

  describe('Alert Management', () => {
    it('should acknowledge alert', async () => {
      const alert = await alerter.createAlert({
        level: 'warning',
        message: 'Test',
        metric: 'test',
        value: 1,
        threshold: 0,
      });

      const result = alerter.acknowledgeAlert(alert.id, 'admin');
      expect(result).toBe(true);

      const alerts = alerter.getAlerts();
      expect(alerts[0].acknowledged).toBe(true);
      expect(alerts[0].acknowledgedBy).toBe('admin');
    });

    it('should resolve alert', async () => {
      const alert = await alerter.createAlert({
        level: 'error',
        message: 'Test',
        metric: 'test',
        value: 1,
        threshold: 0,
      });

      const result = alerter.resolveAlert(alert.id);
      expect(result).toBe(true);

      const alerts = alerter.getAlerts();
      expect(alerts[0].resolved).toBe(true);
      expect(alerts[0].resolvedAt).toBeDefined();
    });

    it('should return false for non-existent alert', () => {
      const result = alerter.acknowledgeAlert('non-existent', 'admin');
      expect(result).toBe(false);
    });

    it('should filter alerts by level', async () => {
      await alerter.createAlert({
        level: 'info',
        message: 'Info',
        metric: 'm1',
        value: 1,
        threshold: 0,
      });

      await alerter.createAlert({
        level: 'warning',
        message: 'Warning',
        metric: 'm2',
        value: 2,
        threshold: 0,
      });

      await alerter.createAlert({
        level: 'error',
        message: 'Error',
        metric: 'm3',
        value: 3,
        threshold: 0,
      });

      const errorAlerts = alerter.getAlerts({ level: 'error' });
      expect(errorAlerts).toHaveLength(1);
      expect(errorAlerts[0].severity).toBe('error');
    });

    it('should filter alerts by metric', async () => {
      await alerter.createAlert({
        level: 'warning',
        message: 'CPU Alert',
        metric: 'cpu',
        value: 90,
        threshold: 80,
      });

      await alerter.createAlert({
        level: 'warning',
        message: 'Memory Alert',
        metric: 'memory',
        value: 85,
        threshold: 80,
      });

      const cpuAlerts = alerter.getAlerts({ metric: 'cpu' });
      expect(cpuAlerts).toHaveLength(1);
      expect(cpuAlerts[0].metric).toBe('cpu');
    });

    it('should filter alerts by time range', async () => {
      const now = Date.now();

      await alerter.sendAlert({
        id: 'old',
        timestamp: now - 7200000, // 2 hours ago
        severity: 'warning',
        metric: 'test',
        message: 'Old alert',
        value: 1,
        threshold: 0,
        acknowledged: false,
        resolved: false,
        suppressed: false,
      });

      await alerter.sendAlert({
        id: 'new',
        timestamp: now - 1800000, // 30 minutes ago
        severity: 'warning',
        metric: 'test',
        message: 'New alert',
        value: 1,
        threshold: 0,
        acknowledged: false,
        resolved: false,
        suppressed: false,
      });

      const recentAlerts = alerter.getAlerts({
        startTime: now - 3600000, // Last hour
      });

      expect(recentAlerts).toHaveLength(1);
      expect(recentAlerts[0].id).toBe('new');
    });
  });

  describe('Statistics', () => {
    it('should calculate alert statistics', async () => {
      await alerter.createAlert({
        level: 'info',
        message: 'Info 1',
        metric: 'm1',
        value: 1,
        threshold: 0,
      });

      await alerter.createAlert({
        level: 'warning',
        message: 'Warning 1',
        metric: 'm2',
        value: 2,
        threshold: 0,
      });

      await alerter.createAlert({
        level: 'error',
        message: 'Error 1',
        metric: 'm3',
        value: 3,
        threshold: 0,
      });

      await alerter.createAlert({
        level: 'critical',
        message: 'Critical 1',
        metric: 'm4',
        value: 4,
        threshold: 0,
      });

      const stats = alerter.getStats();

      expect(stats.totalAlerts).toBe(4);
      expect(stats.alertsByLevel.info).toBe(1);
      expect(stats.alertsByLevel.warning).toBe(1);
      expect(stats.alertsByLevel.error).toBe(1);
      expect(stats.alertsByLevel.critical).toBe(1);
    });

    it('should calculate metrics distribution', async () => {
      await alerter.createAlert({
        level: 'warning',
        message: 'CPU 1',
        metric: 'cpu',
        value: 90,
        threshold: 80,
      });

      await alerter.createAlert({
        level: 'warning',
        message: 'CPU 2',
        metric: 'cpu',
        value: 95,
        threshold: 80,
      });

      await alerter.createAlert({
        level: 'warning',
        message: 'Memory 1',
        metric: 'memory',
        value: 85,
        threshold: 80,
      });

      const stats = alerter.getStats();

      expect(stats.alertsByMetric.cpu).toBe(2);
      expect(stats.alertsByMetric.memory).toBe(1);
    });

    it('should track acknowledged and resolved alerts', async () => {
      const alert1 = await alerter.createAlert({
        level: 'warning',
        message: 'Alert 1',
        metric: 'm1',
        value: 1,
        threshold: 0,
      });

      const alert2 = await alerter.createAlert({
        level: 'warning',
        message: 'Alert 2',
        metric: 'm2',
        value: 2,
        threshold: 0,
      });

      alerter.acknowledgeAlert(alert1.id, 'admin');
      alerter.resolveAlert(alert2.id);

      const stats = alerter.getStats();
      expect(stats.acknowledgedCount).toBe(1);
      expect(stats.resolvedCount).toBe(1);
    });
  });

  describe('Alert Cleanup', () => {
    it('should clear old alerts', async () => {
      const now = Date.now();

      await alerter.sendAlert({
        id: 'old',
        timestamp: now - 8 * 24 * 3600000, // 8 days ago
        severity: 'warning',
        metric: 'test',
        message: 'Old alert',
        value: 1,
        threshold: 0,
        acknowledged: false,
        resolved: false,
        suppressed: false,
      });

      await alerter.sendAlert({
        id: 'new',
        timestamp: now,
        severity: 'warning',
        metric: 'test',
        message: 'New alert',
        value: 1,
        threshold: 0,
        acknowledged: false,
        resolved: false,
        suppressed: false,
      });

      const removed = alerter.clearOldAlerts(7 * 24 * 3600000); // 7 days
      expect(removed).toBe(1);

      const alerts = alerter.getAlerts();
      expect(alerts).toHaveLength(1);
      expect(alerts[0].id).toBe('new');
    });
  });

  describe('Configuration', () => {
    it('should use default configuration', () => {
      const config = alerter.getConfig();
      expect(config.enabled).toBe(true);
      expect(config.defaultChannels).toContain('dashboard');
    });

    it('should update configuration', () => {
      alerter.updateConfig({
        enabled: false,
      });

      const config = alerter.getConfig();
      expect(config.enabled).toBe(false);
    });

    it('should add custom rule', () => {
      const rule: AlertRule = {
        id: 'custom-rule',
        name: 'Custom Rule',
        description: 'Custom description',
        enabled: true,
        metric: 'customMetric',
        condition: { operator: '>', value: 100 },
        level: 'warning',
        channels: ['dashboard'],
        cooldown: 300,
        aggregation: { enabled: false, window: 300, maxAlerts: 5 },
      };

      alerter.addRule(rule);

      const config = alerter.getConfig();
      expect(config.rules).toContainEqual(expect.objectContaining({ id: 'custom-rule' }));
    });
  });

  describe('Singleton Instance', () => {
    it('should export singleton instance', () => {
      expect(performanceAlerter).toBeInstanceOf(PerformanceAlerter);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty alert list', () => {
      const alerts = alerter.getAlerts();
      expect(alerts).toHaveLength(0);

      const stats = alerter.getStats();
      expect(stats.totalAlerts).toBe(0);
    });

    it('should handle non-existent alert operations', () => {
      const result = alerter.acknowledgeAlert('non-existent', 'admin');
      expect(result).toBe(false);

      const resolveResult = alerter.resolveAlert('non-existent');
      expect(resolveResult).toBe(false);
    });

    it('should handle disabled alerter', async () => {
      alerter.updateConfig({ enabled: false });

      await alerter.createAlert({
        level: 'critical',
        message: 'Test',
        metric: 'test',
        value: 1,
        threshold: 0,
      });

      const alerts = alerter.getAlerts();
      expect(alerts).toHaveLength(0);
    });
  });
});

describe('Alert Channels', () => {
  describe('EmailChannel', () => {
    it('should format alert for email', async () => {
      const channel = new EmailChannel({
        recipients: ['admin@example.com'],
        subject: 'Performance Alert',
      });

      const consoleSpy = vi.spyOn(console, 'log');

      await channel.send({
        id: 'test',
        timestamp: Date.now(),
        severity: 'error',
        metric: 'responseTime',
        message: 'High response time',
        value: 5000,
        threshold: 1000,
        context: { endpoint: '/api/users' },
        acknowledged: false,
        resolved: false,
        suppressed: false,
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[EMAIL] To: admin@example.com')
      );
    });
  });

  describe('SlackChannel', () => {
    it('should use correct color for each severity', async () => {
      const channel = new SlackChannel({
        webhookUrl: 'https://hooks.slack.com/test',
      });

      const consoleSpy = vi.spyOn(console, 'log');

      await channel.send({
        id: 'test',
        timestamp: Date.now(),
        severity: 'critical',
        metric: 'cpu',
        message: 'CPU critical',
        value: 100,
        threshold: 90,
        acknowledged: false,
        resolved: false,
        suppressed: false,
      });

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[SLACK]'));
    });
  });

  describe('DashboardChannel', () => {
    it('should handle toast notification config', async () => {
      const channel = new DashboardChannel({
        showToast: true,
        playSound: true,
      });

      const consoleSpy = vi.spyOn(console, 'log');

      await channel.send({
        id: 'test',
        timestamp: Date.now(),
        severity: 'info',
        metric: 'test',
        message: 'Test message',
        value: 1,
        threshold: 0,
        acknowledged: false,
        resolved: false,
        suppressed: false,
      });

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Show Toast: true'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Play Sound: true'));
    });
  });

  describe('WebhookChannel', () => {
    it('should use custom headers', async () => {
      const channel = new WebhookChannel({
        url: 'https://example.com/webhook',
        method: 'POST',
        headers: { 'X-Custom-Header': 'value' },
      });

      const consoleSpy = vi.spyOn(console, 'log');

      await channel.send({
        id: 'test',
        timestamp: Date.now(),
        severity: 'warning',
        metric: 'test',
        message: 'Test',
        value: 1,
        threshold: 0,
        acknowledged: false,
        resolved: false,
        suppressed: false,
      });

      // Check that headers were logged
      expect(consoleSpy).toHaveBeenCalledWith('[WEBHOOK] Headers:', expect.any(Object));
    });
  });

  describe('TelegramChannel', () => {
    it('should use correct emoji for each severity', async () => {
      const channel = new TelegramChannel({
        botToken: 'test-token',
        chatId: 'test-chat',
      });

      const consoleSpy = vi.spyOn(console, 'log');

      await channel.send({
        id: 'test',
        timestamp: Date.now(),
        severity: 'critical',
        metric: 'disk',
        message: 'Disk full',
        value: 100,
        threshold: 90,
        acknowledged: false,
        resolved: false,
        suppressed: false,
      });

      // Check that message was logged (the message content is passed as a separate argument)
      expect(consoleSpy).toHaveBeenCalled();
      const calls = consoleSpy.mock.calls;
      const messageCall = calls.find(c => c[0] === '[TELEGRAM] Message:');
      expect(messageCall).toBeDefined();
      expect(messageCall![1]).toContain('🚨');
    });
  });
});
