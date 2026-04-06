// @ts-nocheck
/**
 * Alert Rule Engine Module
 * 告警规则引擎 - 支持阈值、趋势、周期规则
 */

import type { AlertSeverity, AlertChannelType } from './index'

// ========================================
// Types
// ========================================

export interface MetricValue {
  value: number
  timestamp: number
}

export interface AlertRuleBase {
  id: string
  name: string
  description: string
  enabled: boolean
  severity: AlertSeverity
  channels: AlertChannelType[]
  tags?: string[]
  cooldownMs?: number // 告警冷却时间
  groupBy?: string[] // 用于分组
}

export interface ThresholdRule extends AlertRuleBase {
  type: 'threshold'
  metric: string
  operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'neq'
  threshold: number
}

export interface TrendRule extends AlertRuleBase {
  type: 'trend'
  metric: string
  direction: 'increasing' | 'decreasing' | 'volatile'
  windowMs: number // 趋势分析窗口
  sensitivity: number // 敏感度 (0-1)，越高越容易触发
  baselinePercentile?: number // 基线百分位 (默认50)
}

export interface PeriodicRule extends AlertRuleBase {
  type: 'periodic'
  metric: string
  condition: 'always' | 'above' | 'below' | 'changed'
  threshold?: number
  checkIntervalMs: number // 检查间隔
  consecutiveChecks?: number // 连续多少次满足条件才告警
}

export type AlertRule = ThresholdRule | TrendRule | PeriodicRule

// ========================================
// Operators
// ========================================

const OPERATORS = {
  gt: (a: number, b: number) => a > b,
  gte: (a: number, b: number) => a >= b,
  lt: (a: number, b: number) => a < b,
  lte: (a: number, b: number) => a <= b,
  eq: (a: number, b: number) => a === b,
  neq: (a: number, b: number) => a !== b,
}

// ========================================
// Alert Rule Engine
// ========================================

export interface RuleEvaluationResult {
  ruleId: string
  ruleName: string
  triggered: boolean
  severity: AlertSeverity
  message: string
  details: Record<string, unknown>
  value?: number
  threshold?: number
}

export class AlertRuleEngine {
  private rules: Map<string, AlertRule>
  private metricHistory: Map<string, MetricValue[]>
  private lastAlertTime: Map<string, number>
  private maxHistorySize: number

  constructor(maxHistorySize = 10000) {
    this.rules = new Map()
    this.metricHistory = new Map()
    this.lastAlertTime = new Map()
    this.maxHistorySize = maxHistorySize
  }

  /**
   * 注册规则
   */
  registerRule(rule: AlertRule): void {
    this.rules.set(rule.id, rule)
  }

  /**
   * 批量注册规则
   */
  registerRules(rules: AlertRule[]): void {
    for (const rule of rules) {
      this.registerRule(rule)
    }
  }

  /**
   * 移除规则
   */
  removeRule(ruleId: string): boolean {
    return this.rules.delete(ruleId)
  }

  /**
   * 获取规则
   */
  getRule(ruleId: string): AlertRule | undefined {
    return this.rules.get(ruleId)
  }

  /**
   * 获取所有规则
   */
  getAllRules(): AlertRule[] {
    return Array.from(this.rules.values())
  }

  /**
   * 获取启用规则
   */
  getEnabledRules(): AlertRule[] {
    return this.getAllRules().filter(rule => rule.enabled)
  }

  /**
   * 更新指标数据
   */
  updateMetric(name: string, value: number, timestamp?: number): void {
    const history = this.metricHistory.get(name) || []
    history.push({
      value,
      timestamp: timestamp || Date.now(),
    })

    // 限制历史大小
    if (history.length > this.maxHistorySize) {
      history.shift()
    }

    this.metricHistory.set(name, history)
  }

  /**
   * 批量更新指标
   */
  updateMetrics(metrics: Record<string, number>): void {
    for (const [name, value] of Object.entries(metrics)) {
      this.updateMetric(name, value)
    }
  }

  /**
   * 获取指标历史
   */
  getMetricHistory(name: string, windowMs?: number): MetricValue[] {
    const history = this.metricHistory.get(name) || []

    if (!windowMs) {
      return history
    }

    const cutoff = Date.now() - windowMs
    return history.filter(m => m.timestamp >= cutoff)
  }

  /**
   * 评估所有规则
   */
  evaluateAll(): RuleEvaluationResult[] {
    const results: RuleEvaluationResult[] = []

    for (const rule of this.getEnabledRules()) {
      const result = this.evaluate(rule)
      if (result) {
        results.push(result)
      }
    }

    return results
  }

