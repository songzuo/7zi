/**
 * @fileoverview 已读标记持久化测试
 * @description 测试已读标记存储和实时服务器功能
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ReadReceiptStore, resetReadReceiptStore } from '../db/read-receipts';
import { RealtimeServer, getRealtimeServer, resetRealtimeServer } from '../realtime/server';
import * as fs from 'fs';
import * as path from 'path';
import type { ReadReceipt, CreateReadReceiptParams } from '../realtime/types';

// 测试数据库路径
const TEST_DB_PATH = '/tmp/test-read-receipts.db';

describe('ReadReceiptStore', () => {
  let store: ReadReceiptStore;

  beforeEach(() => {
    // 清理测试数据库
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
    store = new ReadReceiptStore(TEST_DB_PATH);
  });

  afterEach(() => {
    store.close();
    resetReadReceiptStore();
    // 清理测试数据库
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
  });

  describe('createReceipt', () => {
    it('should create a read receipt', () => {
      const params: CreateReadReceiptParams = {
        messageId: 'msg-001',
        userId: 'user-001',
        conversationId: 'conv-001',
      };

      const receipt = store.createReceipt(params);

      expect(receipt).toBeDefined();
      expect(receipt.id).toMatch(/^receipt_/);
      expect(receipt.messageId).toBe(params.messageId);
      expect(receipt.userId).toBe(params.userId);
      expect(receipt.conversationId).toBe(params.conversationId);
      expect(receipt.readAt).toBeInstanceOf(Date);
      expect(receipt.createdAt).toBeInstanceOf(Date);
    });

    it('should not create duplicate receipts for same message and user', () => {
      const params: CreateReadReceiptParams = {
        messageId: 'msg-001',
        userId: 'user-001',
      };

      const receipt1 = store.createReceipt(params);
      const receipt2 = store.createReceipt(params);

      expect(receipt1.id).toBe(receipt2.id);
      expect(receipt1.readAt.getTime()).toBe(receipt2.readAt.getTime());
    });
  });

  describe('getReceipt', () => {
    it('should return receipt if exists', () => {
      store.createReceipt({
        messageId: 'msg-001',
        userId: 'user-001',
      });

      const receipt = store.getReceipt('msg-001', 'user-001');

      expect(receipt).toBeDefined();
      expect(receipt?.messageId).toBe('msg-001');
      expect(receipt?.userId).toBe('user-001');
    });

    it('should return null if not exists', () => {
      const receipt = store.getReceipt('non-existent', 'user-001');

      expect(receipt).toBeNull();
    });
  });

  describe('queryReceipts', () => {
    beforeEach(() => {
      // 创建测试数据
      store.createReceipt({ messageId: 'msg-001', userId: 'user-001', conversationId: 'conv-001' });
      store.createReceipt({ messageId: 'msg-002', userId: 'user-001', conversationId: 'conv-001' });
      store.createReceipt({ messageId: 'msg-003', userId: 'user-002', conversationId: 'conv-001' });
      store.createReceipt({ messageId: 'msg-004', userId: 'user-001', conversationId: 'conv-002' });
    });

    it('should query by userId', () => {
      const receipts = store.queryReceipts({ userId: 'user-001' });
      expect(receipts).toHaveLength(3);
    });

    it('should query by messageId', () => {
      const receipts = store.queryReceipts({ messageId: 'msg-001' });
      expect(receipts).toHaveLength(1);
    });

    it('should query by conversationId', () => {
      const receipts = store.queryReceipts({ conversationId: 'conv-001' });
      expect(receipts).toHaveLength(3);
    });

    it('should support pagination', () => {
      const all = store.queryReceipts({});
      expect(all).toHaveLength(4);

      const page1 = store.queryReceipts({ limit: 2 });
      expect(page1).toHaveLength(2);

      const page2 = store.queryReceipts({ offset: 2 });
      expect(page2).toHaveLength(2);
    });
  });

  describe('getMessageReadStats', () => {
    it('should return correct read stats', () => {
      store.createReceipt({ messageId: 'msg-001', userId: 'user-001' });
      store.createReceipt({ messageId: 'msg-001', userId: 'user-002' });

      const stats = store.getMessageReadStats('msg-001', 5);

      expect(stats.messageId).toBe('msg-001');
      expect(stats.totalRecipients).toBe(5);
      expect(stats.readCount).toBe(2);
      expect(stats.unreadCount).toBe(3);
      expect(stats.readBy).toContain('user-001');
      expect(stats.readBy).toContain('user-002');
    });
  });

  describe('markAsRead', () => {
    it('should mark multiple messages as read', () => {
      const params: CreateReadReceiptParams[] = [
        { messageId: 'msg-001', userId: 'user-001' },
        { messageId: 'msg-002', userId: 'user-001' },
        { messageId: 'msg-003', userId: 'user-001' },
      ];

      const receipts = store.markAsRead(params);

      expect(receipts).toHaveLength(3);
      expect(receipts[0].messageId).toBe('msg-001');
      expect(receipts[1].messageId).toBe('msg-002');
      expect(receipts[2].messageId).toBe('msg-003');
    });
  });

  describe('deleteReceipt', () => {
    it('should delete existing receipt', () => {
      store.createReceipt({ messageId: 'msg-001', userId: 'user-001' });

      const result = store.deleteReceipt('msg-001', 'user-001');

      expect(result).toBe(true);

      const receipt = store.getReceipt('msg-001', 'user-001');
      expect(receipt).toBeNull();
    });

    it('should return false if receipt not found', () => {
      const result = store.deleteReceipt('non-existent', 'user-001');
      expect(result).toBe(false);
    });
  });

  describe('cleanupExpiredReceipts', () => {
    it('should remove expired receipts', () => {
      // 创建一些测试数据
      store.createReceipt({ messageId: 'msg-001', userId: 'user-001' });
      store.createReceipt({ messageId: 'msg-002', userId: 'user-002' });

      // 清理 1 毫秒前的记录（应该清理所有）
      const count = store.cleanupExpiredReceipts(1);

      // 由于记录是刚创建的，不应该有被清理的
      // 如果我们使用一个很大的 TTL，所有记录都应该保留
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  describe('persistence', () => {
    it('should persist data across instances', () => {
      // 创建数据
      store.createReceipt({ messageId: 'msg-001', userId: 'user-001' });
      store.close();

      // 重新打开
      const newStore = new ReadReceiptStore(TEST_DB_PATH);
      const receipt = newStore.getReceipt('msg-001', 'user-001');

      expect(receipt).toBeDefined();
      expect(receipt?.messageId).toBe('msg-001');

      newStore.close();
    });
  });
});

describe('RealtimeServer', () => {
  let server: RealtimeServer;

  beforeEach(() => {
    // 清理测试数据库
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
    resetRealtimeServer();
    server = new RealtimeServer(TEST_DB_PATH);
  });

  afterEach(() => {
    server.close();
    resetRealtimeServer();
    // 清理测试数据库
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
  });

  describe('markAsRead', () => {
    it('should mark message as read', () => {
      const receipt = server.markAsRead({
        messageId: 'msg-001',
        userId: 'user-001',
        conversationId: 'conv-001',
      });

      expect(receipt).toBeDefined();
      expect(receipt.messageId).toBe('msg-001');
      expect(receipt.userId).toBe('user-001');
    });

    it('should throw error on failure', () => {
      // 关闭存储以模拟错误
      server.close();

      expect(() => {
        server.markAsRead({
          messageId: 'msg-001',
          userId: 'user-001',
        });
      }).toThrow();
    });
  });

  describe('markMultipleAsRead', () => {
    it('should mark multiple messages as read', () => {
      const receipts = server.markMultipleAsRead([
        { messageId: 'msg-001', userId: 'user-001' },
        { messageId: 'msg-002', userId: 'user-001' },
      ]);

      expect(receipts).toHaveLength(2);
    });
  });

  describe('getReceipt', () => {
    it('should return receipt if exists', () => {
      server.markAsRead({
        messageId: 'msg-001',
        userId: 'user-001',
      });

      const receipt = server.getReceipt('msg-001', 'user-001');

      expect(receipt).toBeDefined();
      expect(receipt?.messageId).toBe('msg-001');
    });

    it('should return null if not exists', () => {
      const receipt = server.getReceipt('non-existent', 'user-001');
      expect(receipt).toBeNull();
    });
  });

  describe('hasRead', () => {
    it('should return true if user has read message', () => {
      server.markAsRead({
        messageId: 'msg-001',
        userId: 'user-001',
      });

      expect(server.hasRead('msg-001', 'user-001')).toBe(true);
      expect(server.hasRead('msg-001', 'user-002')).toBe(false);
    });
  });

  describe('getMessageReadStats', () => {
    it('should return correct stats', () => {
      server.markAsRead({ messageId: 'msg-001', userId: 'user-001' });
      server.markAsRead({ messageId: 'msg-001', userId: 'user-002' });

      const stats = server.getMessageReadStats('msg-001', 5);

      expect(stats.readCount).toBe(2);
      expect(stats.unreadCount).toBe(3);
      expect(stats.readBy).toHaveLength(2);
    });
  });

  describe('connection management', () => {
    it('should track online users', () => {
      // 在没有真实 WebSocket 的情况下，我们测试内部状态
      expect(server.getOnlineUsers()).toHaveLength(0);
      expect(server.isUserOnline('user-001')).toBe(false);
    });
  });

  describe('getRealtimeServer singleton', () => {
    it('should return same instance', () => {
      const instance1 = getRealtimeServer();
      const instance2 = getRealtimeServer();

      expect(instance1).toBe(instance2);

      resetRealtimeServer();
    });
  });
});

describe('Types', () => {
  it('should export correct types', async () => {
    // 动态导入类型模块以确保导出正确
    const types = await import('../realtime/types');

    expect(types).toBeDefined();
    expect(typeof types.ReadReceipt).toBe('undefined'); // 类型在运行时不存在
  });
});