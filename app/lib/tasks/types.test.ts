/**
 * Tasks Types 测试
 */

import { describe, it, expect } from 'vitest';
import {
  TaskPriority,
  TaskStatus,
  TaskTag,
  Task,
  TaskFilter,
  TaskStats,
  DEFAULT_TAGS,
  PRIORITY_CONFIG,
  STATUS_CONFIG,
} from './types';

describe('Task Types', () => {
  describe('TaskPriority', () => {
    it('should have valid priority values', () => {
      const priorities: TaskPriority[] = ['high', 'medium', 'low'];
      expect(priorities).toHaveLength(3);
    });
  });

  describe('TaskStatus', () => {
    it('should have valid status values', () => {
      const statuses: TaskStatus[] = ['todo', 'in_progress', 'review', 'done'];
      expect(statuses).toHaveLength(4);
    });
  });

  describe('TaskTag', () => {
    it('should create a valid task tag', () => {
      const tag: TaskTag = {
        id: 'tag1',
        name: 'Bug',
        color: 'red',
      };
      expect(tag.id).toBe('tag1');
      expect(tag.name).toBe('Bug');
      expect(tag.color).toBe('red');
    });
  });

  describe('Task', () => {
    it('should create a valid task with required fields', () => {
      const task: Task = {
        id: 'task1',
        title: 'Test Task',
        priority: 'high' as TaskPriority,
        status: 'todo' as TaskStatus,
        tags: [],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };
      expect(task.id).toBe('task1');
      expect(task.title).toBe('Test Task');
    });

    it('should create a task with optional fields', () => {
      const task: Task = {
        id: 'task2',
        title: 'Full Task',
        description: 'Task description',
        priority: 'medium' as TaskPriority,
        status: 'in_progress' as TaskStatus,
        tags: [{ id: 'tag1', name: 'Bug', color: 'red' }],
        assignee: 'user1',
        dueDate: new Date('2024-12-31'),
        completedAt: new Date('2024-01-15'),
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-15'),
      };
      expect(task.description).toBe('Task description');
      expect(task.assignee).toBe('user1');
      expect(task.tags).toHaveLength(1);
    });
  });

  describe('TaskFilter', () => {
    it('should create a filter with single condition', () => {
      const filter: TaskFilter = {
        status: 'todo' as TaskStatus,
      };
      expect(filter.status).toBe('todo');
    });

    it('should create a filter with multiple conditions', () => {
      const filter: TaskFilter = {
        priority: 'high' as TaskPriority,
        status: 'todo' as TaskStatus,
        tags: ['tag1', 'tag2'],
        assignee: 'user1',
        search: 'urgent',
      };
      expect(filter.priority).toBe('high');
      expect(filter.tags).toHaveLength(2);
    });

    it('should create an empty filter', () => {
      const filter: TaskFilter = {};
      expect(Object.keys(filter)).toHaveLength(0);
    });
  });

  describe('TaskStats', () => {
    it('should create valid task stats', () => {
      const stats: TaskStats = {
        total: 100,
        done: 50,
        inProgress: 30,
        todo: 15,
        review: 5,
        overdue: 10,
        dueSoon: 20,
        completionRate: 50,
        byPriority: {
          high: 20,
          medium: 50,
          low: 30,
        },
      };
      expect(stats.total).toBe(100);
      expect(stats.completionRate).toBe(50);
      expect(stats.byPriority.high).toBe(20);
    });

    it('should calculate completion rate correctly', () => {
      const stats: TaskStats = {
        total: 200,
        done: 100,
        inProgress: 50,
        todo: 30,
        review: 20,
        overdue: 5,
        dueSoon: 10,
        completionRate: 50,
        byPriority: {
          high: 60,
          medium: 80,
          low: 60,
        },
      };
      expect(stats.completionRate).toBe(50);
    });
  });

  describe('DEFAULT_TAGS', () => {
    it('should have all default tags defined', () => {
      expect(DEFAULT_TAGS).toHaveLength(6);
    });

    it('should have Bug tag', () => {
      const bugTag = DEFAULT_TAGS.find((t) => t.id === 'bug');
      expect(bugTag).toBeDefined();
      expect(bugTag?.name).toBe('Bug');
      expect(bugTag?.color).toBe('red');
    });

    it('should have Feature tag', () => {
      const featureTag = DEFAULT_TAGS.find((t) => t.id === 'feature');
      expect(featureTag).toBeDefined();
      expect(featureTag?.name).toBe('Feature');
      expect(featureTag?.color).toBe('blue');
    });

    it('should have AI Agent tag', () => {
      const aiTag = DEFAULT_TAGS.find((t) => t.id === 'ai-agent');
      expect(aiTag).toBeDefined();
      expect(aiTag?.name).toBe('AI Agent');
      expect(aiTag?.color).toBe('pink');
    });
  });

  describe('PRIORITY_CONFIG', () => {
    it('should have config for all priorities', () => {
      expect(PRIORITY_CONFIG.high).toBeDefined();
      expect(PRIORITY_CONFIG.medium).toBeDefined();
      expect(PRIORITY_CONFIG.low).toBeDefined();
    });

    it('should have correct labels', () => {
      expect(PRIORITY_CONFIG.high.label).toBe('高优先级');
      expect(PRIORITY_CONFIG.medium.label).toBe('中优先级');
      expect(PRIORITY_CONFIG.low.label).toBe('低优先级');
    });

    it('should have correct colors', () => {
      expect(PRIORITY_CONFIG.high.color).toBe('red');
      expect(PRIORITY_CONFIG.medium.color).toBe('yellow');
      expect(PRIORITY_CONFIG.low.color).toBe('green');
    });

    it('should have icons', () => {
      expect(PRIORITY_CONFIG.high.icon).toBe('🔴');
      expect(PRIORITY_CONFIG.medium.icon).toBe('🟡');
      expect(PRIORITY_CONFIG.low.icon).toBe('🟢');
    });
  });

  describe('STATUS_CONFIG', () => {
    it('should have config for all statuses', () => {
      expect(STATUS_CONFIG.todo).toBeDefined();
      expect(STATUS_CONFIG.in_progress).toBeDefined();
      expect(STATUS_CONFIG.review).toBeDefined();
      expect(STATUS_CONFIG.done).toBeDefined();
    });

    it('should have correct labels', () => {
      expect(STATUS_CONFIG.todo.label).toBe('待办');
      expect(STATUS_CONFIG.in_progress.label).toBe('进行中');
      expect(STATUS_CONFIG.review.label).toBe('评审中');
      expect(STATUS_CONFIG.done.label).toBe('已完成');
    });

    it('should have correct colors', () => {
      expect(STATUS_CONFIG.todo.color).toBe('gray');
      expect(STATUS_CONFIG.in_progress.color).toBe('blue');
      expect(STATUS_CONFIG.review.color).toBe('purple');
      expect(STATUS_CONFIG.done.color).toBe('green');
    });
  });
});