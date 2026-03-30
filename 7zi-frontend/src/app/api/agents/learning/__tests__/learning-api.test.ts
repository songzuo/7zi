/**
 * Agent Learning API Integration Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { adaptiveLearner } from '@/lib/agents/learning/adaptive-learner';
import { agentScheduler } from '@/lib/agents/scheduler/scheduler';

describe('Agent Learning API', () => {
  let testAgentId: string;
  let testAgentId2: string;

  beforeEach(() => {
    adaptiveLearner.clear();
    
    testAgentId = `test_agent_${Date.now()}_1`;
    testAgentId2 = `test_agent_${Date.now()}_2`;
    
    agentScheduler.registerAgent(
      testAgentId,
      'Test Agent 1',
      'worker',
      ['image_processing', 'text_generation'],
      { version: '1.0' }
    );
    
    agentScheduler.registerAgent(
      testAgentId2,
      'Test Agent 2',
      'worker',
      ['image_processing'],
      { version: '2.0' }
    );

    const now = Date.now();
    
    for (let i = 0; i < 20; i++) {
      adaptiveLearner.recordTaskCompletion(
        `task_${i}`,
        'image_processing',
        testAgentId,
        now - (20 - i) * 60000,
        now - (20 - i) * 60000 + 100,
        now - (20 - i) * 60000 + 2600,
        'completed',
        'normal',
        1024,
        2048,
        0,
        0.3
      );
    }
    
    for (let i = 0; i < 10; i++) {
      adaptiveLearner.recordTaskCompletion(
        `task_2_${i}`,
        'image_processing',
        testAgentId2,
        now - (10 - i) * 60000,
        now - (10 - i) * 60000 + 100,
        now - (10 - i) * 60000 + 4000,
        i < 7 ? 'completed' : 'failed',
        'normal',
        1024,
        i < 7 ? 2048 : 0,
        0,
        0.5,
        i >= 7 ? 'timeout' : undefined
      );
    }
  });

  afterEach(() => {
    adaptiveLearner.clear();
    agentScheduler.clear();
  });

  describe('AdaptiveLearner Core', () => {
    it('should return all agents with learning stats', () => {
      const stats = adaptiveLearner.getAgentLearningStats();
      
      expect(stats).toBeDefined();
      expect(Array.isArray(stats)).toBe(true);
      expect(stats.length).toBeGreaterThanOrEqual(0);
    });

    it('should filter by agent ID when specified', () => {
      const stats = adaptiveLearner.getAgentLearningStats(testAgentId);
      
      expect(stats).toBeDefined();
      expect((stats as any).agentId).toBe(testAgentId);
    });

    it('should return detailed stats for specific agent', () => {
      const stats = adaptiveLearner.getAgentLearningStats(testAgentId);
      
      expect(stats).toBeDefined();
      expect((stats as any).agentId).toBe(testAgentId);
      expect((stats as any).totalTasksCompleted).toBeGreaterThan(0);
      expect((stats as any).overallScore).toBeGreaterThan(0);
    });

    it('should throw error for non-existent agent', () => {
      expect(() => {
        adaptiveLearner.getAgentLearningStats('non_existent_agent');
      }).toThrow('not found');
    });

    it('should successfully adjust agent weight', () => {
      const previousStats = adaptiveLearner.getAgentLearningStats(testAgentId) as any;
      const previousScore = previousStats.capabilityScores.get('image_processing')?.successRate || 0.5;

      adaptiveLearner.adjustWeight({
        agentId: testAgentId,
        taskType: 'image_processing',
        adjustment: 0.1,
        reason: 'Manual adjustment test',
      });

      const newStats = adaptiveLearner.getAgentLearningStats(testAgentId) as any;
      const newScore = newStats.capabilityScores.get('image_processing')?.successRate || 0;

      expect(newScore).toBeCloseTo(Math.min(1, previousScore + 0.1), 1);
    });

    it('should throw error for non-existent agent in adjust', () => {
      expect(() => {
        adaptiveLearner.adjustWeight({
          agentId: 'non_existent_agent',
          taskType: 'image_processing',
          adjustment: 0.1,
        });
      }).toThrow('not found');
    });

    it('should predict completion time', () => {
      const prediction = adaptiveLearner.predictCompletionTime({
        taskType: 'image_processing',
        inputSize: 1024,
        priority: 'normal',
        agentId: testAgentId,
        timeOfDay: 12,
        dayOfWeek: 1,
        historicalAvgTime: 2500,
        queueDepth: 3,
        agentLoad: 0.4,
      });

      expect(prediction).toBeDefined();
      expect(prediction.estimatedTime).toBeGreaterThan(0);
      expect(prediction.confidence).toBeGreaterThanOrEqual(0);
      expect(prediction.confidence).toBeLessThanOrEqual(1);
      expect(prediction.factors).toBeInstanceOf(Array);
    });

    it('should return system stats', () => {
      const stats = adaptiveLearner.getSystemStats();

      expect(stats).toBeDefined();
      expect(stats.totalAgents).toBe(2);
      expect(stats.totalTasksProcessed).toBeGreaterThan(0);
      expect(stats.avgCompletionTime).toBeGreaterThan(0);
    });

    it('should return aggregated stats', () => {
      const stats = adaptiveLearner.getAggregatedStats('day');

      expect(stats).toBeDefined();
      expect(stats.period).toBe('day');
      expect(stats.startTime).toBeLessThan(stats.endTime);
      expect(stats.tasksCompleted).toBeGreaterThan(0);
    });

    it('should calculate overall score correctly', () => {
      const stats = adaptiveLearner.getAgentLearningStats(testAgentId) as any;
      
      expect(stats.overallScore).toBeGreaterThan(0);
      expect(stats.overallScore).toBeLessThanOrEqual(1);
      
      const expectedOverall =
        stats.reliabilityScore * 0.4 +
        stats.speedScore * 0.3 +
        stats.qualityScore * 0.3;
      
      expect(stats.overallScore).toBeCloseTo(expectedOverall, 1);
    });

    it('should identify top performers', () => {
      const stats = adaptiveLearner.getAggregatedStats('day');
      
      expect(stats.topPerformers).toBeDefined();
      expect(stats.topPerformers).toContain(testAgentId);
    });
  });
});
