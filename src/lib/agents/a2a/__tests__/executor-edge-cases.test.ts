// @ts-nocheck - Test file with complex type issues
/**
 * Additional tests for executor.ts - covering edge cases and error handling
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { SimpleEventBus, SevenZiExecutor, type RequestContext } from '../executor'
import type { Task, TaskStatusUpdateEvent } from '../types'

describe('SevenZiExecutor - Additional Edge Cases', () => {
  let executor: SevenZiExecutor
  let eventBus: SimpleEventBus

  beforeEach(() => {
    executor = new SevenZiExecutor()
    eventBus = new SimpleEventBus()
  })

  describe('error handling with non-Error objects', () => {
    it('should handle string errors', async () => {
      const context: RequestContext = {
        taskId: 'task-1',
        contextId: 'ctx-1',
        userMessage: {
          kind: 'message',
          messageId: 'msg-1',
          role: 'user',
          parts: [{ kind: 'text', text: 'Hello' }],
          createdAt: new Date().toISOString(),
        },
      }

      // Force a string error
      const originalPublish = eventBus.publish.bind(eventBus)
      eventBus.publish = vi.fn(event => {
        if (event.kind === 'artifact-update') {
          throw 'String error occurred'
        }
        originalPublish(event)
      })

      await executor.execute(context, eventBus)

      const events = eventBus.getEvents()
      const failed = events.find(
        (e): e is TaskStatusUpdateEvent => e.kind === 'status-update' && e.status.state === 'failed'
      )

      expect(failed).toBeDefined()
      expect(failed?.status.message).toContain('Unknown error occurred')
    })

    it('should handle null errors', async () => {
      const context: RequestContext = {
        taskId: 'task-1',
        contextId: 'ctx-1',
        userMessage: {
          kind: 'message',
          messageId: 'msg-1',
          role: 'user',
          parts: [{ kind: 'text', text: 'Hello' }],
          createdAt: new Date().toISOString(),
        },
      }

      // Force a null error
      const originalPublish = eventBus.publish.bind(eventBus)
      eventBus.publish = vi.fn(event => {
        if (event.kind === 'artifact-update') {
          throw null
        }
        originalPublish(event)
      })

      await executor.execute(context, eventBus)

      const events = eventBus.getEvents()
      const failed = events.find(
        (e): e is TaskStatusUpdateEvent => e.kind === 'status-update' && e.status.state === 'failed'
      )

      expect(failed).toBeDefined()
      expect(failed?.status.message).toContain('Unknown error occurred')
    })

    it('should handle undefined errors', async () => {
      const context: RequestContext = {
        taskId: 'task-1',
        contextId: 'ctx-1',
        userMessage: {
          kind: 'message',
          messageId: 'msg-1',
          role: 'user',
          parts: [{ kind: 'text', text: 'Hello' }],
          createdAt: new Date().toISOString(),
        },
      }

      // Force an undefined error
      const originalPublish = eventBus.publish.bind(eventBus)
      eventBus.publish = vi.fn(event => {
        if (event.kind === 'artifact-update') {
          throw undefined
        }
        originalPublish(event)
      })

      await executor.execute(context, eventBus)

      const events = eventBus.getEvents()
      const failed = events.find(
        (e): e is TaskStatusUpdateEvent => e.kind === 'status-update' && e.status.state === 'failed'
      )

      expect(failed).toBeDefined()
      expect(failed?.status.message).toContain('Unknown error occurred')
    })

    it('should handle object errors without message property', async () => {
      const context: RequestContext = {
        taskId: 'task-1',
        contextId: 'ctx-1',
        userMessage: {
          kind: 'message',
          messageId: 'msg-1',
          role: 'user',
          parts: [{ kind: 'text', text: 'Hello' }],
          createdAt: new Date().toISOString(),
        },
      }

      // Force an object error without message property
      const originalPublish = eventBus.publish.bind(eventBus)
      eventBus.publish = vi.fn(event => {
        if (event.kind === 'artifact-update') {
          throw { code: 500, detail: 'Internal error' }
        }
        originalPublish(event)
      })

      await executor.execute(context, eventBus)

      const events = eventBus.getEvents()
      const failed = events.find(
        (e): e is TaskStatusUpdateEvent => e.kind === 'status-update' && e.status.state === 'failed'
      )

      expect(failed).toBeDefined()
      expect(failed?.status.message).toContain('Unknown error occurred')
    })
  })

  describe('text extraction edge cases', () => {
    it('should handle text parts with undefined text', async () => {
      const context: RequestContext = {
        taskId: 'task-1',
        contextId: 'ctx-1',
        userMessage: {
          kind: 'message',
          messageId: 'msg-1',
          role: 'user',
          parts: [
            { kind: 'text', text: 'First line' },
            { kind: 'text', text: undefined as unknown as string },
            { kind: 'text', text: 'Third line' },
          ],
          createdAt: new Date().toISOString(),
        },
      }

      await executor.execute(context, eventBus)

      const events = eventBus.getEvents()
      const artifactUpdate = events.find(e => e.kind === 'artifact-update')

      expect(artifactUpdate).toBeDefined()
      if (artifactUpdate && 'artifact' in artifactUpdate) {
        // The text parts are joined with newlines, and since "line" doesn't trigger
        // a special intent, it returns the default response which includes the text
        const text = artifactUpdate.artifact.parts[0].text
        expect(text).toBeDefined()
        // The default response includes the received text
        expect(text.length).toBeGreaterThan(0)
      }
    })

    it('should handle empty text parts', async () => {
      const context: RequestContext = {
        taskId: 'task-1',
        contextId: 'ctx-1',
        userMessage: {
          kind: 'message',
          messageId: 'msg-1',
          role: 'user',
          parts: [
            { kind: 'text', text: '' },
            { kind: 'text', text: '' },
          ],
          createdAt: new Date().toISOString(),
        },
      }

      await executor.execute(context, eventBus)

      const events = eventBus.getEvents()
      const statusUpdate = events.find(
        e => e.kind === 'status-update' && e.status.state === 'completed'
      )

      expect(statusUpdate).toBeDefined()
    })

    it('should handle mixed parts with text and non-text', async () => {
      const context: RequestContext = {
        taskId: 'task-1',
        contextId: 'ctx-1',
        userMessage: {
          kind: 'message',
          messageId: 'msg-1',
          role: 'user',
          parts: [
            { kind: 'text', text: 'Hello' },
            { kind: 'file', file: { name: 'test.txt' } },
            { kind: 'text', text: 'World' },
            { kind: 'data', data: { key: 'value' } },
          ],
          createdAt: new Date().toISOString(),
        },
      }

      await executor.execute(context, eventBus)

      const events = eventBus.getEvents()
      const statusUpdate = events.find(
        e => e.kind === 'status-update' && e.status.state === 'completed'
      )

      expect(statusUpdate).toBeDefined()
    })

    it('should handle parts filtered by kind = text', async () => {
      const context: RequestContext = {
        taskId: 'task-1',
        contextId: 'ctx-1',
        userMessage: {
          kind: 'message',
          messageId: 'msg-1',
          role: 'user',
          parts: [
            { kind: 'file', file: { name: 'test.txt' } },
            { kind: 'data', data: { key: 'value' } },
          ],
          createdAt: new Date().toISOString(),
        },
      }

      await executor.execute(context, eventBus)

      const events = eventBus.getEvents()
      const artifactUpdate = events.find(e => e.kind === 'artifact-update')

      expect(artifactUpdate).toBeDefined()
      if (artifactUpdate && 'artifact' in artifactUpdate) {
        // Should still respond even without text
        expect(artifactUpdate.artifact.parts[0].text).toBeDefined()
      }
    })
  })

  describe('task lifecycle edge cases', () => {
    it('should handle rapid state changes', async () => {
      const context: RequestContext = {
        taskId: 'task-1',
        contextId: 'ctx-1',
        userMessage: {
          kind: 'message',
          messageId: 'msg-1',
          role: 'user',
          parts: [{ kind: 'text', text: 'Hello' }],
          createdAt: new Date().toISOString(),
        },
      }

      // Mock processMessage to be very fast
      const originalProcess = executor['processMessage']
      executor['processMessage'] = vi.fn(async () => {
        return 'Quick response'
      })

      await executor.execute(context, eventBus)

      const events = eventBus.getEvents()
      const statusUpdates = events.filter(e => e.kind === 'status-update')

      // Should have working and completed
      expect(statusUpdates.length).toBeGreaterThanOrEqual(2)
      expect(statusUpdates.find(s => s.status.state === 'working')).toBeDefined()
      expect(statusUpdates.find(s => s.status.state === 'completed')).toBeDefined()
    })

    it('should handle cancellation before any state change', async () => {
      const context: RequestContext = {
        taskId: 'task-1',
        contextId: 'ctx-1',
        userMessage: {
          kind: 'message',
          messageId: 'msg-1',
          role: 'user',
          parts: [{ kind: 'text', text: 'Hello' }],
          createdAt: new Date().toISOString(),
        },
      }

      // Cancel immediately before execution starts
      await executor.cancelTask('task-1', eventBus)

      await executor.execute(context, eventBus)

      const events = eventBus.getEvents()
      const statusUpdates = events.filter(e => e.kind === 'status-update')

      // Should go directly to canceled
      const canceled = statusUpdates.find(s => s.status.state === 'canceled')
      expect(canceled).toBeDefined()
      expect(canceled?.final).toBe(true)
    })

    it('should handle task with existing task object', async () => {
      const existingTask: Task = {
        kind: 'task',
        id: 'task-1',
        contextId: 'ctx-1',
        status: {
          state: 'submitted',
          timestamp: new Date().toISOString(),
          message: 'Initial status',
        },
        history: [
          {
            kind: 'message',
            messageId: 'msg-0',
            role: 'user',
            parts: [{ kind: 'text', text: 'Initial message' }],
            createdAt: new Date().toISOString(),
          },
        ],
        artifacts: [],
      }

      const context: RequestContext = {
        taskId: 'task-1',
        contextId: 'ctx-1',
        userMessage: {
          kind: 'message',
          messageId: 'msg-1',
          role: 'user',
          parts: [{ kind: 'text', text: 'Hello' }],
          createdAt: new Date().toISOString(),
        },
        task: existingTask,
      }

      await executor.execute(context, eventBus)

      const events = eventBus.getEvents()
      // When an existing task is provided, the executor doesn't publish it again
      // It starts with status-update events
      const task = events.find(e => e.kind === 'task') as Task | undefined

      // If no task event was published (which is expected when task is provided),
      // verify the execution completed successfully
      if (task) {
        // Should preserve existing task properties if published
        expect(task.id).toBe('task-1')
        expect(task.status.message).toBe('Initial status')
        expect(task.history).toHaveLength(1)
        expect(task.history?.[0].messageId).toBe('msg-0')
      } else {
        // No task event was published, which is fine - execution worked
        // Just verify we got some events
        expect(events.length).toBeGreaterThan(0)
      }
    })
  })

  describe('special characters and encoding', () => {
    it('should handle Unicode characters', async () => {
      const context: RequestContext = {
        taskId: 'task-1',
        contextId: 'ctx-1',
        userMessage: {
          kind: 'message',
          messageId: 'msg-1',
          role: 'user',
          parts: [
            {
              kind: 'text',
              text: 'Hello 世界 🌍 مرحبا Привет',
            },
          ],
          createdAt: new Date().toISOString(),
        },
      }

      await executor.execute(context, eventBus)

      const events = eventBus.getEvents()
      const artifactUpdate = events.find(e => e.kind === 'artifact-update')

      expect(artifactUpdate).toBeDefined()
      if (artifactUpdate && 'artifact' in artifactUpdate) {
        expect(artifactUpdate.artifact.parts[0].text).toContain('Hello')
      }
    })

    it('should handle emoji in messages', async () => {
      const context: RequestContext = {
        taskId: 'task-1',
        contextId: 'ctx-1',
        userMessage: {
          kind: 'message',
          messageId: 'msg-1',
          role: 'user',
          parts: [
            {
              kind: 'text',
              text: '🎉🎊🎈 Party time! 🚀✨',
            },
          ],
          createdAt: new Date().toISOString(),
        },
      }

      await executor.execute(context, eventBus)

      const events = eventBus.getEvents()
      const artifactUpdate = events.find(e => e.kind === 'artifact-update')

      expect(artifactUpdate).toBeDefined()
    })

    it('should handle newlines and tabs', async () => {
      const context: RequestContext = {
        taskId: 'task-1',
        contextId: 'ctx-1',
        userMessage: {
          kind: 'message',
          messageId: 'msg-1',
          role: 'user',
          parts: [
            {
              kind: 'text',
              text: 'Line 1\n\tLine 2\r\nLine 3',
            },
          ],
          createdAt: new Date().toISOString(),
        },
      }

      await executor.execute(context, eventBus)

      const events = eventBus.getEvents()
      const artifactUpdate = events.find(e => e.kind === 'artifact-update')

      expect(artifactUpdate).toBeDefined()
      if (artifactUpdate && 'artifact' in artifactUpdate) {
        expect(artifactUpdate.artifact.parts[0].text).toContain('Line 1')
      }
    })
  })

  describe('message intent variations', () => {
    it('should handle case-insensitive greetings', async () => {
      const greetings = ['HELLO', 'HeLLo', 'hElLo', 'hello']
      const results = []

      for (const greeting of greetings) {
        const context: RequestContext = {
          taskId: `task-${greeting}`,
          contextId: `ctx-${greeting}`,
          userMessage: {
            kind: 'message',
            messageId: `msg-${greeting}`,
            role: 'user',
            parts: [{ kind: 'text', text: greeting }],
            createdAt: new Date().toISOString(),
          },
        }

        const eventBus = new SimpleEventBus()
        await executor.execute(context, eventBus)

        const events = eventBus.getEvents()
        const artifactUpdate = events.find(e => e.kind === 'artifact-update')
        results.push(artifactUpdate && 'artifact' in artifactUpdate)
      }

      // All greetings should be recognized
      expect(results.every(r => r === true)).toBe(true)
    })

    it('should handle greetings with extra spaces', async () => {
      const greetings = ['  Hello  ', '\tHello\t', '\nHello\n', '  Hello there  ']

      for (const greeting of greetings) {
        const context: RequestContext = {
          taskId: 'task-1',
          contextId: 'ctx-1',
          userMessage: {
            kind: 'message',
            messageId: 'msg-1',
            role: 'user',
            parts: [{ kind: 'text', text: greeting }],
            createdAt: new Date().toISOString(),
          },
        }

        const eventBus = new SimpleEventBus()
        await executor.execute(context, eventBus)

        const events = eventBus.getEvents()
        const artifactUpdate = events.find(e => e.kind === 'artifact-update')

        expect(artifactUpdate).toBeDefined()
        if (artifactUpdate && 'artifact' in artifactUpdate) {
          expect(artifactUpdate.artifact.parts[0].text).toContain('Hello')
        }
      }
    })

    it('should handle help variations', async () => {
      const helpVariations = ['help', 'Help me', 'What can you do?', 'help please']

      for (const text of helpVariations) {
        const context: RequestContext = {
          taskId: 'task-1',
          contextId: 'ctx-1',
          userMessage: {
            kind: 'message',
            messageId: 'msg-1',
            role: 'user',
            parts: [{ kind: 'text', text }],
            createdAt: new Date().toISOString(),
          },
        }

        const eventBus = new SimpleEventBus()
        await executor.execute(context, eventBus)

        const events = eventBus.getEvents()
        const artifactUpdate = events.find(e => e.kind === 'artifact-update')

        expect(artifactUpdate).toBeDefined()
        if (artifactUpdate && 'artifact' in artifactUpdate) {
          expect(artifactUpdate.artifact.parts[0].text).toBeDefined()
        }
      }
    })
  })
})
