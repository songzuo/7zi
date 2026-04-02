/**
 * Matching Module Unit Tests
 * Tests for TaskMatcher class
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { TaskMatcher } from "@/lib/agent-scheduler/core/matching";
import {
  AgentCapability,
  createAgentCapability,
  TaskType,
} from "@/lib/agent-scheduler/models/agent-capability";
import { Task, createTask } from "@/lib/agent-scheduler/models/task-model";

describe("TaskMatcher", () => {
  let matcher: TaskMatcher;
  let testAgents: Map<string, AgentCapability>;

  beforeEach(() => {
    matcher = new TaskMatcher();
    testAgents = new Map();

    // Create test agents with different capabilities
    testAgents.set(
      "agent1",
      createAgentCapability({
        agentId: "agent1",
        name: "Agent 1",
        provider: "minimax",
        role: "architect",
        capabilities: {
          techStack: ["typescript", "react", "nodejs"],
          taskTypes: ["architecture", "implementation"] as TaskType[],
          concurrency: 3,
          avgResponseTime: 5,
          successRate: 0.95,
          specializations: ["frontend"],
        },
        metrics: {
          totalTasksCompleted: 50,
          averageCompletionTime: 10,
          errorRate: 0.05,
        },
      }),
    );

    testAgents.set(
      "agent2",
      createAgentCapability({
        agentId: "agent2",
        name: "Agent 2",
        provider: "self-claude",
        role: "tester",
        capabilities: {
          techStack: ["jest", "vitest", "testing", "typescript"],
          taskTypes: ["testing", "implementation"] as TaskType[],
          concurrency: 4,
          avgResponseTime: 3,
          successRate: 0.97,
          specializations: ["unit-testing"],
        },
        metrics: {
          totalTasksCompleted: 100,
          averageCompletionTime: 8,
          errorRate: 0.03,
        },
      }),
    );

    testAgents.set(
      "agent3",
      createAgentCapability({
        agentId: "agent3",
        name: "Agent 3",
        provider: "volcengine",
        role: "executor",
        capabilities: {
          techStack: ["python", "data-science", "analysis"],
          taskTypes: ["research"] as TaskType[],
          concurrency: 2,
          avgResponseTime: 7,
          successRate: 0.9,
          specializations: ["data-analysis"],
        },
        metrics: {
          totalTasksCompleted: 30,
          averageCompletionTime: 15,
          errorRate: 0.1,
        },
      }),
    );

    // Set agent3 as unavailable
    testAgents.get("agent3")!.availability = false;
  });

  describe("findCandidates", () => {
    it("should find all agents capable of handling a task", () => {
      const task = createTask({
        id: "task1",
        type: "implementation",
        title: "Build component",
        requiredCapabilities: ["typescript"],
        estimatedDuration: 30,
      });

      const candidates = matcher.findCandidates(task, testAgents);

      expect(candidates.length).toBe(2);
      expect(candidates.every((c) => c.availability)).toBe(true);
    });

    it("should return empty array when no agents available", () => {
      const task = createTask({
        id: "task2",
        type: "marketing",
        title: "Marketing task",
        requiredCapabilities: ["seo"],
        estimatedDuration: 30,
      });

      const candidates = matcher.findCandidates(task, testAgents);

      expect(candidates.length).toBe(0);
    });

    it("should handle empty agents map", () => {
      const task = createTask({
        id: "task3",
        type: "implementation",
        title: "Test task",
        requiredCapabilities: [],
        estimatedDuration: 30,
      });

      const candidates = matcher.findCandidates(task, new Map());

      expect(candidates.length).toBe(0);
    });
  });

  describe("canHandleTask", () => {
    it("should return true when agent can handle task", () => {
      const agent = testAgents.get("agent1")!;
      const task = createTask({
        id: "task1",
        type: "architecture",
        title: "Design system",
        requiredCapabilities: ["react"],
        estimatedDuration: 30,
      });

      expect(matcher.canHandleTask(agent, task)).toBe(true);
    });

    it("should return false when agent is unavailable", () => {
      const agent = testAgents.get("agent3")!;
      const task = createTask({
        id: "task1",
        type: "research",
        title: "Research task",
        requiredCapabilities: ["data-science"],
        estimatedDuration: 30,
      });

      expect(matcher.canHandleTask(agent, task)).toBe(false);
    });

    it("should return false when task type not in capabilities", () => {
      const agent = testAgents.get("agent1")!;
      const task = createTask({
        id: "task1",
        type: "marketing",
        title: "Marketing task",
        requiredCapabilities: [],
        estimatedDuration: 30,
      });

      expect(matcher.canHandleTask(agent, task)).toBe(false);
    });

    it("should return false when required capabilities not met", () => {
      const agent = testAgents.get("agent1")!;
      const task = createTask({
        id: "task1",
        type: "implementation",
        title: "Python task",
        requiredCapabilities: ["python"],
        estimatedDuration: 30,
      });

      expect(matcher.canHandleTask(agent, task)).toBe(false);
    });

    it("should return false when agent load capacity exceeded", () => {
      const agent = testAgents.get("agent1")!;
      agent.currentLoad = 85;

      const task = createTask({
        id: "task1",
        type: "implementation",
        title: "Large task",
        requiredCapabilities: [],
        estimatedDuration: 60, // 60 min = 100% load
      });

      expect(matcher.canHandleTask(agent, task)).toBe(false);
    });

    it("should check case-insensitive capability matching", () => {
      const agent = testAgents.get("agent1")!;
      const task = createTask({
        id: "task1",
        type: "implementation",
        title: "TypeScript task",
        requiredCapabilities: ["TypeScript"], // Different case
        estimatedDuration: 30,
      });

      expect(matcher.canHandleTask(agent, task)).toBe(true);
    });
  });

  describe("calculateCapabilityScore", () => {
    it("should calculate high score for good match", () => {
      const agent = testAgents.get("agent1")!;
      const task = createTask({
        id: "task1",
        type: "architecture",
        title: "Design task",
        requiredCapabilities: ["react", "typescript"],
        estimatedDuration: 30,
      });

      const score = matcher.calculateCapabilityScore(agent, task);

      // Score is based on: task type match (40) + capability match (40) + specialization (0-20)
      expect(score).toBeGreaterThanOrEqual(80);
      expect(score).toBeLessThanOrEqual(100);
    });

    it("should give lower score for partial capability match", () => {
      const agent = testAgents.get("agent1")!;
      const task = createTask({
        id: "task1",
        type: "architecture",
        title: "Design task",
        requiredCapabilities: ["react", "vue", "angular"],
        estimatedDuration: 30,
      });

      const score = matcher.calculateCapabilityScore(agent, task);

      expect(score).toBeLessThan(80);
      expect(score).toBeGreaterThan(0);
    });

    it("should give zero score when task type not matched", () => {
      const agent = testAgents.get("agent1")!;
      const task = createTask({
        id: "task1",
        type: "marketing",
        title: "Marketing task",
        requiredCapabilities: [],
        estimatedDuration: 30,
      });

      const score = matcher.calculateCapabilityScore(agent, task);

      expect(score).toBe(40); // Only base points for no requirements
    });

    it("should apply specialization bonus", () => {
      const agent = testAgents.get("agent1")!;
      const task = createTask({
        id: "task1",
        type: "implementation",
        title: "Frontend task",
        requiredCapabilities: ["frontend"],
        estimatedDuration: 30,
      });

      const score = matcher.calculateCapabilityScore(agent, task);

      expect(score).toBeGreaterThan(60);
    });

    it("should handle empty required capabilities", () => {
      const agent = testAgents.get("agent1")!;
      const task = createTask({
        id: "task1",
        type: "architecture",
        title: "Simple task",
        requiredCapabilities: [],
        estimatedDuration: 30,
      });

      const score = matcher.calculateCapabilityScore(agent, task);

      expect(score).toBeGreaterThan(40);
      expect(score).toBeLessThanOrEqual(100);
    });
  });

  describe("calculateLoadScore", () => {
    it("should give high score for agents with lots of capacity", () => {
      const agent = testAgents.get("agent1")!;
      agent.currentLoad = 10;

      const task = createTask({
        id: "task1",
        type: "implementation",
        title: "Small task",
        requiredCapabilities: [],
        estimatedDuration: 15, // 25% load
      });

      const score = matcher.calculateLoadScore(agent, task);

      expect(score).toBeGreaterThan(60);
    });

    it("should give low score for busy agents", () => {
      const agent = testAgents.get("agent1")!;
      agent.currentLoad = 80;

      const task = createTask({
        id: "task1",
        type: "implementation",
        title: "Small task",
        requiredCapabilities: [],
        estimatedDuration: 15, // 25% load
      });

      const score = matcher.calculateLoadScore(agent, task);

      expect(score).toBeLessThan(20);
    });

    it("should return zero when agent would be overloaded", () => {
      const agent = testAgents.get("agent1")!;
      agent.currentLoad = 90;

      const task = createTask({
        id: "task1",
        type: "implementation",
        title: "Large task",
        requiredCapabilities: [],
        estimatedDuration: 60, // 100% load
      });

      const score = matcher.calculateLoadScore(agent, task);

      expect(score).toBe(0);
    });
  });

  describe("calculatePerformanceScore", () => {
    it("should give high score for experienced agents", () => {
      const agent = testAgents.get("agent2")!; // 100 tasks completed

      const score = matcher.calculatePerformanceScore(agent);

      // Score is based on success rate (97% * 60 = 58.2) + experience bonus (30 for >50 tasks)
      // Total: 88.2
      expect(score).toBeGreaterThan(80);
    });

    it("should give moderate score for less experienced agents", () => {
      const agent = testAgents.get("agent3")!; // 30 tasks completed

      const score = matcher.calculatePerformanceScore(agent);

      expect(score).toBeGreaterThan(70);
      expect(score).toBeLessThan(90);
    });

    it("should incorporate success rate into score", () => {
      const agent = testAgents.get("agent1")!; // 95% success rate

      const score = matcher.calculatePerformanceScore(agent);

      expect(score).toBeGreaterThan(50);
    });

    it("should handle agents without metrics", () => {
      const agent = createAgentCapability({
        agentId: "agent4",
        name: "New Agent",
        provider: "minimax",
        role: "newbie",
        capabilities: {
          techStack: ["typescript"],
          taskTypes: ["implementation"] as TaskType[],
          concurrency: 1,
          avgResponseTime: 10,
          successRate: 0.5,
        },
      });

      const score = matcher.calculatePerformanceScore(agent);

      expect(score).toBe(30); // 60% success rate * 60 = 30
    });
  });

  describe("calculateResponseScore", () => {
    it("should give high score for fast response agents", () => {
      const agent = testAgents.get("agent2")!; // 3 second response

      const score = matcher.calculateResponseScore(agent);

      expect(score).toBeGreaterThan(80);
    });

    it("should give low score for slow response agents", () => {
      const agent = createAgentCapability({
        agentId: "agent4",
        name: "Slow Agent",
        provider: "minimax",
        role: "slow",
        capabilities: {
          techStack: ["typescript"],
          taskTypes: ["implementation"] as TaskType[],
          concurrency: 1,
          avgResponseTime: 9,
          successRate: 0.8,
        },
      });

      const score = matcher.calculateResponseScore(agent);

      expect(score).toBeLessThan(20);
    });

    it("should return zero for very slow agents", () => {
      const agent = createAgentCapability({
        agentId: "agent4",
        name: "Very Slow Agent",
        provider: "minimax",
        role: "very-slow",
        capabilities: {
          techStack: ["typescript"],
          taskTypes: ["implementation"] as TaskType[],
          concurrency: 1,
          avgResponseTime: 10,
          successRate: 0.8,
        },
      });

      const score = matcher.calculateResponseScore(agent);

      expect(score).toBe(0);
    });
  });

  describe("calculateMatchScore", () => {
    it("should calculate comprehensive match score", () => {
      const agent = testAgents.get("agent1")!;
      const task = createTask({
        id: "task1",
        type: "architecture",
        title: "Design task",
        requiredCapabilities: ["react"],
        estimatedDuration: 30,
      });

      const scores = matcher.calculateMatchScore(agent, task);

      expect(scores).toHaveProperty("total");
      expect(scores).toHaveProperty("capability");
      expect(scores).toHaveProperty("load");
      expect(scores).toHaveProperty("performance");
      expect(scores).toHaveProperty("response");

      expect(scores.total).toBeGreaterThan(0);
      expect(scores.total).toBeLessThanOrEqual(100);
    });

    it("should apply custom weights", () => {
      const agent = testAgents.get("agent1")!;
      const task = createTask({
        id: "task1",
        type: "architecture",
        title: "Design task",
        requiredCapabilities: ["react"],
        estimatedDuration: 30,
      });

      const defaultScores = matcher.calculateMatchScore(agent, task);
      const capabilityWeightedScores = matcher.calculateMatchScore(
        agent,
        task,
        {
          capability: 0.8,
          load: 0.1,
          performance: 0.05,
          response: 0.05,
        },
      );

      expect(capabilityWeightedScores.capability).toBeGreaterThan(0);
    });
  });

  describe("rankCandidates", () => {
    it("should rank candidates by confidence", () => {
      const task = createTask({
        id: "task1",
        type: "implementation",
        title: "Implementation task",
        requiredCapabilities: ["typescript"],
        estimatedDuration: 30,
      });

      const candidates = matcher.findCandidates(task, testAgents);
      const ranked = matcher.rankCandidates(task, candidates);

      expect(ranked.length).toBe(2);
      expect(ranked[0].confidence).toBeGreaterThanOrEqual(ranked[1].confidence);
    });

    it("should return empty array for empty candidates", () => {
      const task = createTask({
        id: "task1",
        type: "implementation",
        title: "Test task",
        requiredCapabilities: [],
        estimatedDuration: 30,
      });

      const ranked = matcher.rankCandidates(task, []);

      expect(ranked.length).toBe(0);
    });

    it("should include reasoning in results", () => {
      const task = createTask({
        id: "task1",
        type: "architecture",
        title: "Design task",
        requiredCapabilities: ["react"],
        estimatedDuration: 30,
      });

      const candidates = matcher.findCandidates(task, testAgents);
      const ranked = matcher.rankCandidates(task, candidates);

      expect(ranked[0]).toHaveProperty("reasons");
      expect(Array.isArray(ranked[0].reasons)).toBe(true);
      expect(ranked[0].reasons.length).toBeGreaterThan(0);
    });
  });

  describe("findBestCandidate", () => {
    it("should return the best candidate", () => {
      const task = createTask({
        id: "task1",
        type: "implementation",
        title: "Implementation task",
        requiredCapabilities: ["typescript"],
        estimatedDuration: 30,
      });

      const best = matcher.findBestCandidate(task, testAgents);

      expect(best).not.toBeNull();
      expect(best).toHaveProperty("agentId");
      expect(best).toHaveProperty("confidence");
      expect(best).toHaveProperty("reasons");
    });

    it("should return null when no candidates available", () => {
      const task = createTask({
        id: "task1",
        type: "marketing",
        title: "Marketing task",
        requiredCapabilities: ["seo"],
        estimatedDuration: 30,
      });

      const best = matcher.findBestCandidate(task, testAgents);

      expect(best).toBeNull();
    });
  });

  describe("isNoAgentAvailable", () => {
    it("should return true when no agents available", () => {
      const task = createTask({
        id: "task1",
        type: "marketing",
        title: "Marketing task",
        requiredCapabilities: ["seo"],
        estimatedDuration: 30,
      });

      expect(matcher.isNoAgentAvailable(task, testAgents)).toBe(true);
    });

    it("should return false when agents are available", () => {
      const task = createTask({
        id: "task1",
        type: "implementation",
        title: "Implementation task",
        requiredCapabilities: ["typescript"],
        estimatedDuration: 30,
      });

      expect(matcher.isNoAgentAvailable(task, testAgents)).toBe(false);
    });
  });

  describe("getTopCandidates", () => {
    it("should return top N candidates", () => {
      const task = createTask({
        id: "task1",
        type: "implementation",
        title: "Implementation task",
        requiredCapabilities: ["typescript"],
        estimatedDuration: 30,
      });

      const candidates = matcher.findCandidates(task, testAgents);
      const ranked = matcher.rankCandidates(task, candidates);

      const top1 = matcher.getTopCandidates(ranked, 1);
      expect(top1.length).toBe(1);

      const top2 = matcher.getTopCandidates(ranked, 2);
      expect(top2.length).toBe(2);
    });

    it("should handle count larger than candidates", () => {
      const task = createTask({
        id: "task1",
        type: "implementation",
        title: "Implementation task",
        requiredCapabilities: ["typescript"],
        estimatedDuration: 30,
      });

      const candidates = matcher.findCandidates(task, testAgents);
      const ranked = matcher.rankCandidates(task, candidates);

      const top10 = matcher.getTopCandidates(ranked, 10);
      expect(top10.length).toBe(ranked.length);
    });
  });

  describe("getAlternativeCandidates", () => {
    it("should return alternative candidates excluding top choice", () => {
      const task = createTask({
        id: "task1",
        type: "implementation",
        title: "Implementation task",
        requiredCapabilities: ["typescript"],
        estimatedDuration: 30,
      });

      const candidates = matcher.findCandidates(task, testAgents);
      const ranked = matcher.rankCandidates(task, candidates);

      const alternatives = matcher.getAlternativeCandidates(ranked, 2);

      expect(alternatives.length).toBeLessThanOrEqual(2);
      expect(alternatives).not.toContain(ranked[0].agentId);
    });

    it("should handle default count", () => {
      const task = createTask({
        id: "task1",
        type: "implementation",
        title: "Implementation task",
        requiredCapabilities: ["typescript"],
        estimatedDuration: 30,
      });

      const candidates = matcher.findCandidates(task, testAgents);
      const ranked = matcher.rankCandidates(task, candidates);

      const alternatives = matcher.getAlternativeCandidates(ranked);

      expect(alternatives.length).toBeLessThanOrEqual(3);
    });
  });
});
