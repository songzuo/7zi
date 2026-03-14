/**
 * 任务工具函数单元测试
 */

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
  Task,
  TaskType,
  TaskPriority,
  TaskStatus,
} from '@/lib/utils/task-utils';

describe('任务工具函数', () => {
  // 测试数据
  const mockTasks: Task[] = [
    {
      id: '1',
      title: '任务1',
      description: '描述1',
      status: 'pending',
      priority: 'high',
      type: 'development',
      assignee: 'user1',
      dueDate: '2026-03-20',
      createdAt: '2026-03-01',
    },
    {
      id: '2',
      title: '任务2',
      description: '描述2',
      status: 'in_progress',
      priority: 'medium',
      type: 'design',
      assignee: 'user2',
      dueDate: '2026-03-25',
      createdAt: '2026-03-02',
    },
    {
      id: '3',
      title: '任务3',
      description: '描述3',
      status: 'completed',
      priority: 'low',
      type: 'research',
      assignee: 'user1',
      dueDate: '2026-03-15',
      createdAt: '2026-03-03',
    },
  ];

  describe('getRoleForTaskType', () => {
    it('应该为开发任务返回Executor角色', () => {
      const role = getRoleForTaskType('development');
      expect(role).toBe('executor');
    });

    it('应该为设计任务返回Designer角色', () => {
      const role = getRoleForTaskType('design');
      expect(role).toBe('designer');
    });

    it('应该为研究任务返回Consultant角色', () => {
      const role = getRoleForTaskType('research');
      expect(role).toBe('consultant');
    });

    it('应该为营销任务返回Promoter角色', () => {
      const role = getRoleForTaskType('marketing');
      expect(role).toBe('promoter');
    });

    it('应该为其他任务返回General角色', () => {
      const role = getRoleForTaskType('other');
      expect(role).toBe('general');
    });
  });

  describe('getPriorityLevel', () => {
    it('应该返回urgent优先级为4', () => {
      expect(getPriorityLevel('urgent')).toBe(4);
    });

    it('应该返回high优先级为3', () => {
      expect(getPriorityLevel('high')).toBe(3);
    });

    it('应该返回medium优先级为2', () => {
      expect(getPriorityLevel('medium')).toBe(2);
    });

    it('应该返回low优先级为1', () => {
      expect(getPriorityLevel('low')).toBe(1);
    });

    it('未知优先级应该返回0', () => {
      expect(getPriorityLevel('unknown' as any)).toBe(0);
    });
  });

  describe('getStatusOrder', () => {
    it('应该返回pending为1', () => {
      expect(getStatusOrder('pending')).toBe(1);
    });

    it('应该返回assigned为2', () => {
      expect(getStatusOrder('assigned')).toBe(2);
    });

    it('应该返回in_progress为3', () => {
      expect(getStatusOrder('in_progress')).toBe(3);
    });

    it('应该返回completed为4', () => {
      expect(getStatusOrder('completed')).toBe(4);
    });

    it('未知状态应该返回0', () => {
      expect(getStatusOrder('unknown' as any)).toBe(0);
    });
  });

  describe('sortTasks', () => {
    it('应该按状态排序（pending在前）', () => {
      const sorted = sortTasks([...mockTasks]);
      expect(sorted[0].status).toBe('pending');
    });

    it('应该保持返回新数组', () => {
      const original = [...mockTasks];
      const sorted = sortTasks(mockTasks);
      expect(sorted).not.toBe(original);
    });

    it('应该处理空数组', () => {
      const sorted = sortTasks([]);
      expect(sorted).toEqual([]);
    });
  });

  describe('filterTasksByType', () => {
    it('应该过滤指定类型的任务', () => {
      const filtered = filterTasksByType(mockTasks, 'development');
      expect(filtered.length).toBe(1);
      expect(filtered[0].type).toBe('development');
    });

    it('应该返回所有任务当类型为all', () => {
      const filtered = filterTasksByType(mockTasks, 'all');
      expect(filtered.length).toBe(3);
    });

    it('应该处理空数组', () => {
      const filtered = filterTasksByType([], 'development');
      expect(filtered).toEqual([]);
    });
  });

  describe('filterTasksByStatus', () => {
    it('应该过滤指定状态的任务', () => {
      const filtered = filterTasksByStatus(mockTasks, 'pending');
      expect(filtered.length).toBe(1);
      expect(filtered[0].status).toBe('pending');
    });

    it('应该返回所有任务当状态为all', () => {
      const filtered = filterTasksByStatus(mockTasks, 'all');
      expect(filtered.length).toBe(3);
    });

    it('应该处理空数组', () => {
      const filtered = filterTasksByStatus([], 'pending');
      expect(filtered).toEqual([]);
    });
  });

  describe('getTaskStats', () => {
    it('应该返回正确的统计数据', () => {
      const stats = getTaskStats(mockTasks);
      
      expect(stats.total).toBe(3);
      expect(stats.pending).toBe(1);
      expect(stats.inProgress).toBe(1);
      expect(stats.completed).toBe(1);
    });

    it('应该计算完成率', () => {
      const stats = getTaskStats(mockTasks);
      expect(stats.completionRate).toBe(33);
    });

    it('应该处理空数组', () => {
      const stats = getTaskStats([]);
      
      expect(stats.total).toBe(0);
      expect(stats.completionRate).toBe(0);
    });
  });

  describe('validateTaskData', () => {
    it('应该验证有效的任务数据', () => {
      const result = validateTaskData({
        title: 'Test Task',
        description: 'Description',
        type: 'development',
        priority: 'high'
      });
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('应该检测空标题', () => {
      const result = validateTaskData({
        title: '',
        description: 'Description',
        type: 'development',
        priority: 'high'
      });
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Title is required');
    });

    it('应该检测空描述', () => {
      const result = validateTaskData({
        title: 'Test Task',
        description: '',
        type: 'development',
        priority: 'high'
      });
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Description is required');
    });

    it('应该检测缺失的类型', () => {
      const result = validateTaskData({
        title: 'Test Task',
        description: 'Description',
        priority: 'high'
      });
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Task type is required');
    });

    it('应该检测缺失的优先级', () => {
      const result = validateTaskData({
        title: 'Test Task',
        description: 'Description',
        type: 'development'
      });
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Priority is required');
    });

    it('应该支持只传递部分字段', () => {
      const result = validateTaskData({
        title: 'Test Task',
        description: 'Description'
      });
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});
