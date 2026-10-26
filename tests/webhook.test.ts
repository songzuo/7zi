/**
 * Webhook 模块契约测试
 * @description 针对 `@/lib/webhook` 当前对外契约（基于内置插件 WebhookPlugin）的测试。
 *
 * 历史说明：
 *   本文件早期版本（v1.13.0）针对的是 `WebhookManager` / `WebhookDeliveryService`
 *   这一套「订阅 + 日志 + 批量操作」的旧实现。当前根级生产代码里
 *   `src/lib/webhook/index.ts` 只做了一件事：把内置插件 `WebhookPlugin` 重新导出，
 *   并暴露一个 `webhookManager` 单例。旧实现已经不存在于根级 src/ 中
 *   （只留在被排除的嵌套子项目 7zi-frontend/ 里），因此旧用例无法修复 ——
 *   它们测的是生产代码里已经删除的 API。
 *
 *   本文件改为对齐当前真实契约：端点（endpoint）生命周期、事件投递（delivery）、
 *   重试、统计与健康检查。HTTP 层的 `/api/webhooks` 契约由
 *   tests/api-integration/webhook.test.ts 覆盖。
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  WebhookPlugin,
  webhookManager,
  type WebhookEndpoint,
  type WebhookDelivery,
  type CreateEndpointInput,
  type TriggerInput,
  type ListDeliveriesInput,
  type GetDeliveryInput,
  type RetryDeliveryInput,
  type GetEndpointInput,
  type DeleteEndpointInput,
  type UpdateEndpointInput,
} from '@/lib/webhook'

/** `execute('trigger', ...)` 的返回结构 */
interface TriggerResult {
  deliveries: string[]
}

/** `execute('deleteEndpoint', ...)` 的返回结构 */
interface DeleteResult {
  success: boolean
}

/** `execute('retryDelivery', ...)` 的返回结构 */
interface RetryResult {
  success: boolean
}

/** `execute('stats', ...)` 的返回结构 */
interface WebhookStats {
  sent: number
  failed: number
  retried: number
  endpoints: number
}

const validEndpointInput: CreateEndpointInput = {
  url: 'https://example.com/webhook',
  events: ['workflow.started', 'workflow.completed'],
}

const anotherEndpointInput: CreateEndpointInput = {
  url: 'https://example2.com/webhook',
  events: ['workflow.completed'],
}

// ============================================================================
// Test Suite
// ============================================================================

