/**
 * @fileoverview Undo-Redo Middleware for Zustand
 * @description Zustand middleware that adds undo/redo functionality to any store
 */

import { StateCreator, StoreMutatorIdentifier } from 'zustand';
import type { UndoRedoMiddlewareConfig, HistoryState } from './types';

// ============================================================================
// Type Definitions
// ============================================================================

type Write<T, U> = Omit<T, keyof U> & U;
type Cast<T, U> = T extends U ? T : U;

type UndoRedoImpl = <
  T,
  Mps extends [StoreMutatorIdentifier, unknown][] = [],
  Mcs extends [StoreMutatorIdentifier, unknown][] = []
>(
  f: StateCreator<T, [...Mps, ['zustand/undo-redo', never]], Mcs>,
  config?: UndoRedoMiddlewareConfig<T>
) => StateCreator<T, Mps, [['zustand/undo-redo', never], ...Mcs]>;

// Type workaround for StoreMutators - use module augmentation with proper types
// @ts-ignore - TypeScript limitation with module augmentation for Zustand v5
declare module 'zustand/vanilla' {
  interface StoreMutators<S, A> {
    'zustand/undo-redo': Write<Cast<S, object>, UndoRedoStoreActions>;
  }
}

export interface UndoRedoStoreActions {
  undo: () => void;
  redo: () => void;
  clearHistory: () => void;
  skipNextHistoryPush: () => void;
  canUndo: boolean;
  canRedo: boolean;
  pastStatesCount: number;
  futureStatesCount: number;
  getHistorySnapshot: () => HistoryState;
  exportHistory: () => string;
  importHistory: (json: string) => { success: boolean; error?: string };
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
  getActionType: (action) => {
    if (typeof action === 'object' && action !== null && 'type' in action) {
      return String(action.type);
    }
    return 'unknown';
  },
  excludeActionTypes: [],
};

// ============================================================================
// Middleware Implementation
// ============================================================================

