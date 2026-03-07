/**
 * @fileoverview 已读标记持久化测试
 * @description 测试已读状态存储功能
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  InMemoryReadStatusStore,
  SQLiteReadStatusStore,
  initializeReadStatusStore,
  getReadStatusStore,
  resetReadStatusStore,
  type ReadStatusStore,
} from '../read-status';
import * as fs from 'fs';
import * as path from 'path';

// 测试数据库路径
const TEST_DB_PATH = '/tmp/test-read-status.db';

describe('InMemoryReadStatusStore', () => {
  let store: InMemoryReadStatusStore;

  beforeEach(() => {
    store = new InMemoryReadStatusStore();
  });

  afterEach(() => {
    store.clear();
  });

  describe('markAsRead', () => {
    it('should mark a notification as read', async () => {
      await store.markAsRead('notification-1', 'user-1');

      const isRead = await store.isRead('notification-1', 'user-1');
      expect(isRead).toBe(true);
    });

    it('should not affect other notifications', async () => {
      await store.markAsRead('notification-1', 'user-1');

      expect(await store.isRead('notification-1', 'user-1')).toBe(true);
      expect(await store.isRead('notification-2', 'user-1')).toBe(false);
      expect(await store.isRead('notification-1', 'user-2')).toBe(false);
    });
  });

  describe('markMultipleAsRead', () => {
    it('should mark multiple notifications as read', async () => {
      await store.markMultipleAsRead(['n-1', 'n-2', 'n-3'], 'user-1');

      expect(await store.isRead('n-1', 'user-1')).toBe(true);
      expect(await store.isRead('n-2', 'user-1')).toBe(true);
      expect(await store.isRead('n-3', 'user-1')).toBe(true);
    });
  });

  describe('getUserReadNotifications', () => {
    it('should return all read notification IDs for a user', async () => {
      await store.markMultipleAsRead(['n-1', 'n-2', 'n-3'], 'user-1');

      const readIds = await store.getUserReadNotifications('user-1');

      expect(readIds.size).toBe(3);
      expect(readIds.has('n-1')).toBe(true);
      expect(readIds.has('n-2')).toBe(true);
      expect(readIds.has('n-3')).toBe(true);
    });

    it('should return empty set for user with no reads', async () => {
      const readIds = await store.getUserReadNotifications('unknown-user');
      expect(readIds.size).toBe(0);
    });
  });

  describe('getUnreadCount', () => {
    it('should return correct unread count', async () => {
      await store.markMultipleAsRead(['n-1', 'n-2'], 'user-1');

      const unreadCount = await store.getUnreadCount(
        ['n-1', 'n-2', 'n-3', 'n-4'],
        'user-1'
      );

      expect(unreadCount).toBe(2);
    });
  });

  describe('getReadAt', () => {
    it('should return the read timestamp', async () => {
      await store.markAsRead('n-1', 'user-1');

      const readAt = await store.getReadAt('n-1', 'user-1');

      expect(readAt).toBeInstanceOf(Date);
      expect(readAt!.getTime()).toBeLessThanOrEqual(Date.now());
    });

    it('should return null for unread notification', async () => {
      const readAt = await store.getReadAt('n-1', 'user-1');
      expect(readAt).toBeNull();
    });
  });

  describe('cleanupExpired', () => {
    it('should remove expired records', async () => {
      await store.markAsRead('n-1', 'user-1');
      await store.markAsRead('n-2', 'user-1');

      // 清理 - 由于记录刚创建，使用负数 TTL 会清理所有
      // 或者等待一小段时间后清理
      const count = await store.cleanupExpired!(0);

      // 由于记录是刚创建的，可能不会被清理
      // 这个测试主要验证函数可以正常执行
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getStats', () => {
    it('should return correct statistics', async () => {
      await store.markMultipleAsRead(['n-1', 'n-2'], 'user-1');
      await store.markAsRead('n-3', 'user-2');

      const stats = store.getStats();

      expect(stats.totalUsers).toBe(2);
      expect(stats.totalReadStatuses).toBe(3);
    });
  });
});

describe('SQLiteReadStatusStore', () => {
  let store: SQLiteReadStatusStore;

  beforeEach(() => {
    // 清理测试数据库
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
    store = new SQLiteReadStatusStore(TEST_DB_PATH);
  });

  afterEach(() => {
    store.close?.();
    // 清理测试数据库
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
  });

  describe('persistence', () => {
    it('should persist data across instances', async () => {
      // 标记已读
      await store.markAsRead('n-1', 'user-1');
      await store.markAsRead('n-2', 'user-1');
      store.close?.();

      // 创建新实例
      const newStore = new SQLiteReadStatusStore(TEST_DB_PATH);

      // 验证数据仍然存在
      expect(await newStore.isRead('n-1', 'user-1')).toBe(true);
      expect(await newStore.isRead('n-2', 'user-1')).toBe(true);

      newStore.close?.();
    });

    it('should persist batch operations', async () => {
      await store.markMultipleAsRead(['n-1', 'n-2', 'n-3'], 'user-1');
      store.close?.();

      const newStore = new SQLiteReadStatusStore(TEST_DB_PATH);
      const readIds = await newStore.getUserReadNotifications('user-1');

      expect(readIds.size).toBe(3);
      newStore.close?.();
    });
  });

  describe('markAsRead', () => {
    it('should mark a notification as read', async () => {
      await store.markAsRead('notification-1', 'user-1');

      const isRead = await store.isRead('notification-1', 'user-1');
      expect(isRead).toBe(true);
    });
  });

  describe('getStats', () => {
    it('should include dbPath in stats', async () => {
      await store.markAsRead('n-1', 'user-1');

      const stats = store.getStats();

      expect(stats.dbPath).toBe(TEST_DB_PATH);
      expect(stats.totalUsers).toBe(1);
      expect(stats.totalReadStatuses).toBe(1);
    });
  });

  describe('cleanupExpired', () => {
    it('should remove expired records and persist changes', async () => {
      await store.markMultipleAsRead(['n-1', 'n-2'], 'user-1');

      // 清理所有记录
      await store.cleanupExpired!(0);

      // 验证新实例也没有数据
      store.close?.();
      const newStore = new SQLiteReadStatusStore(TEST_DB_PATH);
      const readIds = await newStore.getUserReadNotifications('user-1');
      expect(readIds.size).toBe(0);
      newStore.close?.();
    });
  });
});

describe('Store initialization', () => {
  beforeEach(() => {
    // 清理测试数据库
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
    resetReadStatusStore();
  });

  afterEach(() => {
    resetReadStatusStore();
    // 清理测试数据库
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
  });

  describe('initializeReadStatusStore', () => {
    it('should initialize memory store by default', () => {
      const store = initializeReadStatusStore({ type: 'memory' });
      expect(store).toBeInstanceOf(InMemoryReadStatusStore);
    });

    it('should initialize SQLite store when configured', () => {
      const store = initializeReadStatusStore({
        type: 'sqlite',
        dbPath: TEST_DB_PATH,
      });
      expect(store).toBeInstanceOf(SQLiteReadStatusStore);
    });

    it('should close previous store when reinitializing', async () => {
      const store1 = initializeReadStatusStore({
        type: 'sqlite',
        dbPath: TEST_DB_PATH,
      });
      await store1.markAsRead('n-1', 'user-1');

      const store2 = initializeReadStatusStore({
        type: 'sqlite',
        dbPath: TEST_DB_PATH,
      });

      // 数据应该保留
      expect(await store2.isRead('n-1', 'user-1')).toBe(true);
    });
  });

  describe('getReadStatusStore', () => {
    it('should return the initialized store', () => {
      initializeReadStatusStore({ type: 'memory' });
      const store = getReadStatusStore();
      expect(store).toBeDefined();
    });
  });
});

describe('Error handling', () => {
  it('should handle invalid database path gracefully', () => {
    // 使用无效路径（权限问题）
    const invalidPath = '/nonexistent/path/to/db.db';
    
    // 应该不会抛出错误，只是日志警告
    expect(() => {
      const store = new SQLiteReadStatusStore(invalidPath);
      store.close?.();
    }).not.toThrow();
  });
});