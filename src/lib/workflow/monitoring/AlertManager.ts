/**
 * 告警管理器
 * 管理执行超时、节点失败、循环依赖检测等告警
 */

import {
  Alert,
  AlertConfig,
  AlertLevel,
  AlertType,
  WorkflowExecutionStatus,
} from './types'
import { NodeExecution } from './StepRecorder'

/**
 * 告警管理器
 * 负责检测和管理工作流执行告警
 */
export class AlertManager {
  private alerts: Map<string, Alert> = new Map()
  private alertConfigs: Map<string, AlertConfig> = new Map()
  private executionAlerts: Map<string, Set<string>> = new Map() // executionId -> alertIds
  private nodeAlerts: Map<string, Set<string>> = new Map() // nodeExecutionId -> alertIds

  // 超时检测定时器
  private timeoutTimers: Map<string, NodeJS.Timeout> = new Map()

  // 循环依赖检测缓存
  private dependencyCache: Map<string, Set<string>> = new Map()

  constructor() {
    // 初始化默认告警配置
    this.initDefaultConfigs()
  }

  /**
   * 初始化默认告警配置
   */
  private initDefaultConfigs(): void {
    const defaultConfigs: AlertConfig[] = [
      {
        id: 'default_timeout',
        name: '执行超时',
        type: AlertType.EXECUTION_TIMEOUT,
        level: AlertLevel.WARNING,
        timeout: { duration: 300000 }, // 5分钟
        enabled: true,
        notify: { websocket: true },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'default_node_failure',
        name: '节点失败',
        type: AlertType.NODE_FAILURE,
        level: AlertLevel.ERROR,
        enabled: true,
        notify: { websocket: true },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'default_circular_dependency',
        name: '循环依赖',
        type: AlertType.CIRCULAR_DEPENDENCY,
        level: AlertLevel.CRITICAL,
        enabled: true,
        notify: { websocket: true },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]

    for (const config of defaultConfigs) {
      this.alertConfigs.set(config.id, config)
    }
  }

  /**
   * 添加告警配置
   */
  addAlertConfig(config: AlertConfig): void {
    this.alertConfigs.set(config.id, config)
  }

  /**
   * 获取告警配置
   */
  getAlertConfig(configId: string): AlertConfig | undefined {
    return this.alertConfigs.get(configId)
  }

  /**
   * 获取所有告警配置
   */
  getAllAlertConfigs(): AlertConfig[] {
    return Array.from(this.alertConfigs.values())
  }

  /**
   * 更新告警配置
   */
  updateAlertConfig(configId: string, updates: Partial<AlertConfig>): boolean {
    const config = this.alertConfigs.get(configId)
    if (!config) return false

    const updated = { ...config, ...updates, updatedAt: new Date().toISOString() }
    this.alertConfigs.set(configId, updated)
    return true
  }

  /**
   * 删除告警配置
   */
  deleteAlertConfig(configId: string): boolean {
    return this.alertConfigs.delete(configId)
  }

  /**
   * 创建告警
   */
  createAlert(params: {
    executionId: string
    nodeId?: string
    type: AlertType
    level: AlertLevel
    message: string
    details?: Record<string, unknown>
  }): Alert {
    const now = new Date().toISOString()
    const id = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const alert: Alert = {
      id,
      executionId: params.executionId,
      nodeId: params.nodeId,
      type: params.type,
      level: params.level,
      message: params.message,
      details: params.details,
      timestamp: now,
      status: 'active',
    }

    // 存储告警
    this.alerts.set(id, alert)

    // 更新索引
    if (!this.executionAlerts.has(params.executionId)) {
      this.executionAlerts.set(params.executionId, new Set())
    }
    this.executionAlerts.get(params.executionId)!.add(id)

    if (params.nodeId) {
      if (!this.nodeAlerts.has(params.nodeId)) {
        this.nodeAlerts.set(params.nodeId, new Set())
      }
      this.nodeAlerts.get(params.nodeId)!.add(id)
    }

    return alert
  }

  /**
   * 解决议警
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.get(alertId)
    if (!alert) return false

    alert.status = 'resolved'
    alert.resolvedAt = new Date().toISOString()
    this.alerts.set(alertId, alert)
    return true
  }

  /**
   * 确认告警
   */
  acknowledgeAlert(alertId: string): boolean {
    const alert = this.alerts.get(alertId)
    if (!alert) return false

    alert.status = 'acknowledged'
    this.alerts.set(alertId, alert)
    return true
  }

  /**
   * 获取告警
   */
  getAlert(alertId: string): Alert | undefined {
    return this.alerts.get(alertId)
  }

  /**
   * 获取执行的所有告警
   */
  getExecutionAlerts(executionId: string): Alert[] {
    const alertIds = this.executionAlerts.get(executionId)
    if (!alertIds) return []

    return Array.from(alertIds)
      .map(id => this.alerts.get(id)!)
      .filter(Boolean)
  }

  /**
   * 获取节点的所有告警
   */
  getNodeAlerts(nodeExecutionId: string): Alert[] {
    const alertIds = this.nodeAlerts.get(nodeExecutionId)
    if (!alertIds) return []

    return Array.from(alertIds)
      .map(id => this.alerts.get(id)!)
      .filter(Boolean)
  }

  /**
   * 获取活跃告警
   */
  getActiveAlerts(): Alert[] {
    return Array.from(this.alerts.values())
      .filter(alert => alert.status === 'active')
  }

  /**
   * 检测节点失败
   */
  checkNodeFailure(nodeExecution: NodeExecution): Alert | null {
    const config = this.alertConfigs.get('default_node_failure')
    if (!config || !config.enabled) return null

    if (nodeExecution.status === 'failed' && nodeExecution.error) {
      return this.createAlert({
        executionId: nodeExecution.executionId,
        nodeId: nodeExecution.nodeId,
        type: AlertType.NODE_FAILURE,
        level: config.level,
        message: `节点 ${nodeExecution.nodeName} 执行失败: ${nodeExecution.error.message}`,
        details: {
          nodeId: nodeExecution.nodeId,
          nodeName: nodeExecution.nodeName,
          error: nodeExecution.error,
          retryCount: nodeExecution.retryCount,
        },
      })
    }

    return null
  }

  /**
   * 设置执行超时检测
   */
  setTimeoutDetection(
    executionId: string,
    timeoutMs: number,
    callback: () => void
  ): void {
    // 清除现有定时器
    this.clearTimeoutDetection(executionId)

    const timer = setTimeout(() => {
      const config = this.alertConfigs.get('default_timeout')
      if (config && config.enabled) {
        this.createAlert({
          executionId,
          type: AlertType.EXECUTION_TIMEOUT,
          level: config.level,
          message: `执行超时 (${timeoutMs}ms)`,
          details: { timeout: timeoutMs },
        })
      }
      callback()
    }, timeoutMs)

    this.timeoutTimers.set(executionId, timer)
  }

  /**
   * 清除超时检测
   */
  clearTimeoutDetection(executionId: string): void {
    const timer = this.timeoutTimers.get(executionId)
    if (timer) {
      clearTimeout(timer)
      this.timeoutTimers.delete(executionId)
    }
  }

  /**
   * 检测循环依赖
   */
  detectCircularDependency(
    nodeId: string,
    dependencies: string[],
    visited: Set<string> = new Set(),
    path: string[] = []
  ): boolean {
    // 如果节点已在当前路径中，发现循环
    if (path.includes(nodeId)) {
      return true
    }

    // 如果节点已访问过，跳过
    if (visited.has(nodeId)) {
      return false
    }

    // 标记为已访问
    visited.add(nodeId)
    path.push(nodeId)

    // 递归检查依赖
    for (const depId of dependencies) {
      const depDeps = this.dependencyCache.get(depId)
      if (depDeps && this.detectCircularDependency(depId, Array.from(depDeps), visited, [...path])) {
        return true
      }
    }

    return false
  }

  /**
   * 更新依赖缓存
   */
  updateDependencyCache(nodeId: string, dependencies: string[]): void {
    this.dependencyCache.set(nodeId, new Set(dependencies))
  }

  /**
   * 检查工作流依赖
   */
  checkWorkflowDependencies(
    nodes: Array<{ id: string; dependencies: string[] }>
  ): Array<{ nodeId: string; cycle: string[] }> {
    const cycles: Array<{ nodeId: string; cycle: string[] }> = []

    // 清空缓存
    this.dependencyCache.clear()

    // 构建依赖图
    for (const node of nodes) {
      this.dependencyCache.set(node.id, new Set(node.dependencies))
    }

    // 检测循环
    for (const node of nodes) {
      const visited = new Set<string>()
      const path: string[] = []

      if (this.detectCircularDependency(node.id, Array.from(node.dependencies), visited, path)) {
        cycles.push({
          nodeId: node.id,
          cycle: [...path, node.id],
        })
      }
    }

    // 如果发现循环，创建告警
    for (const cycle of cycles) {
      this.createAlert({
        executionId: 'workflow_validation',
        type: AlertType.CIRCULAR_DEPENDENCY,
        level: AlertLevel.CRITICAL,
        message: `检测到循环依赖: ${cycle.cycle.join(' -> ')}`,
        details: { cycle: cycle.cycle },
      })
    }

    return cycles
  }

  /**
   * 检测阈值突破
   */
  checkThreshold(
    executionId: string,
    metricName: string,
    value: number,
    threshold: { value: number; operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte' }
  ): boolean {
    let breached = false

    switch (threshold.operator) {
      case 'gt':
        breached = value > threshold.value
        break
      case 'lt':
        breached = value < threshold.value
        break
      case 'eq':
        breached = value === threshold.value
        break
      case 'gte':
        breached = value >= threshold.value
        break
      case 'lte':
        breached = value <= threshold.value
        break
    }

    if (breached) {
      this.createAlert({
        executionId,
        type: AlertType.THRESHOLD_BREACHED,
        level: AlertLevel.WARNING,
        message: `指标 ${metricName} 突破阈值: ${value} ${threshold.operator} ${threshold.value}`,
        details: { metricName, value, threshold },
      })
    }

    return breached
  }

  /**
   * 清理执行告警
   */
  cleanupExecutionAlerts(executionId: string): number {
    const alertIds = this.executionAlerts.get(executionId)
    if (!alertIds) return 0

    let count = 0
    for (const alertId of alertIds) {
      const alert = this.alerts.get(alertId)
      if (alert) {
        // 解析活跃告警
        if (alert.status === 'active') {
          this.resolveAlert(alertId)
        }
        count++
      }
    }

    return count
  }

  /**
   * 获取告警统计
   */
  getAlertStats(): {
    total: number
    active: number
    resolved: number
    acknowledged: number
    byLevel: Record<AlertLevel, number>
    byType: Record<AlertType, number>
  } {
    const alerts = Array.from(this.alerts.values())

    const byLevel: Record<AlertLevel, number> = {
      [AlertLevel.INFO]: 0,
      [AlertLevel.WARNING]: 0,
      [AlertLevel.ERROR]: 0,
      [AlertLevel.CRITICAL]: 0,
    }

    const byType: Record<AlertType, number> = {
      [AlertType.EXECUTION_TIMEOUT]: 0,
      [AlertType.NODE_FAILURE]: 0,
      [AlertType.CIRCULAR_DEPENDENCY]: 0,
      [AlertType.RESOURCE_EXHAUSTED]: 0,
      [AlertType.THRESHOLD_BREACHED]: 0,
    }

    for (const alert of alerts) {
      byLevel[alert.level]++
      byType[alert.type]++
    }

    return {
      total: alerts.length,
      active: alerts.filter(a => a.status === 'active').length,
      resolved: alerts.filter(a => a.status === 'resolved').length,
      acknowledged: alerts.filter(a => a.status === 'acknowledged').length,
      byLevel,
      byType,
    }
  }

  /**
   * 清理旧告警
   */
  cleanupOldAlerts(maxAgeMs: number = 7 * 24 * 60 * 60 * 1000): number {
    const cutoffTime = Date.now() - maxAgeMs
    const toDelete: string[] = []

    for (const [id, alert] of this.alerts.entries()) {
      // 只删除已解决的告警
      if (alert.status === 'resolved' || alert.status === 'acknowledged') {
        const alertTime = new Date(alert.timestamp).getTime()
        if (alertTime < cutoffTime) {
          toDelete.push(id)
        }
      }
    }

    // 删除告警
    for (const id of toDelete) {
      const alert = this.alerts.get(id)
      if (alert) {
        // 从索引中移除
        this.executionAlerts.get(alert.executionId)?.delete(id)
        if (alert.nodeId) {
          this.nodeAlerts.get(alert.nodeId)?.delete(id)
        }
        this.alerts.delete(id)
      }
    }

    return toDelete.length
  }
}

// 导出单例
export const alertManager = new AlertManager()