  /**
   * 评估单个规则
   */
  evaluate(rule: AlertRule): RuleEvaluationResult | null {
    // 检查冷却时间
    const lastAlert = this.lastAlertTime.get(rule.id)
    const cooldownMs = rule.cooldownMs || 0
    if (lastAlert && Date.now() - lastAlert < cooldownMs) {
      return null
    }

    switch (rule.type) {
      case 'threshold':
        return this.evaluateThreshold(rule)
      case 'trend':
        return this.evaluateTrend(rule)
      case 'periodic':
        return this.evaluatePeriodic(rule)
      default:
        return null
    }
  }

  /**
   * 评估阈值规则
   */
  private evaluateThreshold(rule: ThresholdRule): RuleEvaluationResult | null {
    const history = this.getMetricHistory(rule.metric)
    if (history.length === 0) {
      return null
    }

    const latestValue = history[history.length - 1].value
    const operatorFn = OPERATORS[rule.operator]
    const triggered = operatorFn(latestValue, rule.threshold)

    if (!triggered) {
      return null
    }

    this.lastAlertTime.set(rule.id, Date.now())

    return {
      ruleId: rule.id,
      ruleName: rule.name,
      triggered: true,
      severity: rule.severity,
      message: `${rule.name}: ${rule.metric} ${this.operatorToText(rule.operator)} ${rule.threshold}`,
      details: {
        metric: rule.metric,
        currentValue: latestValue,
        threshold: rule.threshold,
        operator: rule.operator,
        condition: rule.description,
      },
      value: latestValue,
      threshold: rule.threshold,
    }
  }

  /**
   * 评估趋势规则
   */
  private evaluateTrend(rule: TrendRule): RuleEvaluationResult | null {
    const history = this.getMetricHistory(rule.metric, rule.windowMs)
    if (history.length < 2) {
      return null
    }

    const triggered = this.checkTrend(history, rule.direction, rule.sensitivity)

    if (!triggered) {
      return null
    }

    this.lastAlertTime.set(rule.id, Date.now())

    const latestValue = history[history.length - 1].value
    const firstValue = history[0].value
    const changePercent = ((latestValue - firstValue) / Math.abs(firstValue || 1)) * 100

    return {
      ruleId: rule.id,
      ruleName: rule.name,
      triggered: true,
      severity: rule.severity,
      message: `${rule.name}: ${rule.metric} is ${rule.direction} (${changePercent.toFixed(1)}% change)`,
      details: {
        metric: rule.metric,
        direction: rule.direction,
        sensitivity: rule.sensitivity,
        windowMs: rule.windowMs,
        latestValue,
        firstValue,
        changePercent: changePercent.toFixed(2),
        sampleCount: history.length,
      },
      value: latestValue,
    }
  }

  /**
   * 检查趋势
   */
  private checkTrend(
    history: MetricValue[],
    direction: 'increasing' | 'decreasing' | 'volatile',
    sensitivity: number
  ): boolean {
    if (history.length < 2) {
      return false
    }

    // 计算线性回归斜率
    const n = history.length
    let sumX = 0,
      sumY = 0,
      sumXY = 0,
      sumX2 = 0

    for (let i = 0; i < n; i++) {
      sumX += i
      sumY += history[i].value
      sumXY += i * history[i].value
      sumX2 += i * i
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)

    // 计算平均值用于归一化
    const avgValue = sumY / n
    const normalizedSlope = avgValue !== 0 ? slope / avgValue : 0

    switch (direction) {
      case 'increasing':
        return normalizedSlope > sensitivity * 0.1 // 调整敏感度系数
      case 'decreasing':
        return normalizedSlope < -sensitivity * 0.1
      case 'volatile':
        // 计算方差
        const mean = sumY / n
        const variance = history.reduce((sum, m) => sum + Math.pow(m.value - mean, 2), 0) / n
        const stdDev = Math.sqrt(variance)
        const coefficientOfVariation = avgValue !== 0 ? stdDev / Math.abs(avgValue) : 0
        return coefficientOfVariation > sensitivity * 0.5
      default:
        return false
    }
  }

