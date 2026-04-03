/**
 * Enhanced Slack Alert Channel
 * 增强版 Slack 告警渠道
 *
 * Features:
 * - 按级别路由到不同频道
 * - 节流机制（防止告警风暴）
 * - 重试逻辑（指数退避）
 * - 详细的错误日志
 *
 * @module lib/performance/alerting/channels/slack-enhanced
 */

// ========================================
// Types (inline - previously from @/lib/utils/formatting)
// ========================================

export type AlertLevel = 'info' | 'warning' | 'error' | 'critical'

export interface PerformanceAlert {
  id: string
  title: string
  message: string
  level: AlertLevel
  category: string
  status: string
  source: string
  metric?: string
  currentValue?: number
  threshold?: number
  metadata?: Record<string, unknown>
  createdAt: number
  updatedAt: number
  acknowledgedAt?: number
  acknowledgedBy?: string
  resolvedAt?: number
  occurrenceCount: number
  tags?: string[]
}

// ========================================
// Formatting utilities (inline - previously from @/lib/utils/formatting)
// ========================================

function getSlackLevelEmoji(level: AlertLevel): string {
  const emojis: Record<AlertLevel, string> = {
    info: ':information_source:',
    warning: ':warning:',
    error: ':x:',
    critical: ':rotating_light:',
  }
  return emojis[level] || ':warning:'
}

function getLevelColor(level: AlertLevel): string {
  const colors: Record<AlertLevel, string> = {
    info: '#3b82f6',
    warning: '#f59e0b',
    error: '#ef4444',
    critical: '#dc2626',
  }
  return colors[level] || '#f59e0b'
}

function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toISOString()
}

function formatSlackAlert(
  alert: PerformanceAlert,
  options: {
    mention?: string
    includeMetadata?: boolean
    includeMetric?: boolean
  } = {}
): {
  text: string
  attachments: Array<{
    color: string
    title: string
    text: string
    fields?: Array<{ title: string; value: string; short: boolean }>
    footer?: string
    ts: number
  }>
} {
  const { mention, includeMetadata, includeMetric } = options
  const emoji = getSlackLevelEmoji(alert.level)
  const color = getLevelColor(alert.level)

  // 构建消息文本
  let text = `${emoji} *${alert.title}*`
  if (mention) {
    text = `${mention} ${text}`
  }

  // 构建附件
  const fields: Array<{ title: string; value: string; short: boolean }> = []

  if (alert.metric && includeMetric) {
    fields.push({
      title: 'Metric',
      value: `${alert.metric}: ${alert.currentValue} / ${alert.threshold}`,
      short: true,
    })
  }

  fields.push({
    title: 'Source',
    value: alert.source,
    short: true,
  })

  fields.push({
    title: 'Category',
    value: alert.category,
    short: true,
  })

  fields.push({
    title: 'Status',
    value: alert.status,
    short: true,
  })

  if (includeMetadata && alert.metadata) {
    Object.entries(alert.metadata).forEach(([key, value]) => {
      fields.push({
        title: key,
        value: String(value),
        short: true,
      })
    })
  }

  const attachments = [
    {
      color,
      title: alert.title,
      text: alert.message,
      fields,
      ts: Math.floor(alert.createdAt / 1000),
    },
  ]

  return { text, attachments }
}

// ========================================
// Types
// ========================================

/**
 * 级别到频道的映射
 */
export interface LevelChannelMapping {
  info?: string
  warning?: string
  error?: string
  critical?: string
}

/**
 * Slack 配置
 */
export interface SlackConfig {
  /** Slack webhook URL */
  webhookUrl: string
  /** 按级别路由到不同频道 */
  levelChannels?: LevelChannelMapping
  /** 默认频道（覆盖 webhook 默认） */
  channel?: string
  /** 机器人用户名 */
  username?: string
  /** 机器人图标 emoji */
  iconEmoji?: string
  /** 机器人图标 URL */
  iconUrl?: string
  /** 是否启用 */
  enabled?: boolean
}

/**
 * 节流配置
 */
export interface ThrottleConfig {
  /** 时间窗口（毫秒） */
  windowMs: number
  /** 窗口内最大消息数 */
  maxPerWindow: number
}

/**
 * 重试配置
 */
