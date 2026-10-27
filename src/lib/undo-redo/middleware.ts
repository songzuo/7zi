/**
 * @fileoverview Undo-Redo Middleware for Zustand
 * @description Zustand middleware that adds undo/redo functionality to any store
 */

import { StateCreator, StoreMutatorIdentifier } from 'zustand'
import type { UndoRedoMiddlewareConfig, HistoryState } from './types'

// ============================================================================
// Type Definitions
// ============================================================================

type Write<T, U> = Omit<T, keyof U> & U
type Cast<T, U> = T extends U ? T : U

type UndoRedoImpl = <
  T,
  Mps extends [StoreMutatorIdentifier, unknown][] = [],
  Mcs extends [StoreMutatorIdentifier, unknown][] = [],
>(
  f: StateCreator<T, [...Mps, ['zustand/undo-redo', never]], Mcs>,
  config?: UndoRedoMiddlewareConfig<T>
) => StateCreator<T, Mps, [['zustand/undo-redo', never], ...Mcs]>

// Type workaround for StoreMutators - use module augmentation with proper types
declare module 'zustand/vanilla' {
  interface StoreMutators<S, _A> {
    'zustand/undo-redo': Write<Cast<S, object>, UndoRedoStoreActions>
  }
}

export interface UndoRedoStoreActions {
  undo: () => void
  redo: () => void
  clearHistory: () => void
  skipNextHistoryPush: () => void
  canUndo: boolean
  canRedo: boolean
  pastStatesCount: number
  futureStatesCount: number
  getHistorySnapshot: () => HistoryState
  exportHistory: () => string
  importHistory: (json: string) => { success: boolean; error?: string }
}

// ============================================================================
// Default Config
// ============================================================================

const DEFAULT_CONFIG: Required<UndoRedoMiddlewareConfig<unknown>> = {
  maxHistorySize: 50,
  enablePersistence: false,
  persistenceKey: 'undo-redo-history',
  shouldRecordAction: () => true,
  generateDescription: () => 'State change',
  getActionType: action => {
    if (typeof action === 'object' && action !== null && 'type' in action) {
      return String(action.type)
    }
    return 'unknown'
  },
  excludeActionTypes: [],
}

// ============================================================================
// 派生状态
// ============================================================================

/**
 * 由历史栈推导出来的派生字段。
 *
 * 这些字段之前是用 getter 挂在 store 对象上的。问题：zustand 的 set 用
 * Object.assign 复制状态，第一次 set 之后 state 里只剩**普通值快照**，
 * getter 再也不会被重新求值 —— canUndo 永远停在初始的 false。
 *
 * 所以它们必须是**真实的状态字段**，并且在每次历史变动后同步刷新。
 */
const DERIVED_KEYS = ['canUndo', 'canRedo', 'pastStatesCount', 'futureStatesCount'] as const

/**
 * 从状态快照里剔除派生字段。
 *
 * 派生字段是从历史推导出来的，不应该进历史栈 —— 否则：
 * - 历史快照会带上过期的 canUndo，undo 之后状态自相矛盾
 * - JSON.stringify 比较「状态是否变化」时，派生字段的变化会制造假变更
 */
function stripDerived(state: unknown): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  if (state === null || typeof state !== 'object') return out
  const source = state as Record<string, unknown>
  for (const key of Object.keys(source)) {
    if ((DERIVED_KEYS as readonly string[]).includes(key)) continue
    out[key] = source[key]
  }
  return out
}

/**
 * 从 set 的参数里提取动作信息。
 *
 * zustand 的 set(partial) 允许 partial 里带一个 `type` 字段作为动作标记，
 * 业务代码靠它区分「这次变更该不该进历史」。
 */
function extractAction(args: unknown[]): unknown {
  const first = args[0]
  if (!first || typeof first !== 'object') return undefined
  const partial = first as Record<string, unknown>
  return 'type' in partial ? partial : undefined
}

/**
 * 由历史栈推导派生字段的当前值
 */
function derivedValues(history: HistoryState): Record<string, number | boolean> {
  return {
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    pastStatesCount: history.past.length,
    futureStatesCount: history.future.length,
  }
}

// ============================================================================
// Middleware Implementation
// ============================================================================

