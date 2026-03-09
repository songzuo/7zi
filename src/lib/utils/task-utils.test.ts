import { describe, it, expect } from 'vitest';
import {
  getRoleForTaskType,
  getPriorityLevel,
  getStatusOrder,
  sortTasks,
  filterTasksByType,
  filterTasksByStatus,
  getTaskStats,
  validateTaskData,
} from './task-utils';
import type { Task, TaskType, TaskPriority, TaskStatus } from '@/lib/types/task-types';
import { AI_MEMBER_ROLES } from '@/lib/types/task-types';

// Mock task factory
const createMockTask = (overrides: Partial<Task> = {}): Task => ({
  id: 'task-1',
  title: 'Test Task',
  description: 'Test description',
  type: 'development',
  priority: 'medium',
  status: 'pending',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  ...overrides,
});

describe('task-utils', () => {
  describe('getRoleForTaskType', () => {
    it('should return EXECUTOR for development tasks', () => {
      expect(getRoleForTaskType('development')).toBe(AI_MEMBER_ROLES.EXECUTOR);
    });

    it('should return DESIGNER for design tasks', () => {
      expect(getRoleForTaskType('design')).toBe(AI_MEMBER_ROLES.DESIGNER);
    });

    it('should return CONSULTANT for research tasks', () => {
      expect(getRoleForTaskType('research')).toBe(AI_MEMBER_ROLES.CONSULTANT);
    });

    it('should return PROMOTER for marketing tasks', () => {
      expect(getRoleForTaskType('marketing')).toBe(AI_MEMBER_ROLES.PROMOTER);
    });

    it('should return GENERAL for unknown task types', () => {
      // Test with a valid type that doesn't have specific mapping
      expect(getRoleForTaskType('bug' as TaskType)).toBe(AI_MEMBER_ROLES.GENERAL);
    });
  });

  describe('getPriorityLevel', () => {
    it('should return 4 for urgent priority', () => {
      expect(getPriorityLevel('urgent')).toBe(4);
    });

    it('should return 3 for high priority', () => {
      expect(getPriorityLevel('high')).toBe(3);
    });

    it('should return 2 for medium priority', () => {
      expect(getPriorityLevel('medium')).toBe(2);
    });

    it('should return 1 for low priority', () => {
      expect(getPriorityLevel('low')).toBe(1);
    });

    it('should return 0 for unknown priority', () => {
      expect(getPriorityLevel('unknown' as TaskPriority)).toBe(0);
    });
  });

  describe('getStatusOrder', () => {
    it('should return 1 for pending status', () => {
      expect(getStatusOrder('pending')).toBe(1);
    });

    it('should return 2 for assigned status', () => {
      expect(getStatusOrder('assigned')).toBe(2);
    });

    it('should return 3 for in_progress status', () => {
      expect(getStatusOrder('in_progress')).toBe(3);
    });

    it('should return 4 for completed status', () => {
      expect(getStatusOrder('completed')).toBe(4);
    });

    it('should return 0 for unknown status', () => {
      expect(getStatusOrder('unknown' as TaskStatus)).toBe(0);
    });
  });

  describe('sortTasks', () => {
    it('should sort tasks by status (pending first)', () => {
      const tasks = [
        createMockTask({ id: '1', status: 'completed' }),
        createMockTask({ id: '2', status: 'pending' }),
        createMockTask({ id: '3', status: 'in_progress' }),
      ];

      const sorted = sortTasks(tasks);

      expect(sorted[0].status).toBe('pending');
      expect(sorted[1].status).toBe('in_progress');
      expect(sorted[2].status).toBe('completed');
    });

    it('should sort tasks by priority (urgent first) when status is same', () => {
      const tasks = [
        createMockTask({ id: '1', status: 'pending', priority: 'low' }),
        createMockTask({ id: '2', status: 'pending', priority: 'urgent' }),
        createMockTask({ id: '3', status: 'pending', priority: 'high' }),
      ];

      const sorted = sortTasks(tasks);

      expect(sorted[0].priority).toBe('urgent');
      expect(sorted[1].priority).toBe('high');
      expect(sorted[2].priority).toBe('low');
    });

    it('should sort tasks by creation date (newest first) when status and priority are same', () => {
      const tasks = [
        createMockTask({ id: '1', createdAt: '2024-01-01T00:00:00.000Z' }),
        createMockTask({ id: '2', createdAt: '2024-01-03T00:00:00.000Z' }),
        createMockTask({ id: '3', createdAt: '2024-01-02T00:00:00.000Z' }),
      ];

      const sorted = sortTasks(tasks);

      expect(sorted[0].id).toBe('2'); // Newest
      expect(sorted[1].id).toBe('3');
      expect(sorted[2].id).toBe('1'); // Oldest
    });

    it('should not mutate the original array', () => {
      const tasks = [
        createMockTask({ id: '1', status: 'completed' }),
        createMockTask({ id: '2', status: 'pending' }),
      ];

      const sorted = sortTasks(tasks);

      expect(tasks[0].status).toBe('completed');
      expect(sorted[0].status).toBe('pending');
    });

    it('should handle empty array', () => {
      const sorted = sortTasks([]);
      expect(sorted).toEqual([]);
    });

    it('should handle single task', () => {
      const tasks = [createMockTask()];
      const sorted = sortTasks(tasks);
      expect(sorted).toHaveLength(1);
    });
  });

  describe('filterTasksByType', () => {
    it('should filter tasks by type', () => {
      const tasks = [
        createMockTask({ id: '1', type: 'development' }),
        createMockTask({ id: '2', type: 'design' }),
        createMockTask({ id: '3', type: 'development' }),
      ];

      const filtered = filterTasksByType(tasks, 'development');

      expect(filtered).toHaveLength(2);
      expect(filtered.every((t) => t.type === 'development')).toBe(true);
    });

    it('should return all tasks when type is "all"', () => {
      const tasks = [
        createMockTask({ id: '1', type: 'development' }),
        createMockTask({ id: '2', type: 'design' }),
      ];

      const filtered = filterTasksByType(tasks, 'all');

      expect(filtered).toHaveLength(2);
    });

    it('should return empty array when no tasks match type', () => {
      const tasks = [
        createMockTask({ id: '1', type: 'development' }),
        createMockTask({ id: '2', type: 'design' }),
      ];

      const filtered = filterTasksByType(tasks, 'research');

      expect(filtered).toHaveLength(0);
    });
  });

  describe('filterTasksByStatus', () => {
    it('should filter tasks by status', () => {
      const tasks = [
        createMockTask({ id: '1', status: 'pending' }),
        createMockTask({ id: '2', status: 'completed' }),
        createMockTask({ id: '3', status: 'pending' }),
      ];

      const filtered = filterTasksByStatus(tasks, 'pending');

      expect(filtered).toHaveLength(2);
      expect(filtered.every((t) => t.status === 'pending')).toBe(true);
    });

    it('should return all tasks when status is "all"', () => {
      const tasks = [
        createMockTask({ id: '1', status: 'pending' }),
        createMockTask({ id: '2', status: 'completed' }),
      ];

      const filtered = filterTasksByStatus(tasks, 'all');

      expect(filtered).toHaveLength(2);
    });

    it('should return empty array when no tasks match status', () => {
      const tasks = [
        createMockTask({ id: '1', status: 'pending' }),
        createMockTask({ id: '2', status: 'in_progress' }),
      ];

      const filtered = filterTasksByStatus(tasks, 'completed');

      expect(filtered).toHaveLength(0);
    });
  });

  describe('getTaskStats', () => {
    it('should calculate task statistics correctly', () => {
      const tasks = [
        createMockTask({ id: '1', status: 'pending' }),
        createMockTask({ id: '2', status: 'pending' }),
        createMockTask({ id: '3', status: 'assigned' }),
        createMockTask({ id: '4', status: 'in_progress' }),
        createMockTask({ id: '5', status: 'completed' }),
        createMockTask({ id: '6', status: 'completed' }),
        createMockTask({ id: '7', status: 'completed' }),
      ];

      const stats = getTaskStats(tasks);

      expect(stats.total).toBe(7);
      expect(stats.pending).toBe(2);
      expect(stats.assigned).toBe(1);
      expect(stats.inProgress).toBe(1);
      expect(stats.completed).toBe(3);
      expect(stats.completionRate).toBe(43); // 3/7 = ~43%
    });

    it('should handle empty array', () => {
      const stats = getTaskStats([]);

      expect(stats.total).toBe(0);
      expect(stats.pending).toBe(0);
      expect(stats.assigned).toBe(0);
      expect(stats.inProgress).toBe(0);
      expect(stats.completed).toBe(0);
      expect(stats.completionRate).toBe(0);
    });

    it('should calculate 100% completion rate for all completed', () => {
      const tasks = [
        createMockTask({ status: 'completed' }),
        createMockTask({ status: 'completed' }),
      ];

      const stats = getTaskStats(tasks);

      expect(stats.completionRate).toBe(100);
    });

    it('should calculate 0% completion rate for no completed', () => {
      const tasks = [
        createMockTask({ status: 'pending' }),
        createMockTask({ status: 'in_progress' }),
      ];

      const stats = getTaskStats(tasks);

      expect(stats.completionRate).toBe(0);
    });
  });

  describe('validateTaskData', () => {
    it('should return valid for complete task data', () => {
      const result = validateTaskData({
        title: 'Test Task',
        description: 'Test description',
        type: 'development',
        priority: 'high',
      });

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return error for missing title', () => {
      const result = validateTaskData({
        description: 'Test description',
        type: 'development',
        priority: 'high',
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Title is required');
    });

    it('should return error for empty title', () => {
      const result = validateTaskData({
        title: '',
        description: 'Test description',
        type: 'development',
        priority: 'high',
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Title is required');
    });

    it('should return error for whitespace-only title', () => {
      const result = validateTaskData({
        title: '   ',
        description: 'Test description',
        type: 'development',
        priority: 'high',
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Title is required');
    });

    it('should return error for missing description', () => {
      const result = validateTaskData({
        title: 'Test Task',
        type: 'development',
        priority: 'high',
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Description is required');
    });

    it('should return error for missing type', () => {
      const result = validateTaskData({
        title: 'Test Task',
        description: 'Test description',
        priority: 'high',
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Task type is required');
    });

    it('should return error for missing priority', () => {
      const result = validateTaskData({
        title: 'Test Task',
        description: 'Test description',
        type: 'development',
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Priority is required');
    });

    it('should return multiple errors for multiple missing fields', () => {
      const result = validateTaskData({});

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(4);
      expect(result.errors).toContain('Title is required');
      expect(result.errors).toContain('Description is required');
      expect(result.errors).toContain('Task type is required');
      expect(result.errors).toContain('Priority is required');
    });
  });
});