export interface RetryConfig {
  /** 最大重试次数 */
  maxAttempts: number
  /** 基础延迟（毫秒） */
  baseDelayMs: number
  /** 最大延迟（毫秒） */
  maxDelayMs: number
}

/**
 * Slack 告警选项
 */
export interface SlackAlertOptions {
  /** 覆盖频道 */
  channel?: string
  /** 包含详细字段 */
  includeFields?: boolean
  /** 包含元数据 */
  includeMetadata?: boolean
  /** 提及用户或组 */
  mention?: string
  /** 消息前缀 */
  messagePrefix?: string
  /** 自定义页脚 */
  footer?: string
  /** 节流配置 */
  throttle?: ThrottleConfig
  /** 重试配置 */
  retry?: RetryConfig
  /** 级别到节流配置的映射（可选） */
  throttleByLevel?: Partial<Record<AlertLevel, ThrottleConfig>>
}

/**
 * 发送结果
 */
export interface SendResult {
  success: boolean
  alertId: string
  channel?: string
  throttled: boolean
  attempts: number
  error?: string
  duration: number
}

// ========================================
// LevelRouter - 级别路由器
// ========================================

/**
 * 按告警级别路由到不同频道
 */
export class LevelRouter {
  private mapping: LevelChannelMapping

  constructor(mapping: LevelChannelMapping = {}) {
    this.mapping = mapping
  }

  /**
   * 获取指定级别的频道
   */
  getChannel(level: AlertLevel): string | undefined {
    return this.mapping[level]
  }

  /**
   * 更新映射
   */
  updateMapping(mapping: Partial<LevelChannelMapping>): void {
    this.mapping = { ...this.mapping, ...mapping }
  }

  /**
   * 获取当前映射
   */
  getMapping(): LevelChannelMapping {
    return { ...this.mapping }
  }
}

// ========================================
// Throttler - 节流器
// ========================================

/**
 * 告警节流器，防止告警风暴
 */
export class Throttler {
  private config: ThrottleConfig
  private history: Map<string, number[]> = new Map()
  private cleanupInterval: NodeJS.Timeout | null = null

  constructor(config: ThrottleConfig) {
    this.config = config
    // 定期清理过期记录
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000)
  }

  /**
   * 检查是否应该节流
   * @param key 节流键（通常是 level:source:metric）
   * @returns true 表示应该节流，false 表示可以发送
   */
  shouldThrottle(key: string): boolean {
    const now = Date.now()
    const timestamps = this.history.get(key) || []

    // 过滤掉过期的记录
    const validTimestamps = timestamps.filter(ts => now - ts < this.config.windowMs)

    // 检查是否超过限制
    if (validTimestamps.length >= this.config.maxPerWindow) {
      return true // 节流
    }

    // 记录本次发送时间
    validTimestamps.push(now)
    this.history.set(key, validTimestamps)
    return false
  }

  /**
   * 获取节流状态
   */
  getThrottleStatus(key: string): {
    isThrottled: boolean
    countInWindow: number
    windowRemaining: number
  } {
    const now = Date.now()
    const timestamps = this.history.get(key) || []
    const validTimestamps = timestamps.filter(ts => now - ts < this.config.windowMs)

    const oldestTimestamp = validTimestamps[0]
    const windowRemaining = oldestTimestamp
      ? Math.max(0, this.config.windowMs - (now - oldestTimestamp))
      : 0

    return {
      isThrottled: validTimestamps.length >= this.config.maxPerWindow,
      countInWindow: validTimestamps.length,
      windowRemaining,
    }
  }

  /**
   * 重置指定键的节流状态
   */
  reset(key: string): void {
    this.history.delete(key)
  }

  /**
   * 重置所有节流状态
   */
  resetAll(): void {
    this.history.clear()
  }

  /**
   * 清理过期记录
   */
  private cleanup(): void {
    const now = Date.now()
    for (const [key, timestamps] of this.history.entries()) {
      const validTimestamps = timestamps.filter(ts => now - ts < this.config.windowMs)
      if (validTimestamps.length === 0) {
        this.history.delete(key)
      } else {
        this.history.set(key, validTimestamps)
      }
    }
  }

  /**
   * 销毁节流器
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
    this.history.clear()
  }
}

// ========================================
// Retryer - 重试器
// ========================================

/**
 * 指数退避重试器
 */
export class Retryer {
  private config: RetryConfig

