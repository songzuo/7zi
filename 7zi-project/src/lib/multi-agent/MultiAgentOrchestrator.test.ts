/**
 * MultiAgentOrchestrator 测试套件
 */

import { MultiAgentOrchestrator, Task, WorkflowStep } from './MultiAgentOrchestrator'
import { AgentRegistry, Agent } from '../agents/AgentRegistry'
import { A2AProtocol } from '../a2a/A2AProtocol'

// Mock A2AProtocol
jest.mock('../a2a/A2AProtocol')

describe('MultiAgentOrchestrator', () => {
  let orchestrator: MultiAgentOrchestrator
  let registry: AgentRegistry
  let a2a: jest.Mocked<A2AProtocol>

  // 测试用智能体
  const mockAgents: Agent[] = [
    {
      id: 'agent-1',
      name: 'Researcher',
      capabilities: ['research', 'analysis'],
      status: 'online',
      currentLoad: 0.2,
    },
    {
      id: 'agent-2',
      name: 'Coder',
      capabilities: ['coding', 'debugging'],
      status: 'online',
      currentLoad: 0.3,
    },
    {
      id: 'agent-3',
      name: 'Writer',
      capabilities: ['writing', 'translation'],
      status: 'online',
      currentLoad: 0.1,
    },
    {
      id: 'agent-4',
      name: 'Analyst',
      capabilities: ['analysis', 'visualization'],
      status: 'busy',
      currentLoad: 0.8,
    },
    {
      id: 'agent-5',
      name: 'MultiSkill',
      capabilities: ['research', 'coding', 'analysis'],
      status: 'online',
      currentLoad: 0.5,
    },
  ]

  beforeEach(() => {
    registry = new AgentRegistry()

    // 创建 mock A2AProtocol
    a2a = {
      send: jest
        .fn()
        .mockResolvedValue({
          id: 'msg-1',
          from: 'orchestrator',
          to: 'agent-1',
          type: 'request',
          timestamp: Date.now(),
          payload: {},
        }),
      request: jest.fn().mockResolvedValue({ success: true, data: 'mock result' }),
      respond: jest.fn().mockResolvedValue({ id: 'msg-2' }),
      notify: jest.fn().mockResolvedValue({ id: 'msg-3' }),
      error: jest.fn().mockResolvedValue({ id: 'msg-4' }),
      onMessage: jest.fn(),
      handleMessage: jest.fn(),
      cleanup: jest.fn(),
    } as unknown as jest.Mocked<A2AProtocol>

    orchestrator = new MultiAgentOrchestrator(registry, a2a)

    // 注册测试智能体
    mockAgents.forEach(agent => registry.register(agent))
  })

  afterEach(() => {
    registry.clear()
    jest.clearAllMocks()
  })

  /**
   * 测试 1: 动态分配任务 - 选择具备能力的智能体
   */
  describe('assignDynamically', () => {
    test('should assign task to agent with required capabilities', async () => {
      const task: Task = {
        id: 'task-1',
        title: 'Research Task',
        requiredCapabilities: ['research', 'analysis'],
      }

      const result = await orchestrator.assignDynamically(task)

      expect(result.taskId).toBe('task-1')
      expect(result.metadata.agentsUsed).toBe(1)
      expect(result.results).toHaveLength(1)
      // 应该选择 agent-1 (负载最低，具备 research 和 analysis 能力)
      expect(['agent-1', 'agent-5']).toContain(result.results[0].agentId)
    })

    test('should throw error when no capable agent available', async () => {
      const task: Task = {
        id: 'task-2',
        title: 'Special Task',
        requiredCapabilities: ['nonexistent-capability'],
      }

      await expect(orchestrator.assignDynamically(task)).rejects.toThrow(
        'No agents available with required capabilities'
      )
    })

    test('should select agent with lowest load', async () => {
      const task: Task = {
        id: 'task-3',
        title: 'Writing Task',
        requiredCapabilities: ['writing'],
      }

      const result = await orchestrator.assignDynamically(task)

      // agent-3 负载最低 (0.1)，应该被选中
      expect(result.results[0].agentId).toBe('agent-3')
    })
  })

  /**
   * 测试 2: 并行执行 - 多智能体协同工作
   */
  describe('executeParallel', () => {
    test('should execute task in parallel with multiple agents', async () => {
      const task: Task = {
        id: 'parallel-task-1',
        title: 'Parallel Research',
        requiredCapabilities: ['research'],
        aggregationStrategy: 'all',
      }

      // 选择具备 research 能力的智能体
      const researchAgents = mockAgents.filter(
        a => a.capabilities.includes('research') && a.status === 'online'
      )

      const result = await orchestrator.executeParallel(researchAgents, task)

      expect(result.taskId).toBe('parallel-task-1')
      expect(result.results.length).toBeGreaterThan(0)
      expect(result.metadata.agentsUsed).toBe(researchAgents.length)
      expect(a2a.request).toHaveBeenCalledTimes(researchAgents.length)
    })

    test('should aggregate results using "first" strategy', async () => {
      const task: Task = {
        id: 'parallel-task-2',
        title: 'First Result Task',
        requiredCapabilities: ['analysis'],
        aggregationStrategy: 'first',
      }

      const agents = mockAgents.filter(
        a => a.capabilities.includes('analysis') && a.status === 'online'
      )

      const result = await orchestrator.executeParallel(agents, task)

      // first 策略应返回第一个结果
      expect(result.aggregated).toBeDefined()
    })

    test('should aggregate results using "all" strategy', async () => {
      const task: Task = {
        id: 'parallel-task-3',
        title: 'All Results Task',
        requiredCapabilities: ['coding'],
        aggregationStrategy: 'all',
      }

      const agents = mockAgents.filter(
        a => a.capabilities.includes('coding') && a.status === 'online'
      )

      const result = await orchestrator.executeParallel(agents, task)

      // all 策略应返回所有结果数组
      expect(Array.isArray(result.aggregated)).toBe(true)
    })

    test('should handle maxAgents limit', async () => {
      const task: Task = {
        id: 'limited-task',
        title: 'Limited Agents Task',
        requiredCapabilities: ['research'],
      }

      const agents = mockAgents.filter(
        a => a.capabilities.includes('research') && a.status === 'online'
      )

      const result = await orchestrator.executeParallel(agents, task, { maxAgents: 1 })

      expect(result.metadata.agentsUsed).toBe(1)
    })

    test('should throw error when no available agents', async () => {
      const task: Task = {
        id: 'no-agents-task',
        title: 'No Agents Task',
        requiredCapabilities: ['research'],
      }

      // 所有智能体都忙碌
      const busyAgents = mockAgents.map(a => ({ ...a, status: 'busy' as const, currentLoad: 0.95 }))

      await expect(orchestrator.executeParallel(busyAgents, task)).rejects.toThrow(
        'No available agents for parallel execution'
      )
    })
  })

  /**
   * 测试 3: 串行执行工作流
   */
  describe('executeSequential', () => {
    test('should execute workflow steps sequentially', async () => {
      const workflow: WorkflowStep[] = [
        {
          taskId: 'step-1',
          task: { id: 'step-1', title: 'First Step', requiredCapabilities: ['research'] },
        },
        {
          taskId: 'step-2',
          task: { id: 'step-2', title: 'Second Step', requiredCapabilities: ['analysis'] },
          dependsOn: ['step-1'],
        },
      ]

      const results = await orchestrator.executeSequential(workflow)

      expect(results).toHaveLength(2)
      expect(results[0].taskId).toBe('step-1')
      expect(results[1].taskId).toBe('step-2')
    })

    test('should throw error on unmet dependencies', async () => {
      const workflow: WorkflowStep[] = [
        {
          taskId: 'step-2',
          task: { id: 'step-2', title: 'Second Step', requiredCapabilities: ['research'] },
          dependsOn: ['step-1'], // step-1 不在工作流中
        },
      ]

      await expect(orchestrator.executeSequential(workflow)).rejects.toThrow(
        'has unmet dependencies'
      )
    })

    test('should complete workflow with multiple steps', async () => {
      const workflow: WorkflowStep[] = [
        {
          taskId: 'research',
          task: { id: 'research', title: 'Research Phase', requiredCapabilities: ['research'] },
        },
        {
          taskId: 'analysis',
          task: { id: 'analysis', title: 'Analysis Phase', requiredCapabilities: ['analysis'] },
          dependsOn: ['research'],
        },
        {
          taskId: 'coding',
          task: { id: 'coding', title: 'Coding Phase', requiredCapabilities: ['coding'] },
          dependsOn: ['analysis'],
        },
      ]

      const results = await orchestrator.executeSequential(workflow)

      expect(results).toHaveLength(3)
      expect(results[0].metadata.successCount).toBe(1)
      expect(results[1].metadata.successCount).toBe(1)
      expect(results[2].metadata.successCount).toBe(1)
    })
  })

  /**
   * 测试 4: 聚合策略
   */
  describe('aggregation strategies', () => {
    const createTask = (strategy: Task['aggregationStrategy']): Task => ({
      id: `task-${strategy}`,
      title: `${strategy} Strategy Task`,
      requiredCapabilities: ['research'],
      aggregationStrategy: strategy,
    })

    test('should aggregate using "vote" strategy', async () => {
      const task = createTask('vote')
      const agents = mockAgents.filter(
        a => a.capabilities.includes('research') && a.status === 'online'
      )

      // 为每个 agent 设置相同的响应以便投票
      a2a.request.mockResolvedValue({ consensus: true, value: 'agreed' })

      const result = await orchestrator.executeParallel(agents, task)

      // vote 策略应返回投票最多的结果
      expect(result.aggregated).toBeDefined()
    })

    test('should handle "custom" aggregation strategy', async () => {
      const task = createTask('custom')
      const agents = mockAgents.filter(
        a => a.capabilities.includes('research') && a.status === 'online'
      )

      const result = await orchestrator.executeParallel(agents, task)

      // custom 策略返回所有结果数组
      expect(Array.isArray(result.aggregated)).toBe(true)
    })
  })

  /**
   * 测试 5: 错误处理和负载管理
   */
  describe('error handling and load management', () => {
    test('should track success and failure counts', async () => {
      const task: Task = {
        id: 'mixed-task',
        title: 'Mixed Results Task',
        requiredCapabilities: ['research'],
      }

      const agents = mockAgents.filter(
        a => a.capabilities.includes('research') && a.status === 'online'
      )

      // 模拟一些失败
      a2a.request
        .mockRejectedValueOnce(new Error('Simulated failure'))
        .mockResolvedValue({ success: true })

      const result = await orchestrator.executeParallel(agents, task)

      expect(result.metadata.failureCount).toBeGreaterThanOrEqual(0)
      expect(result.metadata.successCount + result.metadata.failureCount).toBe(agents.length)
    })

    test('should update agent load during execution', async () => {
      const task: Task = {
        id: 'load-test',
        title: 'Load Test Task',
        requiredCapabilities: ['writing'],
      }

      const initialLoad = registry.get('agent-3')?.currentLoad || 0

      await orchestrator.assignDynamically(task)

      const finalLoad = registry.get('agent-3')?.currentLoad || 0

      // 负载应该在执行后恢复
      expect(finalLoad).toBeCloseTo(initialLoad, 1)
    })

    test('should handle errors gracefully', async () => {
      const task: Task = {
        id: 'error-task',
        title: 'Error Task',
        requiredCapabilities: ['research'],
      }

      // 模拟错误
      a2a.request.mockRejectedValue(new Error('Test error'))

      const agents = mockAgents.filter(
        a => a.capabilities.includes('research') && a.status === 'online'
      )

      const result = await orchestrator.executeParallel(agents, task)

      expect(result.metadata.failureCount).toBe(agents.length)
      expect(result.metadata.successCount).toBe(0)
    })
  })

  /**
   * 测试 6: 边界情况
   */
  describe('edge cases', () => {
    test('should handle empty agent list', async () => {
      const task: Task = {
        id: 'empty-task',
        title: 'Empty Agent Task',
        requiredCapabilities: ['research'],
      }

      await expect(orchestrator.executeParallel([], task)).rejects.toThrow(
        'No available agents for parallel execution'
      )
    })

    test('should handle workflow with single step', async () => {
      const workflow: WorkflowStep[] = [
        {
          taskId: 'single-step',
          task: { id: 'single-step', title: 'Single Step', requiredCapabilities: ['research'] },
        },
      ]

      const results = await orchestrator.executeSequential(workflow)

      expect(results).toHaveLength(1)
    })

    test('should return registry and protocol instances', () => {
      expect(orchestrator.getAgentRegistry()).toBeInstanceOf(AgentRegistry)
      expect(orchestrator.getA2AProtocol()).toBe(a2a)
    })
  })
})
