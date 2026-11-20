/**
 * Draft Storage - IndexedDB 封装
 * 用于工作流草稿的持久化存储
 * 
 * 功能:
 * - 自动保存工作流草稿
 * - 草稿列表管理
 * - 离线支持
 * - 数据迁移
 */

import { WorkflowDefinition, WorkflowStatus } from '@/types/workflow'

/**
 * 草稿元数据
 */
export interface DraftMetadata {
  id: string
  name: string
  description?: string
  createdAt: string
  updatedAt: string
  autoSaved: boolean
  version: number
}

/**
 * 草稿完整数据
 */
export interface WorkflowDraft {
  id: string
  name: string
  description?: string
  workflow: WorkflowDefinition
  createdAt: string
  updatedAt: string
  autoSaved: boolean
  version: number
}

/**
 * IndexedDB 数据库配置
 */
const DB_NAME = 'workflow_drafts_db'
const DB_VERSION = 1
const DRAFTS_STORE = 'drafts'
const METADATA_STORE = 'metadata'

/**
 * DraftStorage 类
 * 封装 IndexedDB 操作,提供类型安全的草稿管理
 */
export class DraftStorage {
  private db: IDBDatabase | null = null
  private initPromise: Promise<void> | null = null

  /**
   * 初始化数据库
   */
  async init(): Promise<void> {
    if (this.db) return
    if (this.initPromise) return this.initPromise

    this.initPromise = new Promise((resolve, reject) => {
      // 检查 IndexedDB 支持
      if (typeof indexedDB === 'undefined') {
        reject(new Error('IndexedDB is not supported in this environment'))
        return
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => {
        reject(new Error(`Failed to open database: ${request.error?.message}`))
      }

      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // 创建草稿存储
        if (!db.objectStoreNames.contains(DRAFTS_STORE)) {
          const draftStore = db.createObjectStore(DRAFTS_STORE, { keyPath: 'id' })
          draftStore.createIndex('updatedAt', 'updatedAt', { unique: false })
          draftStore.createIndex('name', 'name', { unique: false })
        }

        // 创建元数据存储
        if (!db.objectStoreNames.contains(METADATA_STORE)) {
          const metadataStore = db.createObjectStore(METADATA_STORE, { keyPath: 'id' })
          metadataStore.createIndex('updatedAt', 'updatedAt', { unique: false })
        }
      }
    })

    return this.initPromise
  }

  /**
   * 检查数据库是否可用
   */
  async isAvailable(): Promise<boolean> {
    try {
      await this.init()
      return true
    } catch {
      return false
    }
  }

  /**
   * 保存草稿
   */
  async saveDraft(draft: WorkflowDraft): Promise<void> {
    await this.init()
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([DRAFTS_STORE, METADATA_STORE], 'readwrite')
      
      // 保存完整草稿
      const draftStore = transaction.objectStore(DRAFTS_STORE)
      const draftRequest = draftStore.put(draft)

      // 保存元数据
      const metadata: DraftMetadata = {
        id: draft.id,
        name: draft.name,
        description: draft.description,
        createdAt: draft.createdAt,
        updatedAt: draft.updatedAt,
        autoSaved: draft.autoSaved,
        version: draft.version,
      }
      const metadataStore = transaction.objectStore(METADATA_STORE)
      metadataStore.put(metadata)

      draftRequest.onsuccess = () => resolve()
      draftRequest.onerror = () => reject(new Error(`Failed to save draft: ${draftRequest.error?.message}`))
    })
  }

  /**
   * 获取草稿
   */
  async getDraft(id: string): Promise<WorkflowDraft | null> {
    await this.init()
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(DRAFTS_STORE, 'readonly')
      const store = transaction.objectStore(DRAFTS_STORE)
      const request = store.get(id)

      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => reject(new Error(`Failed to get draft: ${request.error?.message}`))
    })
  }

  /**
   * 获取所有草稿元数据
   */
  async getAllDraftMetadata(): Promise<DraftMetadata[]> {
    await this.init()
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(METADATA_STORE, 'readonly')
      const store = transaction.objectStore(METADATA_STORE)
      const request = store.getAll()

      request.onsuccess = () => {
        const results = request.result || []
        // 按更新时间降序排序
        results.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        resolve(results)
      }
      request.onerror = () => reject(new Error(`Failed to get draft metadata: ${request.error?.message}`))
    })
  }

  /**
   * 删除草稿
   */
  async deleteDraft(id: string): Promise<void> {
    await this.init()
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([DRAFTS_STORE, METADATA_STORE], 'readwrite')
      
      const draftStore = transaction.objectStore(DRAFTS_STORE)
      const draftRequest = draftStore.delete(id)

      const metadataStore = transaction.objectStore(METADATA_STORE)
      metadataStore.delete(id)

      draftRequest.onsuccess = () => resolve()
      draftRequest.onerror = () => reject(new Error(`Failed to delete draft: ${draftRequest.error?.message}`))
    })
  }

  /**
   * 清空所有草稿
   */
  async clearAllDrafts(): Promise<void> {
    await this.init()
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([DRAFTS_STORE, METADATA_STORE], 'readwrite')
      
      const draftStore = transaction.objectStore(DRAFTS_STORE)
      const clearDrafts = draftStore.clear()

      const metadataStore = transaction.objectStore(METADATA_STORE)
      metadataStore.clear()

      clearDrafts.onsuccess = () => resolve()
      clearDrafts.onerror = () => reject(new Error(`Failed to clear drafts: ${clearDrafts.error?.message}`))
    })
  }

  /**
   * 从 WorkflowDefinition 创建草稿
   */
  createDraftFromWorkflow(workflow: WorkflowDefinition, autoSaved: boolean = false): WorkflowDraft {
    const now = new Date().toISOString()
    return {
      id: workflow.id,
      name: workflow.name,
      description: workflow.description,
      workflow: {
        ...workflow,
        status: WorkflowStatus.DRAFT,
        metadata: {
          ...workflow.metadata,
          updatedAt: now,
        },
      },
      createdAt: workflow.metadata?.createdAt || now,
      updatedAt: now,
      autoSaved,
      version: workflow.version,
    }
  }

  /**
   * 关闭数据库连接
   */
  close(): void {
    if (this.db) {
      this.db.close()
      this.db = null
      this.initPromise = null
    }
  }
}

// 单例实例
let draftStorageInstance: DraftStorage | null = null

/**
 * 获取 DraftStorage 单例
 */
export function getDraftStorage(): DraftStorage {
  if (!draftStorageInstance) {
    draftStorageInstance = new DraftStorage()
  }
  return draftStorageInstance
}

/**
 * 检查 IndexedDB 是否可用
 */
export async function isIndexedDBAvailable(): Promise<boolean> {
  try {
    const storage = getDraftStorage()
    return await storage.isAvailable()
  } catch {
    return false
  }
}
