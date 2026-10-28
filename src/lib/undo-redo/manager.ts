/**
 * @fileoverview Undo-Redo Store Manager
 * @description Global store manager for undo-redo operations across the application
 */

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { HistoryEntry, HistoryExport, HistoryStatistics } from './types'

// ============================================================================
// Types
// ============================================================================

interface UndoRedoManagerState {
  // History stack
  //
  // 契约：history 采用 **append** 语义 —— 尾部最新（history[history.length - 1]
  // 是最近一次操作），currentIndex 指向「当前生效的那条记录」。
  // 该契约由消费方决定：
  // - src/components/undo-redo/HistoryViewer.tsx:148-158 用 index < currentIndex
  //   表示「已撤销」、index > currentIndex 表示「可重做」，并在 :285 显示
  //   「已撤销: {currentIndex + 1} / {history.length}」——只有 append 语义成立。
  // - src/components/undo-redo/UndoRedo.tsx:93-94
  //   pastCount = currentIndex + 1 / futureCount = history.length - currentIndex - 1
  //   ——同样是 append 语义。
  history: HistoryEntry[]
  currentIndex: number
  canUndo: boolean
  canRedo: boolean

  // 派生计数（由 history + currentIndex 推导，随历史变动同步刷新）
  pastStatesCount: number
  futureStatesCount: number

  // Grouping
  isGrouping: boolean
  groupStack: HistoryEntry[]

  // Statistics
  totalOperations: number
  operationsByType: Record<string, number>
  operationsByUser: Record<string, number>

  // Actions
  undo: () => void
  redo: () => void
  push: (entry: HistoryEntry) => void
  pushBatch: (entries: HistoryEntry[], groupDescription?: string) => void
  clear: () => void
  startGroup: () => void
  endGroup: (description: string) => void
  skipNext: () => void

  // Query
  getHistory: () => HistoryEntry[]
  getCurrentEntry: () => HistoryEntry | null
  getStatistics: () => HistoryStatistics
  export: () => string
  import: (json: string) => { success: boolean; imported: number; error?: string }

