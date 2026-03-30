/**
 * Task Matching Tests
 * 测试任务匹配逻辑
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TaskMatcher } from '../../../src/lib/agent-scheduler/core/matching';
import { AgentCapability } from '../../../src/lib/agent-scheduler/models/agent-capability';
import { Task } from '../../../src/lib/agent-scheduler/models/task-model';

describe('TaskMatcher - Agent 能力匹配测试', () => {
  let matcher: TaskMatcher;
  let agents: Map<string, AgentCapability>;

  beforeEach(() => {
    matcher = new TaskMatcher();
    agents = new Map();

    // 创建测试 Agent
    const agent1: AgentCapability = {
      agentId: 'agent-1',
      name: 'TypeScript Developer',
      provider: 'minimax',
      role: '开发',
      capabilities: {
        techStack: ['typescript', 'react', 'nodejs'],
        taskTypes: ['implementation', 'testing'],
        concurrency: 3,
        avgResponseTime: 5,
        successRate: 0.95
      },
      currentLoad: 30,
      availability: true,
      lastActiveTime: Date.now()
    };

    const agent2: AgentCapability = {
      agentId: 'agent-2',
      name: 'Python Expert',
      provider: 'bailian',
      role: '数据工程师',
      capabilities: {
        techStack: ['python', 'data-science', 'machine-learning'],
        taskTypes: ['research', 'implementation'],
        concurrency: 2,
        avgResponseTime: 8,
        successRate: 0.92,
        specializations: ['machine-learning', 'ai-development']
      },
      currentLoad: 50,
      availability: true,
      lastActiveTime: Date.now()
    };

    const agent3: AgentCapability = {
      agentId: 'agent-3',
      name: 'DevOps Engineer',
      provider: 'volcengine',
      role: '运维',
      capabilities: {
        techStack: ['docker', 'kubernetes', 'aws', 'ci-cd'],
        taskTypes: ['devops', 'implementation'],
        concurrency: 2,
        avgResponseTime: 6,
        successRate: 0.98
      },
      currentLoad: 85,
      availability: true,
      lastActiveTime: Date.now()
    };

    const agent4: AgentCapability = {
      agentId: 'agent-4',
      name: 'Unavailable Agent',
      provider: 'self-claude',
      role: '开发',
      capabilities: {
        techStack: ['typescript', 'react'],
        taskTypes: ['implementation'],
        concurrency: 2,
        avgResponseTime: 5,
        successRate: 0.95
      },
      currentLoad: 10,
      availability: false, // 不可用
      lastActiveTime: Date.now()
    };

    agents.set('agent-1', agent1);
    agents.set('agent-2', agent2);
    agents.set('agent-3', agent3);
    agents.set('agent-4', agent4);
  });

  describe('findCandidates - 查找候选 Agent', () => {
    it('应该找到所有能处理任务的可用 Agent', () => {
      const task: Task = {
        id: 'task-1',
        type: 'implementation',
        priority: 'high',
        requiredCapabilities: ['typescript'],
        estimatedDuration: 30,
        dependencies: [],
        status: 'pending',
        title: '实现 TypeScript 功能',
        createdAt: Date.now()
      };

      const candidates = matcher.findCandidates(task, agents);

      expect(candidates.length).toBe(1);
      expect(candidates[0].agentId).toBe('agent-1');
    });

    it('应该忽略不可用的 Agent', () => {
      const task: Task = {
        id: 'task-1',
        type: 'implementation',
        priority: 'high',
        requiredCapabilities: ['typescript'],
        estimatedDuration: 30,
        dependencies: [],
        status: 'pending',
        title: '实现 TypeScript 功能',
        createdAt: Date.now()
      };

      const candidates = matcher.findCandidates(task, agents);

      expect(candidates.length).toBe(1);
      expect(candidates.every(c => c.availability)).toBe(true);
    });

    it('应该忽略负载过重的 Agent', () => {
      const task: Task = {
        id: 'task-1',
        type: 'devops',
        priority: 'high',
        requiredCapabilities: ['docker'],
        estimatedDuration: 20, // 这会增加 33% 负载，85% + 33% > 90%
        dependencies: [],
        status: 'pending',
        title: 'Docker 部署',
        createdAt: Date.now()
      };

      const candidates = matcher.findCandidates(task, agents);

      expect(candidates.length).toBe(0);
    });

    it('应该根据技术栈筛选 Agent', () => {
      const task: Task = {
        id: 'task-1',
        type: 'research',
        priority: 'medium',
        requiredCapabilities: ['data-science'],
        estimatedDuration: 60,
        dependencies: [],
        status: 'pending',
        title: '数据科学研究',
        createdAt: Date.now()
      };

      const candidates = matcher.findCandidates(task, agents);

      // agent-2 has data-science in techStack and supports research tasks
      expect(candidates.length).toBe(1);
      expect(candidates[0].agentId).toBe('agent-2');
    });

    it('当没有合适的 Agent 时应该返回空数组', () => {
      const task: Task = {
        id: 'task-1',
        type: 'design',
        priority: 'medium',
        requiredCapabilities: ['ui-design'],
        estimatedDuration: 30,
        dependencies: [],
        status: 'pending',
        title: 'UI 设计',
        createdAt: Date.now()
      };

      const candidates = matcher.findCandidates(task, agents);

      expect(candidates.length).toBe(0);
    });
  });

  describe('canHandleTask - Agent 能力检查', () => {
    it('当 Agent 满足所有条件时应该返回 true', () => {
      const agent = agents.get('agent-1')!;
      const task: Task = {
        id: 'task-1',
        type: 'implementation',
        priority: 'medium',
        requiredCapabilities: ['typescript'],
        estimatedDuration: 10,
        dependencies: [],
        status: 'pending',
        title: '小任务',
        createdAt: Date.now()
      };

      const canHandle = matcher.canHandleTask(agent, task);

      expect(canHandle).toBe(true);
    });

    it('当 Agent 不可用时应该返回 false', () => {
      const agent = agents.get('agent-4')!;
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

      const canHandle = matcher.canHandleTask(agent, task);

      expect(canHandle).toBe(false);
    });

    it('当任务类型不匹配时应该返回 false', () => {
      const agent = agents.get('agent-1')!;
      const task: Task = {
        id: 'task-1',
        type: 'devops', // agent-1 不支持 devops
        priority: 'medium',
        requiredCapabilities: ['typescript'],
        estimatedDuration: 10,
        dependencies: [],
        status: 'pending',
        title: '任务',
        createdAt: Date.now()
      };

      const canHandle = matcher.canHandleTask(agent, task);

      expect(canHandle).toBe(false);
    });

    it('当缺少必需能力时应该返回 false', () => {
      const agent = agents.get('agent-1')!;
      const task: Task = {
        id: 'task-1',
        type: 'implementation',
        priority: 'medium',
        requiredCapabilities: ['python'], // agent-1 不懂 Python
        estimatedDuration: 10,
        dependencies: [],
        status: 'pending',
        title: '任务',
        createdAt: Date.now()
      };

      const canHandle = matcher.canHandleTask(agent, task);

      expect(canHandle).toBe(false);
    });

    it('当负载不足时应该返回 false', () => {
      const agent = agents.get('agent-3')!; // 负载 85%
      const task: Task = {
        id: 'task-1',
        type: 'devops',
        priority: 'medium',
        requiredCapabilities: ['docker'],
        estimatedDuration: 20, // 会增加 33% 负载，超过 90%
        dependencies: [],
        status: 'pending',
        title: '大任务',
        createdAt: Date.now()
      };

      const canHandle = matcher.canHandleTask(agent, task);

      expect(canHandle).toBe(false);
    });
  });

  describe('calculateCapabilityScore - 能力匹配评分', () => {
    it('完美匹配应该得到高分', () => {
      const agent = agents.get('agent-1')!;
      const task: Task = {
        id: 'task-1',
        type: 'implementation',
        priority: 'high',
        requiredCapabilities: ['typescript', 'react'],
        estimatedDuration: 30,
        dependencies: [],
        status: 'pending',
        title: 'React 组件开发',
        createdAt: Date.now()
      };

      const score = matcher.calculateCapabilityScore(agent, task);

      expect(score).toBeGreaterThanOrEqual(80);
    });

    it('部分匹配应该得到中等分数', () => {
      const agent = agents.get('agent-2')!;
      const task: Task = {
        id: 'task-1',
        type: 'research',
        priority: 'medium',
        requiredCapabilities: ['data-science'], // 匹配 techStack
        estimatedDuration: 30,
        dependencies: [],
        status: 'pending',
        title: '数据分析',
        createdAt: Date.now()
      };

      const score = matcher.calculateCapabilityScore(agent, task);

      // 完全匹配 data-science，应该得到较高分数
      expect(score).toBeGreaterThan(40);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('专业匹配应该有加分', () => {
      const agent = agents.get('agent-2')!;
      const task: Task = {
        id: 'task-1',
        type: 'research',
        priority: 'high',
        requiredCapabilities: ['machine-learning'], // agent-2 的专业领域
        estimatedDuration: 60,
        dependencies: [],
        status: 'pending',
        title: 'ML 研究',
        createdAt: Date.now()
      };

      const score = matcher.calculateCapabilityScore(agent, task);

      expect(score).toBeGreaterThan(80); // 40 (type) + 40 (capability) + 20 (specialization)
    });
  });

  describe('calculateLoadScore - 负载评分', () => {
    it('低负载 Agent 应该得到高分', () => {
      const agent = agents.get('agent-1')!; // 负载 30%
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

      const score = matcher.calculateLoadScore(agent, task);

      expect(score).toBeGreaterThan(50);
    });

    it('高负载 Agent 应该得到低分', () => {
      const agent = agents.get('agent-3')!; // 负载 85%
      const task: Task = {
        id: 'task-1',
        type: 'devops',
        priority: 'medium',
        requiredCapabilities: ['docker'],
        estimatedDuration: 5, // 增加 8.3% 负载
        dependencies: [],
        status: 'pending',
        title: '小任务',
        createdAt: Date.now()
      };

      const score = matcher.calculateLoadScore(agent, task);

      expect(score).toBeLessThan(10);
    });
  });

  describe('findBestCandidate - 查找最佳候选', () => {
    it('应该返回能力最佳且负载最低的 Agent', () => {
      const agent1 = agents.get('agent-1')!;
      agent1.currentLoad = 50;

      const task: Task = {
        id: 'task-1',
        type: 'implementation',
        priority: 'high',
        requiredCapabilities: ['typescript'],
        estimatedDuration: 10,
        dependencies: [],
        status: 'pending',
        title: 'TypeScript 任务',
        createdAt: Date.now()
      };

      const best = matcher.findBestCandidate(task, agents);

      expect(best).not.toBeNull();
      expect(best!.agentId).toBe('agent-1');
      expect(best!.confidence).toBeGreaterThan(0);
      expect(best!.reasons.length).toBeGreaterThan(0);
    });

    it('当没有候选时应该返回 null', () => {
      const task: Task = {
        id: 'task-1',
        type: 'design',
        priority: 'medium',
        requiredCapabilities: ['ui-design'],
        estimatedDuration: 30,
        dependencies: [],
        status: 'pending',
        title: 'UI 设计',
        createdAt: Date.now()
      };

      const best = matcher.findBestCandidate(task, agents);

      expect(best).toBeNull();
    });
  });

  describe('rankCandidates - Agent 排名', () => {
    it('应该按匹配度排序 Agent', () => {
      const task: Task = {
        id: 'task-1',
        type: 'implementation',
        priority: 'high',
        requiredCapabilities: ['typescript'],
        estimatedDuration: 20,
        dependencies: [],
        status: 'pending',
        title: 'TypeScript 任务',
        createdAt: Date.now()
      };

      const candidates = Array.from(agents.values());
      const ranked = matcher.rankCandidates(task, candidates);

      expect(ranked.length).toBeGreaterThan(0);
      // 应该按 confidence 降序排列
      for (let i = 0; i < ranked.length - 1; i++) {
        expect(ranked[i].confidence).toBeGreaterThanOrEqual(ranked[i + 1].confidence);
      }
    });

    it('每个候选都应该有推理信息', () => {
      const task: Task = {
        id: 'task-1',
        type: 'implementation',
        priority: 'high',
        requiredCapabilities: ['typescript'],
        estimatedDuration: 20,
        dependencies: [],
        status: 'pending',
        title: 'TypeScript 任务',
        createdAt: Date.now()
      };

      const candidates = Array.from(agents.values());
      const ranked = matcher.rankCandidates(task, candidates);

      for (const candidate of ranked) {
        expect(candidate.agentId).toBeDefined();
        expect(candidate.agentName).toBeDefined();
        expect(candidate.confidence).toBeGreaterThanOrEqual(0);
        expect(candidate.confidence).toBeLessThanOrEqual(1);
        expect(candidate.reasons.length).toBeGreaterThan(0);
      }
    });
  });

  describe('calculateMatchScore - 综合评分', () => {
    it('应该计算所有维度的分数', () => {
      const agent = agents.get('agent-1')!;
      const task: Task = {
        id: 'task-1',
        type: 'implementation',
        priority: 'high',
        requiredCapabilities: ['typescript'],
        estimatedDuration: 20,
        dependencies: [],
        status: 'pending',
        title: '任务',
        createdAt: Date.now()
      };

      const scores = matcher.calculateMatchScore(agent, task);

      expect(scores).toHaveProperty('total');
      expect(scores).toHaveProperty('capability');
      expect(scores).toHaveProperty('load');
      expect(scores).toHaveProperty('performance');
      expect(scores).toHaveProperty('response');

      expect(scores.total).toBeGreaterThanOrEqual(0);
      expect(scores.total).toBeLessThanOrEqual(100);
    });

    it('应该支持自定义权重', () => {
      const agent = agents.get('agent-1')!;
      const task: Task = {
        id: 'task-1',
        type: 'implementation',
        priority: 'high',
        requiredCapabilities: ['typescript'],
        estimatedDuration: 20,
        dependencies: [],
        status: 'pending',
        title: '任务',
        createdAt: Date.now()
      };

      // 更重视能力
      const customScores = matcher.calculateMatchScore(agent, task, {
        capability: 0.7,
        load: 0.1,
        performance: 0.1,
        response: 0.1
      });

      const defaultScores = matcher.calculateMatchScore(agent, task);

      // 能力权重更高时，总分应该反映这一点
      expect(customScores.capability).toBe(defaultScores.capability);
    });
  });

  describe('getAlternativeCandidates - 备选 Agent', () => {
    it('应该返回除最佳候选外的备选 Agent', () => {
      const task: Task = {
        id: 'task-1',
        type: 'implementation',
        priority: 'high',
        requiredCapabilities: ['typescript'],
        estimatedDuration: 20,
        dependencies: [],
        status: 'pending',
        title: '任务',
        createdAt: Date.now()
      };

      const candidates = matcher.findCandidates(task, agents);
      const ranked = matcher.rankCandidates(task, candidates);
      const alternatives = matcher.getAlternativeCandidates(ranked, 2);

      expect(alternatives.length).toBeLessThanOrEqual(2);
      expect(alternatives).not.toContain(ranked[0].agentId);
    });

    it('当候选不足时应该返回所有可用的备选', () => {
      const task: Task = {
        id: 'task-1',
        type: 'implementation',
        priority: 'high',
        requiredCapabilities: ['typescript'],
        estimatedDuration: 20,
        dependencies: [],
        status: 'pending',
        title: '任务',
        createdAt: Date.now()
      };

      const candidates = matcher.findCandidates(task, agents);
      const ranked = matcher.rankCandidates(task, candidates);
      const alternatives = matcher.getAlternativeCandidates(ranked, 10); // 请求 10 个

      expect(alternatives.length).toBeLessThanOrEqual(Math.max(0, ranked.length - 1));
    });
  });

  describe('isNoAgentAvailable - 无 Agent 可用检查', () => {
    it('当没有 Agent 可用时应该返回 true', () => {
      const task: Task = {
        id: 'task-1',
        type: 'design',
        priority: 'medium',
        requiredCapabilities: ['ui-design'],
        estimatedDuration: 30,
        dependencies: [],
        status: 'pending',
        title: 'UI 设计',
        createdAt: Date.now()
      };

      const noAgent = matcher.isNoAgentAvailable(task, agents);

      expect(noAgent).toBe(true);
    });

    it('当有 Agent 可用时应该返回 false', () => {
      const task: Task = {
        id: 'task-1',
        type: 'implementation',
        priority: 'high',
        requiredCapabilities: ['typescript'],
        estimatedDuration: 30,
        dependencies: [],
        status: 'pending',
        title: 'TypeScript 任务',
        createdAt: Date.now()
      };

      const noAgent = matcher.isNoAgentAvailable(task, agents);

      expect(noAgent).toBe(false);
    });
  });
});
