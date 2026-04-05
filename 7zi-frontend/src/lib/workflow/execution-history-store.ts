/**
 * Execution History Store
 *
 * 📦 执行历史存储
 * 版本: v1.12.3
 *
 * 负责工作流执行历史的持久化存储、查询和管理
 * 使用 IndexedDB 存储，复用 draft-storage 的 IndexedDB 基础设施
 */

import type { Node, Edge } from 'reactflow'

/**
 * 执行状态
 */
export type ExecutionStatus = 'running' | 'completed' | 'failed' | 'cancelled'

/**
 * 触发方式
 */
export type TriggerType = 'manual' | 'scheduled' | 'event' | 'webhook'

/**
 * 节点执行状态
 */
export type NodeExecutionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped'

/**
 * 节点执行详情
 */
export interface NodeExecution {
  /** 节点 ID */
  nodeId: string
  /** 节点名称 */
  nodeName: string
  /** 节点类型 */
  nodeType: string
  /** 进入时间 */
  enterTime: number
  /** 退出时间 */
  exitTime?: number
  /** 执行时长（毫秒） */
  duration?: number
  /** 状态 */
  status: NodeExecutionStatus
  /** 输入数据 */
  input?: unknown
  /** 输出数据 */
  output?: unknown
  /** 错误信息 */
  error?: string
}

/**
 * 触发器配置
 */
export interface TriggerConfig {
  /** 触发方式 */
  type: TriggerType
  /** 用户 ID（手动触发） */
  userId?: string
  /** 调度配置（定时触发） */
  schedule?: {
    cron?: string
    interval?: number
    timezone?: string
  }
  /** 事件配置（事件触发） */
  event?: {
    eventType: string
    source: string
    payload?: unknown
  }
  /** Webhook 配置 */
  webhook?: {
    url?: string
    headers?: Record<string, string>
  }
}

/**
 * 执行历史记录
 */
export interface ExecutionHistory {
  /** 执行 ID */
  executionId: string
  /** 工作流 ID */
  workflowId: string
  /** 工作流名称 */
  workflowName: string
  /** 工作流版本 */
  workflowVersion?: string
  /** 工作流定义快照 */
  workflowSnapshot: {
    nodes: Node[]
    edges: Edge[]
  }
  /** 开始时间 */
  startTime: number
  /** 结束时间 */
  endTime?: number
  /** 执行时长（毫秒） */
  duration?: number
  /** 状态 */
  status: ExecutionStatus
  /** 节点执行详情 */
  nodeExecutions: Record<string, NodeExecution>
  /** 触发方式 */
  trigger: TriggerType
  /** 触发器配置快照 */
  triggerConfig: TriggerConfig
  /** 输入数据 */
  inputs?: Record<string, unknown>
  /** 输出数据 */
  outputs?: Record<string, unknown>
  /** 错误信息 */
  error?: string
  /** 创建时间 */
  createdAt: number
}

/**
 * 查询条件
 */
export interface ExecutionHistoryQuery {
  /** 工作流 ID */
  workflowId?: string
  /** 状态 */
  status?: ExecutionStatus
  /** 触发方式 */
  trigger?: TriggerType
  /** 开始时间范围 */
  startTimeRange?: {
    from?: number
    to?: number
  }
  /** 结束时间范围 */
  endTimeRange?: {
    from?: number
    to?: number
  }
  /** 用户 ID */
  userId?: string
  /** 排序 */
  sortBy?: 'startTime' | 'endTime' | 'duration'
  /** 排序方向 */
  sortOrder?: 'asc' | 'desc'
  /** 限制数量 */
  limit?: number
  /** 偏移量 */
  offset?: number
}

/**
 * 统计数据
 */
export interface ExecutionStatistics {
  /** 总执行次数 */
  totalExecutions: number
  /** 按状态统计 */
  statusCounts: Record<ExecutionStatus, number>
  /** 按触发方式统计 */
  triggerCounts: Record<TriggerType, number>
  /** 成功率 */
  successRate: number
  /** 平均执行时长 */
  averageDuration?: number
  /** 最快执行时长 */
  minDuration?: number
  /** 最慢执行时长 */
  maxDuration?: number
}

/**
 * IndexedDB 存储配置
 */
const DB_NAME = '7zi-execution-history'
const DB_VERSION = 1
const STORE_NAME = 'executions'

/**
 * IndexedDB 存储类
 */
class ExecutionHistoryIndexedDB {
  private db: IDBDatabase | null = null
  private initPromise: Promise<void> | null = null

  /**
   * 初始化数据库
   */
  async init(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise
    }

