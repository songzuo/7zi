/**
 * Agent 协作协议测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { AgentCollaborationProtocol, PROTOCOL_VERSION, PROTOCOL_MESSAGE_TYPES } from '../protocol'
import { AgentRegistry } from '../registry'
import { MessageBus } from '../message-bus'
import { MessagePriority, TransportType, MessageType } from '../types'

describe('AgentCollaborationProtocol', () => {
  let protocol: AgentCollaborationProtocol
  let messageBus: MessageBus
  let registry: AgentRegistry
  let taskDecomposer: any

  const agentId = 'agent-1'

  beforeEach(async () => {
    messageBus = new MessageBus(TransportType.MEMORY)
    registry = new AgentRegistry()

    // 简化的 TaskDecomposer mock
    taskDecomposer = {
      createTask: vi.fn().mockResolvedValue({
        id: 'task-1',
        name: 'Test Task',
        description: 'Description',
        status: 'pending',
        subTasks: [],
        input: {},
        createdAt: Date.now(),
        priority: MessagePriority.NORMAL,
      }),
      executeTask: vi.fn().mockResolvedValue({ result: 'success' }),
      cancelTask: vi.fn().mockResolvedValue(undefined),
    }

    protocol = new AgentCollaborationProtocol(agentId, messageBus, registry, taskDecomposer)

    // 注册测试 Agent
    await registry.register({
      id: agentId,
      name: 'Test Agent',
      type: 'llm',
      capabilities: [
        {
          id: 'coding',
          name: 'Coding',
          description: 'Write code',
          category: 'development',
          version: '1.0.0',
        },
        {
          id: 'testing',
          name: 'Testing',
          description: 'Test code',
          category: 'testing',
          version: '1.0.0',
        },
      ],
      status: 'online',
      lastSeen: Date.now(),
      metadata: {},
    })

    // 注册目标 Agent
    await registry.register({
      id: 'agent-2',
      name: 'Target Agent',
      type: 'llm',
      capabilities: [
        {
          id: 'analysis',
          name: 'Analysis',
          description: 'Analyze data',
          category: 'analysis',
          version: '1.0.0',
        },
      ],
      status: 'online',
      lastSeen: Date.now(),
      metadata: {},
    })
  })

  afterEach(async () => {
    await protocol.cleanup()
    await registry.close()
    await messageBus.close()
  })

  describe('协议常量', () => {
    it('应该有正确的协议版本', () => {
      expect(PROTOCOL_VERSION).toBe('1.0')
    })

    it('应该定义所有消息类型', () => {
      expect(PROTOCOL_MESSAGE_TYPES).toHaveProperty('TASK_DELEGATE')
      expect(PROTOCOL_MESSAGE_TYPES).toHaveProperty('TASK_STATUS')
      expect(PROTOCOL_MESSAGE_TYPES).toHaveProperty('TASK_RESULT')
      expect(PROTOCOL_MESSAGE_TYPES).toHaveProperty('CAPABILITY_QUERY')
      expect(PROTOCOL_MESSAGE_TYPES).toHaveProperty('STATE_SYNC')
    })
  })

  describe('任务委托', () => {
    it('应该成功委托任务', async () => {
      const taskId = await protocol.delegateTask('agent-2', {
        taskId: 'test-task-1',
        taskName: 'Test Task',
        taskDescription: 'A test task',
        input: { data: 'test' },
        requiredCapabilities: ['coding'],
        priority: MessagePriority.NORMAL,
      })

      expect(taskId).toBe('test-task-1')
    })

    it('应该在委托任务时记录待处理任务', async () => {
      await protocol.delegateTask('agent-2', {
        taskId: 'test-task-2',
        taskName: 'Test Task',
        taskDescription: 'A test task',
        input: { data: 'test' },
        requiredCapabilities: ['coding'],
        priority: MessagePriority.NORMAL,
      })

      // 检查事件发出
      const eventSpy = vi.fn()
      protocol.on('task.delegated', eventSpy)

      // 触发另一次委托来验证事件
      await protocol.delegateTask('agent-2', {
        taskId: 'test-task-3',
        taskName: 'Test Task',
        taskDescription: 'A test task',
        input: { data: 'test' },
        requiredCapabilities: ['coding'],
        priority: MessagePriority.NORMAL,
      })

      expect(eventSpy).toHaveBeenCalled()
    })

    it('应该在委托事件中包含任务信息', async () => {
      const eventSpy = vi.fn()
      protocol.on('task.delegated', eventSpy)

      await protocol.delegateTask('agent-2', {
        taskId: 'test-task-4',
        taskName: 'Test Task',
        taskDescription: 'A test task',
        input: { data: 'test' },
        requiredCapabilities: ['coding'],
        priority: MessagePriority.NORMAL,
      })

      expect(eventSpy.mock.calls[0][0]).toMatchObject({
        taskId: 'test-task-4',
        to: 'agent-2',
      })
    })
  })

  describe('任务状态', () => {
    it('应该发送任务状态', async () => {
      const sendSpy = vi.spyOn(messageBus, 'send')

      await protocol.sendTaskStatus('agent-2', {
        taskId: 'task-1',
        status: 'running',
        progress: 50,
        message: 'Processing',
      })

      expect(sendSpy).toHaveBeenCalled()
    })
  })

  describe('任务结果', () => {
    it('应该发送任务结果', async () => {
      const sendSpy = vi.spyOn(messageBus, 'send')

      await protocol.sendTaskResult('agent-2', {
        taskId: 'task-1',
        output: { result: 'success' },
        completedAt: Date.now(),
        executionTime: 1000,
      })

      expect(sendSpy).toHaveBeenCalled()
    })
  })

  describe('任务取消', () => {
    it('应该取消委托的任务', async () => {
      // 先委托任务
      await protocol.delegateTask('agent-2', {
        taskId: 'task-to-cancel',
        taskName: 'Test Task',
        taskDescription: 'A test task',
        input: { data: 'test' },
        requiredCapabilities: ['coding'],
        priority: MessagePriority.NORMAL,
      })

      // 取消任务
      await protocol.cancelTask('task-to-cancel', 'User requested')

      const eventSpy = vi.fn()
      protocol.on('task.cancelled', eventSpy)

      // 验证任务被移除
      await expect(protocol.cancelTask('task-to-cancel', 'Again')).rejects.toThrow(
        'not found or not delegated'
      )
    })

    it('应该拒绝取消不存在的任务', async () => {
      await expect(protocol.cancelTask('non-existent', 'Reason')).rejects.toThrow(
        'not found or not delegated'
      )
    })
  })

  describe('能力查询', () => {
    it('应该查询能力', async () => {
      const response = await protocol.queryCapabilities({
        capabilityIds: ['coding'],
      })

      expect(response).toHaveProperty('agents')
      expect(response.agents.length).toBeGreaterThan(0)
    })

    it('应该返回具备指定能力的 Agent', async () => {
      const response = await protocol.queryCapabilities({
        capabilityIds: ['coding'],
      })

      const hasCapability = response.agents.some(agent =>
        agent.capabilities.some(cap => cap.id === 'coding')
      )

      expect(hasCapability).toBe(true)
    })
  })

  describe('状态同步', () => {
    it('应该同步状态', async () => {
      const sendSpy = vi.spyOn(messageBus, 'send')

      await protocol.syncState('agent-2', {
        keys: ['key1', 'key2'],
        values: ['value1', 'value2'],
        timestamp: Date.now(),
      })

      expect(sendSpy).toHaveBeenCalled()
    })

    it('应该设置本地状态', () => {
      protocol.setState('testKey', 'testValue')

      const state = protocol.getState()

      expect(state).toHaveProperty('testKey', 'testValue')
    })
  })

  describe('状态查询', () => {
    it('应该查询状态', async () => {
      // Mock 消息总线响应
      vi.spyOn(messageBus, 'request').mockResolvedValueOnce({
        key1: 'value1',
      })

      const result = await protocol.queryState('agent-2', {
        keys: ['key1'],
      })

      expect(result).toHaveProperty('key1')
    })
  })

  describe('消息处理', () => {
    it('应该处理任务委托消息', async () => {
      const eventSpy = vi.fn()
      protocol.on('task.received', eventSpy)

      // 模拟接收任务委托消息
      const message = {
        headers: {
          id: 'msg-1',
          type: PROTOCOL_MESSAGE_TYPES.TASK_DELEGATE,
          from: 'agent-2',
          to: agentId,
          priority: MessagePriority.NORMAL,
          timestamp: Date.now(),
        },
        body: {
          taskId: 'task-1',
          taskName: 'Test Task',
          taskDescription: 'Description',
          input: {},
          requiredCapabilities: ['coding'],
          priority: MessagePriority.NORMAL,
        },
      }

      await (protocol as any).handleTaskDelegate(message)

      expect(eventSpy).toHaveBeenCalled()
      expect(taskDecomposer.createTask).toHaveBeenCalled()
    })

    it('应该拒绝能力不匹配的任务委托', async () => {
      const statusSpy = vi.fn()
      protocol.on('task.status.updated', statusSpy)

      // 模拟接收需要不存在的能力的任务
      const message = {
        headers: {
          id: 'msg-2',
          type: PROTOCOL_MESSAGE_TYPES.TASK_DELEGATE,
          from: 'agent-2',
          to: agentId,
          priority: MessagePriority.NORMAL,
          timestamp: Date.now(),
        },
        body: {
          taskId: 'task-2',
          taskName: 'Test Task',
          taskDescription: 'Description',
          input: {},
          requiredCapabilities: ['non-existent-capability'],
          priority: MessagePriority.NORMAL,
        },
      }

      await (protocol as any).handleTaskDelegate(message)

      // 应该发送失败状态
      expect(taskDecomposer.createTask).not.toHaveBeenCalled()
    })

    it('应该处理任务状态消息', async () => {
      const eventSpy = vi.fn()
      protocol.on('task.status.updated', eventSpy)

      const message = {
        headers: {
          id: 'msg-3',
          type: PROTOCOL_MESSAGE_TYPES.TASK_STATUS,
          from: 'agent-2',
          to: agentId,
          priority: MessagePriority.NORMAL,
          timestamp: Date.now(),
        },
        body: {
          taskId: 'task-1',
          status: 'running' as const,
          progress: 50,
        },
      }

      await (protocol as any).handleTaskStatus(message)

      expect(eventSpy).toHaveBeenCalled()
      expect(eventSpy.mock.calls[0][0]).toMatchObject({
        taskId: 'task-1',
        status: 'running',
        progress: 50,
      })
    })

    it('应该处理任务结果消息', async () => {
      const eventSpy = vi.fn()
      protocol.on('task.result.received', eventSpy)

      const message = {
        headers: {
          id: 'msg-4',
          type: PROTOCOL_MESSAGE_TYPES.TASK_RESULT,
          from: 'agent-2',
          to: agentId,
          priority: MessagePriority.NORMAL,
          timestamp: Date.now(),
        },
        body: {
          taskId: 'task-1',
          output: { result: 'success' },
          completedAt: Date.now(),
          executionTime: 1000,
        },
      }

      await (protocol as any).handleTaskResult(message)

      expect(eventSpy).toHaveBeenCalled()
    })

    it('应该处理任务取消消息', async () => {
      const eventSpy = vi.fn()
      protocol.on('task.cancelled.received', eventSpy)

      const message = {
        headers: {
          id: 'msg-5',
          type: PROTOCOL_MESSAGE_TYPES.TASK_CANCEL,
          from: 'agent-2',
          to: agentId,
          priority: MessagePriority.HIGH,
          timestamp: Date.now(),
        },
        body: {
          taskId: 'task-1',
          reason: 'User requested',
        },
      }

      await (protocol as any).handleTaskCancel(message)

      expect(taskDecomposer.cancelTask).toHaveBeenCalledWith('task-1')
    })

    it('应该处理能力查询消息', async () => {
      const sendSpy = vi.spyOn(messageBus, 'send')

      const message = {
        headers: {
          id: 'msg-6',
          type: PROTOCOL_MESSAGE_TYPES.CAPABILITY_QUERY,
          from: 'agent-2',
          to: agentId,
          priority: MessagePriority.NORMAL,
          timestamp: Date.now(),
        },
        body: {
          capabilityIds: ['coding'],
        },
      }

      await (protocol as any).handleCapabilityQuery(message)

      expect(sendSpy).toHaveBeenCalled()
    })

    it('应该处理状态同步消息', async () => {
      const eventSpy = vi.fn()
      protocol.on('state.synced', eventSpy)

      const message = {
        headers: {
          id: 'msg-7',
          type: PROTOCOL_MESSAGE_TYPES.STATE_SYNC,
          from: 'agent-2',
          to: agentId,
          priority: MessagePriority.NORMAL,
          timestamp: Date.now(),
        },
        body: {
          keys: ['key1'],
          values: ['value1'],
          timestamp: Date.now(),
        },
      }

      await (protocol as any).handleStateSync(message)

      expect(eventSpy).toHaveBeenCalled()
      expect(protocol.getState()).toHaveProperty('key1', 'value1')
    })
  })

  describe('清理', () => {
    it('应该正确清理资源', async () => {
      // 委托任务
      await protocol.delegateTask('agent-2', {
        taskId: 'task-to-cleanup',
        taskName: 'Test Task',
        taskDescription: 'Description',
        input: {},
        requiredCapabilities: ['coding'],
        priority: MessagePriority.NORMAL,
      })

      await protocol.cleanup()

      // 验证清理成功
      expect((protocol as any).pendingTasks.size).toBe(0)
    })
  })

  describe('事件系统', () => {
    it('应该发出任务委托事件', async () => {
      const eventSpy = vi.fn()
      protocol.on('task.delegated', eventSpy)

      await protocol.delegateTask('agent-2', {
        taskId: 'event-task',
        taskName: 'Test Task',
        taskDescription: 'Description',
        input: {},
        requiredCapabilities: ['coding'],
        priority: MessagePriority.NORMAL,
      })

      expect(eventSpy).toHaveBeenCalled()
    })

    it('应该发出任务取消事件', async () => {
      const eventSpy = vi.fn()
      protocol.on('task.cancelled', eventSpy)

      await protocol.delegateTask('agent-2', {
        taskId: 'cancel-event-task',
        taskName: 'Test Task',
        taskDescription: 'Description',
        input: {},
        requiredCapabilities: ['coding'],
        priority: MessagePriority.NORMAL,
      })

      await protocol.cancelTask('cancel-event-task', 'Test')

      expect(eventSpy).toHaveBeenCalled()
    })
  })
})
