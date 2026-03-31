/**
 * Additional Tests for Adaptive Learner - Performance Metrics
 * @vitest-environment node
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AdaptiveLearner, AgentLearningMetrics } from '../adaptive-learner';
import { ScheduleDecision } from '../../models/schedule-decision';

describe('AdaptiveLearner - Performance Metrics', () => {
  let learner: AdaptiveLearner;

  const createDecision = (taskId: string, agentId: string, scores?: Partial<ScheduleDecision['scores']>): ScheduleDecision => ({
    taskId,
    assignedAgent: agentId,
    confidence: 0.9,
    reasoning: 'Test decision',
    alternativeAgents: [],
    estimatedCompletion: Date.now() + 300000,
    decisionTime: Date.now(),
    scores: {
      capability: 0.8,
      load: 0.7,
      performance: 0.9,
      response: 0.85,
      total: 0.82,
      ...scores
    }
  });

  beforeEach(() => {
    learner = new AdaptiveLearner({
      minTasksForLearning: 3,
      adjustmentFactor: 0.3,
      autoUpdateWeights: true,
      enablePersistence: false
    });
  });

  describe('Task Type Performance Tracking', () => {
    it('should track performance by task type (architecture)', () => {
      const decision = createDecision('arch-task-1', 'architect');
      
      learner.recordDecision(decision, true, 15);
      
      const metrics = learner.getAgentMetrics('architect');
      expect(metrics?.byTaskType['architecture']).toBeDefined();
      expect(metrics?.byTaskType['architecture'].assigned).toBe(1);
      expect(metrics?.byTaskType['architecture'].completed).toBe(1);
    });

    it('should track performance by task type (implementation)', () => {
      const decision = createDecision('impl-task-1', 'executor');
      
      learner.recordDecision(decision, true, 20);
      
      const metrics = learner.getAgentMetrics('executor');
      expect(metrics?.byTaskType['implementation']).toBeDefined();
      expect(metrics?.byTaskType['implementation'].successRate).toBe(1);
    });

    it('should track performance by task type (testing)', () => {
      const decision = createDecision('test-task-1', 'tester');
      
      learner.recordDecision(decision, false, 30);
      
      const metrics = learner.getAgentMetrics('tester');
      expect(metrics?.byTaskType['testing']).toBeDefined();
      expect(metrics?.byTaskType['testing'].failed).toBe(1);
    });

    it('should track multiple task types per agent', () => {
      const decision1 = createDecision('arch-task-1', 'architect');
      const decision2 = createDecision('impl-task-1', 'architect');
      
      learner.recordDecision(decision1, true, 15);
      learner.recordDecision(decision2, true, 20);
      
      const metrics = learner.getAgentMetrics('architect');
      expect(metrics?.byTaskType['architecture']).toBeDefined();
      expect(metrics?.byTaskType['implementation']).toBeDefined();
    });

    it('should calculate average time per task type', () => {
      const decision = createDecision('test-task-1', 'tester');
      
      learner.recordDecision(decision, true, 10);
      learner.recordDecision(decision, true, 20);
      learner.recordDecision(decision, true, 30);
      
      const metrics = learner.getAgentMetrics('tester');
      expect(metrics?.byTaskType['testing'].avgTime).toBe(20);
    });

    it('should calculate success rate per task type', () => {
      const decision = createDecision('impl-task-1', 'executor');
      
      learner.recordDecision(decision, true, 10);
      learner.recordDecision(decision, false, 15);
      learner.recordDecision(decision, true, 12);
      
      const metrics = learner.getAgentMetrics('executor');
      expect(metrics?.byTaskType['implementation'].successRate).toBeCloseTo(2/3);
    });
  });

  describe('Completion Time Metrics', () => {
    it('should calculate overall average completion time', () => {
      const decision = createDecision('task-1', 'agent1');
      
      learner.recordDecision(decision, true, 10);
      learner.recordDecision(decision, true, 20);
      learner.recordDecision(decision, true, 30);
      
      const metrics = learner.getAgentMetrics('agent1');
      expect(metrics?.avgCompletionTime).toBe(20);
    });

    it('should handle single completion time', () => {
      const decision = createDecision('task-1', 'agent1');
      
      learner.recordDecision(decision, true, 15);
      
      const metrics = learner.getAgentMetrics('agent1');
      expect(metrics?.avgCompletionTime).toBe(15);
    });

    it('should handle zero completion time', () => {
      const decision = createDecision('task-1', 'agent1');
      
      learner.recordDecision(decision, true, 0);
      
      const metrics = learner.getAgentMetrics('agent1');
      expect(metrics?.avgCompletionTime).toBe(0);
    });

    it('should handle large completion times', () => {
      const decision = createDecision('task-1', 'agent1');
      
      learner.recordDecision(decision, true, 1440); // 24 hours in minutes
      
      const metrics = learner.getAgentMetrics('agent1');
      expect(metrics?.avgCompletionTime).toBe(1440);
    });
  });

  describe('Success Rate Calculations', () => {
    it('should calculate success rate with all successes', () => {
      const decision = createDecision('task-1', 'agent1');
      
      for (let i = 0; i < 10; i++) {
        learner.recordDecision(decision, true, 10);
      }
      
      const metrics = learner.getAgentMetrics('agent1');
      expect(metrics?.successRate).toBe(1);
    });

    it('should calculate success rate with all failures', () => {
      const decision = createDecision('task-1', 'agent1');
      
      for (let i = 0; i < 10; i++) {
        learner.recordDecision(decision, false, 10);
      }
      
      const metrics = learner.getAgentMetrics('agent1');
      expect(metrics?.successRate).toBe(0);
    });

    it('should calculate success rate with mixed results', () => {
      const decision = createDecision('task-1', 'agent1');
      
      learner.recordDecision(decision, true, 10);
      learner.recordDecision(decision, false, 10);
      learner.recordDecision(decision, true, 10);
      learner.recordDecision(decision, false, 10);
      
      const metrics = learner.getAgentMetrics('agent1');
      expect(metrics?.successRate).toBe(0.5);
    });

    it('should update success rate correctly over time', () => {
      const decision = createDecision('task-1', 'agent1');
      
      // First: 100% success
      learner.recordDecision(decision, true, 10);
      expect(learner.getAgentMetrics('agent1')?.successRate).toBe(1);
      
      // Second: 50% success
      learner.recordDecision(decision, false, 10);
      expect(learner.getAgentMetrics('agent1')?.successRate).toBe(0.5);
      
      // Third: 66.67% success
      learner.recordDecision(decision, true, 10);
      expect(learner.getAgentMetrics('agent1')?.successRate).toBeCloseTo(2/3);
    });
  });

  describe('Multi-Agent Performance Comparison', () => {
    it('should track different success rates for different agents', () => {
      const decision1 = createDecision('task-1', 'agent1');
      const decision2 = createDecision('task-2', 'agent2');
      
      learner.recordDecision(decision1, true, 10);
      learner.recordDecision(decision1, true, 10);
      
      learner.recordDecision(decision2, true, 10);
      learner.recordDecision(decision2, false, 10);
      
      const metrics1 = learner.getAgentMetrics('agent1');
      const metrics2 = learner.getAgentMetrics('agent2');
      
      expect(metrics1?.successRate).toBe(1);
      expect(metrics2?.successRate).toBe(0.5);
    });

    it('should track different completion times for different agents', () => {
      const decision1 = createDecision('task-1', 'fast-agent');
      const decision2 = createDecision('task-2', 'slow-agent');
      
      learner.recordDecision(decision1, true, 5);
      learner.recordDecision(decision2, true, 60);
      
      const fastMetrics = learner.getAgentMetrics('fast-agent');
      const slowMetrics = learner.getAgentMetrics('slow-agent');
      
      expect(fastMetrics?.avgCompletionTime).toBe(5);
      expect(slowMetrics?.avgCompletionTime).toBe(60);
    });

    it('should provide all metrics for comparison', () => {
      const allMetrics = learner.getAllMetrics();
      expect(allMetrics.size).toBe(0);
      
      const decision = createDecision('task-1', 'agent1');
      learner.recordDecision(decision, true, 10);
      
      const updatedMetrics = learner.getAllMetrics();
      expect(updatedMetrics.size).toBe(1);
      expect(updatedMetrics.has('agent1')).toBe(true);
    });
  });

  describe('Edge Cases in Metrics', () => {
    it('should handle decision with no scores', () => {
      const decision: ScheduleDecision = {
        taskId: 'task-1',
        assignedAgent: 'agent1',
        confidence: 0.9,
        reasoning: 'Test',
        alternativeAgents: [],
        estimatedCompletion: Date.now() + 300000,
        decisionTime: Date.now(),
        scores: {
          capability: 0.8,
          load: 0.7,
          performance: 0.9,
          response: 0.85,
          total: 0.82
        }
      };
      
      learner.recordDecision(decision, true, 10);
      
      const metrics = learner.getAgentMetrics('agent1');
      expect(metrics).toBeDefined();
      expect(metrics?.totalAssigned).toBe(1);
    });

    it('should handle very large number of decisions', () => {
      const decision = createDecision('task', 'agent1');
      
      for (let i = 0; i < 100; i++) {
        learner.recordDecision(decision, i % 2 === 0, 10);
      }
      
      const metrics = learner.getAgentMetrics('agent1');
      expect(metrics?.totalAssigned).toBe(100);
      expect(metrics?.successRate).toBe(0.5);
    });

    it('should handle decision history trimming', () => {
      const decision = createDecision('task', 'agent1');
      
      // Record more than 1000 decisions
      for (let i = 0; i < 1100; i++) {
        learner.recordDecision(decision, true, 10);
      }
      
      // Should still work correctly after trimming
      const metrics = learner.getAgentMetrics('agent1');
      expect(metrics?.totalAssigned).toBe(1100);
    });

    it('should handle unknown agent queries', () => {
      const metrics = learner.getAgentMetrics('unknown-agent');
      expect(metrics).toBeUndefined();
    });
  });
});
