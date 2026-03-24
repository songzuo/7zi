// @ts-nocheck - Test file with complex type issues
/**
 * Additional tests for task-store.ts - covering specific uncovered lines
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  InMemoryTaskStore,
} from '../task-store';
import type { Task, Message, Artifact } from '../types';

describe('InMemoryTaskStore - Uncovered Lines', () => {
  let store: InMemoryTaskStore;

  beforeEach(() => {
    store = new InMemoryTaskStore();
  });

  describe('Line 51: Creating new Set for context', () => {
    it('should create new Set when context does not exist (line 51)', () => {
      // This tests the exact line: this.contextTasks.set(task.contextId, new Set());
      const task = store.createTask('new-context');

      expect(task.contextId).toBe('new-context');

      // Verify the task was created and indexed
      const tasksByContext = store.getTasksByContext('new-context');
      expect(tasksByContext).toHaveLength(1);
      expect(tasksByContext[0].id).toBe(task.id);
    });

    it('should handle creating multiple tasks in new contexts', () => {
      const task1 = store.createTask('context-1');
      const task2 = store.createTask('context-2');
      const task3 = store.createTask('context-3');

      const tasks1 = store.getTasksByContext('context-1');
      const tasks2 = store.getTasksByContext('context-2');
      const tasks3 = store.getTasksByContext('context-3');

      expect(tasks1).toHaveLength(1);
      expect(tasks2).toHaveLength(1);
      expect(tasks3).toHaveLength(1);

      expect(tasks1[0].id).toBe(task1.id);
      expect(tasks2[0].id).toBe(task2.id);
      expect(tasks3[0].id).toBe(task3.id);
    });

    it('should reuse existing Set when context already exists', () => {
      const task1 = store.createTask('shared-context');
      const task2 = store.createTask('shared-context');

      const tasks = store.getTasksByContext('shared-context');

      expect(tasks).toHaveLength(2);
      expect(tasks[0].id).not.toBe(tasks[1].id);
    });
  });

  describe('Line 87: Spreading artifacts array', () => {
    it('should spread empty artifacts array when adding first artifact (line 87)', () => {
      // This tests: artifacts: [...(task.artifacts || []), artifact]
      const task = store.createTask('ctx-1');

      expect(task.artifacts).toEqual([]);

      const artifact: Artifact = {
        artifactId: 'art-1',
        name: 'response',
        parts: [{ kind: 'text', text: 'Hello' }],
      };

      const updated = store.addArtifact(task.id, artifact);

      expect(updated?.artifacts).toHaveLength(1);
      expect(updated?.artifacts?.[0]).toEqual(artifact);
    });

    it('should spread existing artifacts when adding another (line 87)', () => {
      const task = store.createTask('ctx-1');

      const artifact1: Artifact = {
        artifactId: 'art-1',
        name: 'response1',
        parts: [{ kind: 'text', text: 'Hello 1' }],
      };

      const artifact2: Artifact = {
        artifactId: 'art-2',
        name: 'response2',
        parts: [{ kind: 'text', text: 'Hello 2' }],
      };

      store.addArtifact(task.id, artifact1);
      const updated = store.addArtifact(task.id, artifact2);

      expect(updated?.artifacts).toHaveLength(2);
      expect(updated?.artifacts?.[0]).toEqual(artifact1);
      expect(updated?.artifacts?.[1]).toEqual(artifact2);
    });

    it('should preserve artifact order when spreading (line 87)', () => {
      const task = store.createTask('ctx-1');

      const artifacts = Array.from({ length: 10 }, (_, i) => ({
        artifactId: `art-${i}`,
        name: `Artifact ${i}`,
        parts: [{ kind: 'text' as const, text: `Content ${i}` }],
      }));

      for (const artifact of artifacts) {
        store.addArtifact(task.id, artifact);
      }

      const updated = store.getTask(task.id);
      expect(updated?.artifacts).toHaveLength(10);

      for (let i = 0; i < 10; i++) {
        expect(updated?.artifacts?.[i].artifactId).toBe(`art-${i}`);
      }
    });

    it('should handle artifacts with null/undefined values in array', () => {
      const task = store.createTask('ctx-1');

      const artifact1: Artifact = {
        artifactId: 'art-1',
        name: 'response1',
        parts: [{ kind: 'text', text: 'Hello 1' }],
      };

      // Intentionally invalid artifact with null parts for testing
      const artifact2: Partial<Artifact> & { artifactId: string } = {
        artifactId: 'art-2',
        name: 'response2',
        parts: null,
      };

      store.addArtifact(task.id, artifact1);
      const updated = store.addArtifact(task.id, artifact2);

      expect(updated?.artifacts).toHaveLength(2);
    });
  });

  describe('Line 100: Spreading history array', () => {
    it('should spread empty history array when adding first message (line 100)', () => {
      // This tests: history: [...(task.history || []), message]
      const task = store.createTask('ctx-1');

      expect(task.history).toEqual([]);

      const message: Message = {
        kind: 'message',
        messageId: 'msg-1',
        role: 'user',
        parts: [{ kind: 'text', text: 'Hello' }],
        createdAt: new Date().toISOString(),
      };

      const updated = store.addMessage(task.id, message);

      expect(updated?.history).toHaveLength(1);
      expect(updated?.history?.[0]).toEqual(message);
    });

    it('should spread existing history when adding another message (line 100)', () => {
      const task = store.createTask('ctx-1');

      const message1: Message = {
        kind: 'message',
        messageId: 'msg-1',
        role: 'user',
        parts: [{ kind: 'text', text: 'Hello 1' }],
        createdAt: new Date().toISOString(),
      };

      const message2: Message = {
        kind: 'message',
        messageId: 'msg-2',
        role: 'agent',
        parts: [{ kind: 'text', text: 'Hi there' }],
        createdAt: new Date().toISOString(),
      };

      store.addMessage(task.id, message1);
      const updated = store.addMessage(task.id, message2);

      expect(updated?.history).toHaveLength(2);
      expect(updated?.history?.[0]).toEqual(message1);
      expect(updated?.history?.[1]).toEqual(message2);
    });

    it('should preserve message order when spreading (line 100)', () => {
      const task = store.createTask('ctx-1');

      const messages = Array.from({ length: 10 }, (_, i) => ({
        kind: 'message' as const,
        messageId: `msg-${i}`,
        role: (i % 2 === 0 ? 'user' : 'agent') as const,
        parts: [{ kind: 'text' as const, text: `Message ${i}` }],
        createdAt: new Date().toISOString(),
      }));

      for (const message of messages) {
        store.addMessage(task.id, message);
      }

      const updated = store.getTask(task.id);
      expect(updated?.history).toHaveLength(10);

      for (let i = 0; i < 10; i++) {
        expect(updated?.history?.[i].messageId).toBe(`msg-${i}`);
      }
    });

    it('should handle messages with various roles when spreading (line 100)', () => {
      const task = store.createTask('ctx-1');

      const roles: Array<'user' | 'agent'> = ['user', 'agent', 'user', 'agent', 'user'];

      for (let i = 0; i < roles.length; i++) {
        const message: Message = {
          kind: 'message',
          messageId: `msg-${i}`,
          role: roles[i],
          parts: [{ kind: 'text', text: `Message ${i}` }],
          createdAt: new Date().toISOString(),
        };
        store.addMessage(task.id, message);
      }

      const updated = store.getTask(task.id);
      expect(updated?.history).toHaveLength(5);

      for (let i = 0; i < 5; i++) {
        expect(updated?.history?.[i].role).toBe(roles[i]);
      }
    });
  });

  describe('Line 169: Deleting task ID from context index', () => {
    it('should delete task ID from context index (line 169)', () => {
      // This tests: this.contextTasks.get(task.contextId)?.delete(taskId);
      const task = store.createTask('ctx-1');

      expect(store.getTasksByContext('ctx-1')).toHaveLength(1);

      const deleted = store.deleteTask(task.id);

      expect(deleted).toBe(true);
      expect(store.getTasksByContext('ctx-1')).toHaveLength(0);
      expect(store.getTask(task.id)).toBeUndefined();
    });

    it('should delete correct task ID when multiple tasks in same context (line 169)', () => {
      const task1 = store.createTask('shared-ctx');
      const task2 = store.createTask('shared-ctx');
      const task3 = store.createTask('shared-ctx');

      expect(store.getTasksByContext('shared-ctx')).toHaveLength(3);

      store.deleteTask(task2.id);

      const remaining = store.getTasksByContext('shared-ctx');
      expect(remaining).toHaveLength(2);
      expect(remaining.map(t => t.id)).not.toContain(task2.id);
      expect(remaining.map(t => t.id)).toContain(task1.id);
      expect(remaining.map(t => t.id)).toContain(task3.id);
    });

    it('should clean up empty context after deleting last task (line 169)', () => {
      const task = store.createTask('ctx-1');

      expect(store.getTasksByContext('ctx-1')).toHaveLength(1);

      store.deleteTask(task.id);

      // Context should be cleaned up (empty array)
      expect(store.getTasksByContext('ctx-1')).toEqual([]);
    });

    it('should handle deleting task from context with single remaining task (line 169)', () => {
      const task1 = store.createTask('ctx-1');
      const task2 = store.createTask('ctx-1');

      store.deleteTask(task1.id);

      const remaining = store.getTasksByContext('ctx-1');
      expect(remaining).toHaveLength(1);
      expect(remaining[0].id).toBe(task2.id);
    });

    it('should handle deleting tasks in sequence from same context (line 169)', () => {
      const tasks = [];
      for (let i = 0; i < 5; i++) {
        tasks.push(store.createTask('ctx-1'));
      }

      expect(store.getTasksByContext('ctx-1')).toHaveLength(5);

      // Delete tasks one by one
      for (const task of tasks) {
        store.deleteTask(task.id);
      }

      expect(store.getTasksByContext('ctx-1')).toEqual([]);
    });
  });

  describe('Combined scenarios for uncovered lines', () => {
    it('should create task, add artifacts and messages, then delete (all uncovered lines)', () => {
      // This scenario exercises all uncovered lines:
      // - Line 51: createTask creates new context Set
      // - Line 87: addArtifact spreads artifacts array
      // - Line 100: addMessage spreads history array
      // - Line 169: deleteTask deletes task ID from context index

      const task = store.createTask('test-ctx'); // Line 51

      const artifact1: Artifact = {
        artifactId: 'art-1',
        name: 'response1',
        parts: [{ kind: 'text', text: 'Hello 1' }],
      };

      const artifact2: Artifact = {
        artifactId: 'art-2',
        name: 'response2',
        parts: [{ kind: 'text', text: 'Hello 2' }],
      };

      store.addArtifact(task.id, artifact1); // Line 87
      store.addArtifact(task.id, artifact2); // Line 87

      const message1: Message = {
        kind: 'message',
        messageId: 'msg-1',
        role: 'user',
        parts: [{ kind: 'text', text: 'User message' }],
        createdAt: new Date().toISOString(),
      };

      const message2: Message = {
        kind: 'message',
        messageId: 'msg-2',
        role: 'agent',
        parts: [{ kind: 'text', text: 'Agent response' }],
        createdAt: new Date().toISOString(),
      };

      store.addMessage(task.id, message1); // Line 100
      store.addMessage(task.id, message2); // Line 100

      // Verify state before deletion
      const beforeDelete = store.getTask(task.id);
      expect(beforeDelete?.artifacts).toHaveLength(2);
      expect(beforeDelete?.history).toHaveLength(2);
      expect(store.getTasksByContext('test-ctx')).toHaveLength(1);

      store.deleteTask(task.id); // Line 169

      // Verify state after deletion
      expect(store.getTask(task.id)).toBeUndefined();
      expect(store.getTasksByContext('test-ctx')).toEqual([]);
    });

    it('should handle multiple contexts with full lifecycle', () => {
      const contexts = ['ctx-1', 'ctx-2', 'ctx-3'];
      const tasks: Task[] = [];

      // Create tasks in different contexts (line 51 for each new context)
      for (const ctx of contexts) {
        const task = store.createTask(ctx);
        tasks.push(task);

        // Add artifact (line 87)
        const artifact: Artifact = {
          artifactId: `art-${task.id}`,
          name: 'response',
          parts: [{ kind: 'text', text: `Response for ${ctx}` }],
        };
        store.addArtifact(task.id, artifact);

        // Add message (line 100)
        const message: Message = {
          kind: 'message',
          messageId: `msg-${task.id}`,
          role: 'user',
          parts: [{ kind: 'text', text: `Message for ${ctx}` }],
          createdAt: new Date().toISOString(),
        };
        store.addMessage(task.id, message);
      }

      // Verify all contexts have tasks
      for (const ctx of contexts) {
        expect(store.getTasksByContext(ctx)).toHaveLength(1);
      }

      // Delete tasks (line 169)
      for (const task of tasks) {
        store.deleteTask(task.id);
      }

      // Verify all contexts are empty
      for (const ctx of contexts) {
        expect(store.getTasksByContext(ctx)).toEqual([]);
      }
    });
  });

  describe('Edge cases for uncovered lines', () => {
    it('should handle creating task with empty string contextId (line 51)', () => {
      const task = store.createTask('');

      expect(task.contextId).toBeDefined();
      expect(task.contextId).not.toBe('');
      expect(store.getTasksByContext(task.contextId || '')).toHaveLength(1);
    });

    it('should handle creating task with special characters in contextId (line 51)', () => {
      const specialContexts = [
        'ctx/with/slashes',
        'ctx-with-dashes',
        'ctx_with_underscores',
        'ctx.with.dots',
        'ctx@with#special$chars',
      ];

      for (const ctx of specialContexts) {
        const task = store.createTask(ctx);
        const tasks = store.getTasksByContext(ctx);
        expect(tasks).toHaveLength(1);
        expect(tasks[0].id).toBe(task.id);
      }
    });

    it('should handle spreading very large artifacts array (line 87)', () => {
      const task = store.createTask('ctx-1');

      const artifactCount = 100;
      for (let i = 0; i < artifactCount; i++) {
        const artifact: Artifact = {
          artifactId: `art-${i}`,
          name: `Artifact ${i}`,
          parts: [{ kind: 'text', text: `Content ${i}` }],
        };
        store.addArtifact(task.id, artifact);
      }

      const updated = store.getTask(task.id);
      expect(updated?.artifacts).toHaveLength(artifactCount);
    });

    it('should handle spreading very large history array (line 100)', () => {
      const task = store.createTask('ctx-1');

      const messageCount = 1000;
      for (let i = 0; i < messageCount; i++) {
        const message: Message = {
          kind: 'message',
          messageId: `msg-${i}`,
          role: i % 2 === 0 ? 'user' : 'agent',
          parts: [{ kind: 'text', text: `Message ${i}` }],
          createdAt: new Date().toISOString(),
        };
        store.addMessage(task.id, message);
      }

      const updated = store.getTask(task.id);
      expect(updated?.history).toHaveLength(messageCount);
    });

    it('should handle deleting non-existent task ID from context (line 169)', () => {
      const task = store.createTask('ctx-1');

      expect(store.getTasksByContext('ctx-1')).toHaveLength(1);

      // Try to delete a different task ID that doesn't exist
      const result = store.deleteTask('non-existent-id');

      expect(result).toBe(false);
      expect(store.getTasksByContext('ctx-1')).toHaveLength(1);
    });

    it('should handle deleting task after multiple operations (line 169)', () => {
      const task = store.createTask('ctx-1');

      // Perform various operations
      for (let i = 0; i < 10; i++) {
        const artifact: Artifact = {
          artifactId: `art-${i}`,
          name: `Artifact ${i}`,
          parts: [{ kind: 'text', text: `Content ${i}` }],
        };
        store.addArtifact(task.id, artifact);

        const message: Message = {
          kind: 'message',
          messageId: `msg-${i}`,
          role: i % 2 === 0 ? 'user' : 'agent',
          parts: [{ kind: 'text', text: `Message ${i}` }],
          createdAt: new Date().toISOString(),
        };
        store.addMessage(task.id, message);
      }

      // Verify state before deletion
      const beforeDelete = store.getTask(task.id);
      expect(beforeDelete?.artifacts).toHaveLength(10);
      expect(beforeDelete?.history).toHaveLength(10);

      // Delete the task
      store.deleteTask(task.id);

      // Verify deletion
      expect(store.getTask(task.id)).toBeUndefined();
      expect(store.getTasksByContext('ctx-1')).toEqual([]);
    });
  });
});
