/**
 * TaskDecomposer 自动重试测试
 *
 * 背景：`enableAutoRetry` 构造参数存在、配置里也打开了
 * （`src/lib/multi-agent/index.ts` 里 enableAutoRetry: true），
 * 但重试逻辑原本是空的 TODO —— 一次网络抖动就让整个子任务失败。
 *
 * 真实 API（不要臆造）：
 *   createTask() → task.subTasks 已就绪
 *   executeTask(task.id) → 真正执行子任务；子任务全失败时 **抛错**
 *   getTask(task.id).subTasks → 读回最终状态
 *
 * 覆盖：
 *   - 失败后自动重试并最终成功
 *   - 全部失败后的错误信息带尝试次数
 *   - maxRetries 配置生效
 *   - enableAutoRetry: false 时不重试
 *   - 指数退避 + 抖动
 *   - sleep 可注入（测试不真等）
 *   - 每次状态变化都发 task.updated 事件
 *   - 重试路径确实被走到（assignedAgentId 非空）
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { TaskDecomposer, DecompositionStrategy } from '../task-decomposer'
import { AgentRegistry } from '../registry'
import { MessageBus } from '../message-bus'
import { TaskStatus, MessagePriority, TransportType, SubTask, Task } from '../types'

describe('TaskDecomposer 自动重试', () => {
  let registry: AgentRegistry
  let messageBus: MessageBus
  let sleepMock: ReturnType<typeof vi.fn<(ms: number) => Promise<void>>>

  beforeEach(async () => {
    messageBus = new MessageBus(TransportType.MEMORY)
    registry = new AgentRegistry()

    await registry.register({
      id: 'agent-1',
      name: 'Coder Agent',
      type: 'llm',
      capabilities: [
        {
          id: 'coding',
          name: 'Coding',
          description: 'Write code',
          category: 'development',
          version: '1.0.0',
        },
      ],
      status: 'online',
      lastSeen: Date.now(),
      metadata: {},
    })

    // 注入假的 sleep —— 不真的等
    sleepMock = vi.fn<(ms: number) => Promise<void>>().mockResolvedValue(undefined)
  })

  afterEach(async () => {
    await registry.close()
    await messageBus.close()
    vi.restoreAllMocks()
  })

  /**
   * 单子任务模板 —— 只依赖 `coding` 能力，能被 agent-1 匹配上。
   * 只有真正分配到 agent，executeSubTaskWithRetry 才会被走到（否则会走
   * “无可用 agent” 分支，测试假绿）。
   */
  const singleStepTemplate = {
    type: 'retry-test',
    name: 'Retry Test Task',
    description: 'Single step task for retry testing',
    strategy: DecompositionStrategy.SEQUENTIAL,
    subTasks: [
      {
        id: 'step1',
        name: 'Step 1',
        description: 'The only step',
        requiredCapabilities: ['coding'],
      },
    ],
  }

  /** 造一个 messageBus.request 会失败 n 次、之后成功的环境 */
  function mockRequestFailingTimes(failures: number) {
    let calls = 0
    const requestMock = vi
      .spyOn(messageBus, 'request')
      .mockImplementation(async (): Promise<unknown> => {
        calls++
        if (calls <= failures) {
          throw new Error('Network timeout')
        }
        return { ok: true, result: 'success' }
      })
    return requestMock
  }

  /** 造一个 messageBus.request 永远失败的环境 */
  function mockRequestAlwaysFailing(message = 'Service unavailable') {
    const requestMock = vi
      .spyOn(messageBus, 'request')
      .mockImplementation(async (): Promise<unknown> => {
        throw new Error(message)
      })
    return requestMock
  }

  /** 创建任务并执行，返回最终任务 */
  async function createAndExecute(
    decomposer: TaskDecomposer
  ): Promise<{ task: Task; subTasks: SubTask[] }> {
    const task = await decomposer.createTask(
      'Test Task',
      'A test task',
      { data: 'test' },
      { template: singleStepTemplate }
    )

    // 成功或失败都吞掉异常 —— 失败态由各用例自行用 rejects.toThrow 断言
    try {
      await decomposer.executeTask(task.id)
    } catch {
      /* 任务失败态在下面通过 getTask 读回断言 */
    }

    const finalTask = decomposer.getTask(task.id)
    expect(finalTask).toBeDefined()
    return { task: finalTask as Task, subTasks: (finalTask as Task).subTasks }
  }

  it('失败后应该自动重试并最终成功', async () => {
    const requestMock = mockRequestFailingTimes(2)

    const decomposer = new TaskDecomposer(registry, messageBus, {
      sleep: sleepMock,
    })

    await createAndExecute(decomposer)

    // 总共调用 3 次（前两次失败）
    expect(requestMock).toHaveBeenCalledTimes(3)
    expect(sleepMock).toHaveBeenCalledTimes(2)
  })

  it('重试成功时子任务状态应该是 COMPLETED', async () => {
    mockRequestFailingTimes(1)

    const decomposer = new TaskDecomposer(registry, messageBus, {
      sleep: sleepMock,
    })

    const { task, subTasks } = await createAndExecute(decomposer)

    expect(task.status).toBe(TaskStatus.COMPLETED)
    expect(subTasks.length).toBeGreaterThan(0)
    expect(subTasks.every((st: SubTask) => st.status === TaskStatus.COMPLETED)).toBe(true)
  })

  it('全部重试都失败时错误信息应带尝试次数', async () => {
    const requestMock = mockRequestAlwaysFailing()

    const decomposer = new TaskDecomposer(registry, messageBus, {
      sleep: sleepMock,
      maxRetries: 2,
    })

    // executeTask 在子任务全失败时会抛错
    const task = await decomposer.createTask(
      'Test Task',
      'A test task',
      { data: 'test' },
      { template: singleStepTemplate }
    )
    await expect(decomposer.executeTask(task.id)).rejects.toThrow()

    const finalTask = decomposer.getTask(task.id)
    expect(finalTask).toBeDefined()
    const subTasks = (finalTask as Task).subTasks

    // maxRetries=2 → 总共 3 次尝试
    expect(requestMock).toHaveBeenCalledTimes(3)
    expect(subTasks[0].status).toBe(TaskStatus.FAILED)
    expect(subTasks[0].error).toContain('Service unavailable')
    expect(subTasks[0].error).toContain('已重试 2 次')
    expect(subTasks[0].error).toContain('共尝试 3 次')
    // 任务级状态也要落 FAILED
    expect((finalTask as Task).status).toBe(TaskStatus.FAILED)
    expect((finalTask as Task).error).toBeDefined()
  })

  it('maxRetries 配置应生效', async () => {
    const requestMock = mockRequestAlwaysFailing('fail')

    const decomposer = new TaskDecomposer(registry, messageBus, {
      sleep: sleepMock,
      maxRetries: 0, // 不重试
    })

    const task = await decomposer.createTask(
      'Test Task',
      'A test task',
      { data: 'test' },
      { template: singleStepTemplate }
    )
    await expect(decomposer.executeTask(task.id)).rejects.toThrow()

    // maxRetries=0 → 只尝试 1 次
    expect(requestMock).toHaveBeenCalledTimes(1)
    expect(sleepMock).not.toHaveBeenCalled()
  })

  it('enableAutoRetry 为 false 时不应重试', async () => {
    const requestMock = mockRequestAlwaysFailing('fail')

    const decomposer = new TaskDecomposer(registry, messageBus, {
      sleep: sleepMock,
      enableAutoRetry: false,
    })

    const task = await decomposer.createTask(
      'Test Task',
      'A test task',
      { data: 'test' },
      { template: singleStepTemplate }
    )
    await expect(decomposer.executeTask(task.id)).rejects.toThrow()

    expect(requestMock).toHaveBeenCalledTimes(1)
    expect(sleepMock).not.toHaveBeenCalled()
  })

  it('退避应指数增长', async () => {
    mockRequestFailingTimes(3)

    const decomposer = new TaskDecomposer(registry, messageBus, {
      sleep: sleepMock,
      maxRetries: 3,
      retryBaseDelayMs: 100,
      retryJitterMs: 0, // 关掉抖动，便于断言
    })

    await createAndExecute(decomposer)

    const delays = sleepMock.mock.calls.map((c: [number]) => c[0])
    expect(delays).toHaveLength(3)
    // 指数退避：base * 2^attempt（attempt 从 0 开始）→ 100, 200, 400
    expect(delays[0]).toBe(100)
    expect(delays[1]).toBe(200)
    expect(delays[2]).toBe(400)
  })

  it('抖动应在 [0, jitterMs] 范围内', async () => {
    mockRequestFailingTimes(2)

    const decomposer = new TaskDecomposer(registry, messageBus, {
      sleep: sleepMock,
      maxRetries: 2,
      retryBaseDelayMs: 100,
      retryJitterMs: 50,
    })

    await createAndExecute(decomposer)

    // base=100, jitter=50 → 第 n 次退避 ∈ [100 * 2^n, 100 * 2^n + 50]
    const expectedBases = [100, 200]
    const delays = sleepMock.mock.calls.map((c: [number]) => c[0])
    expect(delays).toHaveLength(expectedBases.length)

    for (let i = 0; i < expectedBases.length; i++) {
      const base = expectedBases[i]
      expect(delays[i]).toBeGreaterThanOrEqual(base)
      expect(delays[i]).toBeLessThanOrEqual(base + 50)
    }
  })

  it('每次状态变化都应该发 task.updated 事件', async () => {
    mockRequestFailingTimes(1)

    const decomposer = new TaskDecomposer(registry, messageBus, {
      sleep: sleepMock,
    })

    const updatedSpy = vi.fn()
    decomposer.on('task.updated', updatedSpy)

    await createAndExecute(decomposer)

    expect(updatedSpy).toHaveBeenCalled()
    // 至少：开始运行 → 重试中 → 完成
    expect(updatedSpy.mock.calls.length).toBeGreaterThanOrEqual(3)
  })

  it('重试成功不应留下错误信息', async () => {
    mockRequestFailingTimes(1)

    const decomposer = new TaskDecomposer(registry, messageBus, {
      sleep: sleepMock,
    })

    const { subTasks } = await createAndExecute(decomposer)

    expect(subTasks[0].error).toBeUndefined()
    expect(subTasks[0].completedAt).toBeDefined()
  })

  it('重试路径必须真的被走到：子任务已分配 agent（防假绿）', async () => {
    const requestMock = mockRequestFailingTimes(1)

    const decomposer = new TaskDecomposer(registry, messageBus, {
      sleep: sleepMock,
    })

    const { subTasks } = await createAndExecute(decomposer)

    // 没有分配到 agent 的话，executeSubTask 会走 “无可用 agent” 分支直接失败，
    // 根本进不了重试逻辑 —— 这条断言就是防这个假绿
    expect(subTasks[0].assignedAgentId).toBe('agent-1')
    expect(subTasks[0].status).toBe(TaskStatus.COMPLETED)
    // messageBus.request 收到的目标也应该是被分配的 agent
    expect(requestMock).toHaveBeenCalledTimes(2)
    expect(requestMock.mock.calls[0][0]).toBe('agent-1')
  })

  it('全部失败时子任务应记录最后一次错误且带 completedAt', async () => {
    mockRequestAlwaysFailing('Boom')

    const decomposer = new TaskDecomposer(registry, messageBus, {
      sleep: sleepMock,
      maxRetries: 1,
    })

    const task = await decomposer.createTask(
      'Test Task',
      'A test task',
      { data: 'test' },
      { template: singleStepTemplate }
    )
    await expect(decomposer.executeTask(task.id)).rejects.toThrow()

    const finalTask = decomposer.getTask(task.id) as Task
    const subTask = finalTask.subTasks[0]

    expect(subTask.status).toBe(TaskStatus.FAILED)
    expect(subTask.error).toContain('Boom')
    expect(subTask.error).toContain('已重试 1 次')
    expect(subTask.error).toContain('共尝试 2 次')
    expect(subTask.completedAt).toBeDefined()
    expect(subTask.assignedAgentId).toBe('agent-1')
  })
})
