/**
 * Tests for task-store.ts
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  InMemoryTaskStore,
  getTaskStore,
} from '../task-store';
import type { Task, Message, Artifact, TaskState } from '../types';

describe('InMemoryTaskStore', () => {
  let store: InMemoryTaskStore;

  beforeEach(() => {
    store = new InMemoryTaskStore();
  });

  describe('createTask', () => {
    it('should create a task with generated IDs', () => {
      const task = store.createTask();

      expect(task.kind).toBe('task');
      expect(task.id).toBeDefined();
      expect(task.contextId).toBeDefined();
      expect(task.status.state).toBe('submitted');
      expect(task.history).toEqual([]);
      expect(task.artifacts).toEqual([]);
    });

    it('should create a task with provided contextId', () => {
      const task = store.createTask('ctx-1');

      expect(task.contextId).toBe('ctx-1');
    });

    it('should create a task with initial message', () => {
      const message: Message = {
        kind: 'message',
        messageId: 'msg-1',
        role: 'user',
        parts: [{ kind: 'text', text: 'Hello' }],
        createdAt: new Date().toISOString(),
      };

      const task = store.createTask('ctx-1', message);

      expect(task.history).toHaveLength(1);
      expect(task.history?.[0]).toEqual(message);
    });

    it('should index tasks by contextId', () => {
      const task1 = store.createTask('ctx-1');
      const task2 = store.createTask('ctx-1');

      const tasksByContext = store.getTasksByContext('ctx-1');

      expect(tasksByContext).toHaveLength(2);
      expect(tasksByContext.map(t => t.id)).toContain(task1.id);
      expect(tasksByContext.map(t => t.id)).toContain(task2.id);
    });
  });

  describe('getTask', () => {
    it('should return task by ID', () => {
      const task = store.createTask('ctx-1');
      const retrieved = store.getTask(task.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(task.id);
    });

    it('should return undefined for non-existent task', () => {
      const retrieved = store.getTask('non-existent');

      expect(retrieved).toBeUndefined();
    });

    it('should return a copy of the task (shallow)', () => {
      const task = store.createTask('ctx-1');
      const retrieved = store.getTask(task.id)!;

      // Modify the returned task's top-level property
      retrieved.metadata = { modified: true };

      // Original should be unchanged for shallow copy
      const original = store.getTask(task.id)!;
      expect(original.metadata).toBeUndefined();
    });
  });

  describe('updateTaskStatus', () => {
    it('should update task status', () => {
      const task = store.createTask('ctx-1');

      const updated = store.updateTaskStatus(task.id, {
        state: 'completed',
        timestamp: new Date().toISOString(),
      });

      expect(updated).toBeDefined();
      expect(updated?.status.state).toBe('completed');
    });

    it('should return undefined for non-existent task', () => {
      const result = store.updateTaskStatus('non-existent', {
        state: 'completed',
        timestamp: new Date().toISOString(),
      });

      expect(result).toBeUndefined();
    });

    it('should persist status changes', () => {
      const task = store.createTask('ctx-1');

      store.updateTaskStatus(task.id, {
        state: 'completed',
        timestamp: new Date().toISOString(),
      });

      const retrieved = store.getTask(task.id);
      expect(retrieved?.status.state).toBe('completed');
    });
  });

  describe('addArtifact', () => {
    it('should add artifact to task', () => {
      const task = store.createTask('ctx-1');
      const artifact: Artifact = {
        artifactId: 'art-1',
        name: 'response',
        parts: [{ kind: 'text', text: 'Hello' }],
      };

      const updated = store.addArtifact(task.id, artifact);

      expect(updated).toBeDefined();
      expect(updated?.artifacts).toHaveLength(1);
      expect(updated?.artifacts?.[0]).toEqual(artifact);
    });

    it('should add multiple artifacts', () => {
      const task = store.createTask('ctx-1');

      const artifact1: Artifact = {
        artifactId: 'art-1',
        name: 'response',
        parts: [{ kind: 'text', text: 'Hello' }],
      };

      const artifact2: Artifact = {
        artifactId: 'art-2',
        name: 'data',
        parts: [{ kind: 'text', text: 'World' }],
      };

      store.addArtifact(task.id, artifact1);
      const updated = store.addArtifact(task.id, artifact2);

      expect(updated?.artifacts).toHaveLength(2);
    });

    it('should return undefined for non-existent task', () => {
      const artifact: Artifact = {
        artifactId: 'art-1',
        name: 'response',
        parts: [{ kind: 'text', text: 'Hello' }],
      };

      const result = store.addArtifact('non-existent', artifact);

      expect(result).toBeUndefined();
    });
  });

  describe('addMessage', () => {
    it('should add message to task history', () => {
      const task = store.createTask('ctx-1');
      const message: Message = {
        kind: 'message',
        messageId: 'msg-1',
        role: 'user',
        parts: [{ kind: 'text', text: 'Hello' }],
        createdAt: new Date().toISOString(),
      };

      const updated = store.addMessage(task.id, message);

      expect(updated).toBeDefined();
      expect(updated?.history).toHaveLength(1);
      expect(updated?.history?.[0]).toEqual(message);
    });

    it('should add multiple messages', () => {
      const task = store.createTask('ctx-1');

      const message1: Message = {
        kind: 'message',
        messageId: 'msg-1',
        role: 'user',
        parts: [{ kind: 'text', text: 'Hello' }],
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
    });

    it('should return undefined for non-existent task', () => {
      const message: Message = {
        kind: 'message',
        messageId: 'msg-1',
        role: 'user',
        parts: [{ kind: 'text', text: 'Hello' }],
        createdAt: new Date().toISOString(),
      };

      const result = store.addMessage('non-existent', message);

      expect(result).toBeUndefined();
    });
  });

  describe('listTasks', () => {
    beforeEach(() => {
      // Create test tasks
      store.createTask('ctx-1');
      store.createTask('ctx-1');
      store.createTask('ctx-2');

      const task1 = store.getTasksByContext('ctx-1')[0];
      store.updateTaskStatus(task1.id, {
        state: 'completed',
        timestamp: new Date().toISOString(),
      });

      const task2 = store.getTasksByContext('ctx-2')[0];
      store.updateTaskStatus(task2.id, {
        state: 'working',
        timestamp: new Date().toISOString(),
      });
    });

    it('should list all tasks', () => {
      const result = store.listTasks({});

      expect(result.tasks).toHaveLength(3);
      expect(result.totalSize).toBe(3);
      expect(result.nextPageToken).toBe('');
    });

    it('should filter by contextId', () => {
      const result = store.listTasks({ contextId: 'ctx-1' });

      expect(result.tasks).toHaveLength(2);
      expect(result.totalSize).toBe(2);
      result.tasks.forEach(task => {
        expect(task.contextId).toBe('ctx-1');
      });
    });

    it('should filter by status', () => {
      const result = store.listTasks({ status: 'completed' });

      expect(result.tasks).toHaveLength(1);
      expect(result.tasks[0].status.state).toBe('completed');
    });

    it('should filter by both contextId and status', () => {
      const result = store.listTasks({ contextId: 'ctx-1', status: 'completed' });

      expect(result.tasks).toHaveLength(1);
      expect(result.tasks[0].contextId).toBe('ctx-1');
      expect(result.tasks[0].status.state).toBe('completed');
    });

    it('should paginate results', () => {
      const page1 = store.listTasks({ pageSize: 2 });

      expect(page1.tasks).toHaveLength(2);
      expect(page1.nextPageToken).toBeTruthy();

      const page2 = store.listTasks({ pageSize: 2, pageToken: page1.nextPageToken });

      expect(page2.tasks).toHaveLength(1);
      expect(page2.nextPageToken).toBe('');
    });

    it('should exclude artifacts by default', () => {
      const artifact: Artifact = {
        artifactId: 'art-1',
        name: 'response',
        parts: [{ kind: 'text', text: 'Hello' }],
      };

      const task = store.createTask('ctx-1');
      store.addArtifact(task.id, artifact);

      const result = store.listTasks({ includeArtifacts: false });
      const taskWithArtifact = result.tasks.find(t => t.id === task.id);

      expect(taskWithArtifact?.artifacts).toBeUndefined();
    });

    it('should include artifacts when requested', () => {
      const artifact: Artifact = {
        artifactId: 'art-1',
        name: 'response',
        parts: [{ kind: 'text', text: 'Hello' }],
      };

      const task = store.createTask('ctx-1');
      store.addArtifact(task.id, artifact);

      const result = store.listTasks({ includeArtifacts: true });
      const taskWithArtifact = result.tasks.find(t => t.id === task.id);

      expect(taskWithArtifact?.artifacts).toHaveLength(1);
    });

    it('should sort tasks by status timestamp descending', () => {
      const result = store.listTasks({});

      const timestamps = result.tasks.map(t => new Date(t.status.timestamp).getTime());
      for (let i = 1; i < timestamps.length; i++) {
        expect(timestamps[i - 1]).toBeGreaterThanOrEqual(timestamps[i]);
      }
    });
  });

  describe('deleteTask', () => {
    it('should delete an existing task', () => {
      const task = store.createTask('ctx-1');

      const result = store.deleteTask(task.id);

      expect(result).toBe(true);
      expect(store.getTask(task.id)).toBeUndefined();
    });

    it('should return false for non-existent task', () => {
      const result = store.deleteTask('non-existent');

      expect(result).toBe(false);
    });

    it('should remove task from context index', () => {
      const task = store.createTask('ctx-1');

      expect(store.getTasksByContext('ctx-1')).toHaveLength(1);

      store.deleteTask(task.id);

      expect(store.getTasksByContext('ctx-1')).toHaveLength(0);
    });

    it('should clean up empty context indices', () => {
      const task = store.createTask('ctx-1');

      store.deleteTask(task.id);

      // Context index should be removed
      const tasks = store.getTasksByContext('ctx-1');
      expect(tasks).toEqual([]);
    });
  });

  describe('getTasksByContext', () => {
    it('should return tasks by contextId', () => {
      store.createTask('ctx-1');
      store.createTask('ctx-1');
      store.createTask('ctx-2');

      const ctx1Tasks = store.getTasksByContext('ctx-1');
      const ctx2Tasks = store.getTasksByContext('ctx-2');

      expect(ctx1Tasks).toHaveLength(2);
      expect(ctx2Tasks).toHaveLength(1);
    });

    it('should return empty array for non-existent context', () => {
      const tasks = store.getTasksByContext('non-existent');

      expect(tasks).toEqual([]);
    });
  });

  describe('cleanupOldTasks', () => {
    beforeEach(() => {
      const now = Date.now();

      // Create old completed task
      const oldTask = store.createTask('ctx-1');
      store.updateTaskStatus(oldTask.id, {
        state: 'completed',
        timestamp: new Date(now - 25 * 60 * 60 * 1000).toISOString(), // 25 hours ago
      });

      // Create recent completed task
      const recentTask = store.createTask('ctx-1');
      store.updateTaskStatus(recentTask.id, {
        state: 'completed',
        timestamp: new Date(now - 1 * 60 * 60 * 1000).toISOString(), // 1 hour ago
      });

      // Create working task (should not be cleaned)
      const workingTask = store.createTask('ctx-1');
      store.updateTaskStatus(workingTask.id, {
        state: 'working',
        timestamp: new Date(now - 25 * 60 * 60 * 1000).toISOString(),
      });
    });

    it('should clean up old terminal tasks', () => {
      const cleaned = store.cleanupOldTasks(24 * 60 * 60 * 1000); // 24 hours

      expect(cleaned).toBe(1);
    });

    it('should not clean up recent tasks', () => {
      const allTasks = store.listTasks({});
      const beforeCount = allTasks.totalSize;

      store.cleanupOldTasks(24 * 60 * 60 * 1000);

      const afterTasks = store.listTasks({});
      expect(afterTasks.totalSize).toBe(beforeCount - 1);
    });

    it('should not clean up non-terminal tasks', () => {
      const beforeList = store.listTasks({ status: 'working' });

      store.cleanupOldTasks(1 * 60 * 60 * 1000); // 1 hour

      const afterList = store.listTasks({ status: 'working' });
      expect(afterList.totalSize).toBe(beforeList.totalSize);
    });
  });
});

describe('getTaskStore', () => {
  it('should return singleton instance', () => {
    const store1 = getTaskStore();
    const store2 = getTaskStore();

    expect(store1).toBe(store2);
  });
});
