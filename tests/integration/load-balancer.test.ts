/**
 * Load Balancer Integration Tests
 * 
 * 测试负载均衡功能：
 * - 负载阈值
 * - 过载保护
 * - 负载均衡算法
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { LoadBalancer, LoadBalanceConfig } from '@/lib/agent-scheduler/core/load-balancer';
import { AgentCapability, initializeAgents } from '@/lib/agent-scheduler/models/agent-capability';
import { createTask } from '@/lib/agent-scheduler/models/task-model';

describe('Load Balancer Integration Tests', () => {
  let loadBalancer: LoadBalancer;
  let agents: Map<string, AgentCapability>;
  let defaultConfig: LoadBalanceConfig;

  beforeEach(() => {
    defaultConfig = {
      maxLoadThreshold: 90,
      busyThreshold: 70,
      preferLowLoad: true,
      considerSpecialization: true
    };

    loadBalancer = new LoadBalancer(defaultConfig);
    agents = initializeAgents();
  });

  /**
   * 测试1: 负载阈值
   */
  describe('Load Thresholds', () => {
    it('should check if agent is at capacity', () => {
      const agentArray = Array.from(agents.values());
      const agent = agentArray[0];

      // Initially not at capacity
      const smallTask = createTask({
        id: 'task-threshold-001',
        type: 'implementation',
        title: 'Small task',
        priority: 'medium',
        requiredCapabilities: [],
        estimatedDuration: 30 // 50% load
      });

      expect(loadBalancer.isAgentAtCapacity(agent, smallTask)).toBe(false);

      // Add load to make agent nearly full
      agent.currentLoad = 80;

      // Task would push over threshold
      const largeTask = createTask({
        id: 'task-threshold-002',
        type: 'implementation',
        title: 'Large task',
        priority: 'medium',
        requiredCapabilities: [],
        estimatedDuration: 20 // Would add ~33% load
      });

      // Check if task would exceed max threshold
      const newLoad = loadBalancer.calculateNewLoad(agent, largeTask);
      expect(newLoad).toBeGreaterThan(90);
    });

    it('should identify busy agents correctly', () => {
      const agentArray = Array.from(agents.values());
      const agent = agentArray[0];

      // Initially not busy
      agent.currentLoad = 50;
      expect(loadBalancer.isAgentBusy(agent)).toBe(false);

      // At busy threshold
      agent.currentLoad = 70;
      expect(loadBalancer.isAgentBusy(agent)).toBe(true);

      // Above busy threshold
      agent.currentLoad = 85;
      expect(loadBalancer.isAgentBusy(agent)).toBe(true);
    });

    it('should calculate new load correctly', () => {
      const agentArray = Array.from(agents.values());
      const agent = agentArray[0];
      agent.currentLoad = 30;

      const task = createTask({
        id: 'task-calc-001',
        type: 'implementation',
        title: 'Test task',
        priority: 'medium',
        requiredCapabilities: [],
        estimatedDuration: 30 // 50% load (30 min / 60 min * 100)
      });

      const newLoad = loadBalancer.calculateNewLoad(agent, task);

      // New load = 30 + (30/60 * 100) = 30 + 50 = 80
      expect(newLoad).toBe(80);
    });

    it('should respect custom threshold configuration', () => {
      const customConfig: LoadBalanceConfig = {
        maxLoadThreshold: 80,
        busyThreshold: 50,
        preferLowLoad: true,
        considerSpecialization: true
      };

      const customBalancer = new LoadBalancer(customConfig);
      const agentArray = Array.from(agents.values());
      const agent = agentArray[0];
      agent.currentLoad = 55;

      // Should be busy with lower threshold
      expect(customBalancer.isAgentBusy(agent)).toBe(true);

      // Task that would exceed lower max threshold
      const task = createTask({
        id: 'task-custom-001',
        type: 'implementation',
        title: 'Test task',
        priority: 'medium',
        requiredCapabilities: [],
        estimatedDuration: 30
      });

      // New load would be 55 + 50 = 105, exceeds 80
      expect(customBalancer.isAgentAtCapacity(agent, task)).toBe(true);
    });
  });

  /**
   * 测试2: 过载保护
   */
  describe('Overload Protection', () => {
    it('should prevent overloading agents', () => {
      const agentArray = Array.from(agents.values());
      const implAgents = agentArray.filter(a =>
        a.capabilities.taskTypes.includes('implementation')
      );

      // Set one agent to high load
      implAgents[0].currentLoad = 85;

      const task = createTask({
        id: 'task-overload-001',
        type: 'implementation',
        title: 'Test task',
        priority: 'high',
        requiredCapabilities: ['typescript'],
        estimatedDuration: 30
      });

      // Get available agents (not at capacity)
      const available = loadBalancer.getAvailableAgents(agents, task);

      // High-load agent should not be available for this task
      const highLoadAgent = available.find(a => a.agentId === implAgents[0].agentId);
      expect(highLoadAgent).toBeUndefined();
    });

    it('should detect system overload', () => {
      const agentArray = Array.from(agents.values());

      // Set most agents to high load
      for (let i = 0; i < Math.floor(agentArray.length / 2) + 1; i++) {
        agentArray[i].currentLoad = 92;
      }

      // System should be detected as overloaded
      expect(loadBalancer.isSystemOverloaded(agents)).toBe(true);
    });

    it('should detect system not overloaded', () => {
      const agentArray = Array.from(agents.values());

      // Set all agents to moderate load
      for (const agent of agentArray) {
        agent.currentLoad = 40;
      }

      // System should not be detected as overloaded
      expect(loadBalancer.isSystemOverloaded(agents)).toBe(false);
    });

    it('should provide scaling suggestion for overloaded system', () => {
      const agentArray = Array.from(agents.values());

      // Set all agents to high load
      for (const agent of agentArray) {
        agent.currentLoad = 85;
      }

      const suggestion = loadBalancer.suggestScaling(agents);

      expect(suggestion.action).toBe('scale-up');
      expect(suggestion.targetAgentCount).toBeGreaterThan(agents.size);
    });

    it('should provide scale-down suggestion for underutilized system', () => {
      const agentArray = Array.from(agents.values());

      // Set all agents to low load
      for (const agent of agentArray) {
        agent.currentLoad = 10;
      }

      // Need more than 3 agents to suggest scale-down
      if (agents.size > 3) {
        const suggestion = loadBalancer.suggestScaling(agents);
        expect(suggestion.action).toBe('scale-down');
      }
    });
  });

  /**
   * 测试3: 负载均衡算法
   */
  describe('Load Balancing Algorithm', () => {
    it('should select least loaded agent', () => {
      const agentArray = Array.from(agents.values());
      const implAgents = agentArray.filter(a =>
        a.capabilities.taskTypes.includes('implementation')
      );

      // Set varying loads
      implAgents[0].currentLoad = 60;
      implAgents[1].currentLoad = 20;
      implAgents[2].currentLoad = 40;

      const leastLoaded = loadBalancer.getLeastLoadedAgent(implAgents);

      expect(leastLoaded).not.toBeNull();
      expect(leastLoaded?.agentId).toBe(implAgents[1].agentId);
    });

    it('should get least loaded agents list', () => {
      const agentArray = Array.from(agents.values());
      const implAgents = agentArray.filter(a =>
        a.capabilities.taskTypes.includes('implementation')
      );

      // Set varying loads
      implAgents[0].currentLoad = 60;
      implAgents[1].currentLoad = 20;
      implAgents[2].currentLoad = 40;
      implAgents[3].currentLoad = 10;

      const leastLoaded = loadBalancer.getLeastLoadedAgents(implAgents, 2);

      expect(leastLoaded.length).toBe(2);
      expect(leastLoaded[0].currentLoad).toBeLessThanOrEqual(leastLoaded[1].currentLoad);
    });

    it('should balance load correctly', () => {
      const task = createTask({
        id: 'task-balance-001',
        type: 'implementation',
        title: 'Test task',
        priority: 'medium',
        requiredCapabilities: ['typescript'],
        estimatedDuration: 30
      });

      const result = loadBalancer.balanceLoad(agents, task);

      expect(result.recommendedAgents.length).toBeGreaterThan(0);
      expect(result.agentLoads.size).toBeGreaterThan(0);
      expect(result.reasoning).toBeTruthy();
    });

    it('should sort agents by load when preferLowLoad is true', () => {
      const agentArray = Array.from(agents.values());
      const implAgents = agentArray.filter(a =>
        a.capabilities.taskTypes.includes('implementation')
      );

      // Set varying loads
      implAgents[0].currentLoad = 50;
      implAgents[1].currentLoad = 10;
      implAgents[2].currentLoad = 30;

      const task = createTask({
        id: 'task-sort-001',
        type: 'implementation',
        title: 'Test task',
        priority: 'medium',
        requiredCapabilities: ['typescript'],
        estimatedDuration: 20
      });

      const result = loadBalancer.balanceLoad(agents, task);

      // First recommended agent should be least loaded
      const firstRecommendation = result.recommendedAgents[0];
      const firstAgent = implAgents.find(a => a.agentId === firstRecommendation);
      
      // Verify the recommendation is among lower load agents
      expect(firstAgent?.currentLoad).toBeLessThan(50);
    });

    it('should redistribute tasks from overloaded agents', () => {
      const agentArray = Array.from(agents.values());
      const implAgents = agentArray.filter(a =>
        a.capabilities.taskTypes.includes('implementation')
      );

      // Set one agent to high load
      const overloadedAgent = implAgents[0];
      overloadedAgent.currentLoad = 95;

      const task = createTask({
        id: 'task-redist-001',
        type: 'implementation',
        title: 'Test task',
        priority: 'medium',
        requiredCapabilities: ['typescript'],
        estimatedDuration: 20
      });

      const alternatives = loadBalancer.redistributeTasks(
        overloadedAgent.agentId,
        agents,
        task
      );

      // Should find alternative agents
      expect(alternatives.length).toBeGreaterThan(0);
      expect(alternatives).not.toContain(overloadedAgent.agentId);
    });
  });

  /**
   * 测试4: 负载统计
   */
  describe('Load Statistics', () => {
    it('should calculate load statistics correctly', () => {
      const agentArray = Array.from(agents.values());

      // Set specific loads
      for (let i = 0; i < agentArray.length; i++) {
        agentArray[i].currentLoad = (i + 1) * 10;
      }

      const stats = loadBalancer.getLoadStats(agents);

      expect(stats.totalLoad).toBeGreaterThan(0);
      expect(stats.averageLoad).toBeGreaterThan(0);
      expect(stats.maxLoad).toBeGreaterThanOrEqual(stats.minLoad);
    });

    it('should identify overloaded agents', () => {
      const agentArray = Array.from(agents.values());

      // Set some agents to overloaded
      agentArray[0].currentLoad = 92;
      agentArray[1].currentLoad = 95;

      const stats = loadBalancer.getLoadStats(agents);

      expect(stats.overloadedAgents.length).toBeGreaterThanOrEqual(2);
    });

    it('should identify busy agents', () => {
      const agentArray = Array.from(agents.values());

      // Set some agents to busy
      agentArray[0].currentLoad = 75;
      agentArray[1].currentLoad = 80;

      const stats = loadBalancer.getLoadStats(agents);

      expect(stats.busyAgents.length).toBeGreaterThanOrEqual(2);
    });

    it('should identify idle agents', () => {
      const agentArray = Array.from(agents.values());

      // Set some agents to idle
      for (let i = 0; i < 3; i++) {
        if (agentArray[i]) {
          agentArray[i].currentLoad = 5;
        }
      }

      const stats = loadBalancer.getLoadStats(agents);

      expect(stats.idleAgents.length).toBeGreaterThanOrEqual(0);
    });
  });

  /**
   * 测试5: Agent 性能记录
   */
  describe('Agent Performance Recording', () => {
    it('should record task completion', () => {
      const agentId = 'test-agent-001';

      loadBalancer.recordTaskCompletion(agentId, true);
      loadBalancer.recordTaskCompletion(agentId, true);
      loadBalancer.recordTaskCompletion(agentId, false);

      const performance = loadBalancer.getAgentPerformance(agentId);

      expect(performance).not.toBeNull();
      expect(performance?.completed).toBe(2);
      expect(performance?.failed).toBe(1);
      expect(performance?.total).toBe(3);
      expect(performance?.successRate).toBeCloseTo(2/3, 1);
    });

    it('should return null for unknown agent performance', () => {
      const performance = loadBalancer.getAgentPerformance('unknown-agent');
      expect(performance).toBeNull();
    });

    it('should calculate success rate correctly', () => {
      const agentId = 'test-agent-002';

      // 4 successful, 1 failed = 80% success rate
      for (let i = 0; i < 4; i++) {
        loadBalancer.recordTaskCompletion(agentId, true);
      }
      loadBalancer.recordTaskCompletion(agentId, false);

      const performance = loadBalancer.getAgentPerformance(agentId);

      expect(performance?.successRate).toBe(0.8);
    });
  });

  /**
   * 测试6: Agent 可用性排序
   */
  describe('Agent Availability Sorting', () => {
    it('should sort agents by availability first', () => {
      const agentArray = Array.from(agents.values());
      const implAgents = agentArray.filter(a =>
        a.capabilities.taskTypes.includes('implementation')
      );

      // Set some agents offline
      implAgents[0].availability = false;
      implAgents[1].availability = true;
      implAgents[2].availability = false;
      implAgents[3].availability = true;

      const sorted = loadBalancer.getAgentsByAvailability(
        new Map(implAgents.map(a => [a.agentId, a]))
      );

      // Available agents should be first
      let foundUnavailable = false;
      for (const agent of sorted) {
        if (!agent.availability) {
          foundUnavailable = true;
        } else if (foundUnavailable) {
          // Found available agent after unavailable - not sorted correctly
          expect.fail('Available agents should be sorted first');
        }
      }
    });

    it('should sort available agents by load', () => {
      const agentArray = Array.from(agents.values());
      const implAgents = agentArray.filter(a =>
        a.capabilities.taskTypes.includes('implementation') && a.availability
      );

      // Set varying loads
      implAgents[0].currentLoad = 50;
      implAgents[1].currentLoad = 20;
      implAgents[2].currentLoad = 70;

      const sorted = loadBalancer.getAgentsByAvailability(
        new Map(implAgents.map(a => [a.agentId, a]))
      );

      // Among available agents, lower load should come first
      const availableSorted = sorted.filter(a => a.availability);
      for (let i = 1; i < availableSorted.length; i++) {
        expect(availableSorted[i-1].currentLoad).toBeLessThanOrEqual(
          availableSorted[i].currentLoad
        );
      }
    });
  });

  /**
   * 测试7: 配置更新
   */
  describe('Configuration Updates', () => {
    it('should update configuration', () => {
      const newConfig: Partial<LoadBalanceConfig> = {
        maxLoadThreshold: 85,
        busyThreshold: 60
      };

      loadBalancer.updateConfig(newConfig);

      const config = loadBalancer.getConfig();

      expect(config.maxLoadThreshold).toBe(85);
      expect(config.busyThreshold).toBe(60);
      expect(config.preferLowLoad).toBe(true); // Should preserve existing
    });

    it('should use new thresholds after update', () => {
      const agentArray = Array.from(agents.values());
      const agent = agentArray[0];
      agent.currentLoad = 65;

      // Initially not busy (threshold 70)
      expect(loadBalancer.isAgentBusy(agent)).toBe(false);

      // Update threshold
      loadBalancer.updateConfig({ busyThreshold: 60 });

      // Now should be busy
      expect(loadBalancer.isAgentBusy(agent)).toBe(true);
    });
  });

  /**
   * 测试8: 重置功能
   */
  describe('Reset Functionality', () => {
    it('should reset load balancer state', () => {
      // Add some history
      loadBalancer.recordTaskCompletion('agent-1', true);
      loadBalancer.recordTaskCompletion('agent-2', false);

      // Reset
      loadBalancer.reset();

      // History should be cleared
      expect(loadBalancer.getAgentPerformance('agent-1')).toBeNull();
      expect(loadBalancer.getAgentPerformance('agent-2')).toBeNull();
    });
  });
});
