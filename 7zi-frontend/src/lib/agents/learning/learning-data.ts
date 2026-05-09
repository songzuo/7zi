/**
 * Learning Data Persistence
 *
 * Enhanced data persistence with compression and incremental sync
 *
 * @module learning-data
 */

import type { AgentId, TaskType, TaskHistoryRecord, AgentLearningStats } from './types'
import { generateSecureId } from '@/lib/utils'
import { TaskTimePredictor } from './time-prediction'
import { AgentCapabilityAssessor, CapabilityAssessmentResult } from './agent-capability'
import { logger } from '../../logger'

/**
 * Learning data version for migration support
 */
const CURRENT_VERSION = '1.0.0'

/**
 * Compressed task record for storage
 */
interface CompressedTaskRecord {
  /**
   * Delta-encoded values for efficiency
   */
  d: number[] // [timestamp_delta, execution_time, input_size?]
  /**
   * Indexes into lookup tables
   */
  i: number[] // [agent_idx, task_type_idx, status_idx]
}

/**
 * Learning data state for persistence
 */
export interface LearningState {
  version: string
  timestamp: number

  // Task history (compressed)
  compressedHistory: CompressedTaskRecord[]

  // Lookup tables for compression
  lookupTables: {
    agents: AgentId[]
    taskTypes: TaskType[]
    statuses: ('completed' | 'failed' | 'cancelled')[]
  }

  // Time prediction model data
  timePredictionData: unknown

  // Capability assessment data
  capabilityData: unknown

  // Statistics summary
  summary: {
    totalTasks: number
    uniqueAgents: number
    uniqueTaskTypes: number
    dateRange: { start: number; end: number }
  }
}

/**
 * Sync status for incremental sync
 */
export interface SyncStatus {
  lastSyncTime: number
  lastSyncedTaskId: string
  pendingChanges: number
  syncInProgress: boolean
  lastError?: string
}

/**
 * Persistence configuration
 */
interface PersistenceConfig {
  /**
   * Storage key for local storage
   */
  storageKey: string

  /**
   * Maximum history size to keep
   */
  maxHistorySize: number

  /**
   * Enable compression
   */
  enableCompression: boolean

  /**
   * Auto-save interval (ms)
   */
  autoSaveInterval: number

  /**
   * Server sync endpoint
   */
  syncEndpoint?: string

  /**
   * Enable server sync
   */
  enableServerSync: boolean
}

/**
 * Learning Data Persistence Manager
 *
 * Features:
 * - Data compression for efficient storage
 * - Incremental sync to server
 * - Auto-save with debouncing
 * - Data migration support
 */
export class LearningPersistence {
  private taskHistory: TaskHistoryRecord[] = []
  private timePredictor?: TaskTimePredictor
  private capabilityAssessor?: AgentCapabilityAssessor

  private syncStatus: SyncStatus = {
    lastSyncTime: 0,
    lastSyncedTaskId: '',
    pendingChanges: 0,
    syncInProgress: false,
  }

  private config: PersistenceConfig
  private autoSaveTimer?: NodeJS.Timeout
  private hasUnsavedChanges = false

  constructor(
    config?: Partial<PersistenceConfig>,
    timePredictor?: TaskTimePredictor,
    capabilityAssessor?: AgentCapabilityAssessor
  ) {
    this.config = {
      storageKey: 'scheduler-learning-v1',
      maxHistorySize: 5000,
      enableCompression: true,
      autoSaveInterval: 60000, // 1 minute
      enableServerSync: false,
      ...config,
    }

    this.timePredictor = timePredictor
    this.capabilityAssessor = capabilityAssessor
  }

  /**
   * Initialize persistence from stored data
   */
  async initialize(): Promise<LearningState | null> {
    try {
      // Load from local storage
      const stored = this.loadFromStorage()
      if (stored) {
        await this.restoreState(stored)
        return stored
      }

      return null
    } catch (error) {
      logger.error('[LearningPersistence] Initialize failed', error instanceof Error ? error : new Error(String(error)))
      return null
    }
  }

  /**
   * Save current state
   */
  async save(): Promise<void> {
    try {
      const state = await this.compressState()
      this.saveToStorage(state)
      this.hasUnsavedChanges = false

      // Sync to server if enabled
      if (this.config.enableServerSync) {
        await this.syncToServer(state)
      }
    } catch (error) {
      logger.error('[LearningPersistence] Save failed', error instanceof Error ? error : new Error(String(error)))
      throw error
    }
  }

  /**
   * Add task record
   */
  addTaskRecord(record: TaskHistoryRecord): void {
    this.taskHistory.push(record)

    // Trim if too large
    if (this.taskHistory.length > this.config.maxHistorySize) {
      this.taskHistory = this.taskHistory.slice(-this.config.maxHistorySize)
    }

    this.hasUnsavedChanges = true

    // Update sync status
    this.syncStatus.pendingChanges++
  }

  /**
   * Get task history
   */
  getTaskHistory(agentId?: AgentId, taskType?: TaskType, limit?: number): TaskHistoryRecord[] {
    let history = this.taskHistory

    if (agentId) {
      history = history.filter(h => h.agentId === agentId)
    }
    if (taskType) {
      history = history.filter(h => h.taskType === taskType)
    }
    if (limit) {
      history = history.slice(-limit)
    }

    return history
  }

  /**
   * Get sync status
   */
  getSyncStatus(): SyncStatus {
    return { ...this.syncStatus }
  }

  /**
   * Force sync to server
   */
  async forceSync(): Promise<boolean> {
    if (!this.config.enableServerSync || this.syncStatus.syncInProgress) {
      return false
    }

    this.syncStatus.syncInProgress = true

    try {
      const state = await this.compressState()
      await this.syncToServer(state)

      this.syncStatus.lastSyncTime = Date.now()
      this.syncStatus.pendingChanges = 0
      this.syncStatus.syncInProgress = false

      return true
    } catch (error) {
      this.syncStatus.syncInProgress = false
      this.syncStatus.lastError = String(error)
      return false
    }
  }

  /**
   * Export all data as JSON string
   */
  async exportData(): Promise<string> {
    const state = await this.compressState()
    return JSON.stringify(state)
  }

  /**
   * Import data from JSON string
   */
  async importData(data: string): Promise<void> {
    const state = JSON.parse(data) as LearningState
    await this.restoreState(state)
    await this.save()
  }

