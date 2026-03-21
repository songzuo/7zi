/**
 * Unit tests for Agent Registry
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  InMemoryAgentRegistry,
  FileAgentRegistry,
  getAgentRegistry,
  resetAgentRegistry,
} from '../agent-registry';
import { AgentRegistration } from '../types';

describe('InMemoryAgentRegistry', () => {
  let registry: InMemoryAgentRegistry;

  beforeEach(() => {
    registry = new InMemoryAgentRegistry(60000); // Disable auto-cleanup for tests
  });

  afterEach(() => {
    registry.destroy();
    resetAgentRegistry();
  });

  describe('register and get', () => {
    it('should register a new agent', () => {
      const agent: AgentRegistration = {
        id: 'agent-1',
        name: 'Test Agent',
        url: 'http://localhost:3000',
        capabilities: ['chat', 'analyze'],
        skills: ['conversation', 'analysis'],
        status: 'online',
        lastHeartbeat: new Date().toISOString(),
      };

      registry.register(agent);

      const retrieved = registry.get('agent-1');
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('Test Agent');
    });

    it('should auto-generate ID if not provided', () => {
      const agent: AgentRegistration = {
        name: 'Test Agent',
        url: 'http://localhost:3000',
        capabilities: ['chat'],
        skills: ['conversation'],
        status: 'online',
      };

      registry.register(agent);

      const agents = registry.getAll();
      expect(agents).toHaveLength(1);
      expect(agents[0].id).toBeDefined();
      expect(agents[0].id).toMatch(/^[0-9a-f-]{36}$/); // UUID format
    });

    it('should return undefined for non-existent agent', () => {
      const agent = registry.get('non-existent');
      expect(agent).toBeUndefined();
    });
  });

  describe('unregister', () => {
    it('should unregister an existing agent', () => {
      const agent: AgentRegistration = {
        id: 'agent-1',
        name: 'Test Agent',
        url: 'http://localhost:3000',
        capabilities: ['chat'],
        skills: ['conversation'],
        status: 'online',
      };

      registry.register(agent);
      expect(registry.get('agent-1')).toBeDefined();

      const unregistered = registry.unregister('agent-1');
      expect(unregistered).toBe(true);
      expect(registry.get('agent-1')).toBeUndefined();
    });

    it('should return false for non-existent agent', () => {
      const unregistered = registry.unregister('non-existent');
      expect(unregistered).toBe(false);
    });
  });

  describe('getAll', () => {
    it('should return all registered agents', () => {
      const agent1: AgentRegistration = {
        id: 'agent-1',
        name: 'Agent 1',
        url: 'http://localhost:3000',
        capabilities: ['chat'],
        skills: ['conversation'],
        status: 'online',
      };

      const agent2: AgentRegistration = {
        id: 'agent-2',
        name: 'Agent 2',
        url: 'http://localhost:3001',
        capabilities: ['analyze'],
        skills: ['analysis'],
        status: 'online',
      };

      registry.register(agent1);
      registry.register(agent2);

      const agents = registry.getAll();
      expect(agents).toHaveLength(2);
    });

    it('should return copies of agents', () => {
      const agent: AgentRegistration = {
        id: 'agent-1',
        name: 'Test Agent',
        url: 'http://localhost:3000',
        capabilities: ['chat'],
        skills: ['conversation'],
        status: 'online',
      };

      registry.register(agent);
      const retrieved1 = registry.get('agent-1');
      const retrieved2 = registry.get('agent-1');

      expect(retrieved1).not.toBe(retrieved2); // Different references
      expect(retrieved1).toEqual(retrieved2); // Same content
    });
  });

  describe('getByCapability', () => {
    it('should filter agents by capability', () => {
      const agent1: AgentRegistration = {
        id: 'agent-1',
        name: 'Agent 1',
        url: 'http://localhost:3000',
        capabilities: ['chat', 'streaming'],
        skills: ['conversation'],
        status: 'online',
      };

      const agent2: AgentRegistration = {
        id: 'agent-2',
        name: 'Agent 2',
        url: 'http://localhost:3001',
        capabilities: ['analyze'],
        skills: ['analysis'],
        status: 'online',
      };

      const agent3: AgentRegistration = {
        id: 'agent-3',
        name: 'Agent 3',
        url: 'http://localhost:3002',
        capabilities: ['chat'],
        skills: ['conversation'],
        status: 'online',
      };

      registry.register(agent1);
      registry.register(agent2);
      registry.register(agent3);

      const chatAgents = registry.getByCapability('chat');
      expect(chatAgents).toHaveLength(2);
      expect(chatAgents.every(a => a.capabilities.includes('chat'))).toBe(true);

      const streamingAgents = registry.getByCapability('streaming');
      expect(streamingAgents).toHaveLength(1);
    });
  });

  describe('getBySkill', () => {
    it('should filter agents by skill', () => {
      const agent1: AgentRegistration = {
        id: 'agent-1',
        name: 'Agent 1',
        url: 'http://localhost:3000',
        capabilities: ['chat'],
        skills: ['conversation', 'question-answering'],
        status: 'online',
      };

      const agent2: AgentRegistration = {
        id: 'agent-2',
        name: 'Agent 2',
        url: 'http://localhost:3001',
        capabilities: ['analyze'],
        skills: ['analysis'],
        status: 'online',
      };

      registry.register(agent1);
      registry.register(agent2);

      const qaAgents = registry.getBySkill('question-answering');
      expect(qaAgents).toHaveLength(1);
      expect(qaAgents[0].id).toBe('agent-1');
    });
  });

  describe('getAvailable', () => {
    it('should return only online agents', () => {
      const agent1: AgentRegistration = {
        id: 'agent-1',
        name: 'Agent 1',
        url: 'http://localhost:3000',
        capabilities: ['chat'],
        skills: ['conversation'],
        status: 'online',
      };

      const agent2: AgentRegistration = {
        id: 'agent-2',
        name: 'Agent 2',
        url: 'http://localhost:3001',
        capabilities: ['analyze'],
        skills: ['analysis'],
        status: 'offline',
      };

      const agent3: AgentRegistration = {
        id: 'agent-3',
        name: 'Agent 3',
        url: 'http://localhost:3002',
        capabilities: ['chat'],
        skills: ['conversation'],
        status: 'busy',
      };

      registry.register(agent1);
      registry.register(agent2);
      registry.register(agent3);

      const available = registry.getAvailable();
      expect(available).toHaveLength(1);
      expect(available[0].status).toBe('online');
    });
  });

  describe('updateStatus', () => {
    it('should update agent status', () => {
      const agent: AgentRegistration = {
        id: 'agent-1',
        name: 'Test Agent',
        url: 'http://localhost:3000',
        capabilities: ['chat'],
        skills: ['conversation'],
        status: 'online',
      };

      registry.register(agent);

      const updated = registry.updateStatus('agent-1', 'busy');
      expect(updated).toBe(true);

      const retrieved = registry.get('agent-1');
      expect(retrieved?.status).toBe('busy');
    });

    it('should return false for non-existent agent', () => {
      const updated = registry.updateStatus('non-existent', 'busy');
      expect(updated).toBe(false);
    });
  });

  describe('updateHeartbeat', () => {
    it('should update agent heartbeat', () => {
      const agent: AgentRegistration = {
        id: 'agent-1',
        name: 'Test Agent',
        url: 'http://localhost:3000',
        capabilities: ['chat'],
        skills: ['conversation'],
        status: 'online',
        lastHeartbeat: '2024-01-01T00:00:00.000Z',
      };

      registry.register(agent);

      const updated = registry.updateHeartbeat('agent-1');
      expect(updated).toBe(true);

      const retrieved = registry.get('agent-1');
      expect(retrieved?.lastHeartbeat).not.toBe('2024-01-01T00:00:00.000Z');
    });
  });

  describe('cleanupInactive', () => {
    it('should remove inactive agents', () => {
      const oldTime = new Date(Date.now() - 10 * 60 * 1000).toISOString(); // 10 minutes ago
      const recentTime = new Date(Date.now() - 1 * 60 * 1000).toISOString(); // 1 minute ago

      const agent1: AgentRegistration = {
        id: 'agent-1',
        name: 'Old Agent',
        url: 'http://localhost:3000',
        capabilities: ['chat'],
        skills: ['conversation'],
        status: 'online',
        lastHeartbeat: oldTime,
      };

      const agent2: AgentRegistration = {
        id: 'agent-2',
        name: 'New Agent',
        url: 'http://localhost:3001',
        capabilities: ['chat'],
        skills: ['conversation'],
        status: 'online',
        lastHeartbeat: recentTime,
      };

      registry.register(agent1);
      registry.register(agent2);

      const cleaned = registry.cleanupInactive(5 * 60 * 1000); // 5 minutes timeout
      expect(cleaned).toBe(1);

      expect(registry.get('agent-1')).toBeUndefined();
      expect(registry.get('agent-2')).toBeDefined();
    });
  });

  describe('findBestAgent', () => {
    it('should find the best agent based on capabilities', () => {
      const agent1: AgentRegistration = {
        id: 'agent-1',
        name: 'Agent 1',
        url: 'http://localhost:3000',
        capabilities: ['chat', 'streaming'],
        skills: ['conversation'],
        status: 'online',
        load: 0.8,
      };

      const agent2: AgentRegistration = {
        id: 'agent-2',
        name: 'Agent 2',
        url: 'http://localhost:3001',
        capabilities: ['chat', 'streaming'],
        skills: ['conversation'],
        status: 'online',
        load: 0.2,
      };

      const agent3: AgentRegistration = {
        id: 'agent-3',
        name: 'Agent 3',
        url: 'http://localhost:3002',
        capabilities: ['analyze'],
        skills: ['analysis'],
        status: 'online',
        load: 0.1,
      };

      registry.register(agent1);
      registry.register(agent2);
      registry.register(agent3);

      const best = registry.findBestAgent({
        capabilities: ['chat', 'streaming'],
      });

      expect(best?.id).toBe('agent-2'); // Lowest load
    });

    it('should return undefined if no matching agents', () => {
      const best = registry.findBestAgent({
        capabilities: ['non-existent'],
      });

      expect(best).toBeUndefined();
    });
  });

  describe('getStats', () => {
    it('should return accurate statistics', () => {
      const agent1: AgentRegistration = {
        id: 'agent-1',
        name: 'Agent 1',
        url: 'http://localhost:3000',
        capabilities: ['chat', 'streaming'],
        skills: ['conversation'],
        status: 'online',
      };

      const agent2: AgentRegistration = {
        id: 'agent-2',
        name: 'Agent 2',
        url: 'http://localhost:3001',
        capabilities: ['chat'],
        skills: ['conversation'],
        status: 'offline',
      };

      const agent3: AgentRegistration = {
        id: 'agent-3',
        name: 'Agent 3',
        url: 'http://localhost:3002',
        capabilities: ['analyze'],
        skills: ['analysis'],
        status: 'busy',
      };

      registry.register(agent1);
      registry.register(agent2);
      registry.register(agent3);

      const stats = registry.getStats();

      expect(stats.total).toBe(3);
      expect(stats.online).toBe(1);
      expect(stats.offline).toBe(1);
      expect(stats.busy).toBe(1);
      expect(stats.byCapability.get('chat')).toBe(2);
      expect(stats.byCapability.get('streaming')).toBe(1);
      expect(stats.byCapability.get('analyze')).toBe(1);
    });
  });
});

describe('Singleton Pattern', () => {
  afterEach(() => {
    resetAgentRegistry();
  });

  it('should return the same instance across calls', () => {
    const registry1 = getAgentRegistry();
    const registry2 = getAgentRegistry();

    expect(registry1).toBe(registry2);
  });

  it('should reset the instance', () => {
    const registry1 = getAgentRegistry();
    resetAgentRegistry();
    const registry2 = getAgentRegistry();

    expect(registry1).not.toBe(registry2);
  });
});
