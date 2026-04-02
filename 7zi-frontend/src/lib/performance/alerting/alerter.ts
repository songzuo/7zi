/**
 * Performance Alerter
 * 性能告警系统
 *
 * Implements:
 * - Multi-level alerts (info, warning, error, critical)
 * - Multi-channel notifications (email, slack, dashboard, webhook, telegram)
 * - Alert suppression (avoid alert storms)
 * - Alert aggregation (reduce duplicates)
 */

import { v4 as uuidv4 } from 'uuid'
import {
  PerformanceAlert,
  AlertSeverity,
  AlertChannel as AlertChannelInterface,
  AlertRule,
  AlertingConfig,
  AlertStats,
  AlertChannelType,
  SuppressionConfig,
} from './types'
import {
  EmailChannel,
  SlackChannel,
  DashboardChannel,
  WebhookChannel,
  TelegramChannel,
} from './channels'

export const DEFAULT_ALERTING_CONFIG: AlertingConfig = {
  enabled: true,
  defaultChannels: ['dashboard'],
  channels: [
    {
      type: 'dashboard',
      enabled: true,
      config: {
        showToast: true,
        playSound: false,
      },
    },
  ],
  rules: [
    {
      id: 'default-response-time',
      name: 'High Response Time',
      description: 'Alert when average response time exceeds threshold',
      enabled: true,
      metric: 'responseTime',
      condition: { operator: '>', value: 2000 },
      level: 'warning',
      channels: ['dashboard'],
      cooldown: 300,
      aggregation: { enabled: true, window: 300, maxAlerts: 5 },
    },
    {
      id: 'default-error-rate',
      name: 'High Error Rate',
      description: 'Alert when error rate exceeds threshold',
      enabled: true,
      metric: 'errorRate',
      condition: { operator: '>', value: 0.05 },
      level: 'error',
      channels: ['dashboard'],
      cooldown: 300,
      aggregation: { enabled: true, window: 300, maxAlerts: 5 },
    },
  ],
  suppression: {
    windowMs: 60000, // 1 minute
    maxAlerts: 10,
    deduplicateBy: ['metric', 'severity'],
  },
  aggregation: {
    enabled: true,
    window: 300, // 5 minutes
  },
}

export class PerformanceAlerter {
  private config: AlertingConfig
  private alerts: PerformanceAlert[] = []
  private lastAlertTime: Map<string, number> = new Map()
  private alertCounts: Map<string, number> = new Map()
  private channels: Map<AlertChannelType, AlertChannelInterface> = new Map()
  private suppressionWindow: Map<string, PerformanceAlert[]> = new Map()

  constructor(config: Partial<AlertingConfig> = {}) {
    this.config = { ...DEFAULT_ALERTING_CONFIG, ...config }
    this.initializeChannels()
  }

  /**
   * Initialize alert channels
   * 初始化告警渠道
   */
  private initializeChannels(): void {
    // Dashboard channel (always available)
    this.channels.set(
      'dashboard',
      new DashboardChannel({
        showToast: true,
        playSound: false,
      })
    )

    // Initialize configured channels
    for (const channelConfig of this.config.channels) {
      if (!channelConfig.enabled) continue

      switch (channelConfig.type) {
        case 'email':
          if (channelConfig.config.recipients) {
            this.channels.set(
              'email',
              new EmailChannel({
                recipients: channelConfig.config.recipients,
                subject: channelConfig.config.subject,
              })
            )
          }
          break

        case 'slack':
          if (channelConfig.config.webhookUrl) {
            this.channels.set(
              'slack',
              new SlackChannel({
                webhookUrl: channelConfig.config.webhookUrl,
                channel: channelConfig.config.channel,
              })
            )
          }
          break

        case 'dashboard':
          // Already initialized
          break

        case 'webhook':
          if (channelConfig.config.url) {
            this.channels.set(
              'webhook',
              new WebhookChannel({
                url: channelConfig.config.url,
                method: channelConfig.config.method,
                headers: channelConfig.config.headers,
              })
            )
          }
          break

        case 'telegram':
          if (channelConfig.config.botToken && channelConfig.config.chatId) {
            this.channels.set(
              'telegram',
              new TelegramChannel({
                botToken: channelConfig.config.botToken,
                chatId: channelConfig.config.chatId,
              })
            )
          }
          break
      }
    }
  }

