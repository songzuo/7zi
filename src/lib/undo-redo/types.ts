/**
 * @fileoverview Undo-Redo System Types
 * @description Type definitions for the undo-redo history system
 */

// ============================================================================
// Core Types
// ============================================================================

/**
 * Represents a single operation in the history stack
 */
export interface HistoryEntry<T = unknown> {
  id: string
  type: string
  description: string
  timestamp: Date
  userId?: string
  undo?: () => void
  redo?: () => void
  data?: T
}

/**
 * History state configuration
 */
export interface HistoryConfig {
  maxHistorySize?: number
  maxStackDepth?: number
  enablePersistence?: boolean
  persistenceKey?: string
  groupOperations?: boolean
  groupDelay?: number // milliseconds to wait before grouping operations
}

/**
 * History state
 */
export interface HistoryState<T = unknown> {
  past: Array<T>
  present: T
  future: Array<T>
  currentIndex: number
  isUndoing: boolean
  isRedoing: boolean
}

/**
 * Undo-Redo store state
 */
export interface UndoRedoState {
  canUndo: boolean
  canRedo: boolean
  undo: () => void
  redo: () => void
  clear: () => void
  push: <T>(state: T, description?: string) => void
  pushBatch: <T>(states: Array<T>, description?: string) => void
  getHistory: () => HistoryEntry[]
  getCurrentIndex: () => number
  skipNextPush: () => void
  enableGrouping: (enabled: boolean) => void
}

/**
 * Action types for undo-redo
 */
export type UndoRedoAction<T> =
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'PUSH'; state: T; description?: string }
  | { type: 'PUSH_BATCH'; states: Array<T>; description?: string }
  | { type: 'CLEAR' }
  | { type: 'SKIP_NEXT_PUSH' }
  | { type: 'ENABLE_GROUPING'; enabled: boolean }

/**
 * History group entry
 */
export interface HistoryGroup {
  id: string
  description: string
  entries: HistoryEntry[]
  startTimestamp: Date
  endTimestamp: Date
}

/**
 * History export format
 */
export interface HistoryExport {
  entries: HistoryEntry[]
  groups?: HistoryGroup[]
  exportedAt: Date
  version: string
}

/**
 * History statistics
 */
export interface HistoryStatistics {
  totalEntries: number
  totalGroups: number
  totalOperations: number
  uniqueActionTypes: number
  oldestEntry: Date | null
  newestEntry: Date | null
  operationsByType: Record<string, number>
  operationsByUser: Record<string, number>
}

// ============================================================================
// Middleware Config
// ============================================================================

export interface UndoRedoMiddlewareConfig<T> {
  /**
   * Maximum number of states to keep in history
   * @default 50
   */
  maxHistorySize?: number

  /**
   * Enable localStorage persistence
   * @default false
   */
  enablePersistence?: boolean

  /**
   * Key for localStorage persistence
   * @default 'undo-redo-history'
   */
  persistenceKey?: string

  /**
   * Filter function to decide which actions should be recorded
   * @returns true to record, false to skip
   */
  shouldRecordAction?: (action: unknown, state: T) => boolean

  /**
   * Function to generate a description for history entries
   */
  generateDescription?: (action: unknown, state: T) => string

  /**
   * Function to get action type
   */
  getActionType?: (action: unknown) => string

  /**
   * Exclude specific action types from history
   */
  excludeActionTypes?: string[]
}

// ============================================================================
// Event Types
// ============================================================================

export interface UndoRedoEvent {
  type: 'undo' | 'redo' | 'push' | 'clear' | 'export' | 'import'
  timestamp: Date
  data?: unknown
}

export type UndoRedoListener = (event: UndoRedoEvent) => void
