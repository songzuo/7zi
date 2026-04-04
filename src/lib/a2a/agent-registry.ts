/**
 * A2A Protocol v2 - Agent Registry
 * Agent 注册表，支持能力匹配、技能匹配、负载均衡、心跳监控
 */

import { EventEmitter } from 'events'
import {
  AgentRegistration,
  RegistryStats,
  AgentRegistry,
  A2AError,
  A2AErrorType,
  generateId,
} from './types'

/**
 * 内存 Agent 注册表
 */
export class InMemoryAgentRegistry implements AgentRegistry {
  private agents: Map<string, AgentRegistration> = new Map()
  private capabilities: Map<string, Set<string>> = new Map() // capability -> agent IDs
  private skills: Map<string, Set<string>> = new Map() // skill -> agent IDs
  private eventEmitter = new EventEmitter()
  private cleanupTimer: NodeJS.Timeout | null = null

  constructor(autoCleanup: boolean = true) {
    if (autoCleanup) {
      this.startAutoCleanup()
    }
  }

  /**
   * 注册 Agent
   */
  register(agent: Omit<AgentRegistration, 'id' | 'lastHeartbeat'>): string {
    const id = generateId('agent')
    const fullAgent: AgentRegistration = {
      ...agent,
      id,
      lastHeartbeat: new Date().toISOString(),
    }

    // 添加到注册表
    this.agents.set(id, fullAgent)

    // 更新能力索引
    for (const capability of agent.capabilities) {
      if (!this.capabilities.has(capability)) {
        this.capabilities.set(capability, new Set())
      }
      this.capabilities.get(capability)!.add(id)
    }

    // 更新技能索引
    for (const skill of agent.skills) {
      if (!this.skills.has(skill)) {
        this.skills.set(skill, new Set())
      }
      this.skills.get(skill)!.add(id)
    }

    // 发出事件
    this.eventEmitter.emit('register', { agent: fullAgent })

    return id
  }

  /**
   * 注销 Agent
   */
  unregister(agentId: string): void {
    const agent = this.agents.get(agentId)
    if (!agent) {
      return
    }

    // 清除能力索引
    for (const capability of agent.capabilities) {
      const agentIds = this.capabilities.get(capability)
      if (agentIds) {
        agentIds.delete(agentId)
        if (agentIds.size === 0) {
          this.capabilities.delete(capability)
        }
      }
    }

    // 清除技能索引
    for (const skill of agent.skills) {
      const agentIds = this.skills.get(skill)
      if (agentIds) {
        agentIds.delete(agentId)
        if (agentIds.size === 0) {
          this.skills.delete(skill)
        }
      }
    }

    // 移除 Agent
    this.agents.delete(agentId)

    // 发出事件
    this.eventEmitter.emit('unregister', { agentId })
  }

  /**
   * 获取 Agent
   */
  get(agentId: string): AgentRegistration | undefined {
    return this.agents.get(agentId)
  }

  /**
   * 获取所有 Agent
   */
  getAll(): AgentRegistration[] {
    return Array.from(this.agents.values())
  }

  /**
   * 根据能力获取 Agent
   */
  getByCapability(capability: string): AgentRegistration[] {
    const agentIds = this.capabilities.get(capability)
    if (!agentIds) {
      return []
    }

    return Array.from(agentIds)
      .map(id => this.agents.get(id))
      .filter((agent): agent is AgentRegistration => agent !== undefined)
  }

  /**
   * 根据技能获取 Agent
   */
  getBySkill(skill: string): AgentRegistration[] {
    const agentIds = this.skills.get(skill)
    if (!agentIds) {
      return []
    }

    return Array.from(agentIds)
      .map(id => this.agents.get(id))
      .filter((agent): agent is AgentRegistration => agent !== undefined)
  }

  /**
   * 获取可用的 Agent（在线且不忙）
   */
  getAvailable(): AgentRegistration[] {
    return this.getAll().filter(agent => agent.status === 'online')
  }

  /**
   * 更新 Agent 状态
   */
  updateStatus(agentId: string, status: 'online' | 'offline' | 'busy'): void {
    const agent = this.agents.get(agentId)
    if (!agent) {
      throw new A2AError(A2AErrorType.AGENT_NOT_FOUND, `Agent ${agentId} not found`)
    }

    const oldStatus = agent.status
    agent.status = status

    // 发出事件
    this.eventEmitter.emit('status_change', {
      agentId,
      oldStatus,
      newStatus: status,
    })
  }

  /**
   * 更新 Agent 心跳
   */
  updateHeartbeat(agentId: string, load?: number): void {
    const agent = this.agents.get(agentId)
    if (!agent) {
      throw new A2AError(A2AErrorType.AGENT_NOT_FOUND, `Agent ${agentId} not found`)
    }

    agent.lastHeartbeat = new Date().toISOString()
    if (load !== undefined) {
      agent.load = load
    }

    // 发出事件
    this.eventEmitter.emit('heartbeat', { agentId })
  }

  /**
   * 清理不活跃的 Agent
   */
  cleanupInactive(timeoutMs: number): number {
    const now = Date.now()
    const toRemove: string[] = []

    for (const [id, agent] of this.agents.entries()) {
      const lastHeartbeat = new Date(agent.lastHeartbeat).getTime()
      if (now - lastHeartbeat > timeoutMs) {
        toRemove.push(id)
      }
    }

    for (const id of toRemove) {
      this.unregister(id)
    }

    return toRemove.length
  }

