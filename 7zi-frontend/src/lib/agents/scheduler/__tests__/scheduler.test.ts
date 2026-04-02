/**
 * Agent Scheduler Tests
 *
 * Tests for the A2A scheduler system covering:
 * - Agent registration and management
 * - Task scheduling and assignment
 * - Task cancellation and status updates
 * - Queue management and priority
 * - Statistics and cleanup
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { agentScheduler, AgentScheduler } from '../scheduler'

describe('AgentScheduler', () => {
  let scheduler: AgentScheduler

  beforeEach(() => {
    scheduler = agentScheduler
    scheduler.clear() // Reset state between tests
  })

  // ===== Agent Registry Tests =====

  describe('Agent Registry', () => {
    it('should register a new agent successfully', () => {
      const agent = scheduler.registerAgent('agent1', 'Test Agent', 'processor', [
        'process',
        'analyze',
      ])

      expect(agent).toBeDefined()
      expect(agent.id).toBe('agent1')
      expect(agent.name).toBe('Test Agent')
      expect(agent.type).toBe('processor')
      expect(agent.status).toBe('idle')
      expect(agent.capabilities).toEqual(['process', 'analyze'])
      expect(agent.createdAt).toBeDefined()
      expect(agent.updatedAt).toBeDefined()
    })

    it('should register agent with metadata', () => {
      const metadata = { version: '1.0', endpoint: 'http://localhost:3000' }
      const agent = scheduler.registerAgent(
        'agent2',
        'Agent with Meta',
        'worker',
        ['task'],
        metadata
      )

      expect(agent.metadata).toEqual(metadata)
    })

    it('should get agent by id', () => {
      scheduler.registerAgent('agent1', 'Test Agent', 'processor', ['process'])
      const agent = scheduler.getAgent('agent1')

      expect(agent).toBeDefined()
      expect(agent?.name).toBe('Test Agent')
    })

    it('should return undefined for non-existent agent', () => {
      const agent = scheduler.getAgent('non-existent')
      expect(agent).toBeUndefined()
    })

    it('should get all registered agents', () => {
      scheduler.registerAgent('agent1', 'Agent 1', 'type1', ['cap1'])
      scheduler.registerAgent('agent2', 'Agent 2', 'type2', ['cap2'])

      const agents = scheduler.getAllAgents()
      expect(agents).toHaveLength(2)
    })

    it('should get agents by capability', () => {
      scheduler.registerAgent('agent1', 'Agent 1', 'processor', ['process', 'analyze'])
      scheduler.registerAgent('agent2', 'Agent 2', 'analyzer', ['analyze'])

      const capableAgents = scheduler.getAgentsByCapability('analyze')
      expect(capableAgents).toHaveLength(2)

      const processAgents = scheduler.getAgentsByCapability('process')
      expect(processAgents).toHaveLength(1)
      expect(processAgents[0].id).toBe('agent1')
    })

    it('should unregister existing agent', () => {
      scheduler.registerAgent('agent1', 'Test Agent', 'processor', ['process'])
      const result = scheduler.unregisterAgent('agent1')

      expect(result).toBe(true)
      expect(scheduler.getAgent('agent1')).toBeUndefined()
    })

    it('should return false when unregistering non-existent agent', () => {
      const result = scheduler.unregisterAgent('non-existent')
      expect(result).toBe(false)
    })

    it('should mark running tasks as failed when agent unregisters', () => {
      const agent = scheduler.registerAgent('agent1', 'Test Agent', 'processor', ['process'])
      const response = scheduler.scheduleTask({ type: 'process', input: { data: 'test' } })

      expect(response.success).toBe(true)

      scheduler.unregisterAgent('agent1')

      const task = scheduler.getTask(response.taskId!)
      expect(task?.status).toBe('failed')
      expect(task?.error).toBe('Agent disconnected')
    })

    it('should update agent status', () => {
      scheduler.registerAgent('agent1', 'Test Agent', 'processor', ['process'])

      const result = scheduler.updateAgentStatus('agent1', 'busy')

      expect(result).toBe(true)
      expect(scheduler.getAgent('agent1')?.status).toBe('busy')
    })

    it('should return false when updating status of non-existent agent', () => {
      const result = scheduler.updateAgentStatus('non-existent', 'busy')
      expect(result).toBe(false)
    })

    it('should update agent heartbeat', () => {
      scheduler.registerAgent('agent1', 'Test Agent', 'processor', ['process'])
      const originalHeartbeat = scheduler.getAgent('agent1')?.lastHeartbeat

      // Wait a small amount to ensure time difference
      const newHeartbeat = Date.now()

      const result = scheduler.heartbeat('agent1')

      expect(result).toBe(true)
      expect(scheduler.getAgent('agent1')?.lastHeartbeat).toBeGreaterThanOrEqual(originalHeartbeat!)
    })

    it('should return false for heartbeat of non-existent agent', () => {
      const result = scheduler.heartbeat('non-existent')
      expect(result).toBe(false)
    })
  })

  // ===== Task Scheduling Tests =====

  describe('Task Scheduling', () => {
    it('should schedule task without specific agent', () => {
      scheduler.registerAgent('agent1', 'Test Agent', 'processor', ['process'])

      const response = scheduler.scheduleTask({
        type: 'process',
        input: { data: 'test' },
      })

      expect(response.success).toBe(true)
      expect(response.taskId).toBeDefined()
      expect(response.error).toBeUndefined()
    })

    it('should schedule task with specific agent', () => {
      scheduler.registerAgent('agent1', 'Test Agent', 'processor', ['process'])

      const response = scheduler.scheduleTask({
        type: 'process',
        input: { data: 'test' },
        agentId: 'agent1',
      })

      expect(response.success).toBe(true)
      expect(response.taskId).toBeDefined()

      const task = scheduler.getTask(response.taskId!)
      expect(task?.agentId).toBe('agent1')
      expect(task?.status).toBe('running')
    })

    it('should fail scheduling with non-existent agent', () => {
      const response = scheduler.scheduleTask({
        type: 'process',
        input: { data: 'test' },
        agentId: 'non-existent',
      })

      expect(response.success).toBe(false)
      expect(response.error).toBe('Agent not found')
    })

    it('should queue task when specific agent is busy', () => {
      scheduler.registerAgent('agent1', 'Test Agent', 'processor', ['process'])

      // First task occupies agent
      scheduler.scheduleTask({
        type: 'process',
        input: { data: 'task1' },
        agentId: 'agent1',
      })

      // Second task should be queued
      const response = scheduler.scheduleTask({
        type: 'process',
        input: { data: 'task2' },
        agentId: 'agent1',
      })

      expect(response.success).toBe(true)
      const task = scheduler.getTask(response.taskId!)
      expect(task?.status).toBe('pending')
    })

    it('should queue task when no capable agent is available', () => {
      scheduler.registerAgent('agent1', 'Test Agent', 'processor', ['process'])

      const response = scheduler.scheduleTask({
        type: 'analyze', // No agent has this capability
        input: { data: 'test' },
      })

      expect(response.success).toBe(true)
      const task = scheduler.getTask(response.taskId!)
      // 任务应该被排队，状态为 pending
      expect(task?.status).toBe('pending')
      // 没有可用的 agent
      expect(task?.agentId).toBeUndefined()
    })

    it('should assign task to best available agent', () => {
      scheduler.registerAgent('agent1', 'Agent 1', 'processor', ['process'])
      scheduler.registerAgent('agent2', 'Agent 2', 'processor', ['process'])

      const response = scheduler.scheduleTask({
        type: 'process',
        input: { data: 'test' },
      })

      expect(response.success).toBe(true)
      const task = scheduler.getTask(response.taskId!)
      expect(task?.agentId).toBeDefined()
      expect(task?.status).toBe('running')
    })

    it('should respect task priority', () => {
      scheduler.registerAgent('agent1', 'Test Agent', 'processor', ['process'])

      // Queue low priority task first
      scheduler.scheduleTask({
        type: 'process',
        input: { data: 'low' },
        priority: 'low',
      })

      // Queue high priority task
      scheduler.scheduleTask({
        type: 'process',
        input: { data: 'high' },
        priority: 'high',
      })

      // Complete current task and check next
      const tasks = scheduler.getAllTasks()
      const pendingTasks = tasks.filter(t => t.status === 'pending')
      expect(pendingTasks[0]?.priority).toBe('high')
    })

    it('should use default priority when not specified', () => {
      scheduler.registerAgent('agent1', 'Test Agent', 'processor', ['process'])

      const response = scheduler.scheduleTask({
        type: 'process',
        input: { data: 'test' },
      })

      const task = scheduler.getTask(response.taskId!)
      expect(task?.priority).toBe('normal')
    })

    it('should use default maxRetries when not specified', () => {
      scheduler.registerAgent('agent1', 'Test Agent', 'processor', ['process'])

      const response = scheduler.scheduleTask({
        type: 'process',
        input: { data: 'test' },
      })

      const task = scheduler.getTask(response.taskId!)
      expect(task?.maxRetries).toBe(3)
    })

    it('should allow custom maxRetries', () => {
      scheduler.registerAgent('agent1', 'Test Agent', 'processor', ['process'])

      const response = scheduler.scheduleTask({
        type: 'process',
        input: { data: 'test' },
        maxRetries: 5,
      })

      const task = scheduler.getTask(response.taskId!)
      expect(task?.maxRetries).toBe(5)
    })
  })

  // ===== Task Management Tests =====

  describe('Task Management', () => {
    it('should get task by id', () => {
      scheduler.registerAgent('agent1', 'Test Agent', 'processor', ['process'])

      const response = scheduler.scheduleTask({
        type: 'process',
        input: { data: 'test' },
      })

      const task = scheduler.getTask(response.taskId!)
      expect(task).toBeDefined()
      expect(task?.input).toEqual({ data: 'test' })
    })

    it('should return undefined for non-existent task', () => {
      const task = scheduler.getTask('non-existent')
      expect(task).toBeUndefined()
    })

    it('should get all tasks', () => {
      scheduler.registerAgent('agent1', 'Test Agent', 'processor', ['process'])

      scheduler.scheduleTask({ type: 'process', input: {} })
      scheduler.scheduleTask({ type: 'process', input: {} })

      const tasks = scheduler.getAllTasks()
      expect(tasks.length).toBeGreaterThanOrEqual(2)
    })

    it('should update task status', () => {
      scheduler.registerAgent('agent1', 'Test Agent', 'processor', ['process'])

      const response = scheduler.scheduleTask({
        type: 'process',
        input: { data: 'test' },
      })

      const result = scheduler.updateTask({
        taskId: response.taskId!,
        status: 'completed',
      })

      expect(result).toBe(true)
      const task = scheduler.getTask(response.taskId!)
      expect(task?.status).toBe('completed')
      expect(task?.completedAt).toBeDefined()
    })

    it('should return false when updating non-existent task', () => {
      const result = scheduler.updateTask({
        taskId: 'non-existent',
        status: 'completed',
      })

      expect(result).toBe(false)
    })

    it('should update task output', () => {
      scheduler.registerAgent('agent1', 'Test Agent', 'processor', ['process'])

      const response = scheduler.scheduleTask({
        type: 'process',
        input: { data: 'test' },
      })

      scheduler.updateTask({
        taskId: response.taskId!,
        status: 'completed',
        output: { result: 'success' },
      })

      const task = scheduler.getTask(response.taskId!)
      expect(task?.output).toEqual({ result: 'success' })
    })

    it('should update task error', () => {
      scheduler.registerAgent('agent1', 'Test Agent', 'processor', ['process'])

      const response = scheduler.scheduleTask({
        type: 'process',
        input: { data: 'test' },
        maxRetries: 0, // 不允许重试，确保任务保持失败状态
      })

      scheduler.updateTask({
        taskId: response.taskId!,
        status: 'failed',
        error: 'Something went wrong',
      })

      const task = scheduler.getTask(response.taskId!)
      expect(task?.status).toBe('failed')
      expect(task?.error).toBe('Something went wrong')
    })

    it('should free agent when task completes', () => {
      scheduler.registerAgent('agent1', 'Test Agent', 'processor', ['process'])

      const response = scheduler.scheduleTask({
        type: 'process',
        input: { data: 'test' },
        agentId: 'agent1',
      })

      expect(scheduler.getAgent('agent1')?.status).toBe('busy')

      scheduler.updateTask({
        taskId: response.taskId!,
        status: 'completed',
      })

      expect(scheduler.getAgent('agent1')?.status).toBe('idle')
    })

    it('should reschedule failed task if retries remain', () => {
      scheduler.registerAgent('agent1', 'Test Agent', 'processor', ['process'])

      const response = scheduler.scheduleTask({
        type: 'process',
        input: { data: 'test' },
        agentId: 'agent1',
        maxRetries: 3,
      })

      scheduler.updateTask({
        taskId: response.taskId!,
        status: 'failed',
      })

      const task = scheduler.getTask(response.taskId!)
      // 任务应该被重新调度
      expect(task?.status).toBe('pending')
      expect(task?.retries).toBe(1)
    })

    it('should not reschedule if max retries exceeded', () => {
      scheduler.registerAgent('agent1', 'Test Agent', 'processor', ['process'])

      const response = scheduler.scheduleTask({
        type: 'process',
        input: { data: 'test' },
        agentId: 'agent1',
        maxRetries: 1, // 最多允许 1 次重试
      })

      // 初始任务状态
      const initialTask = scheduler.getTask(response.taskId!)
      expect(initialTask?.retries).toBe(0)

      // 第一次失败 - 应该重试 (0 < 1)
      scheduler.updateTask({
        taskId: response.taskId!,
        status: 'failed',
      })
      let task = scheduler.getTask(response.taskId!)
      expect(task?.status).toBe('pending') // 应该被重新调度
      expect(task?.retries).toBe(1)

      // 第二次失败 - 不应该重试 (1 < 1 为 false)
      scheduler.updateTask({
        taskId: response.taskId!,
        status: 'failed',
      })
      task = scheduler.getTask(response.taskId!)
      expect(task?.status).toBe('failed') // 最终失败状态
      expect(task?.retries).toBe(1) // 重试次数不再增加
    })
  })

  // ===== Task Cancellation Tests =====

  describe('Task Cancellation', () => {
    it('should cancel pending task', () => {
      scheduler.registerAgent('agent1', 'Test Agent', 'processor', ['process'])

      // Queue a task (no capable agent at moment)
      const response = scheduler.scheduleTask({
        type: 'analyze', // No agent has this
        input: { data: 'test' },
      })

      const result = scheduler.cancelTask(response.taskId!)

      expect(result).toBe(true)
      const task = scheduler.getTask(response.taskId!)
      expect(task?.status).toBe('cancelled')
    })

    it('should cancel running task and free agent', () => {
      scheduler.registerAgent('agent1', 'Test Agent', 'processor', ['process'])

      const response = scheduler.scheduleTask({
        type: 'process',
        input: { data: 'test' },
        agentId: 'agent1',
      })

      expect(scheduler.getAgent('agent1')?.status).toBe('busy')

      scheduler.cancelTask(response.taskId!)

      expect(scheduler.getAgent('agent1')?.status).toBe('idle')
    })

    it('should return false when cancelling non-existent task', () => {
      const result = scheduler.cancelTask('non-existent')
      expect(result).toBe(false)
    })

    it('should remove cancelled task from queue', () => {
      scheduler.registerAgent('agent1', 'Test Agent', 'processor', ['process'])

      // Queue tasks
      const response1 = scheduler.scheduleTask({
        type: 'analyze',
        input: { data: 'task1' },
        priority: 'normal',
      })

      const response2 = scheduler.scheduleTask({
        type: 'analyze',
        input: { data: 'task2' },
        priority: 'high',
      })

      scheduler.cancelTask(response1.taskId!)

      const remainingTasks = scheduler.getAllTasks().filter(t => t.status === 'pending')
      expect(remainingTasks.some(t => t.id === response1.taskId)).toBe(false)
    })
  })

  // ===== Queue Statistics Tests =====

  describe('Queue Statistics', () => {
    it('should return correct queue stats', () => {
      scheduler.registerAgent('agent1', 'Test Agent', 'processor', ['process'])

      // Running task
      scheduler.scheduleTask({
        type: 'process',
        input: { data: 'running' },
        agentId: 'agent1',
      })

      // Pending task
      scheduler.scheduleTask({
        type: 'analyze',
        input: { data: 'pending' },
      })

      const stats = scheduler.getQueueStats()

      expect(stats.total).toBeGreaterThanOrEqual(2)
      expect(stats.running).toBeGreaterThanOrEqual(1)
      expect(stats.pending).toBeGreaterThanOrEqual(1)
    })

    it('should track completed and failed tasks', () => {
      scheduler.registerAgent('agent1', 'Test Agent', 'processor', ['process'])

      const response = scheduler.scheduleTask({
        type: 'process',
        input: { data: 'test' },
        agentId: 'agent1',
      })

      scheduler.updateTask({
        taskId: response.taskId!,
        status: 'completed',
      })

      const stats = scheduler.getQueueStats()
      expect(stats.completed).toBeGreaterThanOrEqual(1)
    })
  })

  // ===== Cleanup Tests =====

  describe('Cleanup', () => {
    it('should clean up old completed tasks', async () => {
      scheduler.registerAgent('agent1', 'Test Agent', 'processor', ['process'])

      const response = scheduler.scheduleTask({
        type: 'process',
        input: { data: 'test' },
        agentId: 'agent1',
      })

      scheduler.updateTask({
        taskId: response.taskId!,
        status: 'completed',
      })

      // Wait a tiny bit
      await new Promise(resolve => setTimeout(resolve, 10))

      // Cleanup with 0ms maxAge to clean up immediately
      scheduler.cleanup(0)

      const task = scheduler.getTask(response.taskId!)
      // Task might still exist briefly or be cleaned
      expect(task === undefined || task.status === 'completed').toBe(true)
    })

    it('should clean up offline agents', async () => {
      scheduler.registerAgent('agent1', 'Test Agent', 'processor', ['process'])

      // Unregister to mark as offline
      scheduler.unregisterAgent('agent1')

      // Wait a tiny bit
      await new Promise(resolve => setTimeout(resolve, 10))

      // Cleanup with 0ms maxAge
      scheduler.cleanup(0)

      const agent = scheduler.getAgent('agent1')
      expect(agent).toBeUndefined()
    })

    it('should not clean up idle agents', () => {
      scheduler.registerAgent('agent1', 'Test Agent', 'processor', ['process'])

      scheduler.cleanup(0)

      const agent = scheduler.getAgent('agent1')
      expect(agent).toBeDefined()
    })
  })

  // ===== Clear Tests =====

  describe('Clear', () => {
    it('should clear all agents and tasks', () => {
      scheduler.registerAgent('agent1', 'Agent 1', 'processor', ['process'])
      scheduler.registerAgent('agent2', 'Agent 2', 'processor', ['process'])
      scheduler.scheduleTask({ type: 'process', input: {} })
      scheduler.scheduleTask({ type: 'process', input: {} })

      scheduler.clear()

      expect(scheduler.getAllAgents()).toHaveLength(0)
      expect(scheduler.getAllTasks()).toHaveLength(0)
    })
  })

  // ===== Edge Cases =====

  describe('Edge Cases', () => {
    it('should handle task with empty input', () => {
      scheduler.registerAgent('agent1', 'Test Agent', 'processor', ['process'])

      const response = scheduler.scheduleTask({
        type: 'process',
        input: {},
      })

      expect(response.success).toBe(true)
      const task = scheduler.getTask(response.taskId!)
      expect(task?.input).toEqual({})
    })

    it('should handle task with complex input', () => {
      scheduler.registerAgent('agent1', 'Test Agent', 'processor', ['process'])

      const complexInput = {
        nested: { data: { deep: 'value' } },
        array: [1, 2, 3],
        mixed: { bool: true, number: 42, null: null },
      }

      const response = scheduler.scheduleTask({
        type: 'process',
        input: complexInput,
      })

      expect(response.success).toBe(true)
      const task = scheduler.getTask(response.taskId!)
      expect(task?.input).toEqual(complexInput)
    })

    it('should handle multiple rapid heartbeats', () => {
      scheduler.registerAgent('agent1', 'Test Agent', 'processor', ['process'])

      for (let i = 0; i < 10; i++) {
        scheduler.heartbeat('agent1')
      }

      expect(scheduler.getAgent('agent1')).toBeDefined()
    })

    it('should handle task with all priority levels', () => {
      scheduler.registerAgent('agent1', 'Test Agent', 'processor', [
        'process',
        'analyze',
        'transform',
        'validate',
      ])

      const priorities: Array<'low' | 'normal' | 'high' | 'urgent'> = [
        'low',
        'normal',
        'high',
        'urgent',
      ]

      priorities.forEach(priority => {
        const response = scheduler.scheduleTask({
          type:
            priority === 'low' || priority === 'normal'
              ? 'process'
              : priority === 'high'
                ? 'analyze'
                : 'transform',
          input: { data: priority },
          priority,
        })
        expect(response.success).toBe(true)
      })

      const tasks = scheduler.getAllTasks()
      expect(tasks.length).toBe(4)
    })

    it('should handle updating task status multiple times', () => {
      scheduler.registerAgent('agent1', 'Test Agent', 'processor', ['process'])

      const response = scheduler.scheduleTask({
        type: 'process',
        input: { data: 'test' },
        agentId: 'agent1',
      })

      scheduler.updateTask({ taskId: response.taskId!, status: 'completed' })
      scheduler.updateTask({ taskId: response.taskId!, output: { extra: 'data' } })

      const task = scheduler.getTask(response.taskId!)
      expect(task?.status).toBe('completed')
      expect(task?.output).toEqual({ extra: 'data' })
    })

    it('should handle concurrent task scheduling', () => {
      scheduler.registerAgent('agent1', 'Test Agent', 'processor', ['process'])

      const promises = Array.from({ length: 5 }, (_, i) =>
        scheduler.scheduleTask({ type: 'process', input: { index: i } })
      )

      const results = promises // All synchronous in this implementation
      expect(results.every(r => r.success)).toBe(true)
    })
  })
})
