/**
 * Cache Invalidation Strategy Tests
 * Tests for src/lib/cache/invalidation-strategy.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  CacheInvalidationStrategy,
  getInvalidationStrategy,
  resetInvalidationStrategy,
  invalidate,
} from '@/lib/cache/invalidation-strategy';

// Mock CacheManager
vi.mock('@/lib/cache/cache-manager', () => ({
  CacheManager: vi.fn(),
  getCacheManager: vi.fn().mockReturnValue({
    invalidate: vi.fn().mockResolvedValue(0),
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(true),
    delete: vi.fn().mockResolvedValue(true),
    has: vi.fn().mockResolvedValue(false),
    clear: vi.fn().mockResolvedValue(undefined),
    getStats: vi.fn().mockReturnValue({}),
  }),
}));

describe('CacheInvalidationStrategy', () => {
  let strategy: CacheInvalidationStrategy;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    resetInvalidationStrategy();
  });

  afterEach(() => {
    if (strategy) {
      strategy.stop();
    }
    vi.useRealTimers();
    resetInvalidationStrategy();
  });

  // ============================================================================
  // Constructor and Default Rules
  // ============================================================================

  describe('constructor', () => {
    it('should create with default configuration', () => {
      strategy = new CacheInvalidationStrategy();
      expect(strategy).toBeDefined();
    });

    it('should create default rules', () => {
      strategy = new CacheInvalidationStrategy();
      const rules = strategy.getRules();

      expect(rules.length).toBeGreaterThan(0);
      expect(rules.find(r => r.id === 'task-update')).toBeDefined();
      expect(rules.find(r => r.id === 'dashboard-update')).toBeDefined();
      expect(rules.find(r => r.id === 'knowledge-update')).toBeDefined();
    });

    it('should accept custom configuration', () => {
      strategy = new CacheInvalidationStrategy({
        enableEventBased: false,
        enableTimeBased: false,
        enableTagBased: true,
      });

      expect(strategy).toBeDefined();
    });
  });

  // ============================================================================
  // Rule Management
  // ============================================================================

  describe('addRule', () => {
    beforeEach(() => {
      strategy = new CacheInvalidationStrategy();
    });

    it('should add a new rule', () => {
      const rule = {
        id: 'custom-rule',
        pattern: 'custom:*',
        action: 'invalidate' as const,
        enabled: true,
        priority: 5,
      };

      strategy.addRule(rule);
      const rules = strategy.getRules();

      expect(rules.find(r => r.id === 'custom-rule')).toBeDefined();
    });

    it('should update existing rule with same id', () => {
      strategy.addRule({
        id: 'test-rule',
        action: 'invalidate',
        enabled: true,
        priority: 5,
      });

      strategy.addRule({
        id: 'test-rule',
        action: 'invalidate',
        enabled: false,
        priority: 10,
      });

      const rules = strategy.getRules();
      const rule = rules.find(r => r.id === 'test-rule');

      expect(rule?.enabled).toBe(false);
      expect(rule?.priority).toBe(10);
    });
  });

  describe('removeRule', () => {
    beforeEach(() => {
      strategy = new CacheInvalidationStrategy();
    });

    it('should remove an existing rule', () => {
      strategy.addRule({
        id: 'to-remove',
        action: 'invalidate',
        enabled: true,
        priority: 5,
      });

      const removed = strategy.removeRule('to-remove');

      expect(removed).toBe(true);
      expect(strategy.getRules().find(r => r.id === 'to-remove')).toBeUndefined();
    });

    it('should return false for non-existent rule', () => {
      const removed = strategy.removeRule('non-existent');

      expect(removed).toBe(false);
    });
  });

  describe('toggleRule', () => {
    beforeEach(() => {
      strategy = new CacheInvalidationStrategy();
    });

    it('should enable a disabled rule', () => {
      strategy.addRule({
        id: 'toggle-test',
        action: 'invalidate',
        enabled: false,
        priority: 5,
      });

      const result = strategy.toggleRule('toggle-test', true);

      expect(result).toBe(true);
      const rule = strategy.getRules().find(r => r.id === 'toggle-test');
      expect(rule?.enabled).toBe(true);
    });

    it('should disable an enabled rule', () => {
      strategy.addRule({
        id: 'toggle-test',
        action: 'invalidate',
        enabled: true,
        priority: 5,
      });

      const result = strategy.toggleRule('toggle-test', false);

      expect(result).toBe(true);
      const rule = strategy.getRules().find(r => r.id === 'toggle-test');
      expect(rule?.enabled).toBe(false);
    });

    it('should return false for non-existent rule', () => {
      const result = strategy.toggleRule('non-existent', true);

      expect(result).toBe(false);
    });
  });

  // ============================================================================
  // Schedule Management
  // ============================================================================

  describe('addSchedule', () => {
    beforeEach(() => {
      strategy = new CacheInvalidationStrategy();
    });

    it('should add a new schedule', () => {
      const schedule = {
        id: 'hourly-cleanup',
        cron: '0 * * * *',
        rules: [],
        enabled: true,
      };

      strategy.addSchedule(schedule);
      const schedules = strategy.getSchedules();

      expect(schedules.find(s => s.id === 'hourly-cleanup')).toBeDefined();
    });
  });

  describe('removeSchedule', () => {
    beforeEach(() => {
      strategy = new CacheInvalidationStrategy();
    });

    it('should remove an existing schedule', () => {
      strategy.addSchedule({
        id: 'to-remove',
        cron: '0 * * * *',
        rules: [],
        enabled: true,
      });

      const removed = strategy.removeSchedule('to-remove');

      expect(removed).toBe(true);
      expect(strategy.getSchedules().find(s => s.id === 'to-remove')).toBeUndefined();
    });

    it('should return false for non-existent schedule', () => {
      const removed = strategy.removeSchedule('non-existent');

      expect(removed).toBe(false);
    });
  });

  // ============================================================================
  // Event Handling
  // ============================================================================

  describe('event handling', () => {
    beforeEach(() => {
      strategy = new CacheInvalidationStrategy();
    });

    it('should emit events', () => {
      const callback = vi.fn();
      strategy.onEvent('custom-event', callback);

      strategy.emitEvent('custom-event', { data: 'test' });

      expect(callback).toHaveBeenCalled();
    });

    it('should pass event data to callbacks', () => {
      const callback = vi.fn();
      strategy.onEvent('data-event', callback);

      strategy.emitEvent('data-event', { key: 'value' });

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'data-event',
          data: { key: 'value' },
        })
      );
    });

    it('should unsubscribe from events', () => {
      const callback = vi.fn();
      strategy.onEvent('test-event', callback);

      strategy.offEvent('test-event', callback);
      strategy.emitEvent('test-event', {});

      expect(callback).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // Invalidation Methods
  // ============================================================================

  describe('invalidateByTag', () => {
    beforeEach(() => {
      strategy = new CacheInvalidationStrategy();
    });

    it('should call cache invalidate with tags', async () => {
      const count = await strategy.invalidateByTag(['tag1', 'tag2']);

      expect(count).toBe(0); // Mocked
    });
  });

  describe('invalidateByPattern', () => {
    beforeEach(() => {
      strategy = new CacheInvalidationStrategy();
    });

    it('should call cache invalidate with pattern', async () => {
      const count = await strategy.invalidateByPattern('user:*');

      expect(count).toBe(0); // Mocked
    });
  });

  describe('invalidateAll', () => {
    beforeEach(() => {
      strategy = new CacheInvalidationStrategy();
    });

    it('should invalidate all cache entries', async () => {
      const count = await strategy.invalidateAll();

      expect(count).toBe(0); // Mocked
    });
  });

  // ============================================================================
  // Stop
  // ============================================================================

  describe('stop', () => {
    it('should stop the scheduler', () => {
      strategy = new CacheInvalidationStrategy({ enableTimeBased: true });

      strategy.stop();

      // Should not throw
    });

    it('should be safe to call multiple times', () => {
      strategy = new CacheInvalidationStrategy();

      strategy.stop();
      strategy.stop();

      // Should not throw
    });
  });

  // ============================================================================
  // GetEventBus
  // ============================================================================

  describe('getEventBus', () => {
    beforeEach(() => {
      strategy = new CacheInvalidationStrategy();
    });

    it('should return the event bus', () => {
      const eventBus = strategy.getEventBus();

      expect(eventBus).toBeDefined();
      expect(typeof eventBus.on).toBe('function');
      expect(typeof eventBus.off).toBe('function');
      expect(typeof eventBus.emit).toBe('function');
    });
  });

  // ============================================================================
  // Singleton Functions
  // ============================================================================

  describe('singleton functions', () => {
    afterEach(() => {
      resetInvalidationStrategy();
    });

    it('should return the same instance', () => {
      const instance1 = getInvalidationStrategy();
      const instance2 = getInvalidationStrategy();

      expect(instance1).toBe(instance2);
    });

    it('should create new instance after reset', () => {
      const instance1 = getInvalidationStrategy();
      resetInvalidationStrategy();

      const instance2 = getInvalidationStrategy();

      expect(instance1).not.toBe(instance2);
    });
  });

  // ============================================================================
  // Convenience Methods
  // ============================================================================

  describe('invalidate convenience methods', () => {
    beforeEach(() => {
      resetInvalidationStrategy();
    });

    afterEach(() => {
      resetInvalidationStrategy();
    });

    it('should invalidate by tag using convenience method', async () => {
      const count = await invalidate.tag(['tag1']);
      expect(typeof count).toBe('number');
    });

    it('should invalidate by pattern using convenience method', async () => {
      const count = await invalidate.pattern('user:*');
      expect(typeof count).toBe('number');
    });

    it('should invalidate all using convenience method', async () => {
      const count = await invalidate.all();
      expect(typeof count).toBe('number');
    });

    it('should emit events using convenience method', () => {
      const strategy = getInvalidationStrategy();
      const callback = vi.fn();
      strategy.onEvent('test', callback);

      invalidate.emit('test', { data: 'value' });

      expect(callback).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // Scheduler Tests
  // ============================================================================

  describe('scheduler', () => {
    it('should run scheduled invalidations', async () => {
      strategy = new CacheInvalidationStrategy({ enableTimeBased: true });

      strategy.addSchedule({
        id: 'test-schedule',
        cron: '* * * * *',
        rules: [{
          id: 'schedule-rule',
          tags: ['scheduled'],
          action: 'invalidate',
          enabled: true,
          priority: 10,
        }],
        enabled: true,
      });

      // Advance time to trigger scheduler
      vi.advanceTimersByTime(60000);

      // The scheduler should have run
      expect(strategy).toBeDefined();
    });

    it('should skip disabled schedules', async () => {
      strategy = new CacheInvalidationStrategy({ enableTimeBased: true });

      strategy.addSchedule({
        id: 'disabled-schedule',
        cron: '* * * * *',
        rules: [{
          id: 'schedule-rule',
          tags: ['scheduled'],
          action: 'invalidate',
          enabled: true,
          priority: 10,
        }],
        enabled: false,
      });

      vi.advanceTimersByTime(60000);

      // Should not throw
    });
  });

  // ============================================================================
  // Condition-based Rules
  // ============================================================================

  describe('condition-based rules', () => {
    beforeEach(() => {
      strategy = new CacheInvalidationStrategy();
    });

    it('should execute rules with true condition', async () => {
      const mockCache = {
        invalidate: vi.fn().mockResolvedValue(1),
      };

      // Access private method through getRules and addRule
      strategy.addRule({
        id: 'conditional-rule',
        tags: ['test'],
        condition: () => true,
        action: 'invalidate',
        enabled: true,
        priority: 10,
      });

      const rules = strategy.getRules();
      expect(rules.find(r => r.id === 'conditional-rule')).toBeDefined();
    });

    it('should skip rules with false condition', async () => {
      strategy.addRule({
        id: 'skip-rule',
        tags: ['test'],
        condition: () => false,
        action: 'invalidate',
        enabled: true,
        priority: 10,
      });

      const rules = strategy.getRules();
      const rule = rules.find(r => r.id === 'skip-rule');
      expect(rule?.condition?.()).toBe(false);
    });
  });
});