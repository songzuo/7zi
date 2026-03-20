/**
// @ts-ignore - Mock type compatibility issues
 * Agent Executor Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  SimpleEventBus,
  SevenZiExecutor,
  createSevenZiExecutor,
  type RequestContext,
  type ExecutionEventBus,
} from '../executor';
import { randomUUID } from 'crypto';
import type { Message } from '../types';

describe('SimpleEventBus', () => {
  let eventBus: SimpleEventBus;

  beforeEach(() => {
    eventBus = new SimpleEventBus();
  });

  describe('Publishing Events', () => {
    it('should publish events', () => {
      const task = {
        kind: 'task',
        id: 'task-1',
        contextId: 'ctx-1',
        status: { state: 'submitted', timestamp: new Date().toISOString() },
        history: [],
        artifacts: [],
      };
      
      eventBus.publish(task);
      const events = eventBus.getEvents();
      
      expect(events.length).toBe(1);
      expect(events[0]).toEqual(task);
    });

    it('should publish multiple events', () => {
      eventBus.publish({ kind: 'task', id: '1', contextId: 'ctx-1', status: { state: 'submitted', timestamp: new Date().toISOString() }, history: [], artifacts: [] });
      eventBus.publish({ kind: 'task', id: '2', contextId: 'ctx-2', status: { state: 'submitted', timestamp: new Date().toISOString() }, history: [], artifacts: [] });
      
      const events = eventBus.getEvents();
      expect(events.length).toBe(2);
    });

    it('should throw error when publishing after finished', () => {
      eventBus.finished();
      
      expect(() => {
        eventBus.publish({ kind: 'task', id: '1', contextId: 'ctx-1', status: { state: 'submitted', timestamp: new Date().toISOString() }, history: [], artifacts: [] });
      }).toThrow('Cannot publish events after finished() has been called');
    });
  });

  describe('Finished State', () => {
    it('should track finished state', () => {
      expect(eventBus.isFinished()).toBe(false);
      eventBus.finished();
      expect(eventBus.isFinished()).toBe(true);
    });
  });

  describe('Subscriptions', () => {
    it('should notify subscribers', () => {
      const listener = vi.fn();
      eventBus.subscribe(listener);
      
      const task = {
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

    it('should unsubscribe listeners', () => {
      const listener = vi.fn();
      eventBus.subscribe(listener);
      
      eventBus.unsubscribe(listener);
      eventBus.publish({ kind: 'task', id: '1', contextId: 'ctx-1', status: { state: 'submitted', timestamp: new Date().toISOString() }, history: [], artifacts: [] });
      
      expect(listener).not.toHaveBeenCalled();
    });

    it('should notify multiple subscribers', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      
      eventBus.subscribe(listener1);
      eventBus.subscribe(listener2);
      
      const task = {
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

  describe('Get Events', () => {
    it('should return copy of events', () => {
      const task = {
        kind: 'task',
        id: 'task-1',
        contextId: 'ctx-1',
        status: { state: 'submitted', timestamp: new Date().toISOString() },
        history: [],
        artifacts: [],
      };
      
      eventBus.publish(task);
      const events1 = eventBus.getEvents();
      const events2 = eventBus.getEvents();
      
      expect(events1).toEqual(events2);
      expect(events1).not.toBe(events2); // Different references
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

  const createTestContext = (message?: string): RequestContext => ({
    taskId: randomUUID(),
    contextId: randomUUID(),
    userMessage: {
      kind: 'message',
      parts: [{ kind: 'text', text: message || 'Hello!' }],
    },
  });

  describe('Task Execution', () => {
    it('should create initial task if not provided', async () => {
      const context = createTestContext('Hello');
      
      await executor.execute(context, eventBus);
      
      const events = eventBus.getEvents();
      const initialTask = events.find(e => 'kind' in e && e.kind === 'task');
      
      expect(initialTask).toBeDefined();
      expect(initialTask?.id).toBe(context.taskId);
      expect(initialTask?.contextId).toBe(context.contextId);
    });

    it('should update status to working', async () => {
      const context = createTestContext('Hello');
      
      await executor.execute(context, eventBus);
      
      const events = eventBus.getEvents();
      const statusUpdate = events.find(
        e => 'kind' in e && e.kind === 'status-update' && e.status?.state === 'working'
      );
      
      expect(statusUpdate).toBeDefined();
    });

    it('should create response artifact', async () => {
      const context = createTestContext('Hello');
      
      await executor.execute(context, eventBus);
      
      const events = eventBus.getEvents();
      const artifactUpdate = events.find(e => 'kind' in e && e.kind === 'artifact-update');
      
      expect(artifactUpdate).toBeDefined();
      expect('artifact' in artifactUpdate && typeof artifactUpdate.artifact === 'object' && artifactUpdate.artifact !== null && 'name' in artifactUpdate.artifact ? artifactUpdate.artifact.name : '').toBe('response');
    });

    it('should mark task as completed', async () => {
      const context = createTestContext('Hello');
      
      await executor.execute(context, eventBus);
      
      const events = eventBus.getEvents();
      const finalStatus = events.find(
        e => 'kind' in e && e.kind === 'status-update' && e.status?.state === 'completed'
      );
      
      expect(finalStatus).toBeDefined();
      expect('final' in finalStatus && finalStatus.final).toBe(true);
    });

    it('should call eventBus.finished() after completion', async () => {
      const context = createTestContext('Hello');
      
      await executor.execute(context, eventBus);
      
      expect(eventBus.isFinished()).toBe(true);
    });
  });

  describe('Message Processing', () => {
    it('should respond to greetings', async () => {
      const context = createTestContext('Hello, how are you?');
      
      await executor.execute(context, eventBus);
      
      const events = eventBus.getEvents();
      const artifactUpdate = events.find(e => 'kind' in e && e.kind === 'artifact-update');
      const artifact = 'artifact' in artifactUpdate && typeof artifactUpdate.artifact === 'object' && artifactUpdate.artifact !== null ? artifactUpdate.artifact : null;
      
      expect(artifact && typeof artifact === 'object' && 'parts' in artifact && Array.isArray(artifact.parts)).toBe(true);
      const parts = 'parts' in artifact && Array.isArray(artifact.parts) ? artifact.parts : [];
      expect(parts[0]).toBeDefined();
      expect('text' in parts[0] && typeof parts[0].text === 'string' && parts[0].text).toContain('7zi');
    });

    it('should respond to help requests', async () => {
      const context = createTestContext('What can you do?');
      
      await executor.execute(context, eventBus);
      
      const events = eventBus.getEvents();
      const artifactUpdate = events.find(e => 'kind' in e && e.kind === 'artifact-update');
      const artifact = 'artifact' in artifactUpdate && typeof artifactUpdate.artifact === 'object' && artifactUpdate.artifact !== null ? artifactUpdate.artifact : null;
      
      expect(artifact && typeof artifact === 'object' && 'parts' in artifact && Array.isArray(artifact.parts)).toBe(true);
      const parts = 'parts' in artifact && Array.isArray(artifact.parts) ? artifact.parts : [];
      expect('text' in parts[0] && typeof parts[0].text === 'string' && parts[0].text).toContain('A2A');
    });

    it('should respond to status requests', async () => {
      const context = createTestContext('status');
      
      await executor.execute(context, eventBus);
      
      const events = eventBus.getEvents();
      const artifactUpdate = events.find(e => 'kind' in e && e.kind === 'artifact-update');
      const artifact = 'artifact' in artifactUpdate && typeof artifactUpdate.artifact === 'object' && artifactUpdate.artifact !== null ? artifactUpdate.artifact : null;
      
      expect(artifact && typeof artifact === 'object' && 'parts' in artifact && Array.isArray(artifact.parts)).toBe(true);
      const parts = 'parts' in artifact && Array.isArray(artifact.parts) ? artifact.parts : [];
      expect('text' in parts[0] && typeof parts[0].text === 'string' && parts[0].text).toContain('System Status');
    });

    it('should handle unknown messages', async () => {
      const context = createTestContext('Random unknown message');
      
      await executor.execute(context, eventBus);
      
      const events = eventBus.getEvents();
      const artifactUpdate = events.find(e => 'kind' in e && e.kind === 'artifact-update');
      const artifact = 'artifact' in artifactUpdate && typeof artifactUpdate.artifact === 'object' && artifactUpdate.artifact !== null ? artifactUpdate.artifact : null;
      
      expect(artifact && typeof artifact === 'object' && 'parts' in artifact && Array.isArray(artifact.parts)).toBe(true);
      const parts = 'parts' in artifact && Array.isArray(artifact.parts) ? artifact.parts : [];
      expect('text' in parts[0] && typeof parts[0].text === 'string' && parts[0].text).toContain('Random unknown message');
    });
  });

  describe('Task Cancellation', () => {
    it('should cancel task before execution', async () => {
      const context = createTestContext('Hello');
      
      await executor.cancelTask(context.taskId, eventBus);
      await executor.execute(context, eventBus);
      
      const events = eventBus.getEvents();
      const canceledStatus = events.find(
        e => 'kind' in e && e.kind === 'status-update' && e.status?.state === 'canceled'
      );
      
      expect(canceledStatus).toBeDefined();
      expect(eventBus.isFinished()).toBe(true);
    });

    it('should remove task from cancelled set after completion', async () => {
      const context = createTestContext('Hello');
      
      await executor.cancelTask(context.taskId, eventBus);
      await executor.execute(context, eventBus);
      
      // Execute again - should work since task was removed from cancelled set
      const eventBus2 = new SimpleEventBus();
      await executor.execute(context, eventBus2);
      
      const events2 = eventBus2.getEvents();
      const canceledStatus = events2.find(
        e => 'kind' in e && e.kind === 'status-update' && e.status?.state === 'canceled'
      );
      
      expect(canceledStatus).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle errors gracefully', async () => {
      const context = createTestContext('Hello');
      context.userMessage = {} as Message; // Invalid message
      
      await executor.execute(context, eventBus);
      
      const events = eventBus.getEvents();
      const errorStatus = events.find(
        e => 'kind' in e && e.kind === 'status-update' && e.status?.state === 'failed'
      );
      
      expect(errorStatus).toBeDefined();
    });
  });

  describe('Text Extraction', () => {
    it('should extract text from message', async () => {
      const context: RequestContext = {
        taskId: randomUUID(),
        contextId: randomUUID(),
        userMessage: {
          kind: 'message',
          parts: [
            { kind: 'text', text: 'Hello ' },
            { kind: 'text', text: 'World!' },
          ],
        },
      };
      
      await executor.execute(context, eventBus);
      
      const events = eventBus.getEvents();
      const artifactUpdate = events.find(e => 'kind' in e && e.kind === 'artifact-update');
      const artifact = 'artifact' in artifactUpdate && typeof artifactUpdate.artifact === 'object' && artifactUpdate.artifact !== null ? artifactUpdate.artifact : null;
      
      expect(artifact && typeof artifact === 'object' && 'parts' in artifact && Array.isArray(artifact.parts)).toBe(true);
      const parts = 'parts' in artifact && Array.isArray(artifact.parts) ? artifact.parts : [];
      expect('text' in parts[0] && typeof parts[0].text === 'string' && parts[0].text).toContain('Hello');
    });
  });
});

describe('createSevenZiExecutor', () => {
  it('should create executor instance', () => {
    const executor = createSevenZiExecutor();
    expect(executor).toBeDefined();
    expect(executor).toBeInstanceOf(SevenZiExecutor);
  });

  it('should create new instance each time', () => {
    const executor1 = createSevenZiExecutor();
    const executor2 = createSevenZiExecutor();
    
    expect(executor1).not.toBe(executor2);
  });
});
