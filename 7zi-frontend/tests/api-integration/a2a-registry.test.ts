/**
 * A2A Registry API Integration Tests
 * 
 * Tests for agent registration, unregistration, and status management.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { agentScheduler } from '@/lib/agent-scheduler/scheduler';
import { GET, POST, PUT, DELETE } from '@/app/api/a2a/registry/route';

// Mock auth
vi.mock('@/lib/auth/api-auth', () => ({
  authenticateJWT: vi.fn(),
}));

// Mock error handler
vi.mock('@/lib/api/error-handler', () => ({
  createSuccessResponse: vi.fn((data, status = 200) => {
    return new Response(JSON.stringify({ success: true, data }), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  }),
  createErrorResponse: vi.fn((error: Error) => {
    return new Response(
      JSON.stringify({
        success: false,
        error: { type: 'INTERNAL', message: 'An internal error occurred' },
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }),
}));

import { authenticateJWT } from '@/lib/auth/api-auth';

describe('A2A Registry API - GET /api/a2a/registry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    agentScheduler.clear();
  });

  afterEach(() => {
    agentScheduler.clear();
    vi.restoreAllMocks();
  });

  describe('Authentication', () => {
    it('should return 401 for unauthenticated requests', async () => {
      vi.mocked(authenticateJWT).mockResolvedValue({
        authenticated: false,
        error: 'Invalid or expired JWT token',
      });

      const request = new NextRequest('http://localhost/api/a2a/registry', {
        method: 'GET',
      });

      const response = await GET(request);
      const json = await response.json();

      expect(response.status).toBe(401);
      expect(json.success).toBe(false);
      expect(json.error).toBe('Unauthorized');
    });

    it('should allow authenticated user to list agents', async () => {
      vi.mocked(authenticateJWT).mockResolvedValue({
        authenticated: true,
        userId: 'user-1',
        username: 'testuser',
        role: 'user',
        authMethod: 'jwt',
      });

      // Register a test agent
      agentScheduler.registerAgent(
        'agent-1',
        'Test Agent',
        'test',
        ['test-capability']
      );

      const request = new NextRequest('http://localhost/api/a2a/registry', {
        method: 'GET',
      });

      const response = await GET(request);
      expect(response.status).toBe(200);
    });
  });

  describe('Agent Listing', () => {
    beforeEach(() => {
      vi.mocked(authenticateJWT).mockResolvedValue({
        authenticated: true,
        userId: 'user-1',
        username: 'testuser',
        role: 'user',
        authMethod: 'jwt',
      });
    });

    it('should return empty array when no agents registered', async () => {
      const request = new NextRequest('http://localhost/api/a2a/registry', {
        method: 'GET',
      });

      const response = await GET(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.agents).toEqual([]);
      expect(json.data.count).toBe(0);
    });

    it('should return all registered agents', async () => {
      agentScheduler.registerAgent('agent-1', 'Agent 1', 'type-a', ['cap-a']);
      agentScheduler.registerAgent('agent-2', 'Agent 2', 'type-b', ['cap-b']);
      agentScheduler.registerAgent('agent-3', 'Agent 3', 'type-a', ['cap-a', 'cap-b']);

      const request = new NextRequest('http://localhost/api/a2a/registry', {
        method: 'GET',
      });

      const response = await GET(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.data.agents.length).toBe(3);
      expect(json.data.count).toBe(3);
    });

    it('should filter agents by capability', async () => {
      agentScheduler.registerAgent('agent-1', 'Agent 1', 'type-a', ['cap-a']);
      agentScheduler.registerAgent('agent-2', 'Agent 2', 'type-b', ['cap-b']);
      agentScheduler.registerAgent('agent-3', 'Agent 3', 'type-a', ['cap-a', 'cap-b']);

      const request = new NextRequest(
        'http://localhost/api/a2a/registry?capability=cap-a',
        { method: 'GET' }
      );

      const response = await GET(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.data.agents.length).toBe(2);
    });

    it('should return single agent by ID', async () => {
      agentScheduler.registerAgent('agent-1', 'Agent 1', 'type-a', ['cap-a']);

      const request = new NextRequest(
        'http://localhost/api/a2a/registry?id=agent-1',
        { method: 'GET' }
      );

      const response = await GET(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.data.agent.id).toBe('agent-1');
    });

    it('should return 404 for non-existent agent ID', async () => {
      const request = new NextRequest(
        'http://localhost/api/a2a/registry?id=non-existent',
        { method: 'GET' }
      );

      const response = await GET(request);
      const json = await response.json();

      expect(response.status).toBe(404);
      expect(json.success).toBe(false);
    });
  });
});

describe('A2A Registry API - POST /api/a2a/registry', () => {
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

  describe('Validation', () => {
    it('should return 400 when name is missing', async () => {
      const request = new NextRequest('http://localhost/api/a2a/registry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'test',
          capabilities: ['cap-a'],
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it('should return 400 when type is missing', async () => {
      const request = new NextRequest('http://localhost/api/a2a/registry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test Agent',
          capabilities: ['cap-a'],
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it('should return 400 when capabilities is missing', async () => {
      const request = new NextRequest('http://localhost/api/a2a/registry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test Agent',
          type: 'test',
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it('should return 400 when capabilities is not an array', async () => {
      const request = new NextRequest('http://localhost/api/a2a/registry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test Agent',
          type: 'test',
          capabilities: 'not-an-array',
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });
  });

  describe('Agent Registration', () => {
    it('should register a new agent successfully', async () => {
      const request = new NextRequest('http://localhost/api/a2a/registry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test Agent',
          type: 'test',
          capabilities: ['cap-a', 'cap-b'],
        }),
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(201);
      expect(json.success).toBe(true);
      expect(json.data.agent).toBeDefined();
      expect(json.data.agent.name).toBe('Test Agent');
      expect(json.data.agent.status).toBe('idle');
      expect(json.data.agent.capabilities).toEqual(['cap-a', 'cap-b']);
    });

    it('should register agent with metadata', async () => {
      const request = new NextRequest('http://localhost/api/a2a/registry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test Agent',
          type: 'test',
          capabilities: ['cap-a'],
          metadata: {
            version: '1.0.0',
            owner: 'test-user',
          },
        }),
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(201);
      expect(json.data.agent.metadata).toEqual({
        version: '1.0.0',
        owner: 'test-user',
      });
    });

    it('should generate unique agent IDs', async () => {
      const request1 = new NextRequest('http://localhost/api/a2a/registry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Agent 1',
          type: 'test',
          capabilities: ['cap-a'],
        }),
      });

      const request2 = new NextRequest('http://localhost/api/a2a/registry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Agent 2',
          type: 'test',
          capabilities: ['cap-a'],
        }),
      });

      const response1 = await POST(request1);
      const response2 = await POST(request2);

      const json1 = await response1.json();
      const json2 = await response2.json();

      expect(json1.data.agent.id).not.toBe(json2.data.agent.id);
    });

    it('should set initial status to idle', async () => {
      const request = new NextRequest('http://localhost/api/a2a/registry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test Agent',
          type: 'test',
          capabilities: ['cap-a'],
        }),
      });

      const response = await POST(request);
      const json = await response.json();

      expect(json.data.agent.status).toBe('idle');
    });

    it('should record creation timestamp', async () => {
      const beforeRegister = Date.now();

      const request = new NextRequest('http://localhost/api/a2a/registry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test Agent',
          type: 'test',
          capabilities: ['cap-a'],
        }),
      });

      const response = await POST(request);
      const json = await response.json();

      const afterRegister = Date.now();

      expect(json.data.agent.createdAt).toBeGreaterThanOrEqual(beforeRegister);
      expect(json.data.agent.createdAt).toBeLessThanOrEqual(afterRegister);
    });

    it('should record last heartbeat timestamp', async () => {
      const beforeRegister = Date.now();

      const request = new NextRequest('http://localhost/api/a2a/registry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test Agent',
          type: 'test',
          capabilities: ['cap-a'],
        }),
      });

      const response = await POST(request);
      const json = await response.json();

      const afterRegister = Date.now();

      expect(json.data.agent.lastHeartbeat).toBeGreaterThanOrEqual(beforeRegister);
      expect(json.data.agent.lastHeartbeat).toBeLessThanOrEqual(afterRegister);
    });
  });
});

describe('A2A Registry API - PUT /api/a2a/registry', () => {
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
    agentScheduler.registerAgent('agent-1', 'Test Agent', 'test', ['cap-a']);
  });

  afterEach(() => {
    agentScheduler.clear();
    vi.restoreAllMocks();
  });

  describe('Validation', () => {
    it('should return 400 when agentId is missing', async () => {
      const request = new NextRequest('http://localhost/api/a2a/registry', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'busy',
        }),
      });

      const response = await PUT(request);
      expect(response.status).toBe(400);
    });

    it('should return 400 when status is missing', async () => {
      const request = new NextRequest('http://localhost/api/a2a/registry', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: 'agent-1',
        }),
      });

      const response = await PUT(request);
      expect(response.status).toBe(400);
    });

    it('should return 400 for invalid status', async () => {
      const request = new NextRequest('http://localhost/api/a2a/registry', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: 'agent-1',
          status: 'invalid-status',
        }),
      });

      const response = await PUT(request);
      expect(response.status).toBe(400);
    });

    it('should return 404 for non-existent agent', async () => {
      const request = new NextRequest('http://localhost/api/a2a/registry', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: 'non-existent',
          status: 'busy',
        }),
      });

      const response = await PUT(request);
      expect(response.status).toBe(404);
    });
  });

  describe('Status Updates', () => {
    it('should update agent status to busy', async () => {
      const request = new NextRequest('http://localhost/api/a2a/registry', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: 'agent-1',
          status: 'busy',
        }),
      });

      const response = await PUT(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.data.agent.status).toBe('busy');
    });

    it('should update agent status to idle', async () => {
      const request = new NextRequest('http://localhost/api/a2a/registry', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: 'agent-1',
          status: 'idle',
        }),
      });

      const response = await PUT(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.data.agent.status).toBe('idle');
    });

    it('should update agent status to offline', async () => {
      const request = new NextRequest('http://localhost/api/a2a/registry', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: 'agent-1',
          status: 'offline',
        }),
      });

      const response = await PUT(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.data.agent.status).toBe('offline');
    });

    it('should update agent status to error', async () => {
      const request = new NextRequest('http://localhost/api/a2a/registry', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: 'agent-1',
          status: 'error',
        }),
      });

      const response = await PUT(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.data.agent.status).toBe('error');
    });

    it('should update lastHeartbeat on status change', async () => {
      const beforeUpdate = Date.now();

      const request = new NextRequest('http://localhost/api/a2a/registry', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: 'agent-1',
          status: 'busy',
        }),
      });

      const response = await PUT(request);
      const json = await response.json();

      const afterUpdate = Date.now();

      expect(json.data.agent.lastHeartbeat).toBeGreaterThanOrEqual(beforeUpdate);
      expect(json.data.agent.lastHeartbeat).toBeLessThanOrEqual(afterUpdate);
    });
  });
});

describe('A2A Registry API - DELETE /api/a2a/registry', () => {
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

  describe('Validation', () => {
    it('should return 400 when agentId is missing', async () => {
      const request = new NextRequest('http://localhost/api/a2a/registry', {
        method: 'DELETE',
      });

      const response = await DELETE(request);
      expect(response.status).toBe(400);
    });

    it('should return 404 for non-existent agent', async () => {
      const request = new NextRequest(
        'http://localhost/api/a2a/registry?id=non-existent',
        { method: 'DELETE' }
      );

      const response = await DELETE(request);
      expect(response.status).toBe(404);
    });
  });

  describe('Agent Unregistration', () => {
    it('should unregister an agent successfully', async () => {
      agentScheduler.registerAgent('agent-1', 'Test Agent', 'test', ['cap-a']);

      const request = new NextRequest(
        'http://localhost/api/a2a/registry?id=agent-1',
        { method: 'DELETE' }
      );

      const response = await DELETE(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.message).toBe('Agent unregistered successfully');
    });

    it('should remove agent from registry', async () => {
      agentScheduler.registerAgent('agent-1', 'Test Agent', 'test', ['cap-a']);

      const deleteRequest = new NextRequest(
        'http://localhost/api/a2a/registry?id=agent-1',
        { method: 'DELETE' }
      );

      await DELETE(deleteRequest);

      const agents = agentScheduler.getAllAgents();
      expect(agents.length).toBe(0);
    });

    it('should handle unregistering already removed agent', async () => {
      agentScheduler.registerAgent('agent-1', 'Test Agent', 'test', ['cap-a']);

      const deleteRequest1 = new NextRequest(
        'http://localhost/api/a2a/registry?id=agent-1',
        { method: 'DELETE' }
      );

      await DELETE(deleteRequest1);

      const deleteRequest2 = new NextRequest(
        'http://localhost/api/a2a/registry?id=agent-1',
        { method: 'DELETE' }
      );

      const response2 = await DELETE(deleteRequest2);
      expect(response2.status).toBe(404);
    });
  });
});

describe('A2A Registry API - Integration Tests', () => {
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

  it('should complete full lifecycle: register, update, unregister', async () => {
    // Register
    const postRequest = new NextRequest('http://localhost/api/a2a/registry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Lifecycle Agent',
        type: 'test',
        capabilities: ['cap-a'],
      }),
    });

    const postResponse = await POST(postRequest);
    const postJson = await postResponse.json();
    const agentId = postJson.data.agent.id;

    expect(postResponse.status).toBe(201);

    // Update status
    const putRequest = new NextRequest('http://localhost/api/a2a/registry', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentId,
        status: 'busy',
      }),
    });

    const putResponse = await PUT(putRequest);
    expect(putResponse.status).toBe(200);

    // Unregister
    const deleteRequest = new NextRequest(
      `http://localhost/api/a2a/registry?id=${agentId}`,
      { method: 'DELETE' }
    );

    const deleteResponse = await DELETE(deleteRequest);
    expect(deleteResponse.status).toBe(200);
  });

  it('should list multiple registered agents', async () => {
    await POST(
      new NextRequest('http://localhost/api/a2a/registry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Agent 1',
          type: 'type-a',
          capabilities: ['cap-a'],
        }),
      })
    );

    await POST(
      new NextRequest('http://localhost/api/a2a/registry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Agent 2',
          type: 'type-b',
          capabilities: ['cap-b'],
        }),
      })
    );

    await POST(
      new NextRequest('http://localhost/api/a2a/registry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Agent 3',
          type: 'type-a',
          capabilities: ['cap-a', 'cap-b'],
        }),
      })
    );

    const getRequest = new NextRequest('http://localhost/api/a2a/registry', {
      method: 'GET',
    });

    const getResponse = await GET(getRequest);
    const getJson = await getResponse.json();

    expect(getResponse.status).toBe(200);
    expect(getJson.data.agents.length).toBe(3);
  });
});
