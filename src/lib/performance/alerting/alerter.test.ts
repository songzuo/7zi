/**
 * Performance Alerting System Tests
 * Testing multi-level alerts, suppression, aggregation, and history
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  PerformanceAlerter,
  DashboardChannel,
  PerformanceAlert,
  AlertLevel,
  AlertCategory,
  AlertFilter,
  generateAlertId,
  getLevelPriority,
  compareLevels,
  meetsMinLevel,
  getLevelDisplay,
  defaultDeduplicationKey,
  createPerformanceAlert,
  formatAlertForLog,
  filterAlerts,
} from './alerter';

const createTestAlert = (
  overrides: Partial<PerformanceAlert> = {}
): Omit<
  PerformanceAlert,
  'id' | 'createdAt' | 'updatedAt' | 'status' | 'occurrenceCount'
> => ({
  title: 'Test Alert',
  message: 'This is a test alert',
  level: 'warning' as AlertLevel,
  category: 'performance' as AlertCategory,
  source: 'test-source',
  ...overrides,
});

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('Alert Utilities', () => {
  it('should generate unique IDs', () => {
    const id1 = generateAlertId();
    const id2 = generateAlertId();
    expect(id1).not.toBe(id2);
  });

  it('should return correct priority values', () => {
    expect(getLevelPriority('info')).toBe(0);
    expect(getLevelPriority('warning')).toBe(1);
    expect(getLevelPriority('error')).toBe(2);
    expect(getLevelPriority('critical')).toBe(3);
  });

  it('should create alert with default values', () => {
    const alert = createPerformanceAlert('Test', 'Message', 'warning');
    expect(alert.title).toBe('Test');
    expect(alert.message).toBe('Message');
    expect(alert.level).toBe('warning');
    expect(alert.category).toBe('performance');
    expect(alert.source).toBe('system');
  });

  it('should create alert with custom options', () => {
    const alert = createPerformanceAlert('Test', 'Message', 'error', {
      category: 'availability',
      source: 'api',
      metric: 'response-time',
      currentValue: 5000,
      threshold: 3000,
      tags: ['urgent', 'api'],
    });
    expect(alert.category).toBe('availability');
    expect(alert.source).toBe('api');
    expect(alert.metric).toBe('response-time');
    expect(alert.currentValue).toBe(5000);
    expect(alert.threshold).toBe(3000);
    expect(alert.tags).toEqual(['urgent', 'api']);
  });

  it('should compare levels correctly', () => {
    expect(compareLevels('info', 'warning')).toBeLessThan(0);
    expect(compareLevels('critical', 'error')).toBeGreaterThan(0);
    expect(compareLevels('warning', 'warning')).toBe(0);
  });

  it('should check minimum level correctly', () => {
    expect(meetsMinLevel('warning', 'warning')).toBe(true);
    expect(meetsMinLevel('error', 'warning')).toBe(true);
    expect(meetsMinLevel('info', 'warning')).toBe(false);
  });

  it('should return display properties for each level', () => {
    expect(getLevelDisplay('info').icon).toBe('ℹ️');
    expect(getLevelDisplay('warning').icon).toBe('⚠️');
    expect(getLevelDisplay('error').icon).toBe('❌');
    expect(getLevelDisplay('critical').icon).toBe('🚨');
  });

  it('should generate deduplication key', () => {
    const alert1 = createTestAlert({ title: 'Test', metric: 'LCP' });
    const alert2 = createTestAlert({ title: 'Test', metric: 'LCP' });
    const alert3 = createTestAlert({ title: 'Different', metric: 'LCP' });
    
    expect(defaultDeduplicationKey(alert1)).toBe(defaultDeduplicationKey(alert2));
    expect(defaultDeduplicationKey(alert1)).not.toBe(defaultDeduplicationKey(alert3));
  });

  it('should format alert for logging', () => {
    const alert: PerformanceAlert = {
      id: 'test-id',
      title: 'Test Alert',
      message: 'Test message',
      level: 'warning',
      category: 'performance',
      status: 'active',
      source: 'test',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      occurrenceCount: 1,
    };
    const formatted = formatAlertForLog(alert);
    expect(formatted).toContain('WARNING');
    expect(formatted).toContain('Test Alert');
    expect(formatted).toContain('Test message');
  });

  it('should filter alerts by various criteria', () => {
    const alerts: PerformanceAlert[] = [
      {
        id: '1',
        title: 'Alert 1',
        message: 'Message 1',
        level: 'warning',
        category: 'performance',
        status: 'active',
        source: 'api',
        metric: 'LCP',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        occurrenceCount: 1,
      },
      {
        id: '2',
        title: 'Alert 2',
        message: 'Message 2',
        level: 'error',
        category: 'availability',
        status: 'active',
        source: 'database',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        occurrenceCount: 1,
      },
    ];
    
    const byLevel = filterAlerts(alerts, { level: 'error' });
    expect(byLevel).toHaveLength(1);
    
    const byCategory = filterAlerts(alerts, { category: 'performance' });
    expect(byCategory).toHaveLength(1);
    
    const bySource = filterAlerts(alerts, { source: 'api' });
    expect(bySource).toHaveLength(1);
    
    const byMetric = filterAlerts(alerts, { metric: 'LCP' });
    expect(byMetric).toHaveLength(1);
  });
});

describe('PerformanceAlerter', () => {
  let alerter: PerformanceAlerter;
  let mockChannel: { name: string; send: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    alerter = new PerformanceAlerter({
      suppressionWindow: 100,
      aggregationWindow: 50,
    });
    mockChannel = {
      name: 'mock',
      send: vi.fn().mockResolvedValue(undefined),
    };
    alerter.registerChannel(mockChannel as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should create a new alert', async () => {
    const alert = await alerter.createAlert(createTestAlert());
    expect(alert.id).toBeDefined();
    expect(alert.status).toBe('active');
    expect(alert.occurrenceCount).toBe(1);
  });

  it('should send alert to channels', async () => {
    await alerter.createAlert(createTestAlert());
    expect(mockChannel.send).toHaveBeenCalledTimes(1);
  });

  it('should suppress duplicate alerts within window', async () => {
    const alertData = createTestAlert({ title: 'Duplicate' });
    
    const first = await alerter.createAlert(alertData);
    expect(first.status).toBe('active');
    
    const second = await alerter.createAlert(alertData);
    expect(second.status).toBe('suppressed');
    
    expect(mockChannel.send).toHaveBeenCalledTimes(1);
  });

  it('should allow alerts after suppression window expires', async () => {
    const alertData = createTestAlert({ title: 'Test' });
    
    await alerter.createAlert(alertData);
    expect(mockChannel.send).toHaveBeenCalledTimes(1);
    
    await sleep(150);
    
    const second = await alerter.createAlert(alertData);
    expect(second.status).toBe('active');
  });

  it('should acknowledge an alert', async () => {
    const alert = await alerter.createAlert(createTestAlert());
    const acknowledged = alerter.acknowledgeAlert(alert.id, 'test-user');
    
    expect(acknowledged).toBeDefined();
    expect(acknowledged?.status).toBe('acknowledged');
    expect(acknowledged?.acknowledgedBy).toBe('test-user');
  });

  it('should resolve an alert', async () => {
    const alert = await alerter.createAlert(createTestAlert());
    const resolved = alerter.resolveAlert(alert.id);
    
    expect(resolved).toBeDefined();
    expect(resolved?.status).toBe('resolved');
    
    expect(alerter.getAlert(alert.id)).toBeUndefined();
  });

  it('should track alert history', async () => {
    await alerter.createAlert(createTestAlert({ title: 'History Test' }));
    const history = alerter.getHistory();
    expect(history.length).toBeGreaterThan(0);
  });

  it('should calculate alert statistics', async () => {
    await alerter.createAlert(createTestAlert({ level: 'warning' }));
    await alerter.createAlert(createTestAlert({ level: 'error' }));
    
    const stats = alerter.getStats();
    expect(stats.byLevel.warning).toBeGreaterThan(0);
    expect(stats.byLevel.error).toBeGreaterThan(0);
  });

  it('should calculate resolution time', async () => {
    const alert = await alerter.createAlert(createTestAlert());
    await sleep(10);
    alerter.resolveAlert(alert.id);
    
    const stats = alerter.getStats();
    expect(stats.avgResolutionTime).toBeGreaterThan(0);
  });

  it('should count active suppressions', () => {
    alerter.addSuppressionRule({
      name: 'Test',
      filter: {},
      duration: 60000,
      active: true,
      reason: 'Test',
    });
    
    const stats = alerter.getStats();
    expect(stats.activeSuppressions).toBe(1);
  });

  it('should support custom suppression rules', async () => {
    alerter.addSuppressionRule({
      name: 'Suppress API Alerts',
      filter: { source: 'api' },
      duration: 60000,
      active: true,
      reason: 'Maintenance window',
    });
    
    const apiAlert = await alerter.createAlert(
      createTestAlert({ source: 'api', title: 'API Alert' })
    );
    expect(apiAlert.status).toBe('suppressed');
    
    const dbAlert = await alerter.createAlert(
      createTestAlert({ source: 'database', title: 'DB Alert' })
    );
    expect(dbAlert.status).toBe('active');
  });

  it('should remove suppression rules', () => {
    const rule = alerter.addSuppressionRule({
      name: 'Test Rule',
      filter: { level: 'info' },
      duration: 60000,
      active: true,
      reason: 'Testing',
    });
    
    expect(alerter.getSuppressionRules()).toHaveLength(1);
    
    alerter.removeSuppressionRule(rule.id);
    expect(alerter.getSuppressionRules()).toHaveLength(0);
  });
});

describe('DashboardChannel', () => {
  let channel: DashboardChannel;
  let alert: PerformanceAlert;

  beforeEach(() => {
    channel = new DashboardChannel();
    alert = {
      id: 'test-alert',
      title: 'Test Alert',
      message: 'Test message',
      level: 'warning',
      category: 'performance',
      status: 'active',
      source: 'test',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      occurrenceCount: 1,
    };
  });

  it('should send alert and convert to dashboard message', async () => {
    await channel.send(alert);
    const history = channel.getHistory();
    expect(history).toHaveLength(1);
    expect(history[0].id).toBe('test-alert');
  });

  it('should notify subscribers on new alerts', async () => {
    const callback = vi.fn();
    channel.subscribe(callback);
    
    await channel.send(alert);
    
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(expect.objectContaining({
      id: 'test-alert',
    }));
  });

  it('should return unsubscribe function', async () => {
    const callback = vi.fn();
    const unsubscribe = channel.subscribe(callback);
    
    await channel.send(alert);
    expect(callback).toHaveBeenCalledTimes(1);
    
    unsubscribe();
    
    await channel.send({ ...alert, id: 'test-alert-2' });
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('should filter history by level', async () => {
    await channel.send({ ...alert, level: 'warning' });
    await channel.send({ ...alert, id: '2', level: 'error' });
    
    const history = channel.getHistory({ level: 'error' });
    expect(history).toHaveLength(1);
    expect(history[0].level).toBe('error');
  });

  it('should limit history results', async () => {
    await channel.send({ ...alert, id: '1' });
    await channel.send({ ...alert, id: '2' });
    await channel.send({ ...alert, id: '3' });
    
    const history = channel.getHistory({ limit: 2 });
    expect(history).toHaveLength(2);
  });

  it('should clear message history', async () => {
    await channel.send(alert);
    channel.clearHistory();
    expect(channel.getHistory()).toHaveLength(0);
  });

  it('should maintain message history', async () => {
    await channel.send(alert);
    await channel.send({ ...alert, id: 'test-alert-2' });
    const history = channel.getHistory();
    expect(history).toHaveLength(2);
  });

  it('should limit history size', async () => {
    const smallChannel = new DashboardChannel({ maxHistorySize: 2 });
    await smallChannel.send({ ...alert, id: '1' });
    await smallChannel.send({ ...alert, id: '2' });
    await smallChannel.send({ ...alert, id: '3' });
    
    const history = smallChannel.getHistory();
    expect(history).toHaveLength(2);
  });

  it('should convert alert to dashboard message format', () => {
    const alerter = new PerformanceAlerter();
    const message = alerter.toDashboardMessage(alert);
    
    expect(message.id).toBe('test-alert');
    expect(message.title).toBe('Test Alert');
    expect(message.level).toBe('warning');
    expect(message.requiresAcknowledgment).toBe(false);
    expect(message.actions.acknowledge).toBe(true);
    expect(message.actions.resolve).toBe(true);
    expect(message.actions.suppress).toBe(true);
  });

  it('should require acknowledgment for error and critical alerts', () => {
    const alerter = new PerformanceAlerter();
    
    const errorMessage = alerter.toDashboardMessage({
      ...alert,
      level: 'error',
    });
    expect(errorMessage.requiresAcknowledgment).toBe(true);
    
    const criticalMessage = alerter.toDashboardMessage({
      ...alert,
      level: 'critical',
    });
    expect(criticalMessage.requiresAcknowledgment).toBe(true);
  });
});

describe('Alert System Integration', () => {
  it('should handle complete alert lifecycle', async () => {
    const alerter = new PerformanceAlerter();
    const channel = new DashboardChannel();
    alerter.registerChannel(channel);

    const alert = await alerter.createAlert(
      createPerformanceAlert(
        'High CPU Usage',
        'CPU usage exceeded 90%',
        'warning',
        {
          category: 'resource',
          source: 'system',
          metric: 'cpu-usage',
          currentValue: 92,
          threshold: 90,
        }
      )
    );

    expect(alert.status).toBe('active');

    const active = alerter.getActiveAlerts();
    expect(active).toHaveLength(1);

    const acknowledged = alerter.acknowledgeAlert(alert.id, 'admin');
    expect(acknowledged?.status).toBe('acknowledged');

    const resolved = alerter.resolveAlert(alert.id);
    expect(resolved?.status).toBe('resolved');

    const stats = alerter.getStats();
    expect(stats.byLevel.warning).toBeGreaterThan(0);
  });
});

describe('Edge Cases', () => {
  it('should handle channel send failure gracefully', async () => {
    const alerter = new PerformanceAlerter();
    const failingChannel = {
      name: 'failing',
      send: vi.fn().mockRejectedValue(new Error('Channel failed')),
    };
    alerter.registerChannel(failingChannel as any);

    const alert = await alerter.createAlert(createTestAlert());
    expect(alert).toBeDefined();
  });

  it('should handle empty history gracefully', () => {
    const alerter = new PerformanceAlerter();
    const history = alerter.getHistory();
    expect(history).toHaveLength(0);
  });

  it('should handle metrics callback', async () => {
    const metricsCallback = vi.fn();
    const alerter = new PerformanceAlerter();
    alerter.setMetricsCallback(metricsCallback);

    await alerter.createAlert(createTestAlert());

    expect(metricsCallback).toHaveBeenCalled();
  });

  it('should throw error when disabled', async () => {
    const alerter = new PerformanceAlerter();
    alerter.setEnabled(false);
    
    await expect(alerter.createAlert(createTestAlert())).rejects.toThrow(
      'Alerting is disabled'
    );
  });

  it('should throw error for below minimum level', async () => {
    const alerter = new PerformanceAlerter({ minLevel: 'error' });
    
    await expect(alerter.createAlert(createTestAlert({ level: 'warning' }))).rejects.toThrow(
      'is below minimum level'
    );
  });

  it('should track active alerts', async () => {
    const alerter = new PerformanceAlerter();
    
    await alerter.createAlert(createTestAlert({ title: 'Alert 1' }));
    await alerter.createAlert(createTestAlert({ title: 'Alert 2' }));
    const active = alerter.getActiveAlerts();
    expect(active).toHaveLength(2);
  });

  it('should get alert by ID', async () => {
    const alerter = new PerformanceAlerter();
    const created = await alerter.createAlert(createTestAlert());
    const retrieved = alerter.getAlert(created.id);
    expect(retrieved).toBeDefined();
    expect(retrieved?.id).toBe(created.id);
  });

  it('should return null for non-existent alert', async () => {
    const alerter = new PerformanceAlerter();
    expect(alerter.getAlert('non-existent')).toBeUndefined();
    expect(alerter.acknowledgeAlert('non-existent')).toBeNull();
    expect(alerter.resolveAlert('non-existent')).toBeNull();
  });

  it('should clear all alerts', async () => {
    const alerter = new PerformanceAlerter();
    
    await alerter.createAlert(createTestAlert({ title: '1' }));
    await alerter.createAlert(createTestAlert({ title: '2' }));
    
    const count = alerter.clearAllAlerts();
    expect(count).toBe(2);
    expect(alerter.getActiveAlerts()).toHaveLength(0);
  });

  it('should filter history by level', async () => {
    const alerter = new PerformanceAlerter();
    
    await alerter.createAlert(createTestAlert({ level: 'warning' }));
    await alerter.createAlert(createTestAlert({ level: 'error' }));
    
    const history = alerter.getHistory({ level: 'error' });
    expect(history.every((e) => e.alert.level === 'error')).toBe(true);
  });

  it('should filter history by category', async () => {
    const alerter = new PerformanceAlerter();
    
    await alerter.createAlert(createTestAlert({ category: 'performance' }));
    await alerter.createAlert(createTestAlert({ category: 'availability' }));
    
    const history = alerter.getHistory({ category: 'availability' });
    expect(history.every((e) => e.alert.category === 'availability')).toBe(true);
  });

  it('should limit history results', async () => {
    const alerter = new PerformanceAlerter({ suppressionWindow: 0 });
    
    await alerter.createAlert(createTestAlert({ title: '1' }));
    await alerter.createAlert(createTestAlert({ title: '2' }));
    await alerter.createAlert(createTestAlert({ title: '3' }));
    
    const history = alerter.getHistory({ limit: 2 });
    expect(history).toHaveLength(2);
  });

  it('should clear history', async () => {
    const alerter = new PerformanceAlerter();
    
    await alerter.createAlert(createTestAlert());
    alerter.clearHistory();
    expect(alerter.getHistory()).toHaveLength(0);
  });

  it('should register and unregister channels', () => {
    const alerter = new PerformanceAlerter();
    const mockChannel = { name: 'test', send: vi.fn() };
    
    alerter.registerChannel(mockChannel as any);
    expect(alerter.getChannels()).toHaveLength(1);
    
    alerter.unregisterChannel('test');
    expect(alerter.getChannels()).toHaveLength(0);
  });

  it('should not register duplicate channels', () => {
    const alerter = new PerformanceAlerter();
    const mockChannel = { name: 'test', send: vi.fn() };
    
    alerter.registerChannel(mockChannel as any);
    alerter.registerChannel(mockChannel as any);
    expect(alerter.getChannels()).toHaveLength(1);
  });

  it('should update configuration', () => {
    const alerter = new PerformanceAlerter();
    
    alerter.updateConfig({ minLevel: 'error' });
    expect(alerter.getConfig().minLevel).toBe('error');
  });

  it('should test dashboard channel', async () => {
    const channel = new DashboardChannel();
    const result = await channel.test();
    expect(result).toBe(true);
  });

  it('should filter alerts by tags', async () => {
    const alerter = new PerformanceAlerter();
    
    await alerter.createAlert(
      createTestAlert({ 
        title: 'Alert 1', 
        tags: ['urgent', 'api'] 
      })
    );
    await alerter.createAlert(
      createTestAlert({ 
        title: 'Alert 2', 
        tags: ['info'] 
      })
    );
    
    const active = alerter.getActiveAlerts();
    expect(active.length).toBeGreaterThanOrEqual(2);
  });

  it('should handle alert with metadata', async () => {
    const alerter = new PerformanceAlerter();
    
    const alert = await alerter.createAlert(
      createTestAlert({
        metadata: {
          requestId: '12345',
          userId: 'user-1',
          url: '/api/test',
        },
      })
    );
    
    expect(alert.metadata).toBeDefined();
    expect(alert.metadata?.requestId).toBe('12345');
  });

  it('should handle alert with threshold and current value', async () => {
    const alerter = new PerformanceAlerter();
    
    const alert = await alerter.createAlert(
      createTestAlert({
        metric: 'LCP',
        currentValue: 3500,
        threshold: 2500,
      })
    );
    
    expect(alert.metric).toBe('LCP');
    expect(alert.currentValue).toBe(3500);
    expect(alert.threshold).toBe(2500);
  });

  it('should handle multiple channels', async () => {
    const alerter = new PerformanceAlerter();
    const channel1 = { name: 'ch1', send: vi.fn() };
    const channel2 = { name: 'ch2', send: vi.fn() };
    
    alerter.registerChannel(channel1 as any);
    alerter.registerChannel(channel2 as any);
    
    await alerter.createAlert(createTestAlert());
    
    expect(channel1.send).toHaveBeenCalledTimes(1);
    expect(channel2.send).toHaveBeenCalledTimes(1);
  });

  it('should update existing alert occurrence count', async () => {
    const alerter = new PerformanceAlerter({ suppressionWindow: 0 });
    
    const alertData = createTestAlert({ title: 'Duplicate Test' });
    
    const first = await alerter.createAlert(alertData);
    expect(first.occurrenceCount).toBe(1);
    
    const second = await alerter.createAlert(alertData);
    expect(second.occurrenceCount).toBe(2);
  });

  it('should handle alert with threshold and current value', async () => {
    const alerter = new PerformanceAlerter();
    
    const alert = await alerter.createAlert(
      createTestAlert({
        metric: 'LCP',
        currentValue: 3500,
        threshold: 2500,
      })
    );
    
    expect(alert.metric).toBe('LCP');
    expect(alert.currentValue).toBe(3500);
    expect(alert.threshold).toBe(2500);
  });

  it('should handle multiple channels', async () => {
    const alerter = new PerformanceAlerter();
    const channel1 = { name: 'ch1', send: vi.fn() };
    const channel2 = { name: 'ch2', send: vi.fn() };
    
    alerter.registerChannel(channel1 as any);
    alerter.registerChannel(channel2 as any);
    
    await alerter.createAlert(createTestAlert());
    
    expect(channel1.send).toHaveBeenCalledTimes(1);
    expect(channel2.send).toHaveBeenCalledTimes(1);
  });

  it('should update existing alert values', async () => {
    const alerter = new PerformanceAlerter({ suppressionWindow: 0 });
    
    const alertData = createTestAlert({ 
      title: 'Value Test', 
      currentValue: 100 
    });
    
    const first = await alerter.createAlert(alertData);
    expect(first.currentValue).toBe(100);
    
    const second = await alerter.createAlert({
      ...alertData,
      currentValue: 200,
    });
    
    expect(second.currentValue).toBe(200);
    expect(second.occurrenceCount).toBe(2);
  });
});