export const undoRedoImpl: UndoRedoImpl = (f, config = {}) => {
  const fullConfig = { ...DEFAULT_CONFIG, ...config }

  return (set, get, api) => {
    // Internal history state
    const history: HistoryState = {
      past: [],
      // @ts-expect-error - Type assertion for initial state (unknown to T)
      present: f(set, get, api),
      future: [],
      currentIndex: 0,
      isUndoing: false,
      isRedoing: false,
    }

    let skipNextPush = false

    // Load from localStorage if persistence is enabled
    if (fullConfig.enablePersistence && typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(fullConfig.persistenceKey)
        if (saved) {
          const loaded = JSON.parse(saved) as HistoryState
          // Validate loaded state
          if (
            Array.isArray(loaded.past) &&
            Array.isArray(loaded.future) &&
            typeof loaded.present !== 'undefined'
          ) {
            Object.assign(history, loaded)
            // Restore present state into the store
            // @ts-expect-error - Type assertion for history state
            set(loaded.present)
          }
        }
      } catch (error) {
        console.error('Failed to load undo-redo history:', error)
      }
    }

    // 把派生值（canUndo / canRedo / 历史计数）写入 state 的辅助函数。
    //
    // 注意：这里用的是**原始 set**（不是 wrappedSet），因此派生值更新
    // 不会污染历史栈；同时原始 set 会通知订阅者，所以绝不能再挂
    // api.subscribe(() => syncDerived()) —— 那会形成
    // set -> notify -> subscribe -> set 的无限递归
    // （RangeError: Maximum call stack size exceeded）。
    const _syncDerivedState = (): void => {
      const prev = get() as Record<string, unknown>
      const canUndo = history.past.length > 0
      const canRedo = history.future.length > 0
      const pastStatesCount = history.past.length
      const futureStatesCount = history.future.length

      // 值没变就不写，避免无谓的通知
      if (
        prev.canUndo === canUndo &&
        prev.canRedo === canRedo &&
        prev.pastStatesCount === pastStatesCount &&
        prev.futureStatesCount === futureStatesCount
      ) {
        return
      }

      set({
        ...prev,
        canUndo,
        canRedo,
        pastStatesCount,
        futureStatesCount,
      } as never)
    }

    // Save to localStorage helper
    const saveToStorage = () => {
      if (!fullConfig.enablePersistence || typeof window === 'undefined') {
        return
      }
      try {
        localStorage.setItem(fullConfig.persistenceKey, JSON.stringify(history))
      } catch (error) {
        console.error('Failed to save undo-redo history:', error)
      }
    }

    // Undo function
    const undo = () => {
      if (history.past.length === 0) {
        return // Nothing to undo
      }

      const previous = history.past[history.past.length - 1]
      history.past = history.past.slice(0, history.past.length - 1)
      history.future = [history.present, ...history.future]
      history.present = previous
      history.currentIndex = Math.max(0, history.currentIndex - 1)
      history.isUndoing = true
      history.isRedoing = false

      // @ts-expect-error - Type assertion for history state (unknown to T)
      set(previous)
      saveToStorage()

      // 刷新派生字段（set 之后再算，否则 undo 时 canUndo 还是旧值）
      rawSet({ ...get(), ...derivedValues(history) })

      // Reset undoing flag
      //
      // 之前用 setTimeout(..., 0) 复位。问题：undo() 之后**紧接着**同步调用
      // 另一个 action 时，标志位还没复位，那个 action 被误判成「还在 undo 中」
      // 而跳过入栈 —— 表现为 futureStatesCount 没被清空、canRedo 仍为 true。
      //
      // 这里的 set 是同步的，所以标志位也可以同步复位。
      history.isUndoing = false
    }

    // Redo function
    const redo = () => {
      if (history.future.length === 0) {
        return // Nothing to redo
      }

      const next = history.future[0]
      history.future = history.future.slice(1)
      history.past = [...history.past, history.present]
      history.present = next
      history.currentIndex = history.currentIndex + 1
      history.isUndoing = false
      history.isRedoing = true

      // @ts-expect-error - Type assertion for history state (unknown to T)
      set(next)
      saveToStorage()

      // 刷新派生字段
      rawSet({ ...get(), ...derivedValues(history) })

      // Reset redoing flag —— 同 undo：同步复位，别用 setTimeout
      history.isRedoing = false
    }

    // Clear history function
    const clearHistory = () => {
      history.past = []
      history.future = []
      history.present = get()
      history.currentIndex = 0
      history.isUndoing = false
      history.isRedoing = false
      saveToStorage()
      rawSet({ ...get(), ...derivedValues(history) })
    }

    // Skip next push function
    const skipNextHistoryPush = () => {
      skipNextPush = true
    }

    // Get history snapshot
    const getHistorySnapshot = () => {
      return {
        past: [...history.past],
        present: history.present ? ({ ...(history.present as object) } as unknown) : undefined,
        future: [...history.future],
        currentIndex: history.currentIndex,
        isUndoing: history.isUndoing,
        isRedoing: history.isRedoing,
      }
    }

    // Export history
    const exportHistory = () => {
      return JSON.stringify({
        ...history,
        exportedAt: new Date().toISOString(),
      })
    }

    // Import history
    const importHistory = (json: string) => {
      try {
        const imported = JSON.parse(json) as HistoryState

        // Validate
        if (
          !Array.isArray(imported.past) ||
          !Array.isArray(imported.future) ||
          typeof imported.present === 'undefined'
        ) {
          return { success: false, error: 'Invalid history format' }
        }

        Object.assign(history, imported)
        // @ts-expect-error - Type assertion for history state
        set(imported.present)
        saveToStorage()

        // 刷新派生字段：导入的历史会改变 past/future 的长度，
        // canUndo / canRedo / pastStatesCount 必须跟着更新。
        rawSet({ ...get(), ...derivedValues(history) })

        return { success: true }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Import failed',
        }
      }
    }

    // Create wrapped set function - type workaround for Zustand v5
    // Zustand's set function accepts multiple argument types that are hard to express in TypeScript
    const wrappedSet: (...args: unknown[]) => void = (...args: unknown[]) => {
      const currentState = stripDerived({ ...get() })

      // 动作过滤：shouldRecordAction / excludeActionTypes / getActionType
      // 这三个配置项之前只在 DEFAULT_CONFIG 里声明，实现里**从未使用** ——
      // 配了也没效果。现在按配置语义真正生效。
      //
      // zustand 的 set 支持两种形态：
      //   set(partial)              —— partial 里可能带 { type } 作为动作标记
      //   set(updaterFn)            —— 函数式更新，没有动作信息
      // 只在能拿到动作标记时做过滤；函数式更新一律记录（保持既有行为）。
      const action = extractAction(args)
      if (action !== undefined) {
        const actionType = fullConfig.getActionType(action)
        if (fullConfig.excludeActionTypes.includes(actionType)) {
          // @ts-expect-error - Type assertion for set function spread args (Zustand v5 type limitation)
          set(...args)
          return
        }
        if (!fullConfig.shouldRecordAction(action, currentState as never)) {
          // @ts-expect-error - Type assertion for set function spread args (Zustand v5 type limitation)
          set(...args)
          return
        }
      }

      // Skip if we're in the middle of undo/redo
      if (history.isUndoing || history.isRedoing) {
        // @ts-expect-error - Type assertion for set function spread args (Zustand v5 type limitation)
        set(...args)
        return
      }

      // Skip if requested
      if (skipNextPush) {
        skipNextPush = false
        // @ts-expect-error - Type assertion for set function spread args (Zustand v5 type limitation)
        set(...args)
        return
      }

      // Apply the state change
      // @ts-expect-error - Type assertion for set function spread args (Zustand v5 type limitation)
      set(...args)

      // 同步记录历史。
      //
      // 之前这里用 Promise.resolve().then(...) 延到微任务，导致：
      //   store.increment() 之后**紧接着**读 getState().canUndo 永远是 false
      //   （历史还没入栈），调用方必须额外 await 一个 tick 才对。
      // 撤销/重做本身是同步的，历史没理由比它慢。
      const newState = stripDerived({ ...get() })

      // Check if state actually changed
      const hasChanged = JSON.stringify(currentState) !== JSON.stringify(newState)
      if (!hasChanged) return

      // Add to history
      history.past.push(currentState)

      // Trim history if needed
      if (history.past.length > fullConfig.maxHistorySize) {
        history.past = history.past.slice(-fullConfig.maxHistorySize)
      }

      history.present = newState
      history.future = [] // Clear future on new action
      history.currentIndex = history.past.length

      saveToStorage()

      // 刷新派生字段（用原始 set，绕过 wrappedSet，不会再次入栈历史）
      rawSet({ ...get(), ...derivedValues(history) })
    }

    // Create the store - @ts-expect-error for type assertion
    // @ts-expect-error - Type assertion for final store creation (Zustand v5 type limitation)
    const store = f(wrappedSet, get, api)

    // Return the enhanced store with undo-redo actions
    //
    // canUndo / canRedo / pastStatesCount / futureStatesCount 之前是用
    // getter 挂在 store 对象上的。问题：zustand 的 set 用 Object.assign 复制状态，
    // 第一次 set 之后 state 里就是**普通值快照**，getter 再也不会被重新求值 ——
    // 于是 canUndo 永远停在初始的 false。
    //
    // 正确做法：把派生值作为**真实的状态字段**写进 state，每次 set 时同步刷新。
    // 这样 getState().canUndo 始终反映当前历史。
    // 把派生值写进 state。用原始 set —— 它不会走 wrappedSet，因此不会误入栈历史。
    const rawSet = (partial: Record<string, unknown>): void => {
      set(partial as never)
    }

    // 把派生值写进初始 state
    rawSet({ ...get(), ...derivedValues(history) })

    const enhancedStore = {
      ...store,
      undo,
      redo,
      clearHistory,
      skipNextHistoryPush,
      getHistorySnapshot,
      exportHistory,
      importHistory,
      canUndo: history.past.length > 0,
      canRedo: history.future.length > 0,
      pastStatesCount: history.past.length,
      futureStatesCount: history.future.length,
    } as typeof store & UndoRedoStoreActions

    return enhancedStore
  }
}

/**
 * Zustand middleware for undo-redo functionality
 * @example
 * ```ts
 * const useStore = create<StoreState>()(
 *   undoRedo(
 *     devtools((set, get) => ({
 *       count: 0,
 *       increment: () => set((state) => ({ count: state.count + 1 })),
 *     })),
 *     { maxHistorySize: 50 }
 *   )
 * );
 *
 * // Usage
 * useStore.getState().undo();
 * useStore.getState().redo();
 * const canUndo = useStore.getState().canUndo;
 * ```
 */
export const undoRedo = undoRedoImpl as unknown as UndoRedoImpl