  constructor(config: RetryConfig) {
    this.config = config
  }

  /**
   * 执行带重试的异步操作
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: Error | undefined

    for (let attempt = 1; attempt <= this.config.maxAttempts; attempt++) {
      try {
        return await fn()
      } catch (error) {
        lastError = error as Error

        if (attempt < this.config.maxAttempts) {
          const delay = this.calculateDelay(attempt)
          await this.sleep(delay)
        }
      }
    }

    throw lastError
  }

  /**
   * 计算延迟时间（指数退避）
   */
  private calculateDelay(attempt: number): number {
    const delay = this.config.baseDelayMs * Math.pow(2, attempt - 1)
    // 添加一些随机抖动，避免同时重试
    const jitter = Math.random() * 100
    return Math.min(delay + jitter, this.config.maxDelayMs)
  }

  /**
   * 延迟
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// ========================================
// EnhancedSlackChannel - 增强版 Slack 渠道
// ========================================

/**
 * 增强版 Slack 告警渠道
 *
 * @example
 * ```typescript
 * const channel = new EnhancedSlackChannel(
 *   {
 *     webhookUrl: process.env.SLACK_WEBHOOK_URL!,
 *     levelChannels: {
 *       critical: '#incidents',
 *       error: '#alerts-error',
 *       warning: '#alerts-warning',
 *       info: '#alerts-info',
 *     },
 *   },
 *   {
 *     mention: '@oncall',
 *     throttle: { windowMs: 60000, maxPerWindow: 1 },
 *     retry: { maxAttempts: 3, baseDelayMs: 1000, maxDelayMs: 10000 },
 *   }
 * )
 *
 * alerter.registerChannel(channel)
 * ```
 */
export class EnhancedSlackChannel {
  name = 'slack-enhanced'
  private config: SlackConfig
  private options: SlackAlertOptions
  private levelRouter: LevelRouter
  private throttler: Throttler
  private levelThrottlers: Map<AlertLevel, Throttler> = new Map()
  private retryer: Retryer
  private enabled: boolean

  // 统计
  private stats = {
    sent: 0,
    failed: 0,
    throttled: 0,
    totalAttempts: 0,
  }

  constructor(config: SlackConfig, options?: SlackAlertOptions) {
    this.config = config
    this.options = options || {}
    this.levelRouter = new LevelRouter(config.levelChannels || {})

    // 主节流器
    this.throttler = new Throttler(
      options?.throttle || { windowMs: 60000, maxPerWindow: 1 }
    )

    // 级别特定的节流器
    if (options?.throttleByLevel) {
      for (const [level, throttleConfig] of Object.entries(options.throttleByLevel)) {
        if (throttleConfig) {
          this.levelThrottlers.set(level as AlertLevel, new Throttler(throttleConfig))
        }
      }
    }

    // 重试器
    this.retryer = new Retryer(
      options?.retry || { maxAttempts: 3, baseDelayMs: 1000, maxDelayMs: 10000 }
    )

    this.enabled = config.enabled !== false
  }

