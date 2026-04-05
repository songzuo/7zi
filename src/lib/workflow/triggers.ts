/**
 * 工作流触发器系统
 * 支持定时触发、事件触发和 Webhook 触发
 */

import { EventEmitter } from 'events'

/**
 * 触发器类型
 */
export enum TriggerType {
  SCHEDULE = 'schedule', // 定时触发
  EVENT = 'event', // 事件触发
  WEBHOOK = 'webhook', // Webhook 触发
  CRON = 'cron', // Cron 表达式触发
}

/**
 * 触发器状态
 */
export enum TriggerStatus {
  ACTIVE = 'active', // 激活
  PAUSED = 'paused', // 暂停
  DISABLED = 'disabled', // 禁用
  ERROR = 'error', // 错误
}

/**
 * 触发器定义
 */
export interface TriggerDefinition {
  id: string
  workflowId: string
  type: TriggerType
  name: string
  description?: string
  status: TriggerStatus

  // 触发器配置
  config:
    | ScheduleTriggerConfig
    | EventTriggerConfig
    | WebhookTriggerConfig
    | CronTriggerConfig

  // 执行配置
  executionConfig?: {
    inputs?: Record<string, unknown> // 触发时传入的输入参数
    options?: {
      retryCount?: number
      timeout?: number
    }
  }

  // 元数据
  metadata: {
    createdAt: string
    updatedAt: string
    createdBy: string
    lastTriggeredAt?: string
    nextTriggerAt?: string
    triggerCount: number
    errorCount: number
  }
}

/**
 * 定时触发器配置
 */
export interface ScheduleTriggerConfig {
  interval: number // 间隔时间（毫秒）
  timezone?: string // 时区
  startDate?: string // 开始日期
  endDate?: string // 结束日期
}

/**
 * 事件触发器配置
 */
export interface EventTriggerConfig {
  eventType: string // 事件类型
  source?: string // 事件源
  filter?: Record<string, unknown> // 事件过滤条件
  debounce?: number // 防抖时间（毫秒）
}

/**
 * Webhook 触发器配置
 */
export interface WebhookTriggerConfig {
  endpoint: string // Webhook 端点路径
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' // HTTP 方法
  auth?: {
    type: 'none' | 'bearer' | 'basic' | 'header'
    token?: string
    username?: string
    password?: string
    headers?: Record<string, string>
  }
  validation?: {
    signature?: string // 签名验证密钥
    ipWhitelist?: string[] // IP 白名单
  }
}

/**
 * Cron 触发器配置
 */
export interface CronTriggerConfig {
  expression: string // Cron 表达式
  timezone?: string // 时区
  startDate?: string // 开始日期
  endDate?: string // 结束日期
}

/**
 * 触发器事件
 */
export enum TriggerEventType {
  TRIGGERED = 'triggered', // 触发器被触发
  ERROR = 'error', // 触发器执行错误
  PAUSED = 'paused', // 触发器暂停
  RESUMED = 'resumed', // 触发器恢复
}

/**
 * 触发器事件负载
 */
export interface TriggerEventPayload {
  triggerId: string
  workflowId: string
  timestamp: string
  data?: Record<string, unknown>
  error?: Error
}

/**
 * 触发器执行回调
 */
export type TriggerCallback = (trigger: TriggerDefinition, payload?: Record<string, unknown>) => Promise<void>

/**
 * 触发器接口
 */
export interface ITrigger {
  /**
   * 启动触发器
   */
  start(callback: TriggerCallback): Promise<void>

  /**
   * 停止触发器
   */
  stop(): Promise<void>

  /**
   * 暂停触发器
   */
  pause(): Promise<void>

  /**
   * 恢复触发器
   */
  resume(): Promise<void>

  /**
   * 检查是否正在运行
   */
  isRunning(): boolean

  /**
   * 获取下一次触发时间
   */
  getNextTriggerTime(): Date | null
}

/**
 * 触发器管理器
 */
export class TriggerManager extends EventEmitter {
  private triggers: Map<string, TriggerDefinition> = new Map()
  private activeTriggers: Map<string, ITrigger> = new Map()
  private callbacks: Map<string, TriggerCallback> = new Map()

