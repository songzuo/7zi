/**
 * Schedule Decision Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  ScheduleHistory,
  createScheduleDecision,
  ScheduleDecision
} from '../../../src/lib/agent-scheduler/models/schedule-decision';

describe('ScheduleHistory', () => {
  let history: ScheduleHistory;

  beforeEach(() => {
    history = new ScheduleHistory();
  });

  describe('addDecision', () => {
    it('should add decision to history', () => {
      const decision = createScheduleDecision({
        taskId: 'task-1',
        assignedAgent: 'architect',
        confidence: 0.85,
        reasoning: 'Good match for architecture task',
        alternativeAgents: ['agent-expert'],
        estimatedCompletion: Date.now() + 3600000,
        scores: {
          capability: 0.9,
          load: 0.8,
          performance: 0.85,
          response: 0.9,
          total: 0.85
        }
      });

      history.addDecision(decision);

      expect(history.getAllDecisions()).toHaveLength(1);
    });
  });

  describe('getDecision', () => {
    it('should retrieve decision by task ID', () => {
      const decision = createScheduleDecision({
        taskId: 'task-1',
        assignedAgent: 'architect',
        confidence: 0.85,
        reasoning: 'Good match',
        alternativeAgents: [],
        estimatedCompletion: Date.now() + 3600000,
        scores: {
          capability: 0.9,
          load: 0.8,
          performance: 0.85,
          response: 0.9,
          total: 0.85
        }
      });

      history.addDecision(decision);

      const retrieved = history.getDecision('task-1');

      expect(retrieved).toEqual(decision);
    });

    it('should return undefined for non-existent task', () => {
      const retrieved = history.getDecision('non-existent');
      expect(retrieved).toBeUndefined();
    });
  });

  describe('getAgentDecisions', () => {
    it('should get decisions for specific agent', () => {
      const decision1 = createScheduleDecision({
        taskId: 'task-1',
        assignedAgent: 'architect',
        confidence: 0.85,
        reasoning: 'Good match',
        alternativeAgents: [],
        estimatedCompletion: Date.now() + 3600000,
        scores: {
          capability: 0.9,
          load: 0.8,
          performance: 0.85,
          response: 0.9,
          total: 0.85
        }
      });

      const decision2 = createScheduleDecision({
        taskId: 'task-2',
        assignedAgent: 'executor',
        confidence: 0.9,
        reasoning: 'Good match',
        alternativeAgents: [],
        estimatedCompletion: Date.now() + 3600000,
        scores: {
          capability: 0.85,
          load: 0.9,
          performance: 0.9,
          response: 0.85,
          total: 0.9
        }
      });

      history.addDecision(decision1);
      history.addDecision(decision2);

      const architectDecisions = history.getAgentDecisions('architect');

      expect(architectDecisions).toHaveLength(1);
      expect(architectDecisions[0].assignedAgent).toBe('architect');
    });
  });

  describe('getDecisionsInRange', () => {
    it('should filter decisions by time range', () => {
      const now = Date.now();

      const decision1 = createScheduleDecision({
        taskId: 'task-1',
        assignedAgent: 'architect',
        confidence: 0.85,
        reasoning: 'Good match',
        alternativeAgents: [],
        estimatedCompletion: now + 3600000,
        scores: {
          capability: 0.9,
          load: 0.8,
          performance: 0.85,
          response: 0.9,
          total: 0.85
        }
      });

      const decision2 = createScheduleDecision({
        taskId: 'task-2',
        assignedAgent: 'executor',
        confidence: 0.9,
        reasoning: 'Good match',
        alternativeAgents: [],
        estimatedCompletion: now + 3600000,
        scores: {
          capability: 0.85,
          load: 0.9,
          performance: 0.9,
          response: 0.85,
          total: 0.9
        }
      });

      history.addDecision(decision1);
      history.addDecision(decision2);

      const inRange = history.getDecisionsInRange(
        now - 1000,
        now + 1000
      );

      expect(inRange.length).toBeGreaterThan(0);
    });
  });

  describe('getRecentDecisions', () => {
    it('should return most recent decisions', () => {
      for (let i = 0; i < 5; i++) {
        const decision = createScheduleDecision({
          taskId: `task-${i}`,
          assignedAgent: 'architect',
          confidence: 0.85,
          reasoning: 'Good match',
          alternativeAgents: [],
          estimatedCompletion: Date.now() + 3600000,
          scores: {
            capability: 0.9,
            load: 0.8,
            performance: 0.85,
            response: 0.9,
            total: 0.85
          }
        });

        history.addDecision(decision);
      }

      const recent = history.getRecentDecisions(3);

      expect(recent).toHaveLength(3);
    });

    it('should return all if count exceeds total', () => {
      const decision = createScheduleDecision({
        taskId: 'task-1',
        assignedAgent: 'architect',
        confidence: 0.85,
        reasoning: 'Good match',
        alternativeAgents: [],
        estimatedCompletion: Date.now() + 3600000,
        scores: {
          capability: 0.9,
          load: 0.8,
          performance: 0.85,
          response: 0.9,
          total: 0.85
        }
      });

      history.addDecision(decision);

      const recent = history.getRecentDecisions(10);

      expect(recent).toHaveLength(1);
    });
  });

  describe('getMetrics', () => {
    it('should track total decisions', () => {
      const decision = createScheduleDecision({
        taskId: 'task-1',
        assignedAgent: 'architect',
        confidence: 0.85,
        reasoning: 'Good match',
        alternativeAgents: [],
        estimatedCompletion: Date.now() + 3600000,
        scores: {
          capability: 0.9,
          load: 0.8,
          performance: 0.85,
          response: 0.9,
          total: 0.85
        }
      });

      history.addDecision(decision);

      const metrics = history.getMetrics();

      expect(metrics.totalDecisions).toBe(1);
      expect(metrics.automaticDecisions).toBe(1);
      expect(metrics.manualOverrides).toBe(0);
    });

    it('should track manual overrides', () => {
      const decision = createScheduleDecision({
        taskId: 'task-1',
        assignedAgent: 'architect',
        confidence: 1.0,
        reasoning: 'Manual assignment',
        alternativeAgents: [],
        estimatedCompletion: Date.now() + 3600000,
        scores: {
          capability: 0.9,
          load: 0.8,
          performance: 0.85,
          response: 0.9,
          total: 0.85
        },
        manualOverride: true,
        overrideBy: 'user-1'
      });

      history.addDecision(decision);

      const metrics = history.getMetrics();

      expect(metrics.manualOverrides).toBe(1);
      expect(metrics.automaticDecisions).toBe(0);
    });

    it('should track agent utilization', () => {
      const decision1 = createScheduleDecision({
        taskId: 'task-1',
        assignedAgent: 'architect',
        confidence: 0.85,
        reasoning: 'Good match',
        alternativeAgents: [],
        estimatedCompletion: Date.now() + 3600000,
        scores: {
          capability: 0.9,
          load: 0.8,
          performance: 0.85,
          response: 0.9,
          total: 0.85
        }
      });

      const decision2 = createScheduleDecision({
        taskId: 'task-2',
        assignedAgent: 'architect',
        confidence: 0.9,
        reasoning: 'Good match',
        alternativeAgents: [],
        estimatedCompletion: Date.now() + 3600000,
        scores: {
          capability: 0.85,
          load: 0.9,
          performance: 0.9,
          response: 0.85,
          total: 0.9
        }
      });

      history.addDecision(decision1);
      history.addDecision(decision2);

      const metrics = history.getMetrics();

      expect(metrics.agentUtilization['architect']).toBeDefined();
      expect(metrics.agentUtilization['architect']!.assigned).toBe(2);
    });
  });

  describe('recordCompletion', () => {
    it('should record successful completion', () => {
      const decision = createScheduleDecision({
        taskId: 'task-1',
        assignedAgent: 'architect',
        confidence: 0.85,
        reasoning: 'Good match',
        alternativeAgents: [],
        estimatedCompletion: Date.now() + 3600000,
        scores: {
          capability: 0.9,
          load: 0.8,
          performance: 0.85,
          response: 0.9,
          total: 0.85
        }
      });

      history.addDecision(decision);
      history.recordCompletion('task-1', true, 15);

      const metrics = history.getMetrics();

      expect(metrics.agentUtilization['architect']!.completed).toBe(1);
      expect(metrics.agentUtilization['architect']!.failed).toBe(0);
    });

    it('should record failure', () => {
      const decision = createScheduleDecision({
        taskId: 'task-1',
        assignedAgent: 'architect',
        confidence: 0.85,
        reasoning: 'Good match',
        alternativeAgents: [],
        estimatedCompletion: Date.now() + 3600000,
        scores: {
          capability: 0.9,
          load: 0.8,
          performance: 0.85,
          response: 0.9,
          total: 0.85
        }
      });

      history.addDecision(decision);
      history.recordCompletion('task-1', false, 10);

      const metrics = history.getMetrics();

      expect(metrics.agentUtilization['architect']!.completed).toBe(0);
      expect(metrics.agentUtilization['architect']!.failed).toBe(1);
    });

    it('should update average completion time', () => {
      const decision = createScheduleDecision({
        taskId: 'task-1',
        assignedAgent: 'architect',
        confidence: 0.85,
        reasoning: 'Good match',
        alternativeAgents: [],
        estimatedCompletion: Date.now() + 3600000,
        scores: {
          capability: 0.9,
          load: 0.8,
          performance: 0.85,
          response: 0.9,
          total: 0.85
        }
      });

      history.addDecision(decision);
      history.recordCompletion('task-1', true, 10);
      history.recordCompletion('task-1', true, 20);

      const metrics = history.getMetrics();

      expect(metrics.agentUtilization['architect']!.averageCompletionTime).toBe(15);
    });
  });

  describe('clear', () => {
    it('should clear all decisions', () => {
      const decision = createScheduleDecision({
        taskId: 'task-1',
        assignedAgent: 'architect',
        confidence: 0.85,
        reasoning: 'Good match',
        alternativeAgents: [],
        estimatedCompletion: Date.now() + 3600000,
        scores: {
          capability: 0.9,
          load: 0.8,
          performance: 0.85,
          response: 0.9,
          total: 0.85
        }
      });

      history.addDecision(decision);
      history.clear();

      expect(history.getAllDecisions()).toHaveLength(0);
      expect(history.getMetrics().totalDecisions).toBe(0);
    });
  });

  describe('export', () => {
    it('should export history to JSON', () => {
      const decision = createScheduleDecision({
        taskId: 'task-1',
        assignedAgent: 'architect',
        confidence: 0.85,
        reasoning: 'Good match',
        alternativeAgents: [],
        estimatedCompletion: Date.now() + 3600000,
        scores: {
          capability: 0.9,
          load: 0.8,
          performance: 0.85,
          response: 0.9,
          total: 0.85
        }
      });

      history.addDecision(decision);

      const exported = history.export();

      expect(exported).toBeDefined();

      const parsed = JSON.parse(exported);

      expect(parsed.decisions).toHaveLength(1);
      expect(parsed.metrics).toBeDefined();
      expect(parsed.exportTime).toBeDefined();
    });
  });

  describe('import', () => {
    it('should import history from JSON', () => {
      const decision = createScheduleDecision({
        taskId: 'task-1',
        assignedAgent: 'architect',
        confidence: 0.85,
        reasoning: 'Good match',
        alternativeAgents: [],
        estimatedCompletion: Date.now() + 3600000,
        scores: {
          capability: 0.9,
          load: 0.8,
          performance: 0.85,
          response: 0.9,
          total: 0.85
        }
      });

      history.addDecision(decision);
      const exported = history.export();

      const newHistory = new ScheduleHistory();
      newHistory.import(exported);

      expect(newHistory.getAllDecisions()).toHaveLength(1);
      expect(newHistory.getDecision('task-1')).toBeDefined();
    });

    it('should throw on invalid JSON', () => {
      expect(() => {
        history.import('invalid json');
      }).toThrow();
    });
  });

  describe('getAccuracy', () => {
    it('should return decision accuracy', () => {
      const decision = createScheduleDecision({
        taskId: 'task-1',
        assignedAgent: 'architect',
        confidence: 0.85,
        reasoning: 'Good match',
        alternativeAgents: [],
        estimatedCompletion: Date.now() + 3600000,
        scores: {
          capability: 0.9,
          load: 0.8,
          performance: 0.85,
          response: 0.9,
          total: 0.85
        }
      });

      history.addDecision(decision);

      const accuracy = history.getAccuracy();

      expect(accuracy).toBeGreaterThanOrEqual(0);
      expect(accuracy).toBeLessThanOrEqual(1);
    });
  });

  describe('getTopAgents', () => {
    it('should return top performing agents', () => {
      const decision1 = createScheduleDecision({
        taskId: 'task-1',
        assignedAgent: 'architect',
        confidence: 0.85,
        reasoning: 'Good match',
        alternativeAgents: [],
        estimatedCompletion: Date.now() + 3600000,
        scores: {
          capability: 0.9,
          load: 0.8,
          performance: 0.85,
          response: 0.9,
          total: 0.85
        }
      });

      const decision2 = createScheduleDecision({
        taskId: 'task-2',
        assignedAgent: 'executor',
        confidence: 0.9,
        reasoning: 'Good match',
        alternativeAgents: [],
        estimatedCompletion: Date.now() + 3600000,
        scores: {
          capability: 0.85,
          load: 0.9,
          performance: 0.9,
          response: 0.85,
          total: 0.9
        }
      });

      history.addDecision(decision1);
      history.addDecision(decision2);

      // Record completions
      history.recordCompletion('task-1', true, 10);
      history.recordCompletion('task-1', true, 15);
      history.recordCompletion('task-2', true, 12);
      history.recordCompletion('task-2', false, 8);

      const topAgents = history.getTopAgents(2);

      expect(topAgents).toHaveLength(2);
    });
  });
});

describe('createScheduleDecision', () => {
  it('should create schedule decision', () => {
    const decision = createScheduleDecision({
      taskId: 'task-1',
      assignedAgent: 'architect',
      confidence: 0.85,
      reasoning: 'Good match',
      alternativeAgents: ['agent-expert'],
      estimatedCompletion: Date.now() + 3600000,
      scores: {
        capability: 0.9,
        load: 0.8,
        performance: 0.85,
        response: 0.9,
        total: 0.85
      }
    });

    expect(decision.taskId).toBe('task-1');
    expect(decision.assignedAgent).toBe('architect');
    expect(decision.confidence).toBe(0.85);
    expect(decision.decisionTime).toBeDefined();
  });

  it('should include manual override fields', () => {
    const decision = createScheduleDecision({
      taskId: 'task-1',
      assignedAgent: 'architect',
      confidence: 1.0,
      reasoning: 'Manual assignment',
      alternativeAgents: [],
      estimatedCompletion: Date.now() + 3600000,
      scores: {
        capability: 0.9,
        load: 0.8,
        performance: 0.85,
        response: 0.9,
        total: 0.85
      },
      manualOverride: true,
      overrideBy: 'user-1'
    });

    expect(decision.manualOverride).toBe(true);
    expect(decision.overrideBy).toBe('user-1');
  });
});
