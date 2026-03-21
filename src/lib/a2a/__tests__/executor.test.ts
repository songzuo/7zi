/**
 * Tests for executor.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  SimpleEventBus,
  SevenZiExecutor,
  createSevenZiExecutor,
  RequestContext,
} from '../executor';
import type { Message, Task, TaskStatusUpdateEvent } from '../types';

describe('SimpleEventBus', () => {
  let eventBus: SimpleEventBus;

  beforeEach(() => {
    eventBus = new SimpleEventBus();
  });

  describe('publish', () => {
    it('should publish events and store them', () => {
      const task: Task = {
        kind: 'task',
        id: 'task-1',
        contextId: 'ctx-1',
        status: { state: 'submitted', timestamp: new Date().toISOString() },
        history: [],
        artifacts: [],
      };

      eventBus.publish(task);

      expect(eventBus.getEvents()).toHaveLength(1);
      expect(eventBus.getEvents()[0]).toEqual(task);
    });

    it('should notify subscribers when events are published', () => {
      const listener = vi.fn();
      eventBus.subscribe(listener);

      const task: Task = {
        kind: 'task',
        id: 'task-1',
        contextId: 'ctx-1',
        status: { state: 'submitted', timestamp: new Date().toISOString() },
        history: [],
        artifacts: [],
      };

      eventBus.publish(task);

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(task);
    });

    it('should throw error when publishing after finished() is called', () => {
      eventBus.finished();

      const task: Task = {
        kind: 'task',
        id: 'task-1',
        contextId: 'ctx-1',
        status: { state: 'submitted', timestamp: new Date().toISOString() },
        history: [],
        artifacts: [],
      };

      expect(() => eventBus.publish(task)).toThrow('Cannot publish events after finished() has been called');
    });
  });

  describe('finished', () => {
    it('should mark event bus as finished', () => {
      expect(eventBus.isFinished()).toBe(false);

      eventBus.finished();

      expect(eventBus.isFinished()).toBe(true);
    });
  });

  describe('isFinished', () => {
    it('should return false initially', () => {
      expect(eventBus.isFinished()).toBe(false);
    });

    it('should return true after calling finished()', () => {
      eventBus.finished();
      expect(eventBus.isFinished()).toBe(true);
    });
  });

  describe('getEvents', () => {
    it('should return a copy of events', () => {
      const task: Task = {
        kind: 'task',
        id: 'task-1',
        contextId: 'ctx-1',
        status: { state: 'submitted', timestamp: new Date().toISOString() },
        history: [],
        artifacts: [],
      };

      eventBus.publish(task);
      const events = eventBus.getEvents();

      // Modify the returned array
      events.push({} as Task);

      // Original should be unchanged
      expect(eventBus.getEvents()).toHaveLength(1);
    });

    it('should return empty array when no events', () => {
      expect(eventBus.getEvents()).toEqual([]);
    });
  });

  describe('subscribe', () => {
    it('should add a listener', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      eventBus.subscribe(listener1);
      eventBus.subscribe(listener2);

      const task: Task = {
        kind: 'task',
        id: 'task-1',
        contextId: 'ctx-1',
        status: { state: 'submitted', timestamp: new Date().toISOString() },
        history: [],
        artifacts: [],
      };

      eventBus.publish(task);

      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);
    });
  });

  describe('unsubscribe', () => {
    it('should remove a listener', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      eventBus.subscribe(listener1);
      eventBus.subscribe(listener2);
      eventBus.unsubscribe(listener1);

      const task: Task = {
        kind: 'task',
        id: 'task-1',
        contextId: 'ctx-1',
        status: { state: 'submitted', timestamp: new Date().toISOString() },
        history: [],
        artifacts: [],
      };

      eventBus.publish(task);

      expect(listener1).not.toHaveBeenCalled();
      expect(listener2).toHaveBeenCalledTimes(1);
    });
  });
});

describe('SevenZiExecutor', () => {
  let executor: SevenZiExecutor;
  let eventBus: SimpleEventBus;

  beforeEach(() => {
    executor = new SevenZiExecutor();
    eventBus = new SimpleEventBus();
  });

  describe('execute', () => {
    const createContext = (text: string): RequestContext => ({
      taskId: 'task-1',
      contextId: 'ctx-1',
      userMessage: {
        kind: 'message',
        messageId: 'msg-1',
        role: 'user',
        parts: [{ kind: 'text', text }],
        createdAt: new Date().toISOString(),
      },
    });

    it('should create initial task when none provided', async () => {
      const context = createContext('Hello');

      await executor.execute(context, eventBus);

      const events = eventBus.getEvents();
      const task = events[0] as Task;

      expect(task.kind).toBe('task');
      expect(task.id).toBe('task-1');
      expect(task.contextId).toBe('ctx-1');
      expect(task.status.state).toBe('submitted');
    });

    it('should use existing task when provided', async () => {
      const existingTask: Task = {
        kind: 'task',
        id: 'task-1',
        contextId: 'ctx-1',
        status: { state: 'working', timestamp: new Date().toISOString() },
        history: [],
        artifacts: [],
      };

      const context = createContext('Hello');
      context.task = existingTask;

      await executor.execute(context, eventBus);

      const events = eventBus.getEvents();
      const task = events[0] as Task;

      expect(task.status.state).toBe('working');
    });

    it('should respond to greeting messages', async () => {
      const context = createContext('Hello');

      await executor.execute(context, eventBus);

      const events = eventBus.getEvents();
      const artifactUpdate = events.find(e => e.kind === 'artifact-update');

      expect(artifactUpdate).toBeDefined();
      if (artifactUpdate && 'artifact' in artifactUpdate) {
        const text = artifactUpdate.artifact.parts[0].text;
        expect(text).toContain('Hello');
        expect(text).toContain('7zi');
      }
    });

    it('should respond to help messages', async () => {
      const context = createContext('help');

      await executor.execute(context, eventBus);

      const events = eventBus.getEvents();
      const artifactUpdate = events.find(e => e.kind === 'artifact-update');

      expect(artifactUpdate).toBeDefined();
      if (artifactUpdate && 'artifact' in artifactUpdate) {
        const text = artifactUpdate.artifact.parts[0].text;
        expect(text).toContain('help');
        expect(text).toContain('A2A-compliant');
      }
    });

    it('should respond to status messages', async () => {
      const context = createContext('status');

      await executor.execute(context, eventBus);

      const events = eventBus.getEvents();
      const artifactUpdate = events.find(e => e.kind === 'artifact-update');

      expect(artifactUpdate).toBeDefined();
      if (artifactUpdate && 'artifact' in artifactUpdate) {
        const text = artifactUpdate.artifact.parts[0].text;
        expect(text).toContain('System Status');
        expect(text).toContain('task-1');
      }
    });

    it('should handle default messages', async () => {
      const context = createContext('What is the meaning of life?');

      await executor.execute(context, eventBus);

      const events = eventBus.getEvents();
      const artifactUpdate = events.find(e => e.kind === 'artifact-update');

      expect(artifactUpdate).toBeDefined();
      if (artifactUpdate && 'artifact' in artifactUpdate) {
        const text = artifactUpdate.artifact.parts[0].text;
        expect(text).toContain('What is the meaning of life?');
      }
    });

    it('should update status through lifecycle', async () => {
      const context = createContext('Hello');

      await executor.execute(context, eventBus);

      const events = eventBus.getEvents();
      const statusUpdates = events.filter(e => e.kind === 'status-update');

      expect(statusUpdates.length).toBeGreaterThanOrEqual(2);

      // Check for working state
      const working = statusUpdates.find(s => s.status.state === 'working');
      expect(working).toBeDefined();

      // Check for completed state
      const completed = statusUpdates.find(s => s.status.state === 'completed');
      expect(completed).toBeDefined();
      expect(completed?.final).toBe(true);
    });

    it('should call finished() after execution', async () => {
      const context = createContext('Hello');

      await executor.execute(context, eventBus);

      expect(eventBus.isFinished()).toBe(true);
    });

    it('should handle errors gracefully', async () => {
      const context = createContext('Hello');

      // Force an error by throwing in the eventBus
      const originalPublish = eventBus.publish.bind(eventBus);
      eventBus.publish = vi.fn((event) => {
        if (event.kind === 'artifact-update') {
          throw new Error('Test error');
        }
        originalPublish(event);
      });

      await executor.execute(context, eventBus);

      const events = eventBus.getEvents();
      const failed = events.find((e): e is TaskStatusUpdateEvent =>
        e.kind === 'status-update' && (e as TaskStatusUpdateEvent).status?.state === 'failed'
      );

      expect(failed).toBeDefined();
      expect(failed?.status.message).toContain('Test error');
    });
  });

  describe('cancelTask', () => {
    it('should mark task as canceled', async () => {
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
      };

      // Cancel the task before execution
      await executor.cancelTask('task-1', eventBus);

      await executor.execute(context, eventBus);

      const events = eventBus.getEvents();
      const canceled = events.find((e): e is TaskStatusUpdateEvent =>
        e.kind === 'status-update' && (e as TaskStatusUpdateEvent).status?.state === 'canceled'
      );

      expect(canceled).toBeDefined();
      expect(canceled?.status.message).toContain('canceled');
    });

    it('should handle cancellation during execution', async () => {
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
      };

      // Start execution but cancel immediately
      const executionPromise = executor.execute(context, eventBus);
      await executor.cancelTask('task-1', eventBus);
      await executionPromise;

      const events = eventBus.getEvents();
      const canceled = events.find(e => e.kind === 'status-update' && e.status.state === 'canceled');

      expect(canceled).toBeDefined();
    });
  });

  describe('createSevenZiExecutor', () => {
    it('should create a SevenZiExecutor instance', () => {
      const executor = createSevenZiExecutor();

      expect(executor).toBeInstanceOf(SevenZiExecutor);
    });
  });

  describe('error handling', () => {
    it('should handle empty message text', async () => {
      const context: RequestContext = {
        taskId: 'task-1',
        contextId: 'ctx-1',
        userMessage: {
          kind: 'message',
          messageId: 'msg-1',
          role: 'user',
          parts: [{ kind: 'text', text: '' }],
          createdAt: new Date().toISOString(),
        },
      };

      await executor.execute(context, eventBus);

      const events = eventBus.getEvents();
      const artifactUpdate = events.find(e => e.kind === 'artifact-update');

      expect(artifactUpdate).toBeDefined();
      if (artifactUpdate && 'artifact' in artifactUpdate) {
        expect(artifactUpdate.artifact.parts[0].text).toContain('');
      }
    });

    it('should handle messages with non-text parts', async () => {
      const context: RequestContext = {
        taskId: 'task-1',
        contextId: 'ctx-1',
        userMessage: {
          kind: 'message',
          messageId: 'msg-1',
          role: 'user',
          parts: [
            { kind: 'file', file: { name: 'test.txt', mimeType: 'text/plain' } },
          ],
          createdAt: new Date().toISOString(),
        },
      };

      await executor.execute(context, eventBus);

      const events = eventBus.getEvents();
      const statusUpdate = events.find(e => e.kind === 'status-update' && e.status.state === 'completed');

      expect(statusUpdate).toBeDefined();
    });

    it('should handle messages with undefined text parts', async () => {
      const context: RequestContext = {
        taskId: 'task-1',
        contextId: 'ctx-1',
        userMessage: {
          kind: 'message',
          messageId: 'msg-1',
          role: 'user',
          parts: [
            { kind: 'text' as const },
            { kind: 'text', text: undefined },
          ],
          createdAt: new Date().toISOString(),
        },
      };

      await executor.execute(context, eventBus);

      const events = eventBus.getEvents();
      const statusUpdate = events.find(e => e.kind === 'status-update' && e.status.state === 'completed');

      expect(statusUpdate).toBeDefined();
    });

    it('should handle missing text content gracefully', async () => {
      const context: RequestContext = {
        taskId: 'task-1',
        contextId: 'ctx-1',
        userMessage: {
          kind: 'message',
          messageId: 'msg-1',
          role: 'user',
          parts: [],
          createdAt: new Date().toISOString(),
        },
      };

      await executor.execute(context, eventBus);

      const events = eventBus.getEvents();
      const statusUpdate = events.find(e => e.kind === 'status-update' && e.status.state === 'completed');

      expect(statusUpdate).toBeDefined();
    });
  });

  describe('edge cases', () => {
    it('should handle very long messages', async () => {
      const longText = 'A'.repeat(10000);
      const context: RequestContext = {
        taskId: 'task-1',
        contextId: 'ctx-1',
        userMessage: {
          kind: 'message',
          messageId: 'msg-1',
          role: 'user',
          parts: [{ kind: 'text', text: longText }],
          createdAt: new Date().toISOString(),
        },
      };

      await executor.execute(context, eventBus);

      const events = eventBus.getEvents();
      const artifactUpdate = events.find(e => e.kind === 'artifact-update');

      expect(artifactUpdate).toBeDefined();
      if (artifactUpdate && 'artifact' in artifactUpdate) {
        expect(artifactUpdate.artifact.parts[0].text).toContain(longText.substring(0, 50));
      }
    });

    it('should handle special characters in messages', async () => {
      const specialText = 'Hello \n\r\t <script>alert("xss")</script> 🚀';
      const context: RequestContext = {
        taskId: 'task-1',
        contextId: 'ctx-1',
        userMessage: {
          kind: 'message',
          messageId: 'msg-1',
          role: 'user',
          parts: [{ kind: 'text', text: specialText }],
          createdAt: new Date().toISOString(),
        },
      };

      await executor.execute(context, eventBus);

      const events = eventBus.getEvents();
      const artifactUpdate = events.find(e => e.kind === 'artifact-update');

      expect(artifactUpdate).toBeDefined();
    });

    it('should handle messages with metadata', async () => {
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
        metadata: {
          userId: 'user-123',
          sessionId: 'session-456',
          customField: 'custom-value',
        },
      };

      await executor.execute(context, eventBus);

      const events = eventBus.getEvents();
      const task = events[0] as Task;

      expect(task.id).toBe('task-1');
    });
  });

  describe('state transitions', () => {
    it('should transition through all states: submitted -> working -> completed', async () => {
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
      };

      await executor.execute(context, eventBus);

      const events = eventBus.getEvents();
      const statusUpdates = events.filter(e => e.kind === 'status-update') as TaskStatusUpdateEvent[];

      expect(statusUpdates.length).toBeGreaterThanOrEqual(2);

      const states = statusUpdates.map(s => s.status.state);
      // The initial 'submitted' state is set when creating the task (Task object)
      // Status-update events are published for 'working' and 'completed' states
      expect(states).toContain('working');
      expect(states).toContain('completed');
    });

    it('should transition to canceled state when canceled', async () => {
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
      };

      await executor.cancelTask('task-1', eventBus);
      await executor.execute(context, eventBus);

      const events = eventBus.getEvents();
      const statusUpdates = events.filter(e => e.kind === 'status-update') as TaskStatusUpdateEvent[];
      const canceledStatus = statusUpdates.find(s => s.status.state === 'canceled');

      expect(canceledStatus).toBeDefined();
      expect(canceledStatus?.final).toBe(true);
    });

    it('should transition to failed state on error', async () => {
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
      };

      // Force an error
      const originalPublish = eventBus.publish.bind(eventBus);
      let publishCount = 0;
      eventBus.publish = vi.fn((event) => {
        publishCount++;
        // Throw on the first artifact-update
        if (event.kind === 'artifact-update' && publishCount < 5) {
          throw new Error('Simulated processing error');
        }
        originalPublish(event);
      });

      await executor.execute(context, eventBus);

      const events = eventBus.getEvents();
      const statusUpdates = events.filter(e => e.kind === 'status-update') as TaskStatusUpdateEvent[];
      const failedStatus = statusUpdates.find(s => s.status.state === 'failed');

      expect(failedStatus).toBeDefined();
      expect(failedStatus?.status.message).toContain('Simulated processing error');
      expect(failedStatus?.final).toBe(true);
    });

    it('should ensure final state is always terminal', async () => {
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
      };

      await executor.execute(context, eventBus);

      const events = eventBus.getEvents();
      const statusUpdates = events.filter(e => e.kind === 'status-update') as TaskStatusUpdateEvent[];
      const lastStatusUpdate = statusUpdates[statusUpdates.length - 1];

      expect(lastStatusUpdate?.final).toBe(true);
      expect(['completed', 'failed', 'canceled', 'rejected']).toContain(lastStatusUpdate?.status.state);
    });
  });

  describe('concurrency', () => {
    it('should handle multiple tasks concurrently', async () => {
      const context1: RequestContext = {
        taskId: 'task-1',
        contextId: 'ctx-1',
        userMessage: {
          kind: 'message',
          messageId: 'msg-1',
          role: 'user',
          parts: [{ kind: 'text', text: 'Hello 1' }],
          createdAt: new Date().toISOString(),
        },
      };

      const context2: RequestContext = {
        taskId: 'task-2',
        contextId: 'ctx-2',
        userMessage: {
          kind: 'message',
          messageId: 'msg-2',
          role: 'user',
          parts: [{ kind: 'text', text: 'Hello 2' }],
          createdAt: new Date().toISOString(),
        },
      };

      const eventBus1 = new SimpleEventBus();
      const eventBus2 = new SimpleEventBus();

      await Promise.all([
        executor.execute(context1, eventBus1),
        executor.execute(context2, eventBus2),
      ]);

      const events1 = eventBus1.getEvents();
      const events2 = eventBus2.getEvents();

      expect(events1.length).toBeGreaterThan(0);
      expect(events2.length).toBeGreaterThan(0);

      const task1 = events1[0] as Task;
      const task2 = events2[0] as Task;

      expect(task1.id).toBe('task-1');
      expect(task2.id).toBe('task-2');
    });

    it('should handle cancellation of one task while another is running', async () => {
      const context1: RequestContext = {
        taskId: 'task-1',
        contextId: 'ctx-1',
        userMessage: {
          kind: 'message',
          messageId: 'msg-1',
          role: 'user',
          parts: [{ kind: 'text', text: 'Hello 1' }],
          createdAt: new Date().toISOString(),
        },
      };

      const context2: RequestContext = {
        taskId: 'task-2',
        contextId: 'ctx-2',
        userMessage: {
          kind: 'message',
          messageId: 'msg-2',
          role: 'user',
          parts: [{ kind: 'text', text: 'Hello 2' }],
          createdAt: new Date().toISOString(),
        },
      };

      const eventBus1 = new SimpleEventBus();
      const eventBus2 = new SimpleEventBus();

      const promise1 = executor.execute(context1, eventBus1);
      const promise2 = executor.execute(context2, eventBus2);

      // Cancel task-1 while both are running
      await executor.cancelTask('task-1', eventBus1);

      await Promise.all([promise1, promise2]);

      const events1 = eventBus1.getEvents();
      const events2 = eventBus2.getEvents();

      const statusUpdates1 = events1.filter(e => e.kind === 'status-update');
      const statusUpdates2 = events2.filter(e => e.kind === 'status-update');

      const canceled1 = statusUpdates1.find(s => s.status.state === 'canceled');
      const completed2 = statusUpdates2.find(s => s.status.state === 'completed');

      expect(canceled1).toBeDefined();
      expect(completed2).toBeDefined();
    });
  });

  describe('cancelTask', () => {
    it('should handle cancellation of already completed task', async () => {
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
      };

      // Execute and complete the task first
      await executor.execute(context, eventBus);

      // Now try to cancel it
      const newEventBus = new SimpleEventBus();
      await executor.cancelTask('task-1', newEventBus);

      const newContext: RequestContext = {
        taskId: 'task-1',
        contextId: 'ctx-1',
        userMessage: {
          kind: 'message',
          messageId: 'msg-2',
          role: 'user',
          parts: [{ kind: 'text', text: 'Hello again' }],
          createdAt: new Date().toISOString(),
        },
      };

      await executor.execute(newContext, newEventBus);

      // Should be canceled
      const events = newEventBus.getEvents();
      const canceled = events.find(e => e.kind === 'status-update' && e.status.state === 'canceled');

      expect(canceled).toBeDefined();
    });

    it('should handle multiple cancellation attempts', async () => {
      await executor.cancelTask('task-1', eventBus);
      await executor.cancelTask('task-1', eventBus);
      await executor.cancelTask('task-1', eventBus);

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
      };

      await executor.execute(context, eventBus);

      const events = eventBus.getEvents();
      const canceled = events.find(e => e.kind === 'status-update' && e.status.state === 'canceled');

      expect(canceled).toBeDefined();
    });
  });

  describe('timeout scenarios', () => {
    it('should handle execution timeout', async () => {
      const slowExecutor = new SevenZiExecutor();

      // Override processMessage to simulate timeout
      const originalProcess = slowExecutor['processMessage'];
      slowExecutor['processMessage'] = async () => {
        await new Promise(resolve => setTimeout(resolve, 1000));
        return originalProcess.call(slowExecutor, 'Hello', {} as RequestContext);
      };

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
      };

      // Set a timeout for the execution
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Execution timeout')), 500);
      });

      await expect(
        Promise.race([
          slowExecutor.execute(context, eventBus),
          timeoutPromise,
        ])
      ).rejects.toThrow('Execution timeout');
    }, 10000);
  });
});
