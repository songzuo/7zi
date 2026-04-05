/**
 * Draft Storage - IndexedDB 封装
 * 
 * 用于工作流草稿的持久化存储
 * 
 * @package 7zi-frontend
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb'

/**
 * 工作流草稿数据类型
 */
export interface WorkflowDraft {
  /** 草稿唯一标识 */
  id: string
  /** 工作流 ID */
  workflowId: string
  /** 草稿名称 */
  name: string
  /** 节点数据 */
  nodes: Array<{
    id: string
    type: string
    position: { x: number; y: number }
    data: Record<string, unknown>
  }>
  /** 边数据 */
  edges: Array<{
    id: string
    source: string
    target: string
    sourceHandle?: string
    targetHandle?: string
    data?: Record<string, unknown>
  }>
  /** 变量 */
  variables?: Array<{
    name: string
    type: string
    defaultValue?: unknown
  }>
  /** 元数据 */
  metadata?: {
    createdAt?: string
    updatedAt?: string
    createdBy?: string
    description?: string
  }
  /** 自动保存时间戳 */
  autoSavedAt?: string
}

/**
 * 数据库 schema 定义
 */
interface WorkflowDraftDB extends DBSchema {
  drafts: {
    key: string
    value: WorkflowDraft
    indexes: {
      'by-workflow': string
      'by-updated': string
    }
  }
}

/**
 * 数据库名称和版本
 */
const DB_NAME = '7zi-workflow-drafts'
const DB_VERSION = 1

/**
 * 草稿配置
 */
const DRAFT_CONFIG = {
  /** 最大草稿数量 */
  MAX_DRAFTS: 50,
  /** 数据库是否可用 */
  isAvailable: true,
}

/**
 * 获取数据库实例
 */
let dbPromise: Promise<IDBPDatabase<WorkflowDraftDB>> | null = null

/**
 * 初始化数据库
 */
async function getDB(): Promise<IDBPDatabase<WorkflowDraftDB>> {
  if (!dbPromise) {
    dbPromise = openDB<WorkflowDraftDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // 创建草稿存储区
        if (!db.objectStoreNames.contains('drafts')) {
          const store = db.createObjectStore('drafts', { keyPath: 'id' })
          
          // 创建索引
          store.createIndex('by-workflow', 'workflowId', { unique: false })
          store.createIndex('by-updated', 'metadata.updatedAt', { unique: false })
        }
      },
    })
  }
  return dbPromise
}

/**
 * Draft Storage API
 */
