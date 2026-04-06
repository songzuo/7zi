// @ts-nocheck
/**
 * Performance Alert Manager
 * 性能告警管理器 - 支持阈值触发
 *
 * 功能：
 * - 基于阈值的告警触发
 * - 告警级别管理（info, warning, critical）
 * - 告警静默期
 * - 告警历史记录
 * - 多渠道告警通知
 */

import type { PerformanceAlert } from './performance.monitor'
import { performanceCollector } from './performance.monitor'
import { ALERT_CONFIG } from './performance.config'

// ============================================
// 类型定义
// ============================================

export interface AlertRule {
  /** 规则名称 */
  name: string
  /** 指标名称 */
  metricName: string
  /** 阈值 */
  threshold: number
  /** 比较方式 */
  comparison: 'gt' | 'gte' | 'lt' | 'lte' | 'eq'
  /** 告警级别 */
  level: 'info' | 'warning' | 'critical'
  /** 持续时间（毫秒），持续超过阈值才触发 */
  duration?: number
  /** 静默期（毫秒） */
  silencePeriod?: number
  /** 是否启用 */
  enabled: boolean
  /** 自定义消息模板 */
  messageTemplate?: string
}

export interface ActiveAlert {
  /** 告警 ID */
  id: string
  /** 规则 */
  rule: AlertRule
  /** 当前值 */
  currentValue: number
  /** 触发时间 */
  triggeredAt: number
  /** 上次通知时间 */
  lastNotifiedAt?: number
  /** 是否已确认 */
  acknowledged: boolean
  /** 确认人 */
  acknowledgedBy?: string
  /** 确认时间 */
  acknowledgedAt?: number
}

export interface AlertNotification {
  alert: ActiveAlert
  channels: Array<'console' | 'sentry' | 'slack' | 'email' | 'webhook'>
  timestamp: number
}

type AlertCallback = (alert: ActiveAlert) => void

// ============================================
// 告警管理器
// ============================================

class PerformanceAlertManager {
  private static instance: PerformanceAlertManager

  /** 告警规则 */
  private rules: Map<string, AlertRule> = new Map()

  /** 活跃告警 */
  private activeAlerts: Map<string, ActiveAlert> = new Map()

  /** 告警历史 */
  private alertHistory: ActiveAlert[] = []

  /** 静默期追踪 */
  private silenceUntil: Map<string, number> = new Map()

  /** 回调函数 */
  private callbacks: AlertCallback[] = []

  /** 通知队列 */
  private notificationQueue: AlertNotification[] = []

  /** 通知处理定时器 */
  private notificationTimer: NodeJS.Timeout | null = null

  private constructor() {
    this.initializeDefaultRules()
  }

  /**
   * 获取单例实例
   */
  static getInstance(): PerformanceAlertManager {
    if (!PerformanceAlertManager.instance) {
      PerformanceAlertManager.instance = new PerformanceAlertManager()
    }
    return PerformanceAlertManager.instance
  }

  /**
   * 初始化默认规则
   */
  private initializeDefaultRules() {
    // Core Web Vitals 告警规则
    this.addRule({
      name: 'LCP Critical',
      metricName: 'LCP',
      threshold: 4000,
      comparison: 'gt',
      level: 'critical',
      silencePeriod: ALERT_CONFIG.rules.silencePeriod.critical,
      enabled: true,
    })

    this.addRule({
      name: 'LCP Warning',
      metricName: 'LCP',
      threshold: 2500,
      comparison: 'gt',
      level: 'warning',
      silencePeriod: ALERT_CONFIG.rules.silencePeriod.warning,
      enabled: true,
    })

    this.addRule({
      name: 'CLS Critical',
      metricName: 'CLS',
      threshold: 0.25,
      comparison: 'gt',
      level: 'critical',
      silencePeriod: ALERT_CONFIG.rules.silencePeriod.critical,
      enabled: true,
    })

    this.addRule({
      name: 'CLS Warning',
      metricName: 'CLS',
      threshold: 0.1,
      comparison: 'gt',
      level: 'warning',
      silencePeriod: ALERT_CONFIG.rules.silencePeriod.warning,
      enabled: true,
    })

    this.addRule({
      name: 'INP Critical',
      metricName: 'INP',
      threshold: 500,
      comparison: 'gt',
      level: 'critical',
      silencePeriod: ALERT_CONFIG.rules.silencePeriod.critical,
      enabled: true,
    })

    this.addRule({
      name: 'INP Warning',
      metricName: 'INP',
      threshold: 200,
      comparison: 'gt',
      level: 'warning',
      silencePeriod: ALERT_CONFIG.rules.silencePeriod.warning,
      enabled: true,
    })

    this.addRule({
      name: 'TTFB Warning',
      metricName: 'TTFB',
      threshold: 800,
      comparison: 'gt',
      level: 'warning',
      silencePeriod: ALERT_CONFIG.rules.silencePeriod.warning,
      enabled: true,
    })

    // 自定义指标告警规则
    this.addRule({
      name: 'Memory Critical',
      metricName: 'heapSize',
      threshold: 100,
      comparison: 'gt',
      level: 'critical',
      silencePeriod: ALERT_CONFIG.rules.silencePeriod.critical,
      enabled: true,
    })

    this.addRule({
      name: 'Memory Warning',
      metricName: 'heapSize',
      threshold: 50,
      comparison: 'gt',
      level: 'warning',
      silencePeriod: ALERT_CONFIG.rules.silencePeriod.warning,
      enabled: true,
    })

    this.addRule({
      name: 'Long Task Critical',
      metricName: 'longTask',
      threshold: 300,
      comparison: 'gt',
      level: 'critical',
      silencePeriod: ALERT_CONFIG.rules.silencePeriod.critical,
      enabled: true,
    })

    this.addRule({
      name: 'Long Task Warning',
      metricName: 'longTask',
      threshold: 100,
      comparison: 'gt',
      level: 'warning',
      silencePeriod: ALERT_CONFIG.rules.silencePeriod.warning,
      enabled: true,
    })
  }

