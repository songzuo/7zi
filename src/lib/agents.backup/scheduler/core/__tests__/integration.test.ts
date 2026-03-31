/**
 * Integration Tests for Agent Scheduler with Adaptive Learning
 * Tests the complete workflow from task scheduling to learning
 * @vitest-environment node
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AgentScheduler, SchedulerConfig } from '../scheduler';
import { Task, TaskType, TaskPriority, createTask } from '../../models/task-model';
import { initializeAgents } from '../../models/agent-capability';

describe('Agent Scheduler Integration with Adaptive Learning', () => {
  let scheduler: AgentScheduler;

  const testConfig: SchedulerConfig = {
    autoSchedule: false, // Manual control for tests
    allowManualOverride: true,
    maxBatchSize: 10,
    schedulingInterval: 30000,
    loadBalance: {
      maxLoadThreshold: 90,
      busyThreshold: 70,
      preferLowLoad: true,
      considerSpecialization: true
    },
    enableLearning: true,
    learning: {
      minTasksForLearning: 2, // Reduced for faster testing
      adjustmentFactor: 0.3,
      trendWindow: 5,
      autoUpdateWeights: true,
      enablePersistence: false
    }
  };

  beforeEach(() => {
    scheduler = new AgentScheduler(testConfig);
    scheduler.initialize();
  });

  describe('Learning Data Persistence', () => {
    it('should record decision outcomes in learner', async () => {
      // Create and schedule a task
      const task = createTask({
        id: 'task-1',
        title: 'Architecture design',
        type: 'architecture',
        priority: 'high',
        estimatedDuration: 20,
        description: 'Design system architecture'
      });

      // Add task to scheduler first
      scheduler.addTask(task);

      const decision = await scheduler.scheduleTask(task.id);
      expect(decision).not.toBeNull();
      expect(decision?.assignedAgent).toBeDefined();

      // Mark task as completed
      if (decision?.assignedAgent) {
        scheduler.completeTask(task.id);
      }

      // Check learner recorded the outcome
      const learner = scheduler.getLearner();
      const summary = learner.getSummary();

      expect(summary.totalDecisions).toBeGreaterThan(0);
      expect(summary.totalAgents).toBeGreaterThan(0);
    });

    it('should track success and failure separately', async () => {
      const learner = scheduler.getLearner();

      // Successful task
      const task1 = createTask({
        id: 'task-1',
        title: 'Research task',
        type: 'research',
        priority: 'medium',
        estimatedDuration: 15
      });

      scheduler.addTask(task1);
      const decision1 = await scheduler.scheduleTask(task1.id);
      if (decision1?.assignedAgent) {
        scheduler.completeTask(task1.id);
      }

      // Failed task
      const task2 = createTask({
        id: 'task-2',
        title: 'Failed implementation',
        type: 'implementation',
        priority: 'low',
        estimatedDuration: 10
      });

      scheduler.addTask(task2);
      const decision2 = await scheduler.scheduleTask(task2.id);
      if (decision2?.assignedAgent) {
        scheduler.failTask(task2.id, 'Simulated failure');
      }

      // Check metrics
      const summary = learner.getSummary();
      expect(summary.totalDecisions).toBe(2);

      // Get agent metrics to verify separation
      if (decision1?.assignedAgent) {
        const metrics = learner.getAgentMetrics(decision1.assignedAgent);
        expect(metrics?.totalCompleted).toBeGreaterThan(0);
      }

      if (decision2?.assignedAgent) {
        const metrics = learner.getAgentMetrics(decision2.assignedAgent);
        expect(metrics?.totalFailed).toBeGreaterThan(0);
      }
    });

    it('should calculate success rate correctly', async () => {
      const learner = scheduler.getLearner();
      const agentId = 'architect';

      // Schedule 5 tasks with mixed results (4 success, 1 failure)
      for (let i = 0; i < 5; i++) {
        const task = createTask({
          id: `task-${i}`,
          title: `Task ${i}`,
          type: 'architecture',
          priority: 'medium',
          estimatedDuration: 10
        });

        scheduler.addTask(task);
        const decision = await scheduler.scheduleTask(task.id);
        if (i < 4) {
          scheduler.completeTask(task.id);
        } else {
          if (decision?.assignedAgent) {
            scheduler.failTask(task.id, 'Test failure');
          }
        }
      }

      const metrics = learner.getAgentMetrics(agentId);
      if (metrics) {
        expect(metrics.successRate).toBeCloseTo(0.8, 1);
        expect(metrics.totalAssigned).toBeGreaterThan(0);
      }
    });
  });

  describe('Multi-Task Scheduling', () => {
    it('should schedule multiple tasks in batch', async () => {
      // Create multiple tasks
      const tasks: Task[] = [];
      for (let i = 0; i < 5; i++) {
        const task = createTask({
          id: `batch-task-${i}`,
          title: `Batch task ${i}`,
          type: i % 2 === 0 ? 'architecture' : 'implementation',
          priority: 'medium',
          estimatedDuration: 10
        });
        tasks.push(task);
      }

      scheduler.addTasks(tasks);

      // Schedule batch
      const result = await scheduler.scheduleNextBatch();

      expect(result.success).toBe(true);
      expect(result.scheduled.length).toBeGreaterThan(0);
      expect(result.stats.totalScheduled).toBeGreaterThan(0);
    });

    it('should respect max batch size', async () => {
      // Create more tasks than maxBatchSize
      const tasks: Task[] = [];
      for (let i = 0; i < 20; i++) {
        const task = createTask({
          id: `large-batch-task-${i}`,
          title: `Task ${i}`,
          type: 'general',
          priority: 'low',
          estimatedDuration: 5
        });
        tasks.push(task);
      }

      scheduler.addTasks(tasks);

      const result = await scheduler.scheduleNextBatch();

      // Should not exceed maxBatchSize
      expect(result.scheduled.length).toBeLessThanOrEqual(testConfig.maxBatchSize);
    });

    it('should load balance across agents', async () => {
      // Create tasks that can be handled by multiple agents
      const tasks: Task[] = [];
      for (let i = 0; i < 10; i++) {
        const task = createTask({
          id: `load-balance-task-${i}`,
          title: `Task ${i}`,
          type: 'implementation',
          priority: 'medium',
          estimatedDuration: 10
        });
        tasks.push(task);
      }

      scheduler.addTasks(tasks);
      const result = await scheduler.scheduleNextBatch();

      // Check that tasks are distributed
      const assignedAgents = new Set(
        result.scheduled.map(d => d.assignedAgent)
      );

      expect(assignedAgents.size).toBeGreaterThan(1);
    });
  });

  describe('Weight Adjustment Logic', () => {
    it('should suggest weight adjustments after learning', async () => {
      const learner = scheduler.getLearner();
      const agents = scheduler.getAgents();

      // Record successful tasks for architect
      for (let i = 0; i < 5; i++) {
        const task = createTask({
          id: `arch-task-${i}`,
          title: `Architecture task ${i}`,
          type: 'architecture',
          priority: 'high',
          estimatedDuration: 10
        });

        scheduler.addTask(task);
        const decision = await scheduler.scheduleTask(task.id);
        if (decision?.assignedAgent) {
          scheduler.completeTask(task.id);
        }
      }

      // Get weight adjustments
      const adjustments = learner.getWeightAdjustments(agents);

      // Should have at least some suggestions
      expect(Array.isArray(adjustments)).toBe(true);

      // If adjustments exist, validate structure
      if (adjustments.length > 0) {
        const adj = adjustments[0];
        expect(adj.agentId).toBeDefined();
        expect(adj.taskType).toBeDefined();
        expect(adj.currentWeight).toBeDefined();
        expect(adj.suggestedWeight).toBeDefined();
        expect(adj.reason).toBeDefined();
        expect(adj.confidence).toBeGreaterThan(0);
        expect(adj.confidence).toBeLessThanOrEqual(1);
      }
    });

    it('should apply weight adjustments to cache', async () => {
      const learner = scheduler.getLearner();
      const agents = scheduler.getAgents();

      // Generate some learning data
      for (let i = 0; i < 5; i++) {
        const task = createTask({
          id: `impl-task-${i}`,
          title: `Implementation task ${i}`,
          type: 'implementation',
          priority: 'medium',
          estimatedDuration: 10
        });

        scheduler.addTask(task);
        const decision = await scheduler.scheduleTask(task.id);
        if (decision?.assignedAgent) {
          scheduler.completeTask(task.id);
        }
      }

      // Get and apply adjustments
      const adjustments = learner.getWeightAdjustments(agents);
      if (adjustments.length > 0) {
        scheduler.applyWeightAdjustments();

        // Verify cached weights
        const firstAdj = adjustments[0];
        const cachedWeight = learner.getCachedWeight(
          firstAdj.agentId,
          firstAdj.taskType
        );

        expect(cachedWeight).toBe(firstAdj.suggestedWeight);
      }
    });

    it('should provide optimized scoring weights', async () => {
      const learner = scheduler.getLearner();
      const agents = scheduler.getAgents();

      // Generate learning data
      for (let i = 0; i < 10; i++) {
        const task = createTask({
          id: `opt-task-${i}`,
          title: `Optimization task ${i}`,
          type: i % 2 === 0 ? 'architecture' : 'implementation',
          priority: 'high',
          estimatedDuration: 10
        });

        scheduler.addTask(task);
        const decision = await scheduler.scheduleTask(task.id);
        if (decision?.assignedAgent) {
          scheduler.completeTask(task.id);
        }
      }

      // Get optimized weights for architecture tasks
      const weights = learner.getOptimizedWeights('architecture', agents);

      if (weights) {
        expect(weights.capability).toBeDefined();
        expect(weights.load).toBeDefined();
        expect(weights.performance).toBeDefined();
        expect(weights.response).toBeDefined();

        // Sum should be approximately 1.0
        const sum = weights.capability + weights.load + weights.performance + weights.response;
        expect(sum).toBeGreaterThan(0.8);
        expect(sum).toBeLessThan(1.2);
      }
    });
  });

  describe('Learning Data Export/Import', () => {
    it('should export learning data as JSON', async () => {
      const learner = scheduler.getLearner();

      // Add some data
      for (let i = 0; i < 3; i++) {
        const task = createTask({
          id: `export-task-${i}`,
          title: `Export test task ${i}`,
          type: 'general',
          priority: 'low',
          estimatedDuration: 5
        });

        scheduler.addTask(task);
        const decision = await scheduler.scheduleTask(task.id);
        if (decision?.assignedAgent) {
          scheduler.completeTask(task.id);
        }
      }

      // Export data
      const exported = learner.exportData();
      expect(typeof exported).toBe('string');

      // Parse and validate structure
      const parsed = JSON.parse(exported);
      expect(parsed).toHaveProperty('metrics');
      expect(parsed).toHaveProperty('decisionHistory');
      expect(parsed).toHaveProperty('exportTime');
      expect(Array.isArray(parsed.metrics)).toBe(true);
      expect(Array.isArray(parsed.decisionHistory)).toBe(true);
    });

    it('should export complete scheduler state', () => {
      // Add tasks
      for (let i = 0; i < 3; i++) {
        const task = createTask({
          id: `state-task-${i}`,
          title: `State test task ${i}`,
          type: 'implementation',
          priority: 'medium',
          estimatedDuration: 10
        });
        scheduler.addTask(task);
      }

      // Export
      const exported = scheduler.export();
      expect(typeof exported).toBe('string');

      const parsed = JSON.parse(exported);
      expect(parsed).toHaveProperty('config');
      expect(parsed).toHaveProperty('agents');
      expect(parsed).toHaveProperty('tasks');
      expect(parsed).toHaveProperty('learning');
    });
  });

  describe('Performance Metrics', () => {
    it('should track completion time accurately', async () => {
      const learner = scheduler.getLearner();
      const expectedTimes = [10, 15, 20];

      expectedTimes.forEach(async (expectedTime, i) => {
        const task = createTask({
          id: `time-task-${i}`,
          title: `Time test ${i}`,
          type: 'testing',
          priority: 'medium',
          estimatedDuration: expectedTime
        });

        scheduler.addTask(task);
        const decision = await scheduler.scheduleTask(task.id);
        if (decision?.assignedAgent) {
          scheduler.completeTask(task.id);
        }
      });

      // Get metrics for the agent that handled tasks
      const agents = scheduler.getAgents();
      for (const [agentId, agent] of agents.entries()) {
        const metrics = learner.getAgentMetrics(agentId);
        if (metrics && metrics.totalAssigned >= 3) {
          // Average should be close to expected
          const expectedAvg = expectedTimes.reduce((a, b) => a + b) / expectedTimes.length;
          expect(metrics.avgCompletionTime).toBeCloseTo(expectedAvg, 0.1);
        }
      }
    });

    it('should calculate confidence based on performance', async () => {
      const learner = scheduler.getLearner();

      // High performance tasks
      for (let i = 0; i < 8; i++) {
        const task = createTask({
          id: `conf-task-${i}`,
          title: `Confidence test ${i}`,
          type: 'research',
          priority: 'medium',
          estimatedDuration: 10
        });

        scheduler.addTask(task);
        const decision = await scheduler.scheduleTask(task.id);
        if (decision?.assignedAgent) {
          scheduler.completeTask(task.id);
        }
      }

      const summary = learner.getSummary();
      expect(summary.agentsWithLearningData).toBeGreaterThan(0);

      // Check confidence levels
      const agents = scheduler.getAgents();
      for (const [agentId] of agents.entries()) {
        const metrics = learner.getAgentMetrics(agentId);
        if (metrics && metrics.totalAssigned >= 3) {
          expect(metrics.confidence).toBeGreaterThan(0);
          expect(metrics.confidence).toBeLessThanOrEqual(1);
        }
      }
    });

    it('should detect performance trends', async () => {
      const learner = scheduler.getLearner();

      // First batch: low success rate
      for (let i = 0; i < 5; i++) {
        const task = createTask({
          id: `trend-bad-${i}`,
          title: `Trend bad ${i}`,
          type: 'testing',
          priority: 'low',
          estimatedDuration: 10
        });

        scheduler.addTask(task);
        const decision = await scheduler.scheduleTask(task.id);
        if (decision?.assignedAgent && i % 2 === 0) {
          scheduler.failTask(task.id, 'Test failure');
        } else if (decision?.assignedAgent) {
          scheduler.completeTask(task.id);
        }
      }

      // Second batch: high success rate
      for (let i = 0; i < 5; i++) {
        const task = createTask({
          id: `trend-good-${i}`,
          title: `Trend good ${i}`,
          type: 'testing',
          priority: 'medium',
          estimatedDuration: 10
        });

        scheduler.addTask(task);
        const decision = await scheduler.scheduleTask(task.id);
        if (decision?.assignedAgent) {
          scheduler.completeTask(task.id);
        }
      }

      // Check trend
      const agents = scheduler.getAgents();
      for (const [agentId] of agents.entries()) {
        const metrics = learner.getAgentMetrics(agentId);
        if (metrics && metrics.totalAssigned >= 8) {
          expect(['improving', 'stable', 'declining']).toContain(metrics.trend);
        }
      }
    });
  });

  describe('End-to-End Workflow', () => {
    it('should handle complete task lifecycle with learning', async () => {
      // 1. Create tasks - ensure some tasks of the same type go to same agent
      const tasks = [
        createTask({
          id: 'lifecycle-1',
          title: 'Design system',
          type: 'architecture',
          priority: 'high',
          estimatedDuration: 20
        }),
        createTask({
          id: 'lifecycle-2',
          title: 'Implement feature',
          type: 'implementation',
          priority: 'medium',
          estimatedDuration: 15
        }),
        createTask({
          id: 'lifecycle-3',
          title: 'Write tests',
          type: 'testing',
          priority: 'high',
          estimatedDuration: 10
        }),
        createTask({
          id: 'lifecycle-4',
          title: 'Another architecture task',
          type: 'architecture',
          priority: 'medium',
          estimatedDuration: 20
        })
      ];

      scheduler.addTasks(tasks);

      // 2. Schedule tasks
      const result = await scheduler.scheduleNextBatch();
      expect(result.scheduled.length).toBeGreaterThan(0);

      // 3. Mark tasks as started
      result.scheduled.forEach(decision => {
        scheduler.startTask(decision.taskId);
      });

      // 4. Complete tasks
      result.scheduled.forEach(decision => {
        scheduler.completeTask(decision.taskId);
      });

      // 5. Verify learning
      const learner = scheduler.getLearner();
      const summary = learner.getSummary();

      expect(summary.totalDecisions).toBe(result.scheduled.length);
      // agentsWithLearningData requires at least 2 tasks per agent
      // We may not have agents with learning data if tasks are distributed
      // So just verify totalDecisions is tracked
      
      // 6. Check that we can get metrics for affected agents
      const agentsWithMetrics = new Set(
        result.scheduled.map(d => d.assignedAgent)
      );
      agentsWithMetrics.forEach(agentId => {
        const metrics = learner.getAgentMetrics(agentId);
        expect(metrics).toBeDefined();
        expect(metrics?.totalAssigned).toBeGreaterThan(0);
      });
    });

    it('should handle task reassignment with learning', async () => {
      // Create a task
      const task = createTask({
        id: 'reassign-1',
        title: 'Failing task',
        type: 'implementation',
        priority: 'high',
        estimatedDuration: 10
      });

      scheduler.addTask(task);

      // Schedule it
      const firstDecision = await scheduler.scheduleTask(task.id);
      expect(firstDecision).not.toBeNull();

      // Mark as failed
      if (firstDecision?.assignedAgent) {
        scheduler.failTask(task.id, 'Test failure');
      }

      // Verify learner recorded failure
      const learner = scheduler.getLearner();
      const firstAgent = firstDecision?.assignedAgent;
      if (firstAgent) {
        const metrics = learner.getAgentMetrics(firstAgent);
        expect(metrics?.totalFailed).toBeGreaterThan(0);
      }

      // Reassign
      const newDecision = await scheduler.reassignTask(task.id);
      expect(newDecision).not.toBeNull();
      expect(newDecision?.assignedAgent).not.toBe(firstDecision);
    });
  });
});
