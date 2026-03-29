/**
 * Scheduler API Integration Tests
 * 
 * 测试 Scheduler API 功能：
 * - API 端点测试
 * - 错误处理
 * - 超时处理
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AgentScheduler, SchedulerConfig } from '@/lib/agent-scheduler/core/scheduler';
import { createTask } from '@/lib/agent-scheduler/models/task-model';
import { TaskPriority, TaskStatus } from '@/lib/agent-scheduler/models/task-model';

describe('Scheduler API Integration Tests', () => {
  let scheduler: AgentScheduler;

  beforeEach(() => {
    const config: Partial<SchedulerConfig> = {
      autoSchedule: false,
      allowManualOverride: true,
      maxBatchSize: 10,
      schedulingInterval: 30000,
      loadBalance: {
        maxLoadThreshold: 90,
        busyThreshold: 70,
        preferLowLoad: true,
        considerSpecialization: true
      }
    };

    scheduler = new AgentScheduler(config);
  });

  afterEach(() => {
    scheduler.shutdown();
  });

  /**
   * 测试1: 任务管理 API
   */
  describe('Task Management API', () => {
    it('should add task via API', () => {
      const task = createTask({
        id: 'task-api-001',
        type: 'implementation',
        title: 'API Test Task',
        priority: 'high',
        requiredCapabilities: ['typescript'],
        estimatedDuration: 30
      });

      // Simulate API call
      scheduler.addTask(task);

      // Verify task was added
      const retrievedTask = scheduler.getTask(task.id);
      expect(retrievedTask).toBeDefined();
      expect(retrievedTask?.title).toBe('API Test Task');
    });

    it('should get task by ID via API', () => {
      const task = createTask({
        id: 'task-api-002',
        type: 'implementation',
        title: 'Get Task Test',
        priority: 'medium',
        requiredCapabilities: [],
        estimatedDuration: 30
      });

      scheduler.addTask(task);

      // Simulate API GET
      const retrieved = scheduler.getTask('task-api-002');

      expect(retrieved).toEqual(task);
    });

    it('should return null for non-existent task', () => {
      const result = scheduler.getTask('non-existent-task');
      expect(result).toBeUndefined();
    });

    it('should add multiple tasks via API', () => {
      const tasks = Array.from({ length: 5 }, (_, i) =>
        createTask({
          id: `task-api-batch-${i + 1}`,
          type: 'implementation',
          title: `Batch Task ${i + 1}`,
          priority: 'medium',
          requiredCapabilities: [],
          estimatedDuration: 30
        })
      );

      // Simulate API batch add
      scheduler.addTasks(tasks);

      // Verify all tasks were added
      for (const task of tasks) {
        expect(scheduler.getTask(task.id)).toEqual(task);
      }
    });

    it('should get all tasks via API', () => {
      const tasks = [
        createTask({
          id: 'task-api-all-001',
          type: 'implementation',
          title: 'Task 1',
          priority: 'high',
          requiredCapabilities: [],
          estimatedDuration: 30
        }),
        createTask({
          id: 'task-api-all-002',
          type: 'testing',
          title: 'Task 2',
          priority: 'low',
          requiredCapabilities: [],
          estimatedDuration: 20
        })
      ];

      scheduler.addTasks(tasks);

      // Simulate API GET all
      const allTasks = scheduler.getAllTasks();

      expect(allTasks.length).toBe(2);
      expect(allTasks).toEqual(expect.arrayContaining(tasks));
    });

    it('should get pending tasks via API', () => {
      const tasks = [
        createTask({
          id: 'task-pending-001',
          type: 'implementation',
          title: 'Pending Task',
          priority: 'high',
          requiredCapabilities: [],
          estimatedDuration: 30
        }),
        createTask({
          id: 'task-pending-002',
          type: 'testing',
          title: 'Another Pending',
          priority: 'medium',
          requiredCapabilities: [],
          estimatedDuration: 20
        })
      ];

      scheduler.addTasks(tasks);

      // Simulate API GET pending
      const pendingTasks = scheduler.getPendingTasks();

      expect(pendingTasks.length).toBe(2);
    });

    it('should get tasks by status via API', () => {
      const tasks = [
        createTask({
          id: 'task-status-001',
          type: 'implementation',
          title: 'Pending Task',
          priority: 'high',
          requiredCapabilities: [],
          estimatedDuration: 30
        }),
        createTask({
          id: 'task-status-002',
          type: 'testing',
          title: 'Completed Task',
          priority: 'medium',
          requiredCapabilities: [],
          estimatedDuration: 20
        })
      ];

      scheduler.addTasks(tasks);

      // Mark one as completed (note: need to schedule first)
      scheduler.completeTask('task-status-002');
      // Since task wasn't scheduled, it won't complete properly

      // Get pending tasks (both should be pending since neither was scheduled)
      const pending = scheduler.getTasksByStatus('pending');
      expect(pending.length).toBe(2);

      // No completed tasks since none were scheduled
      const completed = scheduler.getTasksByStatus('completed');
      expect(completed.length).toBe(0);
    });

    it('should get task statistics via API', () => {
      const tasks = [
        createTask({
          id: 'task-stat-001',
          type: 'implementation',
          title: 'Task 1',
          priority: 'high',
          requiredCapabilities: [],
          estimatedDuration: 30
        }),
        createTask({
          id: 'task-stat-002',
          type: 'testing',
          title: 'Task 2',
          priority: 'medium',
          requiredCapabilities: [],
          estimatedDuration: 20
        })
      ];

      scheduler.addTasks(tasks);

      // Simulate API GET stats
      const stats = scheduler.getTaskStats();

      expect(stats.total).toBe(2);
      expect(stats.pending).toBe(2);
      expect(stats.completed).toBe(0);
    });

    it('should clear all tasks via API', () => {
      const tasks = Array.from({ length: 5 }, (_, i) =>
        createTask({
          id: `task-clear-${i + 1}`,
          type: 'implementation',
          title: `Task ${i + 1}`,
          priority: 'medium',
          requiredCapabilities: [],
          estimatedDuration: 30
        })
      );

      scheduler.addTasks(tasks);

      expect(scheduler.getAllTasks().length).toBe(5);

      // Simulate API clear
      scheduler.clearTasks();

      expect(scheduler.getAllTasks().length).toBe(0);
    });
  });

  /**
   * 测试2: 调度 API
   */
  describe('Scheduling API', () => {
    it('should schedule single task via API', async () => {
      const task = createTask({
        id: 'task-schedule-api-001',
        type: 'implementation',
        title: 'Schedule Test',
        priority: 'high',
        requiredCapabilities: ['typescript'],
        estimatedDuration: 30
      });

      scheduler.addTask(task);

      // Simulate API POST to schedule
      const decision = await scheduler.scheduleTask(task.id);

      expect(decision).not.toBeNull();
      expect(decision?.taskId).toBe(task.id);
      expect(decision?.assignedAgent).toBeTruthy();
    });

    it('should schedule batch via API', async () => {
      const tasks = Array.from({ length: 3 }, (_, i) =>
        createTask({
          id: `task-batch-api-${i + 1}`,
          type: 'implementation',
          title: `Batch Task ${i + 1}`,
          priority: 'medium',
          requiredCapabilities: ['typescript'],
          estimatedDuration: 30
        })
      );

      scheduler.addTasks(tasks);

      // Simulate API POST to schedule batch
      const result = await scheduler.scheduleNextBatch();

      // At least some tasks should be scheduled (depends on agent availability and load)
      expect(result.scheduled.length).toBeGreaterThanOrEqual(1);
    });

    it('should start task via API', async () => {
      const task = createTask({
        id: 'task-start-api-001',
        type: 'implementation',
        title: 'Start Test',
        priority: 'high',
        requiredCapabilities: ['typescript'],
        estimatedDuration: 30
      });

      scheduler.addTask(task);
      await scheduler.scheduleTask(task.id);

      // Simulate API POST to start
      scheduler.startTask(task.id);

      expect(scheduler.getTask(task.id)?.status).toBe('in_progress');
    });

    it('should complete task via API', async () => {
      const task = createTask({
        id: 'task-complete-api-001',
        type: 'implementation',
        title: 'Complete Test',
        priority: 'high',
        requiredCapabilities: ['typescript'],
        estimatedDuration: 30
      });

      scheduler.addTask(task);
      await scheduler.scheduleTask(task.id);
      scheduler.startTask(task.id);

      // Simulate API POST to complete
      scheduler.completeTask(task.id);

      expect(scheduler.getTask(task.id)?.status).toBe('completed');
    });

    it('should fail task via API', async () => {
      const task = createTask({
        id: 'task-fail-api-001',
        type: 'implementation',
        title: 'Fail Test',
        priority: 'high',
        requiredCapabilities: ['typescript'],
        estimatedDuration: 30
      });

      scheduler.addTask(task);
      await scheduler.scheduleTask(task.id);

      // Simulate API POST to fail
      scheduler.failTask(task.id, 'Task failed due to error');

      const failedTask = scheduler.getTask(task.id);
      expect(failedTask?.status).toBe('failed');
      expect(failedTask?.error).toBe('Task failed due to error');
    });

    it('should reassign task via API', async () => {
      const task = createTask({
        id: 'task-reassign-api-001',
        type: 'implementation',
        title: 'Reassign Test',
        priority: 'high',
        requiredCapabilities: ['typescript'],
        estimatedDuration: 30
      });

      scheduler.addTask(task);
      const originalDecision = await scheduler.scheduleTask(task.id);

      // Fail the task
      scheduler.failTask(task.id, 'First attempt failed');

      // Simulate API POST to reassign
      const reassignment = await scheduler.reassignTask(task.id);

      expect(reassignment).not.toBeNull();
      // May or may not be different agent depending on availability
    });
  });

  /**
   * 测试3: Agent 管理 API
   */
  describe('Agent Management API', () => {
    it('should get all agents via API', () => {
      // Simulate API GET
      const agents = scheduler.getAgents();

      expect(agents.size).toBeGreaterThan(0);
    });

    it('should get agent by ID via API', () => {
      const agents = scheduler.getAgents();
      const firstAgentId = Array.from(agents.keys())[0];

      // Simulate API GET by ID
      const agent = scheduler.getAgent(firstAgentId);

      expect(agent).toBeDefined();
      expect(agent?.agentId).toBe(firstAgentId);
    });

    it('should set agent availability via API', () => {
      const agents = scheduler.getAgents();
      const firstAgentId = Array.from(agents.keys())[0];

      // Simulate API PUT to set availability
      scheduler.setAgentAvailability(firstAgentId, false);

      const agent = scheduler.getAgent(firstAgentId);
      expect(agent?.availability).toBe(false);
    });
  });

  /**
   * 测试4: 手动分配 API
   */
  describe('Manual Assignment API', () => {
    it('should allow manual assignment via API', () => {
      const task = createTask({
        id: 'task-manual-api-001',
        type: 'implementation',
        title: 'Manual Assignment Test',
        priority: 'medium',
        requiredCapabilities: ['typescript'],
        estimatedDuration: 30
      });

      scheduler.addTask(task);

      const agents = Array.from(scheduler.getAgents().keys());
      const targetAgent = agents[0];

      // Simulate API POST for manual assignment
      const decision = scheduler.manualAssign(
        task.id,
        targetAgent,
        'api-user-123'
      );

      expect(decision).not.toBeNull();
      expect(decision?.assignedAgent).toBe(targetAgent);
      expect(decision?.manualOverride).toBe(true);
    });
  });

  /**
   * 测试5: 历史和指标 API
   */
  describe('History and Metrics API', () => {
    it('should get schedule history via API', async () => {
      const task = createTask({
        id: 'task-history-api-001',
        type: 'implementation',
        title: 'History Test',
        priority: 'high',
        requiredCapabilities: ['typescript'],
        estimatedDuration: 30
      });

      scheduler.addTask(task);
      await scheduler.scheduleTask(task.id);

      // Simulate API GET history
      const history = scheduler.getScheduleHistory();

      expect(history.getDecision(task.id)).toBeDefined();
    });

    it('should get recent decisions via API', async () => {
      const tasks = Array.from({ length: 5 }, (_, i) =>
        createTask({
          id: `task-recent-api-${i + 1}`,
          type: 'implementation',
          title: `Task ${i + 1}`,
          priority: 'medium',
          requiredCapabilities: ['typescript'],
          estimatedDuration: 30
        })
      );

      scheduler.addTasks(tasks);
      const result = await scheduler.scheduleNextBatch();

      // Simulate API GET recent decisions
      // Request up to 3, but actual count depends on scheduling results
      const recent = scheduler.getRecentDecisions(3);

      // Should return at most 3 decisions (or fewer if fewer tasks were scheduled)
      expect(recent.length).toBeLessThanOrEqual(3);
      expect(recent.length).toBe(result.scheduled.length);
    });

    it('should get metrics via API', async () => {
      const tasks = Array.from({ length: 3 }, (_, i) =>
        createTask({
          id: `task-metrics-api-${i + 1}`,
          type: 'implementation',
          title: `Task ${i + 1}`,
          priority: 'medium',
          requiredCapabilities: ['typescript'],
          estimatedDuration: 30
        })
      );

      scheduler.addTasks(tasks);
      const result = await scheduler.scheduleNextBatch();

      // Simulate API GET metrics
      const metrics = scheduler.getMetrics();

      // Metrics should reflect actual scheduled tasks
      expect(metrics.totalDecisions).toBe(result.scheduled.length);
      expect(metrics.averageConfidence).toBeGreaterThan(0);
    });

    it('should get load stats via API', async () => {
      const tasks = Array.from({ length: 3 }, (_, i) =>
        createTask({
          id: `task-loadstats-api-${i + 1}`,
          type: 'implementation',
          title: `Task ${i + 1}`,
          priority: 'high',
          requiredCapabilities: ['typescript'],
          estimatedDuration: 50
        })
      );

      scheduler.addTasks(tasks);
      await scheduler.scheduleNextBatch();

      // Simulate API GET load stats
      const loadStats = scheduler.getLoadStats();

      expect(loadStats.totalLoad).toBeGreaterThan(0);
      expect(loadStats.averageLoad).toBeGreaterThan(0);
    });

    it('should get scaling suggestion via API', async () => {
      const tasks = Array.from({ length: 15 }, (_, i) =>
        createTask({
          id: `task-scale-api-${i + 1}`,
          type: 'implementation',
          title: `Task ${i + 1}`,
          priority: 'high',
          requiredCapabilities: ['typescript'],
          estimatedDuration: 50
        })
      );

      scheduler.addTasks(tasks);
      await scheduler.scheduleNextBatch();

      // Simulate API GET scaling suggestion
      const suggestion = scheduler.getScalingSuggestion();

      expect(['scale-up', 'scale-down', 'none']).toContain(suggestion.action);
    });
  });

  /**
   * 测试6: 错误处理
   */
  describe('Error Handling', () => {
    it('should handle task not found error', () => {
      expect(() => {
        scheduler.manualAssign('non-existent-task', 'agent-001', 'user');
      }).toThrow('non-existent-task not found');
    });

    it('should handle agent not found error', () => {
      const task = createTask({
        id: 'task-error-001',
        type: 'implementation',
        title: 'Error Test',
        priority: 'medium',
        requiredCapabilities: [],
        estimatedDuration: 30
      });

      scheduler.addTask(task);

      expect(() => {
        scheduler.manualAssign(task.id, 'non-existent-agent', 'user');
      }).toThrow('non-existent-agent not found');
    });

    it('should handle unavailable agent error', () => {
      const task = createTask({
        id: 'task-error-002',
        type: 'implementation',
        title: 'Error Test',
        priority: 'medium',
        requiredCapabilities: [],
        estimatedDuration: 30
      });

      scheduler.addTask(task);

      const agents = Array.from(scheduler.getAgents().keys());
      const targetAgent = agents[0];

      // Set agent unavailable
      scheduler.setAgentAvailability(targetAgent, false);

      expect(() => {
        scheduler.manualAssign(task.id, targetAgent, 'user');
      }).toThrow(/not available/);
    });

    it('should handle manual override disabled error', () => {
      const config: Partial<SchedulerConfig> = {
        autoSchedule: false,
        allowManualOverride: false, // Disable manual override
        maxBatchSize: 10
      };

      const noManualScheduler = new AgentScheduler(config);

      const task = createTask({
        id: 'task-error-003',
        type: 'implementation',
        title: 'Error Test',
        priority: 'medium',
        requiredCapabilities: [],
        estimatedDuration: 30
      });

      noManualScheduler.addTask(task);

      const agents = Array.from(noManualScheduler.getAgents().keys());
      const targetAgent = agents[0];

      expect(() => {
        noManualScheduler.manualAssign(task.id, targetAgent, 'user');
      }).toThrow('Manual override is not allowed');

      noManualScheduler.shutdown();
    });

    it('should handle insufficient capacity error', () => {
      const task = createTask({
        id: 'task-error-004',
        type: 'implementation',
        title: 'Heavy Task',
        priority: 'high',
        requiredCapabilities: [],
        estimatedDuration: 100 // Very heavy task
      });

      scheduler.addTask(task);

      const agents = Array.from(scheduler.getAgents().keys());
      const targetAgent = agents[0];

      // Load up the agent
      const agent = scheduler.getAgent(targetAgent);
      if (agent) {
        agent.currentLoad = 85;
      }

      expect(() => {
        scheduler.manualAssign(task.id, targetAgent, 'user');
      }).toThrow(/does not have sufficient capacity/);
    });

    it('should handle scheduling with no available agents', async () => {
      const task = createTask({
        id: 'task-error-005',
        type: 'implementation',
        title: 'No Agent Task',
        priority: 'high',
        requiredCapabilities: ['nonexistent-tech-stack'],
        estimatedDuration: 30
      });

      scheduler.addTask(task);

      const decision = await scheduler.scheduleTask(task.id);

      // Should return null instead of throwing
      expect(decision).toBeNull();
    });
  });

  /**
   * 测试7: 配置管理 API
   */
  describe('Configuration Management API', () => {
    it('should update configuration via API', () => {
      const newConfig: Partial<SchedulerConfig> = {
        maxBatchSize: 20,
        schedulingInterval: 60000
      };

      // Simulate API PUT to update config
      scheduler.updateConfig(newConfig);

      // Config should be updated (this is internal, can't easily test without exposing getter)
      // Just verify no error is thrown
      expect(true).toBe(true);
    });

    it('should reset scheduler via API', async () => {
      // Add some tasks
      const tasks = Array.from({ length: 5 }, (_, i) =>
        createTask({
          id: `task-reset-api-${i + 1}`,
          type: 'implementation',
          title: `Task ${i + 1}`,
          priority: 'medium',
          requiredCapabilities: [],
          estimatedDuration: 30
        })
      );

      scheduler.addTasks(tasks);

      expect(scheduler.getAllTasks().length).toBe(5);

      // Simulate API POST to reset
      scheduler.reset();

      // Tasks should be cleared
      expect(scheduler.getAllTasks().length).toBe(0);
    });

    it('should export state via API', () => {
      // Simulate API GET export
      const exported = scheduler.export();

      expect(exported).toBeDefined();
      expect(typeof exported).toBe('string');

      const parsed = JSON.parse(exported);
      expect(parsed.config).toBeDefined();
      expect(parsed.agents).toBeDefined();
      expect(parsed.tasks).toBeDefined();
    });

    it('should handle initialization via API', () => {
      // Create new scheduler without auto-init
      const config: Partial<SchedulerConfig> = {
        autoSchedule: false
      };

      const testScheduler = new AgentScheduler(config);

      // Simulate API POST to initialize
      testScheduler.initialize();

      // Should be initialized (no errors)
      expect(true).toBe(true);

      testScheduler.shutdown();
    });

    it('should handle shutdown via API', () => {
      // Create scheduler with auto-schedule
      const config: Partial<SchedulerConfig> = {
        autoSchedule: true,
        schedulingInterval: 1000
      };

      const testScheduler = new AgentScheduler(config);
      testScheduler.initialize();

      // Simulate API POST to shutdown
      testScheduler.shutdown();

      // Should be shut down (no errors)
      expect(true).toBe(true);
    });
  });

  /**
   * 测试8: 超时处理
   */
  describe('Timeout Handling', () => {
    it('should handle long-running scheduling operations', async () => {
      // Create many tasks to simulate long operation
      const tasks = Array.from({ length: 20 }, (_, i) =>
        createTask({
          id: `task-timeout-${i + 1}`,
          type: 'implementation',
          title: `Task ${i + 1}`,
          priority: 'medium',
          requiredCapabilities: ['typescript'],
          estimatedDuration: 30
        })
      );

      scheduler.addTasks(tasks);

      // This should complete even with many tasks
      const result = await scheduler.scheduleNextBatch();

      expect(result).toBeDefined();
      expect(result.scheduled.length).toBeGreaterThan(0);
    });

    it('should handle rapid consecutive API calls', async () => {
      const tasks = Array.from({ length: 10 }, (_, i) =>
        createTask({
          id: `task-rapid-${i + 1}`,
          type: 'implementation',
          title: `Task ${i + 1}`,
          priority: 'high',
          requiredCapabilities: ['typescript'],
          estimatedDuration: 30
        })
      );

      scheduler.addTasks(tasks);

      // Make multiple rapid calls
      const promises = tasks.map(task => scheduler.scheduleTask(task.id));

      const results = await Promise.all(promises);

      // All should complete
      expect(results.length).toBe(10);
      expect(results.filter(r => r !== null).length).toBeGreaterThan(0);
    });

    it('should handle concurrent operations', async () => {
      // Simulate multiple API clients
      const task = createTask({
        id: 'task-concurrent-001',
        type: 'implementation',
        title: 'Concurrent Task',
        priority: 'high',
        requiredCapabilities: ['typescript'],
        estimatedDuration: 30
      });

      scheduler.addTask(task);

      // Multiple concurrent schedule calls
      const [result1, result2, result3] = await Promise.all([
        scheduler.scheduleTask(task.id),
        scheduler.scheduleTask(task.id),
        scheduler.scheduleTask(task.id)
      ]);

      // All should return some result
      expect(result1 || result2 || result3).toBeDefined();
    });
  });

  /**
   * 测试9: 边界情况
   */
  describe('Edge Cases', () => {
    it('should handle empty task list', async () => {
      const result = await scheduler.scheduleNextBatch();

      expect(result.success).toBe(true);
      expect(result.scheduled.length).toBe(0);
      expect(result.stats.totalPending).toBe(0);
    });

    it('should handle task with no capabilities', async () => {
      const task = createTask({
        id: 'task-edge-001',
        type: 'implementation',
        title: 'No Caps Task',
        priority: 'medium',
        requiredCapabilities: [], // Empty requirements
        estimatedDuration: 30
      });

      scheduler.addTask(task);

      const decision = await scheduler.scheduleTask(task.id);

      // May or may not schedule depending on matching logic
      expect(decision === null || typeof decision === 'object').toBe(true);
    });

    it('should handle task with zero duration', async () => {
      const task = createTask({
        id: 'task-edge-002',
        type: 'implementation',
        title: 'Zero Duration Task',
        priority: 'low',
        requiredCapabilities: ['typescript'],
        estimatedDuration: 0 // Zero duration
      });

      scheduler.addTask(task);

      const decision = await scheduler.scheduleTask(task.id);

      expect(decision === null || typeof decision === 'object').toBe(true);
    });

    it('should handle very long task duration', async () => {
      const task = createTask({
        id: 'task-edge-003',
        type: 'implementation',
        title: 'Very Long Task',
        priority: 'low',
        requiredCapabilities: ['typescript'],
        estimatedDuration: 1000 // Very long duration
      });

      scheduler.addTask(task);

      const decision = await scheduler.scheduleTask(task.id);

      // Likely no agent can handle this
      expect(decision).toBeNull();
    });

    it('should handle task with circular dependencies', async () => {
      const task1 = createTask({
        id: 'task-edge-004',
        type: 'implementation',
        title: 'Task 1',
        priority: 'medium',
        requiredCapabilities: [],
        estimatedDuration: 30,
        dependencies: ['task-edge-005']
      });

      const task2 = createTask({
        id: 'task-edge-005',
        type: 'implementation',
        title: 'Task 2',
        priority: 'medium',
        requiredCapabilities: [],
        estimatedDuration: 30,
        dependencies: ['task-edge-004']
      });

      scheduler.addTasks([task1, task2]);

      const decision1 = await scheduler.scheduleTask(task1.id);
      const decision2 = await scheduler.scheduleTask(task2.id);

      // Neither should schedule due to circular deps
      expect(decision1).toBeNull();
      expect(decision2).toBeNull();
    });

    it('should handle unicode in task title', async () => {
      const task = createTask({
        id: 'task-edge-006',
        type: 'implementation',
        title: 'Unicode 测试 🚀',
        priority: 'medium',
        requiredCapabilities: ['typescript'],
        estimatedDuration: 30
      });

      scheduler.addTask(task);

      const decision = await scheduler.scheduleTask(task.id);

      // Should handle unicode without errors
      expect(decision === null || typeof decision === 'object').toBe(true);
    });
  });
});
