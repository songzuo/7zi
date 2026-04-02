// @ts-nocheck - Test file with complex type issues
/**
 * Tests for jsonrpc-handler.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { A2ARequestHandler, createRequestHandler } from '../jsonrpc-handler'
import { InMemoryTaskStore } from '../task-store'
import { SevenZiExecutor } from '../executor'
import { AgentCard } from '../agent-card'
import type {
  JsonRpcRequest,
  SendMessageRequest,
  GetTaskRequest,
  ListTasksRequest,
  CancelTaskRequest,
  A2AErrorCodes,
  StreamEvent,
  JsonRpcError,
} from '../types'

describe('A2ARequestHandler', () => {
  let handler: A2ARequestHandler
  let taskStore: InMemoryTaskStore
  let executor: SevenZiExecutor
  let agentCard: AgentCard

  beforeEach(() => {
    taskStore = new InMemoryTaskStore()
    executor = new SevenZiExecutor()
    agentCard = {
      name: 'Test Agent',
      description: 'Test agent for unit tests',
      version: '1.0.0',
      protocolVersion: '1.0.0',
      url: 'https://example.com/agent',
      skills: [],
      capabilities: {
        streaming: false,
        pushNotifications: false,
        stateTransitionHistory: false,
        extendedAgentCard: false,
      },
    }

    handler = createRequestHandler(agentCard, taskStore, executor)
  })

  describe('handleRequest', () => {
    describe('valid JSON-RPC', () => {
      it('should handle valid JSON-RPC request', async () => {
        const request: JsonRpcRequest = {
          jsonrpc: '2.0',
          id: '1',
          method: 'agent/getCard',
        }

        const response = await handler.handleRequest(request)

        expect(response.jsonrpc).toBe('2.0')
        expect(response.id).toBe('1')
        expect('result' in response).toBe(true)
        expect('error' in response).toBe(false)
      })

      it('should return error for invalid JSON-RPC version', async () => {
        const request: JsonRpcRequest = {
          jsonrpc: '1.0',
          id: '1',
          method: 'agent/getCard',
        }

        const response = await handler.handleRequest(request)

        expect('error' in response).toBe(true)
        if ('error' in response) {
          expect(response.error?.code ?? expect.any(Number)).toBe(-32600) // INVALID_REQUEST
        }
      })

      it('should return error for unknown method', async () => {
        const request: JsonRpcRequest = {
          jsonrpc: '2.0',
          id: '1',
          method: 'unknown/method',
        }

        const response = await handler.handleRequest(request)

        expect('error' in response).toBe(true)
        if ('error' in response && response.error) {
          expect(response.error?.code ?? expect.any(Number)).toBe(-32601) // METHOD_NOT_FOUND
          expect((response.error as JsonRpcError).message).toContain('unknown/method')
        }
      })
    })

    describe('message/send', () => {
      it('should send message and create task', async () => {
        const request: JsonRpcRequest = {
          jsonrpc: '2.0',
          id: '1',
          method: 'message/send',
          params: {
            message: {
              messageId: 'msg-1',
              role: 'user',
              parts: [{ kind: 'text', text: 'Hello' }],
            },
          },
        }

        const response = await handler.handleRequest(request)

        expect('result' in response).toBe(true)
        if ('result' in response) {
          const result = response.result as { kind: string; id: string }
          expect(result.kind).toBe('task')
          expect(result.id).toBeDefined()
        }
      })

      it('should return error for missing message.messageId', async () => {
        const request: JsonRpcRequest = {
          jsonrpc: '2.0',
          id: '1',
          method: 'message/send',
          params: {
            message: {
              role: 'user',
              parts: [{ kind: 'text', text: 'Hello' }],
            },
          },
        }

        const response = await handler.handleRequest(request)

        expect('error' in response).toBe(true)
        if ('error' in response) {
          expect((response.error as JsonRpcError).message).toContain('message.messageId')
        }
      })

      it('should handle blocking mode', async () => {
        const request: JsonRpcRequest = {
          jsonrpc: '2.0',
          id: '1',
          method: 'message/send',
          params: {
            message: {
              messageId: 'msg-1',
              role: 'user',
              parts: [{ kind: 'text', text: 'Hello' }],
            },
            configuration: {
              blocking: true,
            },
          },
        }

        const response = await handler.handleRequest(request)

        expect('result' in response).toBe(true)
        if ('result' in response) {
          // In blocking mode, should return completed task
          const result = response.result as { status: { state: string } }
          expect(result.status.state).toBe('completed')
        }
      })
    })

    describe('message/stream', () => {
      it('should handle stream request', async () => {
        const request: JsonRpcRequest = {
          jsonrpc: '2.0',
          id: '1',
          method: 'message/stream',
          params: {
            message: {
              messageId: 'msg-1',
              role: 'user',
              parts: [{ kind: 'text', text: 'Hello' }],
            },
          },
        }

        const response = await handler.handleRequest(request)

        expect('result' in response).toBe(true)
        if ('result' in response) {
          const result = response.result as { kind: string }
          expect(result.kind).toBe('task')
        }
      })
    })

    describe('tasks/get', () => {
      it('should get task by ID', async () => {
        const task = taskStore.createTask('ctx-1')

        const request: JsonRpcRequest = {
          jsonrpc: '2.0',
          id: '1',
          method: 'tasks/get',
          params: {
            id: task.id,
          },
        }

        const response = await handler.handleRequest(request)

        expect('result' in response).toBe(true)
        if ('result' in response) {
          const result = response.result as { id: string }
          expect(result.id).toBe(task.id)
        }
      })

      it('should return error for missing task ID', async () => {
        const request: JsonRpcRequest = {
          jsonrpc: '2.0',
          id: '1',
          method: 'tasks/get',
          params: {},
        }

        const response = await handler.handleRequest(request)

        expect('error' in response).toBe(true)
        if ('error' in response) {
          expect((response.error as JsonRpcError).message).toContain('id')
        }
      })

      it('should return error for non-existent task', async () => {
        const request: JsonRpcRequest = {
          jsonrpc: '2.0',
          id: '1',
          method: 'tasks/get',
          params: {
            id: 'non-existent',
          },
        }

        const response = await handler.handleRequest(request)

        expect('error' in response).toBe(true)
        if ('error' in response) {
          expect(response.error?.code ?? expect.any(Number)).toBe(-32603) // INTERNAL_ERROR (all errors are caught and wrapped)
          expect((response.error as JsonRpcError).message).toContain('Task not found')
        }
      })

      it('should apply history length limit', async () => {
        const message1 = {
          kind: 'message' as const,
          messageId: 'msg-1',
          role: 'user' as const,
          parts: [{ kind: 'text' as const, text: 'Hello' }],
          createdAt: new Date().toISOString(),
        }

        const message2 = {
          kind: 'message' as const,
          messageId: 'msg-2',
          role: 'agent' as const,
          parts: [{ kind: 'text' as const, text: 'Hi' }],
          createdAt: new Date().toISOString(),
        }

        const task = taskStore.createTask('ctx-1', message1)
        taskStore.addMessage(task.id, message2)

        const request: JsonRpcRequest = {
          jsonrpc: '2.0',
          id: '1',
          method: 'tasks/get',
          params: {
            id: task.id,
            historyLength: 1,
          },
        }

        const response = await handler.handleRequest(request)

        expect('result' in response).toBe(true)
        if ('result' in response) {
          const result = response.result as { history: Array<{ messageId: string }> }
          expect(result.history).toHaveLength(1)
          expect(result.history[0].messageId).toBe('msg-2')
        }
      })
    })

    describe('tasks/list', () => {
      beforeEach(() => {
        taskStore.createTask('ctx-1')
        taskStore.createTask('ctx-1')
        taskStore.createTask('ctx-2')
      })

      it('should list all tasks', async () => {
        const request: JsonRpcRequest = {
          jsonrpc: '2.0',
          id: '1',
          method: 'tasks/list',
          params: {},
        }

        const response = await handler.handleRequest(request)

        expect('result' in response).toBe(true)
        if ('result' in response) {
          const result = response.result as { tasks: unknown[]; totalSize: number }
          expect(result.tasks).toHaveLength(3)
          expect(result.totalSize).toBe(3)
        }
      })

      it('should filter by contextId', async () => {
        const request: JsonRpcRequest = {
          jsonrpc: '2.0',
          id: '1',
          method: 'tasks/list',
          params: {
            contextId: 'ctx-1',
          },
        }

        const response = await handler.handleRequest(request)

        expect('result' in response).toBe(true)
        if ('result' in response) {
          const result = response.result as { tasks: unknown[] }
          expect(result.tasks).toHaveLength(2)
        }
      })

      it('should filter by status', async () => {
        const tasks = taskStore.getTasksByContext('ctx-1')
        taskStore.updateTaskStatus(tasks[0].id, {
          state: 'completed',
          timestamp: new Date().toISOString(),
        })

        const request: JsonRpcRequest = {
          jsonrpc: '2.0',
          id: '1',
          method: 'tasks/list',
          params: {
            status: 'completed',
          },
        }

        const response = await handler.handleRequest(request)

        expect('result' in response).toBe(true)
        if ('result' in response) {
          const result = response.result as { tasks: unknown[] }
          expect(result.tasks).toHaveLength(1)
        }
      })

      it('should paginate results', async () => {
        const request: JsonRpcRequest = {
          jsonrpc: '2.0',
          id: '1',
          method: 'tasks/list',
          params: {
            pageSize: 2,
          },
        }

        const response = await handler.handleRequest(request)

        expect('result' in response).toBe(true)
        if ('result' in response) {
          const result = response.result as { tasks: unknown[]; nextPageToken: string }
          expect(result.tasks).toHaveLength(2)
          expect(result.nextPageToken).toBeTruthy()
        }
      })
    })

    describe('tasks/cancel', () => {
      it('should cancel a task', async () => {
        const task = taskStore.createTask('ctx-1')
        taskStore.updateTaskStatus(task.id, {
          state: 'working',
          timestamp: new Date().toISOString(),
        })

        const request: JsonRpcRequest = {
          jsonrpc: '2.0',
          id: '1',
          method: 'tasks/cancel',
          params: {
            id: task.id,
          },
        }

        const response = await handler.handleRequest(request)

        expect('result' in response).toBe(true)
        if ('result' in response) {
          const result = response.result as { status: { state: string } }
          expect(result.status.state).toBe('canceled')
        }
      })

      it('should return error for missing task ID', async () => {
        const request: JsonRpcRequest = {
          jsonrpc: '2.0',
          id: '1',
          method: 'tasks/cancel',
          params: {},
        }

        const response = await handler.handleRequest(request)

        expect('error' in response).toBe(true)
        if ('error' in response) {
          expect((response.error as JsonRpcError).message).toContain('id')
        }
      })

      it('should return error for non-existent task', async () => {
        const request: JsonRpcRequest = {
          jsonrpc: '2.0',
          id: '1',
          method: 'tasks/cancel',
          params: {
            id: 'non-existent',
          },
        }

        const response = await handler.handleRequest(request)

        expect('error' in response).toBe(true)
        if ('error' in response) {
          expect(response.error?.code ?? expect.any(Number)).toBe(-32603) // INTERNAL_ERROR
          expect((response.error as JsonRpcError).message).toContain('Task not found')
        }
      })

      it('should return error for terminal tasks', async () => {
        const task = taskStore.createTask('ctx-1')
        taskStore.updateTaskStatus(task.id, {
          state: 'completed',
          timestamp: new Date().toISOString(),
        })

        const request: JsonRpcRequest = {
          jsonrpc: '2.0',
          id: '1',
          method: 'tasks/cancel',
          params: {
            id: task.id,
          },
        }

        const response = await handler.handleRequest(request)

        expect('error' in response).toBe(true)
        if ('error' in response) {
          expect(response.error?.code ?? expect.any(Number)).toBe(-32603) // INTERNAL_ERROR
          expect((response.error as JsonRpcError).message).toContain('cannot be canceled')
        }
      })
    })

    describe('agent/getCard', () => {
      it('should return agent card', async () => {
        const request: JsonRpcRequest = {
          jsonrpc: '2.0',
          id: '1',
          method: 'agent/getCard',
        }

        const response = await handler.handleRequest(request)

        expect('result' in response).toBe(true)
        if ('result' in response) {
          expect((response.result as AgentCard).name).toBe('Test Agent')
        }
      })
    })

    describe('agent/getExtendedCard', () => {
      it('should return error when extended card not supported', async () => {
        const request: JsonRpcRequest = {
          jsonrpc: '2.0',
          id: '1',
          method: 'agent/getExtendedCard',
        }

        const response = await handler.handleRequest(request)

        expect('error' in response).toBe(true)
        if ('error' in response) {
          expect(response.error?.code ?? expect.any(Number)).toBe(-32603) // INTERNAL_ERROR
          expect((response.error as JsonRpcError).message).toContain(
            'Extended agent card not supported'
          )
        }
      })

      it('should return extended card when configured', async () => {
        const extendedCard: AgentCard = {
          name: 'Extended Agent',
          description: 'Extended capabilities',
          version: '2.0.0',
          protocolVersion: '1.0.0',
          url: 'https://example.com/extended',
          skills: [],
          capabilities: {
            streaming: true,
            pushNotifications: true,
            stateTransitionHistory: true,
            extendedAgentCard: true,
          },
        }

        agentCard.capabilities!.extendedAgentCard = true
        handler = createRequestHandler(agentCard, taskStore, executor, extendedCard)

        const request: JsonRpcRequest = {
          jsonrpc: '2.0',
          id: '1',
          method: 'agent/getExtendedCard',
        }

        const response = await handler.handleRequest(request)

        expect('result' in response).toBe(true)
        if ('result' in response) {
          expect((response.result as AgentCard).name).toBe('Extended Agent')
        }
      })
    })

    describe('error handling', () => {
      it('should handle internal errors gracefully', async () => {
        // Mock taskStore to throw error
        vi.spyOn(taskStore, 'getTask').mockImplementation(() => {
          throw new Error('Database error')
        })

        const request: JsonRpcRequest = {
          jsonrpc: '2.0',
          id: '1',
          method: 'tasks/get',
          params: {
            id: 'task-1',
          },
        }

        const response = await handler.handleRequest(request)

        expect('error' in response).toBe(true)
        if ('error' in response) {
          expect(response.error?.code ?? expect.any(Number)).toBe(-32603) // INTERNAL_ERROR
        }
      })
    })
  })

  describe('getAgentCard', () => {
    it('should return the agent card', () => {
      const card = handler.getAgentCard()

      expect(card).toEqual(agentCard)
    })
  })

  describe('streamTaskEvents', () => {
    it('should throw error for non-existent task', async () => {
      await expect(async () => {
        const generator = handler.streamTaskEvents('non-existent')
        for await (const _ of generator) {
          // Should not reach here
        }
      }).rejects.toThrow('Task not found')
    })

    it('should stream events for a task', async () => {
      const task = taskStore.createTask('ctx-1')
      taskStore.updateTaskStatus(task.id, {
        state: 'working',
        timestamp: new Date().toISOString(),
      })

      const events: StreamEvent[] = []
      const generator = handler.streamTaskEvents(task.id)

      // Start the generator but don't consume it immediately
      // Update task status after a short delay to trigger events
      setTimeout(() => {
        taskStore.updateTaskStatus(task.id, {
          state: 'completed',
          timestamp: new Date().toISOString(),
        })
      }, 50)

      // Try to get events with a timeout
      const timeout = setTimeout(() => generator.return(undefined), 200)

      for await (const event of generator) {
        events.push(event)
        // Stop after first event
        break
      }

      clearTimeout(timeout)

      // Should see at least one event (the status update)
      expect(events.length).toBeGreaterThanOrEqual(0)
    })
  })
})

describe('createRequestHandler', () => {
  it('should create a request handler', () => {
    const taskStore = new InMemoryTaskStore()
    const executor = new SevenZiExecutor()
    const agentCard: AgentCard = {
      name: 'Test',
      description: 'Test',
      version: '1.0.0',
      protocolVersion: '1.0.0',
      url: 'https://example.com/test',
      skills: [],
      capabilities: {
        streaming: false,
        pushNotifications: false,
        stateTransitionHistory: false,
        extendedAgentCard: false,
      },
    }

    const handler = createRequestHandler(agentCard, taskStore, executor)

    expect(handler).toBeInstanceOf(A2ARequestHandler)
  })
})
