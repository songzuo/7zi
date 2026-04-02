/**
 * Performance Budget and Alarm System
 * 性能预算和告警系统
 */

import { monitor } from '../monitoring'
import { WebVitalsMetrics } from './web-vitals'
import { CustomMetrics } from './custom-metrics'

/**
 * 性能预算配置
 */
export interface PerformanceBudget {
  // Core Web Vitals
  webVitals: {
    LCP: { threshold: number; weight: number }
    CLS: { threshold: number; weight: number }
    INP: { threshold: number; weight: number }
  }

  // Custom Metrics
  customMetrics: {
    pageLoadTime: { threshold: number; weight: number }
    apiAverageResponseTime: { threshold: number; weight: number }
    apiErrorRate: { threshold: number; weight: number }
    memoryUsagePercent: { threshold: number; weight: number }
    wsLatency: { threshold: number; weight: number }
  }

  // Resource Budget
  resources: {
    totalSize: number // 总大小 (bytes)
    scriptSize: number
    stylesheetSize: number
    imageSize: number
  }
}

/**
 * 告警规则
 */
export interface AlarmRule {
  id: string
  name: string
  description: string
  metric: string // 指标名称
  condition: 'greater' | 'less' | 'equals' | 'greater_equal' | 'less_equal'
  threshold: number
  windowMs: number // 时间窗口
  severity: 'low' | 'medium' | 'high' | 'critical'
  enabled: boolean
  cooldownMs: number // 冷却时间 (ms)
}

/**
 * 告警事件
 */
export interface AlarmNotification {
  id: string
  ruleId: string
  ruleName: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  metric: string
  currentValue: number
  threshold: number
  condition: string
  message: string
  timestamp: number
  acknowledged: boolean
  resolved: boolean
  resolvedAt?: number
}

/**
 * 性能预算报告
 */
export interface PerformanceBudgetReport {
  overallScore: number // 0-100
  webVitalsScore: number
  customMetricsScore: number
  resourceScore: number
  status: 'pass' | 'warning' | 'fail'
  violations: BudgetViolation[]
  recommendations: string[]
}

/**
 * 预算违规
 */
export interface BudgetViolation {
  metric: string
  currentValue: number
  threshold: number
  severity: 'low' | 'medium' | 'high'
  impact: string
}

/**
 * 性能预算管理器
 */
export class PerformanceBudgetManager {
  private budget: PerformanceBudget
  private alarms: Map<string, AlarmRule> = new Map()
  private activeNotifications: Map<string, AlarmNotification> = new Map()
  private lastTriggerTimes: Map<string, number> = new Map()
  private checkInterval?: NodeJS.Timeout

  constructor(budget: Partial<PerformanceBudget> = {}) {
    this.budget = {
      webVitals: {
        LCP: { threshold: 2500, weight: 1.0 },
        CLS: { threshold: 0.1, weight: 1.0 },
        INP: { threshold: 200, weight: 1.0 },
      },
      customMetrics: {
        pageLoadTime: { threshold: 3000, weight: 1.0 },
        apiAverageResponseTime: { threshold: 1000, weight: 1.0 },
        apiErrorRate: { threshold: 0.05, weight: 1.0 }, // 5%
        memoryUsagePercent: { threshold: 85, weight: 1.0 },
        wsLatency: { threshold: 100, weight: 1.0 },
      },
      resources: {
        totalSize: 2 * 1024 * 1024, // 2MB
        scriptSize: 500 * 1024, // 500KB
        stylesheetSize: 200 * 1024, // 200KB
        imageSize: 1024 * 1024, // 1MB
      },
      ...budget,
    }

    // 初始化默认告警规则
    this.initDefaultAlarms()
  }

