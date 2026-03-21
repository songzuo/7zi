/**
 * @fileoverview Undo-Redo System
 * @description A complete undo-redo history system for Zustand stores
 */

// ============================================================================
// Types
// ============================================================================

export type {
  HistoryEntry,
  HistoryConfig,
  HistoryState,
  UndoRedoState,
  UndoRedoAction,
  HistoryGroup,
  HistoryExport,
  HistoryStatistics,
  UndoRedoEvent,
  UndoRedoListener,
  UndoRedoMiddlewareConfig,
} from './types';

// ============================================================================
// Middleware
// ============================================================================

export {
  undoRedo,
  undoRedoImpl,
} from './middleware';

export type {
  UndoRedoStoreActions,
} from './middleware';

// ============================================================================
// Manager
// ============================================================================

export {
  useUndoRedoManager,
  useCanUndo,
  useCanRedo,
  useHistory,
  useHistoryStats,
  useCurrentHistoryIndex,
  createHistoryEntry,
  pushOperation,
  executeOperation,
} from './manager';

export type {
  UndoRedoManagerState,
} from './manager';

// ============================================================================
// React Hooks (for backward compatibility)
// ============================================================================

import { useCallback, useEffect, useRef } from 'react';
import { useUndoRedoManager, useCanUndo, useCanRedo } from './manager';

/**
 * Hook for undo/redo operations
 */
export function useUndoRedo() {
  const manager = useUndoRedoManager();
  const canUndo = useCanUndo();
  const canRedo = useCanRedo();

  const undo = useCallback(() => {
    manager.undo();
  }, [manager]);

  const redo = useCallback(() => {
    manager.redo();
  }, [manager]);

  return {
    undo,
    redo,
    canUndo,
    canRedo,
    history: manager.history,
    currentIndex: manager.currentIndex,
  };
}

/**
 * Hook for operation grouping
 */
export function useUndoRedoGroup() {
  const manager = useUndoRedoManager();
  const groupRef = useRef<string | null>(null);

  const startGroup = useCallback(() => {
    manager.startGroup();
    groupRef.current = crypto.randomUUID();
  }, [manager]);

  const endGroup = useCallback((description?: string) => {
    if (!groupRef.current) return;
    manager.endGroup(description || 'Grouped operations');
    groupRef.current = null;
  }, [manager]);

  const executeInGroup = useCallback(
    <T>(operations: Array<() => T>, description?: string): T[] => {
      startGroup();
      try {
        const results = operations.map((op) => op());
        return results;
      } finally {
        endGroup(description);
      }
    },
    [startGroup, endGroup]
  );

  return {
    startGroup,
    endGroup,
    executeInGroup,
    isGrouping: manager.isGrouping,
  };
}

/**
 * Hook for keyboard shortcuts
 */
export function useUndoRedoShortcuts(
  undoShortcut?: string | string[],
  redoShortcut?: string | string[]
) {
  const { undo, redo, canUndo, canRedo } = useUndoRedo();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check for undo
      if (canUndo && undoShortcut) {
        const shortcuts = Array.isArray(undoShortcut) ? undoShortcut : [undoShortcut];
        const isUndo = shortcuts.some((shortcut) =>
          matchesShortcut(event, shortcut)
        );
        if (isUndo) {
          event.preventDefault();
          undo();
          return;
        }
      }

      // Check for redo
      if (canRedo && redoShortcut) {
        const shortcuts = Array.isArray(redoShortcut) ? redoShortcut : [redoShortcut];
        const isRedo = shortcuts.some((shortcut) =>
          matchesShortcut(event, shortcut)
        );
        if (isRedo) {
          event.preventDefault();
          redo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, canUndo, canRedo, undoShortcut, redoShortcut]);
}

/**
 * Parse and match a keyboard shortcut
 */
function matchesShortcut(event: KeyboardEvent, shortcut: string): boolean {
  const parts = shortcut.toLowerCase().split('+');
  const key = parts.pop();
  const modifiers = parts;

  // Check modifiers
  if (modifiers.includes('ctrl') || modifiers.includes('cmd')) {
    if (!event.ctrlKey && !event.metaKey) return false;
  }
  if (modifiers.includes('shift') && !event.shiftKey) return false;
  if (modifiers.includes('alt') && !event.altKey) return false;

  // Check key
  if (key && event.key.toLowerCase() !== key) return false;

  return true;
}
