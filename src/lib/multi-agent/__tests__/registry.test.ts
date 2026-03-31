/**
 * Agent 注册表测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AgentRegistry } from '../registry';
import type { AgentInfo, AgentCapability } from '../types';

describe('AgentRegistry', () => {
  let registry: AgentRegistry;

  beforeEach(() => {
    registry = new AgentRegistry({
      heartbeatInterval: 1000,
      heartbeatTimeout: 3000,
      cleanupInterval: 60000,
    });
  });

  afterEach(async () => {
    await registry.close();
  });

  describe('Agent 注册', () => {
    it('应该成功注册 Agent', async () => {
      const agent: AgentInfo = {
        id: 'agent-1',
        name: 'Test Agent',
        type: 'llm',
        capabilities: [
          {
            id: 'capability-1',
            name: 'Test Capability',
            description: 'A test capability',
            category: 'test',
            version: '1.0.0',
          },
        ],
        status: 'online',
        lastSeen: Date.now(),
        metadata: {},
      };

      await expect(registry.register(agent)).resolves.not.toThrow();

      const retrieved = registry.getAgent('agent-1');
      expect(retrieved).toEqual(agent);
    });

    it('应该拒绝无效的 Agent 信息', async () => {
      const invalidAgent = {
        id: '', // 无效的 ID
        name: 'Test Agent',
        type: 'llm' as const,
        capabilities: [],
        status: 'online' as const,
        lastSeen: Date.now(),
        metadata: {},
      };

      await expect(registry.register(invalidAgent)).rejects.toThrow('Invalid agent info');
    });

    it('应该更新已存在的 Agent', async () => {
      const agent: AgentInfo = {
        id: 'agent-1',
        name: 'Test Agent',
        type: 'llm',
        capabilities: [],
        status: 'online',
        lastSeen: Date.now(),
        metadata: {},
      };

      await registry.register(agent);

      // 更新状态
      const updated: AgentInfo = {
        ...agent,
        status: 'busy',
        lastSeen: Date.now(),
      };

      await registry.register(updated);

      const retrieved = registry.getAgent('agent-1');
      expect(retrieved?.status).toBe('busy');
    });
  });

  describe('Agent 注销', () => {
    it('应该成功注销 Agent', async () => {
      const agent: AgentInfo = {
        id: 'agent-1',
        name: 'Test Agent',
        type: 'llm',
        capabilities: [],
        status: 'online',
        lastSeen: Date.now(),
        metadata: {},
      };

      await registry.register(agent);
      await registry.unregister('agent-1');

      const retrieved = registry.getAgent('agent-1');
      expect(retrieved).toBeUndefined();
    });

    it('应该拒绝注销不存在的 Agent', async () => {
      await expect(registry.unregister('non-existent')).rejects.toThrow('not found');
    });
  });

  describe('心跳机制', () => {
    it('应该成功更新心跳', async () => {
      const agent: AgentInfo = {
        id: 'agent-1',
        name: 'Test Agent',
        type: 'llm',
        capabilities: [],
        status: 'online',
        lastSeen: Date.now(),
        metadata: {},
      };

      await registry.register(agent);

      await expect(registry.heartbeat('agent-1')).resolves.not.toThrow();

      const retrieved = registry.getAgent('agent-1');
      expect(retrieved?.lastSeen).toBeGreaterThan(agent.lastSeen);
    });

    it('应该拒绝不存在的 Agent 的心跳', async () => {
      await expect(registry.heartbeat('non-existent')).rejects.toThrow('not found');
    });
  });

  describe('能力查找', () => {
    it('应该根据能力查找 Agent', async () => {
      const capability: AgentCapability = {
        id: 'code-generation',
        name: 'Code Generation',
        description: 'Generate code',
        category: 'coding',
        version: '1.0.0',
      };

      const agent1: AgentInfo = {
        id: 'agent-1',
        name: 'Coder Agent',
        type: 'llm',
        capabilities: [capability],
        status: 'online',
        lastSeen: Date.now(),
        metadata: {},
      };

      const agent2: AgentInfo = {
        id: 'agent-2',
        name: 'Chat Agent',
        type: 'llm',
        capabilities: [],
        status: 'online',
        lastSeen: Date.now(),
        metadata: {},
      };

      await registry.register(agent1);
      await registry.register(agent2);

      const agents = registry.findAgentsByCapability('code-generation');

      expect(agents).toHaveLength(1);
      expect(agents[0].id).toBe('agent-1');
    });

    it('应该根据多个能力查找 Agent（AND 逻辑）', async () => {
      const capabilities: AgentCapability[] = [
        {
          id: 'code-generation',
          name: 'Code Generation',
          description: 'Generate code',
          category: 'coding',
          version: '1.0.0',
        },
        {
          id: 'testing',
          name: 'Testing',
          description: 'Test code',
          category: 'testing',
          version: '1.0.0',
        },
      ];

      const agent1: AgentInfo = {
        id: 'agent-1',
        name: 'Full Stack Agent',
        type: 'llm',
        capabilities: capabilities,
        status: 'online',
        lastSeen: Date.now(),
        metadata: {},
      };

      const agent2: AgentInfo = {
        id: 'agent-2',
        name: 'Coder Agent',
        type: 'llm',
        capabilities: [capabilities[0]],
        status: 'online',
        lastSeen: Date.now(),
        metadata: {},
      };

      await registry.register(agent1);
      await registry.register(agent2);

      const agents = registry.findAgentsByCapabilities([
        'code-generation',
        'testing',
      ]);

      expect(agents).toHaveLength(1);
      expect(agents[0].id).toBe('agent-1');
    });

    it('应该找到最佳 Agent（在线且具备所需能力）', async () => {
      const capabilities: AgentCapability[] = [
        {
          id: 'code-generation',
          name: 'Code Generation',
          description: 'Generate code',
          category: 'coding',
          version: '1.0.0',
        },
      ];

      const agent1: AgentInfo = {
        id: 'agent-1',
        name: 'Online Coder',
        type: 'llm',
        capabilities: capabilities,
        status: 'online',
        lastSeen: Date.now(),
        metadata: {},
      };

      const agent2: AgentInfo = {
        id: 'agent-2',
        name: 'Offline Coder',
        type: 'llm',
        capabilities: capabilities,
        status: 'offline',
        lastSeen: Date.now(),
        metadata: {},
      };

      await registry.register(agent1);
      await registry.register(agent2);

      const bestAgent = registry.findBestAgent(['code-generation']);

      expect(bestAgent).not.toBeNull();
      expect(bestAgent?.id).toBe('agent-1');
      expect(bestAgent?.status).toBe('online');
    });
  });

  describe('状态查询', () => {
    it('应该获取在线 Agent', async () => {
      const agents: AgentInfo[] = [
        {
          id: 'agent-1',
          name: 'Online 1',
          type: 'llm',
          capabilities: [],
          status: 'online',
          lastSeen: Date.now(),
          metadata: {},
        },
        {
          id: 'agent-2',
          name: 'Online 2',
          type: 'llm',
          capabilities: [],
          status: 'online',
          lastSeen: Date.now(),
          metadata: {},
        },
        {
          id: 'agent-3',
          name: 'Offline',
          type: 'llm',
          capabilities: [],
          status: 'offline',
          lastSeen: Date.now(),
          metadata: {},
        },
      ];

      for (const agent of agents) {
        await registry.register(agent);
      }

      const onlineAgents = registry.getOnlineAgents();

      expect(onlineAgents).toHaveLength(2);
      expect(onlineAgents.every(a => a.status === 'online')).toBe(true);
    });

    it('应该获取所有 Agent', async () => {
      const agents: AgentInfo[] = [
        {
          id: 'agent-1',
          name: 'Agent 1',
          type: 'llm',
          capabilities: [],
          status: 'online',
          lastSeen: Date.now(),
          metadata: {},
        },
        {
          id: 'agent-2',
          name: 'Agent 2',
          type: 'llm',
          capabilities: [],
          status: 'offline',
          lastSeen: Date.now(),
          metadata: {},
        },
      ];

      for (const agent of agents) {
        await registry.register(agent);
      }

      const allAgents = registry.getAllAgents();

      expect(allAgents).toHaveLength(2);
    });
  });

  describe('搜索功能', () => {
    it('应该按类型搜索 Agent', async () => {
      const agents: AgentInfo[] = [
        {
          id: 'agent-1',
          name: 'LLM Agent',
          type: 'llm',
          capabilities: [],
          status: 'online',
          lastSeen: Date.now(),
          metadata: {},
        },
        {
          id: 'agent-2',
          name: 'Tool Agent',
          type: 'tool',
          capabilities: [],
          status: 'online',
          lastSeen: Date.now(),
          metadata: {},
        },
      ];

      for (const agent of agents) {
        await registry.register(agent);
      }

      const llmAgents = registry.searchAgents({ type: 'llm' });

      expect(llmAgents).toHaveLength(1);
      expect(llmAgents[0].type).toBe('llm');
    });

    it('应该按关键词搜索 Agent', async () => {
      const agents: AgentInfo[] = [
        {
          id: 'agent-1',
          name: 'Code Generator',
          type: 'llm',
          capabilities: [],
          status: 'online',
          lastSeen: Date.now(),
          metadata: {},
        },
        {
          id: 'agent-2',
          name: 'Chat Bot',
          type: 'llm',
          capabilities: [],
          status: 'online',
          lastSeen: Date.now(),
          metadata: {},
        },
      ];

      for (const agent of agents) {
        await registry.register(agent);
      }

      const results = registry.searchAgents({ keyword: 'code' });

      expect(results).toHaveLength(1);
      expect(results[0].name.toLowerCase()).toContain('code');
    });
  });

  describe('统计信息', () => {
    it('应该返回正确的统计信息', async () => {
      const agents: AgentInfo[] = [
        {
          id: 'agent-1',
          name: 'Online Agent',
          type: 'llm',
          capabilities: [
            { id: 'cap-1', name: 'Cap 1', description: '', category: '', version: '1.0.0' },
          ],
          status: 'online',
          lastSeen: Date.now(),
          metadata: {},
        },
        {
          id: 'agent-2',
          name: 'Busy Agent',
          type: 'llm',
          capabilities: [
            { id: 'cap-2', name: 'Cap 2', description: '', category: '', version: '1.0.0' },
          ],
          status: 'busy',
          lastSeen: Date.now(),
          metadata: {},
        },
      ];

      for (const agent of agents) {
        await registry.register(agent);
      }

      const stats = registry.getStats();

      expect(stats.total).toBe(2);
      expect(stats.online).toBe(1);
      expect(stats.busy).toBe(1);
      expect(stats.capabilities).toBe(2);
    });
  });

  describe('状态更新', () => {
    it('应该成功更新 Agent 状态', async () => {
      const agent: AgentInfo = {
        id: 'agent-1',
        name: 'Test Agent',
        type: 'llm',
        capabilities: [],
        status: 'online',
        lastSeen: Date.now(),
        metadata: {},
      };

      await registry.register(agent);
      await registry.updateStatus('agent-1', 'busy');

      const retrieved = registry.getAgent('agent-1');
      expect(retrieved?.status).toBe('busy');
    });
  });

  describe('事件系统', () => {
    it('应该在注册时发出事件', async () => {
      const eventSpy = vi.fn();
      registry.on('register', eventSpy);

      const agent: AgentInfo = {
        id: 'agent-1',
        name: 'Test Agent',
        type: 'llm',
        capabilities: [],
        status: 'online',
        lastSeen: Date.now(),
        metadata: {},
      };

      await registry.register(agent);

      expect(eventSpy).toHaveBeenCalled();
      expect(eventSpy.mock.calls[0][0]).toMatchObject({
        type: 'register',
        agentId: 'agent-1',
      });
    });

    it('应该在状态变化时发出事件', async () => {
      const eventSpy = vi.fn();
      registry.on('status_change', eventSpy);

      const agent: AgentInfo = {
        id: 'agent-1',
        name: 'Test Agent',
        type: 'llm',
        capabilities: [],
        status: 'online',
        lastSeen: Date.now(),
        metadata: {},
      };

      await registry.register(agent);
      await registry.updateStatus('agent-1', 'busy');

      expect(eventSpy).toHaveBeenCalled();
      expect(eventSpy.mock.calls[0][0]).toMatchObject({
        type: 'status_change',
        agentId: 'agent-1',
        data: { oldStatus: 'online', newStatus: 'busy' },
      });
    });
  });
});
