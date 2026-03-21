/**
 * @fileoverview Undo-Redo Manager Tests
 * @description Tests for the undo-redo manager store
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useUndoRedoManager, createHistoryEntry, pushOperation } from '../manager';

// Reset the manager before each test
beforeEach(() => {
  useUndoRedoManager.getState().clear();
});

describe('Undo-Redo Manager', () => {
  describe('Basic Operations', () => {
    it('should initialize with empty history', () => {
      const state = useUndoRedoManager.getState();

      expect(state.history).toHaveLength(0);
      expect(state.currentIndex).toBe(-1);
      expect(state.canUndo).toBe(false);
      expect(state.canRedo).toBe(false);
    });

    it('should add entry to history', () => {
      const entry = createHistoryEntry(
        'update',
        'Update user name',
        () => {},
        () => {}
      );

      useUndoRedoManager.getState().push(entry);

      const state = useUndoRedoManager.getState();
      expect(state.history).toHaveLength(1);
      expect(state.currentIndex).toBe(0);
      expect(state.canUndo).toBe(true);
      expect(state.canRedo).toBe(false);
    });

    it('should undo operation', () => {
      const undoFn = vi.fn();
      const redoFn = vi.fn();

      const entry = createHistoryEntry('update', 'Test operation', undoFn, redoFn);
      useUndoRedoManager.getState().push(entry);

      useUndoRedoManager.getState().undo();

      expect(undoFn).toHaveBeenCalled();
      expect(redoFn).not.toHaveBeenCalled();

      const state = useUndoRedoManager.getState();
      expect(state.currentIndex).toBe(-1);
      expect(state.canUndo).toBe(false);
      expect(state.canRedo).toBe(true);
    });

    it('should redo operation', () => {
      const undoFn = vi.fn();
      const redoFn = vi.fn();

      const entry = createHistoryEntry('update', 'Test operation', redoFn, redoFn);
      useUndoRedoManager.getState().push(entry);

      useUndoRedoManager.getState().undo();
      useUndoRedoManager.getState().redo();

      expect(redoFn).toHaveBeenCalledTimes(2); // Once for push, once for redo

      const state = useUndoRedoManager.getState();
      expect(state.currentIndex).toBe(0);
      expect(state.canUndo).toBe(true);
      expect(state.canRedo).toBe(false);
    });

    it('should clear all history', () => {
      const entry1 = createHistoryEntry('update', 'Op 1', () => {}, () => {});
      const entry2 = createHistoryEntry('update', 'Op 2', () => {}, () => {});

      useUndoRedoManager.getState().push(entry1);
      useUndoRedoManager.getState().push(entry2);
      useUndoRedoManager.getState().undo();

      let state = useUndoRedoManager.getState();
      expect(state.history.length).toBeGreaterThan(0);

      state.clear();

      state = useUndoRedoManager.getState();
      expect(state.history).toHaveLength(0);
      expect(state.currentIndex).toBe(-1);
      expect(state.canUndo).toBe(false);
      expect(state.canRedo).toBe(false);
    });
  });

  describe('Operation Grouping', () => {
    it('should group multiple operations', () => {
      const entry1 = createHistoryEntry('update', 'Op 1', () => {}, () => {});
      const entry2 = createHistoryEntry('update', 'Op 2', () => {}, () => {});
      const entry3 = createHistoryEntry('update', 'Op 3', () => {}, () => {});

      useUndoRedoManager.getState().startGroup();
      useUndoRedoManager.getState().push(entry1);
      useUndoRedoManager.getState().push(entry2);
      useUndoRedoManager.getState().push(entry3);
      useUndoRedoManager.getState().endGroup('Batch update');

      const state = useUndoRedoManager.getState();
      expect(state.history).toHaveLength(1);
      expect(state.history[0].type).toBe('group');
      expect(state.history[0].data?.entries).toHaveLength(3);
    });

    it('should handle empty group', () => {
      useUndoRedoManager.getState().startGroup();
      useUndoRedoManager.getState().endGroup('Empty group');

      const state = useUndoRedoManager.getState();
      expect(state.history).toHaveLength(0);
    });

    it('should not push when grouping', () => {
      const entry = createHistoryEntry('update', 'Test', () => {}, () => {});

      useUndoRedoManager.getState().startGroup();
      useUndoRedoManager.getState().push(entry);

      const state = useUndoRedoManager.getState();
      expect(state.history).toHaveLength(0);
      expect(state.groupStack).toHaveLength(1);
    });
  });

  describe('Batch Operations', () => {
    it('should push batch of operations', () => {
      const entries = [
        createHistoryEntry('update', 'Op 1', () => {}, () => {}),
        createHistoryEntry('update', 'Op 2', () => {}, () => {}),
        createHistoryEntry('update', 'Op 3', () => {}, () => {}),
      ];

      useUndoRedoManager.getState().pushBatch(entries, 'Batch operations');

      const state = useUndoRedoManager.getState();
      expect(state.history).toHaveLength(1);
      expect(state.history[0].type).toBe('group');
      expect(state.history[0].description).toBe('Batch operations');
    });

    it('should handle empty batch', () => {
      useUndoRedoManager.getState().pushBatch([]);

      const state = useUndoRedoManager.getState();
      expect(state.history).toHaveLength(0);
    });
  });

  describe('History Trimming', () => {
    it('should trim history to max size', () => {
      // Set a small max size
      useUndoRedoManager.getState().setMaxHistorySize(5);

      // Add more than max size entries
      for (let i = 0; i < 10; i++) {
        const entry = createHistoryEntry(`update`, `Op ${i}`, () => {}, () => {});
        useUndoRedoManager.getState().push(entry);
      }

      const state = useUndoRedoManager.getState();
      expect(state.history).toHaveLength(5);
    });

    it('should adjust max size dynamically', () => {
      // Add entries with default max size
      for (let i = 0; i < 20; i++) {
        const entry = createHistoryEntry(`update`, `Op ${i}`, () => {}, () => {});
        useUndoRedoManager.getState().push(entry);
      }

      useUndoRedoManager.getState().setMaxHistorySize(10);

      const state = useUndoRedoManager.getState();
      expect(state.history).toHaveLength(10);
    });
  });

  describe('Statistics', () => {
    it('should calculate correct statistics', () => {
      const entries = [
        createHistoryEntry('create', 'Create user', () => {}, () => {}),
        createHistoryEntry('update', 'Update user', () => {}, () => {}),
        createHistoryEntry('update', 'Update user', () => {}, () => {}),
        createHistoryEntry('delete', 'Delete user', () => {}, () => {}),
      ];

      entries.forEach((entry) => useUndoRedoManager.getState().push(entry));

      const stats = useUndoRedoManager.getState().getStatistics();

      expect(stats.totalEntries).toBe(4);
      expect(stats.totalOperations).toBe(4);
      expect(stats.uniqueActionTypes).toBe(3);
      expect(stats.operationsByType).toEqual({
        create: 1,
        update: 2,
        delete: 1,
      });
    });

    it('should handle empty history statistics', () => {
      const stats = useUndoRedoManager.getState().getStatistics();

      expect(stats.totalEntries).toBe(0);
      expect(stats.totalOperations).toBe(0);
      expect(stats.uniqueActionTypes).toBe(0);
      expect(stats.oldestEntry).toBeNull();
      expect(stats.newestEntry).toBeNull();
    });
  });

  describe('Export and Import', () => {
    it('should export history as JSON', () => {
      const entry = createHistoryEntry('update', 'Test operation', () => {}, () => {});
      useUndoRedoManager.getState().push(entry);

      const json = useUndoRedoManager.getState().export();
      const data = JSON.parse(json);

      expect(data.entries).toHaveLength(1);
      expect(data.version).toBe('1.0.0');
      expect(data.exportedAt).toBeDefined();
    });

    it('should import history from JSON', () => {
      const exportData = {
        entries: [
          createHistoryEntry('update', 'Op 1', () => {}, () => {}),
          createHistoryEntry('update', 'Op 2', () => {}, () => {}),
        ],
        exportedAt: new Date(),
        version: '1.0.0',
      };

      const json = JSON.stringify(exportData);
      const result = useUndoRedoManager.getState().import(json);

      expect(result.success).toBe(true);
      expect(result.imported).toBe(2);

      const state = useUndoRedoManager.getState();
      expect(state.history).toHaveLength(2);
    });

    it('should reject invalid JSON', () => {
      const result = useUndoRedoManager.getState().import('invalid json');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject invalid history format', () => {
      const invalidData = {
        entries: 'not an array',
        exportedAt: new Date(),
        version: '1.0.0',
      };

      const json = JSON.stringify(invalidData);
      const result = useUndoRedoManager.getState().import(json);

      expect(result.success).toBe(false);
    });
  });

  describe('Convenience Functions', () => {
    it('should create history entry with defaults', () => {
      const entry = createHistoryEntry('update', 'Test operation');

      expect(entry.id).toBeDefined();
      expect(entry.type).toBe('update');
      expect(entry.description).toBe('Test operation');
      expect(entry.timestamp).toBeInstanceOf(Date);
      expect(entry.undo).toBeUndefined();
      expect(entry.redo).toBeUndefined();
    });

    it('should push operation via convenience function', () => {
      const undoFn = vi.fn();
      const redoFn = vi.fn();

      pushOperation('update', 'Test operation', undoFn, redoFn);

      const state = useUndoRedoManager.getState();
      expect(state.history).toHaveLength(1);
      expect(state.history[0].undo).toBe(undoFn);
      expect(state.history[0].redo).toBe(redoFn);
    });
  });

  describe('Timeline Management', () => {
    it('should clear future states on new operation', () => {
      const entry1 = createHistoryEntry('update', 'Op 1', () => {}, () => {});
      const entry2 = createHistoryEntry('update', 'Op 2', () => {}, () => {});
      const entry3 = createHistoryEntry('update', 'Op 3', () => {}, () => {});

      useUndoRedoManager.getState().push(entry1);
      useUndoRedoManager.getState().push(entry2);
      useUndoRedoManager.getState().undo();

      let state = useUndoRedoManager.getState();
      expect(state.futureStatesCount).toBe(1); // entry2 is in future

      useUndoRedoManager.getState().push(entry3);

      state = useUndoRedoManager.getState();
      expect(state.futureStatesCount).toBe(0);
      expect(state.history[0].id).toBe(entry3.id);
    });

    it('should track correct current index', () => {
      const entries = Array.from({ length: 5 }, (_, i) =>
        createHistoryEntry('update', `Op ${i}`, () => {}, () => {})
      );

      entries.forEach((entry) => useUndoRedoManager.getState().push(entry));

      let state = useUndoRedoManager.getState();
      expect(state.currentIndex).toBe(4); // Last index

      state.undo();
      state = useUndoRedoManager.getState();
      expect(state.currentIndex).toBe(3);

      state.undo();
      state = useUndoRedoManager.getState();
      expect(state.currentIndex).toBe(2);

      state.redo();
      state = useUndoRedoManager.getState();
      expect(state.currentIndex).toBe(3);
    });
  });
});