  /**
   * Send alert
   * 发送告警
   *
   * This is the main method for sending alerts. It handles:
   * 1. Alert suppression (to avoid alert storms)
   * 2. Alert aggregation (to reduce duplicates)
   * 3. Sending to multiple channels
   *
   * @param alert - The alert to send
   */
  async sendAlert(alert: PerformanceAlert): Promise<void> {
    if (!this.config.enabled) return

    // Check if alert should be suppressed
    if (await this.shouldSuppress(alert)) {
      alert.suppressed = true
      alert.suppressionReason = 'Alert suppressed due to suppression rules'
      this.alerts.push(alert)
      console.log(`[ALERTER] Alert suppressed: ${alert.metric} (${alert.severity})`)
      return
    }

    // Aggregate alert if needed
    const aggregated = this.aggregateAlert(alert)

    // Update last alert time and counts
    this.lastAlertTime.set(alert.metric, Date.now())

    // Get channels for this alert
    const channels = this.getChannelsForAlert(alert)

    // Send to all configured channels
    await Promise.all(
      channels.map(channelType => {
        const channel = this.channels.get(channelType)
        return channel ? channel.send(aggregated) : Promise.resolve()
      })
    )

    this.alerts.push(aggregated)
  }

  /**
   * Create and send alert
   * 创建并发送告警
   */
  async createAlert(options: {
    level: AlertSeverity
    title?: string
    message: string
    metric: string
    value: number
    threshold: number
    context?: Record<string, any>
  }): Promise<PerformanceAlert> {
    const severity = options.level
    const alert: PerformanceAlert = {
      id: uuidv4(),
      timestamp: Date.now(),
      severity,
      level: severity, // Set level as alias for compatibility
      title: options.title || `Alert: ${options.metric}`,
      message: options.message,
      metric: options.metric,
      value: options.value,
      threshold: options.threshold,
      context: options.context,
      acknowledged: false,
      resolved: false,
      suppressed: false,
    }

    await this.sendAlert(alert)
    return alert
  }

  /**
   * Check if alert should be suppressed
   * 检查是否应该抑制告警
   *
   * Suppression logic:
   * 1. Check cooldown time for the metric (only if rule exists)
   * 2. Check maximum active alerts limit
   * 3. Check deduplication by configured fields
   */
  async shouldSuppress(alert: PerformanceAlert): Promise<boolean> {
    const { windowMs, maxAlerts, deduplicateBy } = this.config.suppression
    const now = Date.now()

    // 1. Check cooldown time (only if rule exists for this metric)
    const rule = this.findRuleForMetric(alert.metric)
    if (rule) {
      const lastTime = this.lastAlertTime.get(alert.metric)
      const cooldownMs = rule.cooldown * 1000

      if (lastTime && now - lastTime < cooldownMs) {
        alert.suppressionReason = `Within cooldown period (${Math.round((now - lastTime) / 1000)}s < ${cooldownMs / 1000}s)`
        return true
      }
    }

    // 2. Check maximum active alerts in window
    const activeAlerts = this.alerts.filter(a => !a.resolved && now - a.timestamp < windowMs)
    if (activeAlerts.length >= maxAlerts) {
      alert.suppressionReason = `Max active alerts exceeded (${activeAlerts.length} >= ${maxAlerts})`
      return true
    }

    // 3. Check deduplication
    if (deduplicateBy && deduplicateBy.length > 0) {
      const deduplicationKey = this.getDeduplicationKey(alert, deduplicateBy)
      const windowAlerts = this.alerts.filter(a => now - a.timestamp < windowMs && !a.resolved)

      for (const existing of windowAlerts) {
        const existingKey = this.getDeduplicationKey(existing, deduplicateBy)
        if (existingKey === deduplicationKey) {
          alert.suppressionReason = `Duplicate alert in window (key: ${deduplicationKey})`
          return true
        }
      }
    }

    return false
  }

