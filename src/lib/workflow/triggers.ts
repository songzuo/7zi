/**
 * 工作流触发器系统
 * 支持定时触发、事件触发和 Webhook 触发
 */

import { EventEmitter } from 'events'
import { createHmac, timingSafeEqual } from 'crypto'

/**
 * Webhook 签名头候选名称（小写，按优先级顺序）
 * - x-signature: 通用约定
 * - x-webhook-signature: 通用约定
 * - x-hub-signature-256: GitHub 风格（sha256= 前缀）
 */
export const WEBHOOK_SIGNATURE_HEADERS = [
  'x-signature',
  'x-webhook-signature',
  'x-hub-signature-256',
] as const

/** 携带签名时间戳的请求头（用于防重放） */
export const WEBHOOK_TIMESTAMP_HEADERS = [
  'x-signature-timestamp',
  'x-webhook-timestamp',
  'x-hub-signature-256-timestamp',
] as const

/** 签名时间戳可接受的时间窗口（秒）—— 超出即视为重放 */
export const WEBHOOK_SIGNATURE_MAX_AGE_SECONDS = 300

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
    const trigger = this.triggers.get(triggerId)
    if (!trigger) {
      throw new Error(`触发器不存在: ${triggerId}`)
    }

    const triggerInstance = this.activeTriggers.get(triggerId)
    if (!triggerInstance) {
      // 触发器已注册但从未启动过（例如注册时即为暂停状态），
      // 恢复操作等价于直接启动它
      await this.startTrigger(triggerId)
      this.emit('trigger:resumed', triggerId)
      return
    }

    await triggerInstance.resume()
    trigger.status = TriggerStatus.ACTIVE
    this.triggers.set(triggerId, trigger)

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

    const customCallback = this.callbacks.get(triggerId)
    const callback = customCallback || this.defaultCallback.bind(this)
    await callback(trigger, payload)

    // 默认回调内部已经更新过触发计数与时间戳，
    // 只有使用自定义回调时才需要在这里补一次，避免计数重复累加
    if (customCallback) {
      trigger.metadata.lastTriggeredAt = new Date().toISOString()
      trigger.metadata.triggerCount++
      this.triggers.set(triggerId, trigger)
    }

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
        return new ScheduleTrigger(trigger as TriggerDefinition)

      case TriggerType.EVENT:
        return new EventTrigger(trigger as TriggerDefinition)

      case TriggerType.WEBHOOK:
        return new WebhookTrigger(trigger as TriggerDefinition)

      case TriggerType.CRON:
        return new CronTrigger(trigger as TriggerDefinition)

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
  private trigger: TriggerDefinition
  private callback?: TriggerCallback
  private timer?: NodeJS.Timeout
  private isRunningFlag = false
  private isPausedFlag = false

  constructor(trigger: TriggerDefinition) {
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
  private trigger: TriggerDefinition
  private callback?: TriggerCallback
  private isRunningFlag = false
  private isPausedFlag = false
  private debounceTimer?: NodeJS.Timeout

  constructor(trigger: TriggerDefinition) {
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
export class WebhookTrigger implements ITrigger {
  private trigger: TriggerDefinition
  private callback?: TriggerCallback
  private isRunningFlag = false
  private isPausedFlag = false

  constructor(trigger: TriggerDefinition) {
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
    /** 原始请求体（若框架已解析 JSON，建议传入原始字符串以保证签名一致） */
    rawBody?: string | Buffer
  }): Promise<void> {
    if (!this.isRunningFlag || this.isPausedFlag || !this.callback) {
      throw new Error('Webhook 触发器未运行')
    }

    const config = this.trigger.config as WebhookTriggerConfig

    // 验证签名
    if (config.validation?.signature) {
      this.verifySignature(config.validation.signature, request)
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

  /**
   * 验证 Webhook 签名（HMAC-SHA256，hex 编码，恒定时间比较）
   */
  private verifySignature(
    secret: string,
    request: { headers: Record<string, string>; body: unknown; rawBody?: string | Buffer }
  ): void {
    const provided = this.extractSignature(request.headers)

    if (!provided) {
      throw new Error('Webhook 签名缺失: 未在请求头中找到签名')
    }

    const rawBody = this.getRawBody(request)

    // 防重放：签名必须绑定一个时间戳，且时间戳不能太旧。
    // 签名串 = `${timestamp}.${rawBody}`，攻击者截获旧请求重放时
    // 时间戳已超出窗口 → 直接拒绝。
    const timestamp = this.extractTimestamp(request.headers)
    if (timestamp !== undefined) {
      const ageSeconds = Math.abs(Date.now() / 1000 - timestamp)
      if (ageSeconds > WEBHOOK_SIGNATURE_MAX_AGE_SECONDS) {
        throw new Error(
          `Webhook 签名已过期: 时间戳超出 ${WEBHOOK_SIGNATURE_MAX_AGE_SECONDS}s 窗口`
        )
      }
    }

    const signedPayload = timestamp !== undefined ? `${timestamp}.${rawBody}` : rawBody
    const expected = createHmac('sha256', secret).update(signedPayload).digest('hex')

    // 兼容 "sha256=<hex>" 前缀形式
    const normalized = provided.replace(/^sha256=/i, '').trim().toLowerCase()

    if (!/^[0-9a-f]+$/.test(normalized)) {
      throw new Error('Webhook 签名无效: 签名格式不正确')
    }

    const providedBuffer = Buffer.from(normalized, 'hex')
    const expectedBuffer = Buffer.from(expected, 'hex')

    // timingSafeEqual 要求等长 Buffer，长度不等直接判定失败
    if (providedBuffer.length !== expectedBuffer.length) {
      throw new Error('Webhook 签名验证失败')
    }

    if (!timingSafeEqual(providedBuffer, expectedBuffer)) {
      throw new Error('Webhook 签名验证失败')
    }
  }

  /**
   * 从请求头中提取签名（大小写不敏感，兼容多种常见头名）
   */
  private extractSignature(headers: Record<string, string>): string | undefined {
    const lowered = new Map<string, string>()
    for (const [key, value] of Object.entries(headers || {})) {
      if (typeof value === 'string') {
        lowered.set(key.toLowerCase(), value)
      }
    }

    for (const headerName of WEBHOOK_SIGNATURE_HEADERS) {
      const value = lowered.get(headerName)
      if (value && value.trim().length > 0) {
        return value.trim()
      }
    }

    return undefined
  }

  /**
   * 从请求头中提取签名时间戳（秒级 Unix 时间戳）
   */
  private extractTimestamp(headers: Record<string, string>): number | undefined {
    const lowered = new Map<string, string>()
    for (const [key, value] of Object.entries(headers || {})) {
      if (typeof value === 'string') {
        lowered.set(key.toLowerCase(), value)
      }
    }

    for (const headerName of WEBHOOK_TIMESTAMP_HEADERS) {
      const value = lowered.get(headerName)
      if (!value || value.trim().length === 0) continue

      const parsed = Number.parseInt(value.trim(), 10)
      if (Number.isFinite(parsed)) {
        return parsed
      }
    }

    return undefined
  }

  /**
   * 获取用于签名的原始请求体
   */
  private getRawBody(request: { body: unknown; rawBody?: string | Buffer }): string {
    if (typeof request.rawBody === 'string') {
      return request.rawBody
    }
    if (request.rawBody && Buffer.isBuffer(request.rawBody)) {
      return request.rawBody.toString('utf8')
    }
    if (typeof request.body === 'string') {
      return request.body
    }
    if (request.body === undefined || request.body === null) {
      return ''
    }
    return JSON.stringify(request.body)
  }
}

/**
 * Cron 触发器实现
 */
export class CronTrigger implements ITrigger {
  private trigger: TriggerDefinition
  private callback?: TriggerCallback
  private timer?: NodeJS.Timeout
  private isRunningFlag = false
  private isPausedFlag = false

  constructor(trigger: TriggerDefinition) {
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
   * 计算下一次运行时间（标准 5 字段 Cron 解析）
   *
   * 支持的字段语法（每字段）：
   *   `*`        所有值
   *   `5`        单个值
   *   `1-5`      范围（含端点）
   *   `1,3,5`    列表
   *   `*\/10`    步进（可与范围组合：`1-30\/5`）
   *   `1-5/2`    范围 + 步进
   *
   * 字段顺序：`分 时 日 月 周`（日与周均为 0-6，0 与 7 都表示周日）。
   * 日与周**同时**被限定时取并集（与标准 cron 行为一致）。
   */
  private calculateNextRun(expression: string, timezone?: string): Date | null {
    const fields = expression.trim().split(/\s+/)

    if (fields.length !== 5) {
      console.warn(`不支持的 Cron 表达式（应为 5 个字段）: ${expression}`)
      return null
    }

    const [minuteField, hourField, dayField, monthField, weekdayField] = fields

    let minutes: Set<number>
    let hours: Set<number>
    let days: Set<number>
    let months: Set<number>
    let weekdays: Set<number>

    try {
      minutes = parseCronField(minuteField, 0, 59)
      hours = parseCronField(hourField, 0, 23)
      days = parseCronField(dayField, 1, 31)
      months = parseCronField(monthField, 1, 12)
      weekdays = parseCronField(weekdayField, 0, 7)
    } catch (error) {
      console.warn(
        `无效的 Cron 表达式: ${expression} — ${error instanceof Error ? error.message : String(error)}`
      )
      return null
    }

    // 7 与 0 都表示周日
    if (weekdays.has(7)) {
      weekdays.add(0)
      weekdays.delete(7)
    }

    const dayRestricted = dayField !== '*'
    const weekdayRestricted = weekdayField !== '*'

    // 以「当前时刻 + 1 分钟」为起点，避免在同一分钟内重复触发
    const base = timezone ? this.getDateInTimezone(timezone) : new Date()
    const cursor = new Date(base.getTime())
    cursor.setSeconds(0, 0)
    cursor.setMinutes(cursor.getMinutes() + 1)

    // 最多向前找 4 年 —— 足以覆盖 2 月 29 日这类稀疏表达式
    const limit = new Date(cursor.getTime())
    limit.setFullYear(limit.getFullYear() + 4)

    while (cursor <= limit) {
      if (
        months.has(cursor.getMonth() + 1) &&
        hours.has(cursor.getHours()) &&
        minutes.has(cursor.getMinutes()) &&
        matchesDayAndWeekday(cursor, days, weekdays, dayRestricted, weekdayRestricted)
      ) {
        return cursor
      }

      // 推进到下一个候选分钟。
      // 分层跳，避免逐分钟空转（最坏情况 4 年 ≈ 210 万次循环）：
      //   1. 当前小时内若还有更晚的匹配分钟，直接跳到那个分钟
      //   2. 否则跳到下一小时的第 0 分钟
      //   3. 若该小时不在 hours 集合里，直接跳到下一个匹配小时
      // 注意不能简单「整点跳到下一小时」—— 那会跳过当前小时剩余的分钟
      // （比如 10:17 起找 09:30，跳到 11:00 就把 10:30~10:59 全跳过了）。
      const currentHour = cursor.getHours()
      let advanced = false

      if (hours.has(currentHour)) {
        // 在当前小时内找下一个匹配分钟
        for (let minute = cursor.getMinutes() + 1; minute <= 59; minute++) {
          if (minutes.has(minute)) {
            cursor.setMinutes(minute)
            advanced = true
            break
          }
        }
      }

      if (!advanced) {
        // 当前小时没有更晚的匹配分钟 → 跳到下一个匹配小时的第 0 分钟
        const probe = new Date(cursor.getTime())
        probe.setHours(probe.getHours() + 1, 0, 0, 0)

        let foundHour = false
        for (let i = 0; i < 24 * 366; i++) {
          if (hours.has(probe.getHours())) {
            cursor.setTime(probe.getTime())
            foundHour = true
            break
          }
          probe.setHours(probe.getHours() + 1)
        }

        if (!foundHour) {
          break
        }
      }
    }

    console.warn(`Cron 表达式在未来 4 年内没有匹配时间: ${expression}`)
    return null
  }

  /**
   * 获取指定时区的日期
   *
   * 用 `Intl.DateTimeFormat` 把目标时区的墙上时间读出来，再按该时区
   * 重新解释为一个 Date 对象 —— 这样"每天 09:00"在指定时区触发时，
   * 算的是目标时区的 09:00，而不是运行机器本地时区的 09:00。
   */
  private getDateInTimezone(timezone: string): Date {
    try {
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      })

      const parts = formatter.formatToParts(new Date())
      const lookup: Record<string, number> = {}
      for (const part of parts) {
        if (part.type !== 'literal') {
          lookup[part.type] = Number.parseInt(part.value, 10)
        }
      }

      // 把目标时区的墙上时间当作 UTC 读出来，再减去该时区与 UTC 的偏移
      const asUtc = Date.UTC(
        lookup.year,
        lookup.month - 1,
        lookup.day,
        lookup.hour % 24,
        lookup.minute,
        lookup.second
      )
      const offsetMs = asUtc - Date.now()

      return new Date(Date.now() + offsetMs)
    } catch (error) {
      // 时区非法时退回本地时间，不让整个触发器挂掉
      console.warn(`无效的时区: ${timezone}，退回本地时间`, error)
      return new Date()
    }
  }
}

/**
 * 解析单个 Cron 字段，返回该字段命中的所有取值
 */
function parseCronField(field: string, min: number, max: number): Set<number> {
  const values = new Set<number>()

  if (!field) {
    throw new Error('字段为空')
  }

  for (const part of field.split(',')) {
    const trimmed = part.trim()
    if (!trimmed) {
      throw new Error(`字段格式错误: ${field}`)
    }

    // 拆出步进
    let base = trimmed
    let step = 1
    const slashIndex = trimmed.indexOf('/')
    if (slashIndex !== -1) {
      base = trimmed.slice(0, slashIndex)
      const stepText = trimmed.slice(slashIndex + 1)
      if (!/^\d+$/.test(stepText)) {
        throw new Error(`无效的步进值: ${trimmed}`)
      }
      step = Number.parseInt(stepText, 10)
      if (step <= 0) {
        throw new Error(`步进值必须为正数: ${trimmed}`)
      }
    }

    let rangeStart: number
    let rangeEnd: number

    if (base === '*') {
      rangeStart = min
      rangeEnd = max
    } else if (base.includes('-')) {
      const [startText, endText] = base.split('-')
      if (!/^\d+$/.test(startText.trim()) || !/^\d+$/.test(endText.trim())) {
        throw new Error(`无效的范围: ${trimmed}`)
      }
      rangeStart = Number.parseInt(startText.trim(), 10)
      rangeEnd = Number.parseInt(endText.trim(), 10)
    } else {
      if (!/^\d+$/.test(base)) {
        throw new Error(`无效的取值: ${trimmed}`)
      }
      rangeStart = Number.parseInt(base)
      rangeEnd = step > 1 ? max : rangeStart
    }

    if (rangeStart < min || rangeEnd > max || rangeStart > rangeEnd) {
      throw new Error(`取值超出范围 [${min}, ${max}]: ${trimmed}`)
    }

    for (let value = rangeStart; value <= rangeEnd; value += step) {
      values.add(value)
    }
  }

  if (values.size === 0) {
    throw new Error(`字段没有命中任何取值: ${field}`)
  }

  return values
}

/**
 * 判断某个日期是否命中「日」和「周」两个字段
 *
 * 标准 cron 语义：两者都被限定时取**并集**（满足其一即触发）；
 * 只有一个被限定时只看那一个；都没限定则每天都命中。
 */
function matchesDayAndWeekday(
  date: Date,
  days: Set<number>,
  weekdays: Set<number>,
  dayRestricted: boolean,
  weekdayRestricted: boolean
): boolean {
  const dayMatches = days.has(date.getDate())
  const weekdayMatches = weekdays.has(date.getDay())

  if (dayRestricted && weekdayRestricted) {
    return dayMatches || weekdayMatches
  }
  if (dayRestricted) {
    return dayMatches
  }
  if (weekdayRestricted) {
    return weekdayMatches
  }
  return true
}

/**
 * 泛型触发器定义类型
 */
// Generic type removed - was causing duplicate identifier error