  /**
   * 初始化管理器
   */
  initialize() {
    // 监听性能指标
    performanceCollector.onMetric(metric => {
      this.checkRules(metric.name, metric.value, metric.route)
    })

    // 监听自定义指标
    performanceCollector.onAlert(alert => {
      // 额外的自定义处理
    })

    // 启动通知处理
    this.startNotificationProcessor()

    console.log('[AlertManager] Initialized with default rules')
  }

  /**
   * 添加告警规则
   */
  addRule(rule: AlertRule): void {
    const ruleId = this.generateRuleId(rule)
    this.rules.set(ruleId, rule)
  }

  /**
   * 更新告警规则
   */
  updateRule(ruleId: string, updates: Partial<AlertRule>): boolean {
    const rule = this.rules.get(ruleId)
    if (!rule) return false

    this.rules.set(ruleId, { ...rule, ...updates })
    return true
  }

  /**
   * 删除告警规则
   */
  deleteRule(ruleId: string): boolean {
    return this.rules.delete(ruleId)
  }

  /**
   * 获取所有规则
   */
  getRules(): AlertRule[] {
    return Array.from(this.rules.values())
  }

  /**
   * 检查规则
   */
  private checkRules(metricName: string, value: number, route?: string): void {
    this.rules.forEach((rule, ruleId) => {
      if (!rule.enabled) return
      if (rule.metricName !== metricName) return

      // 检查是否在静默期
      if (this.isSilenced(ruleId)) return

      // 比较阈值
      const triggered = this.compareValue(value, rule.threshold, rule.comparison)

      if (triggered) {
        this.triggerAlert(ruleId, value, route)
      }
    })
  }

  /**
   * 比较值
   */
  private compareValue(value: number, threshold: number, comparison: AlertRule['comparison']): boolean {
    switch (comparison) {
      case 'gt':
        return value > threshold
      case 'gte':
        return value >= threshold
      case 'lt':
        return value < threshold
      case 'lte':
        return value <= threshold
      case 'eq':
        return value === threshold
      default:
        return false
    }
  }

  /**
   * 检查是否在静默期
   */
  private isSilenced(ruleId: string): boolean {
    const silenceUntilTime = this.silenceUntil.get(ruleId)
    return silenceUntilTime !== undefined && Date.now() < silenceUntilTime
  }

  /**
   * 触发告警
   */
  private triggerAlert(ruleId: string, value: number, route?: string): void {
    const rule = this.rules.get(ruleId)
    if (!rule) return

    // 检查是否已存在活跃告警
    const existingAlert = this.activeAlerts.get(ruleId)

    if (existingAlert) {
      // 更新现有告警
      existingAlert.currentValue = value
      existingAlert.lastNotifiedAt = Date.now()

      // 检查是否需要升级
      if (rule.level === 'warning' && value > rule.threshold * 1.5) {
        // 可以考虑升级为 critical
      }
    } else {
      // 创建新告警
      const alert: ActiveAlert = {
        id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        rule,
        currentValue: value,
        triggeredAt: Date.now(),
        acknowledged: false,
      }

      this.activeAlerts.set(ruleId, alert)
      this.alertHistory.push(alert)

      // 设置静默期
      if (rule.silencePeriod) {
        this.silenceUntil.set(ruleId, Date.now() + rule.silencePeriod)
      }

      // 通知回调
      this.notifyCallbacks(alert)

      // 加入通知队列
      this.queueNotification(alert)

      // 输出到控制台
      this.logAlert(alert)
    }

    // 限制历史大小
    if (this.alertHistory.length > 100) {
      this.alertHistory.shift()
    }
  }

