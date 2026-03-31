/**
 * Agent Capability Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  AgentCapability,
  createAgentCapability,
  initializeAgents,
  AGENT_CAPABILITIES_CONFIG,
  AgentProvider
} from "@/lib/agents/scheduler/models/agent-capability';

describe('AgentCapability Model', () => {
  describe('createAgentCapability', () => {
    it('should create agent capability with default values', () => {
      const config = {
        agentId: 'test-agent',
        name: 'Test Agent',
        provider: 'minimax' as AgentProvider,
        role: 'Test',
        capabilities: {
          techStack: ['typescript', 'react'],
          taskTypes: ['implementation', 'testing'],
          concurrency: 3,
          avgResponseTime: 5,
          successRate: 0.95
        }
      };

      const agent = createAgentCapability(config);

      expect(agent.agentId).toBe('test-agent');
      expect(agent.name).toBe('Test Agent');
      expect(agent.provider).toBe('minimax');
      expect(agent.currentLoad).toBe(0);
      expect(agent.availability).toBe(true);
      expect(agent.lastActiveTime).toBeGreaterThan(0);
    });

    it('should preserve all config values', () => {
      const config = {
        agentId: 'test-agent',
        name: 'Test Agent',
        provider: 'volcengine' as AgentProvider,
        role: 'Executor',
        capabilities: {
          techStack: ['javascript', 'python'],
          taskTypes: ['implementation'],
          concurrency: 5,
          avgResponseTime: 3,
          successRate: 0.98
        }
      };

      const agent = createAgentCapability(config);

      expect(agent.capabilities.techStack).toEqual(['javascript', 'python']);
      expect(agent.capabilities.concurrency).toBe(5);
      expect(agent.capabilities.successRate).toBe(0.98);
    });
  });

  describe('initializeAgents', () => {
    it('should initialize all 11 agents', () => {
      const agents = initializeAgents();

      expect(agents.size).toBe(11);
    });

    it('should include all expected agents', () => {
      const agents = initializeAgents();

      const expectedAgentIds = [
        'agent-expert',
        'consultant',
        'architect',
        'executor',
        'sysadmin',
        'tester',
        'designer',
        'promoter',
        'sales',
        'finance',
        'media'
      ];

      for (const id of expectedAgentIds) {
        expect(agents.has(id)).toBe(true);
      }
    });

    it('should initialize all agents with zero load', () => {
      const agents = initializeAgents();

      for (const agent of agents.values()) {
        expect(agent.currentLoad).toBe(0);
      }
    });

    it('should initialize all agents as available', () => {
      const agents = initializeAgents();

      for (const agent of agents.values()) {
        expect(agent.availability).toBe(true);
      }
    });

    it('should set lastActiveTime to current time', () => {
      const before = Date.now();
      const agents = initializeAgents();
      const after = Date.now();

      for (const agent of agents.values()) {
        expect(agent.lastActiveTime).toBeGreaterThanOrEqual(before);
        expect(agent.lastActiveTime).toBeLessThanOrEqual(after);
      }
    });
  });

  describe('AGENT_CAPABILITIES_CONFIG', () => {
    it('should have configuration for all 11 agents', () => {
      expect(Object.keys(AGENT_CAPABILITIES_CONFIG)).toHaveLength(11);
    });

    it('should have valid agent configurations', () => {
      for (const [id, config] of Object.entries(AGENT_CAPABILITIES_CONFIG)) {
        expect(config.agentId).toBe(id);
        expect(config.name).toBeDefined();
        expect(config.provider).toBeDefined();
        expect(config.capabilities).toBeDefined();
        expect(config.capabilities.techStack).toBeDefined();
        expect(config.capabilities.taskTypes).toBeDefined();
        expect(config.capabilities.concurrency).toBeGreaterThan(0);
        expect(config.capabilities.avgResponseTime).toBeGreaterThan(0);
        expect(config.capabilities.successRate).toBeGreaterThan(0);
        expect(config.capabilities.successRate).toBeLessThanOrEqual(1);
      }
    });

    it('should have architect with correct capabilities', () => {
      const architect = AGENT_CAPABILITIES_CONFIG['architect'];

      expect(architect.name).toBe('架构师');
      expect(architect.provider).toBe('self-claude');
      expect(architect.role).toBe('架构设计');
      expect(architect.capabilities.taskTypes).toContain('architecture');
      expect(architect.capabilities.techStack).toContain('typescript');
      expect(architect.capabilities.concurrency).toBe(2);
    });

    it('should have executor with high concurrency', () => {
      const executor = AGENT_CAPABILITIES_CONFIG['executor'];

      expect(executor.name).toBe('Executor');
      expect(executor.capabilities.concurrency).toBe(5);
      expect(executor.capabilities.taskTypes).toContain('implementation');
    });

    it('should have sysadmin with devops capabilities', () => {
      const sysadmin = AGENT_CAPABILITIES_CONFIG['sysadmin'];

      expect(sysadmin.name).toBe('系统管理员');
      expect(sysadmin.capabilities.techStack).toContain('docker');
      expect(sysadmin.capabilities.techStack).toContain('kubernetes');
      expect(sysadmin.capabilities.taskTypes).toContain('devops');
    });
  });

  describe('Agent capabilities structure', () => {
    it('should have diverse tech stacks', () => {
      const agents = initializeAgents();
      const allTechStacks = Array.from(agents.values())
        .flatMap(agent => agent.capabilities.techStack);

      const uniqueTechStacks = new Set(allTechStacks);
      expect(uniqueTechStacks.size).toBeGreaterThan(10);
    });

    it('should have all task types covered', () => {
      const agents = initializeAgents();
      const allTaskTypes = Array.from(agents.values())
        .flatMap(agent => agent.capabilities.taskTypes);

      const uniqueTaskTypes = new Set(allTaskTypes);
      expect(uniqueTaskTypes).toContain('architecture');
      expect(uniqueTaskTypes).toContain('implementation');
      expect(uniqueTaskTypes).toContain('testing');
      expect(uniqueTaskTypes).toContain('devops');
    });

    it('should have varying concurrency levels', () => {
      const agents = initializeAgents();
      const concurrencyLevels = Array.from(agents.values())
        .map(agent => agent.capabilities.concurrency);

      const min = Math.min(...concurrencyLevels);
      const max = Math.max(...concurrencyLevels);

      expect(min).toBeLessThan(max);
      expect(min).toBeGreaterThanOrEqual(2);
      expect(max).toBeLessThanOrEqual(5);
    });

    it('should have valid success rates', () => {
      const agents = initializeAgents();

      for (const agent of agents.values()) {
        expect(agent.capabilities.successRate).toBeGreaterThanOrEqual(0.9);
        expect(agent.capabilities.successRate).toBeLessThanOrEqual(1.0);
      }
    });
  });
});
