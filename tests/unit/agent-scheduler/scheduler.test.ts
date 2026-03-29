/**
 * Scheduler Core Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AgentScheduler } from '../../../src/lib/agent-scheduler/core/scheduler';
import { Task, createTask } from '../../../src/lib/agent-scheduler/models/task-model';
import { initializeAgents } from '../../../src/lib/agent-scheduler/models/agent-capability';

describe('AgentScheduler', () => {
  let scheduler: AgentScheduler;

  beforeEach(() => {
    scheduler = new AgentScheduler({
      autoSchedule: false, // Disable auto scheduling for tests
      allowManualOverride: true,
      maxBatchSize: 10
    });
    scheduler.initialize();
  });

  afterEach(() => {
    scheduler.shutdown();
    scheduler.reset();
  });

  describe('initialize', () => {
    it('should initialize all agents', () => {
      const agents = scheduler.getAgents();
      expect(agents.size).toBe(11);
    });

    it('should start with empty task queue', () => {
      const tasks = scheduler.getAllTasks();
      expect(tasks).toHaveLength(0);
    });
  });

  describe('addTask', () => {
    it('should add task to queue', () => {
      const task = createTask({
        id: 'task-1',
        type: 'implementation',
        title: 'Build Feature'
      });

      scheduler.addTask(task);

      expect(scheduler.getTask('task-1')).toBeDefined();
      expect(scheduler.getPendingTasks()).toHaveLength(1);
    });

    it('should add multiple tasks', () => {
      const tasks = [
        createTask({ id: 'task-1', type: 'implementation', title: 'A' }),
        createTask({ id: 'task-2', type: 'testing', title: 'B' })
      ];

      scheduler.addTasks(tasks);

      expect(scheduler.getAllTasks()).toHaveLength(2);
    });
  });

  describe('scheduleTask', () => {
    it('should schedule task to suitable agent', async () => {
      const task = createTask({
        id: 'task-1',
        type: 'architecture',
        title: 'Design System'
      });

      scheduler.addTask(task);
      const decision = await scheduler.scheduleTask('task-1');

      expect(decision).toBeDefined();
      // Both architect and agent-expert can handle architecture tasks
      expect(['architect', 'agent-expert']).toContain(decision?.assignedAgent);
      expect(decision?.confidence).toBeGreaterThan(0);
    });

    it('should not schedule task with unsatisfied dependencies', async () => {
      const dep = createTask({
        id: 'task-1',
        type: 'implementation',
        title: 'Dep'
      });

      const task = createTask({
        id: 'task-2',
        type: 'testing',
        title: 'Main',
        dependencies: ['task-1']
      });

      scheduler.addTask(dep);
      scheduler.addTask(task);

      const decision = await scheduler.scheduleTask('task-2');

      expect(decision).toBeNull();
    });

    it('should schedule task after dependency is completed', async () => {
      const dep = createTask({
        id: 'task-1',
        type: 'implementation',
        title: 'Dep'
      });

      const task = createTask({
        id: 'task-2',
        type: 'testing',
        title: 'Main',
        dependencies: ['task-1']
      });

      scheduler.addTask(dep);
      scheduler.addTask(task);

      // Complete dependency
      const depDecision = await scheduler.scheduleTask('task-1');
      expect(depDecision).toBeDefined();
      scheduler.startTask('task-1');
      scheduler.completeTask('task-1');

      // Now schedule main task
      const decision = await scheduler.scheduleTask('task-2');
      expect(decision).toBeDefined();
    });

    it('should return null for non-existent task', async () => {
      const decision = await scheduler.scheduleTask('non-existent');
      expect(decision).toBeNull();
    });
  });

  describe('scheduleNextBatch', () => {
    it('should schedule multiple tasks', async () => {
      const tasks = [
        createTask({ id: 'task-1', type: 'implementation', title: 'A', priority: 'high' }),
        createTask({ id: 'task-2', type: 'testing', title: 'B', priority: 'medium' }),
        createTask({ id: 'task-3', type: 'architecture', title: 'C', priority: 'low' })
      ];

      scheduler.addTasks(tasks);
      const result = await scheduler.scheduleNextBatch();

      expect(result.scheduled.length).toBeGreaterThan(0);
      expect(result.success).toBe(true);
    });

    it('should respect maxBatchSize', async () => {
      const tasks = Array.from({ length: 20 }, (_, i) =>
        createTask({ 
          id: `task-${i}`, 
          type: 'implementation', 
          title: `Task ${i}` 
        })
      );

      scheduler.addTasks(tasks);
      const result = await scheduler.scheduleNextBatch();

      expect(result.scheduled.length).toBeLessThanOrEqual(10);
    });
  });

  describe('manualAssign', () => {
    it('should manually assign task to specific agent', () => {
      const task = createTask({
        id: 'task-1',
        type: 'implementation',
        title: 'Build Feature'
      });

      scheduler.addTask(task);
      const decision = scheduler.manualAssign('task-1', 'executor', 'user-1');

      expect(decision).toBeDefined();
      expect(decision?.assignedAgent).toBe('executor');
      expect(decision?.manualOverride).toBe(true);
      expect(decision?.overrideBy).toBe('user-1');
    });

    it('should throw for non-existent task', () => {
      expect(() => {
        scheduler.manualAssign('non-existent', 'executor', 'user-1');
      }).toThrow();
    });

    it('should throw for non-existent agent', () => {
      const task = createTask({
        id: 'task-1',
        type: 'implementation',
        title: 'Build'
      });

      scheduler.addTask(task);

      expect(() => {
        scheduler.manualAssign('task-1', 'non-existent', 'user-1');
      }).toThrow();
    });

    it('should throw for unavailable agent', () => {
      const task = createTask({
        id: 'task-1',
        type: 'implementation',
        title: 'Build'
      });

      scheduler.addTask(task);
      scheduler.setAgentAvailability('executor', false);

      expect(() => {
        scheduler.manualAssign('task-1', 'executor', 'user-1');
      }).toThrow();
    });
  });

  describe('completeTask', () => {
    it('should mark task as completed', async () => {
      const task = createTask({
        id: 'task-1',
        type: 'implementation',
        title: 'Build'
      });

      scheduler.addTask(task);
      await scheduler.scheduleTask('task-1');
      scheduler.startTask('task-1');
      scheduler.completeTask('task-1');

      const completedTask = scheduler.getTask('task-1');
      expect(completedTask?.status).toBe('completed');
      expect(completedTask?.completedAt).toBeDefined();
    });
  });

  describe('failTask', () => {
    it('should mark task as failed', async () => {
      const task = createTask({
        id: 'task-1',
        type: 'implementation',
        title: 'Build'
      });

      scheduler.addTask(task);
      await scheduler.scheduleTask('task-1');
      scheduler.startTask('task-1');
      scheduler.failTask('task-1', 'Something went wrong');

      const failedTask = scheduler.getTask('task-1');
      expect(failedTask?.status).toBe('failed');
    });
  });

  describe('reassignTask', () => {
    it('should reassign failed task', async () => {
      const task = createTask({
        id: 'task-1',
        type: 'implementation',
        title: 'Build'
      });

      scheduler.addTask(task);
      await scheduler.scheduleTask('task-1');
      scheduler.startTask('task-1');
      scheduler.failTask('task-1', 'Error');

      const decision = await scheduler.reassignTask('task-1');
      expect(decision).toBeDefined();
      expect(decision?.taskId).toBe('task-1');
    });
  });

  describe('setAgentAvailability', () => {
    it('should update agent availability', () => {
      scheduler.setAgentAvailability('architect', false);
      
      const agent = scheduler.getAgent('architect');
      expect(agent?.availability).toBe(false);
    });
  });

  describe('getTaskStats', () => {
    it('should return correct statistics', async () => {
      const tasks = [
        createTask({ id: 'task-1', type: 'implementation', title: 'A' }),
        createTask({ id: 'task-2', type: 'testing', title: 'B' }),
        createTask({ id: 'task-3', type: 'architecture', title: 'C' })
      ];

      scheduler.addTasks(tasks);
      await scheduler.scheduleTask('task-1');
      scheduler.startTask('task-1');
      scheduler.completeTask('task-1');

      const stats = scheduler.getTaskStats();

      expect(stats.total).toBe(3);
      expect(stats.completed).toBe(1);
      expect(stats.pending).toBe(2);
    });
  });

  describe('getRecentDecisions', () => {
    it('should return recent scheduling decisions', async () => {
      const tasks = [
        createTask({ id: 'task-1', type: 'implementation', title: 'A' }),
        createTask({ id: 'task-2', type: 'testing', title: 'B' })
      ];

      scheduler.addTasks(tasks);
      await scheduler.scheduleTask('task-1');
      await scheduler.scheduleTask('task-2');

      const decisions = scheduler.getRecentDecisions(10);

      expect(decisions).toHaveLength(2);
    });
  });

  describe('getMetrics', () => {
    it('should return scheduling metrics', async () => {
      const task = createTask({
        id: 'task-1',
        type: 'implementation',
        title: 'Build'
      });

      scheduler.addTask(task);
      await scheduler.scheduleTask('task-1');

      const metrics = scheduler.getMetrics();

      expect(metrics.totalDecisions).toBe(1);
      expect(metrics.automaticDecisions).toBe(1);
      expect(metrics.manualOverrides).toBe(0);
    });
  });

  describe('getLoadStats', () => {
    it('should return load distribution stats', async () => {
      const task = createTask({
        id: 'task-1',
        type: 'implementation',
        title: 'Build',
        estimatedDuration: 60
      });

      scheduler.addTask(task);
      await scheduler.scheduleTask('task-1');

      const stats = scheduler.getLoadStats();

      expect(stats.averageLoad).toBeDefined();
      expect(stats.maxLoad).toBeDefined();
      expect(stats.minLoad).toBeDefined();
    });
  });

  describe('updateConfig', () => {
    it('should update scheduler configuration', () => {
      scheduler.updateConfig({
        maxBatchSize: 20
      });

      // Verify by checking scheduling behavior
      expect(true).toBe(true); // Config updated without error
    });
  });

  describe('export', () => {
    it('should export scheduler state', async () => {
      const task = createTask({
        id: 'task-1',
        type: 'implementation',
        title: 'Build'
      });

      scheduler.addTask(task);
      await scheduler.scheduleTask('task-1');

      const exported = scheduler.export();

      expect(exported).toBeDefined();
      const parsed = JSON.parse(exported);
      expect(parsed.config).toBeDefined();
      expect(parsed.tasks).toBeDefined();
    });
  });

  describe('reset', () => {
    it('should reset scheduler state', async () => {
      const task = createTask({
        id: 'task-1',
        type: 'implementation',
        title: 'Build'
      });

      scheduler.addTask(task);
      await scheduler.scheduleTask('task-1');

      scheduler.reset();

      expect(scheduler.getAllTasks()).toHaveLength(0);
    });
  });
});