export const undoRedoImpl: UndoRedoImpl = (f, config = {}) => {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };

  return (set, get, api) => {
    // Internal history state
    const history: HistoryState = {
      past: [],
      // @ts-ignore - Type assertion for initial state (unknown to T)
      present: f(set, get, api),
      future: [],
      currentIndex: 0,
      isUndoing: false,
      isRedoing: false,
    };

    let skipNextPush = false;

    // Load from localStorage if persistence is enabled
    if (fullConfig.enablePersistence && typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(fullConfig.persistenceKey);
        if (saved) {
          const loaded = JSON.parse(saved) as HistoryState;
          // Validate loaded state
          if (
            Array.isArray(loaded.past) &&
            Array.isArray(loaded.future) &&
            typeof loaded.present !== 'undefined'
          ) {
            Object.assign(history, loaded);
            // Restore present state into the store
            // @ts-ignore - Type assertion for history state
            set(loaded.present);
          }
        }
      } catch (error) {
        console.error('Failed to load undo-redo history:', error);
      }
    }

    // Save to localStorage helper
    const saveToStorage = () => {
      if (!fullConfig.enablePersistence || typeof window === 'undefined') {
        return;
      }
      try {
        localStorage.setItem(fullConfig.persistenceKey, JSON.stringify(history));
      } catch (error) {
        console.error('Failed to save undo-redo history:', error);
      }
    };

    // Undo function
    const undo = () => {
      if (history.past.length === 0) {
        return; // Nothing to undo
      }

      const previous = history.past[history.past.length - 1];
      history.past = history.past.slice(0, history.past.length - 1);
      history.future = [history.present, ...history.future];
      history.present = previous;
      history.currentIndex = Math.max(0, history.currentIndex - 1);
      history.isUndoing = true;
      history.isRedoing = false;

      // @ts-ignore - Type assertion for history state (unknown to T)
      set(previous);
      saveToStorage();

      // Reset undoing flag
      setTimeout(() => {
        history.isUndoing = false;
      }, 0);
    };

    // Redo function
    const redo = () => {
      if (history.future.length === 0) {
        return; // Nothing to redo
      }

      const next = history.future[0];
      history.future = history.future.slice(1);
      history.past = [...history.past, history.present];
      history.present = next;
      history.currentIndex = history.currentIndex + 1;
      history.isUndoing = false;
      history.isRedoing = true;

      // @ts-ignore - Type assertion for history state (unknown to T)
      set(next);
      saveToStorage();

      // Reset redoing flag
      setTimeout(() => {
        history.isRedoing = false;
      }, 0);
    };

    // Clear history function
    const clearHistory = () => {
      history.past = [];
      history.future = [];
      // @ts-ignore - Type assertion for history state
      history.present = get();
      history.currentIndex = 0;
      history.isUndoing = false;
      history.isRedoing = false;
      saveToStorage();
    };

    // Skip next push function
    const skipNextHistoryPush = () => {
      skipNextPush = true;
    };

    // Get history snapshot
    const getHistorySnapshot = () => {
      return {
        past: [...history.past],
        present: history.present ? { ...history.present as object } as unknown : undefined,
        future: [...history.future],
        currentIndex: history.currentIndex,
        isUndoing: history.isUndoing,
        isRedoing: history.isRedoing,
      };
    };

    // Export history
    const exportHistory = () => {
      return JSON.stringify({
        ...history,
        exportedAt: new Date().toISOString(),
      });
    };

    // Import history
    const importHistory = (json: string) => {
      try {
        const imported = JSON.parse(json) as HistoryState;

        // Validate
        if (
          !Array.isArray(imported.past) ||
          !Array.isArray(imported.future) ||
          typeof imported.present === 'undefined'
        ) {
          return { success: false, error: 'Invalid history format' };
        }

        Object.assign(history, imported);
        // @ts-ignore - Type assertion for history state
        set(imported.present);
        saveToStorage();

        return { success: true };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Import failed',
        };
      }
    };

    // Create wrapped set function - type workaround for Zustand v5
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const wrappedSet: any = (...args: unknown[]) => {
      const currentState = { ...get() };

      // Skip if we're in the middle of undo/redo
      if (history.isUndoing || history.isRedoing) {
        // @ts-ignore - Type assertion for set function spread args (Zustand v5 type limitation)
        set(...args);
        return;
      }

      // Skip if requested
      if (skipNextPush) {
        skipNextPush = false;
        // @ts-ignore - Type assertion for set function spread args (Zustand v5 type limitation)
        set(...args);
        return;
      }

      // Apply the state change
      // @ts-ignore - Type assertion for set function spread args (Zustand v5 type limitation)
      set(...args);

      // Wait for the next tick to get the updated state
      Promise.resolve().then(() => {
        const newState = get();

        // Check if state actually changed
        const hasChanged = JSON.stringify(currentState) !== JSON.stringify(newState);
        if (!hasChanged) return;

        // Add to history
        history.past.push(currentState);

        // Trim history if needed
        if (history.past.length > fullConfig.maxHistorySize) {
          history.past = history.past.slice(-fullConfig.maxHistorySize);
        }

        history.present = newState;
        history.future = []; // Clear future on new action
        history.currentIndex = history.past.length;

        saveToStorage();
      });
    };

    // Create the store - @ts-ignore for type assertion
    // @ts-ignore - Type assertion for final store creation (Zustand v5 type limitation)
    const store = f(wrappedSet, get, api);

    // Return the enhanced store with undo-redo actions
    return {
      ...store,
      undo,
      redo,
      clearHistory,
      skipNextHistoryPush,
      get canUndo() {
        return history.past.length > 0;
      },
      get canRedo() {
        return history.future.length > 0;
      },
      get pastStatesCount() {
        return history.past.length;
      },
      get futureStatesCount() {
        return history.future.length;
      },
      getHistorySnapshot,
      exportHistory,
      importHistory,
    } as typeof store & UndoRedoStoreActions;
  };
};

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
export const undoRedo = undoRedoImpl as unknown as UndoRedoImpl;