  /**
   * 初始化默认告警规则
   */
  private initDefaultAlarms(): void {
    const defaultRules: AlarmRule[] = [
      {
        id: 'lcp-exceeded',
        name: 'LCP Exceeded',
        description: 'Largest Contentful Paint exceeded threshold',
        metric: 'LCP',
        condition: 'greater',
        threshold: this.budget.webVitals.LCP.threshold,
        windowMs: 60000, // 1 minute
        severity: 'high',
        enabled: true,
        cooldownMs: 300000, // 5 minutes
      },
      {
        id: 'cls-exceeded',
        name: 'CLS Exceeded',
        description: 'Cumulative Layout Shift exceeded threshold',
        metric: 'CLS',
        condition: 'greater',
        threshold: this.budget.webVitals.CLS.threshold,
        windowMs: 60000,
        severity: 'high',
        enabled: true,
        cooldownMs: 300000,
      },
      {
        id: 'inp-exceeded',
        name: 'INP Exceeded',
        description: 'Interaction to Next Paint exceeded threshold',
        metric: 'INP',
        condition: 'greater',
        threshold: this.budget.webVitals.INP.threshold,
        windowMs: 60000,
        severity: 'high',
        enabled: true,
        cooldownMs: 300000,
      },
      {
        id: 'api-error-rate-high',
        name: 'High API Error Rate',
        description: 'API error rate exceeded threshold',
        metric: 'apiErrorRate',
        condition: 'greater',
        threshold: this.budget.customMetrics.apiErrorRate.threshold,
        windowMs: 300000, // 5 minutes
        severity: 'critical',
        enabled: true,
        cooldownMs: 180000, // 3 minutes
      },
      {
        id: 'memory-usage-high',
        name: 'High Memory Usage',
        description: 'Memory usage exceeded threshold',
        metric: 'memoryUsagePercent',
        condition: 'greater',
        threshold: this.budget.customMetrics.memoryUsagePercent.threshold,
        windowMs: 30000, // 30 seconds
        severity: 'high',
        enabled: true,
        cooldownMs: 120000, // 2 minutes
      },
    ]

    defaultRules.forEach(rule => this.addAlarmRule(rule))
  }

  /**
   * 添加告警规则
   */
  addAlarmRule(rule: AlarmRule): void {
    this.alarms.set(rule.id, rule)
  }

  /**
   * 删除告警规则
   */
  removeAlarmRule(ruleId: string): void {
    this.alarms.delete(ruleId)
  }

  /**
   * 启用/禁用告警规则
   */
  toggleAlarmRule(ruleId: string, enabled: boolean): void {
    const rule = this.alarms.get(ruleId)
    if (rule) {
      rule.enabled = enabled
    }
  }

  /**
   * 检查单个指标是否违反预算
   */
  private checkThreshold(
    metricName: string,
    currentValue: number,
    threshold: number,
    condition: AlarmRule['condition']
  ): boolean {
    switch (condition) {
      case 'greater':
        return currentValue > threshold
      case 'less':
        return currentValue < threshold
      case 'equals':
        return currentValue === threshold
      case 'greater_equal':
        return currentValue >= threshold
      case 'less_equal':
        return currentValue <= threshold
      default:
        return false
    }
  }

  /**
   * 检查并触发告警
   */
  async checkAlarms(
    webVitals: WebVitalsMetrics,
    customMetrics: CustomMetrics
  ): Promise<AlarmNotification[]> {
    const triggeredNotifications: AlarmNotification[] = []
    const now = Date.now()

    // 合并所有指标
    const allMetrics: Record<string, number> = {
      ...webVitals,
      ...customMetrics,
    }

    // 检查所有启用的告警规则
    const rulesArray = Array.from(this.alarms.values())
    for (const rule of rulesArray) {
      if (!rule.enabled) continue

      const currentValue = allMetrics[rule.metric]
      if (currentValue === undefined) continue

      // 检查冷却时间
      const lastTriggerTime = this.lastTriggerTimes.get(rule.id) || 0
      if (now - lastTriggerTime < rule.cooldownMs) continue

      // 检查是否触发条件
      if (this.checkThreshold(rule.metric, currentValue, rule.threshold, rule.condition)) {
        const notification: AlarmNotification = {
          id: `${rule.id}-${now}`,
          ruleId: rule.id,
          ruleName: rule.name,
          severity: rule.severity,
          metric: rule.metric,
          currentValue,
          threshold: rule.threshold,
          condition: rule.condition,
          message: `${rule.name}: ${rule.metric} = ${currentValue.toFixed(2)} (threshold: ${rule.threshold})`,
          timestamp: now,
          acknowledged: false,
          resolved: false,
        }

        this.activeNotifications.set(notification.id, notification)
        triggeredNotifications.push(notification)

        // 记录触发时间
        this.lastTriggerTimes.set(rule.id, now)

        // 发送到监控系统
        await monitor.trackError('PerformanceBudgetViolation', notification.message, undefined, {
          ruleId: rule.id,
          ruleName: rule.name,
          severity: rule.severity,
          currentValue,
          threshold: rule.threshold,
        })
      }
    }

    return triggeredNotifications
  }