describe('Webhook 模块 (@/lib/webhook) 契约测试', () => {
  let plugin: WebhookPlugin

  beforeEach(() => {
    plugin = new WebhookPlugin()
  })

  // ========================================================================
  // 模块导出与默认配置
  // ========================================================================

  describe('模块导出', () => {
    it('应该导出 WebhookPlugin 类', () => {
      expect(typeof WebhookPlugin).toBe('function')
      expect(plugin).toBeInstanceOf(WebhookPlugin)
    })

    it('应该导出 webhookManager 单例', () => {
      expect(webhookManager).toBeInstanceOf(WebhookPlugin)
    })

    it('应该使用正确的插件元数据', () => {
      expect(plugin.metadata.id).toBe('@openclaw/plugin-webhook')
      expect(plugin.metadata.name).toBe('Webhook Plugin')
      expect(plugin.metadata.version).toBe('1.0.0')
      expect(plugin.metadata.category).toBe('webhook')
    })

    it('应该使用默认配置', () => {
      // PluginConfig.config 的类型是 Record<string, unknown> | undefined，
      // 直接按属性读取即可拿到 unknown，避免任何类型断言。
      const config = plugin.config.config

      expect(config?.maxRetries).toBe(3)
      expect(config?.retryDelay).toBe(1000)
      expect(config?.timeout).toBe(30000)
      expect(config?.maxConcurrent).toBe(10)
      expect(config?.enableSignature).toBe(true)
    })
  })

  // ========================================================================
  // 端点管理
  // ========================================================================

  describe('端点管理', () => {
    it('应该能够创建端点', async () => {
      const endpoint = await plugin.execute<
        CreateEndpointInput,
        WebhookEndpoint
      >('createEndpoint', validEndpointInput)

      expect(endpoint.id).toHaveLength(32)
      expect(endpoint.url).toBe('https://example.com/webhook')
      expect(endpoint.events).toEqual(['workflow.started', 'workflow.completed'])
      expect(endpoint.enabled).toBe(true)
      expect(endpoint.createdAt).toBeInstanceOf(Date)
      expect(endpoint.updatedAt).toBeInstanceOf(Date)
    })

    it('应该能够按 ID 获取端点', async () => {
      const created = await plugin.execute<
        CreateEndpointInput,
        WebhookEndpoint
      >('createEndpoint', validEndpointInput)

      const endpoint = await plugin.execute<GetEndpointInput, WebhookEndpoint | undefined>(
        'getEndpoint',
        { id: created.id }
      )

      expect(endpoint).toBeDefined()
      expect(endpoint?.id).toBe(created.id)
      expect(endpoint?.url).toBe(validEndpointInput.url)
    })

    it('应该对不存在的端点返回 undefined', async () => {
      const endpoint = await plugin.execute<GetEndpointInput, WebhookEndpoint | undefined>(
        'getEndpoint',
        { id: 'non-existent' }
      )

      expect(endpoint).toBeUndefined()
    })

    it('应该能够列出所有端点', async () => {
      await plugin.execute<CreateEndpointInput, WebhookEndpoint>('createEndpoint', validEndpointInput)
      await plugin.execute<CreateEndpointInput, WebhookEndpoint>('createEndpoint', anotherEndpointInput)

      const endpoints = await plugin.execute<undefined, WebhookEndpoint[]>('listEndpoints')

      expect(endpoints).toHaveLength(2)
      expect(endpoints.map(e => e.url).sort()).toEqual([
        'https://example.com/webhook',
        'https://example2.com/webhook',
      ])
    })

    it('应该能够更新端点', async () => {
      const created = await plugin.execute<
        CreateEndpointInput,
        WebhookEndpoint
      >('createEndpoint', validEndpointInput)

      const updated = await plugin.execute<UpdateEndpointInput, WebhookEndpoint | undefined>(
        'updateEndpoint',
        {
          id: created.id,
          url: 'https://example.com/updated',
          events: ['workflow.failed'],
          enabled: false,
        }
      )

      expect(updated?.url).toBe('https://example.com/updated')
      expect(updated?.events).toEqual(['workflow.failed'])
      expect(updated?.enabled).toBe(false)
      expect(updated?.updatedAt.getTime()).toBeGreaterThanOrEqual(created.updatedAt.getTime())
    })

    it('应该对更新不存在的端点返回 undefined', async () => {
      const updated = await plugin.execute<UpdateEndpointInput, WebhookEndpoint | undefined>(
        'updateEndpoint',
        { id: 'non-existent', enabled: false }
      )

      expect(updated).toBeUndefined()
    })

    it('应该能够删除端点', async () => {
      const created = await plugin.execute<
        CreateEndpointInput,
        WebhookEndpoint
      >('createEndpoint', validEndpointInput)

      const result = await plugin.execute<DeleteEndpointInput, DeleteResult>('deleteEndpoint', {
        id: created.id,
      })

      expect(result).toEqual({ success: true })

      const endpoint = await plugin.execute<GetEndpointInput, WebhookEndpoint | undefined>(
        'getEndpoint',
        { id: created.id }
      )
      expect(endpoint).toBeUndefined()
    })

    it('应该对删除不存在的端点返回 success=false', async () => {
      const result = await plugin.execute<DeleteEndpointInput, DeleteResult>('deleteEndpoint', {
        id: 'non-existent',
      })

      expect(result).toEqual({ success: false })
    })
  })

  // ========================================================================
  // 事件触发与投递
  // ========================================================================

  describe('事件触发', () => {
    it('应该为匹配事件的端点创建投递', async () => {
      await plugin.execute<CreateEndpointInput, WebhookEndpoint>('createEndpoint', validEndpointInput)

      const result = await plugin.execute<TriggerInput, TriggerResult>('trigger', {
        event: 'workflow.started',
        payload: { workflowId: 'wf-123' },
      })

      expect(result.deliveries).toHaveLength(1)

      const delivery = await plugin.execute<GetDeliveryInput, WebhookDelivery | undefined>(
        'getDelivery',
        { id: result.deliveries[0] }
      )

      expect(delivery).toBeDefined()
      expect(delivery?.endpointId).toBeDefined()
      expect(delivery?.event).toBe('workflow.started')
      expect(delivery?.payload).toEqual({ workflowId: 'wf-123' })
      expect(delivery?.status).toBe('pending')
      expect(delivery?.attempts).toBe(0)
      expect(delivery?.createdAt).toBeInstanceOf(Date)
    })

    it('不应该为事件类型不匹配的端点创建投递', async () => {
      await plugin.execute<CreateEndpointInput, WebhookEndpoint>('createEndpoint', {
        url: 'https://example.com/started',
        events: ['workflow.started'],
      })

      const result = await plugin.execute<TriggerInput, TriggerResult>('trigger', {
        event: 'workflow.completed',
        payload: {},
      })

      expect(result.deliveries).toHaveLength(0)
    })

    it('应该为通配符端点创建投递', async () => {
      await plugin.execute<CreateEndpointInput, WebhookEndpoint>('createEndpoint', {
        url: 'https://example.com/any',
        events: ['*'],
      })

      const result = await plugin.execute<TriggerInput, TriggerResult>('trigger', {
        event: 'workflow.completed',
        payload: {},
      })

      expect(result.deliveries).toHaveLength(1)
    })

    it('应该为多个匹配端点各创建一条投递', async () => {
      await plugin.execute<CreateEndpointInput, WebhookEndpoint>('createEndpoint', validEndpointInput)
      await plugin.execute<CreateEndpointInput, WebhookEndpoint>('createEndpoint', anotherEndpointInput)

      const result = await plugin.execute<TriggerInput, TriggerResult>('trigger', {
        event: 'workflow.completed',
        payload: {},
      })

      expect(result.deliveries).toHaveLength(2)
      expect(new Set(result.deliveries).size).toBe(2)
    })

    it('应该跳过已禁用的端点', async () => {
      const created = await plugin.execute<
        CreateEndpointInput,
        WebhookEndpoint
      >('createEndpoint', validEndpointInput)

      await plugin.execute<UpdateEndpointInput, WebhookEndpoint | undefined>('updateEndpoint', {
        id: created.id,
        enabled: false,
      })

      const result = await plugin.execute<TriggerInput, TriggerResult>('trigger', {
        event: 'workflow.started',
        payload: {},
      })

      expect(result.deliveries).toHaveLength(0)
    })
  })

  // ========================================================================
  // 投递查询与重试
  // ========================================================================

  describe('投递查询与重试', () => {
    it('应该能够按端点过滤投递列表', async () => {
      const first = await plugin.execute<
        CreateEndpointInput,
        WebhookEndpoint
      >('createEndpoint', validEndpointInput)
      await plugin.execute<CreateEndpointInput, WebhookEndpoint>('createEndpoint', anotherEndpointInput)

      await plugin.execute<TriggerInput, TriggerResult>('trigger', {
        event: 'workflow.completed',
        payload: {},
      })

      const deliveries = await plugin.execute<ListDeliveriesInput, WebhookDelivery[]>(
        'listDeliveries',
        { endpointId: first.id }
      )

      expect(deliveries).toHaveLength(1)
      expect(deliveries[0].endpointId).toBe(first.id)
    })

    it('应该能够按状态过滤投递列表', async () => {
      await plugin.execute<CreateEndpointInput, WebhookEndpoint>('createEndpoint', validEndpointInput)

      await plugin.execute<TriggerInput, TriggerResult>('trigger', {
        event: 'workflow.started',
        payload: {},
      })

      const pending = await plugin.execute<ListDeliveriesInput, WebhookDelivery[]>('listDeliveries', {
        status: 'pending',
      })
      const succeeded = await plugin.execute<ListDeliveriesInput, WebhookDelivery[]>('listDeliveries', {
        status: 'success',
      })

      expect(pending).toHaveLength(1)
      expect(succeeded).toHaveLength(0)
    })

    it('应该能够限制投递列表数量', async () => {
      await plugin.execute<CreateEndpointInput, WebhookEndpoint>('createEndpoint', validEndpointInput)
      await plugin.execute<CreateEndpointInput, WebhookEndpoint>('createEndpoint', anotherEndpointInput)

      await plugin.execute<TriggerInput, TriggerResult>('trigger', {
        event: 'workflow.completed',
        payload: {},
      })

      const deliveries = await plugin.execute<ListDeliveriesInput, WebhookDelivery[]>(
        'listDeliveries',
        { limit: 1 }
      )

      expect(deliveries).toHaveLength(1)
    })

    it('应该能够重试失败的投递', async () => {
      await plugin.execute<CreateEndpointInput, WebhookEndpoint>('createEndpoint', validEndpointInput)

      const triggered = await plugin.execute<TriggerInput, TriggerResult>('trigger', {
        event: 'workflow.started',
        payload: {},
      })
      const deliveryId = triggered.deliveries[0]

      const result = await plugin.execute<RetryDeliveryInput, RetryResult>('retryDelivery', {
        id: deliveryId,
      })

      expect(result).toEqual({ success: true })

      const delivery = await plugin.execute<GetDeliveryInput, WebhookDelivery | undefined>(
        'getDelivery',
        { id: deliveryId }
      )

      expect(delivery?.status).toBe('retrying')
      expect(delivery?.nextRetry).toBeInstanceOf(Date)
    })

    it('应该拒绝重试不存在的投递', async () => {
      const result = await plugin.execute<RetryDeliveryInput, RetryResult>('retryDelivery', {
        id: 'non-existent',
      })

      expect(result).toEqual({ success: false })
    })
  })

  // ========================================================================
  // 统计与健康检查
  // ========================================================================

  describe('统计与健康检查', () => {
    it('应该统计已创建的端点数量', async () => {
      await plugin.execute<CreateEndpointInput, WebhookEndpoint>('createEndpoint', validEndpointInput)
      await plugin.execute<CreateEndpointInput, WebhookEndpoint>('createEndpoint', anotherEndpointInput)

      const stats = await plugin.execute<undefined, WebhookStats>('stats')

      expect(stats.endpoints).toBe(2)
      expect(stats.sent).toBe(0)
      expect(stats.failed).toBe(0)
      expect(stats.retried).toBe(0)
    })

    it('应该返回健康的健康检查结果', async () => {
      const health = await plugin.healthCheck()

      expect(health.status).toBe('healthy')
      expect(health.message).toBe('Webhook plugin is running')
      expect(health.checks?.queue?.status).toBe('healthy')
      expect(health.checks?.endpoints?.status).toBe('healthy')
      expect(health.checks?.endpoints?.message).toBe('Active endpoints: 0')
    })

    it('应该对未知 action 抛出错误', async () => {
      await expect(plugin.execute('unknownAction', {})).rejects.toThrow(
        'Unknown action: unknownAction'
      )
    })
  })

  // ========================================================================
  // 全局单例
  // ========================================================================

  describe('全局单例', () => {
    it('全局单例应该能够创建端点并统计到端点数', async () => {
      const before = await webhookManager.execute<undefined, WebhookStats>('stats')

      const endpoint = await webhookManager.execute<
        CreateEndpointInput,
        WebhookEndpoint
      >('createEndpoint', validEndpointInput)

      expect(endpoint.url).toBe(validEndpointInput.url)

      const after = await webhookManager.execute<undefined, WebhookStats>('stats')
      expect(after.endpoints).toBe(before.endpoints + 1)

      await webhookManager.execute<DeleteEndpointInput, DeleteResult>('deleteEndpoint', {
        id: endpoint.id,
      })
    })
  })
})
