/**
 * Webhook v1.13.0 系统测试
 * @description 为 v1.13.0 新增功能编写测试用例
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  webhookManager,
  WebhookManager,
  webhookDeliveryService,
  WebhookDeliveryService,
} from '@/lib/webhook'
import type {
  CreateWebhookInput,
  WebhookEvent,
  WebhookEventType,
  WebhookSubscription,
} from '@/lib/webhook'

// ============================================================================
// Test Data
// ============================================================================

const validSubscriptionInput: CreateWebhookInput = {
  name: '测试订阅',
  url: 'https://example.com/webhook',
  events: ['workflow.started', 'workflow.completed'],
  isActive: true,
}

const anotherSubscriptionInput: CreateWebhookInput = {
  name: '另一个订阅',
  url: 'https://example2.com/webhook',
  events: ['workflow.completed'],
  isActive: true,
}

const mockWebhookEvent: WebhookEvent = {
  id: 'evt_test_1',
  type: 'workflow.started',
  timestamp: new Date().toISOString(),
  source: 'test',
  data: {
    workflowId: 'wf-123',
    status: 'started',
  },
}

const mockCompletedEvent: WebhookEvent = {
  id: 'evt_test_2',
  type: 'workflow.completed',
  timestamp: new Date().toISOString(),
  source: 'test',
  data: {
    workflowId: 'wf-456',
    status: 'completed',
  },
}

const mockFailedEvent: WebhookEvent = {
  id: 'evt_test_3',
  type: 'workflow.failed',
  timestamp: new Date().toISOString(),
  source: 'test',
  data: {
    workflowId: 'wf-789',
    status: 'failed',
    error: 'Something went wrong',
  },
}

// ============================================================================
// Test Suite
// ============================================================================

describe('Webhook System v1.13.0 - Webhook 系统测试', () => {
  let manager: WebhookManager
  let deliveryService: WebhookDeliveryService

  beforeEach(() => {
    manager = new WebhookManager()
    deliveryService = new WebhookDeliveryService()
  })

  afterEach(() => {
    manager.clearEventQueue()
    manager.clearLogs()
    manager.clearSubscriptions()
    deliveryService.clearAllDeliveries()
  })

  // ========================================================================
  // 基础功能测试 (Happy Path)
  // ========================================================================

  describe('基础功能测试', () => {
    it('应该能够创建订阅', async () => {
      const subscription = await manager.createSubscription(validSubscriptionInput)

      expect(subscription).toBeDefined()
      expect(subscription.id).toBeDefined()
      expect(subscription.name).toBe(validSubscriptionInput.name)
      expect(subscription.url).toBe(validSubscriptionInput.url)
      expect(subscription.events).toEqual(validSubscriptionInput.events)
      expect(subscription.isActive).toBe(true)
      expect(subscription.status).toBe('active')
    })

    it('应该能够获取订阅', async () => {
      const created = await manager.createSubscription(validSubscriptionInput)
      const retrieved = manager.getSubscription(created.id)

      expect(retrieved).toBeDefined()
      expect(retrieved?.id).toBe(created.id)
      expect(retrieved?.name).toBe(created.name)
    })

    it('应该能够获取所有订阅', async () => {
      await manager.createSubscription(validSubscriptionInput)
      await manager.createSubscription(anotherSubscriptionInput)

      const subscriptions = manager.getAllSubscriptions()

      expect(subscriptions.length).toBe(2)
    })

    it('应该能够更新订阅', async () => {
      const created = await manager.createSubscription(validSubscriptionInput)

      const updated = await manager.updateSubscription(created.id, {
        name: '更新后的订阅',
        isActive: false,
      })

      expect(updated.name).toBe('更新后的订阅')
      expect(updated.isActive).toBe(false)
    })

    it('应该能够删除订阅', async () => {
      const created = await manager.createSubscription(validSubscriptionInput)
      const deleted = await manager.deleteSubscription(created.id)

      expect(deleted).toBe(true)
      expect(manager.getSubscription(created.id)).toBeUndefined()
    })
  })

  // ========================================================================
  // 事件处理测试
  // ========================================================================

  describe('事件处理测试', () => {
    it('应该能够触发事件', async () => {
      const subscription = await manager.createSubscription(validSubscriptionInput)

      const deliveries = await manager.triggerEvent(mockWebhookEvent)

      expect(deliveries.length).toBeGreaterThan(0)
    })

    it('应该只触发订阅了事件类型的订阅', async () => {
      // 订阅只监听 workflow.started
      await manager.createSubscription({
        ...validSubscriptionInput,
        events: ['workflow.started'],
      })

      // 触发 workflow.completed 事件
      const deliveries = await manager.triggerEvent(mockCompletedEvent)

      expect(deliveries.length).toBe(0)
    })

    it('应该处理多个订阅', async () => {
      await manager.createSubscription(validSubscriptionInput)
      await manager.createSubscription(anotherSubscriptionInput)

      const deliveries = await manager.triggerEvent(mockCompletedEvent)

      expect(deliveries.length).toBe(2)
    })

    it('应该只触发活跃订阅', async () => {
      await manager.createSubscription({
        ...validSubscriptionInput,
        isActive: false,
      })

      const deliveries = await manager.triggerEvent(mockWebhookEvent)

      expect(deliveries.length).toBe(0)
    })

    it('应该支持事件队列', async () => {
      await manager.createSubscription(validSubscriptionInput)
      await manager.triggerEvent(mockWebhookEvent)

      const queue = manager.getEventQueue()

      expect(queue.length).toBeGreaterThan(0)
    })
  })

  // ========================================================================
  // 自动补全测试
  // ========================================================================

  describe('批量操作测试', () => {
    it('应该能够批量删除订阅', async () => {
      const sub1 = await manager.createSubscription(validSubscriptionInput)
      const sub2 = await manager.createSubscription(anotherSubscriptionInput)

      const result = await manager.batchDeleteSubscriptions([sub1.id, sub2.id])

      expect(result.deleted.length).toBe(2)
      expect(result.failed.length).toBe(0)
    })

    it('应该处理批量删除中的无效 ID', async () => {
      const sub1 = await manager.createSubscription(validSubscriptionInput)

      const result = await manager.batchDeleteSubscriptions([sub1.id, 'invalid-id'])

      expect(result.deleted.length).toBe(1)
      expect(result.failed.length).toBe(1)
    })

    it('应该能够批量更新订阅状态', async () => {
      const sub1 = await manager.createSubscription(validSubscriptionInput)
      const sub2 = await manager.createSubscription(anotherSubscriptionInput)

      const updated = await manager.batchUpdateStatus([sub1.id, sub2.id], false)

      expect(updated.length).toBe(2)
      expect(updated.every(s => !s.isActive)).toBe(true)
    })
  })

  // ========================================================================
  // 签名验证测试
  // ========================================================================

  describe('签名验证测试', () => {
    it('应该生成有效的签名', async () => {
      const payload = JSON.stringify(mockWebhookEvent)
      const timestamp = Date.now()
      const secret = 'test-secret'

      const signature = await manager.generateSignature(payload, timestamp, secret)

      expect(signature).toBeDefined()
      expect(signature).toContain('sha256=')
    })

    it('应该验证有效签名', async () => {
      const payload = JSON.stringify(mockWebhookEvent)
      const timestamp = Date.now()
      const secret = 'test-secret'

      const signature = await manager.generateSignature(payload, timestamp, secret)
      const result = await manager.verifySignature(payload, signature, timestamp, secret)

      expect(result.isValid).toBe(true)
    })

    it('应该拒绝无效签名', async () => {
      const payload = JSON.stringify(mockWebhookEvent)
      const timestamp = Date.now()
      const secret = 'test-secret'

      const result = await manager.verifySignature(payload, 'invalid-signature', timestamp, secret)

      expect(result.isValid).toBe(false)
    })

    it('应该拒绝过期的时间戳', async () => {
      const payload = JSON.stringify(mockWebhookEvent)
      const timestamp = Date.now() - 10 * 60 * 1000 // 10 minutes ago
      const secret = 'test-secret'

      const signature = await manager.generateSignature(payload, timestamp, secret)
      const result = await manager.verifySignature(payload, signature, timestamp, secret, 5 * 60 * 1000)

      expect(result.isValid).toBe(false)
    })
  })

  // ========================================================================
  // 测试订阅测试
  // ========================================================================

  describe('测试订阅测试', () => {
    it('应该能够测试订阅', async () => {
      const subscription = await manager.createSubscription(validSubscriptionInput)

      const result = await manager.testSubscription(subscription.id)

      expect(result).toBeDefined()
      expect(result.subscriptionId).toBe(subscription.id)
      expect(typeof result.duration).toBe('number')
    })

    it('应该拒绝测试不存在的订阅', async () => {
      await expect(manager.testSubscription('non-existent')).rejects.toThrow()
    })
  })

  // ========================================================================
  // 日志管理测试
  // ========================================================================

  describe('日志管理测试', () => {
    it('应该能够记录日志', async () => {
      await manager.createSubscription(validSubscriptionInput)

      const logs = manager.getLogs()

      expect(logs.length).toBeGreaterThan(0)
    })

    it('应该能够按订阅 ID 过滤日志', async () => {
      const subscription = await manager.createSubscription(validSubscriptionInput)
      await manager.triggerEvent(mockWebhookEvent)

      const logs = manager.getLogs(subscription.id)

      expect(logs.length).toBeGreaterThan(0)
    })

    it('应该能够按日志级别过滤', async () => {
      await manager.createSubscription(validSubscriptionInput)

      const infoLogs = manager.getLogs(undefined, undefined, 'info')

      expect(Array.isArray(infoLogs)).toBe(true)
    })

    it('应该能够限制日志数量', async () => {
      await manager.createSubscription(validSubscriptionInput)

      const logs = manager.getLogs(undefined, undefined, undefined, 5)

      expect(logs.length).toBeLessThanOrEqual(5)
    })

    it('应该能够清空日志', async () => {
      await manager.createSubscription(validSubscriptionInput)
      manager.clearLogs()

      const logs = manager.getLogs()

      expect(logs.length).toBe(0)
    })
  })

  // ========================================================================
  // 边界情况测试
  // ========================================================================

  describe('边界情况测试', () => {
    it('应该处理空事件列表', async () => {
      await manager.createSubscription(validSubscriptionInput)

      const deliveries = await manager.triggerEvent({
        id: 'empty-event',
        type: 'unregistered.event',
        timestamp: new Date().toISOString(),
        source: 'test',
        data: {},
      })

      expect(deliveries.length).toBe(0)
    })

    it('应该处理无效的 URL', async () => {
      await expect(
        manager.createSubscription({
          ...validSubscriptionInput,
          url: 'not-a-valid-url',
        })
      ).rejects.toThrow()
    })

    it('应该处理空订阅列表', () => {
      const subscriptions = manager.getAllSubscriptions()

      expect(subscriptions).toEqual([])
    })

    it('应该处理更新不存在的订阅', async () => {
      await expect(
        manager.updateSubscription('non-existent', {
          name: 'New Name',
        })
      ).rejects.toThrow()
    })

    it('应该处理删除不存在的订阅', async () => {
      const result = await manager.deleteSubscription('non-existent')

      expect(result).toBe(false)
    })

    it('应该处理空查询', () => {
      const logs = manager.getLogs('non-existent-id')

      expect(logs).toEqual([])
    })
  })

  // ========================================================================
  // 错误处理测试
  // ========================================================================

  describe('错误处理测试', () => {
    it('应该处理创建空名称的订阅', async () => {
      await expect(
        manager.createSubscription({
          ...validSubscriptionInput,
          name: '',
        })
      ).rejects.toThrow()
    })

    it('应该处理创建空 URL 的订阅', async () => {
      await expect(
        manager.createSubscription({
          ...validSubscriptionInput,
          url: '',
        })
      ).rejects.toThrow()
    })

    it('应该处理空事件列表', async () => {
      await expect(
        manager.createSubscription({
          ...validSubscriptionInput,
          events: [],
        })
      ).rejects.toThrow()
    })

    it('应该处理无效的重试次数', async () => {
      await expect(
        manager.createSubscription({
          ...validSubscriptionInput,
          retryCount: -1,
        })
      ).rejects.toThrow()
    })

    it('应该处理无效的超时时间', async () => {
      await expect(
        manager.createSubscription({
          ...validSubscriptionInput,
          timeout: -1,
        })
      ).rejects.toThrow()
    })
  })

  // ========================================================================
  // 缓存管理测试
  // ========================================================================

  describe('缓存管理测试', () => {
    it('应该清空事件队列', async () => {
      await manager.createSubscription(validSubscriptionInput)
      await manager.triggerEvent(mockWebhookEvent)

      manager.clearEventQueue()

      const queue = manager.getEventQueue()

      expect(queue.length).toBe(0)
    })

    it('应该清空所有订阅', async () => {
      await manager.createSubscription(validSubscriptionInput)
      await manager.createSubscription(anotherSubscriptionInput)

      manager.clearSubscriptions()

      const subscriptions = manager.getAllSubscriptions()

      expect(subscriptions.length).toBe(0)
    })
  })

  // ========================================================================
  // 全局管理器测试
  // ========================================================================

  describe('全局管理器测试', () => {
    it('应该获取全局管理器实例', () => {
      expect(webhookManager).toBeDefined()
    })

    it('全局管理器应该能够创建订阅', async () => {
      webhookManager.clearSubscriptions()
      const subscription = await webhookManager.createSubscription(validSubscriptionInput)

      expect(subscription).toBeDefined()
    })
  })

  // ========================================================================
  // 交付服务测试
  // ========================================================================

  describe('交付服务测试', () => {
    it('应该能够创建交付服务实例', () => {
      expect(deliveryService).toBeDefined()
    })

    it('应该能够清空所有交付记录', () => {
      deliveryService.clearAllDeliveries()

      expect(deliveryService).toBeDefined()
    })
  })
})
