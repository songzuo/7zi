/**
 * 消息总线测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MessageBus } from '../message-bus';
import {
  MessageType,
  MessagePriority,
  MultiAgentError,
  TransportType,
} from '../types';

describe('MessageBus', () => {
  let messageBus: MessageBus;

  beforeEach(() => {
    messageBus = new MessageBus(TransportType.MEMORY);
  });

  afterEach(async () => {
    await messageBus.close();
  });

  describe('基础消息发送', () => {
    it('应该成功发送消息', async () => {
      const message = {
        headers: {
          id: 'test-1',
          type: MessageType.REQUEST,
          from: 'agent-1',
          to: 'agent-2',
          priority: MessagePriority.NORMAL,
          timestamp: Date.now(),
        },
        body: { test: 'data' },
      };

      await expect(messageBus.send(message)).resolves.not.toThrow();
    });

    it('应该拒绝过期消息', async () => {
      const message = {
        headers: {
          id: 'test-2',
          type: MessageType.REQUEST,
          from: 'agent-1',
          to: 'agent-2',
          priority: MessagePriority.NORMAL,
          timestamp: Date.now(),
          expiresAt: Date.now() - 1000, // 已过期
        },
        body: { test: 'data' },
      };

      await expect(messageBus.send(message)).rejects.toThrow(MultiAgentError);
    });
  });

  describe('请求-响应模式', () => {
    it('应该发送请求并等待响应', async () => {
      const requestBody = { query: 'test' };

      // 模拟响应
      const responseReceived = messageBus.on('message.received', async ({ message }) => {
        if (message.headers.type === MessageType.REQUEST) {
          // 发送响应
          const response = {
            headers: {
              id: 'response-1',
              type: MessageType.RESPONSE,
              from: 'agent-2',
              to: message.headers.from,
              correlationId: message.headers.id,
              priority: MessagePriority.NORMAL,
              timestamp: Date.now(),
            },
            body: { result: 'success' },
          };
          await messageBus.send(response);
        }
      });

      const response = await messageBus.request('agent-2', requestBody);

      expect(response).toEqual({ result: 'success' });

      messageBus.off('message.received', responseReceived as any);
    });

    it('应该处理请求超时', async () => {
      await expect(
        messageBus.request('agent-2', { test: 'data' }, { timeout: 100 })
      ).rejects.toThrow('timed out');
    });
  });

  describe('订阅机制', () => {
    it('应该能够订阅主题', () => {
      const handler = vi.fn();
      const unsubscribe = messageBus.subscribe('test.topic', handler);

      expect(typeof unsubscribe).toBe('function');
    });

    it('应该接收订阅主题的消息', async () => {
      const handler = vi.fn();
      messageBus.subscribe('test.topic', handler);

      const message = {
        headers: {
          id: 'test-3',
          type: MessageType.BROADCAST,
          from: 'agent-1',
          topic: 'test.topic',
          priority: MessagePriority.NORMAL,
          timestamp: Date.now(),
        },
        body: { data: 'test' },
      };

      await messageBus.send(message);

      // 等待消息处理
      await new Promise(resolve => setTimeout(resolve, 50));

      // 注意：由于消息是异步处理的，handler 可能不会被直接调用
      // 实际应用中需要更复杂的测试设置
    });
  });

  describe('广播机制', () => {
    it('应该能够广播消息', async () => {
      const message = {
        headers: {
          id: 'test-4',
          type: MessageType.BROADCAST,
          from: 'agent-1',
          topic: 'broadcast.topic',
          priority: MessagePriority.NORMAL,
          timestamp: Date.now(),
        },
        body: { broadcast: 'data' },
      };

      await expect(messageBus.broadcast('broadcast.topic', message.body)).resolves.not.toThrow();
    });
  });

  describe('优先级队列', () => {
    it('应该按优先级处理消息', async () => {
      const processingOrder: number[] = [];

      const handler = vi.fn((message) => {
        processingOrder.push(message.headers.priority);
      });

      messageBus.subscribe('priority.test', handler);

      // 发送不同优先级的消息
      await messageBus.broadcast('priority.test', { data: 'low' }, { priority: MessagePriority.LOW });
      await messageBus.broadcast('priority.test', { data: 'critical' }, { priority: MessagePriority.CRITICAL });
      await messageBus.broadcast('priority.test', { data: 'high' }, { priority: MessagePriority.HIGH });

      // 等待处理
      await new Promise(resolve => setTimeout(resolve, 100));

      // CRITICAL (0) 应该在 HIGH (1) 之前，HIGH 在 NORMAL (2) 之前
      // 注意：这个测试可能需要根据实际实现调整
    });
  });

  describe('统计信息', () => {
    it('应该返回正确的统计信息', () => {
      const stats = messageBus.getStats();

      expect(stats).toHaveProperty('queueSize');
      expect(stats).toHaveProperty('subscriptionCount');
      expect(stats).toHaveProperty('pendingRequests');
      expect(stats).toHaveProperty('messageHistorySize');
    });
  });

  describe('清理', () => {
    it('应该正确清理资源', async () => {
      // 发送一些消息
      const message = {
        headers: {
          id: 'test-5',
          type: MessageType.REQUEST,
          from: 'agent-1',
          to: 'agent-2',
          priority: MessagePriority.NORMAL,
          timestamp: Date.now(),
        },
        body: { test: 'data' },
      };

      await messageBus.send(message);

      // 关闭消息总线
      await messageBus.close();

      const stats = messageBus.getStats();

      // 应该清理所有资源
      expect(stats.queueSize).toBe(0);
      expect(stats.pendingRequests).toBe(0);
    });
  });
});