  /**
   * 确认告警
   */
  acknowledgeAlarm(notificationId: string): void {
    const notification = this.activeNotifications.get(notificationId)
    if (notification) {
      notification.acknowledged = true
    }
  }

  /**
   * 解决告警
   */
  resolveAlarm(notificationId: string): void {
    const notification = this.activeNotifications.get(notificationId)
    if (notification) {
      notification.resolved = true
      notification.resolvedAt = Date.now()
    }
  }

  /**
   * 获取活跃告警
   */
  getActiveNotifications(): AlarmNotification[] {
    return Array.from(this.activeNotifications.values())
      .filter(n => !n.resolved)
      .sort((a, b) => b.timestamp - a.timestamp)
  }

  /**
   * 获取所有告警
   */
  getAllNotifications(): AlarmNotification[] {
    return Array.from(this.activeNotifications.values()).sort((a, b) => b.timestamp - a.timestamp)
  }

  /**
   * 计算性能预算评分
   */
  calculateBudgetReport(
    webVitals: WebVitalsMetrics,
    customMetrics: CustomMetrics
  ): PerformanceBudgetReport {
    const violations: BudgetViolation[] = []
    const recommendations: string[] = []

    // Web Vitals 评分
    let webVitalsScore = 0
    let webVitalsCount = 0

    for (const [name, config] of Object.entries(this.budget.webVitals)) {
      const value = webVitals[name as keyof WebVitalsMetrics]
      if (value !== undefined) {
        const violation = this.checkViolation(
          name,
          value,
          config.threshold,
          'greater',
          config.weight
        )
        if (violation) {
          violations.push(violation)
        } else {
          webVitalsScore += 100 * config.weight
        }
        webVitalsCount++
      }
    }

    if (webVitalsCount > 0) {
      webVitalsScore = webVitalsScore / webVitalsCount
    }

    // 自定义指标评分
    let customMetricsScore = 0
    let customMetricsCount = 0

    for (const [name, config] of Object.entries(this.budget.customMetrics)) {
      const value = customMetrics[name as keyof CustomMetrics]
      if (value !== undefined) {
        const violation = this.checkViolation(
          name,
          value,
          config.threshold,
          name === 'apiSuccessRate' ? 'less' : 'greater',
          config.weight
        )
        if (violation) {
          violations.push(violation)
        } else {
          customMetricsScore += 100 * config.weight
        }
        customMetricsCount++
      }
    }

    if (customMetricsCount > 0) {
      customMetricsScore = customMetricsScore / customMetricsCount
    }

    // 资源评分 (这里简化处理，实际应检查资源大小)
    const resourceScore = 100

    // 总体评分
    const overallScore = (webVitalsScore + customMetricsScore + resourceScore) / 3

    // 状态判断
    let status: 'pass' | 'warning' | 'fail' = 'pass'
    if (overallScore < 60) {
      status = 'fail'
    } else if (overallScore < 80) {
      status = 'warning'
    }

    // 生成建议
    violations.forEach(v => {
      recommendations.push(this.getRecommendation(v.metric, v.currentValue, v.threshold))
    })

    return {
      overallScore,
      webVitalsScore,
      customMetricsScore,
      resourceScore,
      status,
      violations,
      recommendations,
    }
  }

  /**
   * 检查是否违反预算
   */
  private checkViolation(
    metric: string,
    currentValue: number,
    threshold: number,
    condition: 'greater' | 'less',
    weight: number
  ): BudgetViolation | null {
    const isViolation =
      condition === 'greater' ? currentValue > threshold : currentValue < threshold

    if (!isViolation) return null

    let severity: 'low' | 'medium' | 'high'
    const ratio = currentValue / threshold

    if (ratio > 2) {
      severity = 'high'
    } else if (ratio > 1.5) {
      severity = 'medium'
    } else {
      severity = 'low'
    }

    return {
      metric,
      currentValue,
      threshold,
      severity,
      impact: this.getImpact(metric, severity),
    }
  }