  /**
   * 注册触发器
   */
  async registerTrigger(trigger: TriggerDefinition): Promise<void> {
    // 验证触发器
    const validation = this.validateTrigger(trigger)
    if (!validation.valid) {
      throw new Error(`触发器验证失败: ${validation.errors.join(', ')}`)
    }

    this.triggers.set(trigger.id, trigger)
    this.emit('trigger:registered', trigger)

    // 如果触发器状态为激活，则启动它
    if (trigger.status === TriggerStatus.ACTIVE) {
      await this.startTrigger(trigger.id)
    }
  }

  /**
   * 注销触发器
   */
  async unregisterTrigger(triggerId: string): Promise<void> {
    // 停止触发器
    await this.stopTrigger(triggerId)

    // 删除触发器
    const deleted = this.triggers.delete(triggerId)
    if (deleted) {
      this.emit('trigger:unregistered', triggerId)
    }
  }

  /**
   * 启动触发器
   */
  async startTrigger(triggerId: string): Promise<void> {
    const trigger = this.triggers.get(triggerId)
    if (!trigger) {
      throw new Error(`触发器不存在: ${triggerId}`)
    }

    // 如果已经启动，先停止
    if (this.activeTriggers.has(triggerId)) {
      await this.stopTrigger(triggerId)
    }

    // 创建触发器实例
    const triggerInstance = this.createTriggerInstance(trigger)

    // 启动触发器
    const callback = this.callbacks.get(triggerId) || this.defaultCallback.bind(this)
    await triggerInstance.start(callback)

    // 更新状态
    trigger.status = TriggerStatus.ACTIVE
    this.activeTriggers.set(triggerId, triggerInstance)
    this.triggers.set(triggerId, trigger)

    this.emit('trigger:started', trigger)
  }

  /**
   * 停止触发器
   */
  async stopTrigger(triggerId: string): Promise<void> {
    const triggerInstance = this.activeTriggers.get(triggerId)
    if (!triggerInstance) {
      return // 已经停止
    }

    await triggerInstance.stop()
    this.activeTriggers.delete(triggerId)

    const trigger = this.triggers.get(triggerId)
    if (trigger) {
      trigger.status = TriggerStatus.PAUSED
      this.triggers.set(triggerId, trigger)
    }

    this.emit('trigger:stopped', triggerId)
  }

  /**
   * 暂停触发器
   */
  async pauseTrigger(triggerId: string): Promise<void> {
    const triggerInstance = this.activeTriggers.get(triggerId)
    if (!triggerInstance) {
      throw new Error(`触发器未运行: ${triggerId}`)
    }

    await triggerInstance.pause()
    const trigger = this.triggers.get(triggerId)
    if (trigger) {
      trigger.status = TriggerStatus.PAUSED
      this.triggers.set(triggerId, trigger)
    }

    this.emit('trigger:paused', triggerId)
  }

  /**
   * 恢复触发器
   */
  async resumeTrigger(triggerId: string): Promise<void> {
    const triggerInstance = this.activeTriggers.get(triggerId)
    if (!triggerInstance) {
      throw new Error(`触发器未运行: ${triggerId}`)
    }

    await triggerInstance.resume()
    const trigger = this.triggers.get(triggerId)
    if (trigger) {
      trigger.status = TriggerStatus.ACTIVE
      this.triggers.set(triggerId, trigger)
    }

    this.emit('trigger:resumed', triggerId)
  }

  /**
   * 设置触发器回调
   */
  setTriggerCallback(triggerId: string, callback: TriggerCallback): void {
    this.callbacks.set(triggerId, callback)
  }

  /**
   * 获取触发器
   */
  getTrigger(triggerId: string): TriggerDefinition | undefined {
    return this.triggers.get(triggerId)
  }

  /**
   * 获取所有触发器
   */
  getAllTriggers(filters?: {
    workflowId?: string
    type?: TriggerType
    status?: TriggerStatus
  }): TriggerDefinition[] {
    let triggers = Array.from(this.triggers.values())

    if (filters?.workflowId) {
      triggers = triggers.filter(t => t.workflowId === filters.workflowId)
    }

    if (filters?.type) {
      triggers = triggers.filter(t => t.type === filters.type)
    }

    if (filters?.status) {
      triggers = triggers.filter(t => t.status === filters.status)
    }

    return triggers
  }

