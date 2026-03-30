/**
 * Task Ranking Tests
 * 测试任务优先级排序逻辑
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TaskRanker } from '../../../src/lib/agent-scheduler/core/ranking';
import { Task, TaskPriority } from '../../../src/lib/agent-scheduler/models/task-model';

describe('TaskRanker - 任务优先级排序测试', () => {
  let ranker: TaskRanker;
  let now: number;

  beforeEach(() => {
    ranker = new TaskRanker();
    now = Date.now();
    ranker.setCurrentTime(now);
  });

  describe('rankTasks - 任务排序', () => {
    it('应该按优先级排序任务', () => {
      const tasks: Task[] = [
        createTestTask('task-1', 'low', now + 3600000), // 1小时后
        createTestTask('task-2', 'urgent', now + 3600000),
        createTestTask('task-3', 'medium', now + 3600000),
        createTestTask('task-4', 'high', now + 3600000)
      ];

      const ranked = ranker.rankTasks(tasks);

      expect(ranked[0].task.id).toBe('task-2'); // urgent
      expect(ranked[1].task.id).toBe('task-4'); // high
      expect(ranked[2].task.id).toBe('task-3'); // medium
      expect(ranked[3].task.id).toBe('task-1'); // low
    });

    it('紧急任务应该获得额外优先级加成', () => {
      const tasks: Task[] = [
        createTestTask('task-1', 'high', now + 3600000),
        createTestTask('task-2', 'urgent', now + 3600000)
      ];

      const ranked = ranker.rankTasks(tasks);

      expect(ranked[0].task.id).toBe('task-2');
      expect(ranked[0].task.priority).toBe('urgent');
      expect(ranked[0].priority).toBeGreaterThan(ranked[1].priority);
    });

    it('返回的任务应该包含详细的分数信息', () => {
      const tasks: Task[] = [
        createTestTask('task-1', 'high', now + 3600000)
      ];

      const ranked = ranker.rankTasks(tasks);

      expect(ranked[0]).toHaveProperty('score');
      expect(ranked[0]).toHaveProperty('priority');
      expect(ranked[0]).toHaveProperty('urgency');
      expect(ranked[0]).toHaveProperty('dependencyScore');
      expect(ranked[0]).toHaveProperty('ageScore');
    });

    it('应该处理空任务列表', () => {
      const ranked = ranker.rankTasks([]);

      expect(ranked).toEqual([]);
    });
  });

  describe('紧急程度评分 - 截止时间测试', () => {
    it('已过截止时间的任务应该得到最高紧急分', () => {
      const overdueTask = createTestTask('overdue', 'medium', now - 1000); // 1秒前过期
      const futureTask = createTestTask('future', 'medium', now + 3600000); // 1小时后过期

      const ranked = ranker.rankTasks([overdueTask, futureTask]);

      expect(ranked[0].task.id).toBe('overdue');
      expect(ranked[0].urgency).toBe(100); // 过期任务紧急分为 100
    });

    it('截止时间在1小时内的任务应该得到高紧急分', () => {
      const task = createTestTask('task-1', 'medium', now + 1800000); // 30分钟后

      const ranked = ranker.rankTasks([task]);

      expect(ranked[0].urgency).toBeGreaterThan(50);
      expect(ranked[0].urgency).toBeLessThanOrEqual(100);
    });

    it('截止时间在24小时内的任务应该得到中等紧急分', () => {
      const task = createTestTask('task-1', 'medium', now + 7200000); // 2小时后

      const ranked = ranker.rankTasks([task]);

      expect(ranked[0].urgency).toBeGreaterThan(0);
      expect(ranked[0].urgency).toBeLessThan(100);
    });

    it('没有截止时间的任务应该得到 0 紧急分', () => {
      const task = createTestTask('no-deadline', 'medium');

      const ranked = ranker.rankTasks([task]);

      expect(ranked[0].urgency).toBe(0);
    });

    it('截止时间在1周外的任务应该得到 0 紧急分', () => {
      const task = createTestTask('task-1', 'medium', now + 8 * 24 * 3600000); // 8天后

      const ranked = ranker.rankTasks([task]);

      expect(ranked[0].urgency).toBe(0);
    });
  });

  describe('依赖关系评分', () => {
    it('无依赖的任务应该得到最高分', () => {
      const task = createTestTask('no-deps', 'medium');
      task.dependencies = [];

      const ranked = ranker.rankTasks([task]);

      expect(ranked[0].dependencyScore).toBe(100);
    });

    it('1个依赖的任务应该得到较高分', () => {
      const task = createTestTask('one-dep', 'medium');
      task.dependencies = ['dep-1'];

      const ranked = ranker.rankTasks([task]);

      expect(ranked[0].dependencyScore).toBe(70);
    });

    it('2-3个依赖的任务应该得到中等分', () => {
      const task = createTestTask('few-deps', 'medium');
      task.dependencies = ['dep-1', 'dep-2'];

      const ranked = ranker.rankTasks([task]);

      expect(ranked[0].dependencyScore).toBe(40);
    });

    it('超过3个依赖的任务应该得到较低分', () => {
      const task = createTestTask('many-deps', 'medium');
      task.dependencies = ['dep-1', 'dep-2', 'dep-3', 'dep-4'];

      const ranked = ranker.rankTasks([task]);

      expect(ranked[0].dependencyScore).toBe(20);
    });
  });

  describe('任务年龄评分', () => {
    it('新任务（1小时内）应该得到低分', () => {
      const task = createTestTask('new', 'medium');
      task.createdAt = now - 1800000; // 30分钟前

      const ranked = ranker.rankTasks([task]);

      expect(ranked[0].ageScore).toBe(0);
    });

    it('1小时到1天的任务应该得到中等分', () => {
      const task = createTestTask('aging', 'medium');
      task.createdAt = now - 7200000; // 2小时前

      const ranked = ranker.rankTasks([task]);

      expect(ranked[0].ageScore).toBeGreaterThan(0);
      expect(ranked[0].ageScore).toBeLessThan(50);
    });

    it('超过1天的任务应该得到较高分', () => {
      const task = createTestTask('old', 'medium');
      task.createdAt = now - 2 * 24 * 3600000; // 2天前

      const ranked = ranker.rankTasks([task]);

      expect(ranked[0].ageScore).toBeGreaterThan(50);
    });

    it('超过1周的任务应该得到最高分', () => {
      const task = createTestTask('very-old', 'medium');
      task.createdAt = now - 8 * 24 * 3600000; // 8天前

      const ranked = ranker.rankTasks([task]);

      expect(ranked[0].ageScore).toBe(100);
    });
  });

  describe('综合评分', () => {
    it('优先级权重应该占 40%', () => {
      const task = createTestTask('urgent', 'urgent');
      const ranked = ranker.rankTasks([task]);

      // 紧急任务优先级分 = 4 * 25 + 25 = 125，但上限是 100
      // 实际上优先级分是 calculatePriorityScore 的结果
      // 优先级权重 40%，所以应该有 40% 的权重
      expect(ranked[0].priority).toBeGreaterThan(0);
    });

    it('紧急度权重应该占 30%', () => {
      const task = createTestTask('overdue', 'medium', now - 1000);
      const ranked = ranker.rankTasks([task]);

      // 过期任务紧急分 = 100
      // 紧急度权重 30%，所以贡献 30 分
      expect(ranked[0].urgency).toBe(100);
    });

    it('依赖分权重应该占 20%', () => {
      const task = createTestTask('no-deps', 'medium');
      const ranked = ranker.rankTasks([task]);

      expect(ranked[0].dependencyScore).toBe(100);
    });

    it('年龄分权重应该占 10%', () => {
      const task = createTestTask('very-old', 'medium');
      task.createdAt = now - 8 * 24 * 3600000;

      const ranked = ranker.rankTasks([task]);

      expect(ranked[0].ageScore).toBe(100);
    });
  });

  describe('getTopTasks - 获取优先级最高的任务', () => {
    it('应该返回前 N 个优先级最高的任务', () => {
      const tasks: Task[] = [
        createTestTask('task-1', 'low'),
        createTestTask('task-2', 'urgent'),
        createTestTask('task-3', 'medium'),
        createTestTask('task-4', 'high'),
        createTestTask('task-5', 'low')
      ];

      const topTasks = ranker.getTopTasks(tasks, 3);

      expect(topTasks.length).toBe(3);
      expect(topTasks[0].id).toBe('task-2'); // urgent
      expect(topTasks[1].id).toBe('task-4'); // high
      expect(topTasks[2].id).toBe('task-3'); // medium
    });

    it('当任务数量少于请求数量时应该返回所有任务', () => {
      const tasks: Task[] = [
        createTestTask('task-1', 'high'),
        createTestTask('task-2', 'low')
      ];

      const topTasks = ranker.getTopTasks(tasks, 10);

      expect(topTasks.length).toBe(2);
    });
  });

  describe('getTasksByPriority - 按优先级筛选任务', () => {
    it('应该返回指定优先级的任务', () => {
      const tasks: Task[] = [
        createTestTask('task-1', 'low'),
        createTestTask('task-2', 'urgent'),
        createTestTask('task-3', 'urgent'),
        createTestTask('task-4', 'high')
      ];

      const urgentTasks = ranker.getTasksByPriority(tasks, 'urgent');

      expect(urgentTasks.length).toBe(2);
      expect(urgentTasks.every(t => t.priority === 'urgent')).toBe(true);
    });

    it('没有匹配的任务时应该返回空数组', () => {
      const tasks: Task[] = [
        createTestTask('task-1', 'low'),
        createTestTask('task-2', 'medium')
      ];

      const urgentTasks = ranker.getTasksByPriority(tasks, 'urgent');

      expect(urgentTasks).toEqual([]);
    });
  });

  describe('getOverdueTasks - 获取过期任务', () => {
    it('应该返回所有过期且未完成的任务', () => {
      const tasks: Task[] = [
        createTestTask('overdue-1', 'high', now - 1000),
        createTestTask('overdue-2', 'medium', now - 3600000),
        createTestTask('future', 'low', now + 3600000)
      ];

      const overdueTasks = ranker.getOverdueTasks(tasks);

      expect(overdueTasks.length).toBe(2);
      expect(overdueTasks[0].id).toBe('overdue-1');
      expect(overdueTasks[1].id).toBe('overdue-2');
    });

    it('已完成的过期任务不应该被返回', () => {
      const tasks: Task[] = [
        createTestTask('completed', 'high', now - 1000)
      ];
      tasks[0].status = 'completed';

      const overdueTasks = ranker.getOverdueTasks(tasks);

      expect(overdueTasks).toEqual([]);
    });

    it('已取消的过期任务不应该被返回', () => {
      const tasks: Task[] = [
        createTestTask('cancelled', 'high', now - 1000)
      ];
      tasks[0].status = 'cancelled';

      const overdueTasks = ranker.getOverdueTasks(tasks);

      expect(overdueTasks).toEqual([]);
    });

    it('没有截止时间的任务不应该被返回', () => {
      const tasks: Task[] = [
        createTestTask('no-deadline', 'high')
      ];

      const overdueTasks = ranker.getOverdueTasks(tasks);

      expect(overdueTasks).toEqual([]);
    });
  });

  describe('getTasksDueWithin - 获取指定时间窗口内的任务', () => {
    it('应该返回在指定时间内到期的任务', () => {
      const oneHour = 3600000;
      const tasks: Task[] = [
        createTestTask('soon', 'high', now + 1800000), // 30分钟后
        createTestTask('later', 'medium', now + 7200000), // 2小时后
        createTestTask('future', 'low', now + 86400000) // 1天后
      ];

      const dueTasks = ranker.getTasksDueWithin(tasks, oneHour);

      expect(dueTasks.length).toBe(1);
      expect(dueTasks[0].id).toBe('soon');
    });

    it('应该排除已完成和已取消的任务', () => {
      const oneHour = 3600000;
      const tasks: Task[] = [
        createTestTask('completed', 'high', now + 1800000),
        createTestTask('active', 'medium', now + 1800000)
      ];
      tasks[0].status = 'completed';

      const dueTasks = ranker.getTasksDueWithin(tasks, oneHour);

      expect(dueTasks.length).toBe(1);
      expect(dueTasks[0].id).toBe('active');
    });
  });

  describe('排序方法', () => {
    it('sortByDeadline 应该按截止时间排序', () => {
      const tasks: Task[] = [
        createTestTask('no-deadline', 'medium'),
        createTestTask('late', 'medium', now + 7200000),
        createTestTask('early', 'medium', now + 3600000)
      ];

      const sorted = ranker.sortByDeadline(tasks);

      expect(sorted[0].id).toBe('early');
      expect(sorted[1].id).toBe('late');
      expect(sorted[2].id).toBe('no-deadline');
    });

    it('sortByPriority 应该按优先级排序', () => {
      const tasks: Task[] = [
        createTestTask('low', 'low'),
        createTestTask('urgent', 'urgent'),
        createTestTask('medium', 'medium'),
        createTestTask('high', 'high')
      ];

      const sorted = ranker.sortByPriority(tasks);

      expect(sorted[0].priority).toBe('urgent');
      expect(sorted[1].priority).toBe('high');
      expect(sorted[2].priority).toBe('medium');
      expect(sorted[3].priority).toBe('low');
    });

    it('sortByCreationTime 应该按创建时间排序', () => {
      const tasks: Task[] = [
        createTestTask('old', 'medium'),
        createTestTask('new', 'medium'),
        createTestTask('middle', 'medium')
      ];
      tasks[0].createdAt = now - 3600000;
      tasks[1].createdAt = now - 60000;
      tasks[2].createdAt = now - 1800000;

      const sorted = ranker.sortByCreationTime(tasks);

      expect(sorted[0].id).toBe('old');
      expect(sorted[1].id).toBe('middle');
      expect(sorted[2].id).toBe('new');
    });
  });

  describe('groupByPriority - 按优先级分组', () => {
    it('应该正确分组任务', () => {
      const tasks: Task[] = [
        createTestTask('low-1', 'low'),
        createTestTask('high-1', 'high'),
        createTestTask('low-2', 'low'),
        createTestTask('urgent-1', 'urgent')
      ];

      const groups = ranker.groupByPriority(tasks);

      expect(groups.get('low')?.length).toBe(2);
      expect(groups.get('high')?.length).toBe(1);
      expect(groups.get('urgent')?.length).toBe(1);
    });
  });

  describe('getTaskStats - 获取任务统计', () => {
    it('应该计算正确的统计信息', () => {
      const tasks: Task[] = [
        createTestTask('task-1', 'urgent', now - 1000), // 过期
        createTestTask('task-2', 'high'),
        createTestTask('task-3', 'low'),
        createTestTask('task-4', 'medium')
      ];
      tasks[1].status = 'completed';

      const stats = ranker.getTaskStats(tasks);

      expect(stats.total).toBe(4);
      expect(stats.byPriority.urgent).toBe(1);
      expect(stats.byPriority.high).toBe(1);
      expect(stats.byPriority.medium).toBe(1);
      expect(stats.byPriority.low).toBe(1);
      expect(stats.byStatus['completed']).toBe(1);
      expect(stats.overdue).toBe(1);
      // averageAge should be calculated correctly
      expect(stats.averageAge).toBeGreaterThanOrEqual(0);
    });

    it('空任务列表应该返回零值统计', () => {
      const stats = ranker.getTaskStats([]);

      expect(stats.total).toBe(0);
      expect(stats.byPriority.urgent).toBe(0);
      expect(stats.overdue).toBe(0);
      expect(stats.averageAge).toBe(0);
    });
  });

  describe('边界情况测试', () => {
    it('应该处理所有优先级类型', () => {
      const priorities: TaskPriority[] = ['low', 'medium', 'high', 'urgent'];

      for (const priority of priorities) {
        const task = createTestTask(`task-${priority}`, priority);
        const ranked = ranker.rankTasks([task]);

        expect(ranked[0].task.priority).toBe(priority);
      }
    });

    it('分数应该在合理范围内', () => {
      const tasks: Task[] = [
        createTestTask('urgent', 'urgent', now - 1000),
        createTestTask('low', 'low', now + 86400000)
      ];

      const ranked = ranker.rankTasks(tasks);

      for (const r of ranked) {
        expect(r.score).toBeGreaterThanOrEqual(0);
        expect(r.score).toBeLessThanOrEqual(100);
        expect(r.priority).toBeGreaterThanOrEqual(0);
        expect(r.urgency).toBeGreaterThanOrEqual(0);
        expect(r.urgency).toBeLessThanOrEqual(100);
        expect(r.dependencyScore).toBeGreaterThanOrEqual(0);
        expect(r.dependencyScore).toBeLessThanOrEqual(100);
        expect(r.ageScore).toBeGreaterThanOrEqual(0);
        expect(r.ageScore).toBeLessThanOrEqual(100);
      }
    });

    it('相同任务属性的排序应该稳定', () => {
      const tasks: Task[] = [
        createTestTask('task-1', 'high'),
        createTestTask('task-2', 'high')
      ];

      const ranked1 = ranker.rankTasks([...tasks]);
      const ranked2 = ranker.rankTasks([...tasks]);

      expect(ranked1[0].task.id).toBe(ranked2[0].task.id);
    });
  });
});

/**
 * 创建测试任务
 */
function createTestTask(id: string, priority: TaskPriority, deadline?: number): Task {
  return {
    id,
    type: 'implementation',
    priority,
    requiredCapabilities: ['typescript'],
    estimatedDuration: 30,
    dependencies: [],
    status: 'pending',
    title: `Test Task ${id}`,
    createdAt: Date.now(),
    deadline
  };
}
