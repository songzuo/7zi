/**
 * Load Balancer Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { LoadBalancer, LoadBalanceConfig } from '../../../src/lib/agent-scheduler/core/load-balancer';
import { AgentCapability, initializeAgents } from '../../../src/lib/agent-scheduler/models/agent-capability';
import { Task, createTask } from '../../../src/lib/agent-scheduler/models/task-model';

describe('LoadBalancer', () => {
  let loadBalancer: LoadBalancer;
  let agents: Map<string, AgentCapability>;

  beforeEach(() => {
    loadBalancer = new LoadBalancer();
    agents = initializeAgents();
  });

  describe('calculateNewLoad', () => {
    it('should calculate load after task assignment', () => {
      const agent = agents.get('executor')!;
      agent.currentLoad = 30;

      const task = createTask({
        id: 'task-1',
        type: 'implementation',
        title: 'Test',
        estimatedDuration: 30 // 30 minutes = 50% load
      });

      const newLoad = loadBalancer.calculateNewLoad(agent, task);

      expect(newLoad).toBe(80); // 30 + 50
    });

    it('should handle long tasks', () => {
      const agent = agents.get('architect')!;
      agent.currentLoad = 20;

      const task = createTask({
        id: 'task-1',
        type: 'architecture',
        title: 'Large Task',
        estimatedDuration: 120 // 2 hours = 200% load
      });

      const newLoad = loadBalancer.calculateNewLoad(agent, task);

      expect(newLoad).toBe(220); // Exceeds capacity
    });
  });

  describe('isAgentAtCapacity', () => {
    it('should return true when load exceeds threshold', () => {
      const agent = agents.get('executor')!;
      agent.currentLoad = 85;

      const task = createTask({
        id: 'task-1',
        type: 'implementation',
        title: 'Test',
        estimatedDuration: 30 // Would add 50%
      });

      const atCapacity = loadBalancer.isAgentAtCapacity(agent, task);

      expect(atCapacity).toBe(true);
    });

    it('should return false when load is within threshold', () => {
      const agent = agents.get('executor')!;
      agent.currentLoad = 30;

      const task = createTask({
        id: 'task-1',
        type: 'implementation',
        title: 'Test',
        estimatedDuration: 30
      });

      const atCapacity = loadBalancer.isAgentAtCapacity(agent, task);

      expect(atCapacity).toBe(false);
    });
  });

  describe('isAgentBusy', () => {
    it('should return true for busy agent', () => {
      const agent = agents.get('architect')!;
      agent.currentLoad = 75;

      const isBusy = loadBalancer.isAgentBusy(agent);

      expect(isBusy).toBe(true);
    });

    it('should return false for available agent', () => {
      const agent = agents.get('executor')!;
      agent.currentLoad = 30;

      const isBusy = loadBalancer.isAgentBusy(agent);

      expect(isBusy).toBe(false);
    });
  });

  describe('getAvailableAgents', () => {
    it('should return agents with capacity', () => {
      const task = createTask({
        id: 'task-1',
        type: 'implementation',
        title: 'Test',
        estimatedDuration: 30
      });

      const available = loadBalancer.getAvailableAgents(agents, task);

      expect(available.length).toBeGreaterThan(0);
    });

    it('should exclude agents at capacity', () => {
      // Make architect at capacity
      const architect = agents.get('architect')!;
      architect.currentLoad = 95;

      const task = createTask({
        id: 'task-1',
        type: 'architecture',
        title: 'Test',
        estimatedDuration: 30
      });

      const available = loadBalancer.getAvailableAgents(agents, task);
      const ids = available.map(a => a.agentId);

      expect(ids).not.toContain('architect');
    });
  });

  describe('getLeastLoadedAgent', () => {
    it('should return agent with lowest load', () => {
      const agentArray = Array.from(agents.values());
      
      // Set specific loads for identifiable agents
      const executor = agents.get('executor')!;
      const architect = agents.get('architect')!;
      const sysadmin = agents.get('sysadmin')!;
      
      executor.currentLoad = 10;
      architect.currentLoad = 50;
      sysadmin.currentLoad = 30;

      const leastLoaded = loadBalancer.getLeastLoadedAgent([executor, architect, sysadmin]);

      expect(leastLoaded?.agentId).toBe('executor');
      expect(leastLoaded?.currentLoad).toBe(10);
    });

    it('should return null for empty array', () => {
      const leastLoaded = loadBalancer.getLeastLoadedAgent([]);
      expect(leastLoaded).toBeNull();
    });
  });

  describe('balanceLoad', () => {
    it('should recommend agents in load order', () => {
      const task = createTask({
        id: 'task-1',
        type: 'implementation',
        title: 'Test'
      });

      // Set different loads
      agents.get('executor')!.currentLoad = 20;
      agents.get('architect')!.currentLoad = 60;

      const result = loadBalancer.balanceLoad(agents, task);

      expect(result.recommendedAgents.length).toBeGreaterThan(0);
      expect(result.reasoning).toBeDefined();
    });

    it('should return empty for no available agents', () => {
      // Make all agents at capacity
      for (const agent of agents.values()) {
        agent.currentLoad = 95;
      }

      const task = createTask({
        id: 'task-1',
        type: 'implementation',
        title: 'Test',
        estimatedDuration: 30
      });

      const result = loadBalancer.balanceLoad(agents, task);

      expect(result.recommendedAgents).toHaveLength(0);
    });
  });

  describe('recordTaskCompletion', () => {
    it('should track agent performance', () => {
      loadBalancer.recordTaskCompletion('executor', true);
      loadBalancer.recordTaskCompletion('executor', true);
      loadBalancer.recordTaskCompletion('executor', false);

      const performance = loadBalancer.getAgentPerformance('executor');

      expect(performance).toBeDefined();
      expect(performance?.completed).toBe(2);
      expect(performance?.failed).toBe(1);
      expect(performance?.successRate).toBeCloseTo(0.67, 1);
    });
  });

  describe('getAgentsByAvailability', () => {
    it('should sort by availability and load', () => {
      // Set up mixed availability
      agents.get('architect')!.availability = false;
      agents.get('executor')!.currentLoad = 20;
      agents.get('sysadmin')!.currentLoad = 10;

      const sorted = loadBalancer.getAgentsByAvailability(agents);

      // Available agents should come first
      expect(sorted[0].availability).toBe(true);
    });
  });

  describe('getLoadStats', () => {
    it('should calculate load statistics', () => {
      // Set specific loads
      agents.get('architect')!.currentLoad = 80;
      agents.get('executor')!.currentLoad = 20;
      agents.get('sysadmin')!.currentLoad = 50;

      const stats = loadBalancer.getLoadStats(agents);

      expect(stats.averageLoad).toBeCloseTo(
        (80 + 20 + 50 + 8 * 0) / 11,
        1
      );
      expect(stats.maxLoad).toBe(80);
      expect(stats.minLoad).toBe(0);
    });

    it('should identify overloaded agents', () => {
      agents.get('architect')!.currentLoad = 95;

      const stats = loadBalancer.getLoadStats(agents);

      expect(stats.overloadedAgents).toContain('architect');
    });

    it('should identify idle agents', () => {
      // Most agents should be idle at start
      const stats = loadBalancer.getLoadStats(agents);

      expect(stats.idleAgents.length).toBeGreaterThan(5);
    });
  });

  describe('isSystemOverloaded', () => {
    it('should return false for balanced system', () => {
      const isOverloaded = loadBalancer.isSystemOverloaded(agents);
      expect(isOverloaded).toBe(false);
    });

    it('should return true for overloaded system', () => {
      // Make most agents overloaded
      for (const agent of agents.values()) {
        agent.currentLoad = 95;
      }

      const isOverloaded = loadBalancer.isSystemOverloaded(agents);
      expect(isOverloaded).toBe(true);
    });
  });

  describe('suggestScaling', () => {
    it('should suggest scale-up when overloaded', () => {
      // Overload system
      for (const agent of agents.values()) {
        agent.currentLoad = 95;
      }

      const suggestion = loadBalancer.suggestScaling(agents);

      expect(suggestion.action).toBe('scale-up');
      expect(suggestion.targetAgentCount).toBeDefined();
    });

    it('should suggest scale-down when underutilized', () => {
      // All agents idle
      const suggestion = loadBalancer.suggestScaling(agents);

      // With 11 agents all at 0 load, should suggest scale-down
      expect(suggestion.action).toBe('scale-down');
    });

    it('should suggest none for balanced system', () => {
      // Set moderate load
      for (const agent of agents.values()) {
        agent.currentLoad = 50;
      }

      const suggestion = loadBalancer.suggestScaling(agents);

      expect(suggestion.action).toBe('none');
    });
  });

  describe('updateConfig', () => {
    it('should update configuration', () => {
      loadBalancer.updateConfig({
        maxLoadThreshold: 80,
        busyThreshold: 60
      });

      const config = loadBalancer.getConfig();

      expect(config.maxLoadThreshold).toBe(80);
      expect(config.busyThreshold).toBe(60);
    });
  });

  describe('reset', () => {
    it('should clear history', () => {
      loadBalancer.recordTaskCompletion('executor', true);
      loadBalancer.reset();

      const performance = loadBalancer.getAgentPerformance('executor');
      expect(performance).toBeNull();
    });
  });
});