  /**
   * 获取工作流的所有触发器
   */
  getWorkflowTriggers(workflowId: string): TriggerDefinition[] {
    return this.getAllTriggers({ workflowId })
  }

  /**
   * 手动触发触发器
   */
  async manualTrigger(triggerId: string, payload?: Record<string, unknown>): Promise<void> {
    const trigger = this.triggers.get(triggerId)
    if (!trigger) {
      throw new Error(`触发器不存在: ${triggerId}`)
    }

    const callback = this.callbacks.get(triggerId) || this.defaultCallback.bind(this)
    await callback(trigger, payload)

    // 更新触发器元数据
    trigger.metadata.lastTriggeredAt = new Date().toISOString()
    trigger.metadata.triggerCount++
    this.triggers.set(triggerId, trigger)

    this.emit('trigger:manual', { triggerId, payload })
  }

  /**
   * 获取触发器统计
   */
  getTriggerStats(triggerId: string): {
    triggerCount: number
    errorCount: number
    lastTriggeredAt?: string
    nextTriggerAt?: string
  } | null {
    const trigger = this.triggers.get(triggerId)
    if (!trigger) {
      return null
    }

    const triggerInstance = this.activeTriggers.get(triggerId)

    return {
      triggerCount: trigger.metadata.triggerCount,
      errorCount: trigger.metadata.errorCount,
      lastTriggeredAt: trigger.metadata.lastTriggeredAt,
      nextTriggerAt: triggerInstance?.getNextTriggerTime()?.toISOString(),
    }
  }

  /**
   * 验证触发器定义
   */
  private validateTrigger(trigger: TriggerDefinition): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    // 基本验证
    if (!trigger.id) {
      errors.push('触发器 ID 不能为空')
    }

    if (!trigger.workflowId) {
      errors.push('工作流 ID 不能为空')
    }

    if (!trigger.name) {
      errors.push('触发器名称不能为空')
    }

    // 类型特定验证
    switch (trigger.type) {
      case TriggerType.SCHEDULE:
        if (!('interval' in trigger.config)) {
          errors.push('定时触发器缺少 interval 配置')
        } else if ((trigger.config as ScheduleTriggerConfig).interval <= 0) {
          errors.push('定时触发器 interval 必须大于 0')
        }
        break

      case TriggerType.EVENT:
        if (!('eventType' in trigger.config)) {
          errors.push('事件触发器缺少 eventType 配置')
        }
        break

      case TriggerType.WEBHOOK:
        if (!('endpoint' in trigger.config)) {
          errors.push('Webhook 触发器缺少 endpoint 配置')
        }
        break

      case TriggerType.CRON:
        if (!('expression' in trigger.config)) {
          errors.push('Cron 触发器缺少 expression 配置')
        }
        break
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  }

  /**
   * 创建触发器实例
   */
  private createTriggerInstance(trigger: TriggerDefinition): ITrigger {
    switch (trigger.type) {
      case TriggerType.SCHEDULE:
        return new ScheduleTrigger(trigger as TriggerDefinition<ScheduleTriggerConfig>)

      case TriggerType.EVENT:
        return new EventTrigger(trigger as TriggerDefinition<EventTriggerConfig>)

      case TriggerType.WEBHOOK:
        return new WebhookTrigger(trigger as TriggerDefinition<WebhookTriggerConfig>)

      case TriggerType.CRON:
        return new CronTrigger(trigger as TriggerDefinition<CronTriggerConfig>)

      default:
        throw new Error(`不支持的触发器类型: ${trigger.type}`)
    }
  }

  /**
   * 默认触发器回调
   */
  private async defaultCallback(trigger: TriggerDefinition, payload?: Record<string, unknown>): Promise<void> {
    // 更新触发器元数据
    trigger.metadata.lastTriggeredAt = new Date().toISOString()
    trigger.metadata.triggerCount++
    this.triggers.set(trigger.id, trigger)

    // 发出触发事件
    this.emit('trigger:activated', {
      triggerId: trigger.id,
      workflowId: trigger.workflowId,
      timestamp: new Date().toISOString(),
      payload: {
        ...trigger.executionConfig?.inputs,
        ...payload,
      },
    })
  }

