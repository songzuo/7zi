/**
 * A2A JSON-RPC API Integration Tests
 * 
 * Tests for JSON-RPC 2.0 endpoint, method routing, and protocol compliance.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { agentScheduler } from '@/lib/agent-scheduler/scheduler';
import { POST, OPTIONS } from '@/app/api/a2a/jsonrpc/route';
import type { JSONRPCRequest } from '@/lib/agent-scheduler/types';

// Mock auth
vi.mock('@/lib/auth/api-auth', () => ({
  authenticateJWT: vi.fn(),
}));

import { authenticateJWT } from '@/lib/auth/api-auth';

describe('A2A JSON-RPC API - Protocol Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    agentScheduler.clear();
  });

  afterEach(() => {
    agentScheduler.clear();
    vi.restoreAllMocks();
  });

  describe('JSON-RPC 2.0 Format', () => {
    it('should reject requests without jsonrpc version', async () => {
      const request = new NextRequest('http://localhost/api/a2a/jsonrpc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'agent.list',
          params: {},
          id: 'test-1',
        }),
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.jsonrpc).toBe('2.0');
      expect(json.error).toBeDefined();
      expect(json.error.code).toBe(-32600);
      expect(json.error.message).toContain('jsonrpc version must be "2.0"');
    });

    it('should reject requests with wrong jsonrpc version', async () => {
      const request = new NextRequest('http://localhost/api/a2a/jsonrpc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '1.0',
          method: 'agent.list',
          params: {},
          id: 'test-1',
        }),
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.error.code).toBe(-32600);
    });

    it('should reject requests without method', async () => {
      const request = new NextRequest('http://localhost/api/a2a/jsonrpc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          params: {},
          id: 'test-1',
        }),
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.error.code).toBe(-32601);
      expect(json.error.message).toContain('method is required');
    });

    it('should handle invalid JSON', async () => {
      const request = new NextRequest('http://localhost/api/a2a/jsonrpc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json',
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.jsonrpc).toBe('2.0');
      expect(json.error.code).toBe(-32700);
      expect(json.error.message).toBe('Parse error: invalid JSON');
    });

    it('should return jsonrpc version in response', async () => {
      vi.mocked(authenticateJWT).mockResolvedValue({
        authenticated: true,
        userId: 'user-1',
        username: 'testuser',
        role: 'user',
        authMethod: 'jwt',
      });

      const request = new NextRequest('http://localhost/api/a2a/jsonrpc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'agent.list',
          params: {},
          id: 'test-1',
        }),
      });

      const response = await POST(request);
      const json = await response.json();

      expect(json.jsonrpc).toBe('2.0');
    });

    it('should echo request ID in response', async () => {
      vi.mocked(authenticateJWT).mockResolvedValue({
        authenticated: true,
        userId: 'user-1',
        username: 'testuser',
        role: 'user',
        authMethod: 'jwt',
      });

      const request = new NextRequest('http://localhost/api/a2a/jsonrpc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'agent.list',
          params: {},
          id: 'my-custom-id',
        }),
      });

      const response = await POST(request);
      const json = await response.json();

      expect(json.id).toBe('my-custom-id');
    });

    it('should handle numeric IDs', async () => {
      vi.mocked(authenticateJWT).mockResolvedValue({
        authenticated: true,
        userId: 'user-1',
        username: 'testuser',
        role: 'user',
        authMethod: 'jwt',
      });

      const request = new NextRequest('http://localhost/api/a2a/jsonrpc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'agent.list',
          params: {},
          id: 12345,
        }),
      });

      const response = await POST(request);
      const json = await response.json();

      expect(json.id).toBe(12345);
    });
  });
});

describe('A2A JSON-RPC API - Agent Methods', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    agentScheduler.clear();
    vi.mocked(authenticateJWT).mockResolvedValue({
      authenticated: true,
      userId: 'user-1',
      username: 'testuser',
      role: 'user',
      authMethod: 'jwt',
    });

    agentScheduler.registerAgent('agent-1', 'Agent 1', 'test', ['cap-a']);
    agentScheduler.registerAgent('agent-2', 'Agent 2', 'test', ['cap-b', 'cap-a']);
  });

  afterEach(() => {
    agentScheduler.clear();
    vi.restoreAllMocks();
  });

  describe('agent.list', () => {
    it('should list all agents', async () => {
      const request = new NextRequest('http://localhost/api/a2a/jsonrpc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'agent.list',
          params: {},
          id: 'test-1',
        }),
      });

      const response = await POST(request);
      const json = await response.json();

      expect(json.result).toBeDefined();
      expect(json.result.agents).toBeDefined();
      expect(Array.isArray(json.result.agents)).toBe(true);
      expect(json.result.count).toBe(2);
    });

    it('should return empty array when no agents', async () => {
      agentScheduler.clear();

      const request = new NextRequest('http://localhost/api/a2a/jsonrpc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'agent.list',
          params: {},
          id: 'test-1',
        }),
      });

      const response = await POST(request);
      const json = await response.json();

      expect(json.result.agents).toEqual([]);
      expect(json.result.count).toBe(0);
    });
  });

  describe('agent.get', () => {
    it('should get agent by ID', async () => {
      const request = new NextRequest('http://localhost/api/a2a/jsonrpc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'agent.get',
          params: { agentId: 'agent-1' },
          id: 'test-1',
        }),
      });

      const response = await POST(request);
      const json = await response.json();

      expect(json.result).toBeDefined();
      expect(json.result.agent).toBeDefined();
      expect(json.result.agent.id).toBe('agent-1');
    });

    it('should return error when agentId missing', async () => {
      const request = new NextRequest('http://localhost/api/a2a/jsonrpc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'agent.get',
          params: {},
          id: 'test-1',
        }),
      });

      const response = await POST(request);
      const json = await response.json();

      expect(json.error).toBeDefined();
      expect(json.error.code).toBe(-32602);
      expect(json.error.message).toContain('agentId required');
    });

    it('should return error when agent not found', async () => {
      const request = new NextRequest('http://localhost/api/a2a/jsonrpc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'agent.get',
          params: { agentId: 'non-existent' },
          id: 'test-1',
        }),
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(404);
      expect(json.error.code).toBe(-32002);
      expect(json.error.message).toBe('Agent not found');
    });
  });

  describe('agent.discover', () => {
    it('should discover all agents when no capability specified', async () => {
      const request = new NextRequest('http://localhost/api/a2a/jsonrpc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'agent.discover',
          params: {},
          id: 'test-1',
        }),
      });

      const response = await POST(request);
      const json = await response.json();

      expect(json.result.agents.length).toBe(2);
    });

    it('should discover agents by capability', async () => {
      const request = new NextRequest('http://localhost/api/a2a/jsonrpc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'agent.discover',
          params: { capability: 'cap-a' },
          id: 'test-1',
        }),
      });

      const response = await POST(request);
      const json = await response.json();

      expect(json.result.agents.length).toBe(2);
      expect(json.result.agents.every((a: any) => a.capabilities.includes('cap-a'))).toBe(true);
    });

    it('should return empty array for unknown capability', async () => {
      const request = new NextRequest('http://localhost/api/a2a/jsonrpc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'agent.discover',
          params: { capability: 'unknown-cap' },
          id: 'test-1',
        }),
      });

      const response = await POST(request);
      const json = await response.json();

      expect(json.result.agents).toEqual([]);
    });
  });

  describe('agent.heartbeat', () => {
    it('should record heartbeat', async () => {
      const request = new NextRequest('http://localhost/api/a2a/jsonrpc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'agent.heartbeat',
          params: { agentId: 'agent-1' },
          id: 'test-1',
        }),
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.result.message).toBe('Heartbeat received');
    });

    it('should return error when agentId missing', async () => {
      const request = new NextRequest('http://localhost/api/a2a/jsonrpc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'agent.heartbeat',
          params: {},
          id: 'test-1',
        }),
      });

      const response = await POST(request);
      const json = await response.json();

      expect(json.error.code).toBe(-32602);
    });

    it('should return error when agent not found', async () => {
      const request = new NextRequest('http://localhost/api/a2a/jsonrpc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'agent.heartbeat',
          params: { agentId: 'non-existent' },
          id: 'test-1',
        }),
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(404);
      expect(json.error.code).toBe(-32002);
    });
  });
});

describe('A2A JSON-RPC API - Task Methods', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    agentScheduler.clear();
    vi.mocked(authenticateJWT).mockResolvedValue({
      authenticated: true,
      userId: 'user-1',
      username: 'testuser',
      role: 'user',
      authMethod: 'jwt',
    });

    agentScheduler.registerAgent('agent-1', 'Agent 1', 'test', ['test-task']);
  });

  afterEach(() => {
    agentScheduler.clear();
    vi.restoreAllMocks();
  });

  describe('task.create', () => {
    it('should create task successfully', async () => {
      const request = new NextRequest('http://localhost/api/a2a/jsonrpc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'task.create',
          params: {
            type: 'test-task',
            input: { data: 'test' },
          },
          id: 'test-1',
        }),
      });

      const response = await POST(request);
      const json = await response.json();

      // JSON-RPC uses 200 for successful responses, data in result
      expect([200, 201]).toContain(response.status);
      expect(json.result).toBeDefined();
      expect(json.result.task).toBeDefined();
      expect(json.result.taskId).toBeDefined();
      expect(json.result.task.type).toBe('test-task');
    });

    it('should create task with priority', async () => {
      const request = new NextRequest('http://localhost/api/a2a/jsonrpc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'task.create',
          params: {
            type: 'test-task',
            input: { data: 'test' },
            priority: 'high',
          },
          id: 'test-1',
        }),
      });

      const response = await POST(request);
      const json = await response.json();

      expect(json.result.task.priority).toBe('high');
    });

    it('should create task with specific agent', async () => {
      const request = new NextRequest('http://localhost/api/a2a/jsonrpc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'task.create',
          params: {
            type: 'test-task',
            input: { data: 'test' },
            agentId: 'agent-1',
          },
          id: 'test-1',
        }),
      });

      const response = await POST(request);
      const json = await response.json();

      expect(json.result.task.agentId).toBe('agent-1');
    });

    it('should return error when type missing', async () => {
      const request = new NextRequest('http://localhost/api/a2a/jsonrpc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'task.create',
          params: {
            input: { data: 'test' },
          },
          id: 'test-1',
        }),
      });

      const response = await POST(request);
      const json = await response.json();

      expect(json.error.code).toBe(-32602);
      expect(json.error.message).toContain('type required');
    });

    it('should return error when input missing', async () => {
      const request = new NextRequest('http://localhost/api/a2a/jsonrpc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'task.create',
          params: {
            type: 'test-task',
          },
          id: 'test-1',
        }),
      });

      const response = await POST(request);
      const json = await response.json();

      expect(json.error.code).toBe(-32602);
      expect(json.error.message).toContain('input required');
    });
  });

  describe('task.get', () => {
    it('should get task by ID', async () => {
      agentScheduler.scheduleTask({ type: 'test-task', input: { data: 'test' } });
      const tasks = agentScheduler.getAllTasks();
      const taskId = tasks[0].id;

      const request = new NextRequest('http://localhost/api/a2a/jsonrpc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'task.get',
          params: { taskId },
          id: 'test-1',
        }),
      });

      const response = await POST(request);
      const json = await response.json();

      expect(json.result.task.id).toBe(taskId);
    });

    it('should return error when taskId missing', async () => {
      const request = new NextRequest('http://localhost/api/a2a/jsonrpc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'task.get',
          params: {},
          id: 'test-1',
        }),
      });

      const response = await POST(request);
      const json = await response.json();

      expect(json.error.code).toBe(-32602);
    });

    it('should return error when task not found', async () => {
      const request = new NextRequest('http://localhost/api/a2a/jsonrpc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'task.get',
          params: { taskId: 'non-existent' },
          id: 'test-1',
        }),
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(404);
      expect(json.error.code).toBe(-32004);
    });
  });

  describe('task.status', () => {
    it('should get task status', async () => {
      agentScheduler.scheduleTask({ type: 'test-task', input: { data: 'test' } });
      const tasks = agentScheduler.getAllTasks();
      const taskId = tasks[0].id;

      const request = new NextRequest('http://localhost/api/a2a/jsonrpc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'task.status',
          params: { taskId },
          id: 'test-1',
        }),
      });

      const response = await POST(request);
      const json = await response.json();

      expect(json.result.taskId).toBe(taskId);
      expect(json.result.status).toBeDefined();
    });

    it('should return error when taskId missing', async () => {
      const request = new NextRequest('http://localhost/api/a2a/jsonrpc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'task.status',
          params: {},
          id: 'test-1',
        }),
      });

      const response = await POST(request);
      const json = await response.json();

      expect(json.error.code).toBe(-32602);
    });
  });

  describe('task.update', () => {
    it('should update task status', async () => {
      agentScheduler.scheduleTask({ type: 'test-task', input: { data: 'test' } });
      const tasks = agentScheduler.getAllTasks();
      const taskId = tasks[0].id;

      const request = new NextRequest('http://localhost/api/a2a/jsonrpc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'task.update',
          params: {
            taskId,
            status: 'completed',
            output: { result: 'success' },
          },
          id: 'test-1',
        }),
      });

      const response = await POST(request);
      const json = await response.json();

      expect(json.result.task.status).toBe('completed');
      expect(json.result.task.output).toEqual({ result: 'success' });
    });

    it('should update task with error', async () => {
      // Schedule with no retries to avoid auto-retry on failure
      agentScheduler.scheduleTask({
        type: 'test-task',
        input: { data: 'test' },
        maxRetries: 0,
      });
      const tasks = agentScheduler.getAllTasks();
      const taskId = tasks[0].id;

      const request = new NextRequest('http://localhost/api/a2a/jsonrpc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'task.update',
          params: {
            taskId,
            status: 'failed',
            error: 'Task failed',
          },
          id: 'test-1',
        }),
      });

      const response = await POST(request);
      const json = await response.json();

      expect(json.result.task.status).toBe('failed');
      expect(json.result.task.error).toBe('Task failed');
    });

    it('should return error when taskId missing', async () => {
      const request = new NextRequest('http://localhost/api/a2a/jsonrpc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'task.update',
          params: {
            status: 'completed',
          },
          id: 'test-1',
        }),
      });

      const response = await POST(request);
      const json = await response.json();

      expect(json.error.code).toBe(-32602);
    });

    it('should return error when task not found', async () => {
      const request = new NextRequest('http://localhost/api/a2a/jsonrpc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'task.update',
          params: {
            taskId: 'non-existent',
            status: 'completed',
          },
          id: 'test-1',
        }),
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(404);
      expect(json.error.code).toBe(-32004);
    });
  });

  describe('task.cancel', () => {
    it('should cancel task', async () => {
      agentScheduler.scheduleTask({ type: 'test-task', input: { data: 'test' } });
      const tasks = agentScheduler.getAllTasks();
      const taskId = tasks[0].id;

      const request = new NextRequest('http://localhost/api/a2a/jsonrpc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'task.cancel',
          params: { taskId },
          id: 'test-1',
        }),
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.result.message).toBe('Task cancelled');

      const task = agentScheduler.getTask(taskId);
      expect(task?.status).toBe('cancelled');
    });

    it('should return error when taskId missing', async () => {
      const request = new NextRequest('http://localhost/api/a2a/jsonrpc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'task.cancel',
          params: {},
          id: 'test-1',
        }),
      });

      const response = await POST(request);
      const json = await response.json();

      expect(json.error.code).toBe(-32602);
    });

    it('should return error when task not found', async () => {
      const request = new NextRequest('http://localhost/api/a2a/jsonrpc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'task.cancel',
          params: { taskId: 'non-existent' },
          id: 'test-1',
        }),
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(404);
      expect(json.error.code).toBe(-32004);
    });
  });
});

describe('A2A JSON-RPC API - Queue Methods', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    agentScheduler.clear();
    vi.mocked(authenticateJWT).mockResolvedValue({
      authenticated: true,
      userId: 'user-1',
      username: 'testuser',
      role: 'user',
      authMethod: 'jwt',
    });
  });

  afterEach(() => {
    agentScheduler.clear();
    vi.restoreAllMocks();
  });

  describe('queue.stats', () => {
    it('should return queue statistics', async () => {
      const request = new NextRequest('http://localhost/api/a2a/jsonrpc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'queue.stats',
          params: {},
          id: 'test-1',
        }),
      });

      const response = await POST(request);
      const json = await response.json();

      expect(json.result.stats).toBeDefined();
      expect(json.result.stats).toHaveProperty('pending');
      expect(json.result.stats).toHaveProperty('running');
      expect(json.result.stats).toHaveProperty('completed');
      expect(json.result.stats).toHaveProperty('failed');
      expect(json.result.stats).toHaveProperty('total');
    });

    it('should return all zeros when no tasks', async () => {
      const request = new NextRequest('http://localhost/api/a2a/jsonrpc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'queue.stats',
          params: {},
          id: 'test-1',
        }),
      });

      const response = await POST(request);
      const json = await response.json();

      expect(json.result.stats.total).toBe(0);
      expect(json.result.stats.pending).toBe(0);
      expect(json.result.stats.running).toBe(0);
      expect(json.result.stats.completed).toBe(0);
      expect(json.result.stats.failed).toBe(0);
    });
  });
});

describe('A2A JSON-RPC API - Unknown Methods', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    agentScheduler.clear();
    vi.mocked(authenticateJWT).mockResolvedValue({
      authenticated: true,
      userId: 'user-1',
      username: 'testuser',
      role: 'user',
      authMethod: 'jwt',
    });
  });

  afterEach(() => {
    agentScheduler.clear();
    vi.restoreAllMocks();
  });

  it('should return method not found error', async () => {
    const request = new NextRequest('http://localhost/api/a2a/jsonrpc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'unknown.method',
        params: {},
        id: 'test-1',
      }),
    });

    const response = await POST(request);
    const json = await response.json();

    expect(json.error).toBeDefined();
    expect(json.error.code).toBe(-32601);
    expect(json.error.message).toBe('Method not found');
    expect(json.error.data).toEqual({ method: 'unknown.method' });
  });
});

describe('A2A JSON-RPC API - CORS Support', () => {
  it('should handle OPTIONS request', async () => {
    const request = new NextRequest('http://localhost/api/a2a/jsonrpc', {
      method: 'OPTIONS',
    });

    const response = await OPTIONS(request);

    expect(response.status).toBe(204);
    expect(response.headers.get('Access-Control-Allow-Methods')).toContain('POST');
    expect(response.headers.get('Access-Control-Allow-Headers')).toContain('Content-Type');
  });
});

describe('A2A JSON-RPC API - Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    agentScheduler.clear();
    vi.mocked(authenticateJWT).mockResolvedValue({
      authenticated: true,
      userId: 'user-1',
      username: 'testuser',
      role: 'user',
      authMethod: 'jwt',
    });

    agentScheduler.registerAgent('agent-1', 'Agent 1', 'test', ['test-task']);
  });

  afterEach(() => {
    agentScheduler.clear();
    vi.restoreAllMocks();
  });

  it('should complete full task lifecycle via JSON-RPC', async () => {
    // Create task
    const createRequest = new NextRequest('http://localhost/api/a2a/jsonrpc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'task.create',
        params: {
          type: 'test-task',
          input: { data: 'test' },
        },
        id: 'create-1',
      }),
    });

    const createResponse = await POST(createRequest);
    const createJson = await createResponse.json();
    const taskId = createJson.result.taskId;

    expect([200, 201]).toContain(createResponse.status); // JSON-RPC uses 200 for success

    // Get task status
    const statusRequest = new NextRequest('http://localhost/api/a2a/jsonrpc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'task.status',
        params: { taskId },
        id: 'status-1',
      }),
    });

    const statusResponse = await POST(statusRequest);
    expect(statusResponse.status).toBe(200);

    // Complete task
    const updateRequest = new NextRequest('http://localhost/api/a2a/jsonrpc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'task.update',
        params: {
          taskId,
          status: 'completed',
          output: { result: 'success' },
        },
        id: 'update-1',
      }),
    });

    const updateResponse = await POST(updateRequest);
    expect(updateResponse.status).toBe(200);

    // Check stats
    const statsRequest = new NextRequest('http://localhost/api/a2a/jsonrpc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'queue.stats',
        params: {},
        id: 'stats-1',
      }),
    });

    const statsResponse = await POST(statsRequest);
    const statsJson = await statsResponse.json();

    expect(statsJson.result.stats.completed).toBe(1);
  });

  it('should handle multiple sequential requests', async () => {
    // List agents
    const listRequest = new NextRequest('http://localhost/api/a2a/jsonrpc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'agent.list',
        params: {},
        id: 'list-1',
      }),
    });

    await POST(listRequest);

    // Create task
    const createRequest = new NextRequest('http://localhost/api/a2a/jsonrpc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'task.create',
        params: {
          type: 'test-task',
          input: { data: 'test' },
        },
        id: 'create-1',
      }),
    });

    await POST(createRequest);

    // Get stats
    const statsRequest = new NextRequest('http://localhost/api/a2a/jsonrpc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'queue.stats',
        params: {},
        id: 'stats-1',
      }),
    });

    const statsResponse = await POST(statsRequest);
    const statsJson = await statsResponse.json();

    expect(statsJson.result.stats.total).toBe(1);
  });

  it('should maintain request ID correlation', async () => {
    const ids = ['req-1', 'req-2', 'req-3', 'req-4'];

    for (const id of ids) {
      const request = new NextRequest('http://localhost/api/a2a/jsonrpc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'agent.list',
          params: {},
          id,
        }),
      });

      const response = await POST(request);
      const json = await response.json();

      expect(json.id).toBe(id);
    }
  });
});
