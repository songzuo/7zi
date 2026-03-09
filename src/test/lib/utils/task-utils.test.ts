import { describe, it, expect } from 'vitest';
import {
  getRoleForTaskType,
  getPriorityLevel,
  getStatusOrder,
  sortTasks,
  filterTasksByType,
  filterTasksByStatus,
  getTaskStats,
  validateTaskData
} from '@/lib/utils/task-utils';
import { AI_MEMBER_ROLES, type Task } from '@/lib/types/task-types';

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

    it('should return GENERAL for other tasks', () => {
      expect(getRoleForTaskType('other')).toBe(AI_MEMBER_ROLES.GENERAL);
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
  });

  describe('getStatusOrder', () => {
    it('should return correct order for pending status', () => {
      expect(getStatusOrder('pending')).toBe(1);
    });

    it('should return correct order for assigned status', () => {
      expect(getStatusOrder('assigned')).toBe(2);
    });

    it('should return correct order for in_progress status', () => {
      expect(getStatusOrder('in_progress')).toBe(3);
    });

    it('should return correct order for completed status', () => {
      expect(getStatusOrder('completed')).toBe(4);
    });
  });

  describe('sortTasks', () => {
    const createMockTask = (
      id: string,
      status: 'pending' | 'assigned' | 'in_progress' | 'completed',
      priority: 'low' | 'medium' | 'high' | 'urgent',
      createdAt: string
    ): Task => ({
      id,
      title: `Task ${id}`,
      description: `Description ${id}`,
      type: 'development',
      priority,
      status,
      createdBy: 'user',
      createdAt,
      updatedAt: createdAt,
      comments: [],
      history: []
    });

    it('should sort tasks by status first (pending before completed)', () => {
      const tasks = [
        createMockTask('1', 'completed', 'medium', '2024-01-01'),
        createMockTask('2', 'pending', 'medium', '2024-01-01')
      ];

      const sorted = sortTasks(tasks);
      expect(sorted[0].id).toBe('2');
      expect(sorted[1].id).toBe('1');
    });

    it('should sort tasks by priority when status is same', () => {
      const tasks = [
        createMockTask('1', 'pending', 'low', '2024-01-01'),
        createMockTask('2', 'pending', 'urgent', '2024-01-01')
      ];

      const sorted = sortTasks(tasks);
      expect(sorted[0].id).toBe('2'); // urgent first
      expect(sorted[1].id).toBe('1');
    });

    it('should not mutate original array', () => {
      const tasks = [
        createMockTask('1', 'pending', 'low', '2024-01-01'),
        createMockTask('2', 'completed', 'high', '2024-01-01')
      ];

      sortTasks(tasks);
      expect(tasks[0].id).toBe('1');
    });
  });

  describe('filterTasksByType', () => {
    const createMockTask = (type: 'development' | 'design' | 'research' | 'marketing' | 'other'): Task => ({
      id: '1',
      title: 'Task',
      description: 'Description',
      type,
      priority: 'medium',
      status: 'pending',
      createdBy: 'user',
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
      comments: [],
      history: []
    });

    it('should return all tasks when type is "all"', () => {
      const tasks = [
        createMockTask('development'),
        createMockTask('design')
      ];

      const filtered = filterTasksByType(tasks, 'all');
      expect(filtered).toHaveLength(2);
    });

    it('should filter by specific type', () => {
      const tasks = [
        createMockTask('development'),
        createMockTask('design'),
        createMockTask('development')
      ];

      const filtered = filterTasksByType(tasks, 'development');
      expect(filtered).toHaveLength(2);
      expect(filtered.every(t => t.type === 'development')).toBe(true);
    });
  });

  describe('filterTasksByStatus', () => {
    const createMockTask = (status: 'pending' | 'assigned' | 'in_progress' | 'completed'): Task => ({
      id: '1',
      title: 'Task',
      description: 'Description',
      type: 'development',
      priority: 'medium',
      status,
      createdBy: 'user',
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
      comments: [],
      history: []
    });

    it('should return all tasks when status is "all"', () => {
      const tasks = [
        createMockTask('pending'),
        createMockTask('completed')
      ];

      const filtered = filterTasksByStatus(tasks, 'all');
      expect(filtered).toHaveLength(2);
    });

    it('should filter by specific status', () => {
      const tasks = [
        createMockTask('pending'),
        createMockTask('completed'),
        createMockTask('pending')
      ];

      const filtered = filterTasksByStatus(tasks, 'pending');
      expect(filtered).toHaveLength(2);
    });
  });

  describe('getTaskStats', () => {
    const createMockTask = (status: 'pending' | 'assigned' | 'in_progress' | 'completed'): Task => ({
      id: '1',
      title: 'Task',
      description: 'Description',
      type: 'development',
      priority: 'medium',
      status,
      createdBy: 'user',
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
      comments: [],
      history: []
    });

    it('should return correct statistics', () => {
      const tasks = [
        createMockTask('pending'),
        createMockTask('assigned'),
        createMockTask('in_progress'),
        createMockTask('completed'),
        createMockTask('completed')
      ];

      const stats = getTaskStats(tasks);
      expect(stats.total).toBe(5);
      expect(stats.pending).toBe(1);
      expect(stats.assigned).toBe(1);
      expect(stats.inProgress).toBe(1);
      expect(stats.completed).toBe(2);
      expect(stats.completionRate).toBe(40);
    });

    it('should return zero stats for empty array', () => {
      const stats = getTaskStats([]);
      expect(stats.total).toBe(0);
      expect(stats.completionRate).toBe(0);
    });
  });

  describe('validateTaskData', () => {
    it('should return valid for complete task data', () => {
      const result = validateTaskData({
        title: 'Test Task',
        description: 'Test Description',
        type: 'development',
        priority: 'high'
      });

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return invalid for missing title', () => {
      const result = validateTaskData({
        title: '',
        description: 'Test Description',
        type: 'development',
        priority: 'high'
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Title is required');
    });

    it('should return invalid for missing description', () => {
      const result = validateTaskData({
        title: 'Test Task',
        description: '',
        type: 'development',
        priority: 'high'
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Description is required');
    });

    it('should return invalid for missing type', () => {
      const result = validateTaskData({
        title: 'Test Task',
        description: 'Test Description',
        priority: 'high'
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Task type is required');
    });

    it('should return invalid for missing priority', () => {
      const result = validateTaskData({
        title: 'Test Task',
        description: 'Test Description',
        type: 'development'
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Priority is required');
    });
  });
});
