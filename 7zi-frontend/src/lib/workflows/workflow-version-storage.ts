/**
 * Workflow Version Storage
 *
 * 工作流版本历史存储服务
 * 使用 IndexedDB (优先) + localStorage (降级)
 *
 * @version 1.12.0
 */

import { v4 as uuidv4 } from 'uuid'
import { logger } from '@/lib/logger'

export type {
  WorkflowVersion,
  WorkflowDefinition,
  CreateWorkflowVersionDTO,
  RollbackWorkflowDTO,
  WorkflowVersionHistoryQuery,
  WorkflowVersionHistoryResponse,
  RollbackResponse,
} from '@/types/workflow-version'

import type {
  WorkflowVersion,
  WorkflowDefinition,
  CreateWorkflowVersionDTO,
  RollbackWorkflowDTO,
} from '@/types/workflow-version'

// ============================================
// Storage Keys
// ============================================

const DB_NAME = '7zi-workflow-versions'
const DB_VERSION = 1
const STORE_NAME = 'versions'
const LOCAL_STORAGE_KEY = '7zi-workflow-versions'

// ============================================
// Type Guards
// ============================================

function isWorkflowVersion(value: unknown): value is WorkflowVersion {
  if (!value || typeof value !== 'object') {
    return false
  }

  const version = value as WorkflowVersion

  return (
    typeof version.id === 'string' &&
    typeof version.workflowId === 'string' &&
    typeof version.version === 'string' &&
    typeof version.name === 'string' &&
    typeof version.definition === 'object' &&
    typeof version.createdAt === 'string' &&
    typeof version.createdBy === 'string'
  )
}

// ============================================
// IndexedDB Storage Class
// ============================================

class WorkflowVersionIndexedDBStorage {
  private db: IDBDatabase | null = null
  private initPromise: Promise<void> | null = null

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

        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
          store.createIndex('workflowId', 'workflowId', { unique: false })
          store.createIndex('version', 'version', { unique: false })
          store.createIndex('createdAt', 'createdAt', { unique: false })
        }
      }
    })

    return this.initPromise
  }

  async save(version: WorkflowVersion): Promise<void> {
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
      const request = store.put(version)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(new Error(`Failed to save version: ${request.error}`))
    })
  }

  async load(id: string): Promise<WorkflowVersion | null> {
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

        if (!result || !isWorkflowVersion(result)) {
          resolve(null)
          return
        }

        resolve(result)
      }

      request.onerror = () => reject(new Error(`Failed to load version: ${request.error}`))
    })
  }

  async findByWorkflowId(workflowId: string): Promise<WorkflowVersion[]> {
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
      const index = store.index('workflowId')
      const request = index.openCursor(IDBKeyRange.only(workflowId))

      const versions: WorkflowVersion[] = []

      request.onsuccess = () => {
        const cursor = request.result

        if (cursor) {
          const value = cursor.value
          if (isWorkflowVersion(value)) {
            versions.push(value)
          }
          cursor.continue()
        } else {
          // Sort by createdAt descending (newest first)
          versions.sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )
          resolve(versions)
        }
      }

      request.onerror = () => reject(new Error(`Failed to list versions: ${request.error}`))
    })
  }

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
      request.onerror = () => reject(new Error(`Failed to delete version: ${request.error}`))
    })
  }

  async deleteByWorkflowId(workflowId: string): Promise<number> {
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
      const index = store.index('workflowId')
      const request = index.openCursor(IDBKeyRange.only(workflowId))

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

      request.onerror = () => reject(new Error(`Failed to delete versions: ${request.error}`))
    })
  }
}

// ============================================
// LocalStorage Storage Class (Fallback)
// ============================================

class WorkflowVersionLocalStorage {
  private getAll(): Record<string, WorkflowVersion> {
    if (typeof window === 'undefined' || !window.localStorage) {
      return {}
    }

    try {
      const data = localStorage.getItem(LOCAL_STORAGE_KEY)
      const parsed = data ? JSON.parse(data) : {}

      if (!parsed || typeof parsed !== 'object') {
        return {}
      }

      const result: Record<string, WorkflowVersion> = {}
      for (const [key, value] of Object.entries(parsed)) {
        if (isWorkflowVersion(value)) {
          result[key] = value
        }
      }

      return result
    } catch {
      return {}
    }
  }

