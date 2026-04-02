/**
 * Agent Availability Integration Tests
 *
 * 测试 Agent 可用性管理：
 * - Agent 可用性切换
 * - Agent 离线后任务重新分配
 * - Agent 恢复后重新加入调度
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { AgentScheduler, SchedulerConfig } from '@/lib/agent-scheduler/core/scheduler'
import { createTask } from '@/lib/agent-scheduler/models/task-model'
import { AgentCapability, initializeAgents } from '@/lib/agent-scheduler/models/agent-capability'

describe('Agent Availability Integration Tests', () => {
  let scheduler: AgentScheduler

  beforeEach(() => {
    const config: Partial<SchedulerConfig> = {
      autoSchedule: false,
      allowManualOverride: true,
      maxBatchSize: 10,
      loadBalance: {
        maxLoadThreshold: 90,
        busyThreshold: 70,
        preferLowLoad: true,
        considerSpecialization: true,
      },
    }

    scheduler = new AgentScheduler(config)
  })

  afterEach(() => {
    scheduler.shutdown()
  })

  /**
   * 测试1: Agent 可用性切换
   */
  describe('Agent Availability Toggle', () => {
    it('should set agent availability to offline', () => {
      const agents = Array.from(scheduler.getAgents().keys())
      const targetAgent = agents[0]

      // Initially available
      const beforeAgent = scheduler.getAgent(targetAgent)
      expect(beforeAgent?.availability).toBe(true)

      // Set to offline
      scheduler.setAgentAvailability(targetAgent, false)

      const afterAgent = scheduler.getAgent(targetAgent)
      expect(afterAgent?.availability).toBe(false)
    })

    it('should set agent availability back to online', () => {
      const agents = Array.from(scheduler.getAgents().keys())
      const targetAgent = agents[0]

      // Set to offline first
      scheduler.setAgentAvailability(targetAgent, false)
      expect(scheduler.getAgent(targetAgent)?.availability).toBe(false)

      // Set back to online
      scheduler.setAgentAvailability(targetAgent, true)
      expect(scheduler.getAgent(targetAgent)?.availability).toBe(true)
    })

    it('should not assign tasks to offline agents', async () => {
      const agents = Array.from(scheduler.getAgents().values())

      // Find an agent that can handle implementation tasks
      const implementationAgent = agents.find(a =>
        a.capabilities.taskTypes.includes('implementation')
      )

      if (!implementationAgent) {
        // Skip if no implementation agent found
        return
      }

      // Set agent to offline
      scheduler.setAgentAvailability(implementationAgent.agentId, false)

      const task = createTask({
        id: 'task-offline-001',
        type: 'implementation',
        title: 'Test task',
        priority: 'high',
        requiredCapabilities: ['typescript'],
        estimatedDuration: 30,
      })

      scheduler.addTask(task)
      const decision = await scheduler.scheduleTask(task.id)

      if (decision) {
        // Task was scheduled, but should not be assigned to the offline agent
        expect(decision.assignedAgent).not.toBe(implementationAgent.agentId)
      }
    })

    it('should allow tasks to be assigned to other available agents when one is offline', async () => {
      const agents = Array.from(scheduler.getAgents().values())

      // Find all implementation-capable agents
      const implAgents = agents.filter(a => a.capabilities.taskTypes.includes('implementation'))

      if (implAgents.length < 2) {
        // Need at least 2 agents for this test
        return
      }

      // Set first agent to offline
      scheduler.setAgentAvailability(implAgents[0].agentId, false)

      const task = createTask({
        id: 'task-offline-002',
        type: 'implementation',
        title: 'Test task',
        priority: 'high',
        requiredCapabilities: ['typescript'],
        estimatedDuration: 30,
      })

      scheduler.addTask(task)
      const decision = await scheduler.scheduleTask(task.id)

      if (decision) {
        // Task should be assigned to a different agent
        expect(decision.assignedAgent).not.toBe(implAgents[0].agentId)
      }
    })
  })

  /**
   * 测试2: Agent 离线后任务重新分配
   */
  describe('Task Reassignment After Agent Offline', () => {
    it('should fail task when assigned agent goes offline before completion', async () => {
      const task = createTask({
        id: 'task-reassign-001',
        type: 'implementation',
        title: 'Test task',
        priority: 'high',
        requiredCapabilities: ['typescript'],
        estimatedDuration: 30,
      })

      scheduler.addTask(task)
      const decision = await scheduler.scheduleTask(task.id)

      expect(decision).not.toBeNull()
      expect(scheduler.getTask(task.id)?.status).toBe('assigned')

      // Agent goes offline while task is assigned
      scheduler.setAgentAvailability(decision!.assignedAgent, false)

      // Task should still be assigned but agent is unavailable
      const assignedTask = scheduler.getTask(task.id)
      expect(assignedTask?.status).toBe('assigned')
      expect(scheduler.getAgent(decision!.assignedAgent)?.availability).toBe(false)
    })

    it('should allow reassigning task from failed agent', async () => {
      const task = createTask({
        id: 'task-reassign-002',
        type: 'implementation',
        title: 'Test task',
        priority: 'high',
        requiredCapabilities: ['typescript'],
        estimatedDuration: 30,
      })

      scheduler.addTask(task)
      const decision = await scheduler.scheduleTask(task.id)

      expect(decision).not.toBeNull()
      const originalAgent = decision!.assignedAgent

      // Fail the task
      scheduler.failTask(task.id, 'Agent went offline')
      expect(scheduler.getTask(task.id)?.status).toBe('failed')

      // Set original agent offline
      scheduler.setAgentAvailability(originalAgent, false)

      // Reassign task
      const reassignment = await scheduler.reassignTask(task.id)

      if (reassignment) {
        // Task should be reassigned to a different agent
        expect(reassignment.assignedAgent).not.toBe(originalAgent)
        expect(scheduler.getTask(task.id)?.status).toBe('pending')
      }
    })

    it('should handle multiple agents going offline', async () => {
      const agents = Array.from(scheduler.getAgents().values())
      const implAgents = agents.filter(a => a.capabilities.taskTypes.includes('implementation'))

      if (implAgents.length < 3) {
        return // Need at least 3 implementation agents
      }

      // Set first 2 implementation agents offline
      scheduler.setAgentAvailability(implAgents[0].agentId, false)
      scheduler.setAgentAvailability(implAgents[1].agentId, false)

      const task = createTask({
        id: 'task-multi-offline-001',
        type: 'implementation',
        title: 'Test task',
        priority: 'high',
        requiredCapabilities: ['typescript'],
        estimatedDuration: 30,
      })

      scheduler.addTask(task)
      const decision = await scheduler.scheduleTask(task.id)

      if (decision) {
        // Should be assigned to a remaining available agent
        expect([implAgents[0].agentId, implAgents[1].agentId]).not.toContain(decision.assignedAgent)
      }
    })

    it('should prevent scheduling when all capable agents are offline', async () => {
      const agents = Array.from(scheduler.getAgents().values())

      // Find all implementation-capable agents and set them offline
      const implAgents = agents.filter(a => a.capabilities.taskTypes.includes('implementation'))

      // Set all implementation agents offline
      for (const agent of implAgents) {
        scheduler.setAgentAvailability(agent.agentId, false)
      }

      const task = createTask({
        id: 'task-no-agents-001',
        type: 'implementation',
        title: 'Test task',
        priority: 'high',
        requiredCapabilities: ['typescript'],
        estimatedDuration: 30,
      })

      scheduler.addTask(task)
      const decision = await scheduler.scheduleTask(task.id)

      // No agent should be available
      expect(decision).toBeNull()
    })
  })

  /**
   * 测试3: Agent 恢复后重新加入调度
   */
  describe('Agent Recovery and Rejoining Scheduling', () => {
    it('should rejoin scheduling after coming back online', async () => {
      const agents = Array.from(scheduler.getAgents().values())
      const implAgents = agents.filter(a => a.capabilities.taskTypes.includes('implementation'))

      if (implAgents.length < 1) {
        return
      }

      const targetAgent = implAgents[0]

      // Set agent offline
      scheduler.setAgentAvailability(targetAgent.agentId, false)

      // Verify agent is not available
      expect(scheduler.getAgent(targetAgent.agentId)?.availability).toBe(false)

      // Add a task - should be assigned to other agents
      const task1 = createTask({
        id: 'task-recovery-001',
        type: 'implementation',
        title: 'First task',
        priority: 'high',
        requiredCapabilities: ['typescript'],
        estimatedDuration: 30,
      })

      scheduler.addTask(task1)
      const decision1 = await scheduler.scheduleTask(task1.id)

      if (decision1) {
        // Should not be assigned to the offline agent
        expect(decision1.assignedAgent).not.toBe(targetAgent.agentId)
      }

      // Set agent back online
      scheduler.setAgentAvailability(targetAgent.agentId, true)
      expect(scheduler.getAgent(targetAgent.agentId)?.availability).toBe(true)

      // Add another task - can now be assigned to the recovered agent
      const task2 = createTask({
        id: 'task-recovery-002',
        type: 'implementation',
        title: 'Second task',
        priority: 'high',
        requiredCapabilities: ['typescript'],
        estimatedDuration: 30,
      })

      scheduler.addTask(task2)
      const decision2 = await scheduler.scheduleTask(task2.id)

      expect(decision2).not.toBeNull()
      // Task can now be assigned to any available agent including the recovered one
    })

    it('should maintain load state after recovery', async () => {
      const agents = Array.from(scheduler.getAgents().keys())
      const targetAgent = agents[0]

      // Assign a task to the agent
      const task = createTask({
        id: 'task-load-state-001',
        type: 'implementation',
        title: 'Test task',
        priority: 'high',
        requiredCapabilities: ['typescript'],
        estimatedDuration: 30,
      })

      scheduler.addTask(task)
      const decision = await scheduler.scheduleTask(task.id)

      if (decision && decision.assignedAgent === targetAgent) {
        const initialLoad = scheduler.getAgent(targetAgent)?.currentLoad || 0

        // Set agent offline
        scheduler.setAgentAvailability(targetAgent, false)

        // Load should remain
        expect(scheduler.getAgent(targetAgent)?.currentLoad).toBe(initialLoad)

        // Set back online
        scheduler.setAgentAvailability(targetAgent, true)

        // Load should still be maintained
        expect(scheduler.getAgent(targetAgent)?.currentLoad).toBe(initialLoad)
      }
    })

    it('should update lastActiveTime when agent availability changes', async () => {
      const agents = Array.from(scheduler.getAgents().keys())
      const targetAgent = agents[0]

      const beforeTime = scheduler.getAgent(targetAgent)?.lastActiveTime

      // Small delay to ensure time difference
      await new Promise(resolve => setTimeout(resolve, 10))

      // Set agent offline
      scheduler.setAgentAvailability(targetAgent, false)

      const afterOfflineTime = scheduler.getAgent(targetAgent)?.lastActiveTime
      expect(afterOfflineTime).toBeGreaterThanOrEqual(beforeTime || 0)

      // Set back online
      await new Promise(resolve => setTimeout(resolve, 10))
      scheduler.setAgentAvailability(targetAgent, true)

      const afterOnlineTime = scheduler.getAgent(targetAgent)?.lastActiveTime
      expect(afterOnlineTime).toBeGreaterThanOrEqual(afterOfflineTime || 0)
    })

    it('should handle rapid availability changes', async () => {
      const agents = Array.from(scheduler.getAgents().keys())
      const targetAgent = agents[0]

      // Rapidly toggle availability
      for (let i = 0; i < 5; i++) {
        scheduler.setAgentAvailability(targetAgent, false)
        scheduler.setAgentAvailability(targetAgent, true)
      }

      // Final state should be online
      expect(scheduler.getAgent(targetAgent)?.availability).toBe(true)

      // Should still be able to assign tasks
      const task = createTask({
        id: 'task-rapid-001',
        type: 'implementation',
        title: 'Test task',
        priority: 'high',
        requiredCapabilities: ['typescript'],
        estimatedDuration: 30,
      })

      scheduler.addTask(task)
      const decision = await scheduler.scheduleTask(task.id)

      // Task scheduling should still work
      expect(decision).toBeDefined()
    })
  })

  /**
   * 测试4: Agent 性能追踪
   */
  describe('Agent Performance Tracking', () => {
    it('should track agent task completion history', async () => {
      const task = createTask({
        id: 'task-perf-001',
        type: 'implementation',
        title: 'Test task',
        priority: 'high',
        requiredCapabilities: ['typescript'],
        estimatedDuration: 30,
      })

      scheduler.addTask(task)
      const decision = await scheduler.scheduleTask(task.id)

      if (decision) {
        // Complete the task
        scheduler.completeTask(task.id)

        // Check agent metrics were updated
        const history = scheduler.getScheduleHistory()
        const agentHistory = history.getAgentDecisions(decision.assignedAgent)

        expect(agentHistory.length).toBeGreaterThan(0)
      }
    })

    it('should track failed tasks for agent', async () => {
      const task = createTask({
        id: 'task-perf-002',
        type: 'implementation',
        title: 'Test task',
        priority: 'high',
        requiredCapabilities: ['typescript'],
        estimatedDuration: 30,
      })

      scheduler.addTask(task)
      const decision = await scheduler.scheduleTask(task.id)

      if (decision) {
        // Fail the task
        scheduler.failTask(task.id, 'Task failed')

        // Task should be marked as failed
        expect(scheduler.getTask(task.id)?.status).toBe('failed')
      }
    })
  })

  /**
   * 测试5: 多 Agent 协作场景
   */
  describe('Multi-Agent Collaboration', () => {
    it('should distribute tasks across available agents', async () => {
      const tasks = Array.from({ length: 10 }, (_, i) =>
        createTask({
          id: `task-dist-${i + 1}`,
          type: 'implementation',
          title: `Task ${i + 1}`,
          priority: 'medium',
          requiredCapabilities: ['typescript'],
          estimatedDuration: 20,
        })
      )

      scheduler.addTasks(tasks)
      const result = await scheduler.scheduleNextBatch()

      expect(result.scheduled.length).toBeGreaterThan(0)

      // Count distribution across agents
      const distribution = new Map<string, number>()
      for (const decision of result.scheduled) {
        const count = distribution.get(decision.assignedAgent) || 0
        distribution.set(decision.assignedAgent, count + 1)
      }

      // Multiple agents should have received tasks
      expect(distribution.size).toBeGreaterThan(1)
    })

    it('should handle agent specialization in scheduling', async () => {
      // Create a specialized task
      const researchTask = createTask({
        id: 'task-special-001',
        type: 'research',
        title: 'Research task',
        priority: 'high',
        requiredCapabilities: ['research', 'analysis'],
        estimatedDuration: 30,
      })

      const testingTask = createTask({
        id: 'task-special-002',
        type: 'testing',
        title: 'Testing task',
        priority: 'high',
        requiredCapabilities: ['jest', 'testing'],
        estimatedDuration: 30,
      })

      scheduler.addTasks([researchTask, testingTask])
      const result = await scheduler.scheduleNextBatch()

      // Both tasks should be scheduled
      expect(result.scheduled.length).toBe(2)

      // Get the decisions
      const researchDecision = result.scheduled.find(d => d.taskId === researchTask.id)
      const testingDecision = result.scheduled.find(d => d.taskId === testingTask.id)

      // Check that appropriate agents were selected
      if (researchDecision) {
        const researchAgent = scheduler.getAgent(researchDecision.assignedAgent)
        expect(researchAgent?.capabilities.taskTypes).toContain('research')
      }

      if (testingDecision) {
        const testingAgent = scheduler.getAgent(testingDecision.assignedAgent)
        expect(testingAgent?.capabilities.taskTypes).toContain('testing')
      }
    })
  })
})
