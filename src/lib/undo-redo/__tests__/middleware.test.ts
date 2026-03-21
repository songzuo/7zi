/**
 * @fileoverview Undo-Redo Middleware Tests
 * @description Tests for the undo-redo Zustand middleware
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { create } from 'zustand';
import { undoRedo } from '../middleware';

/**
 * Counter state for testing
 */
interface CounterState {
  count: number;
  increment: () => void;
  decrement: () => void;
}

/**
 * Value state for testing
 */
interface ValueState {
  value: number;
  increment: () => void;
}

describe('undoRedo Middleware', () => {
  describe('Basic Undo-Redo Functionality', () => {
    it('should initialize store with undo-redo capabilities', () => {
      const useStore = create<CounterState>()(
        undoRedo((set) => ({
          count: 0,
          increment: () => set((state) => ({ count: state.count + 1 })),
        }))
      );

      const store = useStore.getState();

      expect(store.canUndo).toBe(false);
      expect(store.canRedo).toBe(false);
      expect(store.pastStatesCount).toBe(0);
      expect(store.futureStatesCount).toBe(0);
    });

    it('should track state changes and enable undo', () => {
      const useStore = create<CounterState>()(
        undoRedo((set) => ({
          count: 0,
          increment: () => set((state) => ({ count: state.count + 1 })),
        }))
      );

      useStore.getState().increment();

      const store = useStore.getState();
      expect(store.count).toBe(1);
      expect(store.canUndo).toBe(true);
      expect(store.canRedo).toBe(false);
      expect(store.pastStatesCount).toBe(1);
    });

    it('should undo to previous state', () => {
      const useStore = create()(
        undoRedo((set) => ({
          count: 0,
          increment: () => set((state) => ({ count: state.count + 1 })),
        }))
      );

      useStore.getState().increment();
      useStore.getState().increment();

      let store = useStore.getState();
      expect(store.count).toBe(2);

      store.undo();
      store = useStore.getState();
      expect(store.count).toBe(1);
      expect(store.canUndo).toBe(true);
      expect(store.canRedo).toBe(true);

      store.undo();
      store = useStore.getState();
      expect(store.count).toBe(0);
      expect(store.canUndo).toBe(false);
    });

    it('should redo to next state', () => {
      const useStore = create()(
        undoRedo((set) => ({
          count: 0,
          increment: () => set((state) => ({ count: state.count + 1 })),
        }))
      );

      useStore.getState().increment();
      useStore.getState().undo();

      let store = useStore.getState();
      expect(store.count).toBe(0);
      expect(store.canRedo).toBe(true);

      store.redo();
      store = useStore.getState();
      expect(store.count).toBe(1);
      expect(store.canRedo).toBe(false);
    });

    it('should clear future states on new action', () => {
      const useStore = create()(
        undoRedo((set) => ({
          count: 0,
          increment: () => set((state) => ({ count: state.count + 1 })),
          decrement: () => set((state) => ({ count: state.count - 1 })),
        }))
      );

      useStore.getState().increment();
      useStore.getState().increment();
      useStore.getState().undo();

      let store = useStore.getState();
      expect(store.futureStatesCount).toBe(1);

      store.decrement();
      store = useStore.getState();
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
            increment: () => set((state) => ({ count: state.count + 1 })),
          }),
          { maxHistorySize: 3 }
        )
      );

      for (let i = 0; i < 10; i++) {
        useStore.getState().increment();
      }

      const store = useStore.getState();
      expect(store.count).toBe(10);
      expect(store.pastStatesCount).toBe(3);
    });

    it('should clear all history', () => {
      const useStore = create()(
        undoRedo((set) => ({
          count: 0,
          increment: () => set((state) => ({ count: state.count + 1 })),
        }))
      );

      for (let i = 0; i < 5; i++) {
        useStore.getState().increment();
      }

      let store = useStore.getState();
      expect(store.pastStatesCount).toBe(5);

      store.clearHistory();
      store = useStore.getState();
      expect(store.pastStatesCount).toBe(0);
      expect(store.canUndo).toBe(false);
    });

    it('should skip next push when requested', () => {
      const useStore = create()(
        undoRedo((set) => ({
          count: 0,
          increment: () => set((state) => ({ count: state.count + 1 })),
          silentUpdate: () => {
            const store = useStore.getState();
            store.skipNextHistoryPush();
            set({ count: store.count + 1 });
          },
        }))
      );

      useStore.getState().increment();
      useStore.getState().silentUpdate();

      const store = useStore.getState();
      expect(store.count).toBe(2);
      expect(store.pastStatesCount).toBe(1); // Only the increment was recorded
    });
  });

  describe('Export and Import', () => {
    it('should export history as JSON', () => {
      const useStore = create()(
        undoRedo((set) => ({
          count: 0,
          increment: () => set((state) => ({ count: state.count + 1 })),
        }))
      );

      useStore.getState().increment();
      useStore.getState().increment();

      const json = useStore.getState().exportHistory();
      const data = JSON.parse(json);

      expect(data).toBeDefined();
      expect(data.past).toHaveLength(2);
    });

    it('should import history from JSON', () => {
      const useStore = create()(
        undoRedo((set) => ({
          count: 0,
          increment: () => set((state) => ({ count: state.count + 1 })),
        }))
      );

      // Create history
      for (let i = 0; i < 5; i++) {
        useStore.getState().increment();
      }

      const json = useStore.getState().exportHistory();

      // Create new store
      const useStore2 = create()(
        undoRedo((set) => ({
          count: 0,
          increment: () => set((state) => ({ count: state.count + 1 })),
        }))
      );

      const result = useStore2.getState().importHistory(json);

      expect(result.success).toBe(true);

      const store2 = useStore2.getState();
      expect(store2.count).toBe(5);
      expect(store2.canUndo).toBe(true);
    });

    it('should reject invalid history JSON', () => {
      const useStore = create()(
        undoRedo((set) => ({
          count: 0,
        }))
      );

      const result = useStore.getState().importHistory('invalid json');
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
            increment: () => set((state) => ({ count: state.count + 1 })),
            silentIncrement: () =>
              set({ type: 'silent', count: useStore.getState().count + 1 }),
          }),
          { shouldRecordAction: shouldRecord }
        )
      );

      useStore.getState().increment();
      useStore.getState().silentIncrement();

      const store = useStore.getState();
      expect(store.count).toBe(2);
      expect(store.pastStatesCount).toBe(1); // Only increment was recorded
      expect(shouldRecord).toHaveBeenCalledTimes(2);
    });

    it('should exclude specific action types', () => {
      const useStore = create()(
        undoRedo(
          (set) => ({
            count: 0,
            increment: () => set((state) => ({ count: state.count + 1 })),
            tempUpdate: () =>
              set({ type: 'temp', count: useStore.getState().count + 1 }),
          }),
          { excludeActionTypes: ['temp'] }
        )
      );

      useStore.getState().increment();
      useStore.getState().tempUpdate();

      const store = useStore.getState();
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

      useStore.getState().updateName('Jane');
      useStore.getState().updateAge(31);

      const store = useStore.getState();
      expect(store.user.name).toBe('Jane');
      expect(store.user.profile.age).toBe(31);
      expect(store.canUndo).toBe(true);

      store.undo();
      expect(useStore.getState().user.name).toBe('John');
      expect(useStore.getState().user.profile.age).toBe(30);
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

      useStore.getState().addItem(4);
      useStore.getState().removeItem(1);

      const store = useStore.getState();
      expect(store.items).toEqual([1, 3, 4]);

      store.undo();
      expect(useStore.getState().items).toEqual([1, 2, 3, 4]);

      store.undo();
      expect(useStore.getState().items).toEqual([1, 2, 3]);
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