  /**
   * 获取影响描述
   */
  private getImpact(metric: string, severity: string): string {
    const impactMap: Record<string, string> = {
      LCP: 'Affects perceived load speed',
      FID: 'Affects interactivity',
      CLS: 'Affects visual stability',
      INP: 'Affects responsiveness',
      pageLoadTime: 'Affects user engagement',
      apiAverageResponseTime: 'Affects overall performance',
      apiErrorRate: 'Affects reliability',
      memoryUsagePercent: 'Affects stability',
      wsLatency: 'Affects real-time features',
    }

    return impactMap[metric] || 'Performance impact'
  }

  /**
   * 获取优化建议
   */
  private getRecommendation(metric: string, current: number, threshold: number): string {
    const recommendations: Record<string, string> = {
      LCP: `Optimize largest content paint. Current: ${current.toFixed(0)}ms, Target: ${threshold}ms. Consider: image optimization, code splitting, lazy loading.`,
      FID: `Reduce input delay. Current: ${current.toFixed(0)}ms, Target: ${threshold}ms. Consider: reducing JavaScript execution time, web workers.`,
      CLS: `Minimize layout shift. Current: ${current.toFixed(2)}, Target: ${threshold}. Consider: reserving space for dynamic content, avoid inserting content above existing content.`,
      INP: `Improve interaction responsiveness. Current: ${current.toFixed(0)}ms, Target: ${threshold}ms. Consider: reducing JavaScript execution, optimizing event handlers.`,
      pageLoadTime: `Reduce page load time. Current: ${current.toFixed(0)}ms, Target: ${threshold}ms. Consider: code splitting, lazy loading, CDN usage.`,
      apiAverageResponseTime: `Optimize API response time. Current: ${current.toFixed(0)}ms, Target: ${threshold}ms. Consider: caching, database optimization, CDN.`,
      apiErrorRate: `Reduce API error rate. Current: ${(current * 100).toFixed(1)}%, Target: ${(threshold * 100).toFixed(1)}%. Consider: error handling, retry logic, monitoring.`,
      memoryUsagePercent: `Reduce memory usage. Current: ${current.toFixed(1)}%, Target: ${threshold}%. Consider: memory leak detection, optimizing data structures, cleanup.`,
      wsLatency: `Reduce WebSocket latency. Current: ${current.toFixed(0)}ms, Target: ${threshold}ms. Consider: server optimization, network improvements.`,
    }

    return recommendations[metric] || `Optimize ${metric}`
  }

  /**
   * 启动定期检查
   */
  startPeriodicCheck(
    getWebVitals: () => WebVitalsMetrics,
    getCustomMetrics: () => CustomMetrics,
    intervalMs: number = 30000
  ): void {
    this.stopPeriodicCheck()

    this.checkInterval = setInterval(async () => {
      await this.checkAlarms(getWebVitals(), getCustomMetrics())
    }, intervalMs) as NodeJS.Timeout
  }

  /**
   * 停止定期检查
   */
  stopPeriodicCheck(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
      this.checkInterval = undefined
    }
  }

  /**
   * 更新预算配置
   */
  updateBudget(budget: Partial<PerformanceBudget>): void {
    this.budget = { ...this.budget, ...budget }
  }

  /**
   * 获取预算配置
   */
  getBudget(): PerformanceBudget {
    return { ...this.budget }
  }

  /**
   * 清除所有告警
   */
  clearAllNotifications(): void {
    this.activeNotifications.clear()
    this.lastTriggerTimes.clear()
  }
}

// 默认实例
export const budgetManager = new PerformanceBudgetManager()

/**
 * 初始化性能预算管理 (便捷函数)
 */
export function initPerformanceBudget(
  budget?: Partial<PerformanceBudget>
): PerformanceBudgetManager {
  if (budget) {
    budgetManager.updateBudget(budget)
  }
  return budgetManager
}
