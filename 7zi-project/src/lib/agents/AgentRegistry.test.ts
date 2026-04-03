/**
 * AgentRegistry Tests
 */

import { AgentRegistry, Agent, AgentFilter } from './AgentRegistry';

describe('AgentRegistry', () => {
  let registry: AgentRegistry;

  beforeEach(() => {
    registry = new AgentRegistry();
  });

  afterEach(() => {
    registry.clear();
  });

  describe('注册和注销', () => {
    test('should register an agent', () => {
      const agent: Agent = {
        id: 'agent-1',
        name: 'Test Agent',
        capabilities: ['chat', 'code'],
        status: 'online',
        currentLoad: 0.5,
      };

      registry.register(agent);

      expect(registry.get('agent-1')).toEqual(agent);
    });

    test('should emit agent:registered event', (done) => {
      const agent: Agent = {
        id: 'agent-1',
        name: 'Test Agent',
        capabilities: ['chat'],
        status: 'online',
        currentLoad: 0,
      };

      registry.on('agent:registered', (registeredAgent: Agent) => {
        expect(registeredAgent).toEqual(agent);
        done();
      });

      registry.register(agent);
    });

    test('should unregister an agent', () => {
      const agent: Agent = {
        id: 'agent-1',
        name: 'Test Agent',
        capabilities: ['chat'],
        status: 'online',
        currentLoad: 0,
      };

      registry.register(agent);
      expect(registry.get('agent-1')).toBeDefined();

      const result = registry.unregister('agent-1');

      expect(result).toBe(true);
      expect(registry.get('agent-1')).toBeUndefined();
    });

    test('should emit agent:unregistered event', (done) => {
      const agent: Agent = {
        id: 'agent-1',
        name: 'Test Agent',
        capabilities: ['chat'],
        status: 'online',
        currentLoad: 0,
      };

      registry.register(agent);

      registry.on('agent:unregistered', (unregisteredAgent: Agent) => {
        expect(unregisteredAgent).toEqual(agent);
        done();
      });

      registry.unregister('agent-1');
    });

    test('should return false when unregistering non-existent agent', () => {
      const result = registry.unregister('non-existent');
      expect(result).toBe(false);
    });

    test('should replace agent when registering with same id', () => {
      const agent1: Agent = {
        id: 'agent-1',
        name: 'Agent 1',
        capabilities: ['chat'],
        status: 'online',
        currentLoad: 0,
      };

      const agent2: Agent = {
        id: 'agent-1',
        name: 'Agent 2',
        capabilities: ['code'],
        status: 'busy',
        currentLoad: 0.8,
      };

      registry.register(agent1);
      registry.register(agent2);

      expect(registry.get('agent-1')).toEqual(agent2);
    });
  });

  describe('查询', () => {
    beforeEach(() => {
      registry.register({
        id: 'agent-1',
        name: 'Chat Agent',
        capabilities: ['chat', 'translate'],
        status: 'online',
        currentLoad: 0.2,
      });

      registry.register({
        id: 'agent-2',
        name: 'Code Agent',
        capabilities: ['code', 'debug'],
        status: 'online',
        currentLoad: 0.6,
      });

      registry.register({
        id: 'agent-3',
        name: 'Busy Agent',
        capabilities: ['chat', 'code'],
        status: 'busy',
        currentLoad: 0.9,
      });

      registry.register({
        id: 'agent-4',
        name: 'Offline Agent',
        capabilities: ['chat'],
        status: 'offline',
        currentLoad: 0,
      });
    });

    test('should get agent by id', () => {
      const agent = registry.get('agent-1');
      expect(agent).toBeDefined();
      expect(agent?.id).toBe('agent-1');
    });

    test('should return undefined for non-existent agent', () => {
      const agent = registry.get('non-existent');
      expect(agent).toBeUndefined();
    });

    test('should get all agents', () => {
      const allAgents = registry.getAll();
      expect(allAgents.length).toBe(4);
    });

    test('should filter by status', () => {
      const onlineAgents = registry.filter({ status: 'online' });
      expect(onlineAgents.length).toBe(2);
      expect(onlineAgents.every((a) => a.status === 'online')).toBe(true);
    });

    test('should filter by max load', () => {
      const lowLoadAgents = registry.filter({ maxLoad: 0.5 });
      // agent-1 load=0.2, agent-4 load=0
      expect(lowLoadAgents.length).toBe(2);
      expect(lowLoadAgents.every((a) => a.currentLoad <= 0.5)).toBe(true);
    });

    test('should filter by capabilities (single)', () => {
      const chatAgents = registry.filter({ capabilities: ['chat'] });
      expect(chatAgents.length).toBe(3);
    });

    test('should filter by capabilities (multiple)', () => {
      const multiCapAgents = registry.filter({
        capabilities: ['chat', 'code'],
      });
      expect(multiCapAgents.length).toBe(1);
      expect(multiCapAgents[0].id).toBe('agent-3');
    });

    test('should filter by multiple criteria', () => {
      const agents = registry.filter({
        status: 'online',
        maxLoad: 0.7,
        capabilities: ['code'],
      });
      expect(agents.length).toBe(1);
      expect(agents[0].id).toBe('agent-2');
    });

    test('should return all agents when no filter provided', () => {
      const agents = registry.filter({});
      expect(agents.length).toBe(4);
    });

    test('should get online count', () => {
      expect(registry.getOnlineCount()).toBe(2);
    });
  });

  describe('状态更新', () => {
    test('should update agent status', () => {
      const agent: Agent = {
        id: 'agent-1',
        name: 'Test Agent',
        capabilities: ['chat'],
        status: 'online',
        currentLoad: 0,
      };

      registry.register(agent);

      const result = registry.updateStatus('agent-1', 'busy');

      expect(result).toBe(true);
      expect(registry.get('agent-1')?.status).toBe('busy');
    });

    test('should emit agent:status:changed event', (done) => {
      const agent: Agent = {
        id: 'agent-1',
        name: 'Test Agent',
        capabilities: ['chat'],
        status: 'online',
        currentLoad: 0,
      };

      registry.register(agent);

      registry.on('agent:status:changed', (updatedAgent: Agent, oldStatus: string) => {
        expect(updatedAgent.id).toBe('agent-1');
        expect(updatedAgent.status).toBe('busy');
        expect(oldStatus).toBe('online');
        done();
      });

      registry.updateStatus('agent-1', 'busy');
    });

    test('should return false when updating status of non-existent agent', () => {
      const result = registry.updateStatus('non-existent', 'busy');
      expect(result).toBe(false);
    });

    test('should update agent load', () => {
      const agent: Agent = {
        id: 'agent-1',
        name: 'Test Agent',
        capabilities: ['chat'],
        status: 'online',
        currentLoad: 0.3,
      };

      registry.register(agent);

      const result = registry.updateLoad('agent-1', 0.8);

      expect(result).toBe(true);
      expect(registry.get('agent-1')?.currentLoad).toBe(0.8);
    });

    test('should clamp load to [0, 1]', () => {
      const agent: Agent = {
        id: 'agent-1',
        name: 'Test Agent',
        capabilities: ['chat'],
        status: 'online',
        currentLoad: 0.5,
      };

      registry.register(agent);

      registry.updateLoad('agent-1', 1.5);
      expect(registry.get('agent-1')?.currentLoad).toBe(1);

      registry.updateLoad('agent-1', -0.5);
      expect(registry.get('agent-1')?.currentLoad).toBe(0);
    });

    test('should emit agent:load:changed event', (done) => {
      const agent: Agent = {
        id: 'agent-1',
        name: 'Test Agent',
        capabilities: ['chat'],
        status: 'online',
        currentLoad: 0.3,
      };

      registry.register(agent);

      registry.on('agent:load:changed', (updatedAgent: Agent, oldLoad: number) => {
        expect(updatedAgent.id).toBe('agent-1');
        expect(updatedAgent.currentLoad).toBe(0.8);
        expect(oldLoad).toBe(0.3);
        done();
      });

      registry.updateLoad('agent-1', 0.8);
    });

    test('should return false when updating load of non-existent agent', () => {
      const result = registry.updateLoad('non-existent', 0.5);
      expect(result).toBe(false);
    });
  });

  describe('清空', () => {
    test('should clear all agents', () => {
      registry.register({
        id: 'agent-1',
        name: 'Agent 1',
        capabilities: ['chat'],
        status: 'online',
        currentLoad: 0,
      });

      registry.register({
        id: 'agent-2',
        name: 'Agent 2',
        capabilities: ['code'],
        status: 'online',
        currentLoad: 0,
      });

      expect(registry.getAll().length).toBe(2);

      registry.clear();

      expect(registry.getAll().length).toBe(0);
    });

    test('should emit registry:cleared event', (done) => {
      registry.register({
        id: 'agent-1',
        name: 'Agent 1',
        capabilities: ['chat'],
        status: 'online',
        currentLoad: 0,
      });

      registry.on('registry:cleared', () => {
        expect(registry.getAll().length).toBe(0);
        done();
      });

      registry.clear();
    });
  });

  describe('边界情况', () => {
    test('should handle empty registry', () => {
      expect(registry.getAll()).toEqual([]);
      expect(registry.getOnlineCount()).toBe(0);
      expect(registry.filter({})).toEqual([]);
    });

    test('should handle filter with no matches', () => {
      registry.register({
        id: 'agent-1',
        name: 'Agent 1',
        capabilities: ['chat'],
        status: 'online',
        currentLoad: 0,
      });

      const result = registry.filter({
        capabilities: ['non-existent-capability'],
      });

      expect(result).toEqual([]);
    });

    test('should handle agent with metadata', () => {
      const agent: Agent = {
        id: 'agent-1',
        name: 'Agent 1',
        capabilities: ['chat'],
        status: 'online',
        currentLoad: 0,
        metadata: { version: '1.0', region: 'us-east' },
      };

      registry.register(agent);

      const retrieved = registry.get('agent-1');
      expect(retrieved?.metadata).toEqual({ version: '1.0', region: 'us-east' });
    });

    test('should handle multiple events', () => {
      const events: string[] = [];

      registry.on('agent:registered', () => events.push('registered'));
      registry.on('agent:unregistered', () => events.push('unregistered'));
      registry.on('agent:status:changed', () => events.push('status-changed'));
      registry.on('agent:load:changed', () => events.push('load-changed'));

      const agent: Agent = {
        id: 'agent-1',
        name: 'Agent 1',
        capabilities: ['chat'],
        status: 'online',
        currentLoad: 0,
      };

      registry.register(agent);
      registry.updateStatus('agent-1', 'busy');
      registry.updateLoad('agent-1', 0.5);
      registry.unregister('agent-1');

      expect(events).toEqual([
        'registered',
        'status-changed',
        'load-changed',
        'unregistered',
      ]);
    });
  });
});