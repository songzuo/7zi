/**
 * Webhook 系统测试
 * 7zi-frontend v1.12.2
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  webhookManager,
  WebhookManager,
  webhookDeliveryService,
  WebhookDeliveryService,
} from '@/lib/webhook';
import type {
  CreateWebhookInput,
  WebhookEvent,
  WebhookEventType,
} from '@/lib/webhook';

describe('Webhook 系统', () => {
  let manager: WebhookManager;
  let deliveryService: WebhookDeliveryService;

  beforeEach(() => {
    manager = new WebhookManager();
    deliveryService = new WebhookDeliveryService();
  });

  afterEach(() => {
    manager.clearEventQueue();
    manager.clearLogs();
    manager.clearSubscriptions();
    deliveryService.clearAllDeliveries();
  });

  describe('WebhookManager', () => {
    describe('订阅管理', () => {
      it('应该能够创建订阅', async () => {
        const input: CreateWebhookInput = {
          name: '测试订阅',
          url: 'https://example.com/webhook',
          events: ['workflow.started', 'workflow.completed'],
          isActive: true,
        };

        const subscription = await manager.createSubscription(input);

        expect(subscription).toBeDefined();
        expect(subscription.id).toBeDefined();
        expect(subscription.name).toBe(input.name);
        expect(subscription.url).toBe(input.url);
        expect(subscription.events).toEqual(input.events);
        expect(subscription.isActive).toBe(true);
        expect(subscription.status).toBe('active');
        expect(subscription.secret).toBeDefined();
      });

      it('应该能够更新订阅', async () => {
        const input: CreateWebhookInput = {
          name: '测试订阅',
          url: 'https://example.com/webhook',
          events: ['workflow.started'],
        };

        const subscription = await manager.createSubscription(input);

        const updated = await manager.updateSubscription(subscription.id, {
          name: '更新后的订阅',
          isActive: false,
        });

        expect(updated.name).toBe('更新后的订阅');
        expect(updated.isActive).toBe(false);
        expect(updated.status).toBe('inactive');
      });

      it('应该能够删除订阅', async () => {
        const input: CreateWebhookInput = {
          name: '测试订阅',
          url: 'https://example.com/webhook',
          events: ['workflow.started'],
        };

        const subscription = await manager.createSubscription(input);
        const deleted = await manager.deleteSubscription(subscription.id);

        expect(deleted).toBe(true);
        expect(manager.getSubscription(subscription.id)).toBeUndefined();
      });

      it('应该能够批量删除订阅', async () => {
        const input1: CreateWebhookInput = {
          name: '订阅1',
          url: 'https://example.com/webhook1',
          events: ['workflow.started'],
        };

        const input2: CreateWebhookInput = {
          name: '订阅2',
          url: 'https://example.com/webhook2',
          events: ['workflow.started'],
        };

        const sub1 = await manager.createSubscription(input1);
        const sub2 = await manager.createSubscription(input2);

        const result = await manager.batchDeleteSubscriptions([sub1.id, sub2.id]);

        expect(result.deleted).toHaveLength(2);
        expect(result.failed).toHaveLength(0);
      });

      it('应该能够批量更新状态', async () => {
        const input1: CreateWebhookInput = {
          name: '订阅1',
          url: 'https://example.com/webhook1',
          events: ['workflow.started'],
        };

        const input2: CreateWebhookInput = {
          name: '订阅2',
          url: 'https://example.com/webhook2',
          events: ['workflow.started'],
        };

        const sub1 = await manager.createSubscription(input1);
        const sub2 = await manager.createSubscription(input2);

        const updated = await manager.batchUpdateStatus([sub1.id, sub2.id], false);

        expect(updated).toHaveLength(2);
        expect(updated.every((s) => !s.isActive)).toBe(true);
      });
    });

    describe('事件触发', () => {
      it('应该能够触发事件', async () => {
        const input: CreateWebhookInput = {
          name: '测试订阅',
          url: 'https://example.com/webhook',
          events: ['workflow.started'],
        };

        await manager.createSubscription(input);

        const event: WebhookEvent = {
          id: 'evt_test',
          type: 'workflow.started',
          timestamp: new Date().toISOString(),
          source: 'test',
          data: {
            workflowId: 'wf_test',
            workflowName: '测试工作流',
            executionId: 'exec_test',
          },
        };

        const deliveries = await manager.triggerEvent(event);

        expect(deliveries).toHaveLength(1);
      });

      it('应该只触发订阅了该事件的订阅', async () => {
        const input1: CreateWebhookInput = {
          name: '订阅1',
          url: 'https://example.com/webhook1',
          events: ['workflow.started'],
        };

        const input2: CreateWebhookInput = {
          name: '订阅2',
          url: 'https://example.com/webhook2',
          events: ['workflow.completed'],
        };

        await manager.createSubscription(input1);
        await manager.createSubscription(input2);

        const event: WebhookEvent = {
          id: 'evt_test',
          type: 'workflow.started',
          timestamp: new Date().toISOString(),
          source: 'test',
          data: {
            workflowId: 'wf_test',
            workflowName: '测试工作流',
            executionId: 'exec_test',
          },
        };

        const deliveries = await manager.triggerEvent(event);

        expect(deliveries).toHaveLength(1);
      });
    });

    describe('签名验证', () => {
      it('应该能够生成签名', async () => {
        const payload = JSON.stringify({ test: 'data' });
        const timestamp = Date.now();
        const secret = 'test-secret';

        const signature = await manager.generateSignature(payload, timestamp, secret);

        expect(signature).toBeDefined();
        expect(signature).toMatch(/^sha256=[a-f0-9]{64}$/);
      });

      it('应该能够验证签名', async () => {
        const payload = JSON.stringify({ test: 'data' });
        const timestamp = Date.now();
        const secret = 'test-secret';

        const signature = await manager.generateSignature(payload, timestamp, secret);
        const result = await manager.verifySignature(payload, signature, timestamp, secret);

        expect(result.isValid).toBe(true);
      });

      it('应该拒绝无效的签名', async () => {
        const payload = JSON.stringify({ test: 'data' });
        const timestamp = Date.now();
        const secret = 'test-secret';

        const result = await manager.verifySignature(payload, 'invalid-signature', timestamp, secret);

        expect(result.isValid).toBe(false);
      });

      it('应该拒绝过期的签名', async () => {
        const payload = JSON.stringify({ test: 'data' });
        const timestamp = Date.now() - 10 * 60 * 1000; // 10 分钟前
        const secret = 'test-secret';

        const signature = await manager.generateSignature(payload, timestamp, secret);
        const result = await manager.verifySignature(payload, signature, timestamp, secret, 5 * 60 * 1000);

        expect(result.isValid).toBe(false);
      });
    });

    describe('日志管理', () => {
      it('应该能够记录日志', () => {
        manager.log('info', '测试日志', { test: 'data' });

        const logs = manager.getLogs();

        expect(logs).toHaveLength(1);
        expect(logs[0].level).toBe('info');
        expect(logs[0].message).toBe('测试日志');
        expect(logs[0].context).toEqual({ test: 'data' });
      });

      it('应该能够按级别过滤日志', () => {
        manager.log('info', '信息日志');
        manager.log('error', '错误日志');
        manager.log('warn', '警告日志');

        const errorLogs = manager.getLogs(undefined, undefined, 'error');

        expect(errorLogs).toHaveLength(1);
        expect(errorLogs[0].level).toBe('error');
      });
    });
  });

  describe('WebhookDeliveryService', () => {
    describe('交付发送', () => {
      it('应该能够发送交付请求', async () => {
        const input = {
          subscriptionId: 'sub_test',
          eventId: 'evt_test',
          eventType: 'workflow.started' as WebhookEventType,
          url: 'https://example.com/webhook',
          payload: JSON.stringify({ test: 'data' }),
          headers: { 'Content-Type': 'application/json' },
          attempt: 1,
          maxAttempts: 3,
        };

        // Mock fetch
        global.fetch = vi.fn(() =>
          Promise.resolve({
            ok: true,
            status: 200,
            text: () => Promise.resolve('OK'),
          } as Response)
        );

        const delivery = await deliveryService.send(input);

        expect(delivery).toBeDefined();
        expect(delivery.status).toBe('success');
        expect(delivery.statusCode).toBe(200);
      });

      it('应该处理超时', async () => {
        const input = {
          subscriptionId: 'sub_test',
          eventId: 'evt_test',
          eventType: 'workflow.started' as WebhookEventType,
          url: 'https://example.com/webhook',
          payload: JSON.stringify({ test: 'data' }),
          headers: { 'Content-Type': 'application/json' },
          attempt: 1,
          maxAttempts: 3,
        };

        // Mock fetch with timeout
        global.fetch = vi.fn(() =>
          new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Timeout')), 100);
          })
        );

        const delivery = await deliveryService.send(input, 50);

        expect(delivery.status).toBe('timeout');
      });
    });

    describe('重试逻辑', () => {
      it('应该计算正确的退避延迟', () => {
        expect(calculateBackoffDelay(1)).toBe(1000);
        expect(calculateBackoffDelay(2)).toBe(2000);
        expect(calculateBackoffDelay(3)).toBe(4000);
        expect(calculateBackoffDelay(4)).toBe(8000);
        expect(calculateBackoffDelay(5)).toBe(16000);
        expect(calculateBackoffDelay(6)).toBe(30000); // 最大值
      });

      it('应该判断是否应该重试', () => {
        expect(shouldRetry(500, 1, 3)).toBe(true); // 5xx 错误
        expect(shouldRetry(429, 1, 3)).toBe(true); // 429 错误
        expect(shouldRetry(408, 1, 3)).toBe(true); // 408 错误
        expect(shouldRetry(400, 1, 3)).toBe(false); // 4xx 错误
        expect(shouldRetry(undefined, 1, 3)).toBe(true); // 网络错误
        expect(shouldRetry(500, 3, 3)).toBe(false); // 超过最大重试次数
      });
    });
  });
});

// 导出测试辅助函数
export function calculateBackoffDelay(attempt: number, base: number = 1000, max: number = 30000): number {
  const delay = base * Math.pow(2, attempt - 1);
  return Math.min(delay, max);
}

export function shouldRetry(status: number | undefined, attempt: number, maxAttempts: number): boolean {
  if (attempt >= maxAttempts) {
    return false;
  }

  if (!status) {
    return true;
  }

  if (status >= 500 && status < 600) {
    return true;
  }

  if (status === 429 || status === 408) {
    return true;
  }

  return false;
}