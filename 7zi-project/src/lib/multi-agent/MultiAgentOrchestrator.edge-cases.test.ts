/**
 * MultiAgentOrchestrator 边缘情况测试
 *
 * 覆盖以下边缘情况：
 * - 空输入 / 空值 / null / undefined
 * - 超长输入（标题、payload、能力列表）
 * - 特殊字符（Unicode、emoji、控制字符）
 * - 并发执行竞态条件
 * - 超时处理和边界值
 * - 循环依赖和复杂依赖图
 * - 负载边界值（0.0, 0.9, 1.0, 负数）
 * - 无效参数（NaN、Infinity）
 */

import {
  MultiAgentOrchestrator,
  Task,
  WorkflowStep,
  ExecutionOptions,
} from './MultiAgentOrchestrator'
import { AgentRegistry, Agent } from '../agents/AgentRegistry'
import { A2AProtocol } from '../a2a/A2AProtocol'

jest.mock('../a2a/A2AProtocol')

describe('MultiAgentOrchestrator - Edge Cases', () => {
  let orchestrator: MultiAgentOrchestrator
  let registry: AgentRegistry
  let a2a: jest.Mocked<A2AProtocol>

  const createMockAgent = (id: string, overrides: Partial<Agent> = {}): Agent => ({
    id,
    name: `Agent-${id}`,
    capabilities: ['research'],
    status: 'online',
    currentLoad: 0.1,
    ...overrides,
  })

  beforeEach(() => {
    registry = new AgentRegistry()
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
  })

  afterEach(() => {
    registry.clear()
    jest.clearAllMocks()
  })

  // ==========================================
  // 1. 空输入 / 空值 / null / undefined 测试
  // ==========================================
  describe('empty/null/undefined inputs', () => {
    test('should handle task with empty id', async () => {
      registry.register(createMockAgent('agent-1'))

      const task: Task = {
        id: '',
        title: 'Task with empty ID',
        requiredCapabilities: ['research'],
      }

      const result = await orchestrator.assignDynamically(task)
      expect(result.taskId).toBe('')
    })

    test('should handle task with empty title', async () => {
      registry.register(createMockAgent('agent-1'))

      const task: Task = {
        id: 'task-1',
        title: '',
        requiredCapabilities: ['research'],
      }

      const result = await orchestrator.assignDynamically(task)
      expect(result.taskId).toBe('task-1')
    })

    test('should handle task with empty requiredCapabilities', async () => {
      registry.register(createMockAgent('agent-1'))

      const task: Task = {
        id: 'task-empty-cap',
        title: 'Task with empty capabilities',
        requiredCapabilities: [],
      }

      const result = await orchestrator.assignDynamically(task)
      expect(result.metadata.successCount).toBe(1)
    })

    test('should handle task with undefined payload', async () => {
      registry.register(createMockAgent('agent-1'))

      const task: Task = {
        id: 'task-undef-payload',
        title: 'Task with undefined payload',
        requiredCapabilities: ['research'],
        payload: undefined,
      }

      const result = await orchestrator.assignDynamically(task)
      expect(result).toBeDefined()
    })

    test('should handle task with null payload', async () => {
      registry.register(createMockAgent('agent-1'))

      const task: Task = {
        id: 'task-null-payload',
        title: 'Task with null payload',
        requiredCapabilities: ['research'],
        payload: null as unknown as undefined,
      }

      const result = await orchestrator.assignDynamically(task)
      expect(result).toBeDefined()
    })

    test('should handle workflow step with empty dependsOn array', async () => {
      registry.register(createMockAgent('agent-1'))

      const workflow: WorkflowStep[] = [
        {
          taskId: 'step-1',
          task: { id: 'step-1', title: 'Step 1', requiredCapabilities: ['research'] },
          dependsOn: [],
        },
      ]

      const results = await orchestrator.executeSequential(workflow)
      expect(results).toHaveLength(1)
    })

    test('should handle options with all undefined values', async () => {
      registry.register(createMockAgent('agent-1'))

      const task: Task = {
        id: 'task-undef-options',
        title: 'Task with undefined options',
        requiredCapabilities: ['research'],
      }

      const options: ExecutionOptions = {
        timeout: undefined,
        maxAgents: undefined,
        retryOnFailure: undefined,
        maxRetries: undefined,
      }

      const result = await orchestrator.assignDynamically(task, options)
      expect(result).toBeDefined()
    })
  })

  // ==========================================
  // 2. 超长输入测试
  // ==========================================
  describe('extremely long inputs', () => {
    const generateLongString = (length: number): string => 'x'.repeat(length)

    test('should handle task with extremely long title (10000 chars)', async () => {
      registry.register(createMockAgent('agent-1'))

      const task: Task = {
        id: 'long-title',
        title: generateLongString(10000),
        requiredCapabilities: ['research'],
      }

      const result = await orchestrator.assignDynamically(task)
      expect(result.taskId).toBe('long-title')
    })

    test('should handle task with extremely long id (1000 chars)', async () => {
      registry.register(createMockAgent('agent-1'))

      const task: Task = {
        id: generateLongString(1000),
        title: 'Long ID Task',
        requiredCapabilities: ['research'],
      }

      const result = await orchestrator.assignDynamically(task)
      expect(result.taskId.length).toBe(1000)
    })

    test('should handle task with large payload object', async () => {
      registry.register(createMockAgent('agent-1'))

      const largePayload = {
        data: Array(1000)
          .fill(null)
          .map((_, i) => ({
            id: i,
            value: `item-${i}`,
            nested: { a: 1, b: 2, c: { d: 3 } },
          })),
      }

      const task: Task = {
        id: 'large-payload',
        title: 'Large Payload Task',
        requiredCapabilities: ['research'],
        payload: largePayload,
      }

      const result = await orchestrator.assignDynamically(task)
      expect(result).toBeDefined()
    })

    test('should handle task with many requiredCapabilities', async () => {
      registry.register(
        createMockAgent('agent-1', {
          capabilities: Array(100)
            .fill(null)
            .map((_, i) => `capability-${i}`),
        })
      )

      const task: Task = {
        id: 'many-caps',
        title: 'Many Capabilities Task',
        requiredCapabilities: Array(50)
          .fill(null)
          .map((_, i) => `capability-${i}`),
      }

      const result = await orchestrator.assignDynamically(task)
      expect(result).toBeDefined()
    })

    test('should handle workflow with many steps (100 steps)', async () => {
      registry.register(createMockAgent('agent-1'))

      const workflow: WorkflowStep[] = Array(100)
        .fill(null)
        .map((_, i) => ({
          taskId: `step-${i}`,
          task: { id: `step-${i}`, title: `Step ${i}`, requiredCapabilities: ['research'] },
          ...(i > 0 ? { dependsOn: [`step-${i - 1}`] } : {}),
        }))

      const results = await orchestrator.executeSequential(workflow)
      expect(results).toHaveLength(100)
    }, 30000)

    test('should handle parallel execution with many agents (50 agents)', async () => {
      Array(50)
        .fill(null)
        .forEach((_, i) => {
          registry.register(createMockAgent(`agent-${i}`))
        })

      const task: Task = {
        id: 'many-agents',
        title: 'Many Agents Task',
        requiredCapabilities: ['research'],
        aggregationStrategy: 'all',
      }

      const agents = Array(50)
        .fill(null)
        .map((_, i) => createMockAgent(`agent-${i}`))
      const result = await orchestrator.executeParallel(agents, task)

      expect(result.metadata.agentsUsed).toBe(50)
    })

    test('should handle circular reference in payload', async () => {
      registry.register(createMockAgent('agent-1'))

      const circularObj: { self?: typeof circularObj; value: string } = { value: 'test' }
      circularObj.self = circularObj

      const task: Task = {
        id: 'circular-payload',
        title: 'Circular Payload Task',
        requiredCapabilities: ['research'],
        payload: circularObj,
      }

      const result = await orchestrator.assignDynamically(task)
      expect(result).toBeDefined()
    })
  })

  // ==========================================
  // 3. 特殊字符测试
  // ==========================================
  describe('special characters', () => {
    test('should handle task with Unicode characters in title', async () => {
      registry.register(createMockAgent('agent-1'))

      const task: Task = {
        id: 'unicode-task',
        title: '任务标题 🎉 你好世界 Привет مرحبا',
        requiredCapabilities: ['research'],
      }

      const result = await orchestrator.assignDynamically(task)
      expect(result.taskId).toBe('unicode-task')
    })

    test('should handle task with emoji in id', async () => {
      registry.register(createMockAgent('agent-1'))

      const task: Task = {
        id: 'task-🚀-🎉-💻',
        title: 'Emoji ID Task',
        requiredCapabilities: ['research'],
      }

      const result = await orchestrator.assignDynamically(task)
      expect(result.taskId).toBe('task-🚀-🎉-💻')
    })

    test('should handle task with special characters that could cause SQL injection', async () => {
      registry.register(createMockAgent('agent-1'))

      const task: Task = {
        id: "task'; DROP TABLE agents; --",
        title: "Robert'); DROP TABLE students; --",
        requiredCapabilities: ['research'],
      }

      const result = await orchestrator.assignDynamically(task)
      expect(result.taskId).toContain("'")
    })

    test('should handle task with control characters', async () => {
      registry.register(createMockAgent('agent-1'))

      const task: Task = {
        id: 'task-control-chars',
        title: 'Title with \n \t \r \0 control chars',
        requiredCapabilities: ['research'],
      }

      const result = await orchestrator.assignDynamically(task)
      expect(result).toBeDefined()
    })

    test('should handle task with HTML/JS injection attempts', async () => {
      registry.register(createMockAgent('agent-1'))

      const task: Task = {
        id: 'injection-task',
        title: '<script>alert("XSS")</script>',
        requiredCapabilities: ['research'],
        payload: { html: '<img src="x" onerror="alert(1)">' },
      }

      const result = await orchestrator.assignDynamically(task)
      expect(result).toBeDefined()
    })

    test('should handle task with path traversal attempts', async () => {
      registry.register(createMockAgent('agent-1'))

      const task: Task = {
        id: '../../../etc/passwd',
        title: 'Path traversal test',
        requiredCapabilities: ['research'],
        payload: { path: '..\\..\\..\\windows\\system32' },
      }

      const result = await orchestrator.assignDynamically(task)
      expect(result.taskId).toContain('..')
    })

    test('should handle task with zero-width characters', async () => {
      registry.register(createMockAgent('agent-1'))

      const task: Task = {
        id: 'task\u200B\u200C\u200Dzero-width',
        title: 'Zero\u200Bwidth\u200Cchars',
        requiredCapabilities: ['research'],
      }

      const result = await orchestrator.assignDynamically(task)
      expect(result.taskId).toContain('\u200B')
    })
  })

  // ==========================================
  // 4. 并发执行测试
  // ==========================================
  describe('concurrent execution', () => {
    test('should handle concurrent assignDynamically calls', async () => {
      registry.register(createMockAgent('agent-1', { currentLoad: 0.1 }))
      registry.register(createMockAgent('agent-2', { currentLoad: 0.2 }))

      const tasks: Task[] = Array(10)
        .fill(null)
        .map((_, i) => ({
          id: `concurrent-task-${i}`,
          title: `Concurrent Task ${i}`,
          requiredCapabilities: ['research'],
        }))

      const promises = tasks.map(task => orchestrator.assignDynamically(task))
      const results = await Promise.all(promises)

      expect(results).toHaveLength(10)
      results.forEach((result, i) => {
        expect(result.taskId).toBe(`concurrent-task-${i}`)
      })
    })

    test('should handle concurrent executeSequential with separate workflows', async () => {
      registry.register(createMockAgent('agent-1'))
      registry.register(createMockAgent('agent-2'))

      const workflow1: WorkflowStep[] = [
        {
          taskId: 'w1-step1',
          task: { id: 'w1-step1', title: 'W1 Step 1', requiredCapabilities: ['research'] },
        },
        {
          taskId: 'w1-step2',
          task: { id: 'w1-step2', title: 'W1 Step 2', requiredCapabilities: ['research'] },
          dependsOn: ['w1-step1'],
        },
      ]

      const workflow2: WorkflowStep[] = [
        {
          taskId: 'w2-step1',
          task: { id: 'w2-step1', title: 'W2 Step 1', requiredCapabilities: ['research'] },
        },
        {
          taskId: 'w2-step2',
          task: { id: 'w2-step2', title: 'W2 Step 2', requiredCapabilities: ['research'] },
          dependsOn: ['w2-step1'],
        },
      ]

      const [results1, results2] = await Promise.all([
        orchestrator.executeSequential(workflow1),
        orchestrator.executeSequential(workflow2),
      ])

      expect(results1).toHaveLength(2)
      expect(results2).toHaveLength(2)
    })

    test('should handle race condition with load updates', async () => {
      const agent1 = createMockAgent('agent-1', { currentLoad: 0.4 })
      registry.register(agent1)

      a2a.request.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ success: true }), 100))
      )

      const task: Task = {
        id: 'race-task',
        title: 'Race Condition Task',
        requiredCapabilities: ['research'],
      }

      const promises = Array(5)
        .fill(null)
        .map(() => orchestrator.assignDynamically(task))
      const results = await Promise.all(promises)

      expect(results).toHaveLength(5)
    })

    test('should handle concurrent parallel executions', async () => {
      Array(10)
        .fill(null)
        .forEach((_, i) => {
          registry.register(createMockAgent(`agent-${i}`))
        })

      const task: Task = {
        id: 'parallel-concurrent',
        title: 'Parallel Concurrent Task',
        requiredCapabilities: ['research'],
      }

      const agents1 = Array(5)
        .fill(null)
        .map((_, i) => createMockAgent(`agent-${i}`))
      const agents2 = Array(5)
        .fill(null)
        .map((_, i) => createMockAgent(`agent-${i + 5}`))

      const [result1, result2] = await Promise.all([
        orchestrator.executeParallel(agents1, task),
        orchestrator.executeParallel(agents2, task),
      ])

      expect(result1.metadata.agentsUsed).toBe(5)
      expect(result2.metadata.agentsUsed).toBe(5)
    })
  })

  // ==========================================
  // 5. 超时处理测试
  // ==========================================
  describe('timeout handling', () => {
    test('should handle task with zero timeout', async () => {
      registry.register(createMockAgent('agent-1'))

      const task: Task = {
        id: 'zero-timeout',
        title: 'Zero Timeout Task',
        requiredCapabilities: ['research'],
        timeout: 0,
      }

      const result = await orchestrator.assignDynamically(task)
      expect(result).toBeDefined()
    })

    test('should handle task with very short timeout (1ms)', async () => {
      registry.register(createMockAgent('agent-1'))

      a2a.request.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ success: true }), 100))
      )

      const task: Task = {
        id: 'short-timeout',
        title: 'Short Timeout Task',
        requiredCapabilities: ['research'],
        timeout: 1,
      }

      const result = await orchestrator.assignDynamically(task, { timeout: 1 })
      expect(result).toBeDefined()
    }, 10000)

    test('should handle task with negative timeout', async () => {
      registry.register(createMockAgent('agent-1'))

      const task: Task = {
        id: 'negative-timeout',
        title: 'Negative Timeout Task',
        requiredCapabilities: ['research'],
        timeout: -1000,
      }

      const result = await orchestrator.assignDynamically(task)
      expect(result).toBeDefined()
    })

    test('should handle options timeout with NaN value', async () => {
      registry.register(createMockAgent('agent-1'))

      const task: Task = {
        id: 'nan-timeout',
        title: 'NaN Timeout Task',
        requiredCapabilities: ['research'],
      }

      const options: ExecutionOptions = {
        timeout: NaN,
      }

      const result = await orchestrator.assignDynamically(task, options)
      expect(result).toBeDefined()
    })

    test('should handle options timeout with Infinity', async () => {
      registry.register(createMockAgent('agent-1'))

      const task: Task = {
        id: 'infinity-timeout',
        title: 'Infinity Timeout Task',
        requiredCapabilities: ['research'],
      }

      const options: ExecutionOptions = {
        timeout: Infinity,
      }

      const result = await orchestrator.assignDynamically(task, options)
      expect(result).toBeDefined()
    })

    test('should handle task with very large timeout', async () => {
      registry.register(createMockAgent('agent-1'))

      const task: Task = {
        id: 'large-timeout',
        title: 'Large Timeout Task',
        requiredCapabilities: ['research'],
        timeout: Number.MAX_SAFE_INTEGER,
      }

      const result = await orchestrator.assignDynamically(task)
      expect(result).toBeDefined()
    })

    test('should handle timeout in parallel execution', async () => {
      Array(5)
        .fill(null)
        .forEach((_, i) => {
          registry.register(createMockAgent(`agent-${i}`))
        })

      a2a.request
        .mockImplementationOnce(
          () => new Promise(resolve => setTimeout(() => resolve({ success: true }), 200))
        )
        .mockResolvedValue({ success: true })

      const task: Task = {
        id: 'parallel-timeout',
        title: 'Parallel Timeout Task',
        requiredCapabilities: ['research'],
        timeout: 50,
      }

      const agents = Array(5)
        .fill(null)
        .map((_, i) => createMockAgent(`agent-${i}`))
      const result = await orchestrator.executeParallel(agents, task, { timeout: 50 })

      expect(result).toBeDefined()
    }, 10000)
  })

  // ==========================================
  // 6. 循环依赖和复杂依赖图测试
  // ==========================================
  describe('dependency edge cases', () => {
    test('should throw error for circular dependency (A -> B -> A)', async () => {
      registry.register(createMockAgent('agent-1'))

      const workflow: WorkflowStep[] = [
        {
          taskId: 'A',
          task: { id: 'A', title: 'Task A', requiredCapabilities: ['research'] },
          dependsOn: ['B'],
        },
        {
          taskId: 'B',
          task: { id: 'B', title: 'Task B', requiredCapabilities: ['research'] },
          dependsOn: ['A'],
        },
      ]

      await expect(orchestrator.executeSequential(workflow)).rejects.toThrow('unmet dependencies')
    })

    test('should throw error for self dependency', async () => {
      registry.register(createMockAgent('agent-1'))

      const workflow: WorkflowStep[] = [
        {
          taskId: 'self-dep',
          task: { id: 'self-dep', title: 'Self Dependent', requiredCapabilities: ['research'] },
          dependsOn: ['self-dep'],
        },
      ]

      await expect(orchestrator.executeSequential(workflow)).rejects.toThrow('unmet dependencies')
    })

    test('should handle diamond dependency pattern (A -> B, A -> C, B -> D, C -> D)', async () => {
      registry.register(createMockAgent('agent-1'))

      const workflow: WorkflowStep[] = [
        { taskId: 'A', task: { id: 'A', title: 'Task A', requiredCapabilities: ['research'] } },
        {
          taskId: 'B',
          task: { id: 'B', title: 'Task B', requiredCapabilities: ['research'] },
          dependsOn: ['A'],
        },
        {
          taskId: 'C',
          task: { id: 'C', title: 'Task C', requiredCapabilities: ['research'] },
          dependsOn: ['A'],
        },
        {
          taskId: 'D',
          task: { id: 'D', title: 'Task D', requiredCapabilities: ['research'] },
          dependsOn: ['B', 'C'],
        },
      ]

      const results = await orchestrator.executeSequential(workflow)
      expect(results).toHaveLength(4)
      expect(results[3].taskId).toBe('D')
    })

    test('should handle workflow with multiple dependencies', async () => {
      registry.register(createMockAgent('agent-1'))

      const workflow: WorkflowStep[] = [
        { taskId: 'A', task: { id: 'A', title: 'Task A', requiredCapabilities: ['research'] } },
        { taskId: 'B', task: { id: 'B', title: 'Task B', requiredCapabilities: ['research'] } },
        { taskId: 'C', task: { id: 'C', title: 'Task C', requiredCapabilities: ['research'] } },
        {
          taskId: 'D',
          task: { id: 'D', title: 'Task D', requiredCapabilities: ['research'] },
          dependsOn: ['A', 'B', 'C'],
        },
      ]

      const results = await orchestrator.executeSequential(workflow)
      expect(results).toHaveLength(4)
    })

    test('should throw error for non-existent dependency', async () => {
      registry.register(createMockAgent('agent-1'))

      const workflow: WorkflowStep[] = [
        {
          taskId: 'A',
          task: { id: 'A', title: 'Task A', requiredCapabilities: ['research'] },
          dependsOn: ['nonexistent'],
        },
      ]

      await expect(orchestrator.executeSequential(workflow)).rejects.toThrow('unmet dependencies')
    })

    test('should handle workflow with duplicate task IDs', async () => {
      registry.register(createMockAgent('agent-1'))

      const workflow: WorkflowStep[] = [
        {
          taskId: 'duplicate',
          task: { id: 'duplicate', title: 'Task 1', requiredCapabilities: ['research'] },
        },
        {
          taskId: 'duplicate',
          task: { id: 'duplicate', title: 'Task 2', requiredCapabilities: ['research'] },
        },
      ]

      const results = await orchestrator.executeSequential(workflow)
      expect(results.length).toBe(2)
    })
  })

  // ==========================================
  // 7. 负载边界值测试
  // ==========================================
  describe('load boundary values', () => {
    test('should handle agent with load exactly 0.9 (boundary)', async () => {
      registry.register(createMockAgent('agent-1', { currentLoad: 0.9 }))

      const agents = [createMockAgent('agent-1', { currentLoad: 0.9 })]
      const task: Task = {
        id: 'boundary-load',
        title: 'Boundary Load Task',
        requiredCapabilities: ['research'],
      }

      await expect(orchestrator.executeParallel(agents, task)).rejects.toThrow(
        'No available agents for parallel execution'
      )
    })

    test('should handle agent with load 0.89 (just below boundary)', async () => {
      registry.register(createMockAgent('agent-1', { currentLoad: 0.89 }))

      const agents = [createMockAgent('agent-1', { currentLoad: 0.89 })]
      const task: Task = {
        id: 'below-boundary',
        title: 'Below Boundary Task',
        requiredCapabilities: ['research'],
      }

      const result = await orchestrator.executeParallel(agents, task)
      expect(result.metadata.agentsUsed).toBe(1)
    })

    test('should handle agent with zero load', async () => {
      registry.register(createMockAgent('agent-1', { currentLoad: 0 }))

      const agents = [createMockAgent('agent-1', { currentLoad: 0 })]
      const task: Task = {
        id: 'zero-load',
        title: 'Zero Load Task',
        requiredCapabilities: ['research'],
      }

      const result = await orchestrator.executeParallel(agents, task)
      expect(result.metadata.agentsUsed).toBe(1)
    })

    test('should handle agent with load 1.0 (fully loaded)', async () => {
      registry.register(createMockAgent('agent-1', { currentLoad: 1.0 }))

      const agents = [createMockAgent('agent-1', { currentLoad: 1.0 })]
      const task: Task = {
        id: 'full-load',
        title: 'Full Load Task',
        requiredCapabilities: ['research'],
      }

      await expect(orchestrator.executeParallel(agents, task)).rejects.toThrow(
        'No available agents for parallel execution'
      )
    })

    test('should handle agent with negative load (invalid but possible)', async () => {
      registry.register(createMockAgent('agent-1', { currentLoad: -0.5 }))

      const agents = [createMockAgent('agent-1', { currentLoad: -0.5 })]
      const task: Task = {
        id: 'negative-load',
        title: 'Negative Load Task',
        requiredCapabilities: ['research'],
      }

      const result = await orchestrator.executeParallel(agents, task)
      expect(result.metadata.agentsUsed).toBe(1)
    })

    test('should handle agent with load > 1.0 (overloaded)', async () => {
      registry.register(createMockAgent('agent-1', { currentLoad: 1.5 }))

      const agents = [createMockAgent('agent-1', { currentLoad: 1.5 })]
      const task: Task = {
        id: 'overloaded',
        title: 'Overloaded Agent Task',
        requiredCapabilities: ['research'],
      }

      await expect(orchestrator.executeParallel(agents, task)).rejects.toThrow(
        'No available agents for parallel execution'
      )
    })

    test('should handle agent selection with NaN load', async () => {
      registry.register(createMockAgent('agent-1', { currentLoad: NaN }))
      registry.register(createMockAgent('agent-2', { currentLoad: 0.5 }))

      const task: Task = {
        id: 'nan-load',
        title: 'NaN Load Task',
        requiredCapabilities: ['research'],
      }

      // NaN 在比较中会失败，所以会选择第一个（agent-1）
      // 这反映了 JavaScript 的 NaN 比较行为
      const result = await orchestrator.assignDynamically(task)
      expect(result.results[0].agentId).toBe('agent-1')
    })

    test('should handle mixed load values in agent selection', async () => {
      registry.register(createMockAgent('agent-1', { currentLoad: 0.1 }))
      registry.register(createMockAgent('agent-2', { currentLoad: 0.5 }))
      registry.register(createMockAgent('agent-3', { currentLoad: 0.8 }))
      registry.register(createMockAgent('agent-4', { currentLoad: 0.95 }))

      const task: Task = {
        id: 'mixed-load',
        title: 'Mixed Load Task',
        requiredCapabilities: ['research'],
      }

      const result = await orchestrator.assignDynamically(task)
      expect(result.results[0].agentId).toBe('agent-1')
    })
  })

  // ==========================================
  // 8. 聚合策略边缘情况测试
  // ==========================================
  describe('aggregation strategy edge cases', () => {
    test('should handle "first" strategy with all errors', async () => {
      Array(3)
        .fill(null)
        .forEach((_, i) => {
          registry.register(createMockAgent(`agent-${i}`))
        })

      a2a.request.mockRejectedValue(new Error('All failed'))

      const task: Task = {
        id: 'all-errors-first',
        title: 'All Errors First Strategy',
        requiredCapabilities: ['research'],
        aggregationStrategy: 'first',
      }

      const agents = Array(3)
        .fill(null)
        .map((_, i) => createMockAgent(`agent-${i}`))
      const result = await orchestrator.executeParallel(agents, task)

      expect(result.aggregated).toBeNull()
      expect(result.metadata.failureCount).toBe(3)
    })

    test('should handle "all" strategy with mixed results', async () => {
      Array(3)
        .fill(null)
        .forEach((_, i) => {
          registry.register(createMockAgent(`agent-${i}`))
        })

      a2a.request
        .mockResolvedValueOnce({ data: 'result1' })
        .mockRejectedValueOnce(new Error('Failed'))
        .mockResolvedValueOnce({ data: 'result3' })

      const task: Task = {
        id: 'mixed-all',
        title: 'Mixed All Strategy',
        requiredCapabilities: ['research'],
        aggregationStrategy: 'all',
      }

      const agents = Array(3)
        .fill(null)
        .map((_, i) => createMockAgent(`agent-${i}`))
      const result = await orchestrator.executeParallel(agents, task)

      expect(Array.isArray(result.aggregated)).toBe(true)
      expect((result.aggregated as unknown[]).length).toBe(3)
    })

    test('should handle "vote" strategy with unanimous results', async () => {
      Array(5)
        .fill(null)
        .forEach((_, i) => {
          registry.register(createMockAgent(`agent-${i}`))
        })

      a2a.request.mockResolvedValue({ answer: 'consensus' })

      const task: Task = {
        id: 'unanimous-vote',
        title: 'Unanimous Vote Strategy',
        requiredCapabilities: ['research'],
        aggregationStrategy: 'vote',
      }

      const agents = Array(5)
        .fill(null)
        .map((_, i) => createMockAgent(`agent-${i}`))
      const result = await orchestrator.executeParallel(agents, task)

      expect(result.aggregated).toEqual({ answer: 'consensus' })
    })

    test('should handle "vote" strategy with tied results', async () => {
      Array(4)
        .fill(null)
        .forEach((_, i) => {
          registry.register(createMockAgent(`agent-${i}`))
        })

      a2a.request
        .mockResolvedValueOnce({ value: 'A' })
        .mockResolvedValueOnce({ value: 'A' })
        .mockResolvedValueOnce({ value: 'B' })
        .mockResolvedValueOnce({ value: 'B' })

      const task: Task = {
        id: 'tied-vote',
        title: 'Tied Vote Strategy',
        requiredCapabilities: ['research'],
        aggregationStrategy: 'vote',
      }

      const agents = Array(4)
        .fill(null)
        .map((_, i) => createMockAgent(`agent-${i}`))
      const result = await orchestrator.executeParallel(agents, task)

      expect(result.aggregated).toBeDefined()
    })

    test('should handle "best" strategy with no successful results', async () => {
      Array(3)
        .fill(null)
        .forEach((_, i) => {
          registry.register(createMockAgent(`agent-${i}`))
        })

      a2a.request.mockRejectedValue(new Error('All failed'))

      const task: Task = {
        id: 'no-best',
        title: 'No Best Strategy',
        requiredCapabilities: ['research'],
        aggregationStrategy: 'best',
      }

      const agents = Array(3)
        .fill(null)
        .map((_, i) => createMockAgent(`agent-${i}`))
      const result = await orchestrator.executeParallel(agents, task)

      expect(result.aggregated).toBeNull()
    })

    test('should handle "custom" strategy returning raw results', async () => {
      Array(3)
        .fill(null)
        .forEach((_, i) => {
          registry.register(createMockAgent(`agent-${i}`))
        })

      const task: Task = {
        id: 'custom-strategy',
        title: 'Custom Strategy',
        requiredCapabilities: ['research'],
        aggregationStrategy: 'custom',
      }

      const agents = Array(3)
        .fill(null)
        .map((_, i) => createMockAgent(`agent-${i}`))
      const result = await orchestrator.executeParallel(agents, task)

      expect(Array.isArray(result.aggregated)).toBe(true)
      expect((result.aggregated as unknown[]).length).toBe(3)
    })
  })

  // ==========================================
  // 9. 智能体状态边缘情况测试
  // ==========================================
  describe('agent status edge cases', () => {
    test('should filter agents with busy status', async () => {
      registry.register(createMockAgent('agent-1', { status: 'busy' }))
      registry.register(createMockAgent('agent-2', { status: 'online' }))

      const agents = [
        createMockAgent('agent-1', { status: 'busy' }),
        createMockAgent('agent-2', { status: 'online' }),
      ]

      const task: Task = {
        id: 'filter-busy',
        title: 'Filter Busy Agents',
        requiredCapabilities: ['research'],
      }

      const result = await orchestrator.executeParallel(agents, task)
      expect(result.metadata.agentsUsed).toBe(1)
    })

    test('should filter agents with offline status', async () => {
      registry.register(createMockAgent('agent-1', { status: 'offline' }))
      registry.register(createMockAgent('agent-2', { status: 'online' }))

      const agents = [
        createMockAgent('agent-1', { status: 'offline' }),
        createMockAgent('agent-2', { status: 'online' }),
      ]

      const task: Task = {
        id: 'filter-offline',
        title: 'Filter Offline Agents',
        requiredCapabilities: ['research'],
      }

      const result = await orchestrator.executeParallel(agents, task)
      expect(result.metadata.agentsUsed).toBe(1)
    })

    test('should handle agent with empty capabilities', async () => {
      registry.register(createMockAgent('agent-1', { capabilities: [] }))
      registry.register(createMockAgent('agent-2', { capabilities: ['research'] }))

      const task: Task = {
        id: 'empty-cap-agent',
        title: 'Empty Capabilities Agent',
        requiredCapabilities: ['research'],
      }

      const result = await orchestrator.assignDynamically(task)
      expect(result.results[0].agentId).toBe('agent-2')
    })

    test('should handle agent with empty name', async () => {
      registry.register(createMockAgent('agent-1', { name: '' }))

      const task: Task = {
        id: 'empty-name-agent',
        title: 'Empty Name Agent',
        requiredCapabilities: ['research'],
      }

      const result = await orchestrator.assignDynamically(task)
      expect(result).toBeDefined()
    })
  })

  // ==========================================
  // 10. 其他边缘情况测试
  // ==========================================
  describe('miscellaneous edge cases', () => {
    test('should handle maxAgents option with value 0', async () => {
      registry.register(createMockAgent('agent-1'))

      const agents = [createMockAgent('agent-1')]
      const task: Task = {
        id: 'max-agents-zero',
        title: 'Max Agents Zero',
        requiredCapabilities: ['research'],
      }

      // maxAgents=0 被视为 falsy，会使用所有可用智能体
      // 这反映了代码的实际行为 (maxAgents || availableAgents.length)
      const result = await orchestrator.executeParallel(agents, task, { maxAgents: 0 })
      expect(result.metadata.agentsUsed).toBe(1)
    })

    test('should handle maxAgents option with negative value', async () => {
      registry.register(createMockAgent('agent-1'))

      const agents = [createMockAgent('agent-1')]
      const task: Task = {
        id: 'max-agents-negative',
        title: 'Max Agents Negative',
        requiredCapabilities: ['research'],
      }

      // 负值 maxAgents 应该被处理
      const result = await orchestrator.executeParallel(agents, task, { maxAgents: -5 })
      expect(result).toBeDefined()
    })

    test('should handle maxAgents option larger than agent count', async () => {
      registry.register(createMockAgent('agent-1'))

      const agents = [createMockAgent('agent-1')]
      const task: Task = {
        id: 'max-agents-large',
        title: 'Max Agents Large',
        requiredCapabilities: ['research'],
      }

      const result = await orchestrator.executeParallel(agents, task, { maxAgents: 1000 })
      expect(result.metadata.agentsUsed).toBe(1)
    })

    test('should handle workflow with deeply nested dependencies', async () => {
      registry.register(createMockAgent('agent-1'))

      // 创建一个深度依赖链 A -> B -> C -> D -> E -> F
      const workflow: WorkflowStep[] = [
        { taskId: 'A', task: { id: 'A', title: 'Task A', requiredCapabilities: ['research'] } },
        {
          taskId: 'B',
          task: { id: 'B', title: 'Task B', requiredCapabilities: ['research'] },
          dependsOn: ['A'],
        },
        {
          taskId: 'C',
          task: { id: 'C', title: 'Task C', requiredCapabilities: ['research'] },
          dependsOn: ['B'],
        },
        {
          taskId: 'D',
          task: { id: 'D', title: 'Task D', requiredCapabilities: ['research'] },
          dependsOn: ['C'],
        },
        {
          taskId: 'E',
          task: { id: 'E', title: 'Task E', requiredCapabilities: ['research'] },
          dependsOn: ['D'],
        },
        {
          taskId: 'F',
          task: { id: 'F', title: 'Task F', requiredCapabilities: ['research'] },
          dependsOn: ['E'],
        },
      ]

      const results = await orchestrator.executeSequential(workflow)
      expect(results).toHaveLength(6)
      expect(results[5].taskId).toBe('F')
    })

    test('should handle empty workflow array', async () => {
      const workflow: WorkflowStep[] = []
      const results = await orchestrator.executeSequential(workflow)
      expect(results).toHaveLength(0)
    })

    test('should handle retryOnFailure option (even if not implemented)', async () => {
      registry.register(createMockAgent('agent-1'))

      const task: Task = {
        id: 'retry-option',
        title: 'Retry Option Task',
        requiredCapabilities: ['research'],
      }

      const result = await orchestrator.assignDynamically(task, {
        retryOnFailure: true,
        maxRetries: 3,
      })
      expect(result).toBeDefined()
    })

    test('should handle multiple parallel calls to same agent', async () => {
      registry.register(createMockAgent('agent-1'))

      const task: Task = {
        id: 'same-agent-parallel',
        title: 'Same Agent Parallel',
        requiredCapabilities: ['research'],
      }

      const agents = [
        createMockAgent('agent-1'),
        createMockAgent('agent-1'), // 同一个智能体出现两次
      ]

      const result = await orchestrator.executeParallel(agents, task)
      expect(result).toBeDefined()
    })

    test('should handle task payload with various types', async () => {
      registry.register(createMockAgent('agent-1'))

      const testCases = [
        { payload: 'string value', desc: 'string' },
        { payload: 12345, desc: 'number' },
        { payload: true, desc: 'boolean' },
        { payload: [1, 2, 3], desc: 'array' },
        { payload: { nested: { deep: { value: 'test' } } }, desc: 'deep object' },
        { payload: () => 'function', desc: 'function' },
        { payload: Symbol('test'), desc: 'symbol' },
        { payload: BigInt(123), desc: 'bigint' },
      ]

      for (const tc of testCases) {
        const task: Task = {
          id: `payload-${tc.desc}`,
          title: `Payload ${tc.desc}`,
          requiredCapabilities: ['research'],
          payload: tc.payload,
        }

        const result = await orchestrator.assignDynamically(task)
        expect(result).toBeDefined()
      }
    })
  })
})
