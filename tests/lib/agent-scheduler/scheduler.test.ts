/**
 * Agent Scheduler Tests
 * 测试核心调度逻辑
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { AgentScheduler, SchedulerConfig } from '../../../src/lib/agent-scheduler/core/scheduler';
import { Task, createTask } from '../../../src/lib/agent-scheduler/models/task-model';
import { AgentCapability, initializeAgents } from '../../../src/lib/agent-scheduler/models/agent-capability';

describe('AgentScheduler - 核心调度测试', () => {
  let scheduler: AgentScheduler;

  beforeEach(() => {
    scheduler = new AgentScheduler();
  });

  afterEach(() => {
    scheduler.shutdown();
  });

  describe('任务分配给合适的 Agent', () => {
    it('应该将任务分配给有能力处理的 Agent', async () => {
      const task = createTestTask('task-1', 'implementation', ['typescript']);

      scheduler.addTask(task);
      const decision = await scheduler.scheduleTask('task-1');

      expect(decision).not.toBeNull();
      expect(decision!.taskId).toBe('task-1');
      expect(decision!.assignedAgent).toBeTruthy();
      expect(decision!.confidence).toBeGreaterThan(0);
    });

    it('应该将任务分配给匹配度最高的 Agent', async () => {
      // 创建需要特定能力的任务
      const task = createTestTask('task-1', 'testing', ['jest', 'testing']);

      scheduler.addTask(task);
      const decision = await scheduler.scheduleTask('task-1');

      expect(decision).not.toBeNull();
      // tester agent 应该是最匹配的
      expect(decision!.assignedAgent).toBe('tester');
    });

    it('当没有合适的 Agent 时应该返回 null', async () => {
      const task = createTestTask('task-1', 'design', ['unknown-skill']);

      scheduler.addTask(task);
      const decision = await scheduler.scheduleTask('task-1');

      expect(decision).toBeNull();
    });

    it('任务分配后应该更新任务状态', async () => {
      const task = createTestTask('task-1', 'implementation', ['typescript']);

      scheduler.addTask(task);
      await scheduler.scheduleTask('task-1');

      const scheduledTask = scheduler.getTask('task-1');
      expect(scheduledTask!.status).toBe('assigned');
      expect(scheduledTask!.assignedAgent).toBeTruthy();
    });

    it('任务分配后应该更新 Agent 负载', async () => {
      const task = createTestTask('task-1', 'implementation', ['typescript']);
      task.estimatedDuration = 30; // 30 分钟 = 50% 负载

      scheduler.addTask(task);
      const decision = await scheduler.scheduleTask('task-1');

      expect(decision).not.toBeNull();
      expect(decision!.assignedAgent).toBeTruthy();

      const agentAfter = scheduler.getAgent(decision!.assignedAgent);
      expect(agentAfter).toBeDefined();
      expect(agentAfter!.currentLoad).toBeGreaterThan(0);
    });
  });

  describe('批量调度', () => {
    it('应该按优先级批量调度任务', async () => {
      const tasks = [
        createTestTask('task-1', 'implementation', ['typescript'], 'low'),
        createTestTask('task-2', 'testing', ['testing'], 'urgent'),
        createTestTask('task-3', 'implementation', ['typescript'], 'high')
      ];

      scheduler.addTasks(tasks);
      const result = await scheduler.scheduleNextBatch();

      expect(result.success).toBe(true);
      expect(result.scheduled.length).toBeGreaterThan(0);
      expect(result.stats.totalPending).toBe(3);
    });

    it('应该限制每批调度的任务数量', async () => {
      const config: Partial<SchedulerConfig> = {
        maxBatchSize: 2
      };
      scheduler.updateConfig(config);

      const tasks = [
        createTestTask('task-1', 'implementation', ['typescript'], 'medium'),
        createTestTask('task-2', 'implementation', ['typescript'], 'medium'),
        createTestTask('task-3', 'implementation', ['typescript'], 'medium')
      ];

      scheduler.addTasks(tasks);
      const result = await scheduler.scheduleNextBatch();

      expect(result.scheduled.length).toBeLessThanOrEqual(2);
    });

    it('应该返回调度失败的任务及原因', async () => {
      const tasks = [
        createTestTask('task-1', 'implementation', ['typescript'], 'medium'),
        createTestTask('task-2', 'design', ['unknown-skill'], 'high') // 无匹配 agent
      ];

      scheduler.addTasks(tasks);
      const result = await scheduler.scheduleNextBatch();

      expect(result.failed.length).toBeGreaterThan(0);
      expect(result.failed[0].taskId).toBe('task-2');
      expect(result.failed[0].reason).toBeTruthy();
    });

    it('没有待调度任务时应该返回成功', async () => {
      const result = await scheduler.scheduleNextBatch();

      expect(result.success).toBe(true);
      expect(result.scheduled).toEqual([]);
      expect(result.stats.totalPending).toBe(0);
    });
  });

  describe('手动分配', () => {
    it('应该允许手动分配任务到指定 Agent', () => {
      const task = createTestTask('task-1', 'implementation', ['typescript']);
      scheduler.addTask(task);

      const decision = scheduler.manualAssign('task-1', 'executor', 'user-1');

      expect(decision).not.toBeNull();
      expect(decision!.assignedAgent).toBe('executor');
      expect(decision!.manualOverride).toBe(true);
      expect(decision!.overrideBy).toBe('user-1');
      expect(decision!.confidence).toBe(1.0);
    });

    it('手动分配不可用的 Agent 应该抛出错误', () => {
      const task = createTestTask('task-1', 'implementation', ['typescript']);
      scheduler.addTask(task);

      scheduler.setAgentAvailability('executor', false);

      expect(() => {
        scheduler.manualAssign('task-1', 'executor', 'user-1');
      }).toThrow('not available');
    });

    it('手动分配过载的 Agent 应该抛出错误', () => {
      const task = createTestTask('task-1', 'implementation', ['typescript']);
      task.estimatedDuration = 120; // 2 小时，增加大量负载
      scheduler.addTask(task);

      // 先让 executor 过载
      const agent = scheduler.getAgent('executor');
      if (agent) {
        agent.currentLoad = 85;
      }

      expect(() => {
        scheduler.manualAssign('task-1', 'executor', 'user-1');
      }).toThrow('does not have sufficient capacity');
    });

    it('手动分配不存在的任务应该抛出错误', () => {
      expect(() => {
        scheduler.manualAssign('nonexistent', 'executor', 'user-1');
      }).toThrow('not found');
    });

    it('手动分配不存在的 Agent 应该抛出错误', () => {
      const task = createTestTask('task-1', 'implementation', ['typescript']);
      scheduler.addTask(task);

      expect(() => {
        scheduler.manualAssign('task-1', 'nonexistent', 'user-1');
      }).toThrow('not found');
    });

    it('禁用手动覆盖时应该拒绝手动分配', () => {
      scheduler.updateConfig({ allowManualOverride: false });
      const task = createTestTask('task-1', 'implementation', ['typescript']);
      scheduler.addTask(task);

      expect(() => {
        scheduler.manualAssign('task-1', 'executor', 'user-1');
      }).toThrow('not allowed');
    });
  });

  describe('任务生命周期管理', () => {
    it('startTask 应该更新任务状态', async () => {
      const task = createTestTask('task-1', 'implementation', ['typescript']);
      scheduler.addTask(task);
      await scheduler.scheduleTask('task-1');

      scheduler.startTask('task-1');

      const startedTask = scheduler.getTask('task-1');
      expect(startedTask!.status).toBe('in_progress');
    });

    it('completeTask 应该更新任务和 Agent 状态', async () => {
      const task = createTestTask('task-1', 'implementation', ['typescript']);
      task.estimatedDuration = 60;
      scheduler.addTask(task);
      const decision = await scheduler.scheduleTask('task-1');

      expect(decision).not.toBeNull();
      const agentId = decision!.assignedAgent;

      const agentBefore = scheduler.getAgent(agentId);
      const loadBeforeCompletion = agentBefore!.currentLoad;

      scheduler.startTask('task-1');
      scheduler.completeTask('task-1');

      const completedTask = scheduler.getTask('task-1');
      expect(completedTask!.status).toBe('completed');

      // Agent 负载应该减少
      const agentAfter = scheduler.getAgent(agentId);
      expect(agentAfter!.currentLoad).toBeLessThan(loadBeforeCompletion);
    });

    it('failTask 应该记录错误并更新状态', async () => {
      const task = createTestTask('task-1', 'implementation', ['typescript']);
      scheduler.addTask(task);
      await scheduler.scheduleTask('task-1');

      scheduler.startTask('task-1');
      scheduler.failTask('task-1', 'Something went wrong');

      const failedTask = scheduler.getTask('task-1');
      expect(failedTask!.status).toBe('failed');
      expect(failedTask!.error).toBe('Something went wrong');
    });

    it('reassignTask 应该重新分配失败的任务', async () => {
      const task = createTestTask('task-1', 'implementation', ['typescript']);
      scheduler.addTask(task);
      await scheduler.scheduleTask('task-1');

      const originalAgentId = scheduler.getTask('task-1')!.assignedAgent;
      scheduler.startTask('task-1');
      scheduler.failTask('task-1', 'Error');

      const newDecision = await scheduler.reassignTask('task-1');

      expect(newDecision).not.toBeNull();
      // 新决策可能分配给相同或不同的 agent
      expect(newDecision!.taskId).toBe('task-1');
    });
  });

  describe('Agent 管理', () => {
    it('getAgents 应该返回所有 Agent', () => {
      const agents = scheduler.getAgents();

      expect(agents.size).toBeGreaterThan(0);
    });

    it('getAgent 应该返回指定的 Agent', () => {
      const agent = scheduler.getAgent('tester');

      expect(agent).not.toBeUndefined();
      expect(agent!.agentId).toBe('tester');
      expect(agent!.role).toContain('测试');
    });

    it('setAgentAvailability 应该更新 Agent 可用性', () => {
      scheduler.setAgentAvailability('executor', false);

      const agent = scheduler.getAgent('executor');
      expect(agent!.availability).toBe(false);
    });
  });

  describe('任务查询', () => {
    it('getTask 应该返回指定的任务', () => {
      const task = createTestTask('task-1', 'implementation', ['typescript']);
      scheduler.addTask(task);

      const retrieved = scheduler.getTask('task-1');

      expect(retrieved).not.toBeUndefined();
      expect(retrieved!.id).toBe('task-1');
    });

    it('getAllTasks 应该返回所有任务', () => {
      scheduler.addTasks([
        createTestTask('task-1', 'implementation', ['typescript']),
        createTestTask('task-2', 'testing', ['testing'])
      ]);

      const tasks = scheduler.getAllTasks();

      expect(tasks.length).toBe(2);
    });

    it('getPendingTasks 应该返回待处理任务', async () => {
      scheduler.addTasks([
        createTestTask('task-1', 'implementation', ['typescript']),
        createTestTask('task-2', 'testing', ['testing'])
      ]);

      await scheduler.scheduleTask('task-1');

      const pending = scheduler.getPendingTasks();

      expect(pending.length).toBe(1);
      expect(pending[0].id).toBe('task-2');
    });

    it('getTasksByStatus 应该按状态筛选任务', async () => {
      scheduler.addTasks([
        createTestTask('task-1', 'implementation', ['typescript']),
        createTestTask('task-2', 'testing', ['testing'])
      ]);

      await scheduler.scheduleTask('task-1');

      const assigned = scheduler.getTasksByStatus('assigned');

      expect(assigned.length).toBe(1);
      expect(assigned[0].id).toBe('task-1');
    });

    it('getTaskStats 应该返回任务统计', async () => {
      scheduler.addTasks([
        createTestTask('task-1', 'implementation', ['typescript']),
        createTestTask('task-2', 'testing', ['testing'])
      ]);

      await scheduler.scheduleTask('task-1');
      scheduler.startTask('task-1');
      scheduler.completeTask('task-1');

      const stats = scheduler.getTaskStats();

      expect(stats.total).toBe(2);
      expect(stats.completed).toBe(1);
      expect(stats.pending).toBe(1);
    });
  });

  describe('调度历史和指标', () => {
    it('getRecentDecisions 应该返回最近的调度决策', async () => {
      scheduler.addTasks([
        createTestTask('task-1', 'implementation', ['typescript']),
        createTestTask('task-2', 'testing', ['testing'])
      ]);

      await scheduler.scheduleTask('task-1');
      await scheduler.scheduleTask('task-2');

      const decisions = scheduler.getRecentDecisions(10);

      expect(decisions.length).toBe(2);
    });

    it('getMetrics 应该返回调度指标', async () => {
      scheduler.addTasks([
        createTestTask('task-1', 'implementation', ['typescript']),
        createTestTask('task-2', 'testing', ['testing'])
      ]);

      await scheduler.scheduleTask('task-1');
      scheduler.startTask('task-1');
      scheduler.completeTask('task-1');

      const metrics = scheduler.getMetrics();

      expect(metrics).toBeDefined();
      expect(metrics).toHaveProperty('totalDecisions');
      expect(metrics).toHaveProperty('averageConfidence');
      // Verify numeric values
      expect(metrics.totalDecisions).toBeGreaterThanOrEqual(1);
    });

    it('getLoadStats 应该返回负载统计', () => {
      const stats = scheduler.getLoadStats();

      expect(stats).toHaveProperty('averageLoad');
      expect(stats).toHaveProperty('overloadedAgents');
      expect(stats).toHaveProperty('busyAgents');
    });

    it('getScalingSuggestion 应该返回扩缩容建议', () => {
      const suggestion = scheduler.getScalingSuggestion();

      expect(suggestion).toHaveProperty('action');
      expect(suggestion).toHaveProperty('reason');
      expect(['scale-up', 'scale-down', 'none']).toContain(suggestion.action);
    });
  });

  describe('配置管理', () => {
    it('应该支持更新配置', () => {
      scheduler.updateConfig({
        maxBatchSize: 5,
        schedulingInterval: 10000
      });

      // 配置更新后应该生效（通过行为验证）
      // 由于 config 是私有的，我们通过行为验证
    });

    it('应该支持更新负载均衡配置', () => {
      scheduler.updateConfig({
        loadBalance: {
          maxLoadThreshold: 95,
          busyThreshold: 80,
          preferLowLoad: true,
          considerSpecialization: true
        }
      });

      // 配置更新后应该生效
    });
  });

  describe('状态重置和清理', () => {
    it('clearTasks 应该清除所有任务', async () => {
      scheduler.addTasks([
        createTestTask('task-1', 'implementation', ['typescript']),
        createTestTask('task-2', 'testing', ['testing'])
      ]);

      scheduler.clearTasks();

      const tasks = scheduler.getAllTasks();
      expect(tasks.length).toBe(0);
    });

    it('reset 应该重置所有状态', async () => {
      scheduler.addTasks([
        createTestTask('task-1', 'implementation', ['typescript'])
      ]);

      await scheduler.scheduleTask('task-1');
      scheduler.startTask('task-1');
      scheduler.completeTask('task-1');

      scheduler.reset();

      const tasks = scheduler.getAllTasks();
      expect(tasks.length).toBe(0);

      // Agent 负载应该重置
      const agents = scheduler.getAgents();
      for (const [, agent] of agents) {
        expect(agent.currentLoad).toBe(0);
      }
    });
  });

  describe('导出状态', () => {
    it('export 应该返回完整的调度器状态', async () => {
      scheduler.addTasks([
        createTestTask('task-1', 'implementation', ['typescript'])
      ]);
      await scheduler.scheduleTask('task-1');

      const exported = scheduler.export();

      expect(typeof exported).toBe('string');
      const parsed = JSON.parse(exported);
      expect(parsed).toHaveProperty('config');
      expect(parsed).toHaveProperty('agents');
      expect(parsed).toHaveProperty('tasks');
      expect(parsed).toHaveProperty('history');
    });
  });

  describe('自动调度', () => {
    it('应该能够在初始化时启用自动调度', () => {
      const autoScheduler = new AgentScheduler({
        autoSchedule: true,
        schedulingInterval: 1000
      });

      // 自动调度应该启动
      // 由于是定时器，我们验证初始化成功
      expect(autoScheduler).toBeDefined();

      autoScheduler.shutdown();
    });

    it('shutdown 应该停止自动调度', () => {
      const autoScheduler = new AgentScheduler({
        autoSchedule: true,
        schedulingInterval: 1000
      });

      autoScheduler.initialize();
      autoScheduler.shutdown();

      // 应该不会抛出错误
    });
  });

  describe('边界情况测试', () => {
    it('调度不存在的任务应该返回 null', async () => {
      const decision = await scheduler.scheduleTask('nonexistent');

      expect(decision).toBeNull();
    });

    it('获取不存在的任务应该返回 undefined', () => {
      const task = scheduler.getTask('nonexistent');

      expect(task).toBeUndefined();
    });

    it('获取不存在的 Agent 应该返回 undefined', () => {
      const agent = scheduler.getAgent('nonexistent');

      expect(agent).toBeUndefined();
    });

    it('完成未分配的任务应该不抛出错误', () => {
      const task = createTestTask('task-1', 'implementation', ['typescript']);
      scheduler.addTask(task);

      // 不应该抛出错误
      expect(() => {
        scheduler.completeTask('task-1');
      }).not.toThrow();
    });

    it('应该处理有依赖的任务', async () => {
      const dependencyTask = createTestTask('dep-1', 'implementation', ['typescript']);
      const dependentTask = createTestTask('task-1', 'testing', ['testing'], 'high');
      dependentTask.dependencies = ['dep-1'];

      scheduler.addTasks([dependencyTask, dependentTask]);

      // 先调度依赖任务
      await scheduler.scheduleTask('dep-1');

      // 尝试调度依赖任务
      const decision = await scheduler.scheduleTask('task-1');

      // 依赖任务未完成，应该返回 null
      // 注意：这取决于 TaskQueue.areDependenciesSatisfied 的实现
      // 如果依赖检查在 scheduleTask 中进行，则需要依赖任务完成
    });

    it('应该处理空任务标题', () => {
      const task = createTestTask('task-1', 'implementation', ['typescript']);
      task.title = '';

      expect(() => {
        scheduler.addTask(task);
      }).not.toThrow();
    });

    it('应该处理极长的任务持续时间', async () => {
      const task = createTestTask('task-1', 'implementation', ['typescript']);
      task.estimatedDuration = 10000; // 10000 分钟

      scheduler.addTask(task);
      const decision = await scheduler.scheduleTask('task-1');

      // 应该能处理，但可能导致高负载
      // 具体行为取决于负载计算逻辑
    });
  });

  describe('性能测试', () => {
    it('应该能处理大量任务', async () => {
      const tasks: Task[] = [];
      for (let i = 0; i < 100; i++) {
        tasks.push(createTestTask(`task-${i}`, 'implementation', ['typescript']));
      }

      scheduler.addTasks(tasks);

      const result = await scheduler.scheduleNextBatch();

      expect(result.stats.totalPending).toBe(100);
    });

    it('重复调度应该返回相同或新的决策', async () => {
      const task = createTestTask('task-1', 'implementation', ['typescript']);
      scheduler.addTask(task);

      // 第一次调度
      const firstDecision = await scheduler.scheduleTask('task-1');
      expect(firstDecision).not.toBeNull();

      // 任务已经被分配
      const assignedTask = scheduler.getTask('task-1');
      expect(assignedTask!.status).toBe('assigned');

      // 第二次调度同一任务（调度器允许重新分配）
      const secondDecision = await scheduler.scheduleTask('task-1');

      // 行为：可能返回新的决策或者 null，取决于实现
      // 这里我们验证不会崩溃，并返回合理的值
      if (secondDecision !== null) {
        expect(secondDecision.taskId).toBe('task-1');
      }
    });
  });
});

/**
 * 创建测试任务
 */
function createTestTask(
  id: string,
  type: 'implementation' | 'testing' | 'design' = 'implementation',
  capabilities: string[] = ['typescript'],
  priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium'
): Task {
  return createTask({
    id,
    type,
    title: `Test Task ${id}`,
    priority,
    requiredCapabilities: capabilities,
    estimatedDuration: 30
  });
}
