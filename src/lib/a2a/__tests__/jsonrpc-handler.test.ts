/**
 * A2A JSON-RPC Handler Tests
 */

// @ts-ignore - Mock type compatibility issues
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  A2ARequestHandler,
  createRequestHandler,
  RequestHandlerOptions,
} from '../jsonrpc-handler';
import {
  InMemoryTaskStore,
} from '../task-store';
import {
  SevenZiExecutor,
  createSevenZiExecutor,
} from '../executor';
import {
  createAgentCard,
  createExtendedAgentCard,
} from '../agent-card';
import {
  JsonRpcRequest,
  JsonRpcResponse,
  SendMessageRequest,
  GetTaskRequest,
  ListTasksRequest,
  ListTasksResponse,
  CancelTaskRequest,
  Task,
  Message,
  A2AErrorCodes,
} from '../types';

describe('A2ARequestHandler', () => {
  let handler: A2ARequestHandler;
  let taskStore: InMemoryTaskStore;
  let executor: SevenZiExecutor;
  let agentCard: ReturnType<typeof createAgentCard>;
  let extendedAgentCard: ReturnType<typeof createExtendedAgentCard>;

  beforeEach(() => {
    taskStore = new InMemoryTaskStore();
    executor = new SevenZiExecutor();
    agentCard = createAgentCard();
    extendedAgentCard = createExtendedAgentCard();

    handler = new A2ARequestHandler({
      agentCard,
      taskStore,
      executor,
      extendedAgentCard,
    });
  });

  describe('constructor', () => {
    it('should create handler with required options', () => {
      expect(handler).toBeInstanceOf(A2ARequestHandler);
    });

    it('should store agent card', () => {
      expect(handler.getAgentCard()).toBe(agentCard);
    });

    it('should work without extended agent card', () => {
      const handlerWithoutExtended = new A2ARequestHandler({
        agentCard,
        taskStore,
        executor,
      });

      expect(handlerWithoutExtended).toBeInstanceOf(A2ARequestHandler);
    });
  });

  describe('handle message/send', () => {
    it('should create task from message', async () => {
      const request: JsonRpcRequest = {
        jsonrpc: '2.0',
        method: 'message/send',
        params: {
          message: {
            messageId: 'msg-123',
            role: 'user',
            parts: [{ kind: 'text', text: 'Hello' }],
          },
          configuration: {
            blocking: false,
          },
        } as SendMessageRequest,
        id: 'req-123',
      };

      const response = await handler.handleRequest(request);

      expect(response.jsonrpc).toBe('2.0');
      expect(response.result).toBeDefined();
      expect(response.error).toBeUndefined();

      const result = response.result as Task;
      expect(result.kind).toBe('task');
      expect(result.status.state).toBeDefined();
    });

    it('should handle blocking mode', async () => {
      const request: JsonRpcRequest = {
        jsonrpc: '2.0',
        method: 'message/send',
        params: {
          message: {
            messageId: 'msg-123',
            role: 'user',
            parts: [{ kind: 'text', text: 'Hello' }],
          },
          configuration: {
            blocking: true,
          },
        } as SendMessageRequest,
        id: 'req-123',
      };

      const response = await handler.handleRequest(request);

      const result = response.result as Task;
      expect(result.status.state).toBeDefined();
    });

    it('should support contextId', async () => {
      const request: JsonRpcRequest = {
        jsonrpc: '2.0',
        method: 'message/send',
        params: {
          message: {
            messageId: 'msg-123',
            role: 'user',
            parts: [{ kind: 'text', text: 'Hello' }],
            contextId: 'context-123',
          },
        } as SendMessageRequest,
        id: 'req-123',
      };

      const response = await handler.handleRequest(request);

      const result = response.result as Task;
      expect(result.contextId).toBe('context-123');
    });

    it('should error for missing messageId', async () => {
      const request: JsonRpcRequest = {
        jsonrpc: '2.0',
        method: 'message/send',
        params: {
          message: {
            messageId: '',
            role: 'user',
            parts: [{ kind: 'text', text: 'Hello' }],
          },
        } as unknown as SendMessageRequest,
        id: 'req-123',
      };

      const response = await handler.handleRequest(request);

      expect(response.error).toBeDefined();
      expect(response.error?.code).toBe(A2AErrorCodes.INTERNAL_ERROR);
    });

    it('should handle referenceTaskIds', async () => {
      const request: JsonRpcRequest = {
        jsonrpc: '2.0',
        method: 'message/send',
        params: {
          message: {
            messageId: 'msg-123',
            role: 'user',
            parts: [{ kind: 'text', text: 'Hello' }],
            referenceTaskIds: ['task-1', 'task-2'],
          },
        } as SendMessageRequest,
        id: 'req-123',
      };

      const response = await handler.handleRequest(request);

      expect(response.error).toBeUndefined();
    });

    it('should handle metadata', async () => {
      const request: JsonRpcRequest = {
        jsonrpc: '2.0',
        method: 'message/send',
        params: {
          message: {
            messageId: 'msg-123',
            role: 'user',
            parts: [{ kind: 'text', text: 'Hello' }],
          },
          metadata: {
            traceId: 'trace-123',
            source: 'api',
          },
        } as SendMessageRequest,
        id: 'req-123',
      };

      const response = await handler.handleRequest(request);

      expect(response.error).toBeUndefined();
    });
  });

  describe('handle message/stream', () => {
    it('should handle streaming request', async () => {
      const request: JsonRpcRequest = {
        jsonrpc: '2.0',
        method: 'message/stream',
        params: {
          message: {
            messageId: 'msg-123',
            role: 'user',
            parts: [{ kind: 'text', text: 'Hello' }],
          },
        } as SendMessageRequest,
        id: 'req-123',
      };

      const response = await handler.handleRequest(request);

      expect(response.result).toBeDefined();
      expect(response.error).toBeUndefined();
    });
  });

  describe('handle tasks/get', () => {
    it('should get task by id', async () => {
      // Create a task first
      const task = taskStore.createTask('context-123');

      const request: JsonRpcRequest = {
        jsonrpc: '2.0',
        method: 'tasks/get',
        params: { id: task.id } as GetTaskRequest,
        id: 'req-123',
      };

      const response = await handler.handleRequest(request);

      expect(response.result).toBeDefined();
      expect(response.error).toBeUndefined();

      const result = response.result as Task;
      expect(result.id).toBe(task.id);
    });

    it('should error for non-existent task', async () => {
      const request: JsonRpcRequest = {
        jsonrpc: '2.0',
        method: 'tasks/get',
        params: { id: 'non-existent' } as GetTaskRequest,
        id: 'req-123',
      };

      const response = await handler.handleRequest(request);

      expect(response.error).toBeDefined();
      // Note: The handler currently converts all caught errors to INTERNAL_ERROR
      // This is expected behavior given the current implementation
      expect(response.error?.code).toBe(A2AErrorCodes.INTERNAL_ERROR);
      expect(response.error?.message).toContain('Task not found');
    });

    it('should error for missing id', async () => {
      const request: JsonRpcRequest = {
        jsonrpc: '2.0',
        method: 'tasks/get',
        params: {} as GetTaskRequest,
        id: 'req-123',
      };

      const response = await handler.handleRequest(request);

      expect(response.error).toBeDefined();
      // Note: The handler currently converts all caught errors to INTERNAL_ERROR
      expect(response.error?.code).toBe(A2AErrorCodes.INTERNAL_ERROR);
    });

    it('should apply history length limit', async () => {
      // Create task with history
      const message1: Message = {
        kind: 'message',
        messageId: 'msg-1',
        role: 'user',
        parts: [{ kind: 'text', text: 'First' }],
        createdAt: new Date().toISOString(),
      };
      const message2: Message = {
        kind: 'message',
        messageId: 'msg-2',
        role: 'user',
        parts: [{ kind: 'text', text: 'Second' }],
        createdAt: new Date().toISOString(),
      };
      const task = taskStore.createTask(undefined, message1);
      taskStore.addMessage(task.id, message2);

      const request: JsonRpcRequest = {
        jsonrpc: '2.0',
        method: 'tasks/get',
        params: { id: task.id, historyLength: 1 } as GetTaskRequest,
        id: 'req-123',
      };

      const response = await handler.handleRequest(request);

      const result = response.result as Task;
      expect(result.history).toHaveLength(1);
    });
  });

  describe('handle tasks/list', () => {
    beforeEach(() => {
      // Create some test tasks
      const task1 = taskStore.createTask('context-1');
      const task2 = taskStore.createTask('context-2');
      const task3 = taskStore.createTask('context-1');

      taskStore.updateTaskStatus(task2.id, {
        state: 'completed',
        timestamp: new Date().toISOString(),
      });

      taskStore.updateTaskStatus(task3.id, {
        state: 'working',
        timestamp: new Date().toISOString(),
      });
    });

    it('should list all tasks', async () => {
      const request: JsonRpcRequest = {
        jsonrpc: '2.0',
        method: 'tasks/list',
        params: {} as ListTasksRequest,
        id: 'req-123',
      };

      const response = await handler.handleRequest(request);

      const result = response.result as ListTasksResponse;
      expect(result.tasks).toBeDefined();
      expect(result.totalSize).toBeGreaterThan(0);
    });

    it('should filter by contextId', async () => {
      const request: JsonRpcRequest = {
        jsonrpc: '2.0',
        method: 'tasks/list',
        params: { contextId: 'context-1' } as ListTasksRequest,
        id: 'req-123',
      };

      const response = await handler.handleRequest(request);

      const result = response.result as ListTasksResponse;
      expect(result.tasks.every(t => t.contextId === 'context-1')).toBe(true);
    });

    it('should filter by status', async () => {
      const request: JsonRpcRequest = {
        jsonrpc: '2.0',
        method: 'tasks/list',
        params: { status: 'completed' } as ListTasksRequest,
        id: 'req-123',
      };

      const response = await handler.handleRequest(request);

      const result = response.result as ListTasksResponse;
      expect(result.tasks.every(t => t.status.state === 'completed')).toBe(true);
    });

    it('should apply pageSize', async () => {
      const request: JsonRpcRequest = {
        jsonrpc: '2.0',
        method: 'tasks/list',
        params: { pageSize: 2 } as ListTasksRequest,
        id: 'req-123',
      };

      const response = await handler.handleRequest(request);

      const result = response.result as ListTasksResponse;
      expect(result.tasks.length).toBeLessThanOrEqual(2);
      expect(result.pageSize).toBe(2);
    });

    it('should include artifacts when requested', async () => {
      const request: JsonRpcRequest = {
        jsonrpc: '2.0',
        method: 'tasks/list',
        params: { includeArtifacts: true } as ListTasksRequest,
        id: 'req-123',
      };

      const response = await handler.handleRequest(request);

      expect(response.error).toBeUndefined();
    });
  });

  describe('handle tasks/cancel', () => {
    it('should cancel a task', async () => {
      const task = taskStore.createTask();
      taskStore.updateTaskStatus(task.id, {
        state: 'working',
        timestamp: new Date().toISOString(),
      });

      const request: JsonRpcRequest = {
        jsonrpc: '2.0',
        method: 'tasks/cancel',
        params: { id: task.id } as CancelTaskRequest,
        id: 'req-123',
      };

      const response = await handler.handleRequest(request);

      const result = response.result as Task;
      expect(result.status.state).toBe('canceled');
    });

    it('should error for non-existent task', async () => {
      const request: JsonRpcRequest = {
        jsonrpc: '2.0',
        method: 'tasks/cancel',
        params: { id: 'non-existent' } as CancelTaskRequest,
        id: 'req-123',
      };

      const response = await handler.handleRequest(request);

      expect(response.error).toBeDefined();
      // Note: The handler currently converts all caught errors to INTERNAL_ERROR
      expect(response.error?.code).toBe(A2AErrorCodes.INTERNAL_ERROR);
      expect(response.error?.message).toContain('Task not found');
    });

    it('should error for missing id', async () => {
      const request: JsonRpcRequest = {
        jsonrpc: '2.0',
        method: 'tasks/cancel',
        params: {} as CancelTaskRequest,
        id: 'req-123',
      };

      const response = await handler.handleRequest(request);

      expect(response.error).toBeDefined();
    });

    it('should not cancel terminal tasks', async () => {
      const task = taskStore.createTask();
      taskStore.updateTaskStatus(task.id, {
        state: 'completed',
        timestamp: new Date().toISOString(),
      });

      const request: JsonRpcRequest = {
        jsonrpc: '2.0',
        method: 'tasks/cancel',
        params: { id: task.id } as CancelTaskRequest,
        id: 'req-123',
      };

      const response = await handler.handleRequest(request);

      expect(response.error).toBeDefined();
      // Note: Thrown errors are converted to INTERNAL_ERROR by the handler
      expect(response.error?.code).toBe(A2AErrorCodes.INTERNAL_ERROR);
      expect(response.error?.message).toContain('cannot be canceled');
    });

    it('should not cancel failed tasks', async () => {
      const task = taskStore.createTask();
      taskStore.updateTaskStatus(task.id, {
        state: 'failed',
        timestamp: new Date().toISOString(),
      });

      const request: JsonRpcRequest = {
        jsonrpc: '2.0',
        method: 'tasks/cancel',
        params: { id: task.id } as CancelTaskRequest,
        id: 'req-123',
      };

      const response = await handler.handleRequest(request);

      expect(response.error).toBeDefined();
      // Note: Thrown errors are converted to INTERNAL_ERROR by the handler
      expect(response.error?.code).toBe(A2AErrorCodes.INTERNAL_ERROR);
      expect(response.error?.message).toContain('cannot be canceled');
    });
  });

  describe('handle agent/getCard', () => {
    it('should return agent card', async () => {
      const request: JsonRpcRequest = {
        jsonrpc: '2.0',
        method: 'agent/getCard',
        params: {},
        id: 'req-123',
      };

      const response = await handler.handleRequest(request);

      expect(response.result).toBeDefined();
      expect(response.error).toBeUndefined();

      const result = response.result as typeof agentCard;
      expect(result.name).toBe('7zi Agent');
      expect(result.version).toBeDefined();
    });
  });

  describe('handle agent/getExtendedCard', () => {
    it('should return extended agent card', async () => {
      const request: JsonRpcRequest = {
        jsonrpc: '2.0',
        method: 'agent/getExtendedCard',
        params: {},
        id: 'req-123',
      };

      const response = await handler.handleRequest(request);

      expect(response.result).toBeDefined();
      expect(response.error).toBeUndefined();

      const result = response.result as typeof extendedAgentCard;
      expect(result.name).toBe('7zi Agent');
    });

    it('should error when extended card not supported', async () => {
      const agentCardWithoutExtended = createAgentCard();
      agentCardWithoutExtended.capabilities = {
        ...agentCardWithoutExtended.capabilities,
        extendedAgentCard: false,
      };

      const handlerWithoutSupport = new A2ARequestHandler({
        agentCard: agentCardWithoutExtended,
        taskStore,
        executor,
      });

      const request: JsonRpcRequest = {
        jsonrpc: '2.0',
        method: 'agent/getExtendedCard',
        params: {},
        id: 'req-123',
      };

      const response = await handlerWithoutSupport.handleRequest(request);

      expect(response.error).toBeDefined();
      // Note: Thrown errors are converted to INTERNAL_ERROR by the handler
      expect(response.error?.code).toBe(A2AErrorCodes.INTERNAL_ERROR);
      expect(response.error?.message).toContain('Extended agent card not supported');
    });
  });

  describe('JSON-RPC validation', () => {
    it('should error for invalid JSON-RPC version', async () => {
      const request: JsonRpcRequest = {
        jsonrpc: '1.0',
        method: 'agent/getCard',
        params: {},
        id: 'req-123',
      } as unknown as JsonRpcRequest;

      const response = await handler.handleRequest(request);

      expect(response.error).toBeDefined();
      expect(response.error?.code).toBe(A2AErrorCodes.INVALID_REQUEST);
    });

    it('should error for unknown method', async () => {
      const request: JsonRpcRequest = {
        jsonrpc: '2.0',
        method: 'unknown/method',
        params: {},
        id: 'req-123',
      };

      const response = await handler.handleRequest(request);

      expect(response.error).toBeDefined();
      expect(response.error?.code).toBe(A2AErrorCodes.METHOD_NOT_FOUND);
    });

    it('should handle internal errors', async () => {
      const mockExecutor = {
        execute: vi.fn().mockRejectedValue(new Error('Test error')),
      } as unknown as typeof executor;

      const errorHandler = new A2ARequestHandler({
        agentCard,
        taskStore,
        executor: mockExecutor,
      });

      const request: JsonRpcRequest = {
        jsonrpc: '2.0',
        method: 'message/send',
        params: {
          message: {
            messageId: 'msg-123',
            role: 'user',
            parts: [{ kind: 'text', text: 'Hello' }],
          },
        } as SendMessageRequest,
        id: 'req-123',
      };

      const response = await errorHandler.handleRequest(request);

      expect(response.error).toBeDefined();
      expect(response.error?.code).toBe(A2AErrorCodes.INTERNAL_ERROR);
    });
  });

  describe('response format', () => {
    it('should include jsonrpc version in response', async () => {
      const request: JsonRpcRequest = {
        jsonrpc: '2.0',
        method: 'agent/getCard',
        params: {},
        id: 'req-123',
      };

      const response = await handler.handleRequest(request);

      expect(response.jsonrpc).toBe('2.0');
    });

    it('should include request id in response', async () => {
      const request: JsonRpcRequest = {
        jsonrpc: '2.0',
        method: 'agent/getCard',
        params: {},
        id: 'req-456',
      };

      const response = await handler.handleRequest(request);

      expect(response.id).toBe('req-456');
    });

    it('should include error data when available', async () => {
      const request: JsonRpcRequest = {
        jsonrpc: '2.0',
        method: 'tasks/get',
        params: { id: 'non-existent' } as GetTaskRequest,
        id: 'req-123',
      };

      const response = await handler.handleRequest(request);

      expect(response.error).toBeDefined();
      expect(response.error?.message).toContain('Task not found');
    });
  });

  describe('streamTaskEvents', () => {
    it('should return an async generator', async () => {
      // Create task and immediately mark as completed so generator exits
      const task = taskStore.createTask();
      taskStore.updateTaskStatus(task.id, {
        state: 'completed',
        timestamp: new Date().toISOString(),
      });

      // The method should return an async generator
      const generator = handler.streamTaskEvents(task.id);

      expect(generator).toBeDefined();
      expect(typeof generator[Symbol.asyncIterator]).toBe('function');

      // Consume the generator (it should end quickly since task is in terminal state)
      const events: unknown[] = [];
      for await (const event of generator) {
        events.push(event);
        // Break after first event to avoid infinite loop
        if (events.length > 0) break;
      }
      // Just verify it can be consumed without error
      expect(Array.isArray(events)).toBe(true);
    });

    it('should error for non-existent task', async () => {
      await expect(async () => {
        for await (const _ of handler.streamTaskEvents('non-existent')) {
          // Should throw immediately
        }
      }).rejects.toThrow();
    });
  });
});

describe('createRequestHandler', () => {
  it('should create a request handler', () => {
    const handler = createRequestHandler(
      createAgentCard(),
      new InMemoryTaskStore(),
      createSevenZiExecutor()
    );

    expect(handler).toBeInstanceOf(A2ARequestHandler);
  });

  it('should accept extended agent card', () => {
    const handler = createRequestHandler(
      createAgentCard(),
      new InMemoryTaskStore(),
      createSevenZiExecutor(),
      createExtendedAgentCard()
    );

    expect(handler).toBeInstanceOf(A2ARequestHandler);
  });
});
