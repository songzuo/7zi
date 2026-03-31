/**
 * Tests for Agent Scoring and Evaluation System
 * @vitest-environment node
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AdaptiveLearner } from '../adaptive-learner';
import { ScheduleDecision } from '../../models/schedule-decision';
import { AgentCapability } from '../../models/agent-capability';

describe('Agent Scoring System', () => {
  let learner: AdaptiveLearner;
  
  const createMockAgent = (agentId: string, successRate: number, taskTypes: string[] = ['implementation']): AgentCapability => ({
    agentId,
    name: `Agent ${agentId}`,
    provider: 'self-claude' as const,
    role: 'Developer',
    capabilities: {
      techStack: ['typescript'],
      taskTypes: taskTypes as any,
      concurrency: 2,
      avgResponseTime: 10,
      successRate
    },
    currentLoad: 0,
    availability: true,
    lastActiveTime: Date.now()
  });

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

  describe('Confidence Score Calculation', () => {
    it('should have low confidence with few tasks', () => {
      const decision = createDecision('task-1', 'agent1');
      learner.recordDecision(decision, true, 10);
      
      const metrics = learner.getAgentMetrics('agent1');
      expect(metrics?.confidence).toBeLessThan(0.5);
    });

    it('should increase confidence with more successful tasks', () => {
      const decision = createDecision('task-1', 'agent1');
      
      for (let i = 0; i < 10; i++) {
        learner.recordDecision(decision, true, 10);
      }
      
      const metrics = learner.getAgentMetrics('agent1');
      expect(metrics?.confidence).toBeGreaterThan(0.5);
    });

    it('should reduce confidence with low success rate', () => {
      const decision = createDecision('task-1', 'agent1');
      
      for (let i = 0; i < 10; i++) {
        learner.recordDecision(decision, i < 3, 10); // Only 30% success
      }
      
      const metrics = learner.getAgentMetrics('agent1');
      expect(metrics?.confidence).toBeLessThan(0.4);
    });

    it('should boost confidence with improving trend', () => {
      const decision = createDecision('task-1', 'agent1');
      
      // Start with failures, then successes (improving trend)
      for (let i = 0; i < 5; i++) {
        learner.recordDecision(decision, false, 10);
      }
      for (let i = 0; i < 5; i++) {
        learner.recordDecision(decision, true, 10);
      }
      
      const metrics = learner.getAgentMetrics('agent1');
      expect(metrics?.trend).toBe('improving');
      expect(metrics?.confidence).toBeGreaterThan(0.3);
    });

    it('should penalize confidence with declining trend', () => {
      const decision = createDecision('task-1', 'agent1');
      
      // Start with successes, then failures (declining trend)
      for (let i = 0; i < 5; i++) {
        learner.recordDecision(decision, true, 10);
      }
      for (let i = 0; i < 5; i++) {
        learner.recordDecision(decision, false, 10);
      }
      
      const metrics = learner.getAgentMetrics('agent1');
      expect(metrics?.trend).toBe('declining');
    });
  });

  describe('Trend Analysis', () => {
    it('should detect stable trend with consistent performance', () => {
      const decision = createDecision('task-1', 'agent1');
      
      // Consistent 50% success rate
      for (let i = 0; i < 10; i++) {
        learner.recordDecision(decision, i % 2 === 0, 10);
      }
      
      const metrics = learner.getAgentMetrics('agent1');
      expect(metrics?.trend).toBe('stable');
    });

    it('should detect improving trend with significant improvement', () => {
      const decision = createDecision('task-1', 'agent1');
      
      // First half: 20% success
      for (let i = 0; i < 5; i++) {
        learner.recordDecision(decision, i < 1, 10);
      }
      // Second half: 80% success
      for (let i = 0; i < 5; i++) {
        learner.recordDecision(decision, i < 4, 10);
      }
      
      const metrics = learner.getAgentMetrics('agent1');
      expect(metrics?.trend).toBe('improving');
    });

    it('should detect declining trend with significant decline', () => {
      const decision = createDecision('task-1', 'agent1');
      
      // First half: 80% success
      for (let i = 0; i < 5; i++) {
        learner.recordDecision(decision, i < 4, 10);
      }
      // Second half: 20% success
      for (let i = 0; i < 5; i++) {
        learner.recordDecision(decision, i < 1, 10);
      }
      
      const metrics = learner.getAgentMetrics('agent1');
      expect(metrics?.trend).toBe('declining');
    });

    it('should remain stable with small fluctuations', () => {
      const decision = createDecision('task-1', 'agent1');
      
      // Slight variation around 50%
      const successPattern = [true, true, false, false, true, false, true, false, true, false];
      for (const success of successPattern) {
        learner.recordDecision(decision, success, 10);
      }
      
      const metrics = learner.getAgentMetrics('agent1');
      expect(metrics?.trend).toBe('stable');
    });

    it('should require minimum data for trend analysis', () => {
      const decision = createDecision('task-1', 'agent1');
      
      // Only 2 data points (below trendWindow)
      learner.recordDecision(decision, true, 10);
      learner.recordDecision(decision, false, 10);
      
      const metrics = learner.getAgentMetrics('agent1');
      expect(metrics?.trend).toBe('stable');
    });
  });

  describe('Weight Optimization', () => {
    it('should return null without sufficient data', () => {
      const agents = new Map([
        ['agent1', createMockAgent('agent1', 0.9)]
      ]);
      
      const weights = learner.getOptimizedWeights('implementation', agents);
      expect(weights).toBeNull();
    });

    it('should return weights with sufficient data', () => {
      const agents = new Map([
        ['agent1', createMockAgent('agent1', 0.9)]
      ]);
      
      const decision = createDecision('impl-task-1', 'agent1');
      for (let i = 0; i < 5; i++) {
        learner.recordDecision(decision, true, 10);
      }
      
      const weights = learner.getOptimizedWeights('implementation', agents);
      expect(weights).not.toBeNull();
      expect(weights?.capability).toBeGreaterThan(0);
      expect(weights?.load).toBeGreaterThan(0);
      expect(weights?.performance).toBeGreaterThan(0);
      expect(weights?.response).toBeGreaterThan(0);
    });

    it('should adjust weights for high performance scenario', () => {
      const agents = new Map([
        ['agent1', createMockAgent('agent1', 0.95)]
      ]);
      
      const decision = createDecision('impl-task-1', 'agent1');
      for (let i = 0; i < 10; i++) {
        learner.recordDecision(decision, true, 10);
      }
      
      const weights = learner.getOptimizedWeights('implementation', agents);
      expect(weights?.capability).toBeGreaterThan(0.4); // Increased trust in capabilities
    });

    it('should adjust weights for low confidence scenario', () => {
      const agents = new Map([
        ['agent1', createMockAgent('agent1', 0.7)]
      ]);
      
      const decision = createDecision('impl-task-1', 'agent1');
      for (let i = 0; i < 5; i++) {
        learner.recordDecision(decision, i < 3, 10); // Mixed success
      }
      
      const weights = learner.getOptimizedWeights('implementation', agents);
      expect(weights?.performance).toBeGreaterThan(0.3); // Prioritize proven performance
    });

    it('should handle multiple agents', () => {
      const agents = new Map([
        ['agent1', createMockAgent('agent1', 0.9)],
        ['agent2', createMockAgent('agent2', 0.85)],
        ['agent3', createMockAgent('agent3', 0.95)]
      ]);
      
      // Record data for all agents
      agents.forEach((agent, agentId) => {
        const decision = createDecision('impl-task', agentId);
        for (let i = 0; i < 10; i++) {
          const successRate = agent.capabilities.successRate;
          learner.recordDecision(decision, Math.random() < successRate, 10);
        }
      });
      
      const weights = learner.getOptimizedWeights('implementation', agents);
      expect(weights).not.toBeNull();
    });
  });

  describe('Weight Adjustment Suggestions', () => {
    it('should suggest adjustments for underperforming agents', () => {
      const agents = new Map([
        ['agent1', createMockAgent('agent1', 0.6)]
      ]);
      
      const decision = createDecision('impl-task-1', 'agent1');
      for (let i = 0; i < 10; i++) {
        learner.recordDecision(decision, Math.random() < 0.6, 10);
      }
      
      const adjustments = learner.getWeightAdjustments(agents);
      expect(adjustments.length).toBeGreaterThan(0);
      
      const adj = adjustments[0];
      expect(adj.suggestedWeight).toBeLessThan(adj.currentWeight);
    });

    it('should suggest adjustments for overperforming agents', () => {
      const agents = new Map([
        ['agent1', createMockAgent('agent1', 0.98)]
      ]);
      
      const decision = createDecision('impl-task-1', 'agent1');
      for (let i = 0; i < 10; i++) {
        learner.recordDecision(decision, true, 10);
      }
      
      const adjustments = learner.getWeightAdjustments(agents);
      expect(adjustments.length).toBeGreaterThan(0);
      
      const adj = adjustments[0];
      expect(adj.suggestedWeight).toBeGreaterThan(adj.currentWeight);
    });

    it('should generate meaningful adjustment reasons', () => {
      const agents = new Map([
        ['agent1', createMockAgent('agent1', 0.95)]
      ]);
      
      const decision = createDecision('impl-task-1', 'agent1');
      for (let i = 0; i < 10; i++) {
        learner.recordDecision(decision, true, 10);
      }
      
      const adjustments = learner.getWeightAdjustments(agents);
      expect(adjustments[0].reason).toContain('success');
    });

    it('should sort adjustments by confidence', () => {
      const agents = new Map([
        ['agent1', createMockAgent('agent1', 0.9)],
        ['agent2', createMockAgent('agent2', 0.7)]
      ]);
      
      // More data for agent1
      const decision1 = createDecision('impl-task-1', 'agent1');
      for (let i = 0; i < 20; i++) {
        learner.recordDecision(decision1, true, 10);
      }
      
      const decision2 = createDecision('impl-task-2', 'agent2');
      for (let i = 0; i < 5; i++) {
        learner.recordDecision(decision2, true, 10);
      }
      
      const adjustments = learner.getWeightAdjustments(agents);
      expect(adjustments.length).toBeGreaterThan(0);
      
      // Check sorted by confidence (highest first)
      for (let i = 1; i < adjustments.length; i++) {
        expect(adjustments[i].confidence).toBeLessThanOrEqual(adjustments[i-1].confidence);
      }
    });
  });

  describe('Top Performers Identification', () => {
    it('should identify top performing agents', () => {
      const agents = ['agent1', 'agent2', 'agent3'];
      
      agents.forEach((agentId, index) => {
        const decision = createDecision('impl-task', agentId);
        const successRate = 0.7 + (index * 0.1); // 0.7, 0.8, 0.9
        for (let i = 0; i < 10; i++) {
          learner.recordDecision(decision, Math.random() < successRate, 10);
        }
      });
      
      const summary = learner.getSummary();
      expect(summary.topPerformers.length).toBeGreaterThan(0);
      expect(summary.topPerformers[0].agentId).toBe('agent3'); // Highest performer
    });

    it('should calculate combined score for ranking', () => {
      const decision1 = createDecision('impl-task', 'agent1');
      for (let i = 0; i < 10; i++) {
        learner.recordDecision(decision1, true, 10); // High success
      }
      
      const decision2 = createDecision('impl-task', 'agent2');
      for (let i = 0; i < 20; i++) {
        learner.recordDecision(decision2, true, 10); // Same success, more data
      }
      
      const summary = learner.getSummary();
      const agent2Score = summary.topPerformers.find(p => p.agentId === 'agent2')?.score;
      const agent1Score = summary.topPerformers.find(p => p.agentId === 'agent1')?.score;
      
      expect(agent2Score).toBeGreaterThan(agent1Score!);
    });
  });

  describe('Learning Summary', () => {
    it('should provide comprehensive summary', () => {
      const decision = createDecision('task-1', 'agent1');
      learner.recordDecision(decision, true, 10);
      
      const summary = learner.getSummary();
      
      expect(summary.totalAgents).toBe(1);
      expect(summary.totalDecisions).toBe(1);
      expect(summary.agentsWithLearningData).toBe(0); // Below minTasksForLearning
      expect(summary.averageSuccessRate).toBe(0);
      expect(summary.learningEnabled).toBe(true);
    });

    it('should calculate average success rate across agents', () => {
      const agents = ['agent1', 'agent2', 'agent3'];
      
      agents.forEach((agentId, index) => {
        const decision = createDecision('task', agentId);
        const successRate = 0.7 + (index * 0.1);
        for (let i = 0; i < 10; i++) {
          learner.recordDecision(decision, Math.random() < successRate, 10);
        }
      });
      
      const summary = learner.getSummary();
      expect(summary.agentsWithLearningData).toBe(3);
      expect(summary.averageSuccessRate).toBeGreaterThan(0.7);
      expect(summary.averageSuccessRate).toBeLessThan(0.9);
    });

    it('should return empty summary with no data', () => {
      const summary = learner.getSummary();
      
      expect(summary.totalAgents).toBe(0);
      expect(summary.totalDecisions).toBe(0);
      expect(summary.agentsWithLearningData).toBe(0);
      expect(summary.averageSuccessRate).toBe(0);
      expect(summary.topPerformers).toHaveLength(0);
    });
  });
});