  /**
   * 停止所有触发器
   */
  async stopAll(): Promise<void> {
    const triggerIds = Array.from(this.activeTriggers.keys())
    await Promise.all(triggerIds.map(id => this.stopTrigger(id)))
  }
}

// 导出单例实例
export const triggerManager = new TriggerManager()

/**
 * 定时触发器实现
 */
class ScheduleTrigger implements ITrigger {
  private trigger: TriggerDefinition<ScheduleTriggerConfig>
  private callback?: TriggerCallback
  private timer?: NodeJS.Timeout
  private isRunningFlag = false
  private isPausedFlag = false

  constructor(trigger: TriggerDefinition<ScheduleTriggerConfig>) {
    this.trigger = trigger
  }

  async start(callback: TriggerCallback): Promise<void> {
    this.callback = callback
    this.isRunningFlag = true
    this.isPausedFlag = false

    const config = this.trigger.config as ScheduleTriggerConfig
    const interval = config.interval

    // 设置定时器
    this.timer = setInterval(async () => {
      if (!this.isPausedFlag && this.callback) {
        await this.callback(this.trigger, {
          triggeredAt: new Date().toISOString(),
          type: 'schedule',
        })
      }
    }, interval)

    // 更新下一次触发时间
    this.trigger.metadata.nextTriggerAt = new Date(Date.now() + interval).toISOString()
  }

  async stop(): Promise<void> {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = undefined
    }
    this.isRunningFlag = false
    this.isPausedFlag = false
  }

  async pause(): Promise<void> {
    this.isPausedFlag = true
  }

  async resume(): Promise<void> {
    this.isPausedFlag = false
  }

  isRunning(): boolean {
    return this.isRunningFlag
  }

  getNextTriggerTime(): Date | null {
    if (!this.isRunningFlag || this.isPausedFlag) {
      return null
    }
    const nextTime = this.trigger.metadata.nextTriggerAt
    return nextTime ? new Date(nextTime) : null
  }
}

/**
 * 事件触发器实现
 */
class EventTrigger implements ITrigger {
  private trigger: TriggerDefinition<EventTriggerConfig>
  private callback?: TriggerCallback
  private isRunningFlag = false
  private isPausedFlag = false
  private debounceTimer?: NodeJS.Timeout

  constructor(trigger: TriggerDefinition<EventTriggerConfig>) {
    this.trigger = trigger
  }

  async start(callback: TriggerCallback): Promise<void> {
    this.callback = callback
    this.isRunningFlag = true
    this.isPausedFlag = false

    // 事件触发器需要外部事件驱动
    // 这里只是标记为启动，实际触发通过 triggerEvent 方法
  }

  async stop(): Promise<void> {
    this.isRunningFlag = false
    this.isPausedFlag = false
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
    }
  }

  async pause(): Promise<void> {
    this.isPausedFlag = true
  }

  async resume(): Promise<void> {
    this.isPausedFlag = false
  }

  isRunning(): boolean {
    return this.isRunningFlag
  }

  getNextTriggerTime(): Date | null {
    return null // 事件触发器没有固定的下次触发时间
  }

  /**
   * 触发事件
   */
  async triggerEvent(eventData: Record<string, unknown>): Promise<void> {
    if (!this.isRunningFlag || this.isPausedFlag || !this.callback) {
      return
    }

    const config = this.trigger.config as EventTriggerConfig

    // 防抖处理
    if (config.debounce) {
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer)
      }

      this.debounceTimer = setTimeout(async () => {
        await this.callback!(this.trigger, eventData)
      }, config.debounce)

      return
    }

    // 直接触发
    await this.callback(this.trigger, eventData)
  }
}

/**
 * Webhook 触发器实现
 */
class WebhookTrigger implements ITrigger {
  private trigger: TriggerDefinition<WebhookTriggerConfig>
  private callback?: TriggerCallback
  private isRunningFlag = false
  private isPausedFlag = false

  constructor(trigger: TriggerDefinition<WebhookTriggerConfig>) {
    this.trigger = trigger
  }

  async start(callback: TriggerCallback): Promise<void> {
    this.callback = callback
    this.isRunningFlag = true
    this.isPausedFlag = false

    // Webhook 触发器需要 HTTP 服务器支持
    // 这里只是标记为启动，实际触发通过 handleWebhook 方法
  }

