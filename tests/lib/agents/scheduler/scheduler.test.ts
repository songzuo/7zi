/**
 * Tests for Agent Scheduler Core
 * Comprehensive coverage of scheduler functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  AgentScheduler,
  SchedulerConfig,
  SchedulingResult
} from '../../../../src/lib/agents/scheduler/core/scheduler';
import {
  Task,
  TaskPriority,
  TaskType,
  createTask
} from '../../../../src/lib/agents/scheduler/models/task-model';
import { initializeAgents } from '../../../../src/lib/agents/scheduler/models/agent-capability';

describe('AgentScheduler', () => {
  let scheduler: AgentScheduler;

  const testConfig: SchedulerConfig = {
    autoSchedule: false, // Disable for tests
    allowManualOverride: true,
    maxBatchSize: 10,
    schedulingInterval: 30000,
    loadBalance: {
      maxLoadThreshold: 90,
      busyThreshold: 70,
      preferLowLoad: true,
      considerSpecialization: true
    },
    enableLearning: true
  };

  beforeEach(() => {
    scheduler = new AgentScheduler(testConfig);
    scheduler.initialize();
  });

  afterEach(() => {
    scheduler.shutdown();
    scheduler.clearTasks();
  });

  describe('Initialization and Shutdown', () => {
    it('should initialize successfully', () => {
      const sched = new AgentScheduler();
      expect(() => sched.initialize()).not.toThrow();
      sched.shutdown();
    });

    it('should shutdown cleanly', () => {
      const sched = new AgentScheduler({ autoSchedule: true });
      sched.initialize();
      expect(() => sched.shutdown()).not.toThrow();
    });

    it('should start auto scheduling when enabled', () => {
      const sched = new AgentScheduler({ autoSchedule: true, schedulingInterval: 1000 });
      sched.initialize();
      sched.shutdown();
    });

    it('should not start auto scheduling when disabled', () => {
      const sched = new AgentScheduler({ autoSchedule: false });
      sched.initialize();
      sched.shutdown();
    });
  });

  describe('Task Management', () => {
    it('should add a single task', () => {
      const task = createTask({
        id: 'task-1',
        type: 'architecture',
        title: 'Design task'
      });

      scheduler.addTask(task);
      const retrieved = scheduler.getTask('task-1');

      expect(retrieved).toBeDefined();
      expect(retrieved?.title).toBe('Design task');
    });

    it('should add multiple tasks', () => {
      const tasks = [
        createTask({ id: 'task-1', type: 'architecture', title: 'Task 1' }),
        createTask({ id: 'task-2', type: 'implementation', title: 'Task 2' }),
        createTask({ id: 'task-3', type: 'testing', title: 'Task 3' })
      ];

      scheduler.addTasks(tasks);

      expect(scheduler.getTask('task-1')).toBeDefined();
      expect(scheduler.getTask('task-2')).toBeDefined();
      expect(scheduler.getTask('task-3')).toBeDefined();
    });

    it('should return undefined for non-existent task', () => {
      const task = scheduler.getTask('non-existent');
      expect(task).toBeUndefined();
    });

    it('should get all tasks', () => {
      scheduler.addTasks([
        createTask({ id: 'task-1', type: 'architecture', title: 'Task 1' }),
        createTask({ id: 'task-2', type: 'implementation', title: 'Task 2' })
      ]);

      const allTasks = scheduler.getAllTasks();
      expect(allTasks).toHaveLength(2);
    });

    it('should get pending tasks', () => {
      const task1 = createTask({ id: 'task-1', type: 'architecture', title: 'Task 1' });
      const task2 = createTask({ id: 'task-2', type: 'architecture', title: 'Task 2' });
      task2.status = 'in_progress';

      scheduler.addTasks([task1, task2]);

      const pending = scheduler.getPendingTasks();
      expect(pending).toHaveLength(1);
      expect(pending[0].id).toBe('task-1');
    });

    it('should get tasks by status', () => {
      const task1 = createTask({ id: 'task-1', type: 'architecture', title: 'Task 1' });
      const task2 = createTask({ id: 'task-2', type: 'architecture', title: 'Task 2' });
      task2.status = 'in_progress';

      scheduler.addTasks([task1, task2]);

      const inProgress = scheduler.getTasksByStatus('in_progress');
      expect(inProgress).toHaveLength(1);
    });

    it('should clear all tasks', () => {
      scheduler.addTasks([
        createTask({ id: 'task-1', type: 'architecture', title: 'Task 1' }),
        createTask({ id: 'task-2', type: 'architecture', title: 'Task 2' })
      ]);

      scheduler.clearTasks();

      expect(scheduler.getAllTasks()).toHaveLength(0);
    });

    it('should get task statistics', () => {
      scheduler.addTasks([
        createTask({ id: 'task-1', type: 'architecture', title: 'Task 1' }),
        createTask({ id: 'task-2', type: 'architecture', title: 'Task 2', priority: 'high' })
      ]);

      const stats = scheduler.getTaskStats();

      expect(stats.total).toBe(2);
      expect(stats.pending).toBe(2);
    });
  });

  describe('Agent Management', () => {
    it('should get all agents', () => {
      const agents = scheduler.getAgents();
      expect(agents.size).toBeGreaterThan(0);
    });

    it('should get agent by ID', () => {
      const agent = scheduler.getAgent('architect');
      expect(agent).toBeDefined();
      expect(agent?.name).toBe('架构师');
    });

    it('should return undefined for non-existent agent', () => {
      const agent = scheduler.getAgent('non-existent');
      expect(agent).toBeUndefined();
    });

    it('should update agent availability', () => {
      scheduler.setAgentAvailability('architect', false);
      const agent = scheduler.getAgent('architect');

      expect(agent?.availability).toBe(false);

      scheduler.setAgentAvailability('architect', true);
      expect(scheduler.getAgent('architect')?.availability).toBe(true);
    });
  });

  describe('Task Scheduling', () => {
    it('should schedule a task successfully', async () => {
      const task = createTask({
        id: 'task-1',
        type: 'architecture',
        title: 'Architecture design',
        priority: 'high',
        estimatedDuration: 20
      });

      scheduler.addTask(task);
      const decision = await scheduler.scheduleTask('task-1');

      expect(decision).not.toBeNull();
      expect(decision?.taskId).toBe('task-1');
      expect(decision?.assignedAgent).toBeDefined();
      expect(decision?.confidence).toBeGreaterThan(0);
    });

    it('should return null for non-existent task', async () => {
      const decision = await scheduler.scheduleTask('non-existent');
      expect(decision).toBeNull();
    });

    it('should return null when dependencies not satisfied', async () => {
      const task = createTask({
        id: 'task-1',
        type: 'architecture',
        title: 'Blocked task',
        dependencies: ['dep-1']
      });

      scheduler.addTask(task);
      const decision = await scheduler.scheduleTask('task-1');

      expect(decision).toBeNull();
    });

    it('should include alternative agents in decision', async () => {
      const task = createTask({
        id: 'task-1',
        type: 'architecture',
        title: 'Architecture task',
        estimatedDuration: 20
      });

      scheduler.addTask(task);
      const decision = await scheduler.scheduleTask('task-1');

      expect(decision?.alternativeAgents).toBeDefined();
      expect(Array.isArray(decision?.alternativeAgents)).toBe(true);
    });

    it('should calculate scores in decision', async () => {
      const task = createTask({
        id: 'task-1',
        type: 'architecture',
        title: 'Architecture task',
        estimatedDuration: 20
      });

      scheduler.addTask(task);
      const decision = await scheduler.scheduleTask('task-1');

      expect(decision?.scores).toBeDefined();
      expect(decision?.scores.capability).toBeGreaterThanOrEqual(0);
      expect(decision?.scores.load).toBeGreaterThanOrEqual(0);
      expect(decision?.scores.performance).toBeGreaterThanOrEqual(0);
      expect(decision?.scores.total).toBeGreaterThan(0);
    });
  });

  describe('Batch Scheduling', () => {
    it('should schedule next batch', async () => {
      const tasks = [
        createTask({ id: 'task-1', type: 'architecture', title: 'Task 1' }),
        createTask({ id: 'task-2', type: 'implementation', title: 'Task 2' }),
        createTask({ id: 'task-3', type: 'testing', title: 'Task 3' })
      ];

      scheduler.addTasks(tasks);
      const result = await scheduler.scheduleNextBatch();

      expect(result.success).toBe(true);
      expect(result.scheduled.length).toBeGreaterThan(0);
      expect(result.failed.length).toBe(0);
    });

    it('should respect max batch size', async () => {
      const tasks = [];
      for (let i = 0; i < 20; i++) {
        tasks.push(createTask({
          id: `task-${i}`,
          type: 'general',
          title: `Task ${i}`
        }));
      }

      scheduler.addTasks(tasks);
      const result = await scheduler.scheduleNextBatch();

      expect(result.scheduled.length).toBeLessThanOrEqual(testConfig.maxBatchSize);
    });

    it('should return empty result when no pending tasks', async () => {
      const result = await scheduler.scheduleNextBatch();

      expect(result.success).toBe(true);
      expect(result.scheduled).toHaveLength(0);
      expect(result.stats.totalPending).toBe(0);
    });

    it('should report failed scheduling attempts', async () => {
      // Create a task type that no agent can handle
      const task = createTask({
        id: 'task-1',
        type: 'architecture',
        title: 'Task requiring unavailable capability',
        requiredCapabilities: ['non-existent-capability']
      });

      // Make agents unavailable
      for (const agent of scheduler.getAgents().values()) {
        agent.availability = false;
      }

      scheduler.addTask(task);
      const result = await scheduler.scheduleNextBatch();

      // Should fail since no agents are available
      expect(result.failed.length).toBeGreaterThan(0);
    });
  });

  describe('Manual Assignment', () => {
    it('should manually assign task to agent', () => {
      const task = createTask({
        id: 'task-1',
        type: 'architecture',
        title: 'Manual assignment'
      });

      scheduler.addTask(task);
      const decision = scheduler.manualAssign('task-1', 'architect', 'user-1');

      expect(decision).not.toBeNull();
      expect(decision?.assignedAgent).toBe('architect');
      expect(decision?.manualOverride).toBe(true);
      expect(decision?.overrideBy).toBe('user-1');
      expect(decision?.confidence).toBe(1.0);
    });

    it('should throw error when manual override not allowed', () => {
      const restrictedScheduler = new AgentScheduler({
        ...testConfig,
        allowManualOverride: false
      });

      const task = createTask({
        id: 'task-1',
        type: 'architecture',
        title: 'Manual assignment'
      });

      restrictedScheduler.addTask(task);

      expect(() => {
        restrictedScheduler.manualAssign('task-1', 'architect', 'user-1');
      }).toThrow('Manual override is not allowed');
    });

    it('should throw error for non-existent task', () => {
      expect(() => {
        scheduler.manualAssign('non-existent', 'architect', 'user-1');
      }).toThrow('Task non-existent not found');
    });

    it('should throw error for non-existent agent', () => {
      const task = createTask({
        id: 'task-1',
        type: 'architecture',
        title: 'Task'
      });

      scheduler.addTask(task);

      expect(() => {
        scheduler.manualAssign('task-1', 'non-existent', 'user-1');
      }).toThrow('Agent non-existent not found');
    });

    it('should throw error for unavailable agent', () => {
      const task = createTask({
        id: 'task-1',
        type: 'architecture',
        title: 'Task'
      });

      scheduler.addTask(task);
      scheduler.setAgentAvailability('architect', false);

      expect(() => {
        scheduler.manualAssign('task-1', 'architect', 'user-1');
      }).toThrow('Agent architect is not available');
    });

    it('should throw error when agent at capacity', () => {
      const task = createTask({
        id: 'task-1',
        type: 'architecture',
        title: 'Large task',
        estimatedDuration: 120
      });

      scheduler.addTask(task);

      // Set agent to near capacity
      const agent = scheduler.getAgent('architect');
      if (agent) {
        agent.currentLoad = 90;
      }

      expect(() => {
        scheduler.manualAssign('task-1', 'architect', 'user-1');
      }).toThrow('does not have sufficient capacity');
    });
  });

  describe('Task Lifecycle', () => {
    it('should start task', async () => {
      const task = createTask({
        id: 'task-1',
        type: 'architecture',
        title: 'Task'
      });

      scheduler.addTask(task);
      await scheduler.scheduleTask('task-1');
      scheduler.startTask('task-1');

      const updatedTask = scheduler.getTask('task-1');
      expect(updatedTask?.status).toBe('in_progress');
      expect(updatedTask?.startedAt).toBeDefined();
    });

    it('should complete task', async () => {
      const task = createTask({
        id: 'task-1',
        type: 'architecture',
        title: 'Task',
        estimatedDuration: 30
      });

      scheduler.addTask(task);
      await scheduler.scheduleTask('task-1');
      scheduler.startTask('task-1');
      scheduler.completeTask('task-1');

      const updatedTask = scheduler.getTask('task-1');
      expect(updatedTask?.status).toBe('completed');
      expect(updatedTask?.completedAt).toBeDefined();
    });

    it('should fail task with error', async () => {
      const task = createTask({
        id: 'task-1',
        type: 'architecture',
        title: 'Task',
        estimatedDuration: 30
      });

      scheduler.addTask(task);
      await scheduler.scheduleTask('task-1');
      scheduler.failTask('task-1', 'Something went wrong');

      const updatedTask = scheduler.getTask('task-1');
      expect(updatedTask?.status).toBe('failed');
      expect(updatedTask?.error).toBe('Something went wrong');
    });

    it('should reassign failed task', async () => {
      const task = createTask({
        id: 'task-1',
        type: 'architecture',
        title: 'Task',
        estimatedDuration: 30
      });

      scheduler.addTask(task);
      const firstDecision = await scheduler.scheduleTask('task-1');

      if (firstDecision?.assignedAgent) {
        scheduler.failTask('task-1', 'Failed');
      }

      const newDecision = await scheduler.reassignTask('task-1');

      expect(newDecision).not.toBeNull();
      expect(newDecision?.taskId).toBe('task-1');
    });

    it('should return null when reassigning non-existent task', async () => {
      const decision = await scheduler.reassignTask('non-existent');
      expect(decision).toBeNull();
    });
  });

  describe('Schedule History', () => {
    it('should record scheduling decisions', async () => {
      const task = createTask({
        id: 'task-1',
        type: 'architecture',
        title: 'Task'
      });

      scheduler.addTask(task);
      await scheduler.scheduleTask('task-1');

      const history = scheduler.getScheduleHistory();
      expect(history).toBeDefined();
    });

    it('should get recent decisions', async () => {
      const tasks = [
        createTask({ id: 'task-1', type: 'architecture', title: 'Task 1' }),
        createTask({ id: 'task-2', type: 'architecture', title: 'Task 2' }),
        createTask({ id: 'task-3', type: 'architecture', title: 'Task 3' })
      ];

      scheduler.addTasks(tasks);
      await scheduler.scheduleNextBatch();

      const recent = scheduler.getRecentDecisions(2);
      expect(recent.length).toBeLessThanOrEqual(2);
    });

    it('should get scheduling metrics', async () => {
      const task = createTask({
        id: 'task-1',
        type: 'architecture',
        title: 'Task'
      });

      scheduler.addTask(task);
      await scheduler.scheduleTask('task-1');
      scheduler.completeTask('task-1');

      const metrics = scheduler.getMetrics();
      expect(metrics).toBeDefined();
    });
  });

  describe('Load Statistics', () => {
    it('should get load statistics', async () => {
      const stats = scheduler.getLoadStats();

      expect(stats).toBeDefined();
      expect(stats.averageLoad).toBeDefined();
      expect(stats.maxLoad).toBeDefined();
      expect(stats.minLoad).toBeDefined();
    });

    it('should get scaling suggestion', () => {
      const suggestion = scheduler.getScalingSuggestion();

      expect(suggestion).toBeDefined();
      expect(['scale-up', 'scale-down', 'none']).toContain(suggestion.action);
      expect(suggestion.reason).toBeDefined();
    });
  });

  describe('Configuration Update', () => {
    it('should update configuration', () => {
      scheduler.updateConfig({
        maxBatchSize: 5,
        schedulingInterval: 60000
      });

      // Configuration should be updated
      expect(() => scheduler.updateConfig({ maxBatchSize: 20 })).not.toThrow();
    });

    it('should update load balance config', () => {
      scheduler.updateConfig({
        loadBalance: {
          maxLoadThreshold: 85,
          busyThreshold: 60,
          preferLowLoad: false,
          considerSpecialization: true
        }
      });

      // Should not throw
      expect(() => scheduler.getLoadStats()).not.toThrow();
    });

    it('should restart auto scheduling when interval changes', () => {
      const sched = new AgentScheduler({ autoSchedule: true, schedulingInterval: 1000 });
      sched.initialize();

      sched.updateConfig({ schedulingInterval: 2000 });

      sched.shutdown();
    });
  });

  describe('Learning Integration', () => {
    it('should get learning summary', () => {
      const summary = scheduler.getLearningSummary();

      expect(summary).toBeDefined();
      expect(summary.totalDecisions).toBeDefined();
    });

    it('should get weight adjustments', () => {
      const adjustments = scheduler.getWeightAdjustments();

      expect(Array.isArray(adjustments)).toBe(true);
    });

    it('should apply weight adjustments', () => {
      // Should not throw
      expect(() => scheduler.applyWeightAdjustments()).not.toThrow();
    });

    it('should get learner instance', () => {
      const learner = scheduler.getLearner();
      expect(learner).toBeDefined();
    });
  });

  describe('State Export', () => {
    it('should export scheduler state', async () => {
      scheduler.addTask(createTask({
        id: 'task-1',
        type: 'architecture',
        title: 'Task'
      }));

      await scheduler.scheduleTask('task-1');

      const exported = scheduler.export();

      expect(typeof exported).toBe('string');

      const parsed = JSON.parse(exported);
      expect(parsed).toHaveProperty('config');
      expect(parsed).toHaveProperty('agents');
      expect(parsed).toHaveProperty('tasks');
    });
  });

  describe('Reset', () => {
    it('should reset scheduler state', async () => {
      scheduler.addTask(createTask({
        id: 'task-1',
        type: 'architecture',
        title: 'Task'
      }));

      await scheduler.scheduleTask('task-1');
      scheduler.reset();

      expect(scheduler.getAllTasks()).toHaveLength(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle task without assigned agent on completion', () => {
      const task = createTask({
        id: 'task-1',
        type: 'architecture',
        title: 'Unassigned task'
      });

      scheduler.addTask(task);

      // Should not throw
      expect(() => scheduler.completeTask('task-1')).not.toThrow();
    });

    it('should handle task without assigned agent on failure', () => {
      const task = createTask({
        id: 'task-1',
        type: 'architecture',
        title: 'Unassigned task'
      });

      scheduler.addTask(task);

      // Should not throw
      expect(() => scheduler.failTask('task-1', 'Error')).not.toThrow();
    });

    it('should handle multiple calls to initialize', () => {
      expect(() => {
        scheduler.initialize();
        scheduler.initialize();
      }).not.toThrow();
    });

    it('should handle multiple calls to shutdown', () => {
      scheduler.shutdown();
      expect(() => scheduler.shutdown()).not.toThrow();
    });

    it('should handle empty task queue', async () => {
      const result = await scheduler.scheduleNextBatch();

      expect(result.success).toBe(true);
      expect(result.scheduled).toHaveLength(0);
    });
  });
});