  /**
   * Aggregate alert
   * 聚合告警
   *
   * Aggregation combines multiple similar alerts into one to reduce noise.
   */
  aggregateAlert(alert: PerformanceAlert): PerformanceAlert {
    if (!this.config.aggregation.enabled) return alert

    const key = `${alert.metric}:${alert.severity}`
    const count = this.alertCounts.get(key) || 0
    this.alertCounts.set(key, count + 1)

    // If there are multiple similar alerts, update the message
    if (count > 0) {
      alert.message = `${alert.message} (${count + 1} occurrences in last ${
        this.config.aggregation.window / 60
      } minutes)`
    }

    return alert
  }

  /**
   * Get deduplication key for alert
   * 获取告警的去重键
   */
  private getDeduplicationKey(alert: PerformanceAlert, fields: string[]): string {
    const parts: string[] = []
    for (const field of fields) {
      switch (field) {
        case 'metric':
          parts.push(alert.metric)
          break
        case 'severity':
          parts.push(alert.severity)
          break
        case 'message':
          parts.push(alert.message)
          break
        case 'value':
          parts.push(alert.value.toString())
          break
        case 'threshold':
          parts.push(alert.threshold.toString())
          break
        default:
          parts.push((alert.context?.[field] || '').toString())
      }
    }
    return parts.join(':')
  }

  /**
   * Get channels for alert
   * 获取告警渠道
   */
  private getChannelsForAlert(alert: PerformanceAlert): AlertChannelType[] {
    const rule = this.findRuleForMetric(alert.metric)
    if (rule) {
      return rule.channels
    }
    return this.config.defaultChannels
  }

  /**
   * Find rule for metric
   * 查找指标规则
   */
  private findRuleForMetric(metric: string): AlertRule | undefined {
    return this.config.rules.find(r => r.metric === metric && r.enabled)
  }

  /**
   * Check metric against rules
   * 检查指标是否触发规则
   */
  async checkRules(metric: string, value: number): Promise<PerformanceAlert[]> {
    const triggeredAlerts: PerformanceAlert[] = []

    for (const rule of this.config.rules) {
      if (!rule.enabled || rule.metric !== metric) continue

      const { operator, value: threshold } = rule.condition
      let triggered = false

      switch (operator) {
        case '>':
          triggered = value > threshold
          break
        case '>=':
          triggered = value >= threshold
          break
        case '<':
          triggered = value < threshold
          break
        case '<=':
          triggered = value <= threshold
          break
        case '==':
          triggered = value === threshold
          break
        case '!=':
          triggered = value !== threshold
          break
      }

      if (triggered) {
        const alert = await this.createAlert({
          level: rule.level,
          title: rule.name,
          message: `${metric} is ${value.toFixed(2)}, threshold: ${threshold}`,
          metric,
          value,
          threshold,
        })
        triggeredAlerts.push(alert)
      }
    }

    return triggeredAlerts
  }

  /**
   * Add alert channel
   * 添加告警渠道
   */
  addChannel(channelType: AlertChannelType, channel: AlertChannelInterface): void {
    this.channels.set(channelType, channel)
  }

  /**
   * Add alert rule
   * 添加告警规则
   */
  addRule(rule: AlertRule): void {
    this.config.rules.push(rule)
  }

  /**
   * Update suppression config
   * 更新抑制配置
   */
  updateSuppressionConfig(config: Partial<SuppressionConfig>): void {
    this.config.suppression = { ...this.config.suppression, ...config }
  }

