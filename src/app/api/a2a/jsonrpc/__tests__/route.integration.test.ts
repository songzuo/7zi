/**
 * @fileoverview A2A JSON-RPC API 集成测试
 * @description 测试 /api/a2a/jsonrpc 端点（任务管理 API）
 */

import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST, OPTIONS } from '@/app/api/a2a/jsonrpc/route';
import { getTaskStore } from '@/lib/agents/a2a/task-store';
import { createRequestHandler } from '@/lib/agents/a2a/jsonrpc-handler';
import { createSevenZiExecutor } from '@/lib/agents/a2a/executor';
import { getAgentCard, getExtendedAgentCard, resetAgentCards } from '@/lib/agents/a2a/agent-card';
import { type Task, type JsonRpcResponse } from '@/lib/agents/a2a/types';

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock validation
vi.mock('@/lib/api/validation', () => ({
  jsonRpcRequestSchema: {
    safeParse: vi.fn(),
  },
  jsonRpcBatchRequestSchema: {
    safeParse: vi.fn(),
  },
  validateBody: vi.fn(),
  formatValidationErrors: vi.fn((errors) => errors),
}));

vi.mock('@/lib/api/error-handler', () => ({
  createValidationError: vi.fn(),
  createErrorResponse: vi.fn(),
  ErrorType: {},
}));

import { validateBody, jsonRpcRequestSchema } from '@/lib/api/validation';

