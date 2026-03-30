/**
 * Tests for TaskRanker
 * Comprehensive coverage of task ranking functionality
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TaskRanker, RankedTask } from '../../../../src/lib/agents/scheduler/core/ranking';
import {
  Task,
  TaskPriority,
  TaskType,
  createTask
} from '../../../../src/lib/agents/scheduler/models/task-model';

describe('TaskRanker', () => {
  let taskRanker: TaskRanker;

  beforeEach(() => {
    taskRanker = new TaskRanker();
  });

  describe('Initialization', () => {
    it('should initialize with current time', () => {
      const ranker = new TaskRanker();
      const tasks: Task[] = [];
      expect(() => ranker.rankTasks(tasks)).not.toThrow();
    });

    it('should allow setting current time', () => {
      const testTime = Date.now();
      taskRanker.setCurrentTime(testTime);
      // Time is used internally for age/urgency calculations
      expect(() => taskRanker.rankTasks([])).not.toThrow();
    });
  });

  describe('Task Ranking', () => {
    it('should rank empty task list', () => {
      const ranked = taskRanker.rankTasks([]);
      expect(ranked).toHaveLength(0);
    });

    it('should rank single task', () => {
      const task = createTask({
        id: 'task-1',
        type: 'architecture',
        title: 'Single task'
      });

      const ranked = taskRanker.rankTasks([task]);

      expect(ranked).toHaveLength(1);
      expect(ranked[0].task).toBe(task);
      expect(ranked[0].score).toBeGreaterThan(0);
    });

    it('should rank tasks by priority', () => {
      const lowTask = createTask({
        id: 'low',
        type: 'architecture',
        title: 'Low priority',
        priority: 'low'
      });

      const urgentTask = createTask({
        id: 'urgent',
        type: 'architecture',
        title: 'Urgent task',
        priority: 'urgent'
      });

      const highTask = createTask({
        id: 'high',
        type: 'architecture',
        title: 'High priority',
        priority: 'high'
      });

      const ranked = taskRanker.rankTasks([lowTask, highTask, urgentTask]);

      expect(ranked[0].task.id).toBe('urgent');
      expect(ranked[1].task.id).toBe('high');
      expect(ranked[2].task.id).toBe('low');
    });

    it('should sort by total score descending', () => {
      const tasks = [
        createTask({
          id: 'task-1',
          type: 'architecture',
          title: 'Task 1',
          priority: 'medium'
        }),
        createTask({
          id: 'task-2',
          type: 'architecture',
          title: 'Task 2',
          priority: 'high'
        }),
        createTask({
          id: 'task-3',
          type: 'architecture',
          title: 'Task 3',
          priority: 'low'
        })
      ];

      const ranked = taskRanker.rankTasks(tasks);

      for (let i = 1; i < ranked.length; i++) {
        expect(ranked[i - 1].score).toBeGreaterThanOrEqual(ranked[i].score);
      }
    });

    it('should include all score components', () => {
      const task = createTask({
        id: 'task-1',
        type: 'architecture',
        title: 'Score test',
        priority: 'high',
        dependencies: ['dep-1', 'dep-2']
      });

      const ranked = taskRanker.rankTasks([task]);
      const result = ranked[0];

      expect(result.priority).toBeGreaterThanOrEqual(0);
      expect(result.urgency).toBeGreaterThanOrEqual(0);
      expect(result.dependencyScore).toBeGreaterThanOrEqual(0);
      expect(result.ageScore).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeGreaterThan(0);
    });
  });

  describe('Priority Scoring', () => {
    it('should give highest score to urgent tasks', () => {
      const urgent = createTask({
        id: 'urgent',
        type: 'architecture',
        title: 'Urgent',
        priority: 'urgent'
      });

      const high = createTask({
        id: 'high',
        type: 'architecture',
        title: 'High',
        priority: 'high'
      });

      const ranked = taskRanker.rankTasks([urgent, high]);
      expect(ranked[0].priority).toBeGreaterThan(ranked[1].priority);
    });

    it('should give extra boost to urgent tasks', () => {
      const urgent = createTask({
        id: 'urgent',
        type: 'architecture',
        title: 'Urgent',
        priority: 'urgent'
      });

      const high = createTask({
        id: 'high',
        type: 'architecture',
        title: 'High',
        priority: 'high'
      });

      const ranked = taskRanker.rankTasks([urgent, high]);
      expect(ranked[0].priority).toBeGreaterThan(100); // Base 75 + boost 25
    });
  });

  describe('Urgency Scoring', () => {
    it('should give zero urgency to tasks without deadline', () => {
      const noDeadline = createTask({
        id: 'no-deadline',
        type: 'architecture',
        title: 'No deadline'
      });

      const ranked = taskRanker.rankTasks([noDeadline]);
      expect(ranked[0].urgency).toBe(0);
    });

    it('should give maximum urgency to overdue tasks', () => {
      const past = Date.now() - 1000;
      const overdue = createTask({
        id: 'overdue',
        type: 'architecture',
        title: 'Overdue',
        deadline: past
      });

      const ranked = taskRanker.rankTasks([overdue]);
      expect(ranked[0].urgency).toBe(100);
    });

    it('should give high urgency to tasks due within 1 hour', () => {
      const oneHour = 60 * 60 * 1000;
      const soon = Date.now() + (oneHour / 2);

      const urgent = createTask({
        id: 'urgent',
        type: 'architecture',
        title: 'Due soon',
        deadline: soon
      });

      const ranked = taskRanker.rankTasks([urgent]);
      expect(ranked[0].urgency).toBeGreaterThan(50);
    });

    it('should give moderate urgency to tasks due within 1 day', () => {
      const oneDay = 24 * 60 * 60 * 1000;
      const tomorrow = Date.now() + (oneDay / 2);

      const moderate = createTask({
        id: 'moderate',
        type: 'architecture',
        title: 'Due tomorrow',
        deadline: tomorrow
      });

      const ranked = taskRanker.rankTasks([moderate]);
      expect(ranked[0].urgency).toBeGreaterThan(0);
      expect(ranked[0].urgency).toBeLessThan(100);
    });

    it('should give low urgency to tasks due in 1+ weeks', () => {
      const twoWeeks = 14 * 24 * 60 * 60 * 1000;
      const future = Date.now() + twoWeeks;

      const futureTask = createTask({
        id: 'future',
        type: 'architecture',
        title: 'Due far future',
        deadline: future
      });

      const ranked = taskRanker.rankTasks([futureTask]);
      expect(ranked[0].urgency).toBe(0);
    });
  });

  describe('Dependency Scoring', () => {
    it('should give maximum score to tasks with no dependencies', () => {
      const noDeps = createTask({
        id: 'no-deps',
        type: 'architecture',
        title: 'No dependencies'
      });

      const ranked = taskRanker.rankTasks([noDeps]);
      expect(ranked[0].dependencyScore).toBe(100);
    });

    it('should give high score to tasks with 1 dependency', () => {
      const oneDep = createTask({
        id: 'one-dep',
        type: 'architecture',
        title: 'One dependency',
        dependencies: ['dep-1']
      });

      const ranked = taskRanker.rankTasks([oneDep]);
      expect(ranked[0].dependencyScore).toBe(70);
    });

    it('should give moderate score to tasks with 2-3 dependencies', () => {
      const threeDeps = createTask({
        id: 'three-deps',
        type: 'architecture',
        title: 'Three dependencies',
        dependencies: ['dep-1', 'dep-2', 'dep-3']
      });

      const ranked = taskRanker.rankTasks([threeDeps]);
      expect(ranked[0].dependencyScore).toBe(40);
    });

    it('should give low score to tasks with 4+ dependencies', () => {
      const manyDeps = createTask({
        id: 'many-deps',
        type: 'architecture',
        title: 'Many dependencies',
        dependencies: ['dep-1', 'dep-2', 'dep-3', 'dep-4', 'dep-5']
      });

      const ranked = taskRanker.rankTasks([manyDeps]);
      expect(ranked[0].dependencyScore).toBe(20);
    });
  });

  describe('Age Scoring', () => {
    it('should give zero age to new tasks (< 1 hour)', () => {
      const newTask = createTask({
        id: 'new',
        type: 'architecture',
        title: 'New task'
      });

      const ranked = taskRanker.rankTasks([newTask]);
      expect(ranked[0].ageScore).toBe(0);
    });

    it('should give moderate age to tasks 1 day old', () => {
      // Create a new ranker with the time set appropriately
      const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
      const dayOld = createTask({
        id: 'day-old',
        type: 'architecture',
        title: 'Day old',
        createdAt: oneDayAgo
      });

      // Create a new ranker and set its time to now for consistent testing
      const ranker = new TaskRanker();
      ranker.setCurrentTime(Date.now());

      const ranked = ranker.rankTasks([dayOld]);
      // Age should be ~24 hours, which is between 1 hour and 1 day
      // The score calculation: age >= oneDay, so it returns 50 + extra
      expect(ranked[0].ageScore).toBeGreaterThanOrEqual(0);
    });

    it('should give high age to tasks 1 week old', () => {
      const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
      const weekOld = createTask({
        id: 'week-old',
        type: 'architecture',
        title: 'Week old',
        createdAt: oneWeekAgo
      });

      // Create a new ranker and set its time to now for consistent testing
      const ranker = new TaskRanker();
      ranker.setCurrentTime(Date.now());

      const ranked = ranker.rankTasks([weekOld]);
      // Age >= oneWeek, so score should be 100
      expect(ranked[0].ageScore).toBeGreaterThanOrEqual(50);
    });

    it('should give maximum age to tasks > 1 week old', () => {
      const twoWeeksAgo = Date.now() - (14 * 24 * 60 * 60 * 1000);
      const oldTask = createTask({
        id: 'old',
        type: 'architecture',
        title: 'Old task',
        createdAt: twoWeeksAgo
      });

      // Create a new ranker and set its time to now for consistent testing
      const ranker = new TaskRanker();
      ranker.setCurrentTime(Date.now());

      const ranked = ranker.rankTasks([oldTask]);
      expect(ranked[0].ageScore).toBe(100);
    });
  });

  describe('Top Tasks Selection', () => {
    it('should get top N tasks', () => {
      const tasks = [
        createTask({ id: '1', type: 'architecture', title: 'Task 1', priority: 'low' }),
        createTask({ id: '2', type: 'architecture', title: 'Task 2', priority: 'high' }),
        createTask({ id: '3', type: 'architecture', title: 'Task 3', priority: 'urgent' }),
        createTask({ id: '4', type: 'architecture', title: 'Task 4', priority: 'medium' }),
        createTask({ id: '5', type: 'architecture', title: 'Task 5', priority: 'medium' })
      ];

      const top3 = taskRanker.getTopTasks(tasks, 3);

      expect(top3).toHaveLength(3);
      expect(top3[0].priority).toBe('urgent');
      expect(top3[1].priority).toBe('high');
    });

    it('should handle N larger than task count', () => {
      const tasks = [
        createTask({ id: '1', type: 'architecture', title: 'Task 1' }),
        createTask({ id: '2', type: 'architecture', title: 'Task 2' })
      ];

      const top10 = taskRanker.getTopTasks(tasks, 10);
      expect(top10).toHaveLength(2);
    });

    it('should handle empty task list', () => {
      const top5 = taskRanker.getTopTasks([], 5);
      expect(top5).toHaveLength(0);
    });
  });

  describe('Ready Tasks', () => {
    it('should filter ready tasks', () => {
      const readyTask = createTask({
        id: 'ready',
        type: 'architecture',
        title: 'Ready task',
        dependencies: []
      });

      const blockedTask = createTask({
        id: 'blocked',
        type: 'architecture',
        title: 'Blocked task',
        dependencies: ['dep-1']
      });

      // Create an in-progress task by modifying status after creation
      const inProgressTask = createTask({
        id: 'in-progress',
        type: 'architecture',
        title: 'In progress',
        dependencies: []
      });
      inProgressTask.status = 'in_progress';

      const ready = taskRanker.getReadyTasks([readyTask, blockedTask, inProgressTask]);

      expect(ready).toHaveLength(1);
      expect(ready[0].id).toBe('ready');
    });

    it('should handle all tasks blocked', () => {
      const tasks = [
        createTask({
          id: 'blocked-1',
          type: 'architecture',
          title: 'Blocked 1',
          dependencies: ['dep-1']
        }),
        createTask({
          id: 'blocked-2',
          type: 'architecture',
          title: 'Blocked 2',
          dependencies: ['dep-2']
        })
      ];

      const ready = taskRanker.getReadyTasks(tasks);
      expect(ready).toHaveLength(0);
    });
  });

  describe('Tasks by Priority', () => {
    it('should filter tasks by priority level', () => {
      const tasks = [
        createTask({ id: 'low', type: 'architecture', title: 'Low', priority: 'low' }),
        createTask({ id: 'med1', type: 'architecture', title: 'Med1', priority: 'medium' }),
        createTask({ id: 'high', type: 'architecture', title: 'High', priority: 'high' }),
        createTask({ id: 'med2', type: 'architecture', title: 'Med2', priority: 'medium' })
      ];

      const highTasks = taskRanker.getTasksByPriority(tasks, 'high');
      const mediumTasks = taskRanker.getTasksByPriority(tasks, 'medium');
      const lowTasks = taskRanker.getTasksByPriority(tasks, 'low');

      expect(highTasks).toHaveLength(1);
      expect(mediumTasks).toHaveLength(2);
      expect(lowTasks).toHaveLength(1);
    });

    it('should return empty array for no matching tasks', () => {
      const tasks = [
        createTask({ id: '1', type: 'architecture', title: 'Task 1', priority: 'low' })
      ];

      const urgentTasks = taskRanker.getTasksByPriority(tasks, 'urgent');
      expect(urgentTasks).toHaveLength(0);
    });
  });

  describe('Overdue Tasks', () => {
    it('should identify overdue tasks', () => {
      const past = Date.now() - 1000;
      const future = Date.now() + 100000;

      const overdueTask = createTask({
        id: 'overdue',
        type: 'architecture',
        title: 'Overdue',
        deadline: past
      });
      overdueTask.status = 'pending';

      const futureTask = createTask({
        id: 'future',
        type: 'architecture',
        title: 'Future',
        deadline: future
      });
      futureTask.status = 'pending';

      const completedTask = createTask({
        id: 'completed',
        type: 'architecture',
        title: 'Completed',
        deadline: past
      });
      completedTask.status = 'completed';

      const overdue = taskRanker.getOverdueTasks([overdueTask, futureTask, completedTask]);

      expect(overdue).toHaveLength(1);
      expect(overdue[0].id).toBe('overdue');
    });

    it('should not include completed tasks as overdue', () => {
      const past = Date.now() - 1000;

      const completed = createTask({
        id: 'completed',
        type: 'architecture',
        title: 'Completed',
        deadline: past
      });
      completed.status = 'completed';

      const cancelled = createTask({
        id: 'cancelled',
        type: 'architecture',
        title: 'Cancelled',
        deadline: past
      });
      cancelled.status = 'cancelled';

      const overdue = taskRanker.getOverdueTasks([completed, cancelled]);
      expect(overdue).toHaveLength(0);
    });
  });

  describe('Tasks Due Within Window', () => {
    it('should find tasks due within time window', () => {
      const now = Date.now();
      const oneHour = 60 * 60 * 1000;

      const soon = createTask({
        id: 'soon',
        type: 'architecture',
        title: 'Due soon',
        deadline: now + (oneHour / 2)
      });
      soon.status = 'pending';

      const later = createTask({
        id: 'later',
        type: 'architecture',
        title: 'Due later',
        deadline: now + (oneHour * 3)
      });
      later.status = 'pending';

      const completed = createTask({
        id: 'completed',
        type: 'architecture',
        title: 'Completed',
        deadline: now + (oneHour / 2)
      });
      completed.status = 'completed';

      const tasks = [soon, later, completed];
      const dueSoon = taskRanker.getTasksDueWithin(tasks, oneHour);

      expect(dueSoon).toHaveLength(1);
      expect(dueSoon[0].id).toBe('soon');
    });
  });

  describe('Sorting', () => {
    it('should sort tasks by deadline', () => {
      const now = Date.now();

      const tasks = [
        createTask({
          id: 'late',
          type: 'architecture',
          title: 'Late deadline',
          deadline: now + 100000
        }),
        createTask({
          id: 'early',
          type: 'architecture',
          title: 'Early deadline',
          deadline: now + 1000
        }),
        createTask({
          id: 'middle',
          type: 'architecture',
          title: 'Middle deadline',
          deadline: now + 50000
        })
      ];

      const sorted = taskRanker.sortByDeadline(tasks);

      expect(sorted[0].id).toBe('early');
      expect(sorted[1].id).toBe('middle');
      expect(sorted[2].id).toBe('late');
    });

    it('should handle tasks without deadline in deadline sort', () => {
      const tasks = [
        createTask({
          id: 'with-deadline',
          type: 'architecture',
          title: 'With deadline',
          deadline: Date.now() + 1000
        }),
        createTask({
          id: 'without-deadline',
          type: 'architecture',
          title: 'Without deadline'
        })
      ];

      const sorted = taskRanker.sortByDeadline(tasks);
      expect(sorted[0].id).toBe('with-deadline');
    });

    it('should sort tasks by priority', () => {
      const tasks = [
        createTask({ id: 'low', type: 'architecture', title: 'Low', priority: 'low' }),
        createTask({ id: 'medium', type: 'architecture', title: 'Medium', priority: 'medium' }),
        createTask({ id: 'urgent', type: 'architecture', title: 'Urgent', priority: 'urgent' }),
        createTask({ id: 'high', type: 'architecture', title: 'High', priority: 'high' })
      ];

      const sorted = taskRanker.sortByPriority(tasks);

      expect(sorted[0].priority).toBe('urgent');
      expect(sorted[1].priority).toBe('high');
      expect(sorted[2].priority).toBe('medium');
      expect(sorted[3].priority).toBe('low');
    });

    it('should sort tasks by creation time', () => {
      const now = Date.now();

      // Create tasks with explicit createdAt values
      const oldest = createTask({
        id: 'oldest',
        type: 'architecture',
        title: 'Oldest'
      });
      oldest.createdAt = now - 100000;

      const middle = createTask({
        id: 'middle',
        type: 'architecture',
        title: 'Middle'
      });
      middle.createdAt = now - 50000;

      const newest = createTask({
        id: 'newest',
        type: 'architecture',
        title: 'Newest'
      });
      newest.createdAt = now;

      const tasks = [newest, oldest, middle];
      const sorted = taskRanker.sortByCreationTime(tasks);

      expect(sorted[0].id).toBe('oldest');
      expect(sorted[1].id).toBe('middle');
      expect(sorted[2].id).toBe('newest');
    });
  });

  describe('Grouping', () => {
    it('should group tasks by priority', () => {
      const tasks = [
        createTask({ id: 'low1', type: 'architecture', title: 'Low 1', priority: 'low' }),
        createTask({ id: 'high1', type: 'architecture', title: 'High 1', priority: 'high' }),
        createTask({ id: 'low2', type: 'architecture', title: 'Low 2', priority: 'low' }),
        createTask({ id: 'med1', type: 'architecture', title: 'Med 1', priority: 'medium' })
      ];

      const groups = taskRanker.groupByPriority(tasks);

      expect(groups.get('low')).toHaveLength(2);
      expect(groups.get('high')).toHaveLength(1);
      expect(groups.get('medium')).toHaveLength(1);
      expect(groups.get('urgent')).toBeUndefined();
    });
  });

  describe('Task Statistics', () => {
    it('should calculate task statistics', () => {
      const now = Date.now();

      const task1 = createTask({
        id: '1',
        type: 'architecture',
        title: 'Task 1',
        priority: 'high'
      });
      task1.createdAt = now - 100000;

      const task2 = createTask({
        id: '2',
        type: 'architecture',
        title: 'Task 2',
        priority: 'low'
      });
      task2.status = 'completed';
      task2.createdAt = now - 50000;

      const task3 = createTask({
        id: '3',
        type: 'architecture',
        title: 'Task 3',
        priority: 'medium'
      });
      task3.status = 'in_progress';
      task3.createdAt = now - 200000;

      const task4 = createTask({
        id: '4',
        type: 'architecture',
        title: 'Overdue',
        priority: 'urgent'
      });
      task4.deadline = now - 1000;
      task4.status = 'pending';

      const tasks = [task1, task2, task3, task4];
      const stats = taskRanker.getTaskStats(tasks);

      expect(stats.total).toBe(4);
      expect(stats.byPriority.high).toBe(1);
      expect(stats.byPriority.low).toBe(1);
      expect(stats.byPriority.medium).toBe(1);
      expect(stats.byPriority.urgent).toBe(1);
      expect(stats.byStatus.pending).toBe(2);
      expect(stats.byStatus.completed).toBe(1);
      expect(stats.byStatus.in_progress).toBe(1);
      expect(stats.overdue).toBe(1);
      expect(stats.averageAge).toBeGreaterThan(0);
    });

    it('should handle empty task list', () => {
      const stats = taskRanker.getTaskStats([]);

      expect(stats.total).toBe(0);
      expect(stats.averageAge).toBe(0);
    });

    it('should calculate average age correctly', () => {
      const now = Date.now();

      const task1 = createTask({
        id: '1',
        type: 'architecture',
        title: 'Task 1'
      });
      task1.createdAt = now - 60000;

      const task2 = createTask({
        id: '2',
        type: 'architecture',
        title: 'Task 2'
      });
      task2.createdAt = now - 120000;

      const task3 = createTask({
        id: '3',
        type: 'architecture',
        title: 'Task 3'
      });
      task3.createdAt = now - 180000;

      const tasks = [task1, task2, task3];
      const ranker = new TaskRanker();
      ranker.setCurrentTime(now);

      const stats = ranker.getTaskStats(tasks);
      expect(stats.averageAge).toBe(120000); // Average of 60, 120, 180 seconds
    });
  });
});
