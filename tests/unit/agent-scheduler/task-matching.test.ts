/**
 * Task Matching Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TaskMatcher } from "@/lib/agents/scheduler/core/matching';
import { AgentCapability, initializeAgents } from "@/lib/agents/scheduler/models/agent-capability';
import { Task, createTask } from "@/lib/agents/scheduler/models/task-model';

describe('TaskMatcher', () => {
  let matcher: TaskMatcher;
  let agents: Map<string, AgentCapability>;

  beforeEach(() => {
    matcher = new TaskMatcher();
    agents = initializeAgents();
  });

  describe('findCandidates', () => {
    it('should find agents that can handle task type', () => {
      const task = createTask({
        id: 'task-1',
        type: 'architecture',
        title: 'Design System'
      });

      const candidates = matcher.findCandidates(task, agents);

      expect(candidates.length).toBeGreaterThan(0);
      
      // Architect and agent-expert should be candidates
      const candidateIds = candidates.map(a => a.agentId);
      expect(candidateIds).toContain('architect');
      expect(candidateIds).toContain('agent-expert');
    });

    it('should filter out unavailable agents', () => {
      const task = createTask({
        id: 'task-1',
        type: 'implementation',
        title: 'Build Feature'
      });

      // Make executor unavailable
      const executor = agents.get('executor');
      if (executor) {
        executor.availability = false;
      }

      const candidates = matcher.findCandidates(task, agents);
      const candidateIds = candidates.map(a => a.agentId);

      expect(candidateIds).not.toContain('executor');
    });

    it('should filter out agents at capacity', () => {
      const task = createTask({
        id: 'task-1',
        type: 'implementation',
        title: 'Build Feature',
        estimatedDuration: 120 // 2 hours
      });

      // Make executor at 95% load
      const executor = agents.get('executor');
      if (executor) {
        executor.currentLoad = 95;
      }

      const candidates = matcher.findCandidates(task, agents);
      const candidateIds = candidates.map(a => a.agentId);

      expect(candidateIds).not.toContain('executor');
    });

    it('should respect required capabilities', () => {
      const task = createTask({
        id: 'task-1',
        type: 'devops',
        title: 'Deploy Kubernetes',
        requiredCapabilities: ['kubernetes', 'docker']
      });

      const candidates = matcher.findCandidates(task, agents);

      // Only sysadmin should match
      expect(candidates).toHaveLength(1);
      expect(candidates[0].agentId).toBe('sysadmin');
    });
  });

  describe('calculateCapabilityScore', () => {
    it('should give high score for matching task type', () => {
      const architect = agents.get('architect')!;
      const task = createTask({
        id: 'task-1',
        type: 'architecture',
        title: 'Design'
      });

      const score = matcher.calculateCapabilityScore(architect, task);

      expect(score).toBeGreaterThan(60);
    });

    it('should give bonus for matching capabilities', () => {
      const architect = agents.get('architect')!;
      
      const taskWithoutReqs = createTask({
        id: 'task-1',
        type: 'architecture',
        title: 'A'
      });

      const taskWithReqs = createTask({
        id: 'task-2',
        type: 'architecture',
        title: 'B',
        requiredCapabilities: ['typescript', 'react']
      });

      const scoreWithout = matcher.calculateCapabilityScore(architect, taskWithoutReqs);
      const scoreWith = matcher.calculateCapabilityScore(architect, taskWithReqs);

      expect(scoreWith).toBeGreaterThanOrEqual(scoreWithout);
    });
  });

  describe('calculateLoadScore', () => {
    it('should give higher score to less loaded agents', () => {
      const architect = agents.get('architect')!;
      const executor = agents.get('executor')!;

      architect.currentLoad = 20;
      executor.currentLoad = 60;

      const task = createTask({
        id: 'task-1',
        type: 'implementation',
        title: 'Test',
        estimatedDuration: 30
      });

      const architectScore = matcher.calculateLoadScore(architect, task);
      const executorScore = matcher.calculateLoadScore(executor, task);

      expect(architectScore).toBeGreaterThan(executorScore);
    });

    it('should consider task duration', () => {
      const agent = agents.get('architect')!;
      agent.currentLoad = 50;

      const shortTask = createTask({
        id: 'task-1',
        type: 'architecture',
        title: 'Short',
        estimatedDuration: 15
      });

      const longTask = createTask({
        id: 'task-2',
        type: 'architecture',
        title: 'Long',
        estimatedDuration: 120
      });

      const shortScore = matcher.calculateLoadScore(agent, shortTask);
      const longScore = matcher.calculateLoadScore(agent, longTask);

      expect(shortScore).toBeGreaterThan(longScore);
    });
  });

  describe('calculatePerformanceScore', () => {
    it('should give higher score to more reliable agents', () => {
      const sysadmin = agents.get('sysadmin')!;
      const designer = agents.get('designer')!;

      const sysadminScore = matcher.calculatePerformanceScore(sysadmin);
      const designerScore = matcher.calculatePerformanceScore(designer);

      // Sysadmin has higher success rate
      expect(sysadminScore).toBeGreaterThan(designerScore);
    });

    it('should consider task completion history', () => {
      const executor = agents.get('executor')!;
      const finance = agents.get('finance')!;

      // Executor has more completed tasks
      const executorScore = matcher.calculatePerformanceScore(executor);
      const financeScore = matcher.calculatePerformanceScore(finance);

      expect(executorScore).toBeGreaterThan(financeScore);
    });
  });

  describe('calculateMatchScore', () => {
    it('should combine all scores with weights', () => {
      const agent = agents.get('architect')!;
      const task = createTask({
        id: 'task-1',
        type: 'architecture',
        title: 'Design',
        requiredCapabilities: ['typescript']
      });

      const scores = matcher.calculateMatchScore(agent, task);

      expect(scores.total).toBeGreaterThan(0);
      expect(scores.total).toBeLessThanOrEqual(100);
      expect(scores.capability).toBeDefined();
      expect(scores.load).toBeDefined();
      expect(scores.performance).toBeDefined();
      expect(scores.response).toBeDefined();
    });

    it('should use custom weights', () => {
      const agent = agents.get('architect')!;
      const task = createTask({
        id: 'task-1',
        type: 'architecture',
        title: 'Design'
      });

      const defaultScores = matcher.calculateMatchScore(agent, task);
      const customScores = matcher.calculateMatchScore(agent, task, {
        capability: 0.8,
        load: 0.1,
        performance: 0.05,
        response: 0.05
      });

      // Custom weights should produce different total
      expect(customScores.total).not.toBe(defaultScores.total);
    });
  });

  describe('rankCandidates', () => {
    it('should rank candidates by total score', () => {
      const task = createTask({
        id: 'task-1',
        type: 'architecture',
        title: 'Design'
      });

      const candidates = matcher.findCandidates(task, agents);
      const ranked = matcher.rankCandidates(task, candidates);

      // Scores should be in descending order
      for (let i = 0; i < ranked.length - 1; i++) {
        expect(ranked[i].confidence).toBeGreaterThanOrEqual(ranked[i + 1].confidence);
      }
    });

    it('should include reasoning for each candidate', () => {
      const task = createTask({
        id: 'task-1',
        type: 'implementation',
        title: 'Build'
      });

      const candidates = matcher.findCandidates(task, agents);
      const ranked = matcher.rankCandidates(task, candidates);

      for (const result of ranked) {
        expect(result.reasons).toBeDefined();
        expect(result.reasons.length).toBeGreaterThan(0);
      }
    });
  });

  describe('findBestCandidate', () => {
    it('should return the top ranked candidate', () => {
      const task = createTask({
        id: 'task-1',
        type: 'devops',
        title: 'Deploy'
      });

      const best = matcher.findBestCandidate(task, agents);

      expect(best).toBeDefined();
      expect(best?.agentId).toBe('sysadmin');
    });

    it('should return null if no candidates available', () => {
      // Make all agents unavailable
      for (const agent of agents.values()) {
        agent.availability = false;
      }

      const task = createTask({
        id: 'task-1',
        type: 'implementation',
        title: 'Test'
      });

      const best = matcher.findBestCandidate(task, agents);

      expect(best).toBeNull();
    });
  });

  describe('getAlternativeCandidates', () => {
    it('should return agents excluding top choice', () => {
      const task = createTask({
        id: 'task-1',
        type: 'implementation',
        title: 'Build'
      });

      const candidates = matcher.findCandidates(task, agents);
      const ranked = matcher.rankCandidates(task, candidates);
      const alternatives = matcher.getAlternativeCandidates(ranked, 3);

      expect(alternatives).not.toContain(ranked[0].agentId);
      expect(alternatives.length).toBeLessThanOrEqual(3);
    });
  });
});
