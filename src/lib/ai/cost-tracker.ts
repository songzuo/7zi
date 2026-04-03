/**
 * 成本追踪器
 * 记录和追踪 AI 模型的使用成本
 */

import { ModelConfig } from '../routing/types'

/**
 * 成本记录
 */
export interface CostRecord {
  id: string
  modelId: string
  modelName: string
  provider: string
  timestamp: number
  promptTokens: number
  completionTokens: number
  totalTokens: number
  cost: number // 成本（分）
  latency: number // 延迟（毫秒）
  taskType?: string
  userId?: string
  sessionId?: string
}

/**
 * 成本统计
 */
export interface CostStats {
  totalCost: number
  totalTokens: number
  totalRequests: number
  avgCostPerRequest: number
  avgTokensPerRequest: number
  avgLatency: number
  byModel: Record<string, {
    cost: number
    tokens: number
    requests: number
    avgLatency: number
  }>
  byProvider: Record<string, {
    cost: number
    tokens: number
    requests: number
  }>
  byDay: Record<string, {
    cost: number
    tokens: number
    requests: number
  }>
}

/**
 * 成本追踪器配置
 */
export interface CostTrackerConfig {
  maxRecords?: number // 最大记录数
  enablePersistence?: boolean // 是否持久化
  persistencePath?: string // 持久化路径
  dailyBudgetLimit?: number // 每日预算限制（分）
}

/**
 * 成本追踪器类
 */
export class CostTracker {
  private records: CostRecord[]
  private config: CostTrackerConfig
  private dailyCost: number
  private lastDayReset: number

  constructor(config: CostTrackerConfig = {}) {
    this.config = {
      maxRecords: 10000,
      enablePersistence: false,
      dailyBudgetLimit: 10000, // 默认 100 元
      ...config,
    }
    this.records = []
    this.dailyCost = 0
    this.lastDayReset = Date.now()

    // 加载持久化数据
    if (this.config.enablePersistence && this.config.persistencePath) {
      this.loadFromDisk()
    }
  }

  /**
   * 记录成本
   */
  record(record: Omit<CostRecord, 'id' | 'timestamp'>): CostRecord {
    const costRecord: CostRecord = {
      id: this.generateId(),
      timestamp: Date.now(),
      ...record,
    }

    this.records.push(costRecord)

    // 更新每日成本
    this.updateDailyCost(costRecord.cost)

    // 限制记录数量
    if (this.records.length > (this.config.maxRecords || 10000)) {
      this.records = this.records.slice(-this.config.maxRecords)
    }

    // 持久化
    if (this.config.enablePersistence && this.config.persistencePath) {
      this.saveToDisk()
    }

    return costRecord
  }

  /**
   * 批量记录
   */
  recordBatch(records: Array<Omit<CostRecord, 'id' | 'timestamp'>>): CostRecord[] {
    return records.map((r) => this.record(r))
  }

  /**
   * 获取统计信息
   */
  getStats(timeRange?: { start: number; end: number }): CostStats {
    let filteredRecords = this.records

    if (timeRange) {
      filteredRecords = this.records.filter(
        (r) => r.timestamp >= timeRange.start && r.timestamp <= timeRange.end
      )
    }

    const stats: CostStats = {
      totalCost: 0,
      totalTokens: 0,
      totalRequests: filteredRecords.length,
      avgCostPerRequest: 0,
      avgTokensPerRequest: 0,
      avgLatency: 0,
      byModel: {},
      byProvider: {},
      byDay: {},
    }

    for (const record of filteredRecords) {
      stats.totalCost += record.cost
      stats.totalTokens += record.totalTokens
      stats.avgLatency += record.latency

      // 按模型统计
      if (!stats.byModel[record.modelId]) {
        stats.byModel[record.modelId] = {
          cost: 0,
          tokens: 0,
          requests: 0,
          avgLatency: 0,
        }
      }
      stats.byModel[record.modelId].cost += record.cost
      stats.byModel[record.modelId].tokens += record.totalTokens
      stats.byModel[record.modelId].requests++
      stats.byModel[record.modelId].avgLatency += record.latency

      // 按提供商统计
      if (!stats.byProvider[record.provider]) {
        stats.byProvider[record.provider] = {
          cost: 0,
          tokens: 0,
          requests: 0,
        }
      }
      stats.byProvider[record.provider].cost += record.cost
      stats.byProvider[record.provider].tokens += record.totalTokens
      stats.byProvider[record.provider].requests++

      // 按天统计
      const day = new Date(record.timestamp).toISOString().split('T')[0]
      if (!stats.byDay[day]) {
        stats.byDay[day] = {
          cost: 0,
          tokens: 0,
          requests: 0,
        }
      }
      stats.byDay[day].cost += record.cost
      stats.byDay[day].tokens += record.totalTokens
      stats.byDay[day].requests++
    }

    // 计算平均值
    if (stats.totalRequests > 0) {
      stats.avgCostPerRequest = stats.totalCost / stats.totalRequests
      stats.avgTokensPerRequest = stats.totalTokens / stats.totalRequests
      stats.avgLatency = stats.avgLatency / stats.totalRequests
    }

    // 计算模型平均延迟
    for (const modelId in stats.byModel) {
      const modelStats = stats.byModel[modelId]
      if (modelStats.requests > 0) {
        modelStats.avgLatency = modelStats.avgLatency / modelStats.requests
      }
    }

    return stats
  }

