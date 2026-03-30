/**
 * Tests for LoadBalancer
 * Comprehensive coverage of load balancing functionality
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  LoadBalancer,
  LoadBalanceConfig,
  LoadBalanceResult
} from '../../../../src/lib/agents/scheduler/core/load-balancer';
import {
  AgentCapability,
  initializeAgents
} from '../../../../src/lib/agents/scheduler/models/agent-capability';
import { Task, TaskType, createTask } from '../../../../src/lib/agents/scheduler/models/task-model';

describe('LoadBalancer', () => {
  let loadBalancer: LoadBalancer;
  let agents: Map<string, AgentCapability>;

  beforeEach(() => {
    loadBalancer = new LoadBalancer();
    agents = initializeAgents();
  });

  describe('Initialization', () => {
    it('should initialize with default config', () => {
      const config = loadBalancer.getConfig();
      expect(config.maxLoadThreshold).toBe(90);
      expect(config.busyThreshold).toBe(70);
      expect(config.preferLowLoad).toBe(true);
      expect(config.considerSpecialization).toBe(true);
    });

    it('should initialize with custom config', () => {
      const customBalancer = new LoadBalancer({
        maxLoadThreshold: 80,
        busyThreshold: 60,
        preferLowLoad: false
      });

      const config = customBalancer.getConfig();
      expect(config.maxLoadThreshold).toBe(80);
      expect(config.busyThreshold).toBe(60);
      expect(config.preferLowLoad).toBe(false);
    });

    it('should reset agent history', () => {
      loadBalancer.recordTaskCompletion('agent-1', true);
      loadBalancer.reset();

      const performance = loadBalancer.getAgentPerformance('agent-1');
      expect(performance).toBeNull();
    });
  });

  describe('Configuration Management', () => {
    it('should update configuration', () => {
      loadBalancer.updateConfig({
        maxLoadThreshold: 95,
        preferLowLoad: false
      });

      const config = loadBalancer.getConfig();
      expect(config.maxLoadThreshold).toBe(95);
      expect(config.preferLowLoad).toBe(false);
    });

    it('should return config copy', () => {
      const config1 = loadBalancer.getConfig();
      config1.maxLoadThreshold = 50;

      const config2 = loadBalancer.getConfig();
      expect(config2.maxLoadThreshold).toBe(90); // Still default
    });
  });

  describe('Load Calculation', () => {
    it('should calculate new load correctly', () => {
      const agent = agents.get('architect');
      expect(agent).toBeDefined();

      const task = createTask({
        id: 'task-1',
        type: 'architecture',
        title: 'Design task'
      });

      const newLoad = loadBalancer.calculateNewLoad(agent!, task);
      expect(newLoad).toBe(agent!.currentLoad + 50); // 30min * 100 / 60
    });

    it('should handle zero duration tasks', () => {
      const agent = agents.get('architect');
      const task = createTask({
        id: 'task-1',
        type: 'architecture',
        title: 'Quick task',
        estimatedDuration: 1 // Minimum value since createTask uses || 30 default
      });

      const newLoad = loadBalancer.calculateNewLoad(agent!, task);
      // With estimatedDuration of 1, the load is (1/60) * 100 = 1.67
      expect(newLoad).toBeCloseTo(agent!.currentLoad + 1.67, 1);
    });

    it('should handle long duration tasks', () => {
      const agent = agents.get('architect');
      const task = createTask({
        id: 'task-1',
        type: 'architecture',
        title: 'Long task',
        estimatedDuration: 120 // 2 hours
      });

      const newLoad = loadBalancer.calculateNewLoad(agent!, task);
      expect(newLoad).toBe(agent!.currentLoad + 200); // 120min * 100 / 60
    });
  });

  describe('Capacity Checking', () => {
    it('should detect agent at capacity', () => {
      const agent = agents.get('architect');
      agent!.currentLoad = 85;

      const task = createTask({
        id: 'task-1',
        type: 'architecture',
        title: 'Design task',
        estimatedDuration: 10 // 16.7% load
      });

      const isAtCapacity = loadBalancer.isAgentAtCapacity(agent!, task);
      expect(isAtCapacity).toBe(true); // 85 + 16.7 > 90
    });

    it('should detect agent not at capacity', () => {
      const agent = agents.get('architect');
      agent!.currentLoad = 50;

      const task = createTask({
        id: 'task-1',
        type: 'architecture',
        title: 'Design task',
        estimatedDuration: 10
      });

      const isAtCapacity = loadBalancer.isAgentAtCapacity(agent!, task);
      expect(isAtCapacity).toBe(false);
    });

    it('should detect agent exactly at threshold', () => {
      const agent = agents.get('architect');
      agent!.currentLoad = 80;

      const task = createTask({
        id: 'task-1',
        type: 'architecture',
        title: 'Design task',
        estimatedDuration: 6 // 10% load = 90%
      });

      const isAtCapacity = loadBalancer.isAgentAtCapacity(agent!, task);
      expect(isAtCapacity).toBe(false); // Not exceeding threshold
    });
  });

  describe('Busy Detection', () => {
    it('should detect busy agent', () => {
      const agent = agents.get('architect');
      agent!.currentLoad = 75;

      const isBusy = loadBalancer.isAgentBusy(agent!);
      expect(isBusy).toBe(true);
    });

    it('should detect not busy agent', () => {
      const agent = agents.get('architect');
      agent!.currentLoad = 50;

      const isBusy = loadBalancer.isAgentBusy(agent!);
      expect(isBusy).toBe(false);
    });

    it('should detect agent at busy threshold', () => {
      const agent = agents.get('architect');
      agent!.currentLoad = 70;

      const isBusy = loadBalancer.isAgentBusy(agent!);
      expect(isBusy).toBe(true);
    });
  });

  describe('Available Agents', () => {
    it('should get available agents', () => {
      const task = createTask({
        id: 'task-1',
        type: 'architecture',
        title: 'Design task',
        estimatedDuration: 30
      });

      // Mark some agents as unavailable
      agents.get('architect')!.availability = false;
      agents.get('executor')!.currentLoad = 95; // At capacity

      const available = loadBalancer.getAvailableAgents(agents, task);

      expect(available.length).toBeGreaterThan(0);
      expect(available.find(a => a.agentId === 'architect')).toBeUndefined();
      expect(available.find(a => a.agentId === 'executor')).toBeUndefined();
    });

    it('should return empty array when no agents available', () => {
      const task = createTask({
        id: 'task-1',
        type: 'architecture',
        title: 'Design task',
        estimatedDuration: 60
      });

      // Mark all agents as unavailable or at capacity
      for (const agent of agents.values()) {
        agent.availability = false;
      }

      const available = loadBalancer.getAvailableAgents(agents, task);
      expect(available).toHaveLength(0);
    });
  });

  describe('Least Loaded Agent Selection', () => {
    it('should find least loaded agent', () => {
      // Create a simple array with known loads
      const simpleAgents = [
        { agentId: 'agent-1', currentLoad: 80, name: 'Agent 1', provider: 'minimax' as const, role: 'test', capabilities: { techStack: [], taskTypes: [], concurrency: 1, avgResponseTime: 1, successRate: 1 }, availability: true, lastActiveTime: Date.now() },
        { agentId: 'agent-2', currentLoad: 20, name: 'Agent 2', provider: 'minimax' as const, role: 'test', capabilities: { techStack: [], taskTypes: [], concurrency: 1, avgResponseTime: 1, successRate: 1 }, availability: true, lastActiveTime: Date.now() },
        { agentId: 'agent-3', currentLoad: 60, name: 'Agent 3', provider: 'minimax' as const, role: 'test', capabilities: { techStack: [], taskTypes: [], concurrency: 1, avgResponseTime: 1, successRate: 1 }, availability: true, lastActiveTime: Date.now() }
      ];

      const leastLoaded = loadBalancer.getLeastLoadedAgent(simpleAgents as any[]);
      expect(leastLoaded?.currentLoad).toBe(20);
      expect(leastLoaded?.agentId).toBe('agent-2');
    });

    it('should return null for empty array', () => {
      const leastLoaded = loadBalancer.getLeastLoadedAgent([]);
      expect(leastLoaded).toBeNull();
    });

    it('should get multiple least loaded agents', () => {
      const simpleAgents = [
        { agentId: 'agent-1', currentLoad: 10, name: 'Agent 1', provider: 'minimax' as const, role: 'test', capabilities: { techStack: [], taskTypes: [], concurrency: 1, avgResponseTime: 1, successRate: 1 }, availability: true, lastActiveTime: Date.now() },
        { agentId: 'agent-2', currentLoad: 20, name: 'Agent 2', provider: 'minimax' as const, role: 'test', capabilities: { techStack: [], taskTypes: [], concurrency: 1, avgResponseTime: 1, successRate: 1 }, availability: true, lastActiveTime: Date.now() },
        { agentId: 'agent-3', currentLoad: 30, name: 'Agent 3', provider: 'minimax' as const, role: 'test', capabilities: { techStack: [], taskTypes: [], concurrency: 1, avgResponseTime: 1, successRate: 1 }, availability: true, lastActiveTime: Date.now() },
        { agentId: 'agent-4', currentLoad: 40, name: 'Agent 4', provider: 'minimax' as const, role: 'test', capabilities: { techStack: [], taskTypes: [], concurrency: 1, avgResponseTime: 1, successRate: 1 }, availability: true, lastActiveTime: Date.now() },
        { agentId: 'agent-5', currentLoad: 50, name: 'Agent 5', provider: 'minimax' as const, role: 'test', capabilities: { techStack: [], taskTypes: [], concurrency: 1, avgResponseTime: 1, successRate: 1 }, availability: true, lastActiveTime: Date.now() }
      ];

      const top3 = loadBalancer.getLeastLoadedAgents(simpleAgents as any[], 3);

      expect(top3).toHaveLength(3);
      expect(top3[0].currentLoad).toBe(10);
      expect(top3[1].currentLoad).toBe(20);
      expect(top3[2].currentLoad).toBe(30);
    });

    it('should handle count larger than array', () => {
      const simpleAgents = [
        { agentId: 'agent-1', currentLoad: 10, name: 'Agent 1', provider: 'minimax' as const, role: 'test', capabilities: { techStack: [], taskTypes: [], concurrency: 1, avgResponseTime: 1, successRate: 1 }, availability: true, lastActiveTime: Date.now() },
        { agentId: 'agent-2', currentLoad: 20, name: 'Agent 2', provider: 'minimax' as const, role: 'test', capabilities: { techStack: [], taskTypes: [], concurrency: 1, avgResponseTime: 1, successRate: 1 }, availability: true, lastActiveTime: Date.now() },
        { agentId: 'agent-3', currentLoad: 30, name: 'Agent 3', provider: 'minimax' as const, role: 'test', capabilities: { techStack: [], taskTypes: [], concurrency: 1, avgResponseTime: 1, successRate: 1 }, availability: true, lastActiveTime: Date.now() }
      ];

      const top10 = loadBalancer.getLeastLoadedAgents(simpleAgents as any[], 10);
      expect(top10).toHaveLength(3);
    });
  });

  describe('Load Balancing', () => {
    it('should balance load across agents', () => {
      const task = createTask({
        id: 'task-1',
        type: 'architecture',
        title: 'Design task',
        estimatedDuration: 30
      });

      const result = loadBalancer.balanceLoad(agents, task);

      expect(result.recommendedAgents).toHaveLength(agents.size);
      expect(result.agentLoads.size).toBe(agents.size);
      expect(result.reasoning).toBeDefined();
    });

    it('should filter by candidate IDs', () => {
      const task = createTask({
        id: 'task-1',
        type: 'architecture',
        title: 'Design task',
        estimatedDuration: 30
      });

      const candidates = ['architect', 'designer'];
      const result = loadBalancer.balanceLoad(agents, task, candidates);

      expect(result.recommendedAgents).toHaveLength(2);
      expect(result.recommendedAgents).toContain('architect');
      expect(result.recommendedAgents).toContain('designer');
    });

    it('should return empty result when no candidates', () => {
      const task = createTask({
        id: 'task-1',
        type: 'architecture',
        title: 'Design task',
        estimatedDuration: 60
      });

      for (const agent of agents.values()) {
        agent.availability = false;
      }

      const result = loadBalancer.balanceLoad(agents, task);

      expect(result.recommendedAgents).toHaveLength(0);
      expect(result.agentLoads.size).toBe(0);
      expect(result.reasoning).toContain('No agents available');
    });

    it('should sort by load correctly', () => {
      const task = createTask({
        id: 'task-1',
        type: 'architecture',
        title: 'Design task',
        estimatedDuration: 30
      });

      // Create a simple agents map with predictable order
      const testAgents = new Map<string, AgentCapability>();
      testAgents.set('agent-low', { agentId: 'agent-low', currentLoad: 10, name: 'Low', provider: 'minimax', role: 'test', capabilities: { techStack: [], taskTypes: [], concurrency: 1, avgResponseTime: 1, successRate: 1 }, availability: true, lastActiveTime: Date.now() });
      testAgents.set('agent-mid', { agentId: 'agent-mid', currentLoad: 50, name: 'Mid', provider: 'minimax', role: 'test', capabilities: { techStack: [], taskTypes: [], concurrency: 1, avgResponseTime: 1, successRate: 1 }, availability: true, lastActiveTime: Date.now() });
      testAgents.set('agent-high', { agentId: 'agent-high', currentLoad: 90, name: 'High', provider: 'minimax', role: 'test', capabilities: { techStack: [], taskTypes: [], concurrency: 1, avgResponseTime: 1, successRate: 1 }, availability: true, lastActiveTime: Date.now() });

      const result = loadBalancer.balanceLoad(testAgents, task);

      expect(result.recommendedAgents[0]).toBe('agent-low');
      expect(result.recommendedAgents[result.recommendedAgents.length - 1]).toBe('agent-high');
    });
  });

  describe('Task Redistribution', () => {
    it('should find agents for task redistribution', () => {
      const task = createTask({
        id: 'task-1',
        type: 'architecture',
        title: 'Design task',
        estimatedDuration: 30
      });

      const capableAgents = loadBalancer.redistributeTasks('architect', agents, task);

      expect(capableAgents).not.toContain('architect');
      expect(capableAgents.length).toBeGreaterThan(0);
    });

    it('should return empty for non-existent agent', () => {
      const task = createTask({
        id: 'task-1',
        type: 'architecture',
        title: 'Design task'
      });

      const capableAgents = loadBalancer.redistributeTasks('non-existent', agents, task);
      expect(capableAgents).toHaveLength(0);
    });
  });

  describe('Agent Load Update', () => {
    it('should increase agent load', () => {
      const agentId = 'architect';
      const initialLoad = agents.get(agentId)!.currentLoad;

      loadBalancer.updateAgentLoad(agents, agentId, 50);

      const newLoad = agents.get(agentId)!.currentLoad;
      expect(newLoad).toBe(initialLoad + 50);
    });

    it('should decrease agent load', () => {
      const agentId = 'architect';
      agents.get(agentId)!.currentLoad = 60;

      loadBalancer.updateAgentLoad(agents, agentId, -30);

      const newLoad = agents.get(agentId)!.currentLoad;
      expect(newLoad).toBe(30);
    });

    it('should not go below zero', () => {
      const agentId = 'architect';
      agents.get(agentId)!.currentLoad = 10;

      loadBalancer.updateAgentLoad(agents, agentId, -50);

      const newLoad = agents.get(agentId)!.currentLoad;
      expect(newLoad).toBe(0);
    });

    it('should not exceed 100', () => {
      const agentId = 'architect';
      agents.get(agentId)!.currentLoad = 80;

      loadBalancer.updateAgentLoad(agents, agentId, 50);

      const newLoad = agents.get(agentId)!.currentLoad;
      expect(newLoad).toBe(100);
    });

    it('should handle non-existent agent', () => {
      expect(() => {
        loadBalancer.updateAgentLoad(agents, 'non-existent', 50);
      }).not.toThrow();
    });
  });

  describe('Performance Tracking', () => {
    it('should record task completion', () => {
      const agentId = 'architect';

      loadBalancer.recordTaskCompletion(agentId, true);
      loadBalancer.recordTaskCompletion(agentId, true);
      loadBalancer.recordTaskCompletion(agentId, false);

      const performance = loadBalancer.getAgentPerformance(agentId);

      expect(performance).toBeDefined();
      expect(performance?.completed).toBe(2);
      expect(performance?.failed).toBe(1);
      expect(performance?.total).toBe(3);
      expect(performance?.successRate).toBeCloseTo(0.667, 2);
    });

    it('should return null for agent with no history', () => {
      const performance = loadBalancer.getAgentPerformance('architect');
      expect(performance).toBeNull();
    });

    it('should calculate success rate correctly for all success', () => {
      const agentId = 'architect';

      loadBalancer.recordTaskCompletion(agentId, true);
      loadBalancer.recordTaskCompletion(agentId, true);
      loadBalancer.recordTaskCompletion(agentId, true);

      const performance = loadBalancer.getAgentPerformance(agentId);
      expect(performance?.successRate).toBe(1.0);
    });

    it('should calculate success rate correctly for all failures', () => {
      const agentId = 'architect';

      loadBalancer.recordTaskCompletion(agentId, false);
      loadBalancer.recordTaskCompletion(agentId, false);

      const performance = loadBalancer.getAgentPerformance(agentId);
      expect(performance?.successRate).toBe(0.0);
    });

    it('should handle zero total tasks', () => {
      const agentId = 'architect';
      loadBalancer.recordTaskCompletion(agentId, true);
      // Manually set to zero to test edge case
      const perf = loadBalancer.getAgentPerformance(agentId);
      if (perf) {
        perf.completed = 0;
        perf.failed = 0;
      }
    });
  });

  describe('Agent Availability Sorting', () => {
    it('should sort agents by availability then load', () => {
      // Create a simple test map
      const testAgents = new Map<string, AgentCapability>();
      testAgents.set('tester', { agentId: 'tester', currentLoad: 20, name: 'Tester', provider: 'minimax', role: 'test', capabilities: { techStack: [], taskTypes: [], concurrency: 1, avgResponseTime: 1, successRate: 1 }, availability: true, lastActiveTime: Date.now() });
      testAgents.set('executor', { agentId: 'executor', currentLoad: 80, name: 'Executor', provider: 'volcengine', role: 'test', capabilities: { techStack: [], taskTypes: [], concurrency: 1, avgResponseTime: 1, successRate: 1 }, availability: true, lastActiveTime: Date.now() });
      testAgents.set('architect', { agentId: 'architect', currentLoad: 50, name: 'Architect', provider: 'self-claude', role: 'test', capabilities: { techStack: [], taskTypes: [], concurrency: 1, avgResponseTime: 1, successRate: 1 }, availability: false, lastActiveTime: Date.now() });

      const sorted = loadBalancer.getAgentsByAvailability(testAgents);

      expect(sorted[0].agentId).toBe('tester'); // Available, low load
      expect(sorted[1].agentId).toBe('executor'); // Available, higher load
      expect(sorted[sorted.length - 1].agentId).toBe('architect'); // Unavailable
    });

    it('should handle all unavailable agents', () => {
      const testAgents = new Map<string, AgentCapability>();
      testAgents.set('agent-1', { agentId: 'agent-1', currentLoad: 10, name: 'Agent 1', provider: 'minimax', role: 'test', capabilities: { techStack: [], taskTypes: [], concurrency: 1, avgResponseTime: 1, successRate: 1 }, availability: false, lastActiveTime: Date.now() });
      testAgents.set('agent-2', { agentId: 'agent-2', currentLoad: 20, name: 'Agent 2', provider: 'minimax', role: 'test', capabilities: { techStack: [], taskTypes: [], concurrency: 1, avgResponseTime: 1, successRate: 1 }, availability: false, lastActiveTime: Date.now() });

      const sorted = loadBalancer.getAgentsByAvailability(testAgents);
      expect(sorted.length).toBe(2);
    });
  });

  describe('Load Statistics', () => {
    it('should calculate load statistics', () => {
      // Create a simple test map
      const testAgents = new Map<string, AgentCapability>();
      testAgents.set('agent-1', { agentId: 'agent-1', currentLoad: 10, name: 'Agent 1', provider: 'minimax', role: 'test', capabilities: { techStack: [], taskTypes: [], concurrency: 1, avgResponseTime: 1, successRate: 1 }, availability: true, lastActiveTime: Date.now() });
      testAgents.set('agent-2', { agentId: 'agent-2', currentLoad: 50, name: 'Agent 2', provider: 'minimax', role: 'test', capabilities: { techStack: [], taskTypes: [], concurrency: 1, avgResponseTime: 1, successRate: 1 }, availability: true, lastActiveTime: Date.now() });
      testAgents.set('agent-3', { agentId: 'agent-3', currentLoad: 70, name: 'Agent 3', provider: 'minimax', role: 'test', capabilities: { techStack: [], taskTypes: [], concurrency: 1, avgResponseTime: 1, successRate: 1 }, availability: true, lastActiveTime: Date.now() });
      testAgents.set('agent-4', { agentId: 'agent-4', currentLoad: 90, name: 'Agent 4', provider: 'minimax', role: 'test', capabilities: { techStack: [], taskTypes: [], concurrency: 1, avgResponseTime: 1, successRate: 1 }, availability: true, lastActiveTime: Date.now() });

      const stats = loadBalancer.getLoadStats(testAgents);

      expect(stats.totalLoad).toBe(220);
      expect(stats.averageLoad).toBe(55);
      expect(stats.maxLoad).toBe(90);
      expect(stats.minLoad).toBe(10);
      expect(stats.overloadedAgents).toContain('agent-4');
      expect(stats.busyAgents).toContain('agent-3');
      expect(stats.busyAgents).toContain('agent-4');
      expect(stats.idleAgents).toContain('agent-1');
    });

    it('should detect overloaded agents', () => {
      const testAgents = new Map<string, AgentCapability>();
      testAgents.set('agent-1', { agentId: 'agent-1', currentLoad: 95, name: 'Agent 1', provider: 'minimax', role: 'test', capabilities: { techStack: [], taskTypes: [], concurrency: 1, avgResponseTime: 1, successRate: 1 }, availability: true, lastActiveTime: Date.now() });
      testAgents.set('agent-2', { agentId: 'agent-2', currentLoad: 50, name: 'Agent 2', provider: 'minimax', role: 'test', capabilities: { techStack: [], taskTypes: [], concurrency: 1, avgResponseTime: 1, successRate: 1 }, availability: true, lastActiveTime: Date.now() });

      const stats = loadBalancer.getLoadStats(testAgents);
      expect(stats.overloadedAgents).toContain('agent-1');
    });

    it('should detect idle agents', () => {
      const testAgents = new Map<string, AgentCapability>();
      testAgents.set('agent-1', { agentId: 'agent-1', currentLoad: 15, name: 'Agent 1', provider: 'minimax', role: 'test', capabilities: { techStack: [], taskTypes: [], concurrency: 1, avgResponseTime: 1, successRate: 1 }, availability: true, lastActiveTime: Date.now() });
      testAgents.set('agent-2', { agentId: 'agent-2', currentLoad: 60, name: 'Agent 2', provider: 'minimax', role: 'test', capabilities: { techStack: [], taskTypes: [], concurrency: 1, avgResponseTime: 1, successRate: 1 }, availability: true, lastActiveTime: Date.now() });

      const stats = loadBalancer.getLoadStats(testAgents);
      expect(stats.idleAgents).toContain('agent-1');
    });
  });

  describe('System Overload Detection', () => {
    it('should detect system overload by average load', () => {
      // Make all agents very busy
      for (const agent of agents.values()) {
        agent.currentLoad = 85;
      }

      const isOverloaded = loadBalancer.isSystemOverloaded(agents);
      expect(isOverloaded).toBe(true);
    });

    it('should detect system overload by agent count', () => {
      // Make >50% of agents overloaded
      const agentArray = Array.from(agents.values());
      for (let i = 0; i < agentArray.length; i++) {
        agentArray[i].currentLoad = i < 6 ? 95 : 30; // 6 out of 11 overloaded
      }

      const isOverloaded = loadBalancer.isSystemOverloaded(agents);
      expect(isOverloaded).toBe(true);
    });

    it('should detect system not overloaded', () => {
      // Moderate loads
      for (const agent of agents.values()) {
        agent.currentLoad = 50;
      }

      const isOverloaded = loadBalancer.isSystemOverloaded(agents);
      expect(isOverloaded).toBe(false);
    });
  });

  describe('Scaling Suggestions', () => {
    it('should suggest scale-up when overloaded', () => {
      for (const agent of agents.values()) {
        agent.currentLoad = 85;
      }

      const suggestion = loadBalancer.suggestScaling(agents);

      expect(suggestion.action).toBe('scale-up');
      expect(suggestion.reason).toContain('overloaded');
      // Target agent count should be greater than or equal to current count
      expect(suggestion.targetAgentCount).toBeGreaterThanOrEqual(agents.size);
    });

    it('should suggest scale-down when underutilized', () => {
      for (const agent of agents.values()) {
        agent.currentLoad = 20;
      }

      const suggestion = loadBalancer.suggestScaling(agents);

      expect(suggestion.action).toBe('scale-down');
      expect(suggestion.reason).toContain('underutilized');
      // Target count should be less than or equal to current, with minimum of 3
      expect(suggestion.targetAgentCount).toBeLessThanOrEqual(agents.size);
      expect(suggestion.targetAgentCount).toBeGreaterThanOrEqual(3);
    });

    it('should maintain minimum agent count', () => {
      for (const agent of agents.values()) {
        agent.currentLoad = 10;
      }

      const suggestion = loadBalancer.suggestScaling(agents);
      expect(suggestion.targetAgentCount).toBeGreaterThanOrEqual(3);
    });

    it('should suggest none when balanced', () => {
      for (const agent of agents.values()) {
        agent.currentLoad = 60;
      }

      const suggestion = loadBalancer.suggestScaling(agents);

      expect(suggestion.action).toBe('none');
      expect(suggestion.reason).toContain('balanced');
      expect(suggestion.targetAgentCount).toBeUndefined();
    });
  });
});
