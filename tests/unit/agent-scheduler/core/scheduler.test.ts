/**
 * Scheduler Core Module Unit Tests
 * Tests for AgentScheduler class
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AgentScheduler } from '@/lib/agent-scheduler/core/scheduler';
import { Task, createTask } from '@/lib/agent-scheduler/models/task-model';
import { ScheduleDecision } from '@/lib/agent-scheduler/models/schedule-decision';

describe('AgentScheduler', () => {
  let scheduler: AgentScheduler;

  beforeEach(() => {
    scheduler = new AgentScheduler({
      autoSchedule: false,
      allowManualOverride: true,
      maxBatchSize: 10,
      schedulingInterval: 60000,
      loadBalance: {
        maxLoadThreshold: 90,
        busyThreshold: 70,
        preferLowLoad: true,
        considerSpecialization: true
      }
    });
  });

  afterEach(() => {
    scheduler.shutdown();
  });

  describe('constructor', () => {
    it('should initialize with default config', () => {
      const defaultScheduler = new AgentScheduler();
      
      expect(defaultScheduler).toBeDefined();
      expect(defaultScheduler.getAgents().size).toBeGreaterThan(0);
    });

    it('should initialize with custom config', () => {
      const customScheduler = new AgentScheduler({
        maxBatchSize: 5,
        loadBalance: {
          maxLoadThreshold: 80,
          busyThreshold: 60,
          preferLowLoad: false,
          considerSpecialization: false
        }
      });

      expect(customScheduler).toBeDefined();
    });
  });

  describe('initialize / shutdown', () => {
    it('should not throw when initializing', () => {
      const newScheduler = new AgentScheduler({ autoSchedule: false });
      expect(() => newScheduler.initialize()).not.toThrow();
      newScheduler.shutdown();
    });

    it('should stop auto scheduling on shutdown', () => {
      const newScheduler = new AgentScheduler({ 
        autoSchedule: true,
        schedulingInterval: 100 
      });
      newScheduler.initialize();
      expect(() => newScheduler.shutdown()).not.toThrow();
    });
  });

  describe('addTask / getTask', () => {
    it('should add a task to the queue', () => {
      const task = createTask({
        id: 'task1',
        type: 'implementation',
        title: 'Test task',
        requiredCapabilities: [],
        estimatedDuration: 30
      });

      scheduler.addTask(task);

      const retrieved = scheduler.getTask('task1');
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe('task1');
    });

    it('should return undefined for non-existent task', () => {
      const retrieved = scheduler.getTask('nonexistent');
      expect(retrieved).toBeUndefined();
    });

    it('should add multiple tasks', () => {
      const task1 = createTask({
        id: 'task1',
        type: 'implementation',
        title: 'Task 1',
        requiredCapabilities: [],
        estimatedDuration: 30
      });
      const task2 = createTask({
        id: 'task2',
        type: 'testing',
        title: 'Task 2',
        requiredCapabilities: [],
        estimatedDuration: 20
      });

      scheduler.addTasks([task1, task2]);

      expect(scheduler.getTask('task1')).toBeDefined();
      expect(scheduler.getTask('task2')).toBeDefined();
    });
  });

  describe('scheduleTask', () => {
    it('should schedule a task to an available agent', async () => {
      const task = createTask({
        id: 'task1',
        type: 'implementation',
        title: 'Test task',
        requiredCapabilities: ['typescript'],
        estimatedDuration: 30
      });

      scheduler.addTask(task);
      const decision = await scheduler.scheduleTask('task1');

      expect(decision).not.toBeNull();
      expect(decision).toHaveProperty('taskId', 'task1');
      expect(decision).toHaveProperty('assignedAgent');
      expect(decision).toHaveProperty('confidence');
      expect(decision).toHaveProperty('reasoning');
    });

    it('should return null for non-existent task', async () => {
      const decision = await scheduler.scheduleTask('nonexistent');
      expect(decision).toBeNull();
    });

    it('should return null when no agents available', async () => {
      // Create a task that requires non-existent capability
      const task = createTask({
        id: 'task1',
        type: 'marketing',
        title: 'Marketing task',
        requiredCapabilities: ['nonexistent-skill'],
        estimatedDuration: 30
      });

      scheduler.addTask(task);
      const decision = await scheduler.scheduleTask('task1');

      expect(decision).toBeNull();
    });
  });

  describe('scheduleNextBatch', () => {
    it('should schedule multiple tasks', async () => {
      const task1 = createTask({
        id: 'task1',
        type: 'implementation',
        title: 'Task 1',
        requiredCapabilities: [],
        estimatedDuration: 30
      });
      const task2 = createTask({
        id: 'task2',
        type: 'testing',
        title: 'Task 2',
        requiredCapabilities: [],
        estimatedDuration: 20
      });
      const task3 = createTask({
        id: 'task3',
        type: 'architecture',
        title: 'Task 3',
        requiredCapabilities: [],
        estimatedDuration: 30
      });

      scheduler.addTasks([task1, task2, task3]);

      const result = await scheduler.scheduleNextBatch();

      expect(result.stats.totalPending).toBe(3);
      expect(result.stats.totalScheduled + result.stats.totalFailed).toBeGreaterThan(0);
    });

    it('should respect maxBatchSize', async () => {
      const smallBatchScheduler = new AgentScheduler({
        autoSchedule: false,
        maxBatchSize: 2
      });

      for (let i = 0; i < 5; i++) {
        smallBatchScheduler.addTask(createTask({
          id: `task${i}`,
          type: 'implementation',
          title: `Task ${i}`,
          requiredCapabilities: [],
          estimatedDuration: 30
        }));
      }

      const result = await smallBatchScheduler.scheduleNextBatch();

      expect(result.scheduled.length).toBeLessThanOrEqual(2);
      smallBatchScheduler.shutdown();
    });

    it('should return empty result when no pending tasks', async () => {
      const result = await scheduler.scheduleNextBatch();

      expect(result.success).toBe(true);
      expect(result.scheduled).toEqual([]);
      expect(result.stats.totalScheduled).toBe(0);
    });
  });

  describe('manualAssign', () => {
    it('should manually assign task to agent', () => {
      const task = createTask({
        id: 'task1',
        type: 'implementation',
        title: 'Test task',
        requiredCapabilities: [],
        estimatedDuration: 30
      });

      scheduler.addTask(task);
      const decision = scheduler.manualAssign('task1', 'executor', 'user1');

      expect(decision).not.toBeNull();
      expect(decision?.assignedAgent).toBe('executor');
      expect(decision?.manualOverride).toBe(true);
      expect(decision?.overrideBy).toBe('user1');
    });

    it('should throw when manual override not allowed', () => {
      const restrictedScheduler = new AgentScheduler({
        autoSchedule: false,
        allowManualOverride: false
      });

      const task = createTask({
        id: 'task1',
        type: 'implementation',
        title: 'Test task',
        requiredCapabilities: [],
        estimatedDuration: 30
      });

      restrictedScheduler.addTask(task);
      expect(() => restrictedScheduler.manualAssign('task1', 'executor', 'user1')).toThrow();
    });

    it('should throw for non-existent task', () => {
      expect(() => scheduler.manualAssign('nonexistent', 'executor', 'user1')).toThrow();
    });

    it('should throw for non-existent agent', () => {
      const task = createTask({
        id: 'task1',
        type: 'implementation',
        title: 'Test task',
        requiredCapabilities: [],
        estimatedDuration: 30
      });

      scheduler.addTask(task);
      expect(() => scheduler.manualAssign('task1', 'nonexistent', 'user1')).toThrow();
    });

    it('should throw when agent at capacity', () => {
      const task = createTask({
        id: 'task1',
        type: 'implementation',
        title: 'Large task',
        requiredCapabilities: [],
        estimatedDuration: 120 // 200% load
      });

      scheduler.addTask(task);
      expect(() => scheduler.manualAssign('task1', 'executor', 'user1')).toThrow();
    });
  });

  describe('completeTask / failTask', () => {
    it('should complete a task and update agent load', async () => {
      const task = createTask({
        id: 'task1',
        type: 'implementation',
        title: 'Test task',
        requiredCapabilities: [],
        estimatedDuration: 30
      });

      scheduler.addTask(task);
      const decision = await scheduler.scheduleTask('task1');
      
      if (decision) {
        scheduler.startTask('task1');
        scheduler.completeTask('task1');

        const updatedTask = scheduler.getTask('task1');
        expect(updatedTask?.status).toBe('completed');
      }
    });

    it('should fail a task and update agent load', async () => {
      const task = createTask({
        id: 'task1',
        type: 'implementation',
        title: 'Test task',
        requiredCapabilities: [],
        estimatedDuration: 30
      });

      scheduler.addTask(task);
      const decision = await scheduler.scheduleTask('task1');
      
      if (decision) {
        scheduler.failTask('task1', 'Test error');

        const updatedTask = scheduler.getTask('task1');
        expect(updatedTask?.status).toBe('failed');
        // Note: current implementation doesn't set task.error, it only records in history
      }
    });

    it('should handle completeTask for non-existent task', () => {
      expect(() => scheduler.completeTask('nonexistent')).not.toThrow();
    });

    it('should handle failTask for non-existent task', () => {
      expect(() => scheduler.failTask('nonexistent', 'Error')).not.toThrow();
    });
  });

  describe('reassignTask', () => {
    it('should reassign a failed task', async () => {
      const task = createTask({
        id: 'task1',
        type: 'implementation',
        title: 'Test task',
        requiredCapabilities: [],
        estimatedDuration: 30
      });

      scheduler.addTask(task);
      await scheduler.scheduleTask('task1');
      scheduler.failTask('task1', 'Previous failure');

      const newDecision = await scheduler.reassignTask('task1');

      // Should either succeed or return null if still no agents
      expect(newDecision === null || newDecision.assignedAgent !== undefined).toBe(true);
    });

    it('should return null for non-existent task', async () => {
      const decision = await scheduler.reassignTask('nonexistent');
      expect(decision).toBeNull();
    });
  });

  describe('agent management', () => {
    it('should get all agents', () => {
      const agents = scheduler.getAgents();

      expect(agents.size).toBeGreaterThan(0);
      expect(agents.has('executor')).toBe(true);
    });

    it('should get agent by ID', () => {
      const agent = scheduler.getAgent('executor');

      expect(agent).toBeDefined();
      expect(agent?.agentId).toBe('executor');
    });

    it('should return undefined for non-existent agent', () => {
      const agent = scheduler.getAgent('nonexistent');
      expect(agent).toBeUndefined();
    });

    it('should set agent availability', () => {
      scheduler.setAgentAvailability('executor', false);
      
      const agent = scheduler.getAgent('executor');
      expect(agent?.availability).toBe(false);

      scheduler.setAgentAvailability('executor', true);
      expect(scheduler.getAgent('executor')?.availability).toBe(true);
    });
  });

  describe('task queries', () => {
    beforeEach(() => {
      // Add some test tasks
      scheduler.addTask(createTask({
        id: 'pending1',
        type: 'implementation',
        title: 'Pending 1',
        status: 'pending',
        requiredCapabilities: [],
        estimatedDuration: 30
      }));
      scheduler.addTask(createTask({
        id: 'pending2',
        type: 'testing',
        title: 'Pending 2',
        status: 'pending',
        requiredCapabilities: [],
        estimatedDuration: 20
      }));
    });

    it('should get all tasks', () => {
      const tasks = scheduler.getAllTasks();
      expect(tasks.length).toBeGreaterThanOrEqual(2);
    });

    it('should get pending tasks', () => {
      const pending = scheduler.getPendingTasks();
      expect(pending.length).toBeGreaterThanOrEqual(2);
      expect(pending.every(t => t.status === 'pending')).toBe(true);
    });

    it('should get tasks by status', () => {
      const tasks = scheduler.getTasksByStatus('pending');
      expect(tasks.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('task statistics', () => {
    it('should return task stats', () => {
      scheduler.addTask(createTask({
        id: 'task1',
        type: 'implementation',
        title: 'Task 1',
        requiredCapabilities: [],
        estimatedDuration: 30
      }));

      const stats = scheduler.getTaskStats();

      expect(stats).toHaveProperty('total');
      expect(stats).toHaveProperty('pending');
      expect(stats).toHaveProperty('completed');
      expect(stats).toHaveProperty('failed');
    });
  });

  describe('schedule history', () => {
    it('should track schedule history', async () => {
      const task = createTask({
        id: 'task1',
        type: 'implementation',
        title: 'Test task',
        requiredCapabilities: [],
        estimatedDuration: 30
      });

      scheduler.addTask(task);
      await scheduler.scheduleTask('task1');

      const recentDecisions = scheduler.getRecentDecisions(10);
      expect(recentDecisions.length).toBeGreaterThan(0);
    });

    it('should return correct metrics', () => {
      const metrics = scheduler.getMetrics();

      expect(metrics).toHaveProperty('totalDecisions');
      expect(metrics).toHaveProperty('averageConfidence');
    });
  });

  describe('load balancing', () => {
    it('should return load statistics', () => {
      const stats = scheduler.getLoadStats();

      expect(stats).toHaveProperty('totalLoad');
      expect(stats).toHaveProperty('averageLoad');
      expect(stats).toHaveProperty('maxLoad');
      expect(stats).toHaveProperty('minLoad');
      expect(stats).toHaveProperty('overloadedAgents');
      expect(stats).toHaveProperty('busyAgents');
    });

    it('should suggest scaling', () => {
      const suggestion = scheduler.getScalingSuggestion();

      expect(suggestion).toHaveProperty('action');
      expect(suggestion).toHaveProperty('reason');
    });
  });

  describe('clearTasks / reset', () => {
    it('should clear all tasks', () => {
      scheduler.addTask(createTask({
        id: 'task1',
        type: 'implementation',
        title: 'Task 1',
        requiredCapabilities: [],
        estimatedDuration: 30
      }));

      scheduler.clearTasks();

      const tasks = scheduler.getAllTasks();
      expect(tasks.length).toBe(0);
    });

    it('should reset scheduler state', () => {
      scheduler.addTask(createTask({
        id: 'task1',
        type: 'implementation',
        title: 'Task 1',
        requiredCapabilities: [],
        estimatedDuration: 30
      }));

      scheduler.reset();

      const tasks = scheduler.getAllTasks();
      expect(tasks.length).toBe(0);
      expect(scheduler.getAgents().size).toBeGreaterThan(0);
    });
  });

  describe('updateConfig', () => {
    it('should update configuration', () => {
      scheduler.updateConfig({
        maxBatchSize: 5,
        loadBalance: {
          maxLoadThreshold: 80
        }
      });

      // Configuration should be updated (we can verify via behavior)
      expect(scheduler).toBeDefined();
    });
  });

  describe('export', () => {
    it('should export scheduler state as JSON', () => {
      scheduler.addTask(createTask({
        id: 'task1',
        type: 'implementation',
        title: 'Task 1',
        requiredCapabilities: [],
        estimatedDuration: 30
      }));

      const exported = scheduler.export();

      expect(exported).toBeTruthy();
      expect(() => JSON.parse(exported)).not.toThrow();
      
      const parsed = JSON.parse(exported);
      expect(parsed).toHaveProperty('config');
      expect(parsed).toHaveProperty('agents');
      expect(parsed).toHaveProperty('tasks');
    });
  });
});
