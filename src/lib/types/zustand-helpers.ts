/**
 * Type-safe helper types for Zustand store mocking in tests
 */

/**
 * Extract the state type from a Zustand store hook
 */
export type StoreState<T> = T extends (selector: (state: infer S) => unknown) => unknown
  ? S
  : never;

/**
 * Type-safe selector function type
 */
export type Selector<S, R = unknown> = (state: S) => R;

/**
 * Type-safe mock implementation helper for Zustand stores
 * 
 * Usage:
 * ```typescript
 * vi.mocked(useTasksStore).mockImplementation(
 *   createMockSelector<TasksState>({
 *     tasks: [...],
 *     addTask: vi.fn(),
 *   })
 * );
 * ```
 */
export function createMockSelector<S extends object>(mockState: S) {
  return <R>(selector: Selector<S, R>): R => {
    return selector(mockState);
  };
}