  /**
   * 查找最佳 Agent
   */
  findBestAgent(options: {
    capabilities?: string[]
    skills?: string[]
    maxLoad?: number
  }): AgentRegistration | null {
    let candidates = this.getAvailable()

    // 按能力过滤
    if (options.capabilities && options.capabilities.length > 0) {
      candidates = candidates.filter(agent =>
        options.capabilities!.every(cap => agent.capabilities.includes(cap))
      )
    }

    // 按技能过滤
    if (options.skills && options.skills.length > 0) {
      candidates = candidates.filter(agent =>
        options.skills!.every(skill => agent.skills.includes(skill))
      )
    }

    // 按负载过滤
    if (options.maxLoad !== undefined) {
      candidates = candidates.filter(agent => (agent.load ?? 0) <= options.maxLoad!)
    }

    if (candidates.length === 0) {
      return null
    }

    // 选择负载最低的 Agent
    candidates.sort((a, b) => (a.load ?? 0) - (b.load ?? 0))

    return candidates[0]
  }

  /**
   * 获取统计信息
   */
  getStats(): RegistryStats {
    const agents = this.getAll()

    const byCapability: Record<string, number> = {}
    for (const [capability, agentIds] of this.capabilities.entries()) {
      byCapability[capability] = agentIds.size
    }

    const bySkill: Record<string, number> = {}
    for (const [skill, agentIds] of this.skills.entries()) {
      bySkill[skill] = agentIds.size
    }

    return {
      total: agents.length,
      online: agents.filter(a => a.status === 'online').length,
      offline: agents.filter(a => a.status === 'offline').length,
      busy: agents.filter(a => a.status === 'busy').length,
      byCapability,
      bySkill,
    }
  }

  /**
   * 订阅事件
   */
  on(event: string, listener: (...args: unknown[]) => void): void {
    this.eventEmitter.on(event, listener)
  }

  /**
   * 取消订阅事件
   */
  off(event: string, listener: (...args: unknown[]) => void): void {
    this.eventEmitter.off(event, listener)
  }

  /**
   * 启动自动清理
   */
  private startAutoCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      // 每60秒清理一次，超时时间5分钟
      this.cleanupInactive(300000)
    }, 60000)
  }

  /**
   * 关闭注册表
   */
  close(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
    }
    this.agents.clear()
    this.capabilities.clear()
    this.skills.clear()
    this.eventEmitter.removeAllListeners()
  }
}

/**
 * 文件持久化 Agent 注册表
 */
export class FileAgentRegistry extends InMemoryAgentRegistry {
  private filePath: string
  private flushInterval: NodeJS.Timeout | null = null
  private dirty = false

  constructor(filePath: string, autoCleanup: boolean = true) {
    super(autoCleanup)
    this.filePath = filePath
    this.load()
    this.startAutoFlush()
  }

  /**
   * 从文件加载注册表
   */
  private load(): void {
    try {
      const fs = require('fs')
      if (fs.existsSync(this.filePath)) {
        const data = JSON.parse(fs.readFileSync(this.filePath, 'utf-8'))
        // 恢复 Agent
        for (const agent of data.agents || []) {
          this.agents.set(agent.id, agent)
          // 恢复索引
          for (const capability of agent.capabilities) {
            if (!this.capabilities.has(capability)) {
              this.capabilities.set(capability, new Set())
            }
            this.capabilities.get(capability)!.add(agent.id)
          }
          for (const skill of agent.skills) {
            if (!this.skills.has(skill)) {
              this.skills.set(skill, new Set())
            }
            this.skills.get(skill)!.add(agent.id)
          }
        }
      }
    } catch {
      // 文件不存在或解析失败，忽略
    }
  }

  /**
   * 保存注册表到文件
   */
  private save(): void {
    try {
      const fs = require('fs')
      const data = {
        agents: Array.from(this.agents.values()),
      }
      fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2))
      this.dirty = false
    } catch (error) {
      console.error('Failed to save registry:', error)
    }
  }

  /**
   * 开始自动刷新
   */
  private startAutoFlush(): void {
    this.flushInterval = setInterval(() => {
      if (this.dirty) {
        this.save()
      }
    }, 30000) // 每30秒刷新一次
  }

  /**
   * 标记需要保存
   */
  override register(agent: Omit<AgentRegistration, 'id' | 'lastHeartbeat'>): string {
    const id = super.register(agent)
    this.dirty = true
    return id
  }

  /**
   * 标记需要保存
   */
  override unregister(agentId: string): void {
    super.unregister(agentId)
    this.dirty = true
  }

  /**
   * 标记需要保存
   */
  override updateStatus(agentId: string, status: 'online' | 'offline' | 'busy'): void {
    super.updateStatus(agentId, status)
    this.dirty = true
  }

  /**
   * 标记需要保存
   */
  override updateHeartbeat(agentId: string, load?: number): void {
    super.updateHeartbeat(agentId, load)
    this.dirty = true
  }

  /**
   * 手动刷新
   */
  flush(): void {
    if (this.dirty) {
      this.save()
    }
  }

  /**
   * 关闭注册表
   */
  override close(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval)
    }
    this.flush()
    super.close()
  }
}

// 单例实例
let defaultRegistry: InMemoryAgentRegistry | null = null

/**
 * 获取默认 Agent 注册表实例
 */
export function getAgentRegistry(): InMemoryAgentRegistry {
  if (!defaultRegistry) {
    defaultRegistry = new InMemoryAgentRegistry()
  }
  return defaultRegistry
}

/**
 * 获取文件持久化 Agent 注册表实例
 */
export function getFileAgentRegistry(filePath: string): FileAgentRegistry {
  return new FileAgentRegistry(filePath)
}