    this.initPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        reject(new Error('IndexedDB not available'))
        return
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => {
        reject(new Error(`Failed to open database: ${request.error}`))
      }

      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // 创建 executions 存储
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'executionId' })
          store.createIndex('workflowId', 'workflowId', { unique: false })
          store.createIndex('status', 'status', { unique: false })
          store.createIndex('trigger', 'trigger', { unique: false })
          store.createIndex('startTime', 'startTime', { unique: false })
          store.createIndex('endTime', 'endTime', { unique: false })
          store.createIndex('userId', 'triggerConfig.userId', { unique: false })
        }
      }
    })

    return this.initPromise
  }

  /**
   * 保存执行记录
   */
  async save(history: ExecutionHistory): Promise<void> {
    if (!this.db) {
      await this.init()
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      const transaction = this.db.transaction([STORE_NAME], 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.put(history)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(new Error(`Failed to save execution: ${request.error}`))
    })
  }

  /**
   * 加载执行记录
   */
  async load(executionId: string): Promise<ExecutionHistory | null> {
    if (!this.db) {
      await this.init()
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      const transaction = this.db.transaction([STORE_NAME], 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.get(executionId)

      request.onsuccess = () => {
        const result = request.result
        resolve(result || null)
      }

      request.onerror = () => reject(new Error(`Failed to load execution: ${request.error}`))
    })
  }

  /**
   * 查询执行记录
   */
  async query(query: ExecutionHistoryQuery): Promise<ExecutionHistory[]> {
    if (!this.db) {
      await this.init()
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      const transaction = this.db.transaction([STORE_NAME], 'readonly')
      const store = transaction.objectStore(STORE_NAME)

      let cursor: IDBRequest<IDBCursorWithValue | null>
      if (query.workflowId) {
        const index = store.index('workflowId')
        cursor = index.openCursor(IDBKeyRange.only(query.workflowId))
      } else if (query.status) {
        const index = store.index('status')
        cursor = index.openCursor(IDBKeyRange.only(query.status))
      } else if (query.trigger) {
        const index = store.index('trigger')
        cursor = index.openCursor(IDBKeyRange.only(query.trigger))
      } else {
        cursor = store.openCursor()
      }

      const results: ExecutionHistory[] = []

      cursor.onsuccess = () => {
        const result = cursor.result
        if (result) {
          const value = result.value as ExecutionHistory

          // 应用过滤条件
          if (this.matchesQuery(value, query)) {
            results.push(value)
          }

          result.continue()
        } else {
          // 排序
          this.sortResults(results, query)

          // 分页
          const offset = query.offset || 0
          const limit = query.limit || results.length
          resolve(results.slice(offset, offset + limit))
        }
      }

      cursor.onerror = () => reject(new Error(`Failed to query executions: ${cursor.error}`))
    })
  }

  /**
   * 检查记录是否匹配查询条件
   */
  private matchesQuery(history: ExecutionHistory, query: ExecutionHistoryQuery): boolean {
    // 状态过滤
    if (query.status && history.status !== query.status) {
      return false
    }

    // 触发方式过滤
    if (query.trigger && history.trigger !== query.trigger) {
      return false
    }

    // 用户 ID 过滤
    if (query.userId && history.triggerConfig.userId !== query.userId) {
      return false
    }

    // 开始时间范围
    if (query.startTimeRange) {
      if (query.startTimeRange.from && history.startTime < query.startTimeRange.from) {
        return false
      }
      if (query.startTimeRange.to && history.startTime > query.startTimeRange.to) {
        return false
      }
    }

    // 结束时间范围
    if (query.endTimeRange && history.endTime) {
      if (query.endTimeRange.from && history.endTime < query.endTimeRange.from) {
        return false
      }
      if (query.endTimeRange.to && history.endTime > query.endTimeRange.to) {
        return false
      }
    }

    return true
  }

  /**
   * 排序结果
   */
  private sortResults(results: ExecutionHistory[], query: ExecutionHistoryQuery): void {
    const sortBy = query.sortBy || 'startTime'
    const sortOrder = query.sortOrder || 'desc'

    results.sort((a, b) => {
      let comparison = 0

      switch (sortBy) {
        case 'startTime':
          comparison = a.startTime - b.startTime
          break
        case 'endTime':
          comparison = (a.endTime || 0) - (b.endTime || 0)
          break
        case 'duration':
          comparison = (a.duration || 0) - (b.duration || 0)
          break
      }

      return sortOrder === 'asc' ? comparison : -comparison
    })
  }

  /**
   * 删除执行记录
   */
  async delete(executionId: string): Promise<void> {
    if (!this.db) {
      await this.init()
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      const transaction = this.db.transaction([STORE_NAME], 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.delete(executionId)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(new Error(`Failed to delete execution: ${request.error}`))
    })
  }

  /**
   * 清空所有记录
   */
  async clear(): Promise<void> {
    if (!this.db) {
      await this.init()
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      const transaction = this.db.transaction([STORE_NAME], 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.clear()

      request.onsuccess = () => resolve()
      request.onerror = () => reject(new Error(`Failed to clear executions: ${request.error}`))
    })
  }

  /**
   * 获取所有记录（用于统计）
   */
  async getAll(): Promise<ExecutionHistory[]> {
    if (!this.db) {
      await this.init()
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      const transaction = this.db.transaction([STORE_NAME], 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.getAll()

      request.onsuccess = () => resolve(request.result as ExecutionHistory[])
      request.onerror = () => reject(new Error(`Failed to get all executions: ${request.error}`))
    })
  }
}

