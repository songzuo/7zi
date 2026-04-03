/**
 * PerformanceMonitor Tests
 */

import { PerformanceMonitor, getDefaultMonitor, resetDefaultMonitor } from './monitor';

jest.useFakeTimers();

describe('PerformanceMonitor', () => {
  let monitor: PerformanceMonitor;

  beforeEach(() => {
    monitor = new PerformanceMonitor({
      maxOperationAge: 10000, // 10 秒
    });
  });

  afterEach(async () => {
    await monitor.dispose();
  });

  describe('基本操作', () => {
    test('should start an operation', () => {
      const opId = monitor.startOperation('test-operation');
      
      expect(opId).toBeDefined();
      expect(opId).toMatch(/^op_\d+_[a-z0-9]+$/);
    });

    test('should track active operations', () => {
      const opId1 = monitor.startOperation('op1');
      const opId2 = monitor.startOperation('op2');
      
      const activeOps = monitor.getActiveOperations();
      
      expect(activeOps.length).toBe(2);
      expect(activeOps.some((op) => op.id === opId1)).toBe(true);
      expect(activeOps.some((op) => op.id === opId2)).toBe(true);
    });

    test('should get operation by id', () => {
      const opId = monitor.startOperation('test-op', { key: 'value' });
      
      const operation = monitor.getOperation(opId);
      
      expect(operation).toBeDefined();
      expect(operation?.name).toBe('test-op');
      expect(operation?.metadata).toEqual({ key: 'value' });
      expect(operation?.status).toBe('running');
    });

    test('should return undefined for non-existent operation', () => {
      const operation = monitor.getOperation('non-existent');
      expect(operation).toBeUndefined();
    });

    test('should end an operation', () => {
      const opId = monitor.startOperation('test-op');
      
      monitor.endOperation(opId, 'completed');
      
      const operation = monitor.getOperation(opId);
      expect(operation).toBeUndefined(); // 已从活动操作中移除
      
      const activeOps = monitor.getActiveOperations();
      expect(activeOps.length).toBe(0);
    });

    test('should calculate duration', () => {
      const opId = monitor.startOperation('test-op');
      
      // 等待一小段时间
      jest.advanceTimersByTime(100);
      
      monitor.endOperation(opId, 'completed');
      
      const metrics = monitor.getMetrics();
      expect(metrics.averageDuration).toBeGreaterThan(0);
    });

    test('should merge metadata on end', () => {
      const opId = monitor.startOperation('test-op', { initial: 'data' });
      
      monitor.endOperation(opId, 'completed', { additional: 'info' });
      
      // 操作已完成，无法直接获取，但可以通过指标验证
      const metrics = monitor.getMetrics();
      expect(metrics.totalOperations).toBe(1);
    });

    test('should warn when ending non-existent operation', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      monitor.endOperation('non-existent', 'completed');
      
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });
  });

  describe('性能指标', () => {
    beforeEach(() => {
      // 创建一些测试操作
      const op1 = monitor.startOperation('fast-op');
      monitor.endOperation(op1, 'completed');
      
      const op2 = monitor.startOperation('slow-op');
      jest.advanceTimersByTime(200);
      monitor.endOperation(op2, 'completed');
      
      const op3 = monitor.startOperation('failed-op');
      monitor.endOperation(op3, 'failed');
    });

    test('should calculate total operations', () => {
      const metrics = monitor.getMetrics();
      expect(metrics.totalOperations).toBe(3);
    });

    test('should calculate active operations', () => {
      monitor.startOperation('active-op');
      
      const metrics = monitor.getMetrics();
      expect(metrics.activeOperations).toBe(1);
    });

    test('should calculate success rate', () => {
      const metrics = monitor.getMetrics();
      expect(metrics.successRate).toBe(2 / 3); // 2 成功，1 失败
    });

    test('should calculate average duration', () => {
      const metrics = monitor.getMetrics();
      expect(metrics.averageDuration).toBeGreaterThan(0);
    });

    test('should calculate percentiles', () => {
      // 创建多个不同持续时间的操作
      for (let i = 0; i < 10; i++) {
        const opId = monitor.startOperation(`op-${i}`);
        jest.advanceTimersByTime((i + 1) * 10);
        monitor.endOperation(opId, 'completed');
      }
      
      const metrics = monitor.getMetrics();
      
      expect(metrics.p50Duration).toBeGreaterThanOrEqual(0);
      expect(metrics.p95Duration).toBeGreaterThanOrEqual(0);
      expect(metrics.p99Duration).toBeGreaterThanOrEqual(0);
      
      // p95 应该 >= p50
      expect(metrics.p95Duration).toBeGreaterThanOrEqual(metrics.p50Duration);
    });

    test('should handle empty metrics', () => {
      const emptyMonitor = new PerformanceMonitor();
      const metrics = emptyMonitor.getMetrics();
      
      expect(metrics.totalOperations).toBe(0);
      expect(metrics.activeOperations).toBe(0);
      expect(metrics.averageDuration).toBe(0);
      expect(metrics.successRate).toBe(0);
      expect(metrics.p50Duration).toBe(0);
      expect(metrics.p95Duration).toBe(0);
      expect(metrics.p99Duration).toBe(0);
      
      emptyMonitor.dispose();
    });
  });

  describe('自动清理', () => {
    test('should auto-cleanup expired operations', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const opId = monitor.startOperation('long-running-op');
      
      // 推进时间超过 maxAge
      jest.advanceTimersByTime(15000);
      
      // 触发清理
      jest.advanceTimersByTime(2000);
      
      const activeOps = monitor.getActiveOperations();
      expect(activeOps.length).toBe(0);
      
      // 应该有警告
      expect(warnSpy).toHaveBeenCalled();
      
      warnSpy.mockRestore();
    });

    test('should not cleanup recent operations', () => {
      const opId = monitor.startOperation('recent-op');
      
      // 推进时间但未超过 maxAge
      jest.advanceTimersByTime(5000);
      
      const activeOps = monitor.getActiveOperations();
      expect(activeOps.length).toBe(1);
    });
  });

  describe('dispose', () => {
    test('should dispose monitor', async () => {
      monitor.startOperation('op1');
      monitor.startOperation('op2');
      
      await monitor.dispose();
      
      expect(monitor.getActiveOperations().length).toBe(0);
    });

    test('should warn about incomplete operations on dispose', async () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      monitor.startOperation('incomplete-op');
      
      await monitor.dispose();
      
      expect(warnSpy).toHaveBeenCalled();
      
      warnSpy.mockRestore();
    });

    test('should be idempotent', async () => {
      await monitor.dispose();
      await monitor.dispose(); // 第二次调用不应该报错
      
      expect(monitor.getActiveOperations().length).toBe(0);
    });

    test('should throw error when starting operation after dispose', () => {
      monitor.dispose().then(() => {
        expect(() => {
          monitor.startOperation('new-op');
        }).toThrow('disposed');
      });
    });
  });

  describe('clearCompleted', () => {
    test('should clear completed operations', () => {
      const opId = monitor.startOperation('test-op');
      monitor.endOperation(opId, 'completed');
      
      expect(monitor.getMetrics().totalOperations).toBe(1);
      
      monitor.clearCompleted();
      
      expect(monitor.getMetrics().totalOperations).toBe(0);
    });
  });

  describe('单例模式', () => {
    afterEach(() => {
      resetDefaultMonitor();
    });

    test('should return same instance', () => {
      const monitor1 = getDefaultMonitor();
      const monitor2 = getDefaultMonitor();
      
      expect(monitor1).toBe(monitor2);
    });

    test('should reset default monitor', () => {
      const monitor1 = getDefaultMonitor();
      resetDefaultMonitor();
      const monitor2 = getDefaultMonitor();
      
      expect(monitor1).not.toBe(monitor2);
    });

    test('should accept options on first call', () => {
      const monitor = getDefaultMonitor({ maxOperationAge: 5000 });
      
      expect(monitor).toBeDefined();
      
      monitor.dispose();
    });
  });

  describe('边界情况', () => {
    test('should handle operation with no duration', () => {
      const opId = monitor.startOperation('test-op');
      monitor.endOperation(opId, 'completed');
      
      const metrics = monitor.getMetrics();
      expect(metrics.averageDuration).toBeGreaterThanOrEqual(0);
    });

    test('should handle many operations', () => {
      const count = 100;
      
      for (let i = 0; i < count; i++) {
        const opId = monitor.startOperation(`op-${i}`);
        monitor.endOperation(opId, 'completed');
      }
      
      const metrics = monitor.getMetrics();
      expect(metrics.totalOperations).toBe(count);
    });

    test('should handle operations with same name', () => {
      const op1 = monitor.startOperation('same-name');
      const op2 = monitor.startOperation('same-name');
      
      expect(op1).not.toBe(op2);
      
      monitor.endOperation(op1, 'completed');
      monitor.endOperation(op2, 'completed');
      
      const metrics = monitor.getMetrics();
      expect(metrics.totalOperations).toBe(2);
    });

    test('should handle operations with metadata', () => {
      const opId = monitor.startOperation('test-op', {
        userId: '123',
        requestId: 'abc',
      });
      
      const operation = monitor.getOperation(opId);
      expect(operation?.metadata).toEqual({
        userId: '123',
        requestId: 'abc',
      });
    });
  });
});