/**
 * @fileoverview Undo-Redo Store Manager
 * @description Global store manager for undo-redo operations across the application
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { HistoryEntry, HistoryExport, HistoryStatistics } from './types';

// ============================================================================
// Types
// ============================================================================

interface UndoRedoManagerState {
  // History stack
  history: HistoryEntry[];
  entries: HistoryEntry[];
  currentIndex: number;
  canUndo: boolean;
  canRedo: boolean;

  // Grouping
  isGrouping: boolean;
  groupStack: HistoryEntry[];

  // Statistics
  totalOperations: number;
  operationsByType: Record<string, number>;
  operationsByUser: Record<string, number>;

  // Actions
  undo: () => void;
  redo: () => void;
  push: (entry: HistoryEntry) => void;
  pushBatch: (entries: HistoryEntry[], groupDescription?: string) => void;
  clear: () => void;
  startGroup: () => void;
  endGroup: (description: string) => void;
  skipNext: () => void;

  // Query
  getHistory: () => HistoryEntry[];
  getCurrentEntry: () => HistoryEntry | null;
  getStatistics: () => HistoryStatistics;
  export: () => string;
  import: (json: string) => { success: boolean; imported: number; error?: string };

  // Configuration
  maxHistorySize: number;
  setMaxHistorySize: (size: number) => void;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_MAX_HISTORY_SIZE = 100;
const STORAGE_KEY = '7zi-undo-redo-manager';

// ============================================================================
// Helper Functions
// ============================================================================

function generateStatistics(history: HistoryEntry[]): HistoryStatistics {
  const operationsByType: Record<string, number> = {};
  const operationsByUser: Record<string, number> = {};

  history.forEach((entry) => {
    operationsByType[entry.type] = (operationsByType[entry.type] || 0) + 1;
    if (entry.userId) {
      operationsByUser[entry.userId] = (operationsByUser[entry.userId] || 0) + 1;
    }
  });

  return {
    totalEntries: history.length,
    totalGroups: 0, // Can be calculated if needed
    totalOperations: history.length,
    uniqueActionTypes: Object.keys(operationsByType).length,
    oldestEntry: history.length > 0 ? history[history.length - 1].timestamp : null,
    newestEntry: history.length > 0 ? history[0].timestamp : null,
    operationsByType,
    operationsByUser,
  };
}

// ============================================================================
// Store Implementation
// ============================================================================

export const useUndoRedoManager = create<UndoRedoManagerState>()(
  devtools(
    (set, get) => ({
      // Initial state
      history: [],
      entries: [],
      currentIndex: -1,
      canUndo: false,
      canRedo: false,
      isGrouping: false,
      groupStack: [],
      totalOperations: 0,
      operationsByType: {},
      operationsByUser: {},
      maxHistorySize: DEFAULT_MAX_HISTORY_SIZE,

      // Undo
      undo: () => {
        const { history, currentIndex } = get();

        if (currentIndex < 0) return;

        const entry = history[currentIndex];

        if (entry.undo) {
          entry.undo();
        }

        set((state) => ({
          currentIndex: state.currentIndex - 1,
          canUndo: state.currentIndex - 1 >= 0,
          canRedo: true,
        }));
      },

      // Redo
      redo: () => {
        const { history, currentIndex } = get();

        if (currentIndex >= history.length - 1) return;

        const nextIndex = currentIndex + 1;
        const entry = history[nextIndex];

        if (entry.redo) {
          entry.redo();
        }

        set((state) => ({
          currentIndex: state.currentIndex + 1,
          canUndo: true,
          canRedo: state.currentIndex + 2 < state.history.length,
        }));
      },

      // Push single entry
      push: (entry) => {
        const { history, currentIndex, isGrouping, maxHistorySize } = get();

        // If grouping, add to group stack
        if (isGrouping) {
          set((state) => ({
            groupStack: [...state.groupStack, entry],
            entries: [...state.entries, entry],
          }));
          return;
        }

        // Remove any future entries (we're creating a new timeline branch)
        const newHistory = history.slice(0, currentIndex + 1);
        newHistory.unshift(entry);

        // Trim history if needed
        if (newHistory.length > maxHistorySize) {
          newHistory.pop();
        }

        // Update statistics
        const operationsByType = { ...get().operationsByType };
        operationsByType[entry.type] = (operationsByType[entry.type] || 0) + 1;

        const operationsByUser = { ...get().operationsByUser };
        if (entry.userId) {
          operationsByUser[entry.userId] = (operationsByUser[entry.userId] || 0) + 1;
        }

        set({
          history: newHistory,
          currentIndex: 0,
          canUndo: true,
          canRedo: false,
          totalOperations: get().totalOperations + 1,
          operationsByType,
          operationsByUser,
        });
      },

      // Push batch of entries
      pushBatch: (entries, groupDescription) => {
        const { history, currentIndex, maxHistorySize } = get();

        if (entries.length === 0) return;

        // Remove any future entries
        const newHistory = history.slice(0, currentIndex + 1);

        // Create a group entry
        const groupEntry: HistoryEntry = {
          id: crypto.randomUUID(),
          type: 'group',
          description: groupDescription || `Group of ${entries.length} operations`,
          timestamp: new Date(),
          data: { entries },
        };

        newHistory.unshift(groupEntry);

        // Trim history if needed
        if (newHistory.length > maxHistorySize) {
          newHistory.pop();
        }

        // Update statistics
        const operationsByType = { ...get().operationsByType };
        const operationsByUser = { ...get().operationsByUser };

        entries.forEach((entry) => {
          operationsByType[entry.type] = (operationsByType[entry.type] || 0) + 1;
          if (entry.userId) {
            operationsByUser[entry.userId] = (operationsByUser[entry.userId] || 0) + 1;
          }
        });

        set({
          history: newHistory,
          currentIndex: 0,
          canUndo: true,
          canRedo: false,
          totalOperations: get().totalOperations + entries.length,
          operationsByType,
          operationsByUser,
        });
      },

      // Clear history
      clear: () => {
        set({
          history: [],
          currentIndex: -1,
          canUndo: false,
          canRedo: false,
          totalOperations: 0,
          operationsByType: {},
          operationsByUser: {},
        });
      },

      // Start grouping
      startGroup: () => {
        set({ isGrouping: true, groupStack: [] });
      },

      // End grouping
      endGroup: (description) => {
        const { groupStack } = get();

        if (groupStack.length === 0) {
          set({ isGrouping: false });
          return;
        }

        get().pushBatch(groupStack, description);

        set({
          isGrouping: false,
          groupStack: [],
        });
      },

      // Skip next push (useful for UI updates that shouldn't be recorded)
      skipNext: () => {
        // This is a placeholder - the actual implementation would need
        // to coordinate with the middleware
        console.warn('skipNext() needs to be implemented in the middleware');
      },

      // Get history
      getHistory: () => {
        return get().history;
      },

      // Get current entry
      getCurrentEntry: () => {
        const { history, currentIndex } = get();
        return currentIndex >= 0 ? history[currentIndex] : null;
      },

      // Get statistics
      getStatistics: () => {
        return generateStatistics(get().history);
      },

      // Export history
      export: () => {
        const { history } = get();

        const exportData: HistoryExport = {
          entries: history,
          exportedAt: new Date(),
          version: '1.0.0',
        };

        return JSON.stringify(exportData);
      },

      // Import history
      import: (json) => {
        try {
          const imported = JSON.parse(json) as HistoryExport;

          // Validate
          if (!imported.entries || !Array.isArray(imported.entries)) {
            return { success: false, imported: 0, error: 'Invalid format' };
          }

          const history = imported.entries;
          const operationsByType: Record<string, number> = {};
          const operationsByUser: Record<string, number> = {};

          history.forEach((entry) => {
            operationsByType[entry.type] = (operationsByType[entry.type] || 0) + 1;
            if (entry.userId) {
              operationsByUser[entry.userId] = (operationsByUser[entry.userId] || 0) + 1;
            }
          });

          set({
            history,
            currentIndex: -1,
            canUndo: history.length > 0,
            canRedo: false,
            totalOperations: history.length,
            operationsByType,
            operationsByUser,
          });

          return { success: true, imported: history.length };
        } catch (error) {
          return {
            success: false,
            imported: 0,
            error: error instanceof Error ? error.message : 'Import failed',
          };
        }
      },

      // Set max history size
      setMaxHistorySize: (size) => {
        const { history } = get();

        // Trim history if needed
        const newHistory =
          history.length > size ? history.slice(0, size) : history;

        set({
          maxHistorySize: size,
          history: newHistory,
          currentIndex: Math.min(get().currentIndex, newHistory.length - 1),
        });
      },
    }),
    { name: 'undo-redo-manager' }
  )
);

// ============================================================================
// Selector Hooks
// ============================================================================

export const useCanUndo = () => useUndoRedoManager((s) => s.canUndo);
export const useCanRedo = () => useUndoRedoManager((s) => s.canRedo);
export const useHistory = () => useUndoRedoManager((s) => s.history);
export const useHistoryStats = () => useUndoRedoManager((s) => s.getStatistics());
export const useCurrentHistoryIndex = () => useUndoRedoManager((s) => s.currentIndex);

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
  };
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
  const entry = createHistoryEntry(type, description, undo, redo);
  useUndoRedoManager.getState().push(entry);
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
  const result = execute();

  pushOperation(type, description, () => undo(result), () => execute());

  return result;
}
