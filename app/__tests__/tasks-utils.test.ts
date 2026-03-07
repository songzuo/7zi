import { describe, it, expect } from 'vitest';
import {
  filterTasks,
  sortTasks,
  isTaskOverdue,
  isTaskDueSoon,
  getTaskStats,
  formatDueDate,
  validateTask,
} from '../lib/tasks/utils';
import { Task, DEFAULT_TAGS } from '../lib/tasks/types';

// 测试数据
const createMockTask = (overrides?: Partial<Task>): Task => ({
  id: 'test-task-1',
  title: 'Test Task',
  description: 'Test Description',
  priority: 'medium',
  status: 'todo',
  tags: [DEFAULT_TAGS[0]],
  createdAt: new Date('2026-03-06'),
  updatedAt: new Date('2026-03-06'),
  ...overrides,
});

describe('filterTasks', () => {
  const tasks: Task[] = [
    createMockTask({ id: '1', priority: 'high', status: 'todo' }),
    createMockTask({ id: '2', priority: 'medium', status: 'in_progress' }),
    createMockTask({ id: '3', priority: 'low', status: 'done', title: 'Bug Fix' }),
  ];

  it('should filter by priority', () => {
    const result = filterTasks(tasks, { priority: 'high' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('should filter by status', () => {
    const result = filterTasks(tasks, { status: 'in_progress' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('2');
  });

  it('should filter by search query', () => {
    const result = filterTasks(tasks, { search: 'Bug' });
    expect(result).toHaveLength(1);
    expect(result[0].title).toContain('Bug');
  });

  it('should return all tasks if no filter', () => {
    const result = filterTasks(tasks, {});
    expect(result).toHaveLength(3);
  });

  it('should return empty array if no match', () => {
    const result = filterTasks(tasks, { priority: 'low', status: 'todo' });
    expect(result).toHaveLength(0);
  });

  it('should filter by multiple criteria', () => {
    const customTasks = [
      createMockTask({ id: '1', priority: 'high', status: 'todo' }),
      createMockTask({ id: '2', priority: 'high', status: 'done' }),
    ];
    const result = filterTasks(customTasks, { priority: 'high', status: 'todo' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('should filter by tags', () => {
    const customTasks = [
      createMockTask({ id: '1', tags: [DEFAULT_TAGS[0], DEFAULT_TAGS[1]] }),
      createMockTask({ id: '2', tags: [DEFAULT_TAGS[2]] }),
    ];
    const result = filterTasks(customTasks, { tags: [DEFAULT_TAGS[0].id] });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });
});

describe('sortTasks', () => {
  const tasks: Task[] = [
    createMockTask({ id: '1', priority: 'low', createdAt: new Date('2026-03-04') }),
    createMockTask({ id: '2', priority: 'high', createdAt: new Date('2026-03-06') }),
    createMockTask({ id: '3', priority: 'medium', createdAt: new Date('2026-03-05') }),
  ];

  it('should sort by priority', () => {
    const result = sortTasks(tasks, 'priority');
    expect(result[0].id).toBe('2'); // high
    expect(result[1].id).toBe('3'); // medium
    expect(result[2].id).toBe('1'); // low
  });

  it('should sort by createdAt (newest first)', () => {
    const result = sortTasks(tasks, 'createdAt');
    expect(result[0].id).toBe('2'); // 2026-03-06
    expect(result[1].id).toBe('3'); // 2026-03-05
    expect(result[2].id).toBe('1'); // 2026-03-04
  });

  it('should sort by dueDate', () => {
    const customTasks = [
      createMockTask({ id: '1', dueDate: new Date('2026-03-10') }),
      createMockTask({ id: '2', dueDate: new Date('2026-03-08') }),
      createMockTask({ id: '3' }), // no due date
    ];
    const result = sortTasks(customTasks, 'dueDate');
    expect(result[0].id).toBe('2'); // earliest
    expect(result[1].id).toBe('1');
    expect(result[2].id).toBe('3'); // no due date goes last
  });
});

describe('isTaskOverdue', () => {
  it('should return true if task is past due', () => {
    const task = createMockTask({
      dueDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // yesterday
      status: 'todo',
    });
    expect(isTaskOverdue(task)).toBe(true);
  });

  it('should return false if task is not due yet', () => {
    const task = createMockTask({
      dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // tomorrow
    });
    expect(isTaskOverdue(task)).toBe(false);
  });

  it('should return false if task has no due date', () => {
    const task = createMockTask();
    expect(isTaskOverdue(task)).toBe(false);
  });

  it('should return false if task is already done', () => {
    const task = createMockTask({
      dueDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
      status: 'done',
    });
    expect(isTaskOverdue(task)).toBe(false);
  });
});

describe('isTaskDueSoon', () => {
  it('should return true if task is due within 24 hours', () => {
    const task = createMockTask({
      dueDate: new Date(Date.now() + 12 * 60 * 60 * 1000), // 12 hours from now
      status: 'todo',
    });
    expect(isTaskDueSoon(task)).toBe(true);
  });

  it('should return false if task is due after 24 hours', () => {
    const task = createMockTask({
      dueDate: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours from now
    });
    expect(isTaskDueSoon(task)).toBe(false);
  });

  it('should return false if task is already overdue', () => {
    const task = createMockTask({
      dueDate: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
    });
    expect(isTaskDueSoon(task)).toBe(false);
  });

  it('should return false if task is done', () => {
    const task = createMockTask({
      dueDate: new Date(Date.now() + 12 * 60 * 60 * 1000),
      status: 'done',
    });
    expect(isTaskDueSoon(task)).toBe(false);
  });
});

describe('getTaskStats', () => {
  const tasks: Task[] = [
    createMockTask({ id: '1', status: 'todo', priority: 'high' }),
    createMockTask({ id: '2', status: 'in_progress', priority: 'medium' }),
    createMockTask({ id: '3', status: 'done', priority: 'low' }),
    createMockTask({ id: '4', status: 'done', priority: 'high' }),
  ];

  it('should calculate correct statistics', () => {
    const stats = getTaskStats(tasks);
    expect(stats.total).toBe(4);
    expect(stats.done).toBe(2);
    expect(stats.inProgress).toBe(1);
    expect(stats.todo).toBe(1);
    expect(stats.completionRate).toBe(50);
  });

  it('should calculate priority distribution', () => {
    const stats = getTaskStats(tasks);
    expect(stats.byPriority.high).toBe(2);
    expect(stats.byPriority.medium).toBe(1);
    expect(stats.byPriority.low).toBe(1);
  });

  it('should handle empty task list', () => {
    const stats = getTaskStats([]);
    expect(stats.total).toBe(0);
    expect(stats.completionRate).toBe(0);
  });

  it('should count overdue tasks', () => {
    const overdueTasks = [
      createMockTask({
        id: '1',
        dueDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
        status: 'todo',
      }),
      createMockTask({
        id: '2',
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
        status: 'todo',
      }),
    ];
    const stats = getTaskStats(overdueTasks);
    expect(stats.overdue).toBe(1);
  });
});

describe('formatDueDate', () => {
  it('should format today', () => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    expect(formatDueDate(today)).toBe('今天截止');
  });

  it('should format tomorrow', () => {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    expect(formatDueDate(tomorrow)).toBe('明天截止');
  });

  it('should format days until due', () => {
    const future = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    expect(formatDueDate(future)).toBe('3 天后截止');
  });

  it('should format overdue', () => {
    const past = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    expect(formatDueDate(past)).toBe('已过期 3 天');
  });
});

describe('validateTask', () => {
  it('should return no errors for valid task', () => {
    const errors = validateTask({
      title: 'Valid Task',
      priority: 'medium',
      status: 'todo',
      tags: [],
    });
    expect(errors).toHaveLength(0);
  });

  it('should return error for empty title', () => {
    const errors = validateTask({
      title: '',
      priority: 'medium',
      status: 'todo',
      tags: [],
    });
    expect(errors).toContain('任务标题不能为空');
  });

  it('should return error for title too long', () => {
    const errors = validateTask({
      title: 'a'.repeat(201),
      priority: 'medium',
      status: 'todo',
      tags: [],
    });
    expect(errors).toContain('任务标题不能超过 200 个字符');
  });

  it('should return error for description too long', () => {
    const errors = validateTask({
      title: 'Test',
      description: 'a'.repeat(2001),
      priority: 'medium',
      status: 'todo',
      tags: [],
    });
    expect(errors).toContain('任务描述不能超过 2000 个字符');
  });

  it('should return error for past due date', () => {
    const errors = validateTask({
      title: 'Test',
      dueDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
      priority: 'medium',
      status: 'todo',
      tags: [],
    });
    expect(errors).toContain('截止日期不能早于当前时间');
  });

  it('should return multiple errors', () => {
    const errors = validateTask({
      title: '',
      description: 'a'.repeat(2001),
      priority: 'medium',
      status: 'todo',
      tags: [],
    });
    expect(errors.length).toBeGreaterThan(1);
  });
});