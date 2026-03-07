/**
 * Tasks Repository 测试
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  getAllTasks,
  getTaskById,
  filterTasks,
  createTask,
  updateTask,
  deleteTask,
  batchUpdateStatus,
  getTaskStats,
} from './db/tasks.repository';
import { TaskPriority, TaskStatus } from './tasks/types';
import { closeDatabase, getDatabaseAsync } from './db';

// Sample tags
const mockTags = [
  { id: 'tag1', name: 'Bug', color: '#FF0000' },
  { id: 'tag2', name: 'Feature', color: '#00FF00' },
];

describe('Tasks Repository', () => {
  beforeAll(async () => {
    const db = await getDatabaseAsync();
    // Create tasks table if not exists
    db.exec(`
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        priority TEXT NOT NULL,
        status TEXT NOT NULL,
        assignee TEXT,
        due_date TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        completed_at TEXT
      );

      CREATE TABLE IF NOT EXISTS tags (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        color TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS task_tags (
        task_id TEXT NOT NULL,
        tag_id TEXT NOT NULL,
        PRIMARY KEY (task_id, tag_id)
      );
    `);
  });

  beforeEach(async () => {
    // Clean up before each test
    const db = await getDatabaseAsync();
    db.exec('DELETE FROM task_tags');
    db.exec('DELETE FROM tasks');
    db.exec('DELETE FROM tags');

    // Insert mock tags
    for (const tag of mockTags) {
      db.prepare('INSERT OR IGNORE INTO tags (id, name, color) VALUES (?, ?, ?)').run(
        tag.id,
        tag.name,
        tag.color
      );
    }
  });

  afterAll(() => {
    closeDatabase();
  });

  describe('createTask', () => {
    it('should create a new task', async () => {
      const taskData = {
        title: 'Test Task',
        description: 'Test description',
        priority: TaskPriority.HIGH,
        status: TaskStatus.TODO,
        tags: [mockTags[0]],
        dueDate: new Date('2024-12-31'),
        completedAt: undefined,
      };

      const task = await createTask(taskData);

      expect(task).toBeDefined();
      expect(task.id).toMatch(/^task_/);
      expect(task.title).toBe('Test Task');
      expect(task.priority).toBe(TaskPriority.HIGH);
      expect(task.status).toBe(TaskStatus.TODO);
    });

    it('should create task without optional fields', async () => {
      const taskData = {
        title: 'Simple Task',
        priority: TaskPriority.MEDIUM,
        status: TaskStatus.IN_PROGRESS,
        tags: [],
        dueDate: undefined,
        completedAt: undefined,
      };

      const task = await createTask(taskData);

      expect(task).toBeDefined();
      expect(task.description).toBeUndefined();
      expect(task.tags).toHaveLength(0);
    });

    it('should create task with multiple tags', async () => {
      const taskData = {
        title: 'Multi-tag Task',
        priority: TaskPriority.LOW,
        status: TaskStatus.TODO,
        tags: mockTags,
        dueDate: undefined,
        completedAt: undefined,
      };

      const task = await createTask(taskData);

      expect(task.tags).toHaveLength(2);
      expect(task.tags.map((t) => t.id)).toContain('tag1');
      expect(task.tags.map((t) => t.id)).toContain('tag2');
    });
  });

  describe('getTaskById', () => {
    it('should return task by id', async () => {
      const created = await createTask({
        title: 'Find Me',
        priority: TaskPriority.MEDIUM,
        status: TaskStatus.TODO,
        tags: [],
        dueDate: undefined,
        completedAt: undefined,
      });

      const found = await getTaskById(created.id);
      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.title).toBe('Find Me');
    });

    it('should return null for non-existent task', async () => {
      const found = await getTaskById('non-existent-id');
      expect(found).toBeNull();
    });
  });

  describe('getAllTasks', () => {
    it('should return all tasks', async () => {
      await createTask({
        title: 'Task 1',
        priority: TaskPriority.HIGH,
        status: TaskStatus.TODO,
        tags: [],
        dueDate: undefined,
        completedAt: undefined,
      });
      await createTask({
        title: 'Task 2',
        priority: TaskPriority.LOW,
        status: TaskStatus.DONE,
        tags: [],
        dueDate: undefined,
        completedAt: undefined,
      });

      const tasks = await getAllTasks();
      expect(tasks.length).toBeGreaterThanOrEqual(2);
    });

    it('should return empty array when no tasks', async () => {
      const tasks = await getAllTasks();
      expect(tasks).toHaveLength(0);
    });
  });

  describe('filterTasks', () => {
    beforeEach(async () => {
      await createTask({
        title: 'High Priority Task',
        priority: TaskPriority.HIGH,
        status: TaskStatus.TODO,
        tags: [mockTags[0]],
        dueDate: undefined,
        completedAt: undefined,
      });
      await createTask({
        title: 'Low Priority Task',
        priority: TaskPriority.LOW,
        status: TaskStatus.DONE,
        tags: [mockTags[1]],
        dueDate: undefined,
        completedAt: undefined,
      });
    });

    it('should filter by priority', async () => {
      const highPriorityTasks = await filterTasks({ priority: TaskPriority.HIGH });
      expect(highPriorityTasks.every((t) => t.priority === TaskPriority.HIGH)).toBe(true);
    });

    it('should filter by status', async () => {
      const doneTasks = await filterTasks({ status: TaskStatus.DONE });
      expect(doneTasks.every((t) => t.status === TaskStatus.DONE)).toBe(true);
    });

    it('should filter by tags', async () => {
      const taggedTasks = await filterTasks({ tags: ['tag1'] });
      expect(taggedTasks.every((t) => t.tags.some((tag) => tag.id === 'tag1'))).toBe(true);
    });

    it('should filter by search term', async () => {
      const tasks = await filterTasks({ search: 'High' });
      expect(tasks.every((t) => t.title.includes('High'))).toBe(true);
    });

    it('should combine multiple filters', async () => {
      const tasks = await filterTasks({
        priority: TaskPriority.HIGH,
        status: TaskStatus.TODO,
      });
      expect(
        tasks.every((t) => t.priority === TaskPriority.HIGH && t.status === TaskStatus.TODO)
      ).toBe(true);
    });
  });

  describe('updateTask', () => {
    it('should update task fields', async () => {
      const created = await createTask({
        title: 'Original Title',
        priority: TaskPriority.MEDIUM,
        status: TaskStatus.TODO,
        tags: [],
        dueDate: undefined,
        completedAt: undefined,
      });

      const updated = await updateTask(created.id, {
        title: 'Updated Title',
        description: 'New description',
      });

      expect(updated).toBeDefined();
      expect(updated?.title).toBe('Updated Title');
      expect(updated?.description).toBe('New description');
    });

    it('should update task status to done and set completedAt', async () => {
      const created = await createTask({
        title: 'Task to complete',
        priority: TaskPriority.MEDIUM,
        status: TaskStatus.TODO,
        tags: [],
        dueDate: undefined,
        completedAt: undefined,
      });

      const updated = await updateTask(created.id, { status: TaskStatus.DONE });

      expect(updated?.status).toBe(TaskStatus.DONE);
      expect(updated?.completedAt).toBeDefined();
    });

    it('should update task tags', async () => {
      const created = await createTask({
        title: 'Tag Update Task',
        priority: TaskPriority.MEDIUM,
        status: TaskStatus.TODO,
        tags: [],
        dueDate: undefined,
        completedAt: undefined,
      });

      const updated = await updateTask(created.id, { tags: mockTags });

      expect(updated?.tags).toHaveLength(2);
    });

    it('should return null for non-existent task', async () => {
      const updated = await updateTask('non-existent-id', { title: 'New Title' });
      expect(updated).toBeNull();
    });
  });

  describe('deleteTask', () => {
    it('should delete task', async () => {
      const created = await createTask({
        title: 'Delete Me',
        priority: TaskPriority.MEDIUM,
        status: TaskStatus.TODO,
        tags: [],
        dueDate: undefined,
        completedAt: undefined,
      });

      const success = await deleteTask(created.id);
      expect(success).toBe(true);

      const found = await getTaskById(created.id);
      expect(found).toBeNull();
    });

    it('should return false for non-existent task', async () => {
      const success = await deleteTask('non-existent-id');
      expect(success).toBe(false);
    });
  });

  describe('batchUpdateStatus', () => {
    beforeEach(async () => {
      await createTask({
        title: 'Batch Task 1',
        priority: TaskPriority.MEDIUM,
        status: TaskStatus.TODO,
        tags: [],
        dueDate: undefined,
        completedAt: undefined,
      });
      await createTask({
        title: 'Batch Task 2',
        priority: TaskPriority.MEDIUM,
        status: TaskStatus.TODO,
        tags: [],
        dueDate: undefined,
        completedAt: undefined,
      });
    });

    it('should update status for multiple tasks', async () => {
      const tasks = await getAllTasks();
      const taskIds = tasks.map((t) => t.id);

      const count = await batchUpdateStatus(taskIds, TaskStatus.DONE);

      expect(count).toBeGreaterThanOrEqual(2);
    });

    it('should set completedAt when status is done', async () => {
      const tasks = await getAllTasks();
      const taskIds = tasks.map((t) => t.id);

      await batchUpdateStatus(taskIds, TaskStatus.DONE);

      for (const taskId of taskIds) {
        const task = await getTaskById(taskId);
        expect(task?.completedAt).toBeDefined();
      }
    });
  });

  describe('getTaskStats', () => {
    beforeEach(async () => {
      await createTask({
        title: 'Todo Task',
        priority: TaskPriority.HIGH,
        status: TaskStatus.TODO,
        tags: [],
        dueDate: undefined,
        completedAt: undefined,
      });
      await createTask({
        title: 'Done Task',
        priority: TaskPriority.LOW,
        status: TaskStatus.DONE,
        tags: [],
        dueDate: undefined,
        completedAt: undefined,
      });
      await createTask({
        title: 'In Progress Task',
        priority: TaskPriority.MEDIUM,
        status: TaskStatus.IN_PROGRESS,
        tags: [],
        dueDate: undefined,
        completedAt: undefined,
      });
      await createTask({
        title: 'Review Task',
        priority: TaskPriority.HIGH,
        status: TaskStatus.REVIEW,
        tags: [],
        dueDate: undefined,
        completedAt: undefined,
      });
    });

    it('should return correct statistics', async () => {
      const stats = await getTaskStats();

      expect(stats.total).toBeGreaterThanOrEqual(4);
      expect(stats.done).toBeGreaterThanOrEqual(1);
      expect(stats.inProgress).toBeGreaterThanOrEqual(1);
      expect(stats.todo).toBeGreaterThanOrEqual(1);
      expect(stats.review).toBeGreaterThanOrEqual(1);
    });

    it('should calculate completion rate', async () => {
      const stats = await getTaskStats();
      const expectedRate = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;

      expect(stats.completionRate).toBe(expectedRate);
    });

    it('should count tasks by priority', async () => {
      const stats = await getTaskStats();

      expect(stats.byPriority.high).toBeGreaterThanOrEqual(2);
      expect(stats.byPriority.medium).toBeGreaterThanOrEqual(1);
      expect(stats.byPriority.low).toBeGreaterThanOrEqual(1);
    });

    it('should return zero stats when no tasks', async () => {
      const db = await getDatabaseAsync();
      db.exec('DELETE FROM tasks');

      const stats = await getTaskStats();

      expect(stats.total).toBe(0);
      expect(stats.done).toBe(0);
      expect(stats.completionRate).toBe(0);
    });
  });
});