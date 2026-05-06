/**
 * Draft Storage with IndexedDB (and localStorage fallback)
 *
 * 草稿持久化存储，支持:
 * - IndexedDB 优先
 * - localStorage 降级
 * - 自动过期清理 (7天)
 * - 多种类型: workflow, template, execution
 */

import { logger } from '@/lib/logger'
import { generateSecureId } from '@/lib/utils'

/**
 * 草稿类型
 */
export type DraftType = 'workflow' | 'template' | 'execution'

/**
 * 草稿数据接口
 */
export interface Draft<T = unknown> {
  id: string
  type: DraftType
  data: T
  createdAt: number
  updatedAt: number
  expiresAt: number
}

/**
 * 类型安全的 Draft 验证函数
 */
function isDraft<T>(value: unknown): value is Draft<T> {
  if (!value || typeof value !== 'object') {
    return false
  }

  const draft = value as Draft<T>

  return (
    typeof draft.id === 'string' &&
    typeof draft.type === 'string' &&
    typeof draft.createdAt === 'number' &&
    typeof draft.updatedAt === 'number' &&
    typeof draft.expiresAt === 'number' &&
    'data' in draft
  )
}

/**
 * 保存选项
 */
export interface SaveDraftOptions {
  ttl?: number // 过期时间（毫秒），默认7天
}

/**
 * IndexedDB 数据库名和存储名
 */
const DB_NAME = '7zi-drafts'
const DB_VERSION = 1
const STORE_NAME = 'drafts'
const DEFAULT_TTL = 7 * 24 * 60 * 60 * 1000 // 7天

/**
 * IndexedDB 存储类
 */
class IndexedDBStorage {
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

        // 创建 drafts 存储
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
          store.createIndex('type', 'type', { unique: false })
          store.createIndex('createdAt', 'createdAt', { unique: false })
          store.createIndex('expiresAt', 'expiresAt', { unique: false })
        }
      }
    })

    return this.initPromise
  }

  /**
   * 保存草稿
   */
  async save<T = unknown>(draft: Draft<T>): Promise<void> {
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
      const request = store.put(draft)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(new Error(`Failed to save draft: ${request.error}`))
    })
  }

  /**
   * 加载草稿
   */
  async load<T = unknown>(id: string): Promise<Draft<T> | null> {
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
      const request = store.get(id)

      request.onsuccess = () => {
        const result = request.result

        // 使用类型守卫进行安全检查
        if (!result) {
          resolve(null)
          return
        }

        // 验证是否为有效的 Draft 对象
        if (!isDraft<T>(result)) {
          logger.warn('[IndexedDBStorage] Invalid draft structure in database', { id, result })
          resolve(null)
          return
        }

        // 检查是否过期
        if (result.expiresAt && result.expiresAt < Date.now()) {
          this.delete(id).catch(err => {
            logger.warn('[IndexedDBStorage] Failed to delete expired draft:', err)
          })
          resolve(null)
          return
        }

        resolve(result)
      }
      request.onerror = () => reject(new Error(`Failed to load draft: ${request.error}`))
    })
  }

  /**
   * 列出草稿
   */
  async list<T = unknown>(type?: DraftType): Promise<Draft<T>[]> {
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
      if (type) {
        const index = store.index('type')
        cursor = index.openCursor(IDBKeyRange.only(type))
      } else {
        cursor = store.openCursor()
      }

      const drafts: Draft<T>[] = []

      cursor.onsuccess = () => {
        const result = cursor.result
        if (result) {
          const value = result.value

          // 使用类型守卫验证数据结构
          if (isDraft<T>(value)) {
            // 过滤过期草稿
            if (!value.expiresAt || value.expiresAt > Date.now()) {
              drafts.push(value)
            }
          } else {
            logger.warn('[IndexedDBStorage] Invalid draft structure in list', { value })
          }

          result.continue()
        } else {
          resolve(drafts)
        }
      }

      cursor.onerror = () => reject(new Error(`Failed to list drafts: ${cursor.error}`))
    })
  }

  /**
   * 删除草稿
   */
  async delete(id: string): Promise<void> {
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
      const request = store.delete(id)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(new Error(`Failed to delete draft: ${request.error}`))
    })
  }

  /**
   * 清理过期草稿
   */
  async clearExpired(): Promise<number> {
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
      const index = store.index('expiresAt')
      const request = index.openCursor(IDBKeyRange.upperBound(Date.now()))

      let count = 0

      request.onsuccess = () => {
        const cursor = request.result
        if (cursor) {
          cursor.delete()
          count++
          cursor.continue()
        } else {
          resolve(count)
        }
      }

      request.onerror = () => reject(new Error(`Failed to clear expired drafts: ${request.error}`))
    })
  }

  /**
   * 清空所有草稿
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
      request.onerror = () => reject(new Error(`Failed to clear drafts: ${request.error}`))
    })
  }
}

/**
 * localStorage 存储类（降级方案）
 */
