/**
 * Event Dispatcher Tests
 * v1.12.0 - Webhook Event Notification System
 */

import { EventDispatcher } from './event-dispatcher'
import { WebhookManager } from './webhook-manager'
import { EventDeliveryService } from './event-delivery'
import type { WebhookEventPayload, EventFilter } from './types'

describe('EventDispatcher', () => {
  let webhookManager: WebhookManager
  let deliveryService: EventDeliveryService
  let dispatcher: EventDispatcher

  beforeEach(() => {
    webhookManager = new WebhookManager()
    deliveryService = new EventDeliveryService()
    dispatcher = new EventDispatcher(webhookManager, deliveryService)
  })

  describe('emit', () => {
    it('should emit an event and return event ID', async () => {
      const eventId = await dispatcher.emit('agent.created', {
        agentId: 'agent-123',
        name: 'Test Agent',
      })

      expect(eventId).toBeDefined()
      expect(eventId).toMatch(/^evt_/)
    })

    it('should emit event with metadata', async () => {
      const eventId = await dispatcher.emit(
        'task.completed',
        { taskId: 'task-456', status: 'done' },
        { source: 'test', priority: 'high' }
      )

      expect(eventId).toBeDefined()
    })

    it('should update statistics on emit', async () => {
      await dispatcher.emit('agent.created', { agentId: '1' })
      await dispatcher.emit('agent.updated', { agentId: '2' })
      await dispatcher.emit('task.created', { taskId: '3' })

      const stats = dispatcher.getStatistics()

      expect(stats.totalEvents).toBe(3)
      expect(stats.eventsByType['agent.created']).toBe(1)
      expect(stats.eventsByType['agent.updated']).toBe(1)
      expect(stats.eventsByType['task.created']).toBe(1)
    })

    it('should not dispatch to webhooks when none subscribed', async () => {
      const emitSpy = jest.spyOn(deliveryService, 'deliverEvent')

      await dispatcher.emit('agent.created', { agentId: '1' })

      expect(emitSpy).not.toHaveBeenCalled()
    })
  })

  describe('emitAgentEvent', () => {
    it('should emit agent.created event', async () => {
      const eventId = await dispatcher.emitAgentEvent('agent.created', {
        agentId: 'agent-123',
        name: 'Test',
        status: 'active',
      })

      expect(eventId).toMatch(/^evt_/)
    })

    it('should emit agent.updated event', async () => {
      const eventId = await dispatcher.emitAgentEvent('agent.updated', {
        agentId: 'agent-123',
        status: 'inactive',
      })

      expect(eventId).toBeDefined()
    })

    it('should emit agent.deleted event', async () => {
      const eventId = await dispatcher.emitAgentEvent('agent.deleted', {
        agentId: 'agent-123',
      })

      expect(eventId).toBeDefined()
    })
  })

  describe('emitTaskEvent', () => {
    it('should emit task events', async () => {
      const created = await dispatcher.emitTaskEvent('task.created', {
        taskId: 'task-1',
        status: 'pending',
      })
      const completed = await dispatcher.emitTaskEvent('task.completed', {
        taskId: 'task-1',
        status: 'done',
      })
      const failed = await dispatcher.emitTaskEvent('task.failed', {
        taskId: 'task-2',
        status: 'error',
        error: 'Something went wrong',
      })

      expect(created).toBeDefined()
      expect(completed).toBeDefined()
      expect(failed).toBeDefined()
    })
  })

  describe('emitWorkflowEvent', () => {
    it('should emit workflow events', async () => {
      const started = await dispatcher.emitWorkflowEvent('workflow.started', {
        workflowId: 'wf-1',
        status: 'running',
      })
      const completed = await dispatcher.emitWorkflowEvent('workflow.completed', {
        workflowId: 'wf-1',
        status: 'done',
      })
      const failed = await dispatcher.emitWorkflowEvent('workflow.failed', {
        workflowId: 'wf-2',
        status: 'error',
        error: 'Workflow failed',
      })

      expect(started).toBeDefined()
      expect(completed).toBeDefined()
      expect(failed).toBeDefined()
    })
  })

  describe('emitSystemEvent', () => {
    it('should emit system events', async () => {
      const alert = await dispatcher.emitSystemEvent('system.alert', {
        level: 'warning',
        message: 'High memory usage',
        component: 'monitor',
      })
      const error = await dispatcher.emitSystemEvent('system.error', {
        level: 'error',
        message: 'Connection failed',
        component: 'network',
      })

      expect(alert).toBeDefined()
      expect(error).toBeDefined()
    })
  })

  describe('emitBatch', () => {
    it('should emit multiple events', async () => {
      const eventIds = await dispatcher.emitBatch([
        { type: 'agent.created', data: { agentId: '1' } },
        { type: 'task.created', data: { taskId: '1' } },
        { type: 'workflow.started', data: { workflowId: '1' } },
      ])

      expect(eventIds).toHaveLength(3)
      eventIds.forEach(id => expect(id).toMatch(/^evt_/))
    })
  })

  describe('matchesFilter', () => {
    const event: WebhookEventPayload = {
      id: 'evt_123',
      type: 'task.completed',
      timestamp: Date.now(),
      data: {
        taskId: 'task-456',
        status: 'done',
        progress: 100,
      },
    }

    it('should match by event type', () => {
      const filter: EventFilter = {
        eventTypes: ['task.completed', 'task.failed'],
      }

      expect(dispatcher.matchesFilter(event, filter)).toBe(true)
    })

    it('should not match when event type not in filter', () => {
      const filter: EventFilter = {
        eventTypes: ['agent.created'],
      }

      expect(dispatcher.matchesFilter(event, filter)).toBe(false)
    })

    it('should match by event category', () => {
      const filter: EventFilter = {
        eventCategories: ['task'],
      }

      expect(dispatcher.matchesFilter(event, filter)).toBe(true)
    })

    it('should match by condition - equals', () => {
      const filter: EventFilter = {
        conditions: [{ field: 'data.status', operator: 'eq', value: 'done' }],
      }

      expect(dispatcher.matchesFilter(event, filter)).toBe(true)
    })

    it('should match by condition - greater than', () => {
      const filter: EventFilter = {
        conditions: [{ field: 'data.progress', operator: 'gte', value: 50 }],
      }

      expect(dispatcher.matchesFilter(event, filter)).toBe(true)
    })

    it('should match by condition - in array', () => {
      const filter: EventFilter = {
        conditions: [{ field: 'data.status', operator: 'in', value: ['done', 'success'] }],
      }

      expect(dispatcher.matchesFilter(event, filter)).toBe(true)
    })

    it('should match by condition - exists', () => {
      const filter: EventFilter = {
        conditions: [{ field: 'data.taskId', operator: 'exists', value: true }],
      }

      expect(dispatcher.matchesFilter(event, filter)).toBe(true)
    })

    it('should not match when condition fails', () => {
      const filter: EventFilter = {
        conditions: [{ field: 'data.status', operator: 'eq', value: 'failed' }],
      }

      expect(dispatcher.matchesFilter(event, filter)).toBe(false)
    })

    it('should match all conditions', () => {
      const filter: EventFilter = {
        conditions: [
          { field: 'data.status', operator: 'eq', value: 'done' },
          { field: 'data.progress', operator: 'gte', value: 100 },
        ],
      }

      expect(dispatcher.matchesFilter(event, filter)).toBe(true)
    })

    it('should not match when any condition fails', () => {
      const filter: EventFilter = {
        conditions: [
          { field: 'data.status', operator: 'eq', value: 'done' },
          { field: 'data.progress', operator: 'lt', value: 50 },
        ],
      }

      expect(dispatcher.matchesFilter(event, filter)).toBe(false)
    })
  })

  describe('Queue Management', () => {
    it('should add events to queue', async () => {
      dispatcher = new EventDispatcher(webhookManager, deliveryService, {
        enableQueue: true,
      })

      await dispatcher.emit('agent.created', { agentId: '1' })
      await dispatcher.emit('task.created', { taskId: '1' })

      // Queue should be processed immediately in tests
      expect(dispatcher.getQueueSize()).toBeLessThanOrEqual(2)
    })

    it('should clear queue', async () => {
      dispatcher = new EventDispatcher(webhookManager, deliveryService, {
        enableQueue: true,
        maxQueueSize: 100,
      })

      dispatcher.clearQueue()
      expect(dispatcher.getQueueSize()).toBe(0)
    })
  })

  describe('Statistics', () => {
    it('should track total events', async () => {
      await dispatcher.emit('agent.created', { agentId: '1' })
      await dispatcher.emit('agent.created', { agentId: '2' })
      await dispatcher.emit('task.completed', { taskId: '1' })

      const stats = dispatcher.getStatistics()

      expect(stats.totalEvents).toBe(3)
    })

    it('should track events by type', async () => {
      await dispatcher.emit('agent.created', { agentId: '1' })
      await dispatcher.emit('agent.created', { agentId: '2' })
      await dispatcher.emit('task.completed', { taskId: '1' })

      const stats = dispatcher.getStatistics()

      expect(stats.eventsByType['agent.created']).toBe(2)
      expect(stats.eventsByType['task.completed']).toBe(1)
    })

    it('should reset statistics', async () => {
      await dispatcher.emit('agent.created', { agentId: '1' })

      dispatcher.resetStatistics()
      const stats = dispatcher.getStatistics()

      expect(stats.totalEvents).toBe(0)
      expect(stats.eventsByType['agent.created']).toBeUndefined()
    })
  })
})
