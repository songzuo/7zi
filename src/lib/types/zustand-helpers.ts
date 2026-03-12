/**
 * @fileoverview Type-safe helper types for Zustand store testing.
 * @module lib/types/zustand-helpers
 * 
 * @description
 * This module provides utility types and helper functions for working
 * with Zustand stores in a type-safe manner, particularly useful for
 * testing scenarios where stores need to be mocked.
 * 
 * @see {@link https://github.com/pmndrs/zustand | Zustand Documentation}
 * 
 * @example
 * ```typescript
 * import { createMockSelector, StoreState } from '@/lib/types/zustand-helpers';
 * import { useTasksStore } from '@/lib/store/tasks-store';
 * 
 * // In tests, mock the store:
 * vi.mocked(useTasksStore).mockImplementation(
 *   createMockSelector({
 *     tasks: [mockTask],
 *     addTask: vi.fn(),
 *   })
 * );
 * ```
 */

/**
 * Extract the state type from a Zustand store hook.
 * 
 * @description
 * Utility type that infers the state shape from a Zustand hook.
 * Useful when you need to work with the state type directly without
 * having to import or redeclare it.
 * 
 * @template T - The Zustand store hook type
 * 
 * @example
 * ```typescript
 * // Instead of importing TasksState separately:
 * type State = StoreState<typeof useTasksStore>;
 * // State is now TasksState
 * 
 * // Use for selector return types:
 * function selectTaskCount(state: StoreState<typeof useTasksStore>): number {
 *   return state.tasks.length;
 * }
 * ```
 */
export type StoreState<T> = T extends (selector: (state: infer S) => unknown) => unknown
  ? S
  : never;

/**
 * Type-safe selector function type.
 * 
 * @description
 * Represents a function that extracts a specific piece of state from
 * the store. This is the standard pattern for Zustand selectors.
 * 
 * @template S - The store state type
 * @template R - The return type of the selector (defaults to unknown)
 * 
 * @example
 * ```typescript
 * // Define a typed selector
 * const selectTaskIds: Selector<TasksState, string[]> = (state) => 
 *   state.tasks.map(t => t.id);
 * 
 * // Use in a component
 * const taskIds = useTasksStore(selectTaskIds);
 * ```
 */
export type Selector<S, R = unknown> = (state: S) => R;

/**
 * Create a mock selector function for testing Zustand stores.
 * 
 * @description
 * Factory function that creates a mock implementation of a Zustand
 * store hook. The returned function accepts a selector and returns
 * the result of applying that selector to the mock state.
 * 
 * This is particularly useful for:
 * - Unit testing components that use Zustand stores
 * - Providing deterministic state in tests
 * - Avoiding the need for complex store setup in test environments
 * 
 * @template S - The store state type (must be an object)
 * @param mockState - The mock state object to use
 * @returns A function that mimics a Zustand store hook
 * 
 * @example
 * ```typescript
 * import { describe, it, expect, vi } from 'vitest';
 * import { useTasksStore } from '@/lib/store/tasks-store';
 * import { createMockSelector } from '@/lib/types/zustand-helpers';
 * 
 * vi.mock('@/lib/store/tasks-store');
 * 
 * describe('TaskList', () => {
 *   it('displays tasks', () => {
 *     // Setup mock store
 *     const mockTasks = [
 *       { id: '1', title: 'Task 1', status: 'pending' }
 *     ];
 *     
 *     vi.mocked(useTasksStore).mockImplementation(
 *       createMockSelector({
 *         tasks: mockTasks,
 *         addTask: vi.fn(),
 *         updateTask: vi.fn(),
 *         deleteTask: vi.fn(),
 *         assignTask: vi.fn(),
 *         completeTask: vi.fn(),
 *         addComment: vi.fn(),
 *       })
 *     );
 *     
 *     // Test component with mocked store
 *     render(<TaskList />);
 *     expect(screen.getByText('Task 1')).toBeInTheDocument();
 *   });
 * });
 * ```
 * 
 * @example
 * ```typescript
 * // Mock with partial state for specific selector tests
 * vi.mocked(useTasksStore).mockImplementation(
 *   createMockSelector({
 *     tasks: [{ id: '1', title: 'Test' }],
 *   })
 * );
 * 
 * // Selector works correctly
 * const count = useTasksStore(state => state.tasks.length);
 * expect(count).toBe(1);
 * ```
 */
export function createMockSelector<S extends object>(mockState: S) {
  return <R>(selector: Selector<S, R>): R => {
    return selector(mockState);
  };
}