  private saveAll(versions: Record<string, WorkflowVersion>): void {
    if (typeof window === 'undefined' || !window.localStorage) {
      return
    }

    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(versions))
    } catch (error) {
      logger.warn('[WorkflowVersionStorage] Failed to save versions:', error)
    }
  }

  async save(version: WorkflowVersion): Promise<void> {
    const versions = this.getAll()
    versions[version.id] = version
    this.saveAll(versions)
  }

  async load(id: string): Promise<WorkflowVersion | null> {
    const versions = this.getAll()
    return versions[id] || null
  }

  async findByWorkflowId(workflowId: string): Promise<WorkflowVersion[]> {
    const versions = this.getAll()

    return Object.values(versions)
      .filter((v) => v.workflowId === workflowId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }

  async delete(id: string): Promise<void> {
    const versions = this.getAll()
    delete versions[id]
    this.saveAll(versions)
  }

  async deleteByWorkflowId(workflowId: string): Promise<number> {
    const versions = this.getAll()
    const toDelete = Object.keys(versions).filter((k) => versions[k].workflowId === workflowId)

    toDelete.forEach((k) => delete versions[k])
    this.saveAll(versions)

    return toDelete.length
  }
}

// ============================================
// Storage Manager
// ============================================

export class WorkflowVersionStorageManager {
  private backend!: WorkflowVersionIndexedDBStorage | WorkflowVersionLocalStorage
  private useIndexedDB = false
  private initialized = false

  constructor() {
    if (typeof window !== 'undefined' && window.indexedDB) {
      const indexedDBStorage = new WorkflowVersionIndexedDBStorage()
      indexedDBStorage
        .init()
        .then(() => {
          this.useIndexedDB = true
          this.backend = indexedDBStorage
          this.initialized = true
          logger.debug('[WorkflowVersionStorage] Using IndexedDB')
        })
        .catch(() => {
          this.backend = new WorkflowVersionLocalStorage()
          this.initialized = true
          logger.debug('[WorkflowVersionStorage] Using localStorage')
        })
    } else {
      this.backend = new WorkflowVersionLocalStorage()
      this.initialized = true
    }
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      // Wait a bit for IndexedDB to initialize
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
  }

  /**
   * Create a new version
   */
  async createVersion(
    dto: CreateWorkflowVersionDTO,
    createdBy: string
  ): Promise<WorkflowVersion> {
    await this.ensureInitialized()

    const version: WorkflowVersion = {
      id: uuidv4(),
      workflowId: dto.workflowId,
      version: dto.version,
      name: dto.name,
      description: dto.description,
      definition: dto.definition,
      createdAt: new Date().toISOString(),
      createdBy,
      metadata: {
        changeType: dto.changeType || 'update',
        changeDescription: dto.changeDescription,
        sourceVersion: dto.sourceVersion,
      },
    }

    await this.backend.save(version)
    return version
  }

  /**
   * Get a version by ID
   */
  async getVersion(id: string): Promise<WorkflowVersion | null> {
    await this.ensureInitialized()
    return this.backend.load(id)
  }

  /**
   * Get version history for a workflow
   */
  async getHistory(
    workflowId: string,
    options: {
      page?: number
      pageSize?: number
      changeType?: 'create' | 'update' | 'rollback'
    } = {}
  ): Promise<{
    versions: WorkflowVersion[]
    total: number
    page: number
    pageSize: number
  }> {
    await this.ensureInitialized()

    const { page = 1, pageSize = 20, changeType } = options

    let versions = await this.backend.findByWorkflowId(workflowId)

    // Apply changeType filter
    if (changeType) {
      versions = versions.filter((v) => v.metadata?.changeType === changeType)
    }

    const total = versions.length
    const startIndex = (page - 1) * pageSize
    const paginatedVersions = versions.slice(startIndex, startIndex + pageSize)

    return {
      versions: paginatedVersions,
      total,
      page,
      pageSize,
    }
  }

  /**
   * Get the latest version of a workflow
   */
  async getLatestVersion(workflowId: string): Promise<WorkflowVersion | null> {
    await this.ensureInitialized()

    const versions = await this.backend.findByWorkflowId(workflowId)
    return versions[0] || null
  }

  /**
   * Rollback to a specific version
   */
  async rollback(
    workflowId: string,
    versionId: string,
    rollbackBy: string,
    rollbackReason?: string
  ): Promise<{
    currentVersion: WorkflowVersion
    previousVersion: WorkflowVersion
  }> {
    await this.ensureInitialized()

    // Get the version to rollback to
    const targetVersion = await this.backend.load(versionId)

    if (!targetVersion) {
      throw new Error(`Version not found: ${versionId}`)
    }

    if (targetVersion.workflowId !== workflowId) {
      throw new Error('Version does not belong to this workflow')
    }

    // Get current latest version
    const currentVersion = await this.getLatestVersion(workflowId)

    // Parse version number and increment
    const versionParts = targetVersion.version.split('.')
    const patch = parseInt(versionParts[versionParts.length - 1], 10) + 1
    versionParts[versionParts.length - 1] = patch.toString()
    const newVersion = versionParts.join('.')

    // Create new version as the rollback result
    const rollbackVersion: WorkflowVersion = {
      id: uuidv4(),
      workflowId,
      version: newVersion,
      name: targetVersion.name,
      description: targetVersion.description,
      definition: targetVersion.definition,
      createdAt: new Date().toISOString(),
      createdBy: rollbackBy,
      metadata: {
        changeType: 'rollback',
        changeDescription: rollbackReason || `Rolled back to version ${targetVersion.version}`,
        sourceVersion: targetVersion.version,
      },
    }

    await this.backend.save(rollbackVersion)

    return {
      currentVersion: rollbackVersion,
      previousVersion: currentVersion || targetVersion,
    }
  }

  /**
   * Delete all versions for a workflow
   */
  async deleteWorkflowVersions(workflowId: string): Promise<number> {
    await this.ensureInitialized()
    return this.backend.deleteByWorkflowId(workflowId)
  }
}

// ============================================
// Singleton Instance
// ============================================

let storageManagerInstance: WorkflowVersionStorageManager | null = null

/**
 * Get the workflow version storage manager instance
 */
export function getWorkflowVersionStorage(): WorkflowVersionStorageManager {
  if (!storageManagerInstance) {
    storageManagerInstance = new WorkflowVersionStorageManager()
  }
  return storageManagerInstance
}

// ============================================
// Convenience Functions
// ============================================

export async function createWorkflowVersion(
  dto: CreateWorkflowVersionDTO,
  createdBy: string
): Promise<WorkflowVersion> {
  return getWorkflowVersionStorage().createVersion(dto, createdBy)
}

export async function getWorkflowVersionHistory(
  workflowId: string,
  options?: {
    page?: number
    pageSize?: number
    changeType?: 'create' | 'update' | 'rollback'
  }
): Promise<{
  versions: WorkflowVersion[]
  total: number
  page: number
  pageSize: number
}> {
  return getWorkflowVersionStorage().getHistory(workflowId, options)
}

export async function rollbackWorkflow(
  workflowId: string,
  versionId: string,
  rollbackBy: string,
  rollbackReason?: string
): Promise<{
  currentVersion: WorkflowVersion
  previousVersion: WorkflowVersion
}> {
  return getWorkflowVersionStorage().rollback(workflowId, versionId, rollbackBy, rollbackReason)
}

export async function getWorkflowVersion(
  id: string
): Promise<WorkflowVersion | null> {
  return getWorkflowVersionStorage().getVersion(id)
}

export async function getLatestWorkflowVersion(
  workflowId: string
): Promise<WorkflowVersion | null> {
  return getWorkflowVersionStorage().getLatestVersion(workflowId)
}
