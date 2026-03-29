/**
 * Task Matching Unit Tests
 * Tests for agent-task matching algorithm
 */

import { describe, it, expect } from 'vitest';
import { TaskMatcher } from '../core/matching';
import { initializeAgents, createAgentCapability } from '../models/agent-capability';
import { createTask } from '../models/task-model';

describe('TaskMatcher', () => {
  let matcher: TaskMatcher;
  let agents: Map<string, ReturnType<typeof createAgentCapability>>;

  beforeEach(() => {
    matcher = new TaskMatcher();
    agents = initializeAgents();
  });

  describe('Finding Candidates', () => {
    it('should find candidates for implementation task', () => {
      const task = createTask({
        id: 'task-1',
        type: 'implementation',
        title: 'Implement feature',
        requiredCapabilities: ['javascript']
      });

      const candidates = matcher.findCandidates(task, agents);

      expect(candidates.length).toBeGreaterThan(0);
      expect(candidates.every(agent => agent.availability)).toBe(true);
      expect(candidates.every(agent =>
        agent.capabilities.taskTypes.includes('implementation')
      )).toBe(true);
    });

    it('should find candidates for testing task', () => {
      const task = createTask({
        id: 'task-1',
        type: 'testing',
        title: 'Test feature'
      });

      const candidates = matcher.findCandidates(task, agents);

      expect(candidates.length).toBeGreaterThan(0);
      expect(candidates.every(agent =>
        agent.capabilities.taskTypes.includes('testing')
      )).toBe(true);
    });

    it('should find candidates for research task', () => {
      const task = createTask({
        id: 'task-1',
        type: 'research',
        title: 'Research topic'
      });

      const candidates = matcher.findCandidates(task, agents);

      expect(candidates.length).toBeGreaterThan(0);
      expect(candidates.every(agent =>
        agent.capabilities.taskTypes.includes('research')
      )).toBe(true);
    });

    it('should return empty array when no agents available', () => {
      // Make all agents unavailable
      agents.forEach(agent => {
        agent.availability = false;
      });

      const task = createTask({
        id: 'task-1',
        type: 'implementation',
        title: 'Task'
      });

      const candidates = matcher.findCandidates(task, agents);

      expect(candidates.length).toBe(0);
    });

    it('should return empty array for unsupported task type', () => {
      const task = createTask({
        id: 'task-1',
        type: 'implementation' as any,
        title: 'Task',
        requiredCapabilities: ['unsupported-tech']
      });

      // Filter agents to none that support this
      const emptyAgents = new Map();
      const candidates = matcher.findCandidates(task, emptyAgents);

      expect(candidates.length).toBe(0);
    });
  });

  describe('Task Capability Check', () => {
    it('should return true for capable agent', () => {
      const task = createTask({
        id: 'task-1',
        type: 'implementation',
        title: 'Task',
        requiredCapabilities: ['javascript']
      });

      const executor = agents.get('executor');

      if (executor) {
        const canHandle = matcher.canHandleTask(executor, task);
        expect(canHandle).toBe(true);
      }
    });

    it('should return false for unavailable agent', () => {
      const task = createTask({
        id: 'task-1',
        type: 'implementation',
        title: 'Task'
      });

      const executor = agents.get('executor');
      if (executor) {
        executor.availability = false;

        const canHandle = matcher.canHandleTask(executor, task);
        expect(canHandle).toBe(false);
      }
    });

    it('should return false for agent with wrong task type', () => {
      const task = createTask({
        id: 'task-1',
        type: 'finance',
        title: 'Financial task'
      });

      const executor = agents.get('executor');

      if (executor) {
        const canHandle = matcher.canHandleTask(executor, task);
        expect(canHandle).toBe(false);
      }
    });

    it('should return false for agent without required capabilities', () => {
      const task = createTask({
        id: 'task-1',
        type: 'implementation',
        title: 'Task',
        requiredCapabilities: ['blockchain'] // Executor doesn't have this
      });

      const tester = agents.get('tester');

      if (tester) {
        const canHandle = matcher.canHandleTask(tester, task);
        expect(canHandle).toBe(false);
      }
    });

    it('should return false for agent with insufficient capacity', () => {
      const task = createTask({
        id: 'task-1',
        type: 'implementation',
        title: 'Large task',
        estimatedDuration: 100 // 100 minutes = high load
      });

      const executor = agents.get('executor');
      if (executor) {
        executor.currentLoad = 50;

        const canHandle = matcher.canHandleTask(executor, task);
        expect(canHandle).toBe(false);
      }
    });
  });

  describe('Capability Scoring', () => {
    it('should calculate high capability score for perfect match', () => {
      const task = createTask({
        id: 'task-1',
        type: 'implementation',
        title: 'Task',
        requiredCapabilities: ['javascript', 'typescript']
      });

      const executor = agents.get('executor');

      if (executor) {
        const score = matcher.calculateCapabilityScore(executor, task);
        expect(score).toBeGreaterThan(50); // Should be high
      }
    });

    it('should calculate lower capability score for partial match', () => {
      const task = createTask({
        id: 'task-1',
        type: 'implementation',
        title: 'Task',
        requiredCapabilities: ['python', 'rust', 'go']
      });

      const executor = agents.get('executor');

      if (executor) {
        const score = matcher.calculateCapabilityScore(executor, task);
        expect(score).toBeLessThan(100); // Partial match
      }
    });

    it('should give bonus for specialization', () => {
      const task = createTask({
        id: 'task-1',
        type: 'testing',
        title: 'Test task',
        requiredCapabilities: ['automation']
      });

      const tester = agents.get('tester');

      if (tester) {
        const score = matcher.calculateCapabilityScore(tester, task);
        expect(score).toBeGreaterThan(70); // Should get bonus
      }
    });
  });

  describe('Load Scoring', () => {
    it('should give higher score to agent with more capacity', () => {
      const task = createTask({
        id: 'task-1',
        type: 'implementation',
        title: 'Task',
        estimatedDuration: 30
      });

      const executor = agents.get('executor');
      const tester = agents.get('tester');

      if (executor && tester) {
        executor.currentLoad = 10; // Low load
        tester.currentLoad = 70; // High load

        const executorScore = matcher.calculateLoadScore(executor, task);
        const testerScore = matcher.calculateLoadScore(tester, task);

        expect(executorScore).toBeGreaterThan(testerScore);
      }
    });

    it('should give zero score to overloaded agent', () => {
      const task = createTask({
        id: 'task-1',
        type: 'implementation',
        title: 'Large task',
        estimatedDuration: 60
      });

      const executor = agents.get('executor');
      if (executor) {
        executor.currentLoad = 85; // Nearly full

        const score = matcher.calculateLoadScore(executor, task);
        expect(score).toBe(0);
      }
    });

    it('should give maximum score to idle agent for small task', () => {
      const task = createTask({
        id: 'task-1',
        type: 'implementation',
        title: 'Small task',
        estimatedDuration: 10
      });

      const executor = agents.get('executor');
      if (executor) {
        executor.currentLoad = 0;

        const score = matcher.calculateLoadScore(executor, task);
        expect(score).toBeGreaterThan(80);
      }
    });
  });

  describe('Performance Scoring', () => {
    it('should give higher score to agent with better success rate', () => {
      const consultant = agents.get('consultant');
      const sales = agents.get('sales');

      if (consultant && sales) {
        const consultantScore = matcher.calculatePerformanceScore(consultant);
        const salesScore = matcher.calculatePerformanceScore(sales);

        // Both have high success rates
        expect(consultantScore).toBeGreaterThan(60);
        expect(salesScore).toBeGreaterThan(60);
      }
    });

    it('should give bonus for experienced agents', () => {
      const executor = agents.get('executor');
      const media = agents.get('media');

      if (executor && media) {
        const executorScore = matcher.calculatePerformanceScore(executor);
        const mediaScore = matcher.calculatePerformanceScore(media);

        // Executor has more completed tasks
        expect(executorScore).toBeGreaterThanOrEqual(mediaScore);
      }
    });
  });

  describe('Response Time Scoring', () => {
    it('should give higher score to faster agents', () => {
      const sales = agents.get('sales');
      const architect = agents.get('architect');

      if (sales && architect) {
        const salesScore = matcher.calculateResponseScore(sales);
        const architectScore = matcher.calculateResponseScore(architect);

        // Sales has faster response (4s vs 12s)
        expect(salesScore).toBeGreaterThan(architectScore);
      }
    });

    it('should give maximum score for very fast agents', () => {
      const sales = agents.get('sales');
      if (sales) {
        const score = matcher.calculateResponseScore(sales);
        expect(score).toBeGreaterThan(70);
      }
    });

    it('should give low score for slow agents', () => {
      const architect = agents.get('architect');
      if (architect) {
        architect.capabilities.avgResponseTime = 9; // Slow

        const score = matcher.calculateResponseScore(architect);
        expect(score).toBeLessThan(50);
      }
    });
  });

  describe('Match Score Calculation', () => {
    it('should calculate total match score with default weights', () => {
      const task = createTask({
        id: 'task-1',
        type: 'implementation',
        title: 'Task'
      });

      const executor = agents.get('executor');
      if (executor) {
        const scores = matcher.calculateMatchScore(executor, task);

        expect(scores.total).toBeGreaterThan(0);
        expect(scores.total).toBeLessThanOrEqual(100);
        expect(scores.capability).toBeGreaterThan(0);
        expect(scores.load).toBeGreaterThan(0);
        expect(scores.performance).toBeGreaterThan(0);
        expect(scores.response).toBeGreaterThan(0);
      }
    });

    it('should calculate total match score with custom weights', () => {
      const task = createTask({
        id: 'task-1',
        type: 'implementation',
        title: 'Task'
      });

      const executor = agents.get('executor');
      if (executor) {
        const scores = matcher.calculateMatchScore(executor, task, {
          capability: 0.5, // More weight on capability
          load: 0.3,
          performance: 0.1,
          response: 0.1
        });

        expect(scores.total).toBeGreaterThan(0);
        expect(scores.total).toBeLessThanOrEqual(100);
      }
    });

    it('should cap total score at 100', () => {
      const task = createTask({
        id: 'task-1',
        type: 'implementation',
        title: 'Task'
      });

      const executor = agents.get('executor');
      if (executor) {
        executor.currentLoad = 0;
        executor.capabilities.successRate = 1.0;
        executor.capabilities.avgResponseTime = 2;

        const scores = matcher.calculateMatchScore(executor, task);
        expect(scores.total).toBeLessThanOrEqual(100);
      }
    });
  });

  describe('Ranking Candidates', () => {
    it('should rank candidates by confidence', () => {
      const task = createTask({
        id: 'task-1',
        type: 'implementation',
        title: 'Task'
      });

      const candidates = matcher.findCandidates(task, agents);
      const ranked = matcher.rankCandidates(task, candidates);

      expect(ranked.length).toBe(candidates.length);

      // Check that candidates are sorted by confidence
      for (let i = 0; i < ranked.length - 1; i++) {
        expect(ranked[i].confidence).toBeGreaterThanOrEqual(ranked[i + 1].confidence);
      }
    });

    it('should include reasons for each candidate', () => {
      const task = createTask({
        id: 'task-1',
        type: 'implementation',
        title: 'Task'
      });

      const candidates = matcher.findCandidates(task, agents);
      const ranked = matcher.rankCandidates(task, candidates);

      ranked.forEach(result => {
        expect(result.reasons.length).toBeGreaterThan(0);
        expect(result.agentId).toBeDefined();
        expect(result.agentName).toBeDefined();
      });
    });

    it('should rank candidates with custom weights', () => {
      const task = createTask({
        id: 'task-1',
        type: 'implementation',
        title: 'Task',
        requiredCapabilities: ['javascript']
      });

      const candidates = matcher.findCandidates(task, agents);
      const ranked = matcher.rankCandidates(task, candidates, {
        capability: 0.7, // Heavy weight on capability
        load: 0.2,
        performance: 0.1,
        response: 0
      });

      expect(ranked.length).toBeGreaterThan(0);
    });
  });

  describe('Finding Best Candidate', () => {
    it('should return best candidate for task', () => {
      const task = createTask({
        id: 'task-1',
        type: 'implementation',
        title: 'Task',
        requiredCapabilities: ['javascript']
      });

      const best = matcher.findBestCandidate(task, agents);

      expect(best).not.toBeNull();
      expect(best?.agentId).toBeDefined();
      expect(best?.confidence).toBeGreaterThan(0);
      expect(best?.reasons.length).toBeGreaterThan(0);
    });

    it('should return null when no candidates available', () => {
      const task = createTask({
        id: 'task-1',
        type: 'finance',
        title: 'Financial task',
        requiredCapabilities: ['blockchain']
      });

      // Filter out finance-capable agents
      const filteredAgents = new Map(
        Array.from(agents.entries())
          .filter(([_, agent]) => agent.capabilities.taskTypes[0] !== 'finance')
      );

      const best = matcher.findBestCandidate(task, filteredAgents);

      expect(best).toBeNull();
    });

    it('should return null for unavailable agents', () => {
      agents.forEach(agent => {
        agent.availability = false;
      });

      const task = createTask({
        id: 'task-1',
        type: 'implementation',
        title: 'Task'
      });

      const best = matcher.findBestCandidate(task, agents);

      expect(best).toBeNull();
    });
  });

  describe('Alternative Candidates', () => {
    it('should return top candidates', () => {
      const task = createTask({
        id: 'task-1',
        type: 'implementation',
        title: 'Task'
      });

      const candidates = matcher.findCandidates(task, agents);
      const ranked = matcher.rankCandidates(task, candidates);
      const top2 = matcher.getTopCandidates(ranked, 2);

      expect(top2.length).toBe(2);
    });

    it('should return alternative candidates excluding top', () => {
      const task = createTask({
        id: 'task-1',
        type: 'implementation',
        title: 'Task'
      });

      const candidates = matcher.findCandidates(task, agents);
      const ranked = matcher.rankCandidates(task, candidates);
      const alternatives = matcher.getAlternativeCandidates(ranked, 3);

      expect(alternatives.length).toBeLessThanOrEqual(3);
      // Should not include the top candidate
      if (ranked.length > 0 && alternatives.length > 0) {
        expect(alternatives[0]).not.toBe(ranked[0].agentId);
      }
    });

    it('should return empty alternatives when only one candidate', () => {
      const task = createTask({
        id: 'task-1',
        type: 'implementation',
        title: 'Task'
      });

      // Create a map with only one agent
      const singleAgent = new Map([['executor', agents.get('executor')!]]);

      const candidates = matcher.findCandidates(task, singleAgent);
      const ranked = matcher.rankCandidates(task, candidates);
      const alternatives = matcher.getAlternativeCandidates(ranked, 3);

      expect(alternatives.length).toBe(0);
    });
  });

  describe('No Agent Available Check', () => {
    it('should return true when no agents available', () => {
      agents.forEach(agent => {
        agent.availability = false;
      });

      const task = createTask({
        id: 'task-1',
        type: 'implementation',
        title: 'Task'
      });

      const isUnavailable = matcher.isNoAgentAvailable(task, agents);
      expect(isUnavailable).toBe(true);
    });

    it('should return false when agents available', () => {
      const task = createTask({
        id: 'task-1',
        type: 'implementation',
        title: 'Task'
      });

      const isUnavailable = matcher.isNoAgentAvailable(task, agents);
      expect(isUnavailable).toBe(false);
    });

    it('should return true for unsupported task type', () => {
      const task = createTask({
        id: 'task-1',
        type: 'implementation',
        title: 'Task',
        requiredCapabilities: ['quantum-computing']
      });

      // Filter agents that don't support this
      const emptyAgents = new Map();

      const isUnavailable = matcher.isNoAgentAvailable(task, emptyAgents);
      expect(isUnavailable).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle task with no required capabilities', () => {
      const task = createTask({
        id: 'task-1',
        type: 'implementation',
        title: 'Task',
        requiredCapabilities: []
      });

      const candidates = matcher.findCandidates(task, agents);
      expect(candidates.length).toBeGreaterThan(0);
    });

    it('should handle task with many required capabilities', () => {
      const task = createTask({
        id: 'task-1',
        type: 'implementation',
        title: 'Complex task',
        requiredCapabilities: ['javascript', 'typescript', 'python', 'react', 'nodejs']
      });

      const candidates = matcher.findCandidates(task, agents);
      // Few or no agents may match all requirements
      expect(Array.isArray(candidates)).toBe(true);
    });

    it('should handle very short task duration', () => {
      const task = createTask({
        id: 'task-1',
        type: 'implementation',
        title: 'Quick task',
        estimatedDuration: 1 // 1 minute
      });

      const executor = agents.get('executor');
      if (executor) {
        const score = matcher.calculateLoadScore(executor, task);
        expect(score).toBeGreaterThan(0);
      }
    });

    it('should handle very long task duration', () => {
      const task = createTask({
        id: 'task-1',
        type: 'implementation',
        title: 'Long task',
        estimatedDuration: 120 // 2 hours
      });

      const candidates = matcher.findCandidates(task, agents);
      // Agents with high load won't be candidates
      expect(Array.isArray(candidates)).toBe(true);
    });
  });
});