  /**
   * 评估周期规则
   */
  private evaluatePeriodic(rule: PeriodicRule): RuleEvaluationResult | null {
    const history = this.getMetricHistory(rule.metric)
    if (history.length === 0) {
      return null
    }

    const latestValue = history[history.length - 1].value
    let triggered = false

    switch (rule.condition) {
      case 'always':
        triggered = true
        break
      case 'above':
        triggered = rule.threshold !== undefined && latestValue > rule.threshold
        break
      case 'below':
        triggered = rule.threshold !== undefined && latestValue < rule.threshold
        break
      case 'changed':
        if (history.length >= 2) {
          const prevValue = history[history.length - 2].value
          triggered = latestValue !== prevValue
        }
        break
    }

    if (!triggered) {
      return null
    }

    this.lastAlertTime.set(rule.id, Date.now())

    return {
      ruleId: rule.id,
      ruleName: rule.name,
      triggered: true,
      severity: rule.severity,
      message: `${rule.name}: ${rule.condition} condition met for ${rule.metric}`,
      details: {
        metric: rule.metric,
        condition: rule.condition,
        currentValue: latestValue,
        threshold: rule.threshold,
        checkIntervalMs: rule.checkIntervalMs,
      },
      value: latestValue,
      threshold: rule.threshold,
    }
  }

  /**
   * 重置冷却时间
   */
  resetCooldown(ruleId: string): void {
    this.lastAlertTime.delete(ruleId)
  }

  /**
   * 清除指标历史
   */
  clearMetricHistory(name?: string): void {
    if (name) {
      this.metricHistory.delete(name)
    } else {
      this.metricHistory.clear()
    }
  }

  /**
   * 获取引擎统计
   */
  getStats(): {
    totalRules: number
    enabledRules: number
    rulesByType: Record<string, number>
    rulesBySeverity: Record<string, number>
    metricsTracked: number
    lastAlertTimes: Record<string, number>
  } {
    const rules = this.getAllRules()
    const rulesByType: Record<string, number> = {}
    const rulesBySeverity: Record<string, number> = {}

    for (const rule of rules) {
      rulesByType[rule.type] = (rulesByType[rule.type] || 0) + 1
      rulesBySeverity[rule.severity] = (rulesBySeverity[rule.severity] || 0) + 1
    }

    const lastAlertTimes: Record<string, number> = {}
    for (const [ruleId, time] of this.lastAlertTime.entries()) {
      lastAlertTimes[ruleId] = time
    }

    return {
      totalRules: rules.length,
      enabledRules: this.getEnabledRules().length,
      rulesByType,
      rulesBySeverity,
      metricsTracked: this.metricHistory.size,
      lastAlertTimes,
    }
  }

  private operatorToText(operator: keyof typeof OPERATORS): string {
    const textMap: Record<string, string> = {
      gt: '>',
      gte: '>=',
      lt: '<',
      lte: '<=',
      eq: '=',
      neq: '!=',
    }
    return textMap[operator] || operator
  }
}

// ========================================
// Default Rules
// ========================================

export const DEFAULT_THRESHOLD_RULES: ThresholdRule[] = [
  {
    id: 'cpu-usage-critical',
    name: 'CPU Usage Critical',
    description: 'CPU usage exceeds 90%',
    type: 'threshold',
    metric: 'cpu.usage',
    operator: 'gt',
    threshold: 90,
    severity: 'p0',
    channels: ['email', 'slack', 'webhook'],
    enabled: true,
    cooldownMs: 300000, // 5 minutes
    tags: ['system', 'performance'],
  },
  {
    id: 'cpu-usage-warning',
    name: 'CPU Usage Warning',
    description: 'CPU usage exceeds 70%',
    type: 'threshold',
    metric: 'cpu.usage',
    operator: 'gt',
    threshold: 70,
    severity: 'p2',
    channels: ['slack', 'webhook'],
    enabled: true,
    cooldownMs: 600000, // 10 minutes
    tags: ['system', 'performance'],
  },
  {
    id: 'memory-usage-critical',
    name: 'Memory Usage Critical',
    description: 'Memory usage exceeds 90%',
    type: 'threshold',
    metric: 'memory.usage',
    operator: 'gt',
    threshold: 90,
    severity: 'p0',
    channels: ['email', 'slack', 'webhook'],
    enabled: true,
    cooldownMs: 300000,
    tags: ['system', 'memory'],
  },
  {
    id: 'disk-space-low',
    name: 'Disk Space Low',
    description: 'Disk space below 10%',
    type: 'threshold',
    metric: 'disk.space',
    operator: 'lt',
    threshold: 10,
    severity: 'p1',
    channels: ['email', 'slack', 'webhook'],
    enabled: true,
    cooldownMs: 3600000, // 1 hour
    tags: ['system', 'storage'],
  },
  {
    id: 'error-rate-critical',
    name: 'Error Rate Critical',
    description: 'Error rate exceeds 5%',
    type: 'threshold',
    metric: 'error.rate',
    operator: 'gt',
    threshold: 5,
    severity: 'p0',
    channels: ['email', 'slack', 'telegram', 'webhook'],
    enabled: true,
    cooldownMs: 300000,
    tags: ['errors', 'critical'],
  },
]