/**
 * 执行历史存储类
 */
export class ExecutionHistoryStore {
  private db: ExecutionHistoryIndexedDB
  private storageKey = 'execution-history-config'

  constructor() {
    this.db = new ExecutionHistoryIndexedDB()
  }

  /**
   * 保存执行记录
   */
  async save(history: ExecutionHistory): Promise<void> {
    await this.db.save(history)
  }

  /**
   * 加载执行记录
   */
  async load(executionId: string): Promise<ExecutionHistory | null> {
    return this.db.load(executionId)
  }

  /**
   * 查询执行记录
   */
  async query(query: ExecutionHistoryQuery): Promise<ExecutionHistory[]> {
    return this.db.query(query)
  }

  /**
   * 获取工作流的所有执行记录
   */
  async getWorkflowExecutions(workflowId: string): Promise<ExecutionHistory[]> {
    return this.query({ workflowId })
  }

  /**
   * 获取正在运行的执行记录
   */
  async getRunningExecutions(): Promise<ExecutionHistory[]> {
    return this.query({ status: 'running' })
  }

  /**
   * 获取失败的执行记录
   */
  async getFailedExecutions(): Promise<ExecutionHistory[]> {
    return this.query({ status: 'failed' })
  }

  /**
   * 删除执行记录
   */
  async delete(executionId: string): Promise<void> {
    await this.db.delete(executionId)
  }

  /**
   * 批量删除执行记录
   */
  async deleteMany(executionIds: string[]): Promise<void> {
    for (const id of executionIds) {
      await this.delete(id)
    }
  }

  /**
   * 清空所有记录
   */
  async clear(): Promise<void> {
    await this.db.clear()
  }

  /**
   * 导出执行记录为 JSON
   */
  async exportAsJson(executionId: string): Promise<string> {
    const history = await this.load(executionId)
    if (!history) {
      throw new Error(`Execution not found: ${executionId}`)
    }
    return JSON.stringify(history, null, 2)
  }

  /**
   * 批量导出执行记录为 JSON
   */
  async exportManyAsJson(executionIds: string[]): Promise<string> {
    const histories: ExecutionHistory[] = []
    for (const id of executionIds) {
      const history = await this.load(id)
      if (history) {
        histories.push(history)
      }
    }
    return JSON.stringify(histories, null, 2)
  }

  /**
   * 从 JSON 导入执行记录
   */
  async importFromJson(json: string): Promise<void> {
    const history = JSON.parse(json) as ExecutionHistory
    await this.save(history)
  }

  /**
   * 获取所有执行记录（用于统计）
   */
  async getAll(): Promise<ExecutionHistory[]> {
    return this.db.getAll()
  }

  /**
   * 获取统计信息
   */
  async getStatistics(workflowId?: string): Promise<ExecutionStatistics> {
    const histories = workflowId
      ? await this.getWorkflowExecutions(workflowId)
      : await this.getAll()

    const totalExecutions = histories.length
    const statusCounts: Record<ExecutionStatus, number> = {
      running: 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
    }
    const triggerCounts: Record<TriggerType, number> = {
      manual: 0,
      scheduled: 0,
      event: 0,
      webhook: 0,
    }

    const completedExecutions = histories.filter(h => h.status === 'completed')
    const durations = completedExecutions
      .filter(h => h.duration !== undefined)
      .map(h => h.duration!)

    for (const history of histories) {
      statusCounts[history.status]++
      triggerCounts[history.trigger]++
    }

    const successRate = totalExecutions > 0 ? (statusCounts.completed / totalExecutions) * 100 : 0

    let averageDuration: number | undefined
    let minDuration: number | undefined
    let maxDuration: number | undefined

    if (durations.length > 0) {
      averageDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length
      minDuration = Math.min(...durations)
      maxDuration = Math.max(...durations)
    }

    return {
      totalExecutions,
      statusCounts,
      triggerCounts,
      successRate,
      averageDuration,
      minDuration,
      maxDuration,
    }
  }

  /**
   * 清理旧记录（保留最近 N 天的记录）
   */
  async cleanupOldRecords(daysToKeep: number = 30): Promise<number> {
    const cutoffTime = Date.now() - daysToKeep * 24 * 60 * 60 * 1000
    const allExecutions = await this.getAll()

    const toDelete = allExecutions
      .filter(e => e.startTime < cutoffTime)
      .map(e => e.executionId)

    await this.deleteMany(toDelete)
    return toDelete.length
  }

  /**
   * 获取可用的存储空间
   */
  async getStorageInfo(): Promise<{ used: number; count: number }> {
    const executions = await this.getAll()
    const used = JSON.stringify(executions).length
    return { used, count: executions.length }
  }
}

// 导出单例实例
export const executionHistoryStore = new ExecutionHistoryStore()