  async stop(): Promise<void> {
    this.isRunningFlag = false
    this.isPausedFlag = false
  }

  async pause(): Promise<void> {
    this.isPausedFlag = true
  }

  async resume(): Promise<void> {
    this.isPausedFlag = false
  }

  isRunning(): boolean {
    return this.isRunningFlag
  }

  getNextTriggerTime(): Date | null {
    return null // Webhook 触发器没有固定的下次触发时间
  }

  /**
   * 处理 Webhook 请求
   */
  async handleWebhook(request: {
    headers: Record<string, string>
    body: unknown
    ip?: string
  }): Promise<void> {
    if (!this.isRunningFlag || this.isPausedFlag || !this.callback) {
      throw new Error('Webhook 触发器未运行')
    }

    const config = this.trigger.config as WebhookTriggerConfig

    // 验证签名
    if (config.validation?.signature) {
      // TODO: 实现签名验证
    }

    // 验证 IP 白名单
    if (config.validation?.ipWhitelist && request.ip) {
      if (!config.validation.ipWhitelist.includes(request.ip)) {
        throw new Error('IP 不在白名单中')
      }
    }

    // 触发回调
    await this.callback(this.trigger, {
      headers: request.headers,
      body: request.body,
      triggeredAt: new Date().toISOString(),
      type: 'webhook',
    })
  }
}

/**
 * Cron 触发器实现
 */
class CronTrigger implements ITrigger {
  private trigger: TriggerDefinition<CronTriggerConfig>
  private callback?: TriggerCallback
  private timer?: NodeJS.Timeout
  private isRunningFlag = false
  private isPausedFlag = false

  constructor(trigger: TriggerDefinition<CronTriggerConfig>) {
    this.trigger = trigger
  }

  async start(callback: TriggerCallback): Promise<void> {
    this.callback = callback
    this.isRunningFlag = true
    this.isPausedFlag = false

    // 启动 Cron 调度
    this.scheduleNextRun()
  }

  async stop(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = undefined
    }
    this.isRunningFlag = false
    this.isPausedFlag = false
  }

  async pause(): Promise<void> {
    this.isPausedFlag = true
  }

  async resume(): Promise<void> {
    this.isPausedFlag = false
  }

  isRunning(): boolean {
    return this.isRunningFlag
  }

  getNextTriggerTime(): Date | null {
    if (!this.isRunningFlag || this.isPausedFlag) {
      return null
    }
    const nextTime = this.trigger.metadata.nextTriggerAt
    return nextTime ? new Date(nextTime) : null
  }

  /**
   * 调度下一次运行
   */
  private scheduleNextRun(): void {
    const config = this.trigger.config as CronTriggerConfig
    const nextRun = this.calculateNextRun(config.expression, config.timezone)

    if (!nextRun) {
      return
    }

    this.trigger.metadata.nextTriggerAt = nextRun.toISOString()

    const delay = nextRun.getTime() - Date.now()

    this.timer = setTimeout(async () => {
      if (!this.isPausedFlag && this.callback) {
        await this.callback(this.trigger, {
          triggeredAt: new Date().toISOString(),
          type: 'cron',
        })
      }
      // 调度下一次运行
      this.scheduleNextRun()
    }, delay)
  }

  /**
   * 计算下一次运行时间（简化版 Cron 解析）
   */
  private calculateNextRun(expression: string, timezone?: string): Date | null {
    // TODO: 实现完整的 Cron 表达式解析
    // 这里使用简化的实现，只支持 "*/N" 格式（每 N 分钟）

    const match = expression.match(/^\*\/(\d+)\s+?\*\s+?\*\s+?\*\s+?\*$/)
    if (!match) {
      console.warn(`不支持的 Cron 表达式: ${expression}`)
      return null
    }

    const minutes = parseInt(match[1], 10)
    const now = timezone ? this.getDateInTimezone(timezone) : new Date()
    const nextRun = new Date(now.getTime() + minutes * 60 * 1000)

    return nextRun
  }

  /**
   * 获取指定时区的日期
   */
  private getDateInTimezone(timezone: string): Date {
    // TODO: 实现时区转换
    return new Date()
  }
}

/**
 * 泛型触发器定义类型
 */
export type TriggerDefinition<T> = Omit<TriggerDefinition, 'config'> & {
  config: T
}