export const DEFAULT_TREND_RULES: TrendRule[] = [
  {
    id: 'memory-leak-detection',
    name: 'Memory Leak Detection',
    description: 'Memory usage consistently increasing',
    type: 'trend',
    metric: 'memory.usage',
    direction: 'increasing',
    windowMs: 600000, // 10 minutes
    sensitivity: 0.7,
    severity: 'p1',
    channels: ['email', 'slack', 'webhook'],
    enabled: true,
    cooldownMs: 600000,
    tags: ['system', 'memory', 'trend'],
  },
  {
    id: 'response-time-degradation',
    name: 'Response Time Degradation',
    description: 'Response time trending upward',
    type: 'trend',
    metric: 'response.time',
    direction: 'increasing',
    windowMs: 300000, // 5 minutes
    sensitivity: 0.5,
    severity: 'p2',
    channels: ['slack', 'webhook'],
    enabled: true,
    cooldownMs: 600000,
    tags: ['performance', 'trend'],
  },
  {
    id: 'volatile-metric',
    name: 'Metric Volatility Alert',
    description: 'Metric values are highly volatile',
    type: 'trend',
    metric: 'request.latency',
    direction: 'volatile',
    windowMs: 300000,
    sensitivity: 0.8,
    severity: 'p2',
    channels: ['slack', 'webhook'],
    enabled: true,
    cooldownMs: 900000,
    tags: ['performance', 'stability'],
  },
]

export const DEFAULT_PERIODIC_RULES: PeriodicRule[] = [
  {
    id: 'health-check-failure',
    name: 'Health Check Failure',
    description: 'Health check endpoint not responding',
    type: 'periodic',
    metric: 'health.status',
    condition: 'below',
    threshold: 1,
    checkIntervalMs: 60000, // 1 minute
    consecutiveChecks: 3,
    severity: 'p0',
    channels: ['email', 'slack', 'telegram', 'webhook'],
    enabled: true,
    cooldownMs: 300000,
    tags: ['health', 'availability'],
  },
  {
    id: 'service-down',
    name: 'Service Down',
    description: 'Service is not responding',
    type: 'periodic',
    metric: 'service.up',
    condition: 'below',
    threshold: 1,
    checkIntervalMs: 30000, // 30 seconds
    consecutiveChecks: 2,
    severity: 'p0',
    channels: ['email', 'slack', 'telegram', 'webhook'],
    enabled: true,
    cooldownMs: 60000,
    tags: ['availability', 'critical'],
  },
  {
    id: 'config-changed',
    name: 'Configuration Changed',
    description: 'Configuration value changed',
    type: 'periodic',
    metric: 'config.version',
    condition: 'changed',
    checkIntervalMs: 60000,
    severity: 'p3',
    channels: ['webhook'],
    enabled: true,
    cooldownMs: 0,
    tags: ['configuration', 'change'],
  },
]

// ========================================
// Factory Functions
// ========================================

export function createThresholdRule(
  id: string,
  name: string,
  metric: string,
  operator: ThresholdRule['operator'],
  threshold: number,
  severity: AlertSeverity = 'p2'
): ThresholdRule {
  return {
    id,
    name,
    description: `${name}: ${metric} ${operator} ${threshold}`,
    type: 'threshold',
    metric,
    operator,
    threshold,
    severity,
    channels: ['webhook'],
    enabled: true,
  }
}

export function createTrendRule(
  id: string,
  name: string,
  metric: string,
  direction: TrendRule['direction'],
  windowMs: number,
  sensitivity: number,
  severity: AlertSeverity = 'p2'
): TrendRule {
  return {
    id,
    name,
    description: `${name}: ${metric} trending ${direction}`,
    type: 'trend',
    metric,
    direction,
    windowMs,
    sensitivity,
    severity,
    channels: ['webhook'],
    enabled: true,
  }
}

export function createPeriodicRule(
  id: string,
  name: string,
  metric: string,
  condition: PeriodicRule['condition'],
  checkIntervalMs: number,
  severity: AlertSeverity = 'p2',
  threshold?: number
): PeriodicRule {
  return {
    id,
    name,
    description: `${name}: ${metric} condition ${condition}`,
    type: 'periodic',
    metric,
    condition,
    threshold,
    checkIntervalMs,
    severity,
    channels: ['webhook'],
    enabled: true,
  }
}

// ========================================
// Export
// ========================================

export default AlertRuleEngine
