/**
 * A2A Task Store Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  InMemoryTaskStore,
  TaskStore,
  getTaskStore,
} from '../task-store';
import {
  Task,
  Message,
  Artifact,
  TaskState,
  TaskStatus,
  Part,
} from '../types';

describe('InMemoryTaskStore', () => {
  let store: InMemoryTaskStore;

  beforeEach(() => {
    store = new InMemoryTaskStore();
  });

  describe('createTask', () => {
    it('should create a task without initial message', () => {
      const task = store.createTask();

      expect(task.kind).toBe('task');
      expect(task.id).toBeDefined();
      expect(task.contextId).toBeDefined();
      expect(task.status.state).toBe('submitted');
      expect(task.history).toEqual([]);
      expect(task.artifacts).toEqual([]);
    });

    it('should create a task with contextId', () => {
      const contextId = 'test-context-123';
      const task = store.createTask(contextId);

      expect(task.contextId).toBe(contextId);
    });

    it('should create a task with initial message', () => {
      const message: Message = {
        kind: 'message',
        messageId: 'msg-1',
        role: 'user',
        parts: [{ kind: 'text', text: 'Hello' }],
        createdAt: new Date().toISOString(),
      };

      const task = store.createTask(undefined, message);

      expect(task.history).toHaveLength(1);
      expect(task.history?.[0]).toEqual(message);
      expect(task.status.state).toBe('submitted');
    });

    it('should generate unique task IDs', () => {
      const task1 = store.createTask();
      const task2 = store.createTask();

      expect(task1.id).not.toBe(task2.id);
    });
  });

  describe('getTask', () => {
    it('should return undefined for non-existent task', () => {
      const task = store.getTask('non-existent-id');
      expect(task).toBeUndefined();
    });

    it('should return a copy of the task', () => {
      const createdTask = store.createTask();
      const retrievedTask = store.getTask(createdTask.id);

      expect(retrievedTask).toEqual(createdTask);

      // Verify it's a copy by modifying retrieved task
      if (retrievedTask) {
        (retrievedTask as unknown as { modified: boolean }).modified = true;
        const taskAgain = store.getTask(createdTask.id);
        expect((taskAgain as unknown as { modified?: boolean }).modified).toBeUndefined();
      }
    });

    it('should return the created task', () => {
      const createdTask = store.createTask('test-context');
      const retrievedTask = store.getTask(createdTask.id);

      expect(retrievedTask).toBeDefined();
      expect(retrievedTask?.id).toBe(createdTask.id);
      expect(retrievedTask?.contextId).toBe('test-context');
    });
  });

  describe('updateTaskStatus', () => {
    it('should return undefined for non-existent task', () => {
      const result = store.updateTaskStatus('non-existent', {
        state: 'completed',
        timestamp: new Date().toISOString(),
      });

      expect(result).toBeUndefined();
    });

    it('should update task status', () => {
      const task = store.createTask();

      const newStatus: TaskStatus = {
        state: 'working',
        timestamp: new Date().toISOString(),
        message: 'Processing...',
      };

      const updatedTask = store.updateTaskStatus(task.id, newStatus);

      expect(updatedTask).toBeDefined();
      expect(updatedTask?.status.state).toBe('working');
      expect(updatedTask?.status.message).toBe('Processing...');
    });

    it('should persist status changes', () => {
      const task = store.createTask();

      store.updateTaskStatus(task.id, {
        state: 'working',
        timestamp: new Date().toISOString(),
      });

      const retrievedTask = store.getTask(task.id);

      expect(retrievedTask?.status.state).toBe('working');
    });

    it('should support all task states', () => {
      const states: TaskState[] = [
        'submitted',
        'working',
        'input-required',
        'auth-required',
        'completed',
        'canceled',
        'failed',
        'rejected',
      ];

      states.forEach((state) => {
        const task = store.createTask();
        const updated = store.updateTaskStatus(task.id, {
          state,
          timestamp: new Date().toISOString(),
        });

        expect(updated?.status.state).toBe(state);
      });
    });
  });

  describe('addArtifact', () => {
    it('should return undefined for non-existent task', () => {
      const artifact: Artifact = {
        artifactId: 'artifact-1',
        parts: [{ kind: 'text', text: 'Result' }],
      };

      const result = store.addArtifact('non-existent', artifact);

      expect(result).toBeUndefined();
    });

    it('should add artifact to task', () => {
      const task = store.createTask();

      const artifact: Artifact = {
        artifactId: 'artifact-1',
        name: 'Test Output',
        parts: [{ kind: 'text', text: 'Generated content' }],
      };

      const updatedTask = store.addArtifact(task.id, artifact);

      expect(updatedTask?.artifacts).toHaveLength(1);
      expect(updatedTask?.artifacts?.[0]).toEqual(artifact);
    });

    it('should append multiple artifacts', () => {
      const task = store.createTask();

      const artifact1: Artifact = {
        artifactId: 'artifact-1',
        parts: [{ kind: 'text', text: 'First' }],
      };

      const artifact2: Artifact = {
        artifactId: 'artifact-2',
        parts: [{ kind: 'text', text: 'Second' }],
      };

      store.addArtifact(task.id, artifact1);
      const updatedTask = store.addArtifact(task.id, artifact2);

      expect(updatedTask?.artifacts).toHaveLength(2);
      expect(updatedTask?.artifacts?.[0].artifactId).toBe('artifact-1');
      expect(updatedTask?.artifacts?.[1].artifactId).toBe('artifact-2');
    });
  });

  describe('addMessage', () => {
    it('should return undefined for non-existent task', () => {
      const message: Message = {
        kind: 'message',
        messageId: 'msg-1',
        role: 'user',
        parts: [{ kind: 'text', text: 'Test' }],
      };

      const result = store.addMessage('non-existent', message);

      expect(result).toBeUndefined();
    });

    it('should add message to task', () => {
      const task = store.createTask();

      const message: Message = {
        kind: 'message',
        messageId: 'msg-1',
        role: 'agent',
        parts: [{ kind: 'text', text: 'Response' }],
        createdAt: new Date().toISOString(),
      };

      const updatedTask = store.addMessage(task.id, message);

      expect(updatedTask?.history).toHaveLength(1);
      expect(updatedTask?.history?.[0]).toEqual(message);
    });

    it('should append messages to existing history', () => {
      const initialMessage: Message = {
        kind: 'message',
        messageId: 'msg-1',
        role: 'user',
        parts: [{ kind: 'text', text: 'Initial' }],
        createdAt: new Date().toISOString(),
      };

      const task = store.createTask(undefined, initialMessage);

      const replyMessage: Message = {
        kind: 'message',
        messageId: 'msg-2',
        role: 'agent',
        parts: [{ kind: 'text', text: 'Reply' }],
        createdAt: new Date().toISOString(),
      };

      const updatedTask = store.addMessage(task.id, replyMessage);

      expect(updatedTask?.history).toHaveLength(2);
      expect(updatedTask?.history?.[0].messageId).toBe('msg-1');
      expect(updatedTask?.history?.[1].messageId).toBe('msg-2');
    });
  });

  describe('listTasks', () => {
    beforeEach(() => {
      // Create multiple tasks for testing
      const context1 = 'context-1';
      const context2 = 'context-2';

      store.createTask(context1);
      const task2 = store.createTask(context1);
      const task3 = store.createTask(context2);

      store.updateTaskStatus(task2.id, {
        state: 'completed',
        timestamp: new Date().toISOString(),
      });

      store.updateTaskStatus(task3.id, {
        state: 'working',
        timestamp: new Date().toISOString(),
      });
    });

    it('should return all tasks by default', () => {
      const result = store.listTasks({});

      expect(result.tasks).toHaveLength(3);
      expect(result.totalSize).toBe(3);
    });

    it('should filter by contextId', () => {
      const result = store.listTasks({ contextId: 'context-1' });

      expect(result.tasks).toHaveLength(2);
      expect(result.tasks.every(t => t.contextId === 'context-1')).toBe(true);
    });

    it('should filter by status', () => {
      const result = store.listTasks({ status: 'completed' });

      expect(result.tasks).toHaveLength(1);
      expect(result.tasks[0].status.state).toBe('completed');
    });

    it('should filter by contextId and status combined', () => {
      const result = store.listTasks({
        contextId: 'context-1',
        status: 'completed',
      });

      expect(result.tasks).toHaveLength(1);
      expect(result.tasks[0].contextId).toBe('context-1');
      expect(result.tasks[0].status.state).toBe('completed');
    });

    it('should respect pageSize', () => {
      const result = store.listTasks({ pageSize: 2 });

      expect(result.tasks).toHaveLength(2);
      expect(result.pageSize).toBe(2);
    });

    it('should handle pagination with pageToken', () => {
      const page1 = store.listTasks({ pageSize: 2 });

      expect(page1.tasks).toHaveLength(2);
      expect(page1.nextPageToken).toBeTruthy();

      const page2 = store.listTasks({ pageSize: 2, pageToken: page1.nextPageToken });

      expect(page2.tasks).toHaveLength(1);
      expect(page2.nextPageToken).toBeFalsy();
    });

    it('should exclude artifacts by default', () => {
      const task = store.createTask();
      store.addArtifact(task.id, {
        artifactId: 'artifact-1',
        parts: [{ kind: 'text', text: 'Test' }],
      });

      const result = store.listTasks({ includeArtifacts: false });
      const taskWithoutArtifacts = result.tasks.find(t => t.id === task.id);

      expect(taskWithoutArtifacts?.artifacts).toBeUndefined();
    });

    it('should include artifacts when requested', () => {
      const task = store.createTask();
      store.addArtifact(task.id, {
        artifactId: 'artifact-1',
        parts: [{ kind: 'text', text: 'Test' }],
      });

      const result = store.listTasks({ includeArtifacts: true });
      const taskWithArtifacts = result.tasks.find(t => t.id === task.id);

      expect(taskWithArtifacts?.artifacts).toHaveLength(1);
    });

    it('should sort tasks by status timestamp descending', () => {
      // Create a fresh store for this test to avoid interference from beforeEach
      const freshStore = new InMemoryTaskStore();
      const now = new Date();
      const task1 = freshStore.createTask();
      const task2 = freshStore.createTask();

      freshStore.updateTaskStatus(task1.id, {
        state: 'completed',
        timestamp: now.toISOString(),
      });

      const later = new Date(now.getTime() + 1000);
      freshStore.updateTaskStatus(task2.id, {
        state: 'completed',
        timestamp: later.toISOString(),
      });

      const result = freshStore.listTasks({});
      expect(result.tasks[0].id).toBe(task2.id);
      expect(result.tasks[1].id).toBe(task1.id);
    });
  });

  describe('deleteTask', () => {
    it('should return false for non-existent task', () => {
      const result = store.deleteTask('non-existent');
      expect(result).toBe(false);
    });

    it('should delete an existing task', () => {
      const task = store.createTask();
      const result = store.deleteTask(task.id);

      expect(result).toBe(true);
      expect(store.getTask(task.id)).toBeUndefined();
    });

    it('should remove task from context index', () => {
      const contextId = 'test-context';
      const task = store.createTask(contextId);

      store.deleteTask(task.id);

      const tasksByContext = store.getTasksByContext(contextId);
      expect(tasksByContext).toHaveLength(0);
    });

    it('should clean up empty context index', () => {
      const contextId = 'test-context';
      const task = store.createTask(contextId);

      store.deleteTask(task.id);

      const tasksByContext = store.getTasksByContext(contextId);
      expect(tasksByContext).toHaveLength(0);
    });
  });

  describe('getTasksByContext', () => {
    it('should return empty array for non-existent context', () => {
      const tasks = store.getTasksByContext('non-existent');
      expect(tasks).toEqual([]);
    });

    it('should return tasks for a context', () => {
      const contextId = 'test-context';

      const task1 = store.createTask(contextId);
      const task2 = store.createTask(contextId);

      const tasks = store.getTasksByContext(contextId);

      expect(tasks).toHaveLength(2);
      expect(tasks.some(t => t.id === task1.id)).toBe(true);
      expect(tasks.some(t => t.id === task2.id)).toBe(true);
    });

    it('should not return tasks from other contexts', () => {
      store.createTask('context-1');
      store.createTask('context-1');
      store.createTask('context-2');

      const tasks = store.getTasksByContext('context-1');

      expect(tasks).toHaveLength(2);
      expect(tasks.every(t => t.contextId === 'context-1')).toBe(true);
    });
  });

  describe('cleanupOldTasks', () => {
    it('should remove old completed tasks', () => {
      const task = store.createTask();
      store.updateTaskStatus(task.id, {
        state: 'completed',
        timestamp: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(), // 25 hours ago
      });

      const cleaned = store.cleanupOldTasks(24 * 60 * 60 * 1000);

      expect(cleaned).toBe(1);
      expect(store.getTask(task.id)).toBeUndefined();
    });

    it('should remove old failed tasks', () => {
      const task = store.createTask();
      store.updateTaskStatus(task.id, {
        state: 'failed',
        timestamp: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
      });

      const cleaned = store.cleanupOldTasks(24 * 60 * 60 * 1000);

      expect(cleaned).toBe(1);
    });

    it('should remove old canceled tasks', () => {
      const task = store.createTask();
      store.updateTaskStatus(task.id, {
        state: 'canceled',
        timestamp: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
      });

      const cleaned = store.cleanupOldTasks(24 * 60 * 60 * 1000);

      expect(cleaned).toBe(1);
    });

    it('should remove old rejected tasks', () => {
      const task = store.createTask();
      store.updateTaskStatus(task.id, {
        state: 'rejected',
        timestamp: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
      });

      const cleaned = store.cleanupOldTasks(24 * 60 * 60 * 1000);

      expect(cleaned).toBe(1);
    });

    it('should not remove recent terminal tasks', () => {
      const task = store.createTask();
      store.updateTaskStatus(task.id, {
        state: 'completed',
        timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // 1 hour ago
      });

      const cleaned = store.cleanupOldTasks(24 * 60 * 60 * 1000);

      expect(cleaned).toBe(0);
      expect(store.getTask(task.id)).toBeDefined();
    });

    it('should not remove non-terminal tasks', () => {
      const task = store.createTask();
      store.updateTaskStatus(task.id, {
        state: 'working',
        timestamp: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
      });

      const cleaned = store.cleanupOldTasks(24 * 60 * 60 * 1000);

      expect(cleaned).toBe(0);
      expect(store.getTask(task.id)).toBeDefined();
    });

    it('should use custom maxAgeMs', () => {
      const task = store.createTask();
      store.updateTaskStatus(task.id, {
        state: 'completed',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
      });

      const cleaned = store.cleanupOldTasks(1 * 60 * 60 * 1000); // 1 hour threshold

      expect(cleaned).toBe(1);
      expect(store.getTask(task.id)).toBeUndefined();
    });

    it('should return count of cleaned tasks', () => {
      const now = Date.now();

      // Create old tasks
      for (let i = 0; i < 3; i++) {
        const task = store.createTask();
        store.updateTaskStatus(task.id, {
          state: 'completed',
          timestamp: new Date(now - 25 * 60 * 60 * 1000).toISOString(),
        });
      }

      // Create recent task
      const recent = store.createTask();
      store.updateTaskStatus(recent.id, {
        state: 'completed',
        timestamp: new Date(now - 1 * 60 * 60 * 1000).toISOString(),
      });

      const cleaned = store.cleanupOldTasks(24 * 60 * 60 * 1000);

      expect(cleaned).toBe(3);
      expect(store.listTasks({}).totalSize).toBe(1);
    });
  });
});

describe('getTaskStore singleton', () => {
  it('should return the same instance', () => {
    const store1 = getTaskStore();
    const store2 = getTaskStore();

    expect(store1).toBe(store2);
  });

  it('should maintain state across calls', () => {
    const store1 = getTaskStore();
    const task = store1.createTask();

    const store2 = getTaskStore();
    const retrieved = store2.getTask(task.id);

    expect(retrieved).toBeDefined();
    expect(retrieved?.id).toBe(task.id);
  });
});