  /**
   * Clear all data
   */
  async clear(): Promise<void> {
    this.taskHistory = []
    this.timePredictor?.clear()
    this.capabilityAssessor?.clear()
    this.hasUnsavedChanges = false

    // Clear storage
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(this.config.storageKey)
    }
  }

  /**
   * Start auto-save
   */
  startAutoSave(): void {
    if (this.autoSaveTimer) return

    this.autoSaveTimer = setInterval(() => {
      if (this.hasUnsavedChanges) {
        this.save().catch(err => logger.error('[LearningPersistence] Auto-save failed', err instanceof Error ? err : new Error(String(err))))
      }
    }, this.config.autoSaveInterval)
  }

  /**
   * Stop auto-save
   */
  stopAutoSave(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer)
      this.autoSaveTimer = undefined
    }
  }

  /**
   * Compress state for storage
   */
  private async compressState(): Promise<LearningState> {
    // Build lookup tables
    const agentSet = new Set<AgentId>()
    const taskTypeSet = new Set<TaskType>()
    const statusSet = new Set<'completed' | 'failed' | 'cancelled'>()

    for (const record of this.taskHistory) {
      agentSet.add(record.agentId)
      taskTypeSet.add(record.taskType)
      statusSet.add(record.status)
    }

    const lookupTables = {
      agents: Array.from(agentSet),
      taskTypes: Array.from(taskTypeSet),
      statuses: Array.from(statusSet),
    }

    // Compress task records
    const compressedHistory: CompressedTaskRecord[] = []
    let lastTimestamp = 0

    for (const record of this.taskHistory) {
      const timestampDelta = record.completedAt - lastTimestamp
      lastTimestamp = record.completedAt

      compressedHistory.push({
        d: [timestampDelta, record.executionTime, record.inputSize, record.agentLoadAtStart].filter(
          v => v !== undefined
        ),
        i: [
          lookupTables.agents.indexOf(record.agentId),
          lookupTables.taskTypes.indexOf(record.taskType),
          lookupTables.statuses.indexOf(record.status),
        ],
      })
    }

    // Get model data
    const timePredictionData = this.timePredictor?.exportData()
    const capabilityData = this.capabilityAssessor?.exportData()

    // Build summary
    const summary = {
      totalTasks: this.taskHistory.length,
      uniqueAgents: lookupTables.agents.length,
      uniqueTaskTypes: lookupTables.taskTypes.length,
      dateRange: {
        start: this.taskHistory[0]?.createdAt || 0,
        end: this.taskHistory[this.taskHistory.length - 1]?.completedAt || 0,
      },
    }

    return {
      version: CURRENT_VERSION,
      timestamp: Date.now(),
      compressedHistory,
      lookupTables,
      timePredictionData,
      capabilityData,
      summary,
    }
  }

  /**
   * Restore state from compressed data
   */
  private async restoreState(state: LearningState): Promise<void> {
    // Version check
    if (state.version !== CURRENT_VERSION) {
      // Future: handle migration
      console.warn(`[LearningPersistence] Version mismatch: ${state.version} vs ${CURRENT_VERSION}`)
    }

    // Restore task history
    this.taskHistory = []
    let currentTimestamp = 0

    for (const compressed of state.compressedHistory) {
      const [timestampDelta, executionTime, inputSize, agentLoadAtStart] = compressed.d
      const [agentIdx, taskTypeIdx, statusIdx] = compressed.i

      currentTimestamp += timestampDelta

      const record: TaskHistoryRecord = {
        taskId: generateSecureId('task'),
        taskType: state.lookupTables.taskTypes[taskTypeIdx],
        agentId: state.lookupTables.agents[agentIdx],
        createdAt: currentTimestamp - executionTime, // Approximate
        startedAt: currentTimestamp - executionTime, // Approximate
        completedAt: currentTimestamp,
        queueWaitTime: 0, // Not preserved
        executionTime,
        status: state.lookupTables.statuses[statusIdx],
        outputSize: 0, // Not preserved
        retryCount: 0, // Not preserved
        priority: 'normal', // Not preserved
        inputSize: inputSize || 0,
        agentLoadAtStart: agentLoadAtStart || 0,
      }

      this.taskHistory.push(record)
    }

    // Restore model data
    if (state.timePredictionData && this.timePredictor) {
      this.timePredictor.importData(state.timePredictionData)
    }
    if (state.capabilityData && this.capabilityAssessor) {
      this.capabilityAssessor.importData(state.capabilityData)
    }
  }

  /**
   * Load from local storage
   */
  private loadFromStorage(): LearningState | null {
    if (typeof localStorage === 'undefined') {
      return null
    }

    try {
      const stored = localStorage.getItem(this.config.storageKey)
      if (!stored) return null

      return JSON.parse(stored) as LearningState
    } catch (error) {
      logger.error('[LearningPersistence] Load from storage failed', error instanceof Error ? error : new Error(String(error)))
      return null
    }
  }

  /**
   * Save to local storage
   */
  private saveToStorage(state: LearningState): void {
    if (typeof localStorage === 'undefined') {
      return
    }

    try {
      localStorage.setItem(this.config.storageKey, JSON.stringify(state))
    } catch (error) {
      logger.error('[LearningPersistence] Save to storage failed', error instanceof Error ? error : new Error(String(error)))
      throw error
    }
  }

  /**
   * Sync to server
   */
  private async syncToServer(state: LearningState): Promise<void> {
    if (!this.config.syncEndpoint) {
      return
    }

    try {
      const response = await fetch(this.config.syncEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state),
      })

      if (!response.ok) {
        throw new Error(`Sync failed: ${response.status}`)
      }
    } catch (error) {
      logger.error('[LearningPersistence] Server sync failed', error instanceof Error ? error : new Error(String(error)))
      throw error
    }
  }

  /**
   * Get statistics
   */
  getStatistics(): {
    totalRecords: number
    memoryUsage: number
    oldestRecord: number
    newestRecord: number
  } {
    const oldestRecord = this.taskHistory[0]?.createdAt || 0
    const newestRecord = this.taskHistory[this.taskHistory.length - 1]?.completedAt || 0

    // Estimate memory usage
    const avgRecordSize = 200 // bytes, approximate
    const memoryUsage = this.taskHistory.length * avgRecordSize

    return {
      totalRecords: this.taskHistory.length,
      memoryUsage,
      oldestRecord,
      newestRecord,
    }
  }
}

/**
 * Singleton instance
 */
export const learningPersistence = new LearningPersistence()

/**
 * Convenience function to initialize persistence
 */
export async function initializeLearningPersistence(): Promise<LearningState | null> {
  return learningPersistence.initialize()
}

/**
 * Convenience function to save learning data
 */
export async function saveLearningData(): Promise<void> {
  return learningPersistence.save()
}
