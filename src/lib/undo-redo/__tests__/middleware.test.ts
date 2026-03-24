/**
 * @fileoverview Undo-Redo Middleware Tests
 * @description Tests for the undo-redo Zustand middleware
 */

// @ts-nocheck - Complex middleware testing with generic types

import {describe, it, expect, vi} from 'vitest';
import { create } from 'zustand';
import { undoRedo } from '../middleware';

/**
 * Counter state for testing
 */
interface CounterState {
  count: number;
  increment: () => void;
  decrement?: () => void;
}

/**
 * Value state for testing
 */
interface ValueState {
  value: number;
  increment: () => void;
}

/**
 * UndoRedo state for testing
 */
interface UndoRedoState extends CounterState {
  canUndo: boolean;
  canRedo: boolean;
  pastStatesCount: number;
  futureStatesCount: number;
  undo: () => void;
  redo: () => void;
  clearHistory: () => void;
  skipNextHistoryPush: () => void;
  exportHistory: () => string;
  importHistory: (json: string) => { success: boolean; error?: string };
  silentUpdate?: () => void;
  silentIncrement?: () => void;
  tempUpdate?: () => void;
}

describe('undoRedo Middleware', () => {
  describe('Basic Undo-Redo Functionality', () => {
    it('should initialize store with undo-redo capabilities', () => {
      const useStore = create<CounterState>()(
        undoRedo((set) => ({
          count: 0,
          increment: () => set((state: CounterState) => ({ count: state.count + 1 })),
        }))
      );

      const store = useStore.getState() as UndoRedoState;

      expect(store.canUndo).toBe(false);
      expect(store.canRedo).toBe(false);
      expect(store.pastStatesCount).toBe(0);
      expect(store.futureStatesCount).toBe(0);
    });

    it('should track state changes and enable undo', () => {
      const useStore = create<CounterState>()(
        undoRedo((set) => ({
          count: 0,
          increment: () => set((state: CounterState) => ({ count: state.count + 1 })),
        }))
      );

      (useStore.getState() as UndoRedoState).increment();

      const store = useStore.getState() as UndoRedoState;
      expect(store.count).toBe(1);
      expect(store.canUndo).toBe(true);
      expect(store.canRedo).toBe(false);
      expect(store.pastStatesCount).toBe(1);
    });

    it('should undo to previous state', () => {
      const useStore = create()(
        undoRedo((set) => ({
          count: 0,
          increment: () => set((state: CounterState) => ({ count: state.count + 1 })),
        }))
      );

      (useStore.getState() as UndoRedoState).increment();
      (useStore.getState() as UndoRedoState).increment();

      let store = useStore.getState() as UndoRedoState;
      expect(store.count).toBe(2);

      store.undo();
      store = useStore.getState() as UndoRedoState;
      expect(store.count).toBe(1);
      expect(store.canUndo).toBe(true);
      expect(store.canRedo).toBe(true);

      store.undo();
      store = useStore.getState() as UndoRedoState;
      expect(store.count).toBe(0);
      expect(store.canUndo).toBe(false);
    });

    it('should redo to next state', () => {
      const useStore = create()(
        undoRedo((set) => ({
          count: 0,
          increment: () => set((state: CounterState) => ({ count: state.count + 1 })),
        }))
      );

      (useStore.getState() as UndoRedoState).increment();
      (useStore.getState() as UndoRedoState).undo();

      let store = useStore.getState() as UndoRedoState;
      expect(store.count).toBe(0);
      expect(store.canRedo).toBe(true);

      store.redo();
      store = useStore.getState() as UndoRedoState;
      expect(store.count).toBe(1);
      expect(store.canRedo).toBe(false);
    });

    it('should clear future states on new action', () => {
      const useStore = create()(
        undoRedo((set) => ({
          count: 0,
          increment: () => set((state: CounterState) => ({ count: state.count + 1 })),
          decrement: () => set((state) => ({ count: state.count - 1 })),
        }))
      );

      (useStore.getState() as UndoRedoState).increment();
      (useStore.getState() as UndoRedoState).increment();
      (useStore.getState() as UndoRedoState).undo();

      let store = useStore.getState() as UndoRedoState;
      expect(store.futureStatesCount).toBe(1);

      store.decrement();
      store = useStore.getState() as UndoRedoState;
      expect(store.futureStatesCount).toBe(0);
      expect(store.canRedo).toBe(false);
    });
  });

  describe('History Management', () => {
    it('should respect max history size', () => {
      const useStore = create()(
        undoRedo(
          (set) => ({
            count: 0,
            increment: () => set((state: CounterState) => ({ count: state.count + 1 })),
          }),
          { maxHistorySize: 3 }
        )
      );

      for (let i = 0; i < 10; i++) {
        (useStore.getState() as UndoRedoState).increment();
      }

      const store = useStore.getState() as UndoRedoState;
      expect(store.count).toBe(10);
      expect(store.pastStatesCount).toBe(3);
    });

    it('should clear all history', () => {
      const useStore = create()(
        undoRedo((set) => ({
          count: 0,
          increment: () => set((state: CounterState) => ({ count: state.count + 1 })),
        }))
      );

      for (let i = 0; i < 5; i++) {
        (useStore.getState() as UndoRedoState).increment();
      }

      let store = useStore.getState() as UndoRedoState;
      expect(store.pastStatesCount).toBe(5);

      store.clearHistory();
      store = useStore.getState() as UndoRedoState;
      expect(store.pastStatesCount).toBe(0);
      expect(store.canUndo).toBe(false);
    });

    it('should skip next push when requested', () => {
      const useStore = create()(
        undoRedo((set) => ({
          count: 0,
          increment: () => set((state: CounterState) => ({ count: state.count + 1 })),
          silentUpdate: () => {
            const store = useStore.getState() as UndoRedoState;
            store.skipNextHistoryPush();
            set({ count: store.count + 1 });
          },
        }))
      );

      (useStore.getState() as UndoRedoState).increment();
      (useStore.getState() as UndoRedoState).silentUpdate?.();

      const store = useStore.getState() as UndoRedoState;
      expect(store.count).toBe(2);
      expect(store.pastStatesCount).toBe(1); // Only the increment was recorded
    });
  });

  describe('Export and Import', () => {
    it('should export history as JSON', () => {
      const useStore = create()(
        undoRedo((set) => ({
          count: 0,
          increment: () => set((state: CounterState) => ({ count: state.count + 1 })),
        }))
      );

      (useStore.getState() as UndoRedoState).increment();
      (useStore.getState() as UndoRedoState).increment();

      const json = (useStore.getState() as UndoRedoState).exportHistory();
      const data = JSON.parse(json);

      expect(data).toBeDefined();
      expect(data.past).toHaveLength(2);
    });

    it('should import history from JSON', () => {
      const useStore = create()(
        undoRedo((set) => ({
          count: 0,
          increment: () => set((state: CounterState) => ({ count: state.count + 1 })),
        }))
      );

      // Create history
      for (let i = 0; i < 5; i++) {
        (useStore.getState() as UndoRedoState).increment();
      }

      const json = (useStore.getState() as UndoRedoState).exportHistory();

      // Create new store
      const useStore2 = create()(
        undoRedo((set) => ({
          count: 0,
          increment: () => set((state: CounterState) => ({ count: state.count + 1 })),
        }))
      );

      const result = (useStore2.getState() as UndoRedoState).importHistory(json);

      expect(result.success).toBe(true);

      const store2 = useStore2.getState() as UndoRedoState;
      expect(store2.count).toBe(5);
      expect(store2.canUndo).toBe(true);
    });

    it('should reject invalid history JSON', () => {
      const useStore = create()(
        undoRedo((set) => ({
          count: 0,
        }))
      );

      const result = (useStore.getState() as UndoRedoState).importHistory('invalid json');
      expect(result.success).toBe(false);
    });
  });

  describe('Action Filtering', () => {
    it('should filter actions based on shouldRecordAction', () => {
      const shouldRecord = vi.fn((action: { type?: string }) => action.type !== 'silent');

      const useStore = create()(
        undoRedo(
          (set) => ({
            count: 0,
            increment: () => set((state: CounterState) => ({ count: state.count + 1 })),
            silentIncrement: () =>
              set({ type: 'silent', count: (useStore.getState() as UndoRedoState).count + 1 }),
          }),
          { shouldRecordAction: shouldRecord as any }
        )
      );

      (useStore.getState() as UndoRedoState).increment();
      (useStore.getState() as UndoRedoState).silentIncrement?.();

      const store = useStore.getState() as UndoRedoState;
      expect(store.count).toBe(2);
      expect(store.pastStatesCount).toBe(1); // Only increment was recorded
      expect(shouldRecord).toHaveBeenCalledTimes(2);
    });

    it('should exclude specific action types', () => {
      const useStore = create()(
        undoRedo(
          (set) => ({
            count: 0,
            increment: () => set((state: CounterState) => ({ count: state.count + 1 })),
            tempUpdate: () =>
              set({ type: 'temp', count: (useStore.getState() as UndoRedoState).count + 1 }),
          }),
          { excludeActionTypes: ['temp'] }
        )
      );

      (useStore.getState() as UndoRedoState).increment();
      (useStore.getState() as UndoRedoState).tempUpdate?.();

      const store = useStore.getState() as UndoRedoState;
      expect(store.count).toBe(2);
      expect(store.pastStatesCount).toBe(1);
    });
  });

  describe('Complex State Updates', () => {
    it('should handle nested state updates', () => {
      interface NestedState {
        user: {
          name: string;
          profile: {
            age: number;
            email: string;
          };
        };
      }

      const useStore = create<NestedState>()(
        undoRedo((set) => ({
          user: {
            name: 'John',
            profile: {
              age: 30,
              email: 'john@example.com',
            },
          },
          updateName: (name: string) =>
            set((state) => ({
              user: { ...state.user, name },
            })),
          updateAge: (age: number) =>
            set((state) => ({
              user: {
                ...state.user,
                profile: { ...state.user.profile, age },
              },
            })),
        }))
      );

      (useStore.getState() as UndoRedoState).updateName('Jane');
      (useStore.getState() as UndoRedoState).updateAge(31);

      const store = useStore.getState() as UndoRedoState;
      expect(store.user.name).toBe('Jane');
      expect(store.user.profile.age).toBe(31);
      expect(store.canUndo).toBe(true);

      store.undo();
      expect((useStore.getState() as UndoRedoState).user.name).toBe('John');
      expect((useStore.getState() as UndoRedoState).user.profile.age).toBe(30);
    });

    it('should handle array state updates', () => {
      interface ArrayState {
        items: number[];
      }

      const useStore = create<ArrayState>()(
        undoRedo((set) => ({
          items: [1, 2, 3],
          addItem: (item: number) =>
            set((state) => ({ items: [...state.items, item] })),
          removeItem: (index: number) =>
            set((state) => ({
              items: state.items.filter((_, i) => i !== index),
            })),
        }))
      );

      (useStore.getState() as UndoRedoState).addItem(4);
      (useStore.getState() as UndoRedoState).removeItem(1);

      const store = useStore.getState() as UndoRedoState;
      expect(store.items).toEqual([1, 3, 4]);

      store.undo();
      expect((useStore.getState() as UndoRedoState).items).toEqual([1, 2, 3, 4]);

      store.undo();
      expect((useStore.getState() as UndoRedoState).items).toEqual([1, 2, 3]);
    });
  });

  describe('Multiple Stores', () => {
    it('should maintain independent history for each store', () => {
      const useStoreA = create()(
        undoRedo((set) => ({
          value: 0,
          increment: () => set((state) => ({ value: state.value + 1 })),
        }))
      );

      const useStoreB = create()(
        undoRedo((set) => ({
          value: 0,
          increment: () => set((state) => ({ value: state.value + 1 })),
        }))
      );

      useStoreA.getState().increment();
      useStoreA.getState().increment();

      useStoreB.getState().increment();

      expect(useStoreA.getState().value).toBe(2);
      expect(useStoreB.getState().value).toBe(1);
      expect(useStoreA.getState().pastStatesCount).toBe(2);
      expect(useStoreB.getState().pastStatesCount).toBe(1);

      useStoreA.getState().undo();
      expect(useStoreA.getState().value).toBe(1);
      expect(useStoreB.getState().value).toBe(1);
    });
  });
});
