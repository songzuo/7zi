/**
 * @fileoverview Tests for TaskPriorityAnalyzer
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  TaskPriorityAnalyzer,
  createPriorityAnalyzer,
  analyzeTaskPriority,
  analyzeTasksPriority,
  DEFAULT_RULES,
  type TaskData,
  type PrioritySuggestion,
} from '../agent/TaskPriorityAnalyzer';

describe('TaskPriorityAnalyzer', () => {
  let analyzer: TaskPriorityAnalyzer;

  beforeEach(() => {
    analyzer = createPriorityAnalyzer();
  });

  describe('Constructor', () => {
    it('should create analyzer with default config', () => {
      expect(analyzer).toBeInstanceOf(TaskPriorityAnalyzer);
    });

    it('should create analyzer with custom config', () => {
      const customAnalyzer = new TaskPriorityAnalyzer({
        urgentHoursThreshold: 12,
        highLoadThreshold: 10,
      });
      expect(customAnalyzer).toBeInstanceOf(TaskPriorityAnalyzer);
    });
  });

  describe('analyzePriority - Deadline Rules', () => {
    it('should mark task as urgent if deadline < 24 hours', () => {
      const now = new Date('2026-03-21T12:00:00Z');
      const task: TaskData = {
        id: 'task-1',
        title: 'Critical bug',
        type: 'BUG',
        deadline: '2026-03-22T10:00:00Z', // 22 hours later
      };

      const result = analyzer.analyzePriority(task, now);

      expect(result.priority).toBe('urgent');
      expect(result.score).toBeGreaterThanOrEqual(9);
      expect(result.reasoning.some(r => r.includes('22 hours'))).toBe(true);
    });

    it('should mark task as urgent if deadline < 3 days with FEATURE type bonus', () => {
      const now = new Date('2026-03-21T12:00:00Z');
      const task: TaskData = {
        id: 'task-2',
        title: 'Feature implementation',
        type: 'FEATURE',
        deadline: '2026-03-23T12:00:00Z', // 48 hours later
      };

      const result = analyzer.analyzePriority(task, now);

      // Base: 7 (high) + 1 (FEATURE) = 8 → urgent
      expect(result.priority).toBe('urgent');
      expect(result.score).toBeGreaterThanOrEqual(8);
    });

    it('should mark task as medium priority if deadline < 7 days', () => {
      const now = new Date('2026-03-21T12:00:00Z');
      const task: TaskData = {
        id: 'task-3',
        title: 'Documentation update',
        type: 'DOCS',
        deadline: '2026-03-26T12:00:00Z', // 5 days later
      };

      const result = analyzer.analyzePriority(task, now);

      expect(result.priority).toBe('medium');
      expect(result.score).toBeGreaterThanOrEqual(4);
    });

    it('should mark task as low priority if deadline > 7 days', () => {
      const now = new Date('2026-03-21T12:00:00Z');
      const task: TaskData = {
        id: 'task-4',
        title: 'Future feature',
        type: 'FEATURE',
        deadline: '2026-04-01T12:00:00Z', // 11 days later
      };

      const result = analyzer.analyzePriority(task, now);

      expect(result.priority).toBe('low');
      expect(result.score).toBeLessThan(4);
    });

    it('should give maximum score for overdue tasks', () => {
      const now = new Date('2026-03-21T12:00:00Z');
      const task: TaskData = {
        id: 'task-5',
        title: 'Overdue task',
        type: 'BUG',
        deadline: '2026-03-20T12:00:00Z', // 1 day ago
      };

      const result = analyzer.analyzePriority(task, now);

      expect(result.priority).toBe('urgent');
      expect(result.score).toBe(10);
      expect(result.reasoning.some(r => r.includes('overdue'))).toBe(true);
    });

    it('should handle missing deadline with neutral score', () => {
      const task: TaskData = {
        id: 'task-6',
        title: 'Task without deadline',
        type: 'FEATURE',
      };

      const result = analyzer.analyzePriority(task);

      expect(result.reasoning.some(r => r.includes('No deadline specified'))).toBe(true);
    });

    it('should handle invalid deadline format', () => {
      const task: TaskData = {
        id: 'task-7',
        title: 'Task with invalid deadline',
        type: 'BUG',
        deadline: 'invalid-date',
      };

      const result = analyzer.analyzePriority(task);

      expect(result.reasoning.some(r => r.includes('Invalid deadline format'))).toBe(true);
    });
  });

  describe('analyzePriority - Task Type Rules', () => {
    it('should add +2 bonus for BUG type', () => {
      const now = new Date('2026-03-21T12:00:00Z');
      const task: TaskData = {
        id: 'task-8',
        title: 'Bug fix',
        type: 'BUG',
        deadline: '2026-03-25T12:00:00Z', // 4 days
      };

      const result = analyzer.analyzePriority(task, now);

      expect(result.reasoning.some(r => r.includes('BUG type'))).toBe(true);
      expect(result.reasoning.some(r => r.includes('+2'))).toBe(true);
    });

    it('should add +1 bonus for FEATURE type', () => {
      const now = new Date('2026-03-21T12:00:00Z');
      const task: TaskData = {
        id: 'task-9',
        title: 'New feature',
        type: 'FEATURE',
        deadline: '2026-03-25T12:00:00Z',
      };

      const result = analyzer.analyzePriority(task, now);

      expect(result.reasoning.some(r => r.includes('FEATURE type'))).toBe(true);
      expect(result.reasoning.some(r => r.includes('+1'))).toBe(true);
    });

    it('should add 0 bonus for REFACTOR type', () => {
      const task: TaskData = {
        id: 'task-10',
        title: 'Code refactor',
        type: 'REFACTOR',
        deadline: '2026-03-28T12:00:00Z',
      };

      const result = analyzer.analyzePriority(task);

      expect(result.reasoning.some(r => r.includes('REFACTOR type'))).toBe(true);
      expect(result.reasoning.some(r => r.includes('neutral priority'))).toBe(true);
    });

    it('should add -1 penalty for DOCS type', () => {
      const task: TaskData = {
        id: 'task-11',
        title: 'Documentation',
        type: 'DOCS',
        deadline: '2026-03-28T12:00:00Z',
      };

      const result = analyzer.analyzePriority(task);

      expect(result.reasoning.some(r => r.includes('DOCS type'))).toBe(true);
      expect(result.reasoning.some(r => r.includes('-1'))).toBe(true);
    });

    it('should add 0 bonus for TEST type', () => {
      const task: TaskData = {
        id: 'task-12',
        title: 'Test suite',
        type: 'TEST',
        deadline: '2026-03-28T12:00:00Z',
      };

      const result = analyzer.analyzePriority(task);

      expect(result.reasoning.some(r => r.includes('TEST type'))).toBe(true);
      expect(result.reasoning.some(r => r.includes('neutral priority'))).toBe(true);
    });

    it('should handle OTHER type with neutral priority', () => {
      const task: TaskData = {
        id: 'task-13',
        title: 'Miscellaneous task',
        type: 'OTHER',
        deadline: '2026-03-28T12:00:00Z',
      };

      const result = analyzer.analyzePriority(task);

      expect(result.reasoning.some(r => r.includes('OTHER type'))).toBe(true);
    });
  });

  describe('analyzePriority - Assignee Load Rules', () => {
    it('should add priority bonus for assignee with >5 in-progress tasks', () => {
      const now = new Date('2026-03-21T12:00:00Z');
      const task: TaskData = {
        id: 'task-14',
        title: 'High load task',
        type: 'FEATURE',
        deadline: '2026-03-26T12:00:00Z',
        assigneeId: 'user-1',
        assigneeInProgressCount: 6, // > 5
      };

      const result = analyzer.analyzePriority(task, now);

      expect(result.reasoning.some(r => r.includes('6 in-progress tasks'))).toBe(true);
      expect(result.reasoning.some(r => r.includes('priority increased'))).toBe(true);
    });

    it('should not add bonus for assignee with <=5 in-progress tasks', () => {
      const now = new Date('2026-03-21T12:00:00Z');
      const task: TaskData = {
        id: 'task-15',
        title: 'Normal load task',
        type: 'FEATURE',
        deadline: '2026-03-26T12:00:00Z',
        assigneeId: 'user-2',
        assigneeInProgressCount: 3, // <= 5
      };

      const result = analyzer.analyzePriority(task, now);

      expect(result.reasoning.some(r => r.includes('3 in-progress tasks'))).toBe(true);
      expect(result.reasoning.some(r => r.includes('normal load'))).toBe(true);
    });

    it('should handle missing assignee load information', () => {
      const task: TaskData = {
        id: 'task-16',
        title: 'Task without load info',
        type: 'FEATURE',
        deadline: '2026-03-28T12:00:00Z',
        assigneeId: 'user-3',
      };

      const result = analyzer.analyzePriority(task);

      expect(result.reasoning.some(r => r.includes('Assignee workload unknown'))).toBe(true);
    });
  });

  describe('analyzePriority - Combined Rules', () => {
    it('should combine deadline + type + load for urgent BUG with high load', () => {
      const now = new Date('2026-03-21T12:00:00Z');
      const task: TaskData = {
        id: 'task-17',
        title: 'Critical bug',
        type: 'BUG',
        deadline: '2026-03-22T10:00:00Z', // 22 hours
        assigneeId: 'user-1',
        assigneeInProgressCount: 8, // High load
      };

      const result = analyzer.analyzePriority(task, now);

      // Deadline: 9 + Type: 2 + Load: 1 = 12, clamped to 10
      expect(result.priority).toBe('urgent');
      expect(result.score).toBe(10);
      expect(result.reasoning).toHaveLength(3); // One from each rule
    });

    it('should elevate medium priority to high with BUG type bonus', () => {
      const now = new Date('2026-03-21T12:00:00Z');
      const task: TaskData = {
        id: 'task-18',
        title: 'Bug with medium deadline',
        type: 'BUG',
        deadline: '2026-03-26T12:00:00Z', // 5 days (medium)
      };

      const result = analyzer.analyzePriority(task, now);

      // Base: 5 + Type: 2 = 7 → high
      expect(result.priority).toBe('high');
      expect(result.score).toBeGreaterThanOrEqual(6);
    });

    it('should lower priority for DOCS task with long deadline', () => {
      const now = new Date('2026-03-21T12:00:00Z');
      const task: TaskData = {
        id: 'task-19',
        title: 'Documentation',
        type: 'DOCS',
        deadline: '2026-04-10T12:00:00Z', // 20 days
      };

      const result = analyzer.analyzePriority(task, now);

      // Base: 2 + Type: -1 = 1 → low
      expect(result.priority).toBe('low');
      expect(result.score).toBeLessThan(4);
    });
  });

  describe('analyzePriority - Score Clamping', () => {
    it('should clamp maximum score to 10', () => {
      const now = new Date('2026-03-21T12:00:00Z');
      const task: TaskData = {
        id: 'task-20',
        title: 'Overdue bug',
        type: 'BUG',
        deadline: '2026-03-20T12:00:00Z', // Overdue: 10
        assigneeId: 'user-1',
        assigneeInProgressCount: 10, // Load: +1
      };

      const result = analyzer.analyzePriority(task, now);

      // 10 + 2 (BUG) + 1 (load) = 13, clamped to 10
      expect(result.score).toBe(10);
    });

    it('should clamp minimum score to 0', () => {
      const task: TaskData = {
        id: 'task-21',
        title: 'Documentation with invalid deadline',
        type: 'DOCS',
        deadline: 'invalid', // Invalid: 5 (neutral)
      };

      const result = analyzer.analyzePriority(task);

      // 5 (neutral) + -1 (DOCS) = 4
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(10);
    });
  });

  describe('analyzePriority - Priority Level Mapping', () => {
    it('should map score >= 8 to urgent', () => {
      const now = new Date('2026-03-21T12:00:00Z');
      const task: TaskData = {
        id: 'task-22',
        title: 'Urgent task',
        type: 'BUG',
        deadline: '2026-03-22T12:00:00Z', // < 24h
      };

      const result = analyzer.analyzePriority(task, now);
      expect(result.priority).toBe('urgent');
    });

    it('should map score 6-7 to high', () => {
      const now = new Date('2026-03-21T12:00:00Z');
      const task: TaskData = {
        id: 'task-23',
        title: 'High priority task',
        type: 'FEATURE',
        deadline: '2026-03-24T12:00:00Z', // < 3d, +1 type
      };

      const result = analyzer.analyzePriority(task, now);
      expect(result.priority).toBe('high');
    });

    it('should map score 4-5 to medium with TEST type', () => {
      const now = new Date('2026-03-21T12:00:00Z');
      const task: TaskData = {
        id: 'task-24',
        title: 'Medium priority task',
        type: 'TEST',
        deadline: '2026-03-26T12:00:00Z', // < 7d, 0 type bonus
      };

      const result = analyzer.analyzePriority(task, now);
      expect(result.priority).toBe('medium');
    });

    it('should map score < 4 to low', () => {
      const now = new Date('2026-03-21T12:00:00Z');
      const task: TaskData = {
        id: 'task-25',
        title: 'Low priority task',
        type: 'DOCS',
        deadline: '2026-04-01T12:00:00Z', // > 7d, -1 type
      };

      const result = analyzer.analyzePriority(task, now);
      expect(result.priority).toBe('low');
    });
  });

  describe('analyzePriorities - Batch Analysis', () => {
    it('should analyze multiple tasks and return results with task IDs', () => {
      const now = new Date('2026-03-21T12:00:00Z');
      const tasks: TaskData[] = [
        {
          id: 'task-26',
          title: 'Bug',
          type: 'BUG',
          deadline: '2026-03-22T12:00:00Z',
        },
        {
          id: 'task-27',
          title: 'Feature',
          type: 'FEATURE',
          deadline: '2026-03-26T12:00:00Z',
        },
        {
          id: 'task-28',
          title: 'Docs',
          type: 'DOCS',
          deadline: '2026-04-05T12:00:00Z',
        },
      ];

      const results = analyzer.analyzePriorities(tasks, now);

      expect(results).toHaveLength(3);
      expect(results[0]).toMatchObject({
        taskId: 'task-26',
        priority: 'urgent',
      });
      expect(results[1]).toMatchObject({
        taskId: 'task-27',
      });
      expect(results[2]).toMatchObject({
        taskId: 'task-28',
      });
    });

    it('should handle empty task array', () => {
      const results = analyzer.analyzePriorities([]);
      expect(results).toEqual([]);
    });

    it('should use same reference date for all tasks', () => {
      const referenceDate = new Date('2026-03-21T12:00:00Z');
      const tasks: TaskData[] = [
        {
          id: 'task-29',
          title: 'Task 1',
          type: 'FEATURE',
          deadline: '2026-03-22T12:00:00Z',
        },
        {
          id: 'task-30',
          title: 'Task 2',
          type: 'FEATURE',
          deadline: '2026-03-23T12:00:00Z',
        },
      ];

      const results = analyzer.analyzePriorities(tasks, referenceDate);

      expect(results).toHaveLength(2);
    });
  });
});

describe('Utility Functions', () => {
  describe('createPriorityAnalyzer', () => {
    it('should create analyzer with default config', () => {
      const analyzer = createPriorityAnalyzer();
      expect(analyzer).toBeInstanceOf(TaskPriorityAnalyzer);
    });
  });

  describe('analyzeTaskPriority', () => {
    it('should analyze single task with default config', () => {
      const now = new Date('2026-03-21T12:00:00Z');
      const task: TaskData = {
        id: 'task-31',
        title: 'Test task',
        type: 'BUG',
        deadline: '2026-03-22T10:00:00Z',
      };

      const result = analyzeTaskPriority(task, now);

      expect(result).toHaveProperty('priority');
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('reasoning');
      expect(result.reasoning).toBeInstanceOf(Array);
    });
  });

  describe('analyzeTasksPriority', () => {
    it('should analyze multiple tasks with default config', () => {
      const tasks: TaskData[] = [
        {
          id: 'task-32',
          title: 'Task 1',
          type: 'BUG',
          deadline: '2026-03-22T12:00:00Z',
        },
        {
          id: 'task-33',
          title: 'Task 2',
          type: 'FEATURE',
          deadline: '2026-03-26T12:00:00Z',
        },
      ];

      const results = analyzeTasksPriority(tasks);

      expect(results).toHaveLength(2);
      expect(results[0]).toHaveProperty('taskId', 'task-32');
      expect(results[1]).toHaveProperty('taskId', 'task-33');
    });
  });
});

describe('DEFAULT_RULES', () => {
  it('should have correct default values', () => {
    expect(DEFAULT_RULES.urgentHoursThreshold).toBe(24);
    expect(DEFAULT_RULES.highHoursThreshold).toBe(72);
    expect(DEFAULT_RULES.mediumHoursThreshold).toBe(168);
    expect(DEFAULT_RULES.highLoadThreshold).toBe(5);
    expect(DEFAULT_RULES.highLoadBonus).toBe(1);
  });
});
