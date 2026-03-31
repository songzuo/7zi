/**
 * Tests for Learning Record Storage and Query
 * @vitest-environment node
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AdaptiveLearner, WeightAdjustment } from '../adaptive-learner';
import { ScheduleDecision } from '../../models/schedule-decision';

describe('Learning Record Storage and Query', () => {
  let learner: AdaptiveLearner;

  const createDecision = (
    taskId: string,
    agentId: string,
    decisionTime: number = Date.now()
  ): ScheduleDecision => ({
    taskId,
    assignedAgent: agentId,
    confidence: 0.9,
    reasoning: 'Test decision',
    alternativeAgents: [],
    estimatedCompletion: Date.now() + 300000,
    decisionTime,
    scores: {
      capability: 0.8,
      load: 0.7,
      performance: 0.9,
      response: 0.85,
      total: 0.82
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

  describe('Decision Recording', () => {
    it('should record decision with all fields', () => {
      const decision = createDecision('task-1', 'agent1');
      decision.scores.capability = 0.95;
      decision.scores.load = 0.8;
      
      learner.recordDecision(decision, true, 15);
      
      const metrics = learner.getAgentMetrics('agent1');
      expect(metrics).toBeDefined();
      expect(metrics?.totalAssigned).toBe(1);
      expect(metrics?.totalCompleted).toBe(1);
      expect(metrics?.avgCompletionTime).toBe(15);
    });

    it('should record multiple decisions for same agent', () => {
      const decision = createDecision('task-1', 'agent1');
      
      learner.recordDecision(decision, true, 10);
      learner.recordDecision(decision, true, 15);
      learner.recordDecision(decision, false, 20);
      
      const metrics = learner.getAgentMetrics('agent1');
      expect(metrics?.totalAssigned).toBe(3);
      expect(metrics?.totalCompleted).toBe(2);
      expect(metrics?.totalFailed).toBe(1);
    });

    it('should record decisions for multiple agents', () => {
      const decision1 = createDecision('task-1', 'agent1');
      const decision2 = createDecision('task-2', 'agent2');
      const decision3 = createDecision('task-3', 'agent3');
      
      learner.recordDecision(decision1, true, 10);
      learner.recordDecision(decision2, false, 15);
      learner.recordDecision(decision3, true, 20);
      
      const allMetrics = learner.getAllMetrics();
      expect(allMetrics.size).toBe(3);
      expect(allMetrics.get('agent1')?.totalCompleted).toBe(1);
      expect(allMetrics.get('agent2')?.totalFailed).toBe(1);
      expect(allMetrics.get('agent3')?.totalCompleted).toBe(1);
    });

    it('should handle rapid sequential recordings', () => {
      const decision = createDecision('task-1', 'agent1');
      
      // Simulate rapid recording
      const startTime = Date.now();
      for (let i = 0; i < 100; i++) {
        learner.recordDecision(decision, true, 10);
      }
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
      expect(learner.getAgentMetrics('agent1')?.totalAssigned).toBe(100);
    });
  });

  describe('Decision History Management', () => {
    it('should maintain decision history', () => {
      const decision1 = createDecision('task-1', 'agent1');
      const decision2 = createDecision('task-2', 'agent2');
      
      learner.recordDecision(decision1, true, 10);
      learner.recordDecision(decision2, false, 15);
      
      const summary = learner.getSummary();
      expect(summary.totalDecisions).toBe(2);
    });

    it('should trim history when exceeding limit', () => {
      const decision = createDecision('task-1', 'agent1');
      
      // Record 1100 decisions (exceeds 1000 limit)
      for (let i = 0; i < 1100; i++) {
        learner.recordDecision(decision, true, 10);
      }
      
      const summary = learner.getSummary();
      expect(summary.totalDecisions).toBe(1000); // Should be trimmed to 1000
    });

    it('should preserve recent decisions after trimming', () => {
      const decision = createDecision('task-1', 'agent1');
      
      // Record old decisions
      for (let i = 0; i < 500; i++) {
        learner.recordDecision(decision, false, 10);
      }
      
      // Record recent decisions
      for (let i = 0; i < 600; i++) {
        learner.recordDecision(decision, true, 10);
      }
      
      const metrics = learner.getAgentMetrics('agent1');
      // Recent decisions should be preserved (higher success rate)
      expect(metrics?.totalCompleted).toBeGreaterThan(500);
    });
  });

  describe('Data Export', () => {
    it('should export data as valid JSON', () => {
      const decision = createDecision('task-1', 'agent1');
      learner.recordDecision(decision, true, 10);
      
      const exported = learner.exportData();
      
      expect(() => JSON.parse(exported)).not.toThrow();
    });

    it('should export all relevant data', () => {
      const decision = createDecision('task-1', 'agent1');
      learner.recordDecision(decision, true, 10);
      
      const exported = learner.exportData();
      const data = JSON.parse(exported);
      
      expect(data).toHaveProperty('metrics');
      expect(data).toHaveProperty('decisionHistory');
      expect(data).toHaveProperty('exportTime');
    });

    it('should include metrics in export', () => {
      const decision = createDecision('task-1', 'agent1');
      learner.recordDecision(decision, true, 10);
      learner.recordDecision(decision, false, 15);
      
      const exported = learner.exportData();
      const data = JSON.parse(exported);
      
      expect(data.metrics).toHaveLength(1);
      const [agentId, metrics] = data.metrics[0];
      expect(agentId).toBe('agent1');
      expect(metrics.totalAssigned).toBe(2);
    });

    it('should include decision history in export', () => {
      const decision = createDecision('task-1', 'agent1');
      learner.recordDecision(decision, true, 10);
      learner.recordDecision(decision, false, 15);
      
      const exported = learner.exportData();
      const data = JSON.parse(exported);
      
      expect(data.decisionHistory).toHaveLength(2);
    });

    it('should export empty state correctly', () => {
      const exported = learner.exportData();
      const data = JSON.parse(exported);
      
      expect(data.metrics).toHaveLength(0);
      expect(data.decisionHistory).toHaveLength(0);
    });
  });

  describe('Data Clearing', () => {
    it('should clear all data', () => {
      const decision = createDecision('task-1', 'agent1');
      learner.recordDecision(decision, true, 10);
      learner.recordDecision(decision, false, 15);
      
      learner.clear();
      
      const summary = learner.getSummary();
      expect(summary.totalAgents).toBe(0);
      expect(summary.totalDecisions).toBe(0);
    });

    it('should allow recording after clear', () => {
      const decision = createDecision('task-1', 'agent1');
      learner.recordDecision(decision, true, 10);
      learner.clear();
      
      learner.recordDecision(decision, false, 15);
      
      const metrics = learner.getAgentMetrics('agent1');
      expect(metrics?.totalAssigned).toBe(1);
    });

    it('should reset all metrics after clear', () => {
      const decision = createDecision('task-1', 'agent1');
      learner.recordDecision(decision, true, 10);
      
      learner.clear();
      
      const metrics = learner.getAgentMetrics('agent1');
      expect(metrics).toBeUndefined();
    });
  });

  describe('Weight Cache Operations', () => {
    it('should apply weight adjustments to cache', () => {
      const adjustments: WeightAdjustment[] = [
        {
          agentId: 'agent1',
          taskType: 'implementation',
          currentWeight: 1.0,
          suggestedWeight: 1.2,
          reason: 'High performance',
          confidence: 0.9
        }
      ];
      
      learner.applyWeightAdjustments(adjustments);
      
      const cachedWeight = learner.getCachedWeight('agent1', 'implementation');
      expect(cachedWeight).toBe(1.2);
    });

    it('should support multiple cached weights per agent', () => {
      const adjustments: WeightAdjustment[] = [
        {
          agentId: 'agent1',
          taskType: 'implementation',
          currentWeight: 1.0,
          suggestedWeight: 1.2,
          reason: 'Good at implementation',
          confidence: 0.9
        },
        {
          agentId: 'agent1',
          taskType: 'testing',
          currentWeight: 1.0,
          suggestedWeight: 0.8,
          reason: 'Below average at testing',
          confidence: 0.8
        }
      ];
      
      learner.applyWeightAdjustments(adjustments);
      
      expect(learner.getCachedWeight('agent1', 'implementation')).toBe(1.2);
      expect(learner.getCachedWeight('agent1', 'testing')).toBe(0.8);
    });

    it('should support weights for multiple agents', () => {
      const adjustments: WeightAdjustment[] = [
        {
          agentId: 'agent1',
          taskType: 'implementation',
          currentWeight: 1.0,
          suggestedWeight: 1.3,
          reason: 'High success',
          confidence: 0.95
        },
        {
          agentId: 'agent2',
          taskType: 'implementation',
          currentWeight: 1.0,
          suggestedWeight: 0.7,
          reason: 'Low success',
          confidence: 0.85
        }
      ];
      
      learner.applyWeightAdjustments(adjustments);
      
      expect(learner.getCachedWeight('agent1', 'implementation')).toBe(1.3);
      expect(learner.getCachedWeight('agent2', 'implementation')).toBe(0.7);
    });

    it('should return undefined for uncached weights', () => {
      const weight = learner.getCachedWeight('unknown-agent', 'implementation');
      expect(weight).toBeUndefined();
    });

    it('should clear weight cache on clear()', () => {
      const adjustments: WeightAdjustment[] = [
        {
          agentId: 'agent1',
          taskType: 'implementation',
          currentWeight: 1.0,
          suggestedWeight: 1.2,
          reason: 'Test',
          confidence: 0.9
        }
      ];
      
      learner.applyWeightAdjustments(adjustments);
      learner.clear();
      
      const cachedWeight = learner.getCachedWeight('agent1', 'implementation');
      expect(cachedWeight).toBeUndefined();
    });
  });

  describe('Configuration Management', () => {
    it('should return current configuration', () => {
      const config = learner.getConfig();
      
      expect(config.minTasksForLearning).toBe(3);
      expect(config.adjustmentFactor).toBe(0.3);
      expect(config.autoUpdateWeights).toBe(true);
      expect(config.enablePersistence).toBe(false);
    });

    it('should update configuration', () => {
      learner.updateConfig({ minTasksForLearning: 10 });
      
      const config = learner.getConfig();
      expect(config.minTasksForLearning).toBe(10);
    });

    it('should preserve existing config when updating', () => {
      learner.updateConfig({ minTasksForLearning: 10 });
      learner.updateConfig({ adjustmentFactor: 0.5 });
      
      const config = learner.getConfig();
      expect(config.minTasksForLearning).toBe(10);
      expect(config.adjustmentFactor).toBe(0.5);
    });

    it('should apply new minTasksForLearning threshold', () => {
      const decision = createDecision('task-1', 'agent1');
      learner.recordDecision(decision, true, 10);
      learner.recordDecision(decision, true, 10);
      
      // 2 tasks is below old threshold of 3
      let summary = learner.getSummary();
      expect(summary.agentsWithLearningData).toBe(0);
      
      // Lower threshold to 2
      learner.updateConfig({ minTasksForLearning: 2 });
      
      // Now agent has learning data
      summary = learner.getSummary();
      expect(summary.agentsWithLearningData).toBe(1);
    });
  });

  describe('Last Updated Tracking', () => {
    it('should track lastUpdated timestamp', () => {
      const beforeTime = Date.now();
      const decision = createDecision('task-1', 'agent1');
      learner.recordDecision(decision, true, 10);
      const afterTime = Date.now();
      
      const metrics = learner.getAgentMetrics('agent1');
      expect(metrics?.lastUpdated).toBeGreaterThanOrEqual(beforeTime);
      expect(metrics?.lastUpdated).toBeLessThanOrEqual(afterTime);
    });

    it('should update lastUpdated on each record', async () => {
      const decision = createDecision('task-1', 'agent1');
      learner.recordDecision(decision, true, 10);
      
      const metrics1 = learner.getAgentMetrics('agent1');
      const firstUpdate = metrics1?.lastUpdated;
      
      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 10));
      
      learner.recordDecision(decision, true, 10);
      const metrics2 = learner.getAgentMetrics('agent1');
      
      expect(metrics2?.lastUpdated).toBeGreaterThan(firstUpdate!);
    });
  });
});
