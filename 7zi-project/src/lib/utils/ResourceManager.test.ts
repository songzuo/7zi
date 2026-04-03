/**
 * ResourceManager Tests
 */

import { ResourceManager, Disposable } from './ResourceManager';

describe('ResourceManager', () => {
  let manager: ResourceManager;

  beforeEach(() => {
    // 禁用退出时自动清理，避免测试间干扰
    manager = new ResourceManager({ name: 'TestManager', cleanupOnExit: false });
  });

  afterEach(async () => {
    await manager.dispose();
  });

  describe('基本功能', () => {
    test('should create manager with default options', () => {
      const defaultManager = new ResourceManager();
      expect(defaultManager).toBeDefined();
      expect(defaultManager.size).toBe(0);
    });

    test('should create manager with custom name', () => {
      const namedManager = new ResourceManager({ name: 'CustomManager' });
      expect(namedManager).toBeDefined();
    });

    test('should register disposable resource', () => {
      const resource: Disposable = {
        dispose: jest.fn(),
      };

      const returned = manager.register(resource);
      
      expect(returned).toBe(resource);
      expect(manager.size).toBe(1);
    });

    test('should register cleanup function', () => {
      const cleanup = jest.fn();
      const unregister = manager.registerCleanup(cleanup);
      
      expect(typeof unregister).toBe('function');
      expect(manager.size).toBe(1);
    });

    test('should unregister resource by id', () => {
      const resource: Disposable = {
        dispose: jest.fn(),
      };

      manager.register(resource);
      const ids = manager.getResourceIds();
      expect(ids.length).toBe(1);
      
      const result = manager.unregister(ids[0]);
      expect(result).toBe(true);
      expect(manager.size).toBe(0);
    });

    test('should return false when unregistering non-existent id', () => {
      const result = manager.unregister('non-existent-id');
      expect(result).toBe(false);
    });
  });

  describe('dispose 行为', () => {
    test('should call dispose on all registered resources', async () => {
      const resource1: Disposable = { dispose: jest.fn() };
      const resource2: Disposable = { dispose: jest.fn() };

      manager.register(resource1);
      manager.register(resource2);

      await manager.dispose();

      expect(resource1.dispose).toHaveBeenCalled();
      expect(resource2.dispose).toHaveBeenCalled();
      expect(manager.isDisposed()).toBe(true);
    });

    test('should call cleanup functions', async () => {
      const cleanup1 = jest.fn();
      const cleanup2 = jest.fn();

      manager.registerCleanup(cleanup1);
      manager.registerCleanup(cleanup2);

      await manager.dispose();

      expect(cleanup1).toHaveBeenCalled();
      expect(cleanup2).toHaveBeenCalled();
    });

    test('should handle async dispose', async () => {
      const resource: Disposable = {
        dispose: jest.fn().mockResolvedValue(undefined),
      };

      manager.register(resource);

      await manager.dispose();

      expect(resource.dispose).toHaveBeenCalled();
    });

    test('should handle dispose errors gracefully', async () => {
      const errorResource: Disposable = {
        dispose: jest.fn().mockImplementation(() => {
          throw new Error('Dispose error');
        }),
      };
      const goodResource: Disposable = {
        dispose: jest.fn(),
      };

      manager.register(errorResource);
      manager.register(goodResource);

      // 不应该抛出错误
      await manager.dispose();

      expect(goodResource.dispose).toHaveBeenCalled();
    });

    test('should handle async dispose errors', async () => {
      const errorResource: Disposable = {
        dispose: jest.fn().mockRejectedValue(new Error('Async error')),
      };

      manager.register(errorResource);

      // 不应该抛出错误
      await manager.dispose();

      expect(errorResource.dispose).toHaveBeenCalled();
    });

    test('should be idempotent', async () => {
      const resource: Disposable = { dispose: jest.fn() };
      manager.register(resource);

      await manager.dispose();
      await manager.dispose(); // 第二次调用不应该报错

      expect(resource.dispose).toHaveBeenCalledTimes(1);
    });

    test('should warn when registering after dispose', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const resource: Disposable = { dispose: jest.fn() };
      manager.register(resource);
      
      manager.dispose().then(() => {
        const newResource: Disposable = { dispose: jest.fn() };
        manager.register(newResource);
        
        expect(warnSpy).toHaveBeenCalled();
        warnSpy.mockRestore();
      });
    });
  });

  describe('资源清理顺序', () => {
    test('should cleanup in reverse order', async () => {
      const order: number[] = [];

      manager.registerCleanup(() => { order.push(1); });
      manager.registerCleanup(() => { order.push(2); });
      manager.registerCleanup(() => { order.push(3); });

      await manager.dispose();

      // 后注册的先清理
      expect(order).toEqual([3, 2, 1]);
    });
  });

  describe('状态查询', () => {
    test('should return correct size', () => {
      expect(manager.size).toBe(0);

      manager.register({ dispose: jest.fn() });
      expect(manager.size).toBe(1);

      manager.registerCleanup(() => {});
      expect(manager.size).toBe(2);
    });

    test('should return resource ids', () => {
      manager.register({ dispose: jest.fn() });
      manager.registerCleanup(() => {});

      const ids = manager.getResourceIds();
      expect(ids.length).toBe(2);
      expect(ids[0]).toMatch(/^res_/);
    });

    test('should check disposed state', async () => {
      expect(manager.isDisposed()).toBe(false);
      
      await manager.dispose();
      
      expect(manager.isDisposed()).toBe(true);
    });
  });

  describe('注销函数', () => {
    test('should return unregister function', () => {
      const cleanup = jest.fn();
      const unregister = manager.registerCleanup(cleanup);
      
      expect(manager.size).toBe(1);
      
      unregister();
      
      expect(manager.size).toBe(0);
    });

    test('unregister function should prevent cleanup call', async () => {
      const cleanup = jest.fn();
      const unregister = manager.registerCleanup(cleanup);
      
      unregister();
      await manager.dispose();
      
      expect(cleanup).not.toHaveBeenCalled();
    });
  });

  describe('边界情况', () => {
    test('should handle empty manager dispose', async () => {
      await manager.dispose();
      expect(manager.isDisposed()).toBe(true);
    });

    test('should handle resources with both sync and async cleanup', async () => {
      const syncResource: Disposable = { dispose: jest.fn() };
      const asyncResource: Disposable = {
        dispose: jest.fn().mockResolvedValue(undefined),
      };

      manager.register(syncResource);
      manager.register(asyncResource);

      await manager.dispose();

      expect(syncResource.dispose).toHaveBeenCalled();
      expect(asyncResource.dispose).toHaveBeenCalled();
    });
  });
});