  /**
   * 发送告警
   */
  async send(alert: PerformanceAlert): Promise<SendResult> {
    const startTime = Date.now()
    const result: SendResult = {
      success: false,
      alertId: alert.id,
      throttled: false,
      attempts: 0,
      duration: 0,
    }

    // 检查是否启用
    if (!this.enabled) {
      result.error = 'Channel disabled'
      result.duration = Date.now() - startTime
      return result
    }

    // 生成节流键
    const throttleKey = this.generateThrottleKey(alert)
    const alertLevel = alert.level as AlertLevel

    // 检查级别特定节流
    const levelThrottler = this.levelThrottlers.get(alertLevel)
    if (levelThrottler && levelThrottler.shouldThrottle(throttleKey)) {
      this.stats.throttled++
      result.throttled = true
      result.duration = Date.now() - startTime
      return result
    }

    // 检查全局节流
    if (this.throttler.shouldThrottle(throttleKey)) {
      this.stats.throttled++
      result.throttled = true
      result.duration = Date.now() - startTime
      return result
    }

    // 获取目标频道
    const channel = this.options.channel || this.levelRouter.getChannel(alertLevel)

    try {
      // 使用重试器发送
      await this.retryer.execute(async () => {
        this.stats.totalAttempts++
        result.attempts++

        // 格式化消息
        const slackMessage = formatSlackAlert(
          {
            id: alert.id,
            title: alert.title,
            message: alert.message,
            level: alertLevel,
            category: alert.category,
            status: alert.status,
            source: alert.source,
            metric: alert.metric,
            currentValue: alert.currentValue,
            threshold: alert.threshold,
            metadata: alert.metadata,
            createdAt: alert.createdAt,
            updatedAt: alert.updatedAt,
            acknowledgedAt: alert.acknowledgedAt,
            acknowledgedBy: alert.acknowledgedBy,
            resolvedAt: alert.resolvedAt,
            occurrenceCount: alert.occurrenceCount,
            tags: alert.tags,
          },
          {
            mention: this.options.mention,
            includeMetadata: this.options.includeMetadata,
            includeMetric: true,
          }
        )

        // 构建完整消息
        const message: Record<string, unknown> = {
          username: this.config.username || 'Performance Alerter',
          icon_emoji: this.config.iconEmoji || ':warning:',
          text: slackMessage.text,
          attachments: slackMessage.attachments,
        }

        // 添加频道（如果指定）
        if (channel) {
          message.channel = channel
        }

        // 更新页脚
        if (this.options.footer) {
          const firstAttachment = message.attachments as any[]
          if (firstAttachment && firstAttachment[0]) {
            firstAttachment[0].footer = this.options.footer
          }
        }

        // 发送到 Slack
        const response = await fetch(this.config.webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(message),
        })

        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(`Slack webhook failed: ${response.status} ${errorText}`)
        }
      })

      // 发送成功
      this.stats.sent++
      result.success = true
      result.channel = channel
    } catch (error) {
      // 发送失败
      this.stats.failed++
      result.error = error instanceof Error ? error.message : String(error)

      console.error(`[EnhancedSlackChannel] Failed to send alert ${alert.id}:`, error)
    }

    result.duration = Date.now() - startTime
    return result
  }

  /**
   * 测试 webhook 连通性
   */
  async test(): Promise<boolean> {
    try {
      const testMessage = {
        username: this.config.username || 'Performance Alerter',
        icon_emoji: ':white_check_mark:',
        text: ':white_check_mark: *Slack webhook test successful!*',
        attachments: [
          {
            color: '#22c55e',
            title: 'Performance Alerting System',
            text: 'Your Slack webhook is properly configured.',
            footer: 'Test Message',
            ts: Math.floor(Date.now() / 1000),
          },
        ],
      }

      const response = await fetch(this.config.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testMessage),
      })

      if (!response.ok) {
        console.error('[EnhancedSlackChannel] Webhook test failed:', response.status)
        return false
      }

      return true
    } catch (error) {
      console.error('[EnhancedSlackChannel] Webhook test error:', error)
      return false
    }
  }

  /**
   * 生成节流键
   */
  private generateThrottleKey(alert: PerformanceAlert): string {
    const parts = [
      alert.level,
      alert.source,
      alert.metric || 'default',
    ]
    return parts.join(':')
  }

  /**
   * 更新选项
   */
  updateOptions(options: Partial<SlackAlertOptions>): void {
    this.options = { ...this.options, ...options }
  }

  /**
   * 获取当前选项
   */
  getOptions(): SlackAlertOptions {
    return { ...this.options }
  }

  /**
   * 启用/禁用渠道
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled
  }

  /**
   * 获取统计信息
   */
  getStats(): typeof this.stats {
    return { ...this.stats }
  }

  /**
   * 重置统计
   */
  resetStats(): void {
    this.stats = {
      sent: 0,
      failed: 0,
      throttled: 0,
      totalAttempts: 0,
    }
  }

  /**
   * 获取级别路由器
   */
  getLevelRouter(): LevelRouter {
    return this.levelRouter
  }

  /**
   * 重置节流状态
   */
  resetThrottler(key?: string): void {
    if (key) {
      this.throttler.reset(key)
    } else {
      this.throttler.resetAll()
    }
  }

  /**
   * 销毁渠道
   */
  destroy(): void {
    this.throttler.destroy()
    for (const throttler of this.levelThrottlers.values()) {
      throttler.destroy()
    }
    this.levelThrottlers.clear()
  }
}

// ========================================
// 默认导出
// ========================================

export default EnhancedSlackChannel