class LocalStorageStorage {
  private readonly STORAGE_KEY = '7zi-drafts'

  /**
   * 获取所有草稿（原始数据）
   */
  private getRawAll(): unknown {
    if (typeof window === 'undefined' || !window.localStorage) {
      return {}
    }

    try {
      const data = localStorage.getItem(this.STORAGE_KEY)
      return data ? JSON.parse(data) : {}
    } catch {
      return {}
    }
  }

  /**
   * 获取所有草稿（类型安全）
   */
  private getAll(): Record<string, Draft> {
    const raw = this.getRawAll()

    if (!raw || typeof raw !== 'object') {
      return {}
    }

    const record = raw as Record<string, unknown>
    const result: Record<string, Draft> = {}

    for (const [key, value] of Object.entries(record)) {
      if (isDraft(value)) {
        result[key] = value
      } else {
        logger.warn('[LocalStorageStorage] Invalid draft structure in storage', { key, value })
      }
    }

    return result
  }

  /**
   * 保存所有草稿
   */
  private saveAll(drafts: Record<string, Draft>): void {
    if (typeof window === 'undefined' || !window.localStorage) {
      return
    }

    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(drafts))
    } catch (error) {
      logger.warn('[LocalStorageStorage] Failed to save drafts:', error)
    }
  }

  /**
   * 保存草稿
   */
  async save<T = unknown>(draft: Draft<T>): Promise<void> {
    const drafts = this.getAll()

    // 创建一个符合 Draft 接口的对象
    const safeDraft: Draft = {
      id: draft.id,
      type: draft.type,
      data: draft.data,
      createdAt: draft.createdAt,
      updatedAt: draft.updatedAt,
      expiresAt: draft.expiresAt,
    }

    drafts[draft.id] = safeDraft
    this.saveAll(drafts)
  }

  /**
   * 加载草稿
   */
  async load<T = unknown>(id: string): Promise<Draft<T> | null> {
    const drafts = this.getAll()
    const draft = drafts[id]

    if (!draft) {
      return null
    }

    // 检查是否过期
    if (draft.expiresAt && draft.expiresAt < Date.now()) {
      this.delete(id)
      return null
    }

    // 返回类型安全的草稿（data 被视为 T 类型）
    return draft as Draft<T>
  }

  /**
   * 列出草稿
   */
  async list<T = unknown>(type?: DraftType): Promise<Draft<T>[]> {
    const drafts = this.getAll()
    const now = Date.now()

    return Object.values(drafts)
      .filter(draft => {
        // 过滤类型
        if (type && draft.type !== type) {
          return false
        }

        // 过滤过期
        if (draft.expiresAt && draft.expiresAt < now) {
          return false
        }

        return true
      }) as Draft<T>[]
  }

  /**
   * 删除草稿
   */
  async delete(id: string): Promise<void> {
    const drafts = this.getAll()
    delete drafts[id]
    this.saveAll(drafts)
  }

  /**
   * 清理过期草稿
   */
  async clearExpired(): Promise<number> {
    const drafts = this.getAll()
    const now = Date.now()
    let count = 0

    for (const [id, draft] of Object.entries(drafts)) {
      if (draft.expiresAt && draft.expiresAt < now) {
        delete drafts[id]
        count++
      }
    }

    this.saveAll(drafts)
    return count
  }

  /**
   * 清空所有草稿
   */
  async clear(): Promise<void> {
    if (typeof window === 'undefined' || !window.localStorage) {
      return
    }

    try {
      localStorage.removeItem(this.STORAGE_KEY)
    } catch (error) {
      logger.warn('[LocalStorageStorage] Failed to clear drafts:', error)
    }
  }
}

/**
 * 草稿存储接口
 */
interface DraftStorageBackend {
  save<T>(draft: Draft<T>): Promise<void>
  load<T>(id: string): Promise<Draft<T> | null>
  list<T>(type?: DraftType): Promise<Draft<T>[]>
  delete(id: string): Promise<void>
  clearExpired(): Promise<number>
  clear(): Promise<void>
}

/**
 * 草稿存储管理器（自动选择存储后端）
 */
export class DraftStorageManager {
  private backend!: DraftStorageBackend
  private useIndexedDB = false

  constructor() {
    // 尝试使用 IndexedDB，失败则使用 localStorage
    if (typeof window !== 'undefined' && window.indexedDB) {
      const indexedDBStorage = new IndexedDBStorage()
      indexedDBStorage
        .init()
        .then(() => {
          this.useIndexedDB = true
          this.backend = indexedDBStorage
          
        })
        .catch((error) => {
          logger.warn('[DraftStorageManager] IndexedDB not available, falling back to localStorage:', error)
          this.backend = new LocalStorageStorage()
        })
    } else {
      this.backend = new LocalStorageStorage()
      logger.warn('[DraftStorageManager] IndexedDB not available, using localStorage')
    }
  }