  // Configuration
  maxHistorySize: number
  setMaxHistorySize: (size: number) => void
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_MAX_HISTORY_SIZE = 100

// ============================================================================
// Helper Functions
// ============================================================================

function generateStatistics(history: HistoryEntry[]): HistoryStatistics {
  const operationsByType: Record<string, number> = {}
  const operationsByUser: Record<string, number> = {}

  history.forEach(entry => {
    operationsByType[entry.type] = (operationsByType[entry.type] || 0) + 1
    if (entry.userId) {
      operationsByUser[entry.userId] = (operationsByUser[entry.userId] || 0) + 1
    }
  })

  return {
    totalEntries: history.length,
    totalGroups: 0, // Can be calculated if needed
    totalOperations: history.length,
    uniqueActionTypes: Object.keys(operationsByType).length,
    // append 语义：history[0] 是最老的一条，history[history.length - 1] 是最新的一条
    oldestEntry: history.length > 0 ? history[0].timestamp : null,
    newestEntry: history.length > 0 ? history[history.length - 1].timestamp : null,
    operationsByType,
    operationsByUser,
  }
}

// ============================================================================
// Store Implementation
// ============================================================================

export const useUndoRedoManager = create<UndoRedoManagerState>()(
  devtools(
    (set, get) => ({
      // Initial state
      history: [],
      currentIndex: -1,
      canUndo: false,
      canRedo: false,
      pastStatesCount: 0,
      futureStatesCount: 0,
      isGrouping: false,
      groupStack: [],
      totalOperations: 0,
      operationsByType: {},
      operationsByUser: {},
      maxHistorySize: DEFAULT_MAX_HISTORY_SIZE,

      // Undo
      undo: () => {
        const { history, currentIndex } = get()

        if (currentIndex < 0) return

        const entry = history[currentIndex]

        if (entry.undo) {
          entry.undo()
        }

        const nextIndex = currentIndex - 1

        set({
          currentIndex: nextIndex,
          canUndo: nextIndex >= 0,
          canRedo: true,
          pastStatesCount: Math.max(0, nextIndex),
          futureStatesCount: history.length - nextIndex - 1,
        })
      },

      // Redo
      redo: () => {
        const { history, currentIndex } = get()

        if (currentIndex >= history.length - 1) return

        const nextIndex = currentIndex + 1
        const entry = history[nextIndex]

        if (entry.redo) {
          entry.redo()
        }

        set({
          currentIndex: nextIndex,
          canUndo: true,
          canRedo: nextIndex < history.length - 1,
          pastStatesCount: nextIndex,
          futureStatesCount: history.length - nextIndex - 1,
        })
      },

      // Push single entry
      push: entry => {
        const { history, currentIndex, isGrouping, maxHistorySize } = get()

        // If grouping, add to group stack
        if (isGrouping) {
          set(state => ({
            groupStack: [...state.groupStack, entry],
          }))
          return
        }

        // Remove any future entries (we're creating a new timeline branch)
        const newHistory = history.slice(0, currentIndex + 1)
        newHistory.push(entry)

        // Trim history if needed (keep the newest entries)
        while (newHistory.length > maxHistorySize) {
          newHistory.shift()
        }

        // Update statistics
        const operationsByType = { ...get().operationsByType }
        operationsByType[entry.type] = (operationsByType[entry.type] || 0) + 1

        const operationsByUser = { ...get().operationsByUser }
        if (entry.userId) {
          operationsByUser[entry.userId] = (operationsByUser[entry.userId] || 0) + 1
        }

        const newIndex = newHistory.length - 1

        set({
          history: newHistory,
          currentIndex: newIndex,
          canUndo: true,
          canRedo: false,
          pastStatesCount: newIndex,
          futureStatesCount: 0,
          totalOperations: get().totalOperations + 1,
          operationsByType,
          operationsByUser,
        })
      },

      // Push batch of entries
      pushBatch: (entries, groupDescription) => {
        const { history, currentIndex, maxHistorySize } = get()

        if (entries.length === 0) return

        // Remove any future entries
        const newHistory = history.slice(0, currentIndex + 1)

        // Create a group entry
        const groupEntry: HistoryEntry = {
          id: crypto.randomUUID(),
          type: 'group',
          description: groupDescription || `Group of ${entries.length} operations`,
          timestamp: new Date(),
          data: { entries },
        }

        newHistory.push(groupEntry)

        // Trim history if needed (keep the newest entries)
        while (newHistory.length > maxHistorySize) {
          newHistory.shift()
        }

        // Update statistics
        const operationsByType = { ...get().operationsByType }
        const operationsByUser = { ...get().operationsByUser }

        entries.forEach(entry => {
          operationsByType[entry.type] = (operationsByType[entry.type] || 0) + 1
          if (entry.userId) {
            operationsByUser[entry.userId] = (operationsByUser[entry.userId] || 0) + 1
          }
        })

        const newIndex = newHistory.length - 1

        set({
          history: newHistory,
          currentIndex: newIndex,
          canUndo: true,
          canRedo: false,
          pastStatesCount: newIndex,
          futureStatesCount: 0,
          totalOperations: get().totalOperations + entries.length,
          operationsByType,
          operationsByUser,
        })
      },

      // Clear history
      clear: () => {
        set({
          history: [],
          currentIndex: -1,
          canUndo: false,
          canRedo: false,
          pastStatesCount: 0,
          futureStatesCount: 0,
          totalOperations: 0,
          operationsByType: {},
          operationsByUser: {},
          // 分组状态必须一并重置，否则 isGrouping 残留会让后续 push 全部
          // 进入 groupStack，history 永远为空（状态泄漏）。
          isGrouping: false,
          groupStack: [],
          // 配置同样复位：clear() 的语义是「回到初始状态」。否则上一个用例
          // 调小的 maxHistorySize 会残留到下一个用例，导致历史被过早裁剪。
          maxHistorySize: DEFAULT_MAX_HISTORY_SIZE,
        })
      },

      // Start grouping
      startGroup: () => {
        set({ isGrouping: true, groupStack: [] })
      },

      // End grouping
      endGroup: description => {
        const { groupStack } = get()

        if (groupStack.length === 0) {
          set({ isGrouping: false })
          return
        }

        get().pushBatch(groupStack, description)

        set({
          isGrouping: false,
          groupStack: [],
        })
      },

      // Skip next push (useful for UI updates that shouldn't be recorded)
      skipNext: () => {
        // This is a placeholder - the actual implementation would need
        // to coordinate with the middleware
        console.warn('skipNext() needs to be implemented in the middleware')
      },

      // Get history
      getHistory: () => {
        return get().history
      },

      // Get current entry
      getCurrentEntry: () => {
        const { history, currentIndex } = get()
        return currentIndex >= 0 ? history[currentIndex] : null
      },

      // Get statistics
      getStatistics: () => {
        return generateStatistics(get().history)
      },

      // Export history
      export: () => {
        const { history } = get()

        const exportData: HistoryExport = {
          entries: history,
          exportedAt: new Date(),
          version: '1.0.0',
        }

        return JSON.stringify(exportData)
      },

      // Import history
      import: json => {
        try {
          const imported = JSON.parse(json) as HistoryExport

          // Validate
          if (!imported.entries || !Array.isArray(imported.entries)) {
            return { success: false, imported: 0, error: 'Invalid format' }
          }

          const history = imported.entries
          const operationsByType: Record<string, number> = {}
          const operationsByUser: Record<string, number> = {}

          history.forEach(entry => {
            operationsByType[entry.type] = (operationsByType[entry.type] || 0) + 1
            if (entry.userId) {
              operationsByUser[entry.userId] = (operationsByUser[entry.userId] || 0) + 1
            }
          })

          // append 语义：导入后最新一条为当前项
          const newIndex = history.length - 1

          set({
            history,
            currentIndex: newIndex,
            canUndo: history.length > 0,
            canRedo: false,
            pastStatesCount: Math.max(0, newIndex),
            futureStatesCount: 0,
            totalOperations: history.length,
            operationsByType,
            operationsByUser,
          })

          return { success: true, imported: history.length }
        } catch (error) {
          return {
            success: false,
            imported: 0,
            error: error instanceof Error ? error.message : 'Import failed',
          }
        }
      },

      // Set max history size
      setMaxHistorySize: size => {
        const { history } = get()

        // Trim history if needed —— 保留**最新的** maxHistorySize 条
        // （append 语义：尾部是最新的）
        const newHistory = history.length > size ? history.slice(history.length - size) : history
        const newIndex = newHistory.length - 1

        set({
          maxHistorySize: size,
          history: newHistory,
          currentIndex: newIndex,
          canUndo: newIndex >= 0,
          canRedo: false,
          pastStatesCount: Math.max(0, newIndex),
          futureStatesCount: 0,
        })
      },
    }),
    { name: 'undo-redo-manager' }
  )
)

// ============================================================================
// Selector Hooks
// ============================================================================

export const useCanUndo = () => useUndoRedoManager(s => s.canUndo)
export const useCanRedo = () => useUndoRedoManager(s => s.canRedo)
export const useHistory = () => useUndoRedoManager(s => s.history)
export const useHistoryStats = () => useUndoRedoManager(s => s.getStatistics())
export const useCurrentHistoryIndex = () => useUndoRedoManager(s => s.currentIndex)
export const usePastStatesCount = () => useUndoRedoManager(s => s.pastStatesCount)
export const useFutureStatesCount = () => useUndoRedoManager(s => s.futureStatesCount)

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Create a history entry with defaults
 */
export function createHistoryEntry(
  type: string,
  description: string,
  undo?: () => void,
  redo?: () => void,
  data?: unknown
): HistoryEntry {
  return {
    id: crypto.randomUUID(),
    type,
    description,
    timestamp: new Date(),
    undo,
    redo,
    data,
  }
}

/**
 * Push a simple operation to history
 */
export function pushOperation(
  type: string,
  description: string,
  undo: () => void,
  redo: () => void
) {
  const entry = createHistoryEntry(type, description, undo, redo)
  useUndoRedoManager.getState().push(entry)
}

/**
 * Execute an operation with undo-redo support
 */
export function executeOperation<T>(
  type: string,
  description: string,
  execute: () => T,
  undo: (result: T) => void
): T {
  const result = execute()

  pushOperation(
    type,
    description,
    () => undo(result),
    () => execute()
  )

  return result
}
