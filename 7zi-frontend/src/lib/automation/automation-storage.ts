/**
 * 自动化规则存储系统
 * 使用 IndexedDB 进行规则持久化
 */

import type { AutomationRule, ExecutionResult } from './automation-engine'

const DB_NAME = 'workspace_automation'
const DB_VERSION = 1
const RULES_STORE = 'rules'
const EXECUTIONS_STORE = 'executions'

/**
 * IndexedDB 数据库连接
 */
export class AutomationDB {
  private db: IDBDatabase | null = null
  private initPromise: Promise<IDBDatabase> | null = null

  /**
   * 初始化数据库
   */
  async init(): Promise<IDBDatabase> {
    if (this.db) return this.db
    if (this.initPromise) return this.initPromise

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => {
        reject(new Error('Failed to open database'))
      }

      request.onsuccess = () => {
        this.db = request.result
        resolve(this.db)
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // 创建规则存储
        if (!db.objectStoreNames.contains(RULES_STORE)) {
          const rulesStore = db.createObjectStore(RULES_STORE, { keyPath: 'id' })
          rulesStore.createIndex('status', 'status', { unique: false })
          rulesStore.createIndex('name', 'name', { unique: false })
          rulesStore.createIndex('createdAt', 'metadata.createdAt', { unique: false })
        }

        // 创建执行记录存储
        if (!db.objectStoreNames.contains(EXECUTIONS_STORE)) {
          const executionsStore = db.createObjectStore(EXECUTIONS_STORE, { keyPath: 'executionId' })
          executionsStore.createIndex('ruleId', 'ruleId', { unique: false })
          executionsStore.createIndex('timestamp', 'timestamp', { unique: false })
        }
      }
    })

    return this.initPromise
  }

  /**
   * 保存规则
   */
  async saveRule(rule: AutomationRule): Promise<void> {
    const db = await this.init()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([RULES_STORE], 'readwrite')
      const store = transaction.objectStore(RULES_STORE)
      const request = store.put(rule)

      request.onerror = () => {
        reject(new Error('Failed to save rule'))
      }

      request.onsuccess = () => {
        resolve()
      }
    })
  }

  /**
   * 批量保存规则
   */
  async saveRules(rules: AutomationRule[]): Promise<void> {
    const db = await this.init()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([RULES_STORE], 'readwrite')
      const store = transaction.objectStore(RULES_STORE)

      let completed = 0
      const total = rules.length

      if (total === 0) {
        resolve()
        return
      }

      rules.forEach((rule) => {
        const request = store.put(rule)

        request.onsuccess = () => {
          completed++
          if (completed === total) {
            resolve()
          }
        }

        request.onerror = () => {
          reject(new Error(`Failed to save rule: ${rule.id}`))
        }
      })
    })
  }

  /**
   * 获取规则
   */
  async getRule(ruleId: string): Promise<AutomationRule | undefined> {
    const db = await this.init()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([RULES_STORE], 'readonly')
      const store = transaction.objectStore(RULES_STORE)
      const request = store.get(ruleId)

      request.onerror = () => {
        reject(new Error('Failed to get rule'))
      }

      request.onsuccess = () => {
        resolve(request.result)
      }
    })
  }

  /**
   * 获取所有规则
   */
  async getAllRules(): Promise<AutomationRule[]> {
    const db = await this.init()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([RULES_STORE], 'readonly')
      const store = transaction.objectStore(RULES_STORE)
      const request = store.getAll()

      request.onerror = () => {
        reject(new Error('Failed to get rules'))
      }

      request.onsuccess = () => {
        resolve(request.result || [])
      }
    })
  }

  /**
   * 删除规则
   */
  async deleteRule(ruleId: string): Promise<void> {
    const db = await this.init()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([RULES_STORE], 'readwrite')
      const store = transaction.objectStore(RULES_STORE)
      const request = store.delete(ruleId)

      request.onerror = () => {
        reject(new Error('Failed to delete rule'))
      }

      request.onsuccess = () => {
        resolve()
      }
    })
  }

  /**
   * 保存执行记录
   */
  async saveExecution(result: ExecutionResult): Promise<void> {
    const db = await this.init()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([EXECUTIONS_STORE], 'readwrite')
      const store = transaction.objectStore(EXECUTIONS_STORE)
      const request = store.put(result)

      request.onerror = () => {
        reject(new Error('Failed to save execution'))
      }

      request.onsuccess = () => {
        resolve()
      }
    })
  }

  /**
   * 获取规则的执行历史
   */
  async getExecutionHistory(ruleId: string, limit = 50): Promise<ExecutionResult[]> {
    const db = await this.init()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([EXECUTIONS_STORE], 'readonly')
      const store = transaction.objectStore(EXECUTIONS_STORE)
      const index = store.index('ruleId')
      const request = index.getAll(ruleId)

      request.onerror = () => {
        reject(new Error('Failed to get execution history'))
      }

      request.onsuccess = () => {
        const results = request.result || []
        // 按时间戳降序排序，并限制数量
        results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        resolve(results.slice(0, limit))
      }
    })
  }

  /**
   * 获取所有执行记录
   */
  async getAllExecutions(limit = 100): Promise<ExecutionResult[]> {
    const db = await this.init()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([EXECUTIONS_STORE], 'readonly')
      const store = transaction.objectStore(EXECUTIONS_STORE)
      const request = store.getAll()

      request.onerror = () => {
        reject(new Error('Failed to get executions'))
      }

      request.onsuccess = () => {
        const results = request.result || []
        // 按时间戳降序排序，并限制数量
        results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        resolve(results.slice(0, limit))
      }
    })
  }

  /**
   * 清理过期的执行记录
   */
  async cleanupExecutions(olderThanDays = 30): Promise<number> {
    const db = await this.init()
    const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000)

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([EXECUTIONS_STORE], 'readwrite')
      const store = transaction.objectStore(EXECUTIONS_STORE)
      const request = store.openCursor()
      let deleted = 0

      request.onerror = () => {
        reject(new Error('Failed to cleanup executions'))
      }

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result
        if (cursor) {
          const execution = cursor.value as ExecutionResult
          if (new Date(execution.timestamp) < cutoffDate) {
            cursor.delete()
            deleted++
          }
          cursor.continue()
        } else {
          resolve(deleted)
        }
      }
    })
  }
}

/**
 * 全局数据库实例
 */
export const automationDB = new AutomationDB()

/**
 * 存储适配器 - 用于与自动化引擎集成
 */
export class AutomationStorageAdapter {
  /**
   * 加载所有规则
   */
  async loadRules(): Promise<AutomationRule[]> {
    return automationDB.getAllRules()
  }

  /**
   * 保存规则
   */
  async saveRule(rule: AutomationRule): Promise<void> {
    return automationDB.saveRule(rule)
  }

  /**
   * 删除规则
   */
  async deleteRule(ruleId: string): Promise<void> {
    return automationDB.deleteRule(ruleId)
  }

  /**
   * 保存执行记录
   */
  async saveExecution(result: ExecutionResult): Promise<void> {
    return automationDB.saveExecution(result)
  }

  /**
   * 获取执行历史
   */
  async getExecutionHistory(ruleId: string, limit?: number): Promise<ExecutionResult[]> {
    return automationDB.getExecutionHistory(ruleId, limit)
  }

  /**
   * 清理过期记录
   */
  async cleanup(olderThanDays?: number): Promise<number> {
    return automationDB.cleanupExecutions(olderThanDays)
  }
}

/**
 * 全局存储适配器实例
 */
export const automationStorage = new AutomationStorageAdapter()
