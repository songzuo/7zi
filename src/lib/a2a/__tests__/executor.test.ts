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
});
