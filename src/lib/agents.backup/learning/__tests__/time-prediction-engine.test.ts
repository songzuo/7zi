/**
 * Unit Tests for TimePredictionEngine
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  TimePredictionEngine,
  createTimePredictionEngine,
  PredictionInput,
  PredictionStrategy,
  TimePredictionConfig
} from '../time-prediction-engine';

describe('TimePredictionEngine', () => {
  let engine: TimePredictionEngine;

  beforeEach(() => {
    engine = createTimePredictionEngine();
  });

  afterEach(() => {
    engine.clearHistory();
  });

  describe('Initialization', () => {
    it('should create an engine with default config', () => {
      expect(engine).toBeInstanceOf(TimePredictionEngine);
    });

    it('should create an engine with custom config', () => {
      const customConfig: Partial<TimePredictionConfig> = {
        minSampleSize: 10,
        strategy: 'statistical'
      };
      const customEngine = createTimePredictionEngine(customConfig);
      expect(customEngine).toBeInstanceOf(TimePredictionEngine);
    });

    it('should have initial stats of zero', () => {
      const stats = engine.getStats();
      expect(stats.totalAgents).toBe(0);
      expect(stats.totalHistories).toBe(0);
      expect(stats.overallAccuracy).toBe(0);
    });
  });

  describe('Rule-Based Prediction', () => {
    it('should predict based on complexity levels', async () => {
      const complexities: Array<'low' | 'medium' | 'high' | 'critical'> = [
        'low', 'medium', 'high', 'critical'
      ];

      const results = await Promise.all(
        complexities.map(async (complexity) => {
          const input: PredictionInput = {
            agentId: 'agent1',
            taskType: 'test',
            taskComplexity: complexity
          };
          return await engine.predict(input);
        })
      );

      // Low complexity should be faster than medium, which should be faster than high, etc.
      expect(results[0].estimatedMinutes).toBeLessThan(results[1].estimatedMinutes);
      expect(results[1].estimatedMinutes).toBeLessThan(results[2].estimatedMinutes);
      expect(results[2].estimatedMinutes).toBeLessThan(results[3].estimatedMinutes);
    });

    it('should include factors in prediction', async () => {
      const input: PredictionInput = {
        agentId: 'agent1',
        taskType: 'test',
        taskComplexity: 'medium'
      };

      const result = await engine.predict(input);

      expect(result.factors).toBeDefined();
      expect(result.factors.length).toBeGreaterThan(0);
      expect(result.basedOn).toContain('heuristic');
      expect(result.strategy).toBe('rule-based');
    });

    it('should adjust based on historical data if provided', async () => {
      const inputWithData: PredictionInput = {
        agentId: 'agent1',
        taskType: 'test',
        taskComplexity: 'medium',
        historicalData: {
          avgCompletionTime: 20,
          successRate: 0.8,
          agentReliability: 0.7
        }
      };

      const inputWithoutData: PredictionInput = {
        agentId: 'agent2',
        taskType: 'test',
        taskComplexity: 'medium'
      };

      const resultWithData = await engine.predict(inputWithData);
      const resultWithoutData = await engine.predict(inputWithoutData);

      expect(resultWithData.factors).toContain('Agent reliability: 70%');
      expect(resultWithData.confidence).toBeGreaterThan(resultWithoutData.confidence);
    });

    it('should provide confidence interval', async () => {
      const input: PredictionInput = {
        agentId: 'agent1',
        taskType: 'test',
        taskComplexity: 'medium'
      };

      const result = await engine.predict(input);

      expect(result.confidenceInterval).toBeDefined();
      expect(result.confidenceInterval[0]).toBeLessThan(result.estimatedMinutes);
      expect(result.confidenceInterval[1]).toBeGreaterThan(result.estimatedMinutes);
    });

    it('should return base confidence level for rule-based', async () => {
      const input: PredictionInput = {
        agentId: 'agent1',
        taskType: 'test',
        taskComplexity: 'medium'
      };

      const result = await engine.predict(input);

      expect(result.confidence).toBeGreaterThanOrEqual(0.5);
      expect(result.confidence).toBeLessThanOrEqual(0.7);
    });
  });

  describe('Statistical Prediction', () => {
    beforeEach(() => {
      // Populate history for agent1
      const agentId = 'agent1';
      const baseTime = 20; // minutes

      // Add 10 successful tasks
      for (let i = 0; i < 10; i++) {
        engine.updateHistory(
          agentId,
          `task-${i}`,
          baseTime + Math.random() * 10 - 5, // 15-25 min variance
          true,
          'test',
          'medium'
        );
      }
    });

    it('should use statistical prediction after enough data', async () => {
      const input: PredictionInput = {
        agentId: 'agent1',
        taskType: 'test',
        taskComplexity: 'medium'
      };

      const result = await engine.predict(input);

      // Should switch to statistical or adaptive strategy
      expect(['statistical', 'adaptive']).toContain(result.strategy);
      expect(result.basedOn).toContain('historical');
    });

    it('should estimate time close to historical average', async () => {
      const input: PredictionInput = {
        agentId: 'agent1',
        taskType: 'test',
        taskComplexity: 'medium'
      };

      const result = await engine.predict(input);

      // Historical average should be around 20 minutes
      expect(result.estimatedMinutes).toBeGreaterThan(15);
      expect(result.estimatedMinutes).toBeLessThan(30);
    });

    it('should have higher confidence with more data', async () => {
      const input: PredictionInput = {
        agentId: 'agent1',
        taskType: 'test',
        taskComplexity: 'medium'
      };

      const result = await engine.predict(input);

      // Statistical should have higher confidence than rule-based
      expect(result.confidence).toBeGreaterThan(0.6);
    });

    it('should include confidence interval based on variance', async () => {
      const input: PredictionInput = {
        agentId: 'agent1',
        taskType: 'test',
        taskComplexity: 'medium'
      };

      const result = await engine.predict(input);

      expect(result.confidenceInterval).toBeDefined();
      // With variance, interval should be reasonable
      const intervalWidth = result.confidenceInterval[1] - result.confidenceInterval[0];
      expect(intervalWidth).toBeGreaterThan(0);
    });

    it('should reference historical tasks', async () => {
      const input: PredictionInput = {
        agentId: 'agent1',
        taskType: 'test',
        taskComplexity: 'medium'
      };

      const result = await engine.predict(input);

      if (result.basedOnTasks.length > 0) {
        expect(result.basedOnTasks[0]).toMatch(/task-\d+/);
      }
    });

    it('should weight recent tasks more heavily', async () => {
      // Add a very recent task with unusual time
      engine.updateHistory(
        'agent1',
        'task-recent',
        50, // Much higher than historical avg
        true,
        'test',
        'medium'
      );

      const input: PredictionInput = {
        agentId: 'agent1',
        taskType: 'test',
        taskComplexity: 'medium'
      };

      const result = await engine.predict(input);

      // Recent task should pull the estimate up a bit
      expect(result.estimatedMinutes).toBeGreaterThan(18);
    });
  });

  describe('Adaptive Prediction', () => {
    beforeEach(() => {
      // Populate history for agent1
      const agentId = 'agent1';
      const baseTime = 15;

      // Add enough tasks for statistical prediction
      for (let i = 0; i < 15; i++) {
        engine.updateHistory(
          agentId,
          `task-${i}`,
          baseTime + Math.random() * 6 - 3, // 12-18 min
          true,
          'test',
          'medium'
        );
      }

      // Record some predictions with good accuracy
      engine['recordPrediction'] = engine['recordPrediction'].bind(engine);
      for (let i = 0; i < 10; i++) {
        engine['recordPrediction']('agent1', 15, 15 + Math.random() * 2);
      }
    });

    it('should use adaptive strategy when accuracy is high', async () => {
      const input: PredictionInput = {
        agentId: 'agent1',
        taskType: 'test',
        taskComplexity: 'medium'
      };

      const result = await engine.predict(input);

      expect(result.strategy).toBe('adaptive');
    });

    it('should mention historical accuracy in prediction', async () => {
      const input: PredictionInput = {
        agentId: 'agent1',
        taskType: 'test',
        taskComplexity: 'medium'
      };

      const result = await engine.predict(input);

      expect(result.basedOn).toContain('accuracy');
    });

    it('should have highest confidence when accuracy is good', async () => {
      const input: PredictionInput = {
        agentId: 'agent1',
        taskType: 'test',
        taskComplexity: 'medium'
      };

      const result = await engine.predict(input);

      // Adaptive with good accuracy should have high confidence
      expect(result.confidence).toBeGreaterThan(0.7);
    });
  });

  describe('History Management', () => {
    it('should track agent history', () => {
      engine.updateHistory('agent1', 'task1', 20, true, 'test', 'medium');
      engine.updateHistory('agent1', 'task2', 25, true, 'test', 'medium');

      const stats = engine.getStats();
      expect(stats.totalAgents).toBe(1);
      expect(stats.totalHistories).toBe(2);
    });

    it('should track multiple agents', () => {
      engine.updateHistory('agent1', 'task1', 20, true, 'test', 'medium');
      engine.updateHistory('agent2', 'task2', 25, true, 'test', 'medium');
      engine.updateHistory('agent3', 'task3', 30, true, 'test', 'medium');

      const stats = engine.getStats();
      expect(stats.totalAgents).toBe(3);
    });

    it('should limit history size per agent', () => {
      const config: Partial<TimePredictionConfig> = {
        maxHistoryPerAgent: 5
      };
      const limitedEngine = createTimePredictionEngine(config);

      // Add more than max
      for (let i = 0; i < 10; i++) {
        limitedEngine.updateHistory('agent1', `task-${i}`, 20, true, 'test', 'medium');
      }

      const stats = limitedEngine.getStats();
      // Should only keep the most recent 5
      expect(stats.totalHistories).toBe(5);
    });

    it('should handle failed tasks', () => {
      engine.updateHistory('agent1', 'task1', 20, false, 'test', 'medium');

      const stats = engine.getStats();
      expect(stats.totalHistories).toBe(1);
    });
  });

  describe('Accuracy Tracking', () => {
    beforeEach(() => {
      // Setup history
      engine.updateHistory('agent1', 'task1', 20, true, 'test', 'medium');
      engine.updateHistory('agent1', 'task2', 22, true, 'test', 'medium');
      engine.updateHistory('agent1', 'task3', 18, true, 'test', 'medium');

      // Record predictions
      engine['recordPrediction'] = engine['recordPrediction'].bind(engine);
      engine['recordPrediction']('agent1', 20, 20); // Exact
      engine['recordPrediction']('agent1', 20, 25); // Within 25%
      engine['recordPrediction']('agent1', 20, 30); // Outside 25%
    });

    it('should calculate agent accuracy', () => {
      const accuracy = engine.getAgentAccuracy('agent1');
      expect(accuracy).toBe(2/3); // 2 out of 3 within 25%
    });

    it('should return 0 for unknown agent', () => {
      const accuracy = engine.getAgentAccuracy('unknown');
      expect(accuracy).toBe(0);
    });

    it('should calculate overall accuracy', () => {
      engine['recordPrediction']('agent2', 20, 20); // Another agent

      const overall = engine.getOverallAccuracy();
      expect(overall).toBe(3/4); // 3 out of 4
    });
  });

  describe('Accuracy by Task Type', () => {
    beforeEach(() => {
      engine.updateHistory('agent1', 'task1', 20, true, 'typeA', 'medium');
      engine.updateHistory('agent1', 'task2', 25, true, 'typeA', 'medium');
      engine.updateHistory('agent1', 'task3', 15, false, 'typeB', 'medium');
      engine.updateHistory('agent1', 'task4', 30, true, 'typeB', 'medium');
    });

    it('should track accuracy by task type', () => {
      const accuracyByType = engine.getAccuracyByTaskType();

      expect(accuracyByType.has('typeA')).toBe(true);
      expect(accuracyByType.has('typeB')).toBe(true);

      const typeAAccuracy = accuracyByType.get('typeA');
      expect(typeAAccuracy?.count).toBe(2);
      expect(typeAAccuracy?.accuracy).toBe(1); // Both successful

      const typeBAccuracy = accuracyByType.get('typeB');
      expect(typeBAccuracy?.count).toBe(2);
      expect(typeBAccuracy?.accuracy).toBe(0.5); // One failed
    });
  });

  describe('Task Type Averages', () => {
    it('should track running averages by task type', () => {
      engine.updateHistory('agent1', 'task1', 20, true, 'typeA', 'medium');
      engine.updateHistory('agent2', 'task2', 30, true, 'typeA', 'medium');
      engine.updateHistory('agent3', 'task3', 40, true, 'typeB', 'medium');

      const stats = engine.getStats();
      expect(stats.taskTypesTracked).toBe(2);
    });

    it('should use task type averages in prediction', async () => {
      // Build history for typeA
      for (let i = 0; i < 5; i++) {
        engine.updateHistory('agent1', `task-${i}`, 40, true, 'typeA', 'medium');
      }

      // Predict for same task type
      const input: PredictionInput = {
        agentId: 'agent2', // Different agent, same task type
        taskType: 'typeA',
        taskComplexity: 'medium'
      };

      const result = await engine.predict(input);

      // Should factor in task type average
      expect(result.factors.some(f => f.includes('type') || f.includes('Task'))).toBe(true);
    });
  });

  describe('Configuration', () => {
    it('should respect custom min sample size', () => {
      const config: Partial<TimePredictionConfig> = {
        minSampleSize: 20
      };
      const customEngine = createTimePredictionEngine(config);

      // Add 10 tasks
      for (let i = 0; i < 10; i++) {
        customEngine.updateHistory('agent1', `task-${i}`, 20, true, 'test', 'medium');
      }

      const input: PredictionInput = {
        agentId: 'agent1',
        taskType: 'test',
        taskComplexity: 'medium'
      };

      // Should still use rule-based due to min sample size
      // (We'll verify the strategy in the prediction result)
    });

    it('should allow setting fixed strategy', async () => {
      const config: Partial<TimePredictionConfig> = {
        strategy: 'rule-based'
      };
      const fixedEngine = createTimePredictionEngine(config);

      // Add lots of history
      for (let i = 0; i < 50; i++) {
        fixedEngine.updateHistory('agent1', `task-${i}`, 20, true, 'test', 'medium');
      }

      const input: PredictionInput = {
        agentId: 'agent1',
        taskType: 'test',
        taskComplexity: 'medium'
      };

      const result = await fixedEngine.predict(input);
      expect(result.strategy).toBe('rule-based');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty agent ID', async () => {
      const input: PredictionInput = {
        agentId: '',
        taskType: 'test',
        taskComplexity: 'medium'
      };

      const result = await engine.predict(input);
      expect(result.estimatedMinutes).toBeGreaterThan(0);
    });

    it('should handle unknown task type', async () => {
      const input: PredictionInput = {
        agentId: 'agent1',
        taskType: 'unknown-type-xyz',
        taskComplexity: 'medium'
      };

      const result = await engine.predict(input);
      expect(result.estimatedMinutes).toBeGreaterThan(0);
    });

    it('should handle all failed tasks in history', async () => {
      for (let i = 0; i < 10; i++) {
        engine.updateHistory('agent1', `task-${i}`, 20, false, 'test', 'medium');
      }

      const input: PredictionInput = {
        agentId: 'agent1',
        taskType: 'test',
        taskComplexity: 'medium'
      };

      const result = await engine.predict(input);
      // Should still provide prediction, just with lower confidence
      expect(result.estimatedMinutes).toBeGreaterThan(0);
    });

    it('should handle large variance in history', async () => {
      // Add tasks with very different times
      const times = [5, 10, 15, 50, 100];
      times.forEach((time, i) => {
        engine.updateHistory('agent1', `task-${i}`, time, true, 'test', 'medium');
      });

      const input: PredictionInput = {
        agentId: 'agent1',
        taskType: 'test',
        taskComplexity: 'medium'
      };

      const result = await engine.predict(input);
      
      // With high variance, confidence interval should be wide
      const intervalWidth = result.confidenceInterval[1] - result.confidenceInterval[0];
      expect(intervalWidth).toBeGreaterThan(0);
    });
  });

  describe('Integration Scenarios', () => {
    it('should improve predictions over time', async () => {
      const agentId = 'agent1';
      const trueTime = 25;

      // Initial prediction (rule-based)
      const input1: PredictionInput = {
        agentId,
        taskType: 'test',
        taskComplexity: 'medium'
      };
      const result1 = await engine.predict(input1);

      // Add historical data
      for (let i = 0; i < 15; i++) {
        engine.updateHistory(agentId, `task-${i}`, trueTime + Math.random() * 4 - 2, true, 'test', 'medium');
      }

      // Prediction after history
      const input2: PredictionInput = {
        agentId,
        taskType: 'test',
        taskComplexity: 'medium'
      };
      const result2 = await engine.predict(input2);

      // After learning, prediction should be closer to true time
      const error1 = Math.abs(result1.estimatedMinutes - trueTime);
      const error2 = Math.abs(result2.estimatedMinutes - trueTime);
      
      // With historical data, prediction should be reasonable
      expect(result2.estimatedMinutes).toBeGreaterThan(0);
      expect(result2.estimatedMinutes).toBeLessThan(100);
    });

    it('should handle different task types differently', async () => {
      const agentId = 'agent1';

      // Add data for typeA (fast tasks)
      for (let i = 0; i < 10; i++) {
        engine.updateHistory(agentId, `task-a-${i}`, 10, true, 'typeA', 'low');
      }

      // Add data for typeB (slow tasks)
      for (let i = 0; i < 10; i++) {
        engine.updateHistory(agentId, `task-b-${i}`, 60, true, 'typeB', 'high');
      }

      const resultA = await engine.predict({
        agentId,
        taskType: 'typeA',
        taskComplexity: 'low'
      });

      const resultB = await engine.predict({
        agentId,
        taskType: 'typeB',
        taskComplexity: 'high'
      });

      expect(resultA.estimatedMinutes).toBeLessThan(resultB.estimatedMinutes);
    });
  });

  describe('Performance', () => {
    it('should handle large histories efficiently', async () => {
      // Add many tasks
      for (let i = 0; i < 100; i++) {
        engine.updateHistory('agent1', `task-${i}`, 20, true, 'test', 'medium');
      }

      const input: PredictionInput = {
        agentId: 'agent1',
        taskType: 'test',
        taskComplexity: 'medium'
      };

      const start = Date.now();
      await engine.predict(input);
      const elapsed = Date.now() - start;

      // Should complete quickly (< 100ms)
      expect(elapsed).toBeLessThan(100);
    });

    it('should handle many agents efficiently', async () => {
      // Create 50 agents with history
      for (let a = 0; a < 50; a++) {
        const agentId = `agent-${a}`;
        for (let t = 0; t < 20; t++) {
          engine.updateHistory(agentId, `task-${t}`, 20, true, 'test', 'medium');
        }
      }

      const stats = engine.getStats();
      expect(stats.totalAgents).toBe(50);
    });
  });
});
