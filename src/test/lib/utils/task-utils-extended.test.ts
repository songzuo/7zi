/**
 * Task Utils Extended Tests
 * Tests for src/lib/utils/task-utils.ts
 * Extended coverage for edge cases and error handling
 */

import { describe, it, expect, vi } from 'vitest';
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
import { AI_MEMBER_ROLES, type Task, TaskType, TaskPriority, TaskStatus } from '@/lib/types/task-types';

// Helper to create mock tasks
const createMockTask = (
  overrides: Partial<Task> = {}
): Task => ({
  id: 'task-1',
  title: 'Test Task',
  description: 'Test Description',
  type: 'development',
  priority: 'medium',
  status: 'pending',
  createdBy: 'user',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  comments: [],
  history: [],
  ...overrides
});

describe('task-utils extended', () => {
  // ============================================================================
  // getRoleForTaskType - Extended
  // ============================================================================

  describe('getRoleForTaskType - Edge Cases', () => {
    it('should handle all valid task types', () => {
      expect(getRoleForTaskType('development')).toBe(AI_MEMBER_ROLES.EXECUTOR);
      expect(getRoleForTaskType('design')).toBe(AI_MEMBER_ROLES.DESIGNER);
      expect(getRoleForTaskType('research')).toBe(AI_MEMBER_ROLES.CONSULTANT);
      expect(getRoleForTaskType('marketing')).toBe(AI_MEMBER_ROLES.PROMOTER);
      expect(getRoleForTaskType('other')).toBe(AI_MEMBER_ROLES.GENERAL);
    });

    it('should return GENERAL for undefined type', () => {
      expect(getRoleForTaskType(undefined as any)).toBe(AI_MEMBER_ROLES.GENERAL);
    });

    it('should return GENERAL for null type', () => {
      expect(getRoleForTaskType(null as any)).toBe(AI_MEMBER_ROLES.GENERAL);
    });

    it('should return GENERAL for invalid string type', () => {
      expect(getRoleForTaskType('invalid-type' as any)).toBe(AI_MEMBER_ROLES.GENERAL);
    });

    it('should return GENERAL for empty string', () => {
      expect(getRoleForTaskType('' as any)).toBe(AI_MEMBER_ROLES.GENERAL);
    });
  });

  // ============================================================================
  // getPriorityLevel - Extended
  // ============================================================================

  describe('getPriorityLevel - Edge Cases', () => {
    it('should handle all valid priorities', () => {
      expect(getPriorityLevel('urgent')).toBe(4);
      expect(getPriorityLevel('high')).toBe(3);
      expect(getPriorityLevel('medium')).toBe(2);
      expect(getPriorityLevel('low')).toBe(1);
    });

    it('should return 0 for undefined priority', () => {
      expect(getPriorityLevel(undefined as any)).toBe(0);
    });

    it('should return 0 for null priority', () => {
      expect(getPriorityLevel(null as any)).toBe(0);
    });

    it('should return 0 for invalid priority', () => {
      expect(getPriorityLevel('invalid' as any)).toBe(0);
    });

    it('should return 0 for empty string', () => {
      expect(getPriorityLevel('' as any)).toBe(0);
    });
  });

  // ============================================================================
  // getStatusOrder - Extended
  // ============================================================================

  describe('getStatusOrder - Edge Cases', () => {
    it('should handle all valid statuses', () => {
      expect(getStatusOrder('pending')).toBe(1);
      expect(getStatusOrder('assigned')).toBe(2);
      expect(getStatusOrder('in_progress')).toBe(3);
      expect(getStatusOrder('completed')).toBe(4);
    });

    it('should return 0 for undefined status', () => {
      expect(getStatusOrder(undefined as any)).toBe(0);
    });

    it('should return 0 for null status', () => {
      expect(getStatusOrder(null as any)).toBe(0);
    });

    it('should return 0 for invalid status', () => {
      expect(getStatusOrder('invalid' as any)).toBe(0);
    });

    it('should return 0 for empty string', () => {
      expect(getStatusOrder('' as any)).toBe(0);
    });

    it('should return 0 for unknown status', () => {
      expect(getStatusOrder('cancelled' as any)).toBe(0);
    });
  });

  // ============================================================================
  // sortTasks - Extended
  // ============================================================================

  describe('sortTasks - Edge Cases', () => {
    it('should return empty array for empty input', () => {
      const result = sortTasks([]);
      expect(result).toEqual([]);
    });

    it('should return single item for single task', () => {
      const tasks = [createMockTask({ id: '1' })];
      const result = sortTasks(tasks);
      expect(result).toHaveLength(1);
    });

    it('should sort by createdAt as tiebreaker (newest first)', () => {
      const tasks = [
        createMockTask({ id: '1', status: 'pending', priority: 'medium', createdAt: '2024-01-01T00:00:00Z' }),
        createMockTask({ id: '2', status: 'pending', priority: 'medium', createdAt: '2024-01-03T00:00:00Z' })
      ];
      
      const sorted = sortTasks(tasks);
      expect(sorted[0].id).toBe('2'); // Newer first
      expect(sorted[1].id).toBe('1');
    });

    it('should handle tasks with same status, priority, and createdAt', () => {
      const tasks = [
        createMockTask({ id: '1', status: 'pending', priority: 'medium', createdAt: '2024-01-01T00:00:00Z' }),
        createMockTask({ id: '2', status: 'pending', priority: 'medium', createdAt: '2024-01-01T00:00:00Z' })
      ];
      
      const sorted = sortTasks(tasks);
      expect(sorted).toHaveLength(2);
    });

    it('should handle tasks with missing createdAt', () => {
      const tasks = [
        createMockTask({ id: '1', createdAt: '' }),
        createMockTask({ id: '2', createdAt: '2024-01-01' })
      ];
      
      // Should not throw
      expect(() => sortTasks(tasks)).not.toThrow();
    });

    it('should handle tasks with null dates', () => {
      const tasks = [
        createMockTask({ id: '1', createdAt: null as any }),
        createMockTask({ id: '2', createdAt: '2024-01-01' })
      ];
      
      expect(() => sortTasks(tasks)).not.toThrow();
    });

    it('should handle all status combinations correctly', () => {
      const tasks = [
        createMockTask({ id: '1', status: 'completed', priority: 'low' }),
        createMockTask({ id: '2', status: 'pending', priority: 'urgent' }),
        createMockTask({ id: '3', status: 'in_progress', priority: 'medium' }),
        createMockTask({ id: '4', status: 'assigned', priority: 'high' })
      ];
      
      const sorted = sortTasks(tasks);
      
      // Status order: pending(1) -> assigned(2) -> in_progress(3) -> completed(4)
      expect(sorted[0].id).toBe('2'); // pending, urgent
      expect(sorted[1].id).toBe('4'); // assigned, high
      expect(sorted[2].id).toBe('3'); // in_progress, medium
      expect(sorted[3].id).toBe('1'); // completed, low
    });

    it('should handle tasks with invalid status', () => {
      const tasks = [
        createMockTask({ id: '1', status: 'pending' }),
        createMockTask({ id: '2', status: 'invalid' as any })
      ];
      
      expect(() => sortTasks(tasks)).not.toThrow();
    });

    it('should handle tasks with invalid priority', () => {
      const tasks = [
        createMockTask({ id: '1', priority: 'high' }),
        createMockTask({ id: '2', priority: 'invalid' as any })
      ];
      
      expect(() => sortTasks(tasks)).not.toThrow();
    });
  });

  // ============================================================================
  // filterTasksByType - Extended
  // ============================================================================

  describe('filterTasksByType - Edge Cases', () => {
    const tasks = [
      createMockTask({ id: '1', type: 'development' }),
      createMockTask({ id: '2', type: 'design' }),
      createMockTask({ id: '3', type: 'development' }),
      createMockTask({ id: '4', type: 'research' })
    ];

    it('should return all tasks for "all" filter', () => {
      const result = filterTasksByType(tasks, 'all');
      expect(result).toHaveLength(4);
    });

    it('should return empty array when no matches', () => {
      const result = filterTasksByType(tasks, 'marketing');
      expect(result).toHaveLength(0);
    });

    it('should return empty array for empty input', () => {
      const result = filterTasksByType([], 'development');
      expect(result).toEqual([]);
    });

    it('should return empty array for undefined type filter', () => {
      const result = filterTasksByType(tasks, undefined as any);
      expect(result).toEqual([]);
    });

    it('should return empty array for null type filter', () => {
      const result = filterTasksByType(tasks, null as any);
      expect(result).toEqual([]);
    });

    it('should handle invalid type', () => {
      const result = filterTasksByType(tasks, 'invalid-type' as any);
      expect(result).toHaveLength(0);
    });

    it('should not mutate original array', () => {
      const originalLength = tasks.length;
      filterTasksByType(tasks, 'development');
      expect(tasks.length).toBe(originalLength);
    });
  });

  // ============================================================================
  // filterTasksByStatus - Extended
  // ============================================================================

  describe('filterTasksByStatus - Edge Cases', () => {
    const tasks = [
      createMockTask({ id: '1', status: 'pending' }),
      createMockTask({ id: '2', status: 'completed' }),
      createMockTask({ id: '3', status: 'pending' }),
      createMockTask({ id: '4', status: 'in_progress' })
    ];

    it('should return all tasks for "all" filter', () => {
      const result = filterTasksByStatus(tasks, 'all');
      expect(result).toHaveLength(4);
    });

    it('should return empty array when no matches', () => {
      const result = filterTasksByStatus(tasks, 'assigned');
      expect(result).toHaveLength(0);
    });

    it('should return empty array for empty input', () => {
      const result = filterTasksByStatus([], 'pending');
      expect(result).toEqual([]);
    });

    it('should return empty array for undefined status filter', () => {
      const result = filterTasksByStatus(tasks, undefined as any);
      expect(result).toEqual([]);
    });

    it('should return empty array for null status filter', () => {
      const result = filterTasksByStatus(tasks, null as any);
      expect(result).toEqual([]);
    });

    it('should handle invalid status', () => {
      const result = filterTasksByStatus(tasks, 'invalid-status' as any);
      expect(result).toHaveLength(0);
    });

    it('should handle all valid statuses', () => {
      expect(filterTasksByStatus(tasks, 'pending')).toHaveLength(2);
      expect(filterTasksByStatus(tasks, 'completed')).toHaveLength(1);
      expect(filterTasksByStatus(tasks, 'in_progress')).toHaveLength(1);
      expect(filterTasksByStatus(tasks, 'assigned')).toHaveLength(0);
    });
  });

  // ============================================================================
  // getTaskStats - Extended
  // ============================================================================

  describe('getTaskStats - Edge Cases', () => {
    it('should return zero stats for empty array', () => {
      const stats = getTaskStats([]);
      
      expect(stats.total).toBe(0);
      expect(stats.pending).toBe(0);
      expect(stats.assigned).toBe(0);
      expect(stats.inProgress).toBe(0);
      expect(stats.completed).toBe(0);
      expect(stats.completionRate).toBe(0);
    });

    it('should handle all tasks in each status', () => {
      const tasks = [
        createMockTask({ id: '1', status: 'pending' }),
        createMockTask({ id: '2', status: 'assigned' }),
        createMockTask({ id: '3', status: 'in_progress' }),
        createMockTask({ id: '4', status: 'completed' })
      ];
      
      const stats = getTaskStats(tasks);
      
      expect(stats.pending).toBe(1);
      expect(stats.assigned).toBe(1);
      expect(stats.inProgress).toBe(1);
      expect(stats.completed).toBe(1);
      expect(stats.completionRate).toBe(25);
    });

    it('should calculate 100% completion rate when all complete', () => {
      const tasks = [
        createMockTask({ status: 'completed' }),
        createMockTask({ status: 'completed' })
      ];
      
      const stats = getTaskStats(tasks);
      expect(stats.completionRate).toBe(100);
    });

    it('should handle tasks with invalid status', () => {
      const tasks = [
        createMockTask({ status: 'pending' }),
        createMockTask({ status: 'invalid' as any })
      ];
      
      const stats = getTaskStats(tasks);
      expect(stats.total).toBe(2);
      expect(stats.pending).toBe(1);
      // Invalid status doesn't count toward any category
    });

    it('should not mutate original array', () => {
      const tasks = [createMockTask({ status: 'pending' })];
      const originalLength = tasks.length;
      
      getTaskStats(tasks);
      
      expect(tasks.length).toBe(originalLength);
    });
  });

  // ============================================================================
  // validateTaskData - Extended
  // ============================================================================

  describe('validateTaskData - Edge Cases', () => {
    it('should return valid for complete valid data', () => {
      const result = validateTaskData({
        title: 'Valid Task',
        description: 'Valid Description',
        type: 'development',
        priority: 'high'
      });
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return invalid for whitespace-only title', () => {
      const result = validateTaskData({
        title: '   ',
        description: 'Test',
        type: 'development',
        priority: 'high'
      });
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Title is required');
    });

    it('should return invalid for whitespace-only description', () => {
      const result = validateTaskData({
        title: 'Test',
        description: '   ',
        type: 'development',
        priority: 'high'
      });
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Description is required');
    });

    it('should return multiple errors for multiple issues', () => {
      const result = validateTaskData({
        title: '',
        description: '',
        type: undefined,
        priority: undefined
      });
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(4);
    });

    it('should return invalid for null title', () => {
      const result = validateTaskData({
        title: null as any,
        description: 'Test',
        type: 'development',
        priority: 'high'
      });
      
      expect(result.isValid).toBe(false);
    });

    it('should return invalid for null description', () => {
      const result = validateTaskData({
        title: 'Test',
        description: null as any,
        type: 'development',
        priority: 'high'
      });
      
      expect(result.isValid).toBe(false);
    });

    it('should return invalid for undefined type', () => {
      const result = validateTaskData({
        title: 'Test',
        description: 'Test',
        type: undefined,
        priority: 'high'
      });
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Task type is required');
    });

    it('should return invalid for undefined priority', () => {
      const result = validateTaskData({
        title: 'Test',
        description: 'Test',
        type: 'development',
        priority: undefined
      });
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Priority is required');
    });

    it('should handle empty object', () => {
      const result = validateTaskData({});
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(4);
    });

    it('should handle null input gracefully', () => {
      expect(() => {
        const result = validateTaskData(null as any);
        expect(result.isValid).toBe(false);
      }).not.toThrow();
    });

    it('should handle undefined input gracefully', () => {
      expect(() => {
        const result = validateTaskData(undefined);
        expect(result.isValid).toBe(false);
      }).not.toThrow();
    });

    it('should handle all valid task types', () => {
      const types: TaskType[] = ['development', 'design', 'research', 'marketing', 'other'];
      
      types.forEach(type => {
        const result = validateTaskData({
          title: 'Test',
          description: 'Test',
          type,
          priority: 'medium'
        });
        
        expect(result.errors).not.toContain('Task type is required');
      });
    });

    it('should handle all valid priorities', () => {
      const priorities: TaskPriority[] = ['low', 'medium', 'high', 'urgent'];
      
      priorities.forEach(priority => {
        const result = validateTaskData({
          title: 'Test',
          description: 'Test',
          type: 'development',
          priority
        });
        
        expect(result.errors).not.toContain('Priority is required');
      });
    });

    it('should handle very long title', () => {
      const longTitle = 'A'.repeat(200);
      const result = validateTaskData({
        title: longTitle,
        description: 'Test',
        type: 'development',
        priority: 'high'
      });
      
      // Should still be valid as it's exactly 200 chars
      expect(result.isValid).toBe(true);
    });

    it('should handle unicode in title', () => {
      const result = validateTaskData({
        title: '测试任务 🚀 你好',
        description: 'Description',
        type: 'development',
        priority: 'high'
      });
      
      expect(result.isValid).toBe(true);
    });
  });
});
