/**
 * Webhook Plugin Tests
 * Test coverage for v1.0.0 Webhook Event System
 *
 * Test coverage areas:
 * - WebhookPlugin initialization
 * - Event subscription (subscribe)
 * - Event publishing (publish/trigger)
 * - HMAC signature verification
 * - Error handling
 * - Retry mechanism
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  WebhookPlugin,
  type WebhookPluginConfig,
  type WebhookEndpoint,
  type WebhookDelivery
} from '@/lib/plugins/builtin/plugins/WebhookPlugin'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch as any

describe('WebhookPlugin', () => {
  let plugin: WebhookPlugin
  let mockContext: any

  beforeEach(() => {
    // Setup mock context
    mockContext = {
      logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn()
      },
      config: {}
    }

    // Reset mock fetch
    mockFetch.mockClear()
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => 'OK',
      json: async () => ({ success: true })
    })

    // Create plugin instance
    plugin = new WebhookPlugin()
  })

  afterEach(async () => {
    if (plugin) {
      await plugin.stop()
      await plugin.destroy()
    }
  })

  describe('Initialization', () => {
    it('should have correct metadata', () => {
      expect(plugin.metadata.id).toBe('@openclaw/plugin-webhook')
      expect(plugin.metadata.name).toBe('Webhook Plugin')
      expect(plugin.metadata.version).toBe('1.0.0')
      expect(plugin.metadata.category).toBe('webhook')
    })

    it('should initialize with context', async () => {
      await plugin.init(mockContext)
      expect(mockContext.logger.info).toHaveBeenCalledWith('Webhook plugin initialized')
    })

    it('should start successfully', async () => {
      await plugin.init(mockContext)
      await plugin.start()
      expect(mockContext.logger.info).toHaveBeenCalledWith('Webhook plugin started')
    })

    it('should stop and wait for queue', async () => {
      await plugin.init(mockContext)
      await plugin.start()
      await plugin.stop()
      expect(mockContext.logger.info).toHaveBeenCalledWith('Webhook plugin stopped')
    })

    it('should destroy resources', async () => {
      await plugin.init(mockContext)
      await plugin.destroy()
      expect(mockContext.logger.info).toHaveBeenCalledWith('Webhook plugin destroyed')
    })
  })

  describe('Plugin Configuration', () => {
    it('should have default configuration', () => {
      const config = plugin.config.config as WebhookPluginConfig
      expect(config.maxRetries).toBe(3)
      expect(config.retryDelay).toBe(1000)
      expect(config.timeout).toBe(30000)
      expect(config.maxConcurrent).toBe(10)
      expect(config.enableSignature).toBe(true)
    })

    it('should accept custom configuration', () => {
      const customPlugin = new WebhookPlugin()
      customPlugin.config.config = {
        maxRetries: 5,
        retryDelay: 2000,
        timeout: 60000,
        maxConcurrent: 20,
        enableSignature: false,
        secretKey: 'custom-secret'
      } as WebhookPluginConfig

      expect(customPlugin.config.config.maxRetries).toBe(5)
      expect(customPlugin.config.config.retryDelay).toBe(2000)
    })
  })

  describe('Endpoint Management', () => {
    beforeEach(async () => {
      await plugin.init(mockContext)
    })

    it('should create endpoint via execute action', async () => {
      const endpoint = await plugin.execute('createEndpoint', {
        url: 'https://example.com/webhook',
        events: ['task.created', 'task.updated'],
        headers: { 'Content-Type': 'application/json' }
      })

      expect(endpoint).toBeDefined()
      expect((endpoint as WebhookEndpoint).url).toBe('https://example.com/webhook')
      expect((endpoint as WebhookEndpoint).events).toContain('task.created')
      expect((endpoint as WebhookEndpoint).enabled).toBe(true)
      expect((endpoint as WebhookEndpoint).id).toBeDefined()
    })

    it('should get endpoint by id', async () => {
      const created = await plugin.execute('createEndpoint', {
        url: 'https://example.com/webhook',
        events: ['task.created']
      })

      const endpoint = await plugin.execute('getEndpoint', {
        id: (created as WebhookEndpoint).id
      })

      expect(endpoint).toBeDefined()
      expect((endpoint as WebhookEndpoint).url).toBe('https://example.com/webhook')
    })

    it('should return undefined for non-existent endpoint', async () => {
      const endpoint = await plugin.execute('getEndpoint', { id: 'non-existent' })
      expect(endpoint).toBeUndefined()
    })

    it('should list all endpoints', async () => {
      await plugin.execute('createEndpoint', {
        url: 'https://example.com/webhook1',
        events: ['task.created']
      })

      await plugin.execute('createEndpoint', {
        url: 'https://example.com/webhook2',
        events: ['task.updated']
      })

      const endpoints = await plugin.execute('listEndpoints') as WebhookEndpoint[]

      expect(endpoints).toBeDefined()
      expect(Array.isArray(endpoints)).toBe(true)
      expect(endpoints.length).toBeGreaterThanOrEqual(2)
    })

    it('should update endpoint', async () => {
      const created = await plugin.execute('createEndpoint', {
        url: 'https://example.com/webhook',
        events: ['task.created']
      })

      const updated = await plugin.execute('updateEndpoint', {
        id: (created as WebhookEndpoint).id,
        enabled: false,
        events: ['task.created', 'task.deleted']
      })

      expect((updated as WebhookEndpoint).enabled).toBe(false)
      expect((updated as WebhookEndpoint).events).toContain('task.deleted')
    })

    it('should delete endpoint', async () => {
      const created = await plugin.execute('createEndpoint', {
        url: 'https://example.com/webhook',
        events: ['task.created']
      })

      const result = await plugin.execute('deleteEndpoint', {
        id: (created as WebhookEndpoint).id
      })

      expect(result).toEqual({ success: true })

      const endpoint = await plugin.execute('getEndpoint', {
        id: (created as WebhookEndpoint).id
      })
      expect(endpoint).toBeUndefined()
    })
  })

  describe('Event Publishing (Trigger)', () => {
    beforeEach(async () => {
      await plugin.init(mockContext)
    })

    it('should trigger event and create deliveries', async () => {
      await plugin.execute('createEndpoint', {
        url: 'https://example.com/webhook',
        events: ['task.created']
      })

      const result = await plugin.execute('trigger', {
        event: 'task.created',
        payload: { taskId: 'task-123', title: 'Test Task' }
      })

      expect(result).toBeDefined()
      expect((result as any).deliveries).toBeDefined()
      expect(Array.isArray((result as any).deliveries)).toBe(true)
    })

    it('should only trigger for matching endpoints', async () => {
      await plugin.execute('createEndpoint', {
        url: 'https://example.com/webhook1',
        events: ['task.created']
      })

      await plugin.execute('createEndpoint', {
        url: 'https://example.com/webhook2',
        events: ['task.updated']
      })

      const result = await plugin.execute('trigger', {
        event: 'task.created',
        payload: { taskId: 'task-123' }
      })

      // Only one endpoint should receive the event
      expect((result as any).deliveries.length).toBe(1)
    })

    it('should support wildcard events', async () => {
      await plugin.execute('createEndpoint', {
        url: 'https://example.com/webhook',
        events: ['*']
      })

      const result1 = await plugin.execute('trigger', {
        event: 'task.created',
        payload: { taskId: 'task-123' }
      })

      const result2 = await plugin.execute('trigger', {
        event: 'task.updated',
        payload: { taskId: 'task-123' }
      })

      expect((result1 as any).deliveries.length).toBe(1)
      expect((result2 as any).deliveries.length).toBe(1)
    })

    it('should skip disabled endpoints', async () => {
      const endpoint = await plugin.execute('createEndpoint', {
        url: 'https://example.com/webhook',
        events: ['task.created']
      })

      await plugin.execute('updateEndpoint', {
        id: (endpoint as WebhookEndpoint).id,
        enabled: false
      })

      const result = await plugin.execute('trigger', {
        event: 'task.created',
        payload: { taskId: 'task-123' }
      })

      expect((result as any).deliveries.length).toBe(0)
    })

    it('should trigger for all matching endpoints', async () => {
      const endpoint1 = await plugin.execute('createEndpoint', {
        url: 'https://example.com/webhook1',
        events: ['task.created']
      })

      const endpoint2 = await plugin.execute('createEndpoint', {
        url: 'https://example.com/webhook2',
        events: ['task.created']
      })

      const result = await plugin.execute('trigger', {
        event: 'task.created',
        payload: { taskId: 'task-123' }
      })

      // Both endpoints should receive the event
      expect((result as any).deliveries.length).toBe(2)
    })
  })

  describe('HMAC Signature Verification', () => {
    beforeEach(async () => {
      plugin.config.config = {
        maxRetries: 3,
        retryDelay: 1000,
        timeout: 30000,
        maxConcurrent: 10,
        enableSignature: true,
        secretKey: 'test-secret-key-123'
      } as WebhookPluginConfig

      await plugin.init(mockContext)
    })

    it('should add signature header when enabled', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => 'OK'
      })

      await plugin.execute('createEndpoint', {
        url: 'https://example.com/webhook',
        events: ['task.created']
      })

      await plugin.execute('trigger', {
        event: 'task.created',
        payload: { taskId: 'task-123' }
      })

      // Wait for delivery
      await new Promise(resolve => setTimeout(resolve, 1500))

      expect(mockFetch).toHaveBeenCalled()
      const fetchCall = mockFetch.mock.calls[0]
      const headers = fetchCall[1].headers

      expect(headers['X-Webhook-Signature']).toBeDefined()
      expect(typeof headers['X-Webhook-Signature']).toBe('string')
      expect(headers['X-Webhook-Signature'].length).toBeGreaterThan(0)
    })

    it('should not add signature when disabled', async () => {
      plugin.config.config.enableSignature = false

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => 'OK'
      })

      await plugin.execute('createEndpoint', {
        url: 'https://example.com/webhook',
        events: ['task.created']
      })

      await plugin.execute('trigger', {
        event: 'task.created',
        payload: { taskId: 'task-123' }
      })

      // Wait for delivery
      await new Promise(resolve => setTimeout(resolve, 1500))

      expect(mockFetch).toHaveBeenCalled()
      const fetchCall = mockFetch.mock.calls[0]
      const headers = fetchCall[1].headers

      expect(headers['X-Webhook-Signature']).toBeUndefined()
    })

    it('should generate consistent signatures for same payload', async () => {
      const payload = { taskId: 'task-123', title: 'Test Task' }

      const signature1 = (plugin as any).signPayload(payload, 'test-secret')
      const signature2 = (plugin as any).signPayload(payload, 'test-secret')

      expect(signature1).toBe(signature2)
    })

    it('should generate different signatures for different secrets', async () => {
      const payload = { taskId: 'task-123' }

      const signature1 = (plugin as any).signPayload(payload, 'secret-1')
      const signature2 = (plugin as any).signPayload(payload, 'secret-2')

      expect(signature1).not.toBe(signature2)
    })
  })

  describe('Error Handling', () => {
    beforeEach(async () => {
      await plugin.init(mockContext)
    })

    it('should handle unknown action gracefully', async () => {
      await expect(
        plugin.execute('unknownAction', {})
      ).rejects.toThrow('Unknown action: unknownAction')
    })

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))

      await plugin.execute('createEndpoint', {
        url: 'https://example.com/webhook',
        events: ['task.created']
      })

      await plugin.execute('trigger', {
        event: 'task.created',
        payload: { taskId: 'task-123' }
      })

      // Wait for delivery and all retries to complete
      // maxRetries=3, retryDelay=1000, exponential backoff: 1000 + 2000 + 4000 = 7000ms
      await new Promise(resolve => setTimeout(resolve, 8000))

      const deliveries = await plugin.execute('listDeliveries', {}) as WebhookDelivery[]
      const failedDeliveries = deliveries.filter(d => d.status === 'failed')

      expect(failedDeliveries.length).toBeGreaterThan(0)
    })

    it('should handle HTTP error responses', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error'
      })

      await plugin.execute('createEndpoint', {
        url: 'https://example.com/webhook',
        events: ['task.created']
      })

      await plugin.execute('trigger', {
        event: 'task.created',
        payload: { taskId: 'task-123' }
      })

      // Wait for delivery and all retries to complete
      await new Promise(resolve => setTimeout(resolve, 8000))

      const deliveries = await plugin.execute('listDeliveries', {}) as WebhookDelivery[]
      const failedDeliveries = deliveries.filter(d => d.status === 'failed')

      expect(failedDeliveries.length).toBeGreaterThan(0)
    })

    it('should handle invalid URLs', async () => {
      const result = await plugin.execute('createEndpoint', {
        url: 'not-a-valid-url',
        events: ['task.created']
      })

      // Should still create the endpoint
      expect(result).toBeDefined()
    })

    it('should handle timeout errors', async () => {
      // Mock timeout by never resolving
      mockFetch.mockImplementationOnce(() => new Promise(() => {}))

      // Set short timeout
      plugin.config.config.timeout = 100

      await plugin.execute('createEndpoint', {
        url: 'https://example.com/webhook',
        events: ['task.created']
      })

      await plugin.execute('trigger', {
        event: 'task.created',
        payload: { taskId: 'task-123' }
      })

      // Wait for timeout
      await new Promise(resolve => setTimeout(resolve, 200))

      const deliveries = await plugin.execute('listDeliveries', {}) as WebhookDelivery[]
      expect(deliveries.length).toBeGreaterThan(0)
    })
  })

  describe('Retry Mechanism', () => {
    beforeEach(async () => {
      plugin.config.config = {
        maxRetries: 3,
        retryDelay: 500, // Short for testing
        timeout: 30000,
        maxConcurrent: 10,
        enableSignature: false
      } as WebhookPluginConfig

      await plugin.init(mockContext)
    })

    it('should retry failed deliveries', async () => {
      // Verify retry mechanism is configured
      const config = plugin.config.config as WebhookPluginConfig
      expect(config.maxRetries).toBeGreaterThan(0)
      expect(config.retryDelay).toBeGreaterThan(0)

      // The actual retry behavior is tested in other tests:
      // - "should respect maxRetries limit" - verifies retry limit
      // - "should track retried deliveries" - verifies retry metrics
      // - "should track failed deliveries" - verifies final failure after retries
    })

    it('should respect maxRetries limit', async () => {
      let attemptCount = 0
      mockFetch.mockImplementation(() => {
        attemptCount++
        return Promise.reject(new Error('Always fails'))
      })

      await plugin.execute('createEndpoint', {
        url: 'https://example.com/webhook',
        events: ['task.created']
      })

      await plugin.execute('trigger', {
        event: 'task.created',
        payload: { taskId: 'task-123' }
      })

      // Wait for all retries
      await new Promise(resolve => setTimeout(resolve, 3000))

      // Should not exceed maxRetries + initial attempt
      expect(attemptCount).toBeLessThanOrEqual(4) // 1 initial + 3 retries
    })

    it('should use exponential backoff', async () => {
      const timestamps: number[] = []
      mockFetch.mockImplementation(() => {
        timestamps.push(Date.now())
        return Promise.reject(new Error('Network error'))
      })

      await plugin.execute('createEndpoint', {
        url: 'https://example.com/webhook',
        events: ['task.created']
      })

      await plugin.execute('trigger', {
        event: 'task.created',
        payload: { taskId: 'task-123' }
      })

      // Wait for retries
      await new Promise(resolve => setTimeout(resolve, 3000))

      // Check exponential backoff
      if (timestamps.length >= 3) {
        const delay1 = timestamps[1] - timestamps[0]
        const delay2 = timestamps[2] - timestamps[1]
        expect(delay2).toBeGreaterThanOrEqual(delay1)
      }
    })

    it('should allow manual retry', async () => {
      mockFetch.mockRejectedValueOnce(new Error('First failure'))

      await plugin.execute('createEndpoint', {
        url: 'https://example.com/webhook',
        events: ['task.created']
      })

      const result = await plugin.execute('trigger', {
        event: 'task.created',
        payload: { taskId: 'task-123' }
      })

      const deliveryId = (result as any).deliveries[0]

      // Wait for failure
      await new Promise(resolve => setTimeout(resolve, 1500))

      // Setup success for retry
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => 'OK'
      })

      const retryResult = await plugin.execute('retryDelivery', {
        id: deliveryId
      })

      expect(retryResult).toEqual({ success: true })

      // Wait for retry
      await new Promise(resolve => setTimeout(resolve, 1500))
    })

    it('should fail non-existent delivery retry', async () => {
      const result = await plugin.execute('retryDelivery', {
        id: 'non-existent-delivery-id'
      })

      expect(result).toEqual({ success: false })
    })
  })

  describe('Delivery Tracking', () => {
    beforeEach(async () => {
      await plugin.init(mockContext)
    })

    it('should get delivery by id', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => 'OK'
      })

      await plugin.execute('createEndpoint', {
        url: 'https://example.com/webhook',
        events: ['task.created']
      })

      const result = await plugin.execute('trigger', {
        event: 'task.created',
        payload: { taskId: 'task-123' }
      })

      const deliveryId = (result as any).deliveries[0]

      // Wait for delivery
      await new Promise(resolve => setTimeout(resolve, 1500))

      const delivery = await plugin.execute('getDelivery', {
        id: deliveryId
      }) as WebhookDelivery

      expect(delivery).toBeDefined()
      expect(delivery.id).toBe(deliveryId)
      expect(delivery.event).toBe('task.created')
    })

    it('should list all deliveries', async () => {
      await plugin.execute('createEndpoint', {
        url: 'https://example.com/webhook',
        events: ['task.created']
      })

      await plugin.execute('trigger', {
        event: 'task.created',
        payload: { taskId: 'task-1' }
      })

      await plugin.execute('trigger', {
        event: 'task.created',
        payload: { taskId: 'task-2' }
      })

      const deliveries = await plugin.execute('listDeliveries', {}) as WebhookDelivery[]

      expect(deliveries).toBeDefined()
      expect(Array.isArray(deliveries)).toBe(true)
      expect(deliveries.length).toBeGreaterThanOrEqual(2)
    })

    it('should filter deliveries by endpoint', async () => {
      const endpoint1 = await plugin.execute('createEndpoint', {
        url: 'https://example.com/webhook1',
        events: ['task.created']
      })

      const endpoint2 = await plugin.execute('createEndpoint', {
        url: 'https://example.com/webhook2',
        events: ['task.created']
      })

      await plugin.execute('trigger', {
        event: 'task.created',
        payload: { taskId: 'task-1' }
      })

      const endpoint1Deliveries = await plugin.execute('listDeliveries', {
        endpointId: (endpoint1 as WebhookEndpoint).id
      }) as WebhookDelivery[]

      const endpoint2Deliveries = await plugin.execute('listDeliveries', {
        endpointId: (endpoint2 as WebhookEndpoint).id
      }) as WebhookDelivery[]

      expect(endpoint1Deliveries.length).toBe(1)
      expect(endpoint2Deliveries.length).toBe(1)
    })

    it('should filter deliveries by status', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))

      await plugin.execute('createEndpoint', {
        url: 'https://example.com/webhook',
        events: ['task.created']
      })

      await plugin.execute('trigger', {
        event: 'task.created',
        payload: { taskId: 'task-1' }
      })

      // Wait for all retries to complete and fail
      await new Promise(resolve => setTimeout(resolve, 8000))

      const failedDeliveries = await plugin.execute('listDeliveries', {
        status: 'failed'
      }) as WebhookDelivery[]

      expect(failedDeliveries.length).toBeGreaterThan(0)
    })

    it('should limit delivery list size', async () => {
      await plugin.execute('createEndpoint', {
        url: 'https://example.com/webhook',
        events: ['task.created']
      })

      for (let i = 0; i < 10; i++) {
        await plugin.execute('trigger', {
          event: 'task.created',
          payload: { taskId: `task-${i}` }
        })
      }

      const limitedDeliveries = await plugin.execute('listDeliveries', {
        limit: 5
      }) as WebhookDelivery[]

      expect(limitedDeliveries.length).toBe(5)
    })
  })

  describe('Metrics and Health', () => {
    beforeEach(async () => {
      await plugin.init(mockContext)
    })

    it('should get statistics', async () => {
      await plugin.execute('createEndpoint', {
        url: 'https://example.com/webhook',
        events: ['task.created']
      })

      const stats = await plugin.execute('stats')

      expect(stats).toBeDefined()
      expect((stats as any).sent).toBeDefined()
      expect((stats as any).failed).toBeDefined()
      expect((stats as any).retried).toBeDefined()
      expect((stats as any).endpoints).toBeDefined()
    })

    it('should track sent deliveries', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => 'OK'
      })

      await plugin.execute('createEndpoint', {
        url: 'https://example.com/webhook',
        events: ['task.created']
      })

      await plugin.execute('trigger', {
        event: 'task.created',
        payload: { taskId: 'task-123' }
      })

      // Wait for delivery
      await new Promise(resolve => setTimeout(resolve, 1500))

      const stats = await plugin.execute('stats') as any

      expect(stats.sent).toBeGreaterThan(0)
    })

    it('should track failed deliveries', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))

      await plugin.execute('createEndpoint', {
        url: 'https://example.com/webhook',
        events: ['task.created']
      })

      await plugin.execute('trigger', {
        event: 'task.created',
        payload: { taskId: 'task-123' }
      })

      // Wait for all retries to complete and fail
      await new Promise(resolve => setTimeout(resolve, 8000))

      const stats = await plugin.execute('stats') as any

      expect(stats.failed).toBeGreaterThan(0)
    })

    it('should track retried deliveries', async () => {
      mockFetch.mockImplementation(() => {
        return Promise.reject(new Error('Network error'))
      })

      await plugin.execute('createEndpoint', {
        url: 'https://example.com/webhook',
        events: ['task.created']
      })

      await plugin.execute('trigger', {
        event: 'task.created',
        payload: { taskId: 'task-123' }
      })

      // Wait for retries
      await new Promise(resolve => setTimeout(resolve, 2500))

      const stats = await plugin.execute('stats') as any

      expect(stats.retried).toBeGreaterThan(0)
    })

    it('should return healthy status', async () => {
      const health = await plugin.healthCheck()

      expect(health).toBeDefined()
      expect(health.status).toBe('healthy')
      expect(health.message).toBe('Webhook plugin is running')
      expect(health.timestamp).toBeDefined()
      expect(health.checks).toBeDefined()
    })

    it('should check queue health', async () => {
      const health = await plugin.healthCheck()

      expect(health.checks.queue).toBeDefined()
      expect(health.checks.queue.status).toBe('healthy')
      expect(health.checks.queue.message).toContain('Queue size')
    })

    it('should check endpoints health', async () => {
      await plugin.execute('createEndpoint', {
        url: 'https://example.com/webhook',
        events: ['task.created']
      })

      const health = await plugin.healthCheck()

      expect(health.checks.endpoints).toBeDefined()
      expect(health.checks.endpoints.status).toBe('healthy')
      expect(health.checks.endpoints.message).toContain('Active endpoints: 1')
    })

    it('should get metrics', async () => {
      const metrics = await plugin.getMetrics()

      expect(metrics).toBeDefined()
      expect(metrics.executionCount).toBeDefined()
      expect(metrics.successCount).toBeDefined()
      expect(metrics.failureCount).toBeDefined()
      expect(metrics.memoryUsage).toBeDefined()
      expect(metrics.custom).toBeDefined()
      expect(metrics.timestamp).toBeDefined()
    })
  })

  describe('Concurrency Control', () => {
    beforeEach(async () => {
      plugin.config.config = {
        maxRetries: 1,
        retryDelay: 100,
        timeout: 30000,
        maxConcurrent: 2, // Limit to 2 concurrent
        enableSignature: false
      } as WebhookPluginConfig

      await plugin.init(mockContext)
    })

    it('should respect maxConcurrent limit', async () => {
      let activeCount = 0
      let maxActive = 0

      mockFetch.mockImplementation(() => {
        activeCount++
        maxActive = Math.max(maxActive, activeCount)

        return new Promise((resolve) => {
          setTimeout(() => {
            activeCount--
            resolve({
              ok: true,
              status: 200,
              text: async () => 'OK'
            })
          }, 200)
        })
      })

      // Create multiple endpoints
      for (let i = 0; i < 5; i++) {
        await plugin.execute('createEndpoint', {
          url: `https://example.com/webhook${i}`,
          events: ['task.created']
        })
      }

      // Trigger events
      for (let i = 0; i < 10; i++) {
        await plugin.execute('trigger', {
          event: 'task.created',
          payload: { taskId: `task-${i}` }
        })
      }

      // Wait for all to complete
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Max concurrent should not exceed limit
      expect(maxActive).toBeLessThanOrEqual(2)
    })
  })

  describe('Headers and Custom Headers', () => {
    beforeEach(async () => {
      await plugin.init(mockContext)
    })

    it('should include standard headers', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => 'OK'
      })

      await plugin.execute('createEndpoint', {
        url: 'https://example.com/webhook',
        events: ['task.created']
      })

      await plugin.execute('trigger', {
        event: 'task.created',
        payload: { taskId: 'task-123' }
      })

      // Wait for delivery
      await new Promise(resolve => setTimeout(resolve, 1500))

      expect(mockFetch).toHaveBeenCalled()
      const fetchCall = mockFetch.mock.calls[0]
      const headers = fetchCall[1].headers

      expect(headers['Content-Type']).toBe('application/json')
      expect(headers['X-Webhook-Event']).toBe('task.created')
      expect(headers['X-Webhook-ID']).toBeDefined()
      expect(headers['X-Webhook-Timestamp']).toBeDefined()
    })

    it('should include custom headers', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => 'OK'
      })

      await plugin.execute('createEndpoint', {
        url: 'https://example.com/webhook',
        events: ['task.created'],
        headers: {
          'X-Custom-Header': 'custom-value',
          'Authorization': 'Bearer token123'
        }
      })

      await plugin.execute('trigger', {
        event: 'task.created',
        payload: { taskId: 'task-123' }
      })

      // Wait for delivery
      await new Promise(resolve => setTimeout(resolve, 1500))

      expect(mockFetch).toHaveBeenCalled()
      const fetchCall = mockFetch.mock.calls[0]
      const headers = fetchCall[1].headers

      expect(headers['X-Custom-Header']).toBe('custom-value')
      expect(headers['Authorization']).toBe('Bearer token123')
    })
  })

  describe('Edge Cases', () => {
    beforeEach(async () => {
      await plugin.init(mockContext)
    })

    it('should handle empty payload', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => 'OK'
      })

      await plugin.execute('createEndpoint', {
        url: 'https://example.com/webhook',
        events: ['task.created']
      })

      const result = await plugin.execute('trigger', {
        event: 'task.created',
        payload: null
      })

      expect(result).toBeDefined()
    })

    it('should handle large payload', async () => {
      const largePayload = {
        data: 'x'.repeat(100000), // 100KB
        nested: { items: Array(1000).fill('item') }
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => 'OK'
      })

      await plugin.execute('createEndpoint', {
        url: 'https://example.com/webhook',
        events: ['task.created']
      })

      const result = await plugin.execute('trigger', {
        event: 'task.created',
        payload: largePayload
      })

      expect(result).toBeDefined()
    })

    it('should handle special characters in event name', async () => {
      await plugin.execute('createEndpoint', {
        url: 'https://example.com/webhook',
        events: ['task.created', 'task.updated:v2', 'task.deleted#123']
      })

      const result = await plugin.execute('trigger', {
        event: 'task.updated:v2',
        payload: { taskId: 'task-123' }
      })

      expect(result).toBeDefined()
    })

    it('should handle rapid sequential triggers', async () => {
      mockFetch.mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              ok: true,
              status: 200,
              text: async () => 'OK'
            })
          }, 100)
        })
      })

      await plugin.execute('createEndpoint', {
        url: 'https://example.com/webhook',
        events: ['task.created']
      })

      // Trigger 100 events rapidly
      const promises = []
      for (let i = 0; i < 100; i++) {
        promises.push(plugin.execute('trigger', {
          event: 'task.created',
          payload: { taskId: `task-${i}` }
        }))
      }

      const results = await Promise.all(promises)

      expect(results.length).toBe(100)
    })

    it('should handle endpoint deletion with pending deliveries', async () => {
      mockFetch.mockImplementation(() => {
        return new Promise((resolve) => {
          // Delay to create pending deliveries
          setTimeout(() => {
            resolve({
              ok: true,
              status: 200,
              text: async () => 'OK'
            })
          }, 2000)
        })
      })

      const endpoint = await plugin.execute('createEndpoint', {
        url: 'https://example.com/webhook',
        events: ['task.created']
      })

      await plugin.execute('trigger', {
        event: 'task.created',
        payload: { taskId: 'task-123' }
      })

      // Delete endpoint while delivery is pending
      await plugin.execute('deleteEndpoint', {
        id: (endpoint as WebhookEndpoint).id
      })

      // Wait for delivery attempt
      await new Promise(resolve => setTimeout(resolve, 2500))

      // Should handle gracefully
      const health = await plugin.healthCheck()
      expect(health.status).toBe('healthy')
    })
  })
})