  /**
   * 记录告警
   */
  private logAlert(alert: ActiveAlert): void {
    const emoji = alert.rule.level === 'critical' ? '🚨' : '⚠️'
    const message = alert.rule.messageTemplate || `${alert.rule.name}: ${alert.currentValue}`

    if (alert.rule.level === 'critical') {
      console.error(`[AlertManager] ${emoji} ${message}`, {
        rule: alert.rule.name,
        value: alert.currentValue,
        threshold: alert.rule.threshold,
        duration: Date.now() - alert.triggeredAt,
      })
    } else {
      console.warn(`[AlertManager] ${emoji} ${message}`, {
        rule: alert.rule.name,
        value: alert.currentValue,
        threshold: alert.rule.threshold,
      })
    }
  }

  /**
   * 加入通知队列
   */
  private queueNotification(alert: ActiveAlert): void {
    const channels: AlertNotification['channels'] = []

    // 根据配置决定通知渠道
    if (ALERT_CONFIG.channels.console.enabled) {
      channels.push('console')
    }

    if (ALERT_CONFIG.channels.sentry.enabled && alert.rule.level !== 'info') {
      channels.push('sentry')
    }

    if (ALERT_CONFIG.channels.slack.enabled && alert.rule.level === 'critical') {
      channels.push('slack')
    }

    this.notificationQueue.push({
      alert,
      channels,
      timestamp: Date.now(),
    })
  }

  /**
   * 启动通知处理器
   */
  private startNotificationProcessor(): void {
    if (this.notificationTimer) return

    this.notificationTimer = setInterval(() => {
      this.processNotifications()
    }, 5000) // 每 5 秒处理一次
  }

  /**
   * 处理通知队列
   */
  private processNotifications(): void {
    if (this.notificationQueue.length === 0) return

    const notifications = this.notificationQueue.splice(0, 10) // 每次处理最多 10 个

    notifications.forEach(notification => {
      const { alert, channels, timestamp } = notification

      channels.forEach(channel => {
        this.sendNotification(channel, alert, timestamp)
      })
    })
  }

  /**
   * 发送通知
   */
  private sendNotification(
    channel: 'console' | 'sentry' | 'slack' | 'email' | 'webhook',
    alert: ActiveAlert,
    timestamp: number
  ): void {
    // 这里可以实现具体的通知逻辑
    // console 已经上面处理了
    // Sentry、Slack、Email 等需要额外的集成
  }

  /**
   * 确认告警
   */
  acknowledgeAlert(alertId: string, acknowledgedBy: string): boolean {
    let found = false

    this.activeAlerts.forEach(alert => {
      if (alert.id === alertId) {
        alert.acknowledged = true
        alert.acknowledgedBy = acknowledgedBy
        alert.acknowledgedAt = Date.now()
        found = true
      }
    })

    return found
  }

  /**
   * 解除告警
   */
  resolveAlert(alertId: string): boolean {
    let found = false

    this.activeAlerts.forEach((alert, ruleId) => {
      if (alert.id === alertId) {
        this.activeAlerts.delete(ruleId)
        found = true
      }
    })

    return found
  }

  /**
   * 静默规则
   */
  silenceRule(ruleId: string, durationMs: number): void {
    this.silenceUntil.set(ruleId, Date.now() + durationMs)
  }

  /**
   * 获取活跃告警
   */
  getActiveAlerts(): ActiveAlert[] {
    return Array.from(this.activeAlerts.values())
  }

  /**
   * 获取告警历史
   */
  getAlertHistory(count: number = 50): ActiveAlert[] {
    return this.alertHistory.slice(-count).reverse()
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    totalAlerts: number
    activeAlerts: number
    criticalCount: number
    warningCount: number
    acknowledgedCount: number
  } {
    const active = this.getActiveAlerts()

    return {
      totalAlerts: this.alertHistory.length,
      activeAlerts: active.length,
      criticalCount: active.filter(a => a.rule.level === 'critical').length,
      warningCount: active.filter(a => a.rule.level === 'warning').length,
      acknowledgedCount: active.filter(a => a.acknowledged).length,
    }
  }

  /**
   * 注册回调
   */
  onAlert(callback: AlertCallback): () => void {
    this.callbacks.push(callback)

    return () => {
      this.callbacks = this.callbacks.filter(cb => cb !== callback)
    }
  }

  /**
   * 通知回调
   */
  private notifyCallbacks(alert: ActiveAlert): void {
    this.callbacks.forEach(callback => {
      try {
        callback(alert)
      } catch (error) {
        console.error('[AlertManager] Callback error:', error)
      }
    })
  }

  /**
   * 生成规则 ID
   */
  private generateRuleId(rule: AlertRule): string {
    return `${rule.metricName}_${rule.level}_${rule.threshold}`
  }

  /**
   * 销毁管理器
   */
  destroy(): void {
    if (this.notificationTimer) {
      clearInterval(this.notificationTimer)
    }

    this.activeAlerts.clear()
    this.alertHistory = []
    this.callbacks = []
    this.notificationQueue = []

    console.log('[AlertManager] Destroyed')
  }
}

/**
 * 导出单例
 */
export const alertManager = PerformanceAlertManager.getInstance()

export default PerformanceAlertManager
