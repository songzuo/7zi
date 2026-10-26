/**
 * Agent Scheduler 兼容层
 *
 * ## 为什么需要这个
 *
 * 三个 a2a 集成测试（a2a-jsonrpc / a2a-queue / a2a-registry）写于 2026-03-29，
 * 当时生产代码用的是 `src/lib/agent-scheduler/`，测试里 import 的是
 * `agentScheduler` 单例，API 是：
 *   - registerAgent(id, name, type, capabilities)
 *   - clear() / getAllAgents() / getAgent(id) / updateAgentStatus(id, status)
 *   - scheduleTask({ type, input }) / getTask(id) / getAllTasks() / updateTask(...)
 *
 * 2026-03-30（commit c4bf2d327f）目录被移动到 `src/lib/agents/scheduler/`，
 * 生产代码的 A2A 路由改用 `@/lib/agents/a2a/agent-registry` 的
 * `getAgentRegistry()`（API 是 register({ id, name, url, capabilities, skills })）。
 *
 * 结果：这三个测试文件 **整份加载失败**（模块解析不到），
 * 从 2026-03-30 起挂了 7 个月，从未真正执行过任何断言。
 *
 * ## 现在的做法
 *
 * 不改测试的断言语义，只把「旧 scheduler API」映射到「现在的 registry API」。
 * 这样：
 *   - 测试继续用它原本的写法（registerAgent / clear / getAllAgents ...）
 *   - 但实际读写的是生产路由真正使用的那份 registry —— 断言才有意义
 *
 * 任务调度相关的方法（scheduleTask / getTask / getAllTasks / updateTask）
 * 在当前 A2A 实现里没有对应物，保留为**内存桩**：
 * 这些用例断言的是 A2A 路由的行为，不是调度器的行为。
 */

import { getAgentRegistry, resetAgentRegistry } from '@/lib/agents/a2a/agent-registry'

/** 旧 API 里的「任务」，新 registry 没有对应概念，这里用内存 Map 存 */
interface CompatTask {
  id: string
  type: string
  input: Record<string, unknown>
  status: string
  assignedAgentId?: string
}

const compatTasks = new Map<string, CompatTask>()
let taskSeq = 0

export const agentScheduler = {
  /** 清空 registry 与任务桩 */
  clear(): void {
    resetAgentRegistry()
    compatTasks.clear()
    taskSeq = 0
  },

  /**
   * 旧签名：registerAgent(id, name, type, capabilities)
   * 新 API：register({ id, name, url, capabilities, skills, status, lastHeartbeat })
   *
   * 旧的第 3 个参数是 agent「类型」，新 API 没有这个字段。
   * 放到 metadata.type 里，既不丢信息，也不破坏新 API 的契约。
   */
  registerAgent(id: string, name: string, type: string, capabilities: string[] = []): void {
    getAgentRegistry().register({
      id,
      name,
      // url 是新 API 的必填字段。旧 API 没有 url，
      // 用一个确定性的占位 URL —— 断言只关心 id/name/capabilities。
      url: `http://localhost/agents/${id}`,
      capabilities,
      skills: [],
      status: 'online',
      lastHeartbeat: new Date().toISOString(),
      metadata: { type },
    })
  },

  /** 新 API 的 status 是 'online' | 'offline' | 'busy'，与旧的 'idle' 对应 */
  updateAgentStatus(agentId: string, status: string): boolean {
    const normalized = status === 'idle' ? 'online' : status
    return getAgentRegistry().updateStatus(agentId, normalized as 'online' | 'offline' | 'busy')
  },

  getAgent(agentId: string) {
    return getAgentRegistry().get(agentId)
  },

  getAllAgents() {
    return getAgentRegistry().getAll()
  },

  /** 旧 API：scheduleTask({ type, input }) —— 无对应实现，用内存桩 */
  scheduleTask(input: { type: string; input: Record<string, unknown> }): CompatTask {
    const id = `task-${++taskSeq}`
    const task: CompatTask = {
      id,
      type: input.type,
      input: input.input,
      status: 'pending',
    }
    compatTasks.set(id, task)
    return task
  },

  getTask(taskId: string) {
    return compatTasks.get(taskId)
  },

  getAllTasks() {
    return Array.from(compatTasks.values())
  },

  updateTask(taskId: string, updates: Partial<CompatTask>) {
    const existing = compatTasks.get(taskId)
    if (!existing) return undefined
    const updated = { ...existing, ...updates }
    compatTasks.set(taskId, updated)
    return updated
  },
}

export default agentScheduler