  /**
   * 获取每日成本
   */
  getDailyCost(): number {
    this.resetDailyIfNeeded()
    return this.dailyCost
  }

  /**
   * 检查是否超出预算
   */
  checkBudget(cost: number): boolean {
    this.resetDailyIfNeeded()
    return this.dailyCost + cost <= (this.config.dailyBudgetLimit || Infinity)
  }

  /**
   * 获取剩余预算
   */
  getRemainingBudget(): number {
    this.resetDailyIfNeeded()
    const limit = this.config.dailyBudgetLimit || Infinity
    return Math.max(0, limit - this.dailyCost)
  }

  /**
   * 获取记录
   */
  getRecords(limit?: number): CostRecord[] {
    if (limit) {
      return this.records.slice(-limit)
    }
    return [...this.records]
  }

  /**
   * 按模型获取记录
   */
  getRecordsByModel(modelId: string, limit?: number): CostRecord[] {
    const filtered = this.records.filter((r) => r.modelId === modelId)
    return limit ? filtered.slice(-limit) : filtered
  }

  /**
   * 按用户获取记录
   */
  getRecordsByUser(userId: string, limit?: number): CostRecord[] {
    const filtered = this.records.filter((r) => r.userId === userId)
    return limit ? filtered.slice(-limit) : filtered
  }

  /**
   * 按时间范围获取记录
   */
  getRecordsByTimeRange(start: number, end: number): CostRecord[] {
    return this.records.filter((r) => r.timestamp >= start && r.timestamp <= end)
  }

  /**
   * 清空记录
   */
  clear(): void {
    this.records = []
    this.dailyCost = 0
    this.lastDayReset = Date.now()

    if (this.config.enablePersistence && this.config.persistencePath) {
      this.saveToDisk()
    }
  }

  /**
   * 导出数据
   */
  export(): CostRecord[] {
    return [...this.records]
  }

  /**
   * 导入数据
   */
  import(records: CostRecord[]): void {
    this.records = records
    this.updateDailyCostFromRecords()

    if (this.config.enablePersistence && this.config.persistencePath) {
      this.saveToDisk()
    }
  }

  /**
   * 生成 ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`
  }

  /**
   * 更新每日成本
   */
  private updateDailyCost(cost: number): void {
    this.resetDailyIfNeeded()
    this.dailyCost += cost
  }

  /**
   * 重置每日成本（如果需要）
   */
  private resetDailyIfNeeded(): void {
    const now = Date.now()
    const oneDayMs = 24 * 60 * 60 * 1000

    if (now - this.lastDayReset >= oneDayMs) {
      this.dailyCost = 0
      this.lastDayReset = now
    }
  }

  /**
   * 从记录更新每日成本
   */
  private updateDailyCostFromRecords(): void {
    const today = new Date().toISOString().split('T')[0]
    this.dailyCost = this.records
      .filter((r) => new Date(r.timestamp).toISOString().split('T')[0] === today)
      .reduce((sum, r) => sum + r.cost, 0)
    this.lastDayReset = Date.now()
  }

  /**
   * 保存到磁盘
   */
  private saveToDisk(): void {
    // 实际实现需要文件系统访问
    // 这里只是占位符
    try {
      if (typeof window === 'undefined' && this.config.persistencePath) {
        // Node.js 环境
        const fs = require('fs')
        fs.writeFileSync(
          this.config.persistencePath,
          JSON.stringify(this.records, null, 2)
        )
      }
    } catch (error) {
      console.error('Failed to save cost tracker data:', error)
    }
  }

  /**
   * 从磁盘加载
   */
  private loadFromDisk(): void {
    try {
      if (typeof window === 'undefined' && this.config.persistencePath) {
        // Node.js 环境
        const fs = require('fs')
        if (fs.existsSync(this.config.persistencePath)) {
          const data = fs.readFileSync(this.config.persistencePath, 'utf-8')
          this.records = JSON.parse(data)
          this.updateDailyCostFromRecords()
        }
      }
    } catch (error) {
      console.error('Failed to load cost tracker data:', error)
    }
  }
}

/**
 * 默认成本追踪器实例
 */
export const costTracker = new CostTracker()

/**
 * 便捷函数
 */
export function recordCost(record: Omit<CostRecord, 'id' | 'timestamp'>): CostRecord {
  return costTracker.record(record)
}

export function getCostStats(timeRange?: { start: number; end: number }): CostStats {
  return costTracker.getStats(timeRange)
}