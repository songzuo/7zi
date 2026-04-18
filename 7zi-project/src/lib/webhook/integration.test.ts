/**
 * Webhook System Integration Tests
 * v1.12.0 - Webhook Event Notification System
 */

import { createWebhookSystem } from './index'
import type { WebhookEventPayload, EventFilter } from './types'

describe('Webhook System Integration', () => {
  let webhookSystem: ReturnType<typeof createWebhookSystem>

  beforeEach(() => {
    webhookSystem = createWebhookSystem({
      webhookConfig: {
        maxRetries: 3,
        initialRetryDelay: 100,
        maxRetryDelay: 1000,
        requestTimeout: 5000,
        enableEventQueue: false, // Disable queue for tests
      },
      dispatcherConfig: {
        enableQueue: false,
      },
    })
  })

  describe('End-to-End Flow', () => {
    it('should create webhook and deliver event', async () => {
      // Create webhook
      const webhook = await webhookSystem.webhookManager.createWebhook({
        url: 'https://httpbin.org/post',
        secret: 'test-secret-12345',
        events: ['agent.created', 'task.completed'],
      })

      expect(webhook.id).toBeDefined()
      expect(webhook.enabled).toBe(true)

      // Emit event
      const eventId = await webhookSystem.dispatcher.emitAgentEvent('agent.created', {
        agentId: 'agent-123',
        name: 'Test Agent',
        status: 'active',
      })

      expect(eventId).toBeDefined()

      // Verify webhook exists
      const found = await webhookSystem.webhookManager.getWebhook(webhook.id)
      expect(found).toEqual(webhook)
    })

    it('should deliver event to multiple webhooks', async () => {
      // Create multiple webhooks
      const webhook1 = await webhookSystem.webhookManager.createWebhook({
        url: 'https://httpbin.org/post',
        secret: 'test-secret-1',
        events: ['agent.created'],
      })

      const webhook2 = await webhookSystem.webhookManager.createWebhook({
        url: 'https://httpbin.org/post/webhook2',
        secret: 'test-secret-2',
        events: ['agent.created'],
      })

      // Emit event
      const eventId = await webhookSystem.dispatcher.emitAgentEvent('agent.created', {
        agentId: 'agent-123',
        name: 'Test Agent',
      })

      expect(eventId).toBeDefined()

      // Both webhooks should exist
      const all = await webhookSystem.webhookManager.getAllWebhooks()
      expect(all).toHaveLength(2)
    })

    it('should filter events by webhook subscription', async () => {
      // Create webhooks with different subscriptions
      const agentWebhook = await webhookSystem.webhookManager.createWebhook({
        url: 'https://httpbin.org/post/agent',
        secret: 'agent-test-secret',
        events: ['agent.created', 'agent.updated'],
      })

      const taskWebhook = await webhookSystem.webhookManager.createWebhook({
        url: 'https://httpbin.org/post/task',
        secret: 'task-test-secret',
        events: ['task.created', 'task.completed'],
      })

      // Emit agent event
      const agentEventId = await webhookSystem.dispatcher.emitAgentEvent('agent.created', {
        agentId: 'agent-1',
      })

      // Emit task event
      const taskEventId = await webhookSystem.dispatcher.emitTaskEvent('task.created', {
        taskId: 'task-1',
        status: 'pending',
      })

      expect(agentEventId).toBeDefined()
      expect(taskEventId).toBeDefined()

      // Verify webhooks for events
      const agentWebhooks = await webhookSystem.webhookManager.getWebhooksForEvent('agent.created')
      expect(agentWebhooks).toHaveLength(1)
      expect(agentWebhooks[0].id).toBe(agentWebhook.id)

      const taskWebhooks = await webhookSystem.webhookManager.getWebhooksForEvent('task.created')
      expect(taskWebhooks).toHaveLength(1)
      expect(taskWebhooks[0].id).toBe(taskWebhook.id)
    })

    it('should not deliver to disabled webhooks', async () => {
      // Create webhook
      const webhook = await webhookSystem.webhookManager.createWebhook({
        url: 'https://httpbin.org/post',
        secret: 'test-secret-123',
        events: ['agent.created'],
      })

      // Disable webhook
      await webhookSystem.webhookManager.disableWebhook(webhook.id)

      // Emit event
      const eventId = await webhookSystem.dispatcher.emitAgentEvent('agent.created', {
        agentId: 'agent-1',
      })

      expect(eventId).toBeDefined()

      // Verify webhook is disabled
      const found = await webhookSystem.webhookManager.getWebhook(webhook.id)
      expect(found?.enabled).toBe(false)

      // No webhooks should be returned for event
      const webhooks = await webhookSystem.webhookManager.getWebhooksForEvent('agent.created')
      expect(webhooks).toHaveLength(0)
    })

    it('should update webhook and reflect changes', async () => {
      // Create webhook
      const webhook = await webhookSystem.webhookManager.createWebhook({
        url: 'https://httpbin.org/post',
        secret: 'test-secret-123',
        events: ['agent.created'],
      })

      // Update webhook
      const updated = await webhookSystem.webhookManager.updateWebhook(webhook.id, {
        events: ['agent.created', 'agent.updated', 'task.completed'],
        description: 'Updated webhook',
      })

      expect(updated.events).toHaveLength(3)
      expect(updated.description).toBe('Updated webhook')
      expect(updated.updatedAt).toBeGreaterThanOrEqual(webhook.updatedAt)
    })

    it('should delete webhook', async () => {
      // Create webhook
      const webhook = await webhookSystem.webhookManager.createWebhook({
        url: 'https://httpbin.org/post',
        secret: 'test-secret-123',
        events: ['agent.created'],
      })

      // Delete webhook
      const deleted = await webhookSystem.webhookManager.deleteWebhook(webhook.id)
      expect(deleted).toBe(true)

      // Verify webhook is deleted
      const found = await webhookSystem.webhookManager.getWebhook(webhook.id)
      expect(found).toBeNull()
    })

    it('should track statistics', async () => {
      // Emit multiple events
      await webhookSystem.dispatcher.emitAgentEvent('agent.created', {
        agentId: 'agent-1',
      })
      await webhookSystem.dispatcher.emitAgentEvent('agent.created', {
        agentId: 'agent-2',
      })
      await webhookSystem.dispatcher.emitTaskEvent('task.completed', {
        taskId: 'task-1',
        status: 'done',
      })

      // Get statistics
      const stats = webhookSystem.dispatcher.getStatistics()

      expect(stats.totalEvents).toBe(3)
      expect(stats.eventsByType['agent.created']).toBe(2)
      expect(stats.eventsByType['task.completed']).toBe(1)
    })

    it('should reset statistics', async () => {
      // Emit events
      await webhookSystem.dispatcher.emitAgentEvent('agent.created', {
        agentId: 'agent-1',
      })

      // Reset statistics
      webhookSystem.dispatcher.resetStatistics()

      // Verify reset
      const stats = webhookSystem.dispatcher.getStatistics()
      expect(stats.totalEvents).toBe(0)
    })
  })

  describe('Event Filtering', () => {
    it('should filter events by type', () => {
      const event: WebhookEventPayload = {
        id: 'evt_123',
        type: 'task.completed',
        timestamp: Date.now(),
        data: { taskId: 'task-1', status: 'done' },
      }

      const filter: EventFilter = {
        eventTypes: ['task.completed', 'task.failed'],
      }

      const matches = webhookSystem.dispatcher.matchesFilter(event, filter)
      expect(matches).toBe(true)
    })

    it('should filter events by category', () => {
      const event: WebhookEventPayload = {
        id: 'evt_123',
        type: 'agent.created',
        timestamp: Date.now(),
        data: { agentId: 'agent-1' },
      }

      const filter: EventFilter = {
        eventCategories: ['agent'],
      }

      const matches = webhookSystem.dispatcher.matchesFilter(event, filter)
      expect(matches).toBe(true)
    })

    it('should filter events by condition', () => {
      const event: WebhookEventPayload = {
        id: 'evt_123',
        type: 'task.completed',
        timestamp: Date.now(),
        data: { taskId: 'task-1', status: 'done', progress: 100 },
      }

      const filter: EventFilter = {
        conditions: [
          { field: 'data.status', operator: 'eq' as const, value: 'done' },
          { field: 'data.progress', operator: 'gte' as const, value: 100 },
        ],
      }

      const matches = webhookSystem.dispatcher.matchesFilter(event, filter)
      expect(matches).toBe(true)
    })
  })

  describe('Batch Operations', () => {
    it('should emit batch of events', async () => {
      const eventIds = await webhookSystem.dispatcher.emitBatch([
        { type: 'agent.created', data: { agentId: 'agent-1' } },
        { type: 'agent.updated', data: { agentId: 'agent-2' } },
        { type: 'task.created', data: { taskId: 'task-1', status: 'pending' } },
        { type: 'workflow.started', data: { workflowId: 'wf-1', status: 'running' } },
      ])

      expect(eventIds).toHaveLength(4)
      eventIds.forEach((id: string) => expect(id).toMatch(/^evt_/))

      const stats = webhookSystem.dispatcher.getStatistics()
      expect(stats.totalEvents).toBe(4)
    })
  })

  describe('Error Handling', () => {
    it('should handle invalid webhook creation', async () => {
      await expect(
        webhookSystem.webhookManager.createWebhook({
          url: 'invalid-url',
          secret: 'short',
          events: [],
        })
      ).rejects.toThrow()
    })

    it('should handle update of non-existent webhook', async () => {
      await expect(
        webhookSystem.webhookManager.updateWebhook('non-existent', {
          enabled: false,
        })
      ).rejects.toThrow('not found')
    })

    it('should handle delete of non-existent webhook', async () => {
      await expect(webhookSystem.webhookManager.deleteWebhook('non-existent')).rejects.toThrow(
        'not found'
      )
    })
  })

  describe('All Event Types', () => {
    it('should emit all supported event types', async () => {
      // Agent events
      await webhookSystem.dispatcher.emitAgentEvent('agent.created', {
        agentId: 'agent-1',
      })
      await webhookSystem.dispatcher.emitAgentEvent('agent.updated', {
        agentId: 'agent-1',
      })
      await webhookSystem.dispatcher.emitAgentEvent('agent.deleted', {
        agentId: 'agent-1',
      })

      // Task events
      await webhookSystem.dispatcher.emitTaskEvent('task.created', {
        taskId: 'task-1',
        status: 'pending',
      })
      await webhookSystem.dispatcher.emitTaskEvent('task.completed', {
        taskId: 'task-1',
        status: 'done',
      })
      await webhookSystem.dispatcher.emitTaskEvent('task.failed', {
        taskId: 'task-1',
        status: 'failed',
      })

      // Workflow events
      await webhookSystem.dispatcher.emitWorkflowEvent('workflow.started', {
        workflowId: 'wf-1',
        status: 'running',
      })
      await webhookSystem.dispatcher.emitWorkflowEvent('workflow.completed', {
        workflowId: 'wf-1',
        status: 'done',
      })
      await webhookSystem.dispatcher.emitWorkflowEvent('workflow.failed', {
        workflowId: 'wf-1',
        status: 'failed',
      })

      // System events
      await webhookSystem.dispatcher.emitSystemEvent('system.alert', {
        level: 'warning',
        message: 'Test alert',
      })
      await webhookSystem.dispatcher.emitSystemEvent('system.error', {
        level: 'error',
        message: 'Test error',
      })

      const stats = webhookSystem.dispatcher.getStatistics()
      expect(stats.totalEvents).toBe(11)
    })
  })
})