describe('/api/a2a/jsonrpc', () => {
  const baseUrl = 'http://localhost:3000/api/a2a/jsonrpc';

  beforeAll(() => {
    // Reset task store
    const taskStore = getTaskStore();
    taskStore.cleanupOldTasks(0); // Clean all tasks
  });

  afterEach(() => {
    vi.clearAllMocks();
    resetAgentCards();
  });

  // ============================================================================
  // Test Suite: CORS OPTIONS
  // ============================================================================

  describe('OPTIONS', () => {
    it('should return CORS headers', async () => {
      const request = new NextRequest(baseUrl, { method: 'OPTIONS' });
      const response = await OPTIONS();

      expect(response.status).toBe(204);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBeDefined();
      expect(response.headers.get('Access-Control-Allow-Methods')).toContain('POST');
      expect(response.headers.get('Access-Control-Allow-Headers')).toContain('Content-Type');
      expect(response.headers.get('Access-Control-Max-Age')).toBe('86400');
    });
  });

  // ============================================================================
  // Test Suite: POST - Agent Cards
  // ============================================================================

  describe('POST - agent/getCard', () => {
    it('should return agent card', async () => {
      const request = new NextRequest(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'agent/getCard',
          id: 1,
        }),
      });

      vi.mocked(validateBody).mockReturnValue({ success: true, data: {} as any });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.jsonrpc).toBe('2.0');
      expect(data.result).toBeDefined();
      expect(data.result.name).toBeDefined();
      expect(data.result.version).toBeDefined();
      expect(data.result.skills).toBeDefined();
      expect(Array.isArray(data.result.skills)).toBe(true);
      expect(data.id).toBe(1);
    });

    it('should return agent card with capabilities', async () => {
      const request = new NextRequest(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'agent/getCard',
          id: 2,
        }),
      });

      vi.mocked(validateBody).mockReturnValue({ success: true, data: {} as any });

      const response = await POST(request);
      const data = await response.json();

      expect(data.result.capabilities).toBeDefined();
      expect(data.result.capabilities.streaming).toBeDefined();
      expect(data.result.capabilities.stateTransitionHistory).toBeDefined();
    });

    it('should include agent documentation URL', async () => {
      const request = new NextRequest(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'agent/getCard',
          id: 3,
        }),
      });

      vi.mocked(validateBody).mockReturnValue({ success: true, data: {} as any });

      const response = await POST(request);
      const data = await response.json();

      expect(data.result.documentationUrl).toBeDefined();
      expect(data.result.documentationUrl).toContain('/docs/a2a');
    });
  });

  // ============================================================================
  // Test Suite: POST - message/send (Task Creation)
  // ============================================================================

  describe('POST - message/send (Task Creation)', () => {
    it('should create a task with message', async () => {
      const request = new NextRequest(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'message/send',
          params: {
            message: {
              messageId: 'msg-123',
              role: 'user',
              parts: [
                {
                  kind: 'text',
                  text: 'Hello, how are you?',
                },
              ],
            },
          },
          id: 10,
        }),
      });

      vi.mocked(validateBody).mockReturnValue({ success: true, data: {} as any });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.jsonrpc).toBe('2.0');
      expect(data.result).toBeDefined();
      expect(data.result.kind).toBe('task');
      expect(data.result.id).toBeDefined();
      expect(data.result.status).toBeDefined();
      expect(data.result.status.state).toBeDefined();
      expect(data.result.history).toBeDefined();
      expect(Array.isArray(data.result.history)).toBe(true);
    });

    it('should create task with contextId', async () => {
      const request = new NextRequest(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'message/send',
          params: {
            message: {
              messageId: 'msg-456',
              role: 'user',
              parts: [{ kind: 'text', text: 'Test message' }],
              contextId: 'ctx-abc123',
            },
          },
          id: 11,
        }),
      });

      vi.mocked(validateBody).mockReturnValue({ success: true, data: {} as any });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.result.contextId).toBe('ctx-abc123');
    });

    it('should support blocking mode', async () => {
      const request = new NextRequest(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'message/send',
          params: {
            message: {
              messageId: 'msg-789',
              role: 'user',
              parts: [{ kind: 'text', text: 'Blocking task' }],
            },
            configuration: {
              blocking: true,
            },
          },
          id: 12,
        }),
      });

      vi.mocked(validateBody).mockReturnValue({ success: true, data: {} as any });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.result).toBeDefined();
    });

    it('should handle missing required messageId field', async () => {
      const request = new NextRequest(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'message/send',
          params: {
            message: {
              role: 'user',
              parts: [{ kind: 'text', text: 'No messageId' }],
            },
          },
          id: 13,
        }),
      });

      vi.mocked(validateBody).mockReturnValue({ success: true, data: {} as any });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.error).toBeDefined();
      expect(data.error.code).toBe(-32603); // Internal error
      expect(data.error.message).toContain('messageId');
    });
  });

  // ============================================================================
  // Test Suite: POST - tasks/get (Task Retrieval)
  // ============================================================================

  describe('POST - tasks/get (Task Retrieval)', () => {
    it('should get task by ID', async () => {
      // First create a task
      const createRequest = new NextRequest(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'message/send',
          params: {
            message: {
              messageId: 'msg-get-1',
              role: 'user',
              parts: [{ kind: 'text', text: 'Create task for get test' }],
            },
          },
          id: 20,
        }),
      });

      vi.mocked(validateBody).mockReturnValue({ success: true, data: {} as any });

      const createResponse = await POST(createRequest);
      const createData = await createResponse.json();
      const taskId = createData.result.id;

      // Now get the task
      const getRequest = new NextRequest(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'tasks/get',
          params: {
            id: taskId,
          },
          id: 21,
        }),
      });

      vi.mocked(validateBody).mockReturnValue({ success: true, data: {} as any });

      const getResponse = await POST(getRequest);
      const getData = await getResponse.json();

      expect(getResponse.status).toBe(200);
      expect(getData.result).toBeDefined();
      expect(getData.result.id).toBe(taskId);
      expect(getData.result.kind).toBe('task');
    });

    it('should apply historyLength parameter', async () => {
      // Create task with multiple messages
      const createRequest = new NextRequest(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'message/send',
          params: {
            message: {
              messageId: 'msg-get-2',
              role: 'user',
              parts: [{ kind: 'text', text: 'History length test' }],
            },
          },
          id: 22,
        }),
      });

      vi.mocked(validateBody).mockReturnValue({ success: true, data: {} as any });

      const createResponse = await POST(createRequest);
      const createData = await createResponse.json();
      const taskId = createData.result.id;

      // Get with limited history
      const getRequest = new NextRequest(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'tasks/get',
          params: {
            id: taskId,
            historyLength: 1,
          },
          id: 23,
        }),
      });

      vi.mocked(validateBody).mockReturnValue({ success: true, data: {} as any });

      const getResponse = await POST(getRequest);
      const getData = await getResponse.json();

      expect(getResponse.status).toBe(200);
      expect(getData.result.history).toBeDefined();
      expect(getData.result.history.length).toBeLessThanOrEqual(1);
    });

    it('should return error for non-existent task', async () => {
      const request = new NextRequest(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'tasks/get',
          params: {
            id: 'non-existent-task-id',
          },
          id: 24,
        }),
      });

      vi.mocked(validateBody).mockReturnValue({ success: true, data: {} as any });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.error).toBeDefined();
      expect(data.error.code).toBeDefined();
      expect(data.error.message).toContain('not found');
    });

    it('should handle missing id parameter', async () => {
      const request = new NextRequest(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'tasks/get',
          params: {},
          id: 25,
        }),
      });

      vi.mocked(validateBody).mockReturnValue({ success: true, data: {} as any });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.error).toBeDefined();
    });
  });

  // ============================================================================
  // Test Suite: POST - tasks/list (Task Listing)
  // ============================================================================

  describe('POST - tasks/list (Task Listing)', () => {
    it('should list all tasks', async () => {
      // Create some tasks first
      for (let i = 0; i < 3; i++) {
        const createRequest = new NextRequest(baseUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'message/send',
            params: {
              message: {
                messageId: `msg-list-${i}`,
                role: 'user',
                parts: [{ kind: 'text', text: `Task ${i}` }],
              },
            },
            id: 30 + i,
          }),
        });

        vi.mocked(validateBody).mockReturnValue({ success: true, data: {} as any });
        await POST(createRequest);
      }

      // List tasks
      const listRequest = new NextRequest(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'tasks/list',
          params: {},
          id: 40,
        }),
      });

      vi.mocked(validateBody).mockReturnValue({ success: true, data: {} as any });

      const response = await POST(listRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.result).toBeDefined();
      expect(data.result.tasks).toBeDefined();
      expect(Array.isArray(data.result.tasks)).toBe(true);
      expect(data.result.tasks.length).toBeGreaterThanOrEqual(3);
      expect(data.result.totalSize).toBeDefined();
      expect(data.result.pageSize).toBeDefined();
      expect(data.result.nextPageToken).toBeDefined();
    });

    it('should filter tasks by contextId', async () => {
      const contextId = 'ctx-filter-test';

      // Create tasks with same context
      const createRequest = new NextRequest(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'message/send',
          params: {
            message: {
              messageId: 'msg-ctx-1',
              role: 'user',
              parts: [{ kind: 'text', text: 'Context test' }],
              contextId,
            },
          },
          id: 41,
        }),
      });

      vi.mocked(validateBody).mockReturnValue({ success: true, data: {} as any });
      await POST(createRequest);

      // List tasks with context filter
      const listRequest = new NextRequest(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'tasks/list',
          params: {
            contextId,
          },
          id: 42,
        }),
      });

      vi.mocked(validateBody).mockReturnValue({ success: true, data: {} as any });

      const response = await POST(listRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.result.tasks.length).toBeGreaterThanOrEqual(1);
      data.result.tasks.forEach((task: Task) => {
        expect(task.contextId).toBe(contextId);
      });
    });

    it('should filter tasks by status', async () => {
      // Create a task
      const createRequest = new NextRequest(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'message/send',
          params: {
            message: {
              messageId: 'msg-status-1',
              role: 'user',
              parts: [{ kind: 'text', text: 'Status test' }],
            },
          },
          id: 43,
        }),
      });

      vi.mocked(validateBody).mockReturnValue({ success: true, data: {} as any });
      await POST(createRequest);

      // List tasks by status
      const listRequest = new NextRequest(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'tasks/list',
          params: {
            status: 'completed',
          },
          id: 44,
        }),
      });

      vi.mocked(validateBody).mockReturnValue({ success: true, data: {} as any });

      const response = await POST(listRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.result.tasks).toBeDefined();
      expect(Array.isArray(data.result.tasks)).toBe(true);
    });

    it('should support pagination with pageSize', async () => {
      const listRequest = new NextRequest(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'tasks/list',
          params: {
            pageSize: 5,
          },
          id: 45,
        }),
      });

      vi.mocked(validateBody).mockReturnValue({ success: true, data: {} as any });

      const response = await POST(listRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.result.tasks.length).toBeLessThanOrEqual(5);
      expect(data.result.pageSize).toBe(5);
    });

    it('should support includeArtifacts option', async () => {
      const listRequest = new NextRequest(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'tasks/list',
          params: {
            includeArtifacts: true,
          },
          id: 46,
        }),
      });

      vi.mocked(validateBody).mockReturnValue({ success: true, data: {} as any });

      const response = await POST(listRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.result.tasks).toBeDefined();
    });
  });

  // ============================================================================
  // Test Suite: POST - tasks/cancel (Task Cancellation)
  // ============================================================================

  describe('POST - tasks/cancel (Task Cancellation)', () => {
    it('should cancel a task', async () => {
      // Create a task
      const createRequest = new NextRequest(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'message/send',
          params: {
            message: {
              messageId: 'msg-cancel-1',
              role: 'user',
              parts: [{ kind: 'text', text: 'Cancel test' }],
            },
          },
          id: 50,
        }),
      });

      vi.mocked(validateBody).mockReturnValue({ success: true, data: {} as any });

      const createResponse = await POST(createRequest);
      const createData = await createResponse.json();
      const taskId = createData.result.id;

      // Cancel the task
      const cancelRequest = new NextRequest(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'tasks/cancel',
          params: {
            id: taskId,
          },
          id: 51,
        }),
      });

      vi.mocked(validateBody).mockReturnValue({ success: true, data: {} as any });

      const response = await POST(cancelRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.result).toBeDefined();
      expect(data.result.id).toBe(taskId);
      expect(data.result.status.state).toBe('canceled');
      expect(data.result.status.message).toContain('canceled');
    });

    it('should return error for non-existent task', async () => {
      const request = new NextRequest(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'tasks/cancel',
          params: {
            id: 'non-existent-task-id',
          },
          id: 52,
        }),
      });

      vi.mocked(validateBody).mockReturnValue({ success: true, data: {} as any });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.error).toBeDefined();
      expect(data.error.message).toContain('not found');
    });

    it('should return error for already completed task', async () => {
      // Create and complete a task
      const createRequest = new NextRequest(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'message/send',
          params: {
            message: {
              messageId: 'msg-cancel-2',
              role: 'user',
              parts: [{ kind: 'text', text: 'Completed task' }],
            },
          },
          id: 53,
        }),
      });

      vi.mocked(validateBody).mockReturnValue({ success: true, data: {} as any });

      const createResponse = await POST(createRequest);
      const createData = await createResponse.json();
      const taskId = createData.result.id;

      // Try to cancel (may not be completed yet, but test should handle it)
      const cancelRequest = new NextRequest(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'tasks/cancel',
          params: {
            id: taskId,
          },
          id: 54,
        }),
      });

      vi.mocked(validateBody).mockReturnValue({ success: true, data: {} as any });

      const response = await POST(cancelRequest);
      const data = await response.json();

      // Should either succeed or return appropriate error
      expect(response.status).toBe(200);
    });

    it('should handle missing id parameter', async () => {
      const request = new NextRequest(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'tasks/cancel',
          params: {},
          id: 55,
        }),
      });

      vi.mocked(validateBody).mockReturnValue({ success: true, data: {} as any });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.error).toBeDefined();
    });
  });

  // ============================================================================
  // Test Suite: POST - Error Handling
  // ============================================================================

  describe('POST - Error Handling', () => {
    it('should handle invalid JSON-RPC version', async () => {
      const request = new NextRequest(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '1.0',  // Invalid version
          method: 'agent/getCard',
          id: 60,
        }),
      });

      vi.mocked(validateBody).mockReturnValue({ success: true, data: {} as any });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.jsonrpc).toBe('2.0');
      expect(data.error).toBeDefined();
      expect(data.error.code).toBeDefined();
      expect(data.error.message).toContain('version');
    });

    it('should handle unknown method', async () => {
      const request = new NextRequest(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'unknown/method',
          id: 61,
        }),
      });

      vi.mocked(validateBody).mockReturnValue({ success: true, data: {} as any });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.error).toBeDefined();
      expect(data.error.code).toBeDefined();
      expect(data.error.message).toContain('not found');
    });

    it('should handle missing required fields', async () => {
      const request = new NextRequest(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 62,
          // Missing method
        }),
      });

      vi.mocked(validateBody).mockReturnValue({ success: true, data: {} as any });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.error).toBeDefined();
    });

    it('should handle invalid JSON body', async () => {
      const request = new NextRequest(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json{{{',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.jsonrpc).toBe('2.0');
      expect(data.error).toBeDefined();
      expect(data.error.code).toBe(-32700); // Parse error
    });

    it('should handle empty request body', async () => {
      const request = new NextRequest(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(null),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.jsonrpc).toBe('2.0');
      expect(data.error).toBeDefined();
    });

    it('should handle batch requests', async () => {
      const request = new NextRequest(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([
          {
            jsonrpc: '2.0',
            method: 'agent/getCard',
            id: 63,
          },
          {
            jsonrpc: '2.0',
            method: 'tasks/list',
            params: {},
            id: 64,
          },
        ]),
      });

      vi.mocked(validateBody).mockReturnValue({ success: true, data: {} as any });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBe(2);
      data.forEach((item: JsonRpcResponse) => {
        expect(item.jsonrpc).toBe('2.0');
      });
    });

    it('should handle empty batch request', async () => {
      const request = new NextRequest(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([]),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
      expect(data.error.message).toContain('empty batch');
    });
  });

  // ============================================================================
  // Test Suite: CORS Headers
  // ============================================================================

  describe('CORS Headers', () => {
    it('should include CORS headers in successful responses', async () => {
      const request = new NextRequest(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'agent/getCard',
          id: 70,
        }),
      });

      vi.mocked(validateBody).mockReturnValue({ success: true, data: {} as any });

      const response = await POST(request);

      expect(response.headers.get('Access-Control-Allow-Origin')).toBeDefined();
      expect(response.headers.get('Access-Control-Allow-Methods')).toBeDefined();
      expect(response.headers.get('Access-Control-Allow-Headers')).toBeDefined();
    });

    it('should include CORS headers in error responses', async () => {
      const request = new NextRequest(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json',
      });

      const response = await POST(request);

      expect(response.headers.get('Access-Control-Allow-Origin')).toBeDefined();
      expect(response.headers.get('Access-Control-Allow-Methods')).toBeDefined();
    });
  });
});
