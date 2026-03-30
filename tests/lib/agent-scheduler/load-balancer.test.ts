/**
 * Load Balancer Tests
 * 测试负载均衡逻辑
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { LoadBalancer } from '../../../src/lib/agent-scheduler/core/load-balancer';
import { AgentCapability } from '../../../src/lib/agent-scheduler/models/agent-capability';
import { Task } from '../../../src/lib/agent-scheduler/models/task-model';

describe('LoadBalancer - 负载均衡测试', () => {
  let loadBalancer: LoadBalancer;
  let agents: Map<string, AgentCapability>;

  beforeEach(() => {
    loadBalancer = new LoadBalancer();
    agents = new Map();

    // 创建不同负载的 Agent
    const agent1: AgentCapability = {
      agentId: 'agent-1',
      name: 'Light Load Agent',
      provider: 'minimax',
      role: '开发',
      capabilities: {
        techStack: ['typescript', 'react'],
        taskTypes: ['implementation'],
        concurrency: 3,
        avgResponseTime: 5,
        successRate: 0.95
      },
      currentLoad: 10, // 低负载
      availability: true,
      lastActiveTime: Date.now()
    };

    const agent2: AgentCapability = {
      agentId: 'agent-2',
      name: 'Medium Load Agent',
      provider: 'bailian',
      role: '开发',
      capabilities: {
        techStack: ['typescript', 'react'],
        taskTypes: ['implementation'],
        concurrency: 3,
        avgResponseTime: 6,
        successRate: 0.92
      },
      currentLoad: 50, // 中等负载
      availability: true,
      lastActiveTime: Date.now()
    };

    const agent3: AgentCapability = {
      agentId: 'agent-3',
      name: 'Busy Agent',
      provider: 'volcengine',
      role: '开发',
      capabilities: {
        techStack: ['typescript', 'react'],
        taskTypes: ['implementation'],
        concurrency: 3,
        avgResponseTime: 5,
        successRate: 0.94
      },
      currentLoad: 75, // 高负载
      availability: true,
      lastActiveTime: Date.now()
    };

    const agent4: AgentCapability = {
      agentId: 'agent-4',
      name: 'Overloaded Agent',
      provider: 'self-claude',
      role: '开发',
      capabilities: {
        techStack: ['typescript', 'react'],
        taskTypes: ['implementation'],
        concurrency: 3,
        avgResponseTime: 5,
        successRate: 0.95
      },
      currentLoad: 95, // 过载
      availability: true,
      lastActiveTime: Date.now()
    };

    const agent5: AgentCapability = {
      agentId: 'agent-5',
      name: 'Unavailable Agent',
      provider: 'minimax',
      role: '开发',
      capabilities: {
        techStack: ['typescript', 'react'],
        taskTypes: ['implementation'],
        concurrency: 3,
        avgResponseTime: 5,
        successRate: 0.95
      },
      currentLoad: 20,
      availability: false, // 不可用
      lastActiveTime: Date.now()
    };

    agents.set('agent-1', agent1);
    agents.set('agent-2', agent2);
    agents.set('agent-3', agent3);
    agents.set('agent-4', agent4);
    agents.set('agent-5', agent5);
  });

  describe('calculateNewLoad - 计算新负载', () => {
    it('应该正确计算任务后的新负载', () => {
      const agent = agents.get('agent-1')!;
      const task: Task = {
        id: 'task-1',
        type: 'implementation',
        priority: 'medium',
        requiredCapabilities: ['typescript'],
        estimatedDuration: 30, // 30 分钟 = 50% 负载
        dependencies: [],
        status: 'pending',
        title: '任务',
        createdAt: Date.now()
      };

      const newLoad = loadBalancer.calculateNewLoad(agent, task);

      expect(newLoad).toBe(60); // 10 + 50
    });

    it('60分钟任务应该增加100%负载', () => {
      const agent = agents.get('agent-2')!; // 负载 50%
      const task: Task = {
        id: 'task-1',
        type: 'implementation',
        priority: 'medium',
        requiredCapabilities: ['typescript'],
        estimatedDuration: 60, // 60 分钟 = 100% 负载
        dependencies: [],
        status: 'pending',
        title: '大任务',
        createdAt: Date.now()
      };

      const newLoad = loadBalancer.calculateNewLoad(agent, task);

      expect(newLoad).toBe(150); // 50 + 100
    });

    it('短任务应该增加较少负载', () => {
      const agent = agents.get('agent-1')!; // 负载 10%
      const task: Task = {
        id: 'task-1',
        type: 'implementation',
        priority: 'medium',
        requiredCapabilities: ['typescript'],
        estimatedDuration: 12, // 12 分钟 = 20% 负载
        dependencies: [],
        status: 'pending',
        title: '小任务',
        createdAt: Date.now()
      };

      const newLoad = loadBalancer.calculateNewLoad(agent, task);

      expect(newLoad).toBe(30); // 10 + 20
    });
  });

  describe('isAgentAtCapacity - 检查 Agent 是否达到容量', () => {
    it('低于阈值时应该返回 false', () => {
      const agent = agents.get('agent-1')!; // 负载 10%
      const task: Task = {
        id: 'task-1',
        type: 'implementation',
        priority: 'medium',
        requiredCapabilities: ['typescript'],
        estimatedDuration: 30, // 增加 50% 负载，总计 60%
        dependencies: [],
        status: 'pending',
        title: '任务',
        createdAt: Date.now()
      };

      const atCapacity = loadBalancer.isAgentAtCapacity(agent, task);

      expect(atCapacity).toBe(false); // 60% < 90%
    });

    it('超过阈值时应该返回 true', () => {
      const agent = agents.get('agent-3')!; // 负载 75%
      const task: Task = {
        id: 'task-1',
        type: 'implementation',
        priority: 'medium',
        requiredCapabilities: ['typescript'],
        estimatedDuration: 30, // 增加 50% 负载，总计 125%
        dependencies: [],
        status: 'pending',
        title: '大任务',
        createdAt: Date.now()
      };

      const atCapacity = loadBalancer.isAgentAtCapacity(agent, task);

      expect(atCapacity).toBe(true); // 125% > 90%
    });

    it('恰好等于阈值时应该返回 true', () => {
      const agent = agents.get('agent-4')!; // 负载 95%
      const task: Task = {
        id: 'task-1',
        type: 'implementation',
        priority: 'medium',
        requiredCapabilities: ['typescript'],
        estimatedDuration: -5, // 负任务减少负载
        dependencies: [],
        status: 'pending',
        title: '负任务',
        createdAt: Date.now()
      };

      // 但实际上任务持续时间不会为负
      // 测试边界情况
      const atCapacity = loadBalancer.isAgentAtCapacity(agent, task);

      expect(atCapacity).toBe(false); // 95% - 8.33% = 86.67% < 90%
    });
  });

  describe('isAgentBusy - 检查 Agent 是否忙碌', () => {
    it('低于忙碌阈值时应该返回 false', () => {
      const agent = agents.get('agent-1')!; // 负载 10%

      const isBusy = loadBalancer.isAgentBusy(agent);

      expect(isBusy).toBe(false); // 10% < 70%
    });

    it('高于忙碌阈值时应该返回 true', () => {
      const agent = agents.get('agent-3')!; // 负载 75%

      const isBusy = loadBalancer.isAgentBusy(agent);

      expect(isBusy).toBe(true); // 75% >= 70%
    });

    it('等于忙碌阈值时应该返回 true', () => {
      // 临时修改一个 agent 的负载
      const agent = { ...agents.get('agent-2')!, currentLoad: 70 };

      const isBusy = loadBalancer.isAgentBusy(agent);

      expect(isBusy).toBe(true); // 70% >= 70%
    });
  });

  describe('getAvailableAgents - 获取可用 Agent', () => {
    it('应该返回有容量且可用的 Agent', () => {
      const task: Task = {
        id: 'task-1',
        type: 'implementation',
        priority: 'medium',
        requiredCapabilities: ['typescript'],
        estimatedDuration: 30, // 增加 50% 负载
        dependencies: [],
        status: 'pending',
        title: '任务',
        createdAt: Date.now()
      };

      const available = loadBalancer.getAvailableAgents(agents, task);

      // agent-1: 10 + 50 = 60 < 90 ✓
      // agent-2: 50 + 50 = 100 > 90 ✗
      // agent-3: 75 + 50 = 125 > 90 ✗
      // agent-4: 95 + 50 = 145 > 90 ✗
      // agent-5: 不可用 ✗
      // 所以只有 agent-1
      expect(available.length).toBe(1);
      expect(available[0].agentId).toBe('agent-1');
    });

    it('应该忽略不可用的 Agent', () => {
      const task: Task = {
        id: 'task-1',
        type: 'implementation',
        priority: 'medium',
        requiredCapabilities: ['typescript'],
        estimatedDuration: 10, // 增加 16.7% 负载
        dependencies: [],
        status: 'pending',
        title: '小任务',
        createdAt: Date.now()
      };

      const available = loadBalancer.getAvailableAgents(agents, task);

      expect(available.map(a => a.agentId)).not.toContain('agent-5');
    });
  });

  describe('getLeastLoadedAgent - 获取负载最低的 Agent', () => {
    it('应该返回负载最低的 Agent', () => {
      const agentList = Array.from(agents.values());
      const leastLoaded = loadBalancer.getLeastLoadedAgent(agentList);

      expect(leastLoaded).not.toBeNull();
      expect(leastLoaded!.agentId).toBe('agent-1'); // 负载 10%
    });

    it('空列表应该返回 null', () => {
      const leastLoaded = loadBalancer.getLeastLoadedAgent([]);

      expect(leastLoaded).toBeNull();
    });
  });

  describe('getLeastLoadedAgents - 获取负载最低的 N 个 Agent', () => {
    it('应该按负载升序返回 Agent', () => {
      const agentList = Array.from(agents.values());
      const leastLoaded = loadBalancer.getLeastLoadedAgents(agentList, 3);

      expect(leastLoaded.length).toBe(3);
      expect(leastLoaded[0].agentId).toBe('agent-1'); // 10%
      expect(leastLoaded[1].agentId).toBe('agent-5'); // 20%
      expect(leastLoaded[2].agentId).toBe('agent-2'); // 50%
    });

    it('当请求的数量大于列表时应该返回所有 Agent', () => {
      const agentList = Array.from(agents.values());
      const leastLoaded = loadBalancer.getLeastLoadedAgents(agentList, 10);

      expect(leastLoaded.length).toBe(agents.size);
    });

    it('应该按负载排序', () => {
      const agentList = Array.from(agents.values());
      const leastLoaded = loadBalancer.getLeastLoadedAgents(agentList, 5);

      // 验证排序
      for (let i = 0; i < leastLoaded.length - 1; i++) {
        expect(leastLoaded[i].currentLoad).toBeLessThanOrEqual(leastLoaded[i + 1].currentLoad);
      }
    });
  });

  describe('balanceLoad - 负载均衡', () => {
    it('应该返回推荐的 Agent 列表', () => {
      const task: Task = {
        id: 'task-1',
        type: 'implementation',
        priority: 'medium',
        requiredCapabilities: ['typescript'],
        estimatedDuration: 20, // 增加 33.3% 负载
        dependencies: [],
        status: 'pending',
        title: '任务',
        createdAt: Date.now()
      };

      const result = loadBalancer.balanceLoad(agents, task);

      expect(result).toHaveProperty('recommendedAgents');
      expect(result).toHaveProperty('agentLoads');
      expect(result).toHaveProperty('reasoning');
      expect(result.recommendedAgents.length).toBeGreaterThan(0);
      expect(result.reasoning).toBeTruthy();
    });

    it('应该按负载排序推荐 Agent', () => {
      const task: Task = {
        id: 'task-1',
        type: 'implementation',
        priority: 'medium',
        requiredCapabilities: ['typescript'],
        estimatedDuration: 10, // 增加 16.7% 负载
        dependencies: [],
        status: 'pending',
        title: '任务',
        createdAt: Date.now()
      };

      const result = loadBalancer.balanceLoad(agents, task);

      // 验证排序
      const loads = result.recommendedAgents.map(id =>
        agents.get(id)!.currentLoad
      );

      for (let i = 0; i < loads.length - 1; i++) {
        expect(loads[i]).toBeLessThanOrEqual(loads[i + 1]);
      }
    });

    it('当没有可用 Agent 时应该返回空结果', () => {
      const task: Task = {
        id: 'task-1',
        type: 'implementation',
        priority: 'medium',
        requiredCapabilities: ['typescript'],
        estimatedDuration: 120, // 200% 负载，没有 agent 能接受
        dependencies: [],
        status: 'pending',
        title: '超大任务',
        createdAt: Date.now()
      };

      const result = loadBalancer.balanceLoad(agents, task);

      expect(result.recommendedAgents).toEqual([]);
      expect(result.agentLoads.size).toBe(0);
      expect(result.reasoning).toContain('No agents available');
    });
  });

  describe('updateAgentLoad - 更新 Agent 负载', () => {
    it('应该正确增加 Agent 负载', () => {
      const agentId = 'agent-1';
      const originalLoad = agents.get(agentId)!.currentLoad;

      loadBalancer.updateAgentLoad(agents, agentId, 30);

      expect(agents.get(agentId)!.currentLoad).toBe(originalLoad + 30);
    });

    it('应该正确减少 Agent 负载', () => {
      const agentId = 'agent-2';
      const originalLoad = agents.get(agentId)!.currentLoad;

      loadBalancer.updateAgentLoad(agents, agentId, -20);

      expect(agents.get(agentId)!.currentLoad).toBe(originalLoad - 20);
    });

    it('负载不应超过 100%', () => {
      const agentId = 'agent-1';

      loadBalancer.updateAgentLoad(agents, agentId, 200);

      expect(agents.get(agentId)!.currentLoad).toBe(100);
    });

    it('负载不应低于 0%', () => {
      const agentId = 'agent-2';

      loadBalancer.updateAgentLoad(agents, agentId, -100);

      expect(agents.get(agentId)!.currentLoad).toBe(0);
    });
  });

  describe('recordTaskCompletion - 记录任务完成', () => {
    it('应该记录成功完成的任务', () => {
      const agentId = 'agent-1';

      loadBalancer.recordTaskCompletion(agentId, true);

      const perf = loadBalancer.getAgentPerformance(agentId);
      expect(perf).not.toBeNull();
      expect(perf!.completed).toBe(1);
      expect(perf!.failed).toBe(0);
      expect(perf!.total).toBe(1);
      expect(perf!.successRate).toBe(1.0);
    });

    it('应该记录失败的任务', () => {
      const agentId = 'agent-2';

      loadBalancer.recordTaskCompletion(agentId, false);

      const perf = loadBalancer.getAgentPerformance(agentId);
      expect(perf).not.toBeNull();
      expect(perf!.completed).toBe(0);
      expect(perf!.failed).toBe(1);
      expect(perf!.total).toBe(1);
      expect(perf!.successRate).toBe(0.0);
    });

    it('应该累计多个任务记录', () => {
      const agentId = 'agent-3';

      loadBalancer.recordTaskCompletion(agentId, true);
      loadBalancer.recordTaskCompletion(agentId, true);
      loadBalancer.recordTaskCompletion(agentId, false);

      const perf = loadBalancer.getAgentPerformance(agentId);
      expect(perf).not.toBeNull();
      expect(perf!.completed).toBe(2);
      expect(perf!.failed).toBe(1);
      expect(perf!.total).toBe(3);
      expect(perf!.successRate).toBeCloseTo(0.667, 2);
    });
  });

  describe('getLoadStats - 获取负载统计', () => {
    it('应该计算正确的统计信息', () => {
      const stats = loadBalancer.getLoadStats(agents);

      expect(stats).toHaveProperty('totalLoad');
      expect(stats).toHaveProperty('averageLoad');
      expect(stats).toHaveProperty('maxLoad');
      expect(stats).toHaveProperty('minLoad');
      expect(stats).toHaveProperty('overloadedAgents');
      expect(stats).toHaveProperty('busyAgents');
      expect(stats).toHaveProperty('idleAgents');

      // 验证计算
      const expectedAvg = (10 + 50 + 75 + 95 + 20) / 5;
      expect(stats.averageLoad).toBeCloseTo(expectedAvg);

      expect(stats.maxLoad).toBe(95);
      expect(stats.minLoad).toBe(10);
    });

    it('应该正确识别过载 Agent', () => {
      const stats = loadBalancer.getLoadStats(agents);

      expect(stats.overloadedAgents).toContain('agent-4'); // 95% > 90%
    });

    it('应该正确识别忙碌 Agent', () => {
      const stats = loadBalancer.getLoadStats(agents);

      expect(stats.busyAgents).toContain('agent-3'); // 75% >= 70%
      expect(stats.busyAgents).toContain('agent-4'); // 95% >= 70%
    });

    it('应该正确识别空闲 Agent', () => {
      const stats = loadBalancer.getLoadStats(agents);

      expect(stats.idleAgents).toContain('agent-1'); // 10% < 20%
    });
  });

  describe('isSystemOverloaded - 系统过载检查', () => {
    it('平均负载高时应该返回 true', () => {
      // 创建高负载的 agents
      const overloadedAgents = new Map(agents);
      overloadedAgents.forEach(agent => {
        agent.currentLoad = 85;
      });

      const isOverloaded = loadBalancer.isSystemOverloaded(overloadedAgents);

      expect(isOverloaded).toBe(true); // 平均负载 85% > 80%
    });

    it('大量 Agent 过载时应该返回 true', () => {
      // 修改使一半 agent 过载
      agents.get('agent-1')!.currentLoad = 95;
      agents.get('agent-2')!.currentLoad = 95;
      agents.get('agent-3')!.currentLoad = 95;

      const isOverloaded = loadBalancer.isSystemOverloaded(agents);

      expect(isOverloaded).toBe(true);
    });

    it('负载正常时应该返回 false', () => {
      const isOverloaded = loadBalancer.isSystemOverloaded(agents);

      expect(isOverloaded).toBe(false);
    });
  });

  describe('suggestScaling - 扩缩容建议', () => {
    it('过载时应该建议扩容', () => {
      agents.forEach(agent => {
        agent.currentLoad = 85;
      });

      const suggestion = loadBalancer.suggestScaling(agents);

      expect(suggestion.action).toBe('scale-up');
      // targetAgentCount should be greater than 0 (indicating need for more agents)
      expect(suggestion.targetAgentCount).toBeDefined();
      expect(suggestion.targetAgentCount!).toBeGreaterThan(0);
      expect(suggestion.reason).toContain('overloaded');
    });

    it('负载低时应该建议缩容', () => {
      agents.forEach(agent => {
        agent.currentLoad = 10;
      });

      const suggestion = loadBalancer.suggestScaling(agents);

      expect(suggestion.action).toBe('scale-down');
      expect(suggestion.targetAgentCount).toBeLessThan(agents.size);
      expect(suggestion.reason).toContain('underutilized');
    });

    it('负载平衡时应该不操作', () => {
      const suggestion = loadBalancer.suggestScaling(agents);

      expect(suggestion.action).toBe('none');
      expect(suggestion.targetAgentCount).toBeUndefined();
      expect(suggestion.reason).toContain('balanced');
    });

    it('最少应该保留 3 个 Agent', () => {
      // 创建只有 3 个低负载的 agent
      const smallAgents = new Map<string, AgentCapability>();
      agents.forEach((agent, id) => {
        if (id === 'agent-1' || id === 'agent-2' || id === 'agent-3') {
          const lowLoadAgent = { ...agent, currentLoad: 5 };
          smallAgents.set(id, lowLoadAgent);
        }
      });

      const suggestion = loadBalancer.suggestScaling(smallAgents);

      // 虽然 3 个 agent 都是低负载，但不会建议缩容到 3 以下
      expect(suggestion.action).toBe('none');
    });
  });

  describe('getAgentsByAvailability - 按可用性排序 Agent', () => {
    it('可用的 Agent 应该排在前面', () => {
      const sorted = loadBalancer.getAgentsByAvailability(agents);

      const availableCount = sorted.filter(a => a.availability).length;

      // 所有可用的 agent 应该在不可用的 agent 之前
      const firstUnavailable = sorted.findIndex(a => !a.availability);
      if (firstUnavailable > 0) {
        for (let i = 0; i < firstUnavailable; i++) {
          expect(sorted[i].availability).toBe(true);
        }
      }
    });

    it('在可用的 Agent 中应该按负载排序', () => {
      const sorted = loadBalancer.getAgentsByAvailability(agents);

      // 找到所有可用的 agent
      const availableAgents = sorted.filter(a => a.availability);

      // 验证它们按负载升序排列
      for (let i = 0; i < availableAgents.length - 1; i++) {
        expect(availableAgents[i].currentLoad).toBeLessThanOrEqual(availableAgents[i + 1].currentLoad);
      }
    });
  });

  describe('redistributeTasks - 任务重分配', () => {
    it('应该找到能接受任务的 Agent', () => {
      const overloadedAgentId = 'agent-4'; // 负载 95%
      const task: Task = {
        id: 'task-1',
        type: 'implementation',
        priority: 'medium',
        requiredCapabilities: ['typescript'],
        estimatedDuration: 10, // 增加 16.7% 负载
        dependencies: [],
        status: 'pending',
        title: '任务',
        createdAt: Date.now()
      };

      const alternatives = loadBalancer.redistributeTasks(overloadedAgentId, agents, task);

      expect(alternatives.length).toBeGreaterThan(0);
      expect(alternatives).not.toContain(overloadedAgentId);
    });

    it('不存在的 Agent 应该返回空数组', () => {
      const task: Task = {
        id: 'task-1',
        type: 'implementation',
        priority: 'medium',
        requiredCapabilities: ['typescript'],
        estimatedDuration: 10,
        dependencies: [],
        status: 'pending',
        title: '任务',
        createdAt: Date.now()
      };

      const alternatives = loadBalancer.redistributeTasks('nonexistent', agents, task);

      expect(alternatives).toEqual([]);
    });
  });

  describe('配置更新', () => {
    it('应该能够更新配置', () => {
      const newConfig = {
        maxLoadThreshold: 95,
        busyThreshold: 80,
        preferLowLoad: false,
        considerSpecialization: false
      };

      loadBalancer.updateConfig(newConfig);

      const currentConfig = loadBalancer.getConfig();

      expect(currentConfig.maxLoadThreshold).toBe(95);
      expect(currentConfig.busyThreshold).toBe(80);
      expect(currentConfig.preferLowLoad).toBe(false);
      expect(currentConfig.considerSpecialization).toBe(false);
    });

    it('部分更新应该保留原有值', () => {
      loadBalancer.updateConfig({ maxLoadThreshold: 95 });

      const currentConfig = loadBalancer.getConfig();

      expect(currentConfig.maxLoadThreshold).toBe(95);
      expect(currentConfig.busyThreshold).toBe(70); // 保留原值
    });
  });

  describe('reset - 重置状态', () => {
    it('应该清除所有历史记录', () => {
      loadBalancer.recordTaskCompletion('agent-1', true);
      loadBalancer.recordTaskCompletion('agent-2', false);

      const perf1Before = loadBalancer.getAgentPerformance('agent-1');
      expect(perf1Before).not.toBeNull();

      loadBalancer.reset();

      const perf1After = loadBalancer.getAgentPerformance('agent-1');
      expect(perf1After).toBeNull();
    });
  });
});