export const draftStorage = {
  /**
   * 保存草稿
   * 
   * @param workflowId - 工作流 ID
   * @param data - 草稿数据
   * @returns 保存后的草稿
   */
  async saveDraft(workflowId: string, data: Omit<WorkflowDraft, 'id' | 'workflowId' | 'metadata'> & { metadata?: Partial<WorkflowDraft['metadata']> }): Promise<WorkflowDraft> {
    try {
      const db = await getDB()
      const now = new Date().toISOString()
      
      // 检查是否已存在草稿
      const existing = await this.loadDraft(workflowId)
      
      const draft: WorkflowDraft = {
        id: existing?.id || `draft-${workflowId}-${Date.now()}`,
        workflowId,
        name: data.name || '未命名草稿',
        nodes: data.nodes || [],
        edges: data.edges || [],
        variables: data.variables,
        metadata: {
          createdAt: existing?.metadata?.createdAt || now,
          updatedAt: now,
          ...data.metadata,
        },
        autoSavedAt: now,
      }
      
      await db.put('drafts', draft)
      
      // 自动清理最旧的草稿
      await this.cleanupOldDrafts(workflowId)
      
      console.log(`[DraftStorage] 草稿已保存: ${draft.id}`)
      return draft
    } catch (error) {
      console.error('[DraftStorage] 保存草稿失败:', error)
      throw new Error(`保存草稿失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  },

  /**
   * 加载草稿
   * 
   * @param workflowId - 工作流 ID
   * @returns 草稿数据，不存在则返回 null
   */
  async loadDraft(workflowId: string): Promise<WorkflowDraft | null> {
    try {
      const db = await getDB()
      
      // 使用索引查找
      const tx = db.transaction('drafts', 'readonly')
      const index = tx.store.index('by-workflow')
      const cursor = await index.openCursor(IDBKeyRange.only(workflowId))
      
      if (cursor) {
        console.log(`[DraftStorage] 草稿已加载: ${cursor.value.id}`)
        return cursor.value
      }
      
      return null
    } catch (error) {
      console.error('[DraftStorage] 加载草稿失败:', error)
      throw new Error(`加载草稿失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  },

  /**
   * 删除草稿
   * 
   * @param workflowId - 工作流 ID
   * @returns 是否删除成功
   */
  async deleteDraft(workflowId: string): Promise<boolean> {
    try {
      const db = await getDB()
      
      // 查找并删除
      const tx = db.transaction('drafts', 'readwrite')
      const index = tx.store.index('by-workflow')
      const cursor = await index.openCursor(IDBKeyRange.only(workflowId))
      
      if (cursor) {
        await cursor.delete()
        console.log(`[DraftStorage] 草稿已删除: ${cursor.value.id}`)
        return true
      }
      
      return false
    } catch (error) {
      console.error('[DraftStorage] 删除草稿失败:', error)
      throw new Error(`删除草稿失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  },

  /**
   * 列出所有草稿
   * 
   * @returns 所有草稿列表
   */
  async listDrafts(): Promise<WorkflowDraft[]> {
    try {
      const db = await getDB()
      const drafts = await db.getAllFromIndex('drafts', 'by-updated')
      
      // 按更新时间倒序排列
      return drafts.sort((a, b) => {
        const dateA = new Date(a.metadata?.updatedAt || 0).getTime()
        const dateB = new Date(b.metadata?.updatedAt || 0).getTime()
        return dateB - dateA
      })
    } catch (error) {
      console.error('[DraftStorage] 列出草稿失败:', error)
      throw new Error(`列出草稿失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  },

  /**
   * 检查是否存在草稿
   * 
   * @param workflowId - 工作流 ID
   * @returns 是否存在草稿
   */
  async hasDraft(workflowId: string): Promise<boolean> {
    try {
      const draft = await this.loadDraft(workflowId)
      return draft !== null
    } catch {
      return false
    }
  },

  /**
   * 清空所有草稿
   * 
   * @returns 删除的草稿数量
   */
  async clearAllDrafts(): Promise<number> {
    try {
      const db = await getDB()
      const drafts = await db.getAll('drafts')
      const tx = db.transaction('drafts', 'readwrite')
      
      for (const draft of drafts) {
        await tx.store.delete(draft.id)
      }
      
      await tx.done
      console.log(`[DraftStorage] 已清空所有草稿，共 ${drafts.length} 个`)
      return drafts.length
    } catch (error) {
      console.error('[DraftStorage] 清空草稿失败:', error)
      throw new Error(`清空草稿失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  },

  /**
   * 清理最旧的草稿，确保不超过最大数量限制
   * 
   * @param keepWorkflowId - 需要保留的草稿 workflowId（可选）
   * @returns 删除的草稿数量
   */
  async cleanupOldDrafts(keepWorkflowId?: string): Promise<number> {
    try {
      const db = await getDB()
      const allDrafts = await db.getAll('drafts')
      
      // 如果没有超过限制，不需要清理
      if (allDrafts.length <= DRAFT_CONFIG.MAX_DRAFTS) {
        return 0
      }
      
      // 按更新时间排序，最旧的排在前面
      const sortedDrafts = allDrafts.sort((a, b) => {
        const dateA = new Date(a.metadata?.updatedAt || 0).getTime()
        const dateB = new Date(b.metadata?.updatedAt || 0).getTime()
        return dateA - dateB
      })
      
      // 需要删除的数量
      const deleteCount = allDrafts.length - DRAFT_CONFIG.MAX_DRAFTS
      let deletedCount = 0
      
      const tx = db.transaction('drafts', 'readwrite')
      
      for (let i = 0; i < deleteCount; i++) {
        const draft = sortedDrafts[i]
        // 如果这个草稿是需要保留的，跳过
        if (keepWorkflowId && draft.workflowId === keepWorkflowId) {
          continue
        }
        await tx.store.delete(draft.id)
        deletedCount++
      }
      
      await tx.done
      
      if (deletedCount > 0) {
        console.log(`[DraftStorage] 已清理 ${deletedCount} 个最旧的草稿`)
      }
      
      return deletedCount
    } catch (error) {
      console.error('[DraftStorage] 清理草稿失败:', error)
      throw new Error(`清理草稿失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  },

  /**
   * 获取当前草稿数量
   * 
   * @returns 草稿数量
   */
  async getDraftCount(): Promise<number> {
    try {
      const db = await getDB()
      const drafts = await db.getAll('drafts')
      return drafts.length
    } catch {
      return 0
    }
  },
}

// 导出配置
export const draftConfig = DRAFT_CONFIG