  /**
   * Get alerts
   * 获取告警列表
   */
  getAlerts(filter?: {
    level?: AlertSeverity
    metric?: string
    acknowledged?: boolean
    resolved?: boolean
    suppressed?: boolean
    startTime?: number
    endTime?: number
  }): PerformanceAlert[] {
    let filtered = [...this.alerts]

    if (filter) {
      if (filter.level) {
        filtered = filtered.filter(a => a.severity === filter.level)
      }
      if (filter.metric) {
        filtered = filtered.filter(a => a.metric === filter.metric)
      }
      if (filter.acknowledged !== undefined) {
        filtered = filtered.filter(a => a.acknowledged === filter.acknowledged)
      }
      if (filter.resolved !== undefined) {
        filtered = filtered.filter(a => a.resolved === filter.resolved)
      }
      if (filter.suppressed !== undefined) {
        filtered = filtered.filter(a => a.suppressed === filter.suppressed)
      }
      if (filter.startTime) {
        filtered = filtered.filter(a => a.timestamp >= filter.startTime!)
      }
      if (filter.endTime) {
        filtered = filtered.filter(a => a.timestamp <= filter.endTime!)
      }
    }

    return filtered.sort((a, b) => b.timestamp - a.timestamp)
  }

  /**
   * Acknowledge alert
   * 确认告警
   */
  acknowledgeAlert(alertId: string, acknowledgedBy: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId)
    if (alert) {
      alert.acknowledged = true
      alert.acknowledgedAt = Date.now()
      alert.acknowledgedBy = acknowledgedBy
      return true
    }
    return false
  }

  /**
   * Resolve alert
   * 解决告警
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId)
    if (alert) {
      alert.resolved = true
      alert.resolvedAt = Date.now()
      return true
    }
    return false
  }

  /**
   * Get alert statistics
   * 获取告警统计
   */
  getStats(timeWindowMs: number = 3600000): AlertStats {
    const now = Date.now()
    const recentAlerts = this.alerts.filter(a => now - a.timestamp < timeWindowMs)

    const alertsByLevel: Record<AlertSeverity, number> = {
      info: 0,
      warning: 0,
      error: 0,
      critical: 0,
    }

    const alertsByMetric: Record<string, number> = {}

    recentAlerts.forEach(a => {
      alertsByLevel[a.severity]++
      alertsByMetric[a.metric] = (alertsByMetric[a.metric] || 0) + 1
    })

    const acknowledgedCount = recentAlerts.filter(a => a.acknowledged).length
    const resolvedCount = recentAlerts.filter(a => a.resolved).length

    const avgResponseTime =
      acknowledgedCount > 0
        ? recentAlerts
            .filter(a => a.acknowledgedAt)
            .reduce((sum, a) => sum + (a.acknowledgedAt! - a.timestamp), 0) / acknowledgedCount
        : 0

    return {
      totalAlerts: recentAlerts.length,
      alertsByLevel,
      alertsByMetric,
      acknowledgedCount,
      resolvedCount,
      avgResponseTime,
    }
  }

  /**
   * Clear old alerts
   * 清理旧告警
   */
  clearOldAlerts(maxAgeMs: number = 7 * 24 * 3600000): number {
    const cutoff = Date.now() - maxAgeMs
    const originalLength = this.alerts.length
    this.alerts = this.alerts.filter(a => a.timestamp >= cutoff)
    return originalLength - this.alerts.length
  }

  /**
   * Update configuration
   * 更新配置
   */
  updateConfig(partialConfig: Partial<AlertingConfig>): void {
    this.config = { ...this.config, ...partialConfig }
    this.initializeChannels()
  }

  /**
   * Get current configuration
   * 获取当前配置
   */
  getConfig(): AlertingConfig {
    return { ...this.config }
  }

  /**
   * Reset alert state
   * 重置告警状态
   */
  reset(): void {
    this.alerts = []
    this.lastAlertTime.clear()
    this.alertCounts.clear()
  }
}

// Export singleton instance
export const performanceAlerter = new PerformanceAlerter()