  /**
   * 保存草稿
   */
  async saveDraft<T = unknown>(
    type: DraftType,
    data: T,
    options: SaveDraftOptions = {}
  ): Promise<string> {
    const ttl = options.ttl !== undefined ? options.ttl : DEFAULT_TTL
    const now = Date.now()

    const draft: Draft<T> = {
      id: this.generateId(type),
      type,
      data,
      createdAt: now,
      updatedAt: now,
      expiresAt: now + ttl,
    }

    await this.backend.save(draft)
    return draft.id
  }

  /**
   * 加载草稿
   */
  async loadDraft<T = unknown>(id: string): Promise<Draft<T> | null> {
    return this.backend.load<T>(id)
  }

  /**
   * 列出草稿
   */
  async listDrafts<T = unknown>(type?: DraftType): Promise<Draft<T>[]> {
    return this.backend.list<T>(type)
  }

  /**
   * 删除草稿
   */
  async deleteDraft(id: string): Promise<void> {
    return this.backend.delete(id)
  }

  /**
   * 清理过期草稿
   */
  async clearExpiredDrafts(): Promise<number> {
    return this.backend.clearExpired()
  }

  /**
   * 更新草稿数据
   */
  async updateDraft<T = unknown>(id: string, data: Partial<T>): Promise<void> {
    const draft = await this.loadDraft<T>(id)
    if (!draft) {
      throw new Error(`Draft not found: ${id}`)
    }

    let updatedData: T

    // 安全地合并数据
    if (
      typeof draft.data === 'object' &&
      draft.data !== null &&
      !Array.isArray(draft.data) &&
      typeof data === 'object' &&
      data !== null
    ) {
      // 对象类型：浅合并
      updatedData = { ...draft.data, ...data } as T
    } else if (Object.keys(data).length > 0) {
      // 非对象类型或 data 是对象但 draft.data 不是对象
      // 这种情况下，我们只能假设 data 就是完整的 T 类型
      // 这是一个合理的妥协，因为 updateDraft 的签名要求 Partial<T>
      // 调用者需要确保传入的数据是正确的
      updatedData = data as T
    } else {
      // data 为空对象，保持原数据不变
      updatedData = draft.data
    }

    const updatedDraft: Draft<T> = {
      ...draft,
      data: updatedData,
      updatedAt: Date.now(),
    }

    await this.backend.save(updatedDraft)
  }

  /**
   * 清空所有草稿
   */
  async clearAllDrafts(): Promise<void> {
    return this.backend.clear()
  }

  /**
   * 检查存储后端
   */
  getBackend(): 'indexeddb' | 'localstorage' {
    return this.useIndexedDB ? 'indexeddb' : 'localstorage'
  }

  /**
   * 生成唯一 ID
   */
  private generateId(type: DraftType): string {
    const typePrefix = type.substring(0, 2).toUpperCase()
    return `DRAFT-${typePrefix}-${generateSecureId()}`
  }
}

/**
 * 单例实例
 */
let draftStorageManagerInstance: DraftStorageManager | null = null

/**
 * 获取草稿存储管理器实例
 */
export function getDraftStorageManager(): DraftStorageManager {
  if (!draftStorageManagerInstance) {
    draftStorageManagerInstance = new DraftStorageManager()
  }
  return draftStorageManagerInstance
}

/**
 * 便捷函数 - 保存草稿
 */
export async function saveDraft<T = unknown>(
  type: DraftType,
  data: T,
  options?: SaveDraftOptions
): Promise<string> {
  return getDraftStorageManager().saveDraft(type, data, options)
}

/**
 * 便捷函数 - 加载草稿
 */
export async function loadDraft<T = unknown>(id: string): Promise<Draft<T> | null> {
  return getDraftStorageManager().loadDraft<T>(id)
}

/**
 * 便捷函数 - 列出草稿
 */
export async function listDrafts<T = unknown>(type?: DraftType): Promise<Draft<T>[]> {
  return getDraftStorageManager().listDrafts<T>(type)
}

/**
 * 便捷函数 - 删除草稿
 */
export async function deleteDraft(id: string): Promise<void> {
  return getDraftStorageManager().deleteDraft(id)
}

/**
 * 便捷函数 - 清理过期草稿
 */
export async function clearExpiredDrafts(): Promise<number> {
  return getDraftStorageManager().clearExpiredDrafts()
}

/**
 * 便捷函数 - 更新草稿
 */
export async function updateDraft<T = unknown>(id: string, data: Partial<T>): Promise<void> {
  return getDraftStorageManager().updateDraft(id, data)
}

/**
 * 便捷函数 - 清空所有草稿
 */
export async function clearAllDrafts(): Promise<void> {
  return getDraftStorageManager().clearAllDrafts()
}

/**
 * 初始化并清理过期草稿（页面加载时调用）
 */
export async function initializeDraftStorage(): Promise<void> {
  const manager = getDraftStorageManager()
  const cleared = await manager.clearExpiredDrafts()

  if (cleared > 0) {
    logger.debug(`[DraftStorage] Cleaned up ${cleared} expired draft(s)`)
  }
}
