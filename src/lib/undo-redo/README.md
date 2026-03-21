# Undo-Redo History System

A complete, production-ready undo-redo system for Zustand stores with React hooks, UI components, and API routes.

## Features

- ✅ **Full Undo-Redo Support**: Track and reverse any state changes
- ✅ **Zustand Middleware**: Easy integration with existing stores
- ✅ **React Components**: Pre-built UI components for undo/redo controls
- ✅ **Operation Grouping**: Batch operations together as a single history entry
- ✅ **Keyboard Shortcuts**: Built-in support for Ctrl+Z and Ctrl+Y
- ✅ **History Persistence**: Optional localStorage persistence
- ✅ **Import/Export**: Export and import history as JSON
- ✅ **Statistics**: Track operation metrics and patterns
- ✅ **TypeScript**: Full type safety and IntelliSense support
- ✅ **Tested**: Comprehensive test coverage with Vitest

## Installation

The undo-redo system is included in the project. No additional installation required.

## Quick Start

### 1. Create a Store with Undo-Redo

```typescript
import { create } from 'zustand';
import { undoRedo } from '@/lib/undo-redo/middleware';
import { devtools } from 'zustand/middleware';

interface TodoStore {
  todos: TodoItem[];
  addTodo: (text: string) => void;
  removeTodo: (id: string) => void;
  toggleTodo: (id: string) => void;
}

export const useTodoStore = create<TodoStore>()(
  devtools(
    undoRedo(
      (set, get) => ({
        todos: [],
        addTodo: (text) => {
          const todo = { id: crypto.randomUUID(), text, completed: false };
          set((state) => ({ todos: [...state.todos, todo] }));
        },
        removeTodo: (id) => {
          set((state) => ({ todos: state.todos.filter((t) => t.id !== id) }));
        },
        toggleTodo: (id) => {
          set((state) => ({
            todos: state.todos.map((t) =>
              t.id === id ? { ...t, completed: !t.completed } : t
            ),
          }));
        },
      }),
      {
        maxHistorySize: 50,
        excludeActionTypes: ['internalUpdate'],
      }
    ),
    { name: 'todo-store' }
  )
);
```

### 2. Use Undo-Redo in Components

```tsx
'use client';

import { UndoRedo } from '@/components/undo-redo';
import { useTodoStore } from '@/stores/todoStore';

export function TodoList() {
  const todos = useTodoStore((s) => s.todos);
  const addTodo = useTodoStore((s) => s.addTodo);
  const removeTodo = useTodoStore((s) => s.removeTodo);

  return (
    <div>
      <h2>Todo List</h2>
      <UndoRedo showCount showTooltips />

      <ul>
        {todos.map((todo) => (
          <li key={todo.id}>
            {todo.text}
            <button onClick={() => removeTodo(todo.id)}>Delete</button>
          </li>
        ))}
      </ul>
      <button onClick={() => addTodo('New todo')}>Add Todo</button>
    </div>
  );
}
```

### 3. Manual Operation Recording

For operations that don't go through Zustand's `set()` function, use the manager:

```typescript
import { pushOperation } from '@/lib/undo-redo';
import { useTodoStore } from '@/stores/todoStore';

function complexOperation(todoId: string) {
  const previousState = useTodoStore.getState().todos;

  // Perform the operation
  performComplexLogic(todoId);

  // Record the operation
  pushOperation(
    'update',
    'Complex todo update',
    () => {
      // Undo: restore previous state
      useTodoStore.setState({ todos: previousState });
    },
    () => {
      // Redo: perform the operation again
      performComplexLogic(todoId);
    }
  );
}
```

## Core Concepts

### History Stack

The undo-redo system maintains a history stack:

```
past     present      future
[1, 2] -> [3] -> [4, 5]
```

- **past**: Previous states you can undo to
- **present**: Current state
- **future**: States you can redo to

When you perform a new action:
- The present state moves to past
- The future is cleared (creates a new timeline branch)

### Operation Types

```typescript
interface HistoryEntry {
  id: string;
  type: string;           // Operation type: 'create', 'update', 'delete', etc.
  description: string;     // Human-readable description
  timestamp: Date;
  userId?: string;        // Optional user tracking
  undo?: () => void;      // Undo function
  redo?: () => void;      // Redo function
  data?: unknown;         // Optional operation data
}
```

### Grouping

Group multiple operations together:

```typescript
import { useUndoRedoGroup } from '@/lib/undo-redo';

function BatchUpdate() {
  const { startGroup, endGroup, executeInGroup } = useUndoRedoGroup();

  // Manual grouping
  startGroup();
  operation1();
  operation2();
  operation3();
  endGroup('Batch update');

  // Or use executeInGroup
  const results = executeInGroup(
    [() => operation1(), () => operation2(), () => operation3()],
    'Batch update'
  );
}
```

## API Reference

### Middleware

#### `undoRedo(config)`

Creates a Zustand middleware with undo-redo capabilities.

**Configuration:**

```typescript
interface UndoRedoMiddlewareConfig<T> {
  maxHistorySize?: number;          // Default: 50
  enablePersistence?: boolean;       // Default: false
  persistenceKey?: string;           // Default: 'undo-redo-history'
  shouldRecordAction?: (action, state) => boolean;
  generateDescription?: (action, state) => string;
  getActionType?: (action) => string;
  excludeActionTypes?: string[];
}
```

**Example:**

```typescript
const useStore = create<StoreState>()(
  undoRedo(
    (set, get) => ({ /* store implementation */ }),
    {
      maxHistorySize: 100,
      enablePersistence: true,
      persistenceKey: 'my-app-history',
      shouldRecordAction: (action) => action.type !== 'internal',
      excludeActionTypes: ['internalUpdate', 'fetchData'],
    }
  )
);
```

### Manager

The global manager handles undo-redo operations across all stores.

#### `useUndoRedoManager`

Access the manager state:

```typescript
import { useUndoRedoManager } from '@/lib/undo-redo/manager';

function MyComponent() {
  const {
    history,
    canUndo,
    canRedo,
    undo,
    redo,
    clear,
    getStatistics,
  } = useUndoRedoManager();

  return (
    <div>
      <button onClick={undo} disabled={!canUndo}>Undo</button>
      <button onClick={redo} disabled={!canRedo}>Redo</button>
      <button onClick={clear}>Clear History</button>
    </div>
  );
}
```

#### `pushOperation(type, description, undo, redo)`

Manually record an operation:

```typescript
import { pushOperation } from '@/lib/undo-redo';

pushOperation(
  'create',
  'Add new user',
  () => {
    // Undo: remove the user
    removeUser(userId);
  },
  () => {
    // Redo: add the user again
    addUser(userData);
  }
);
```

### React Hooks

#### `useUndoRedo()`

Access undo-redo state and actions:

```typescript
const { undo, redo, canUndo, canRedo, history, currentIndex } = useUndoRedo();
```

#### `useUndoRedoGroup()`

Access operation grouping:

```typescript
const { startGroup, endGroup, executeInGroup, isGrouping } = useUndoRedoGroup();
```

#### `useUndoRedoShortcuts(undoShortcut, redoShortcut)`

Enable keyboard shortcuts:

```typescript
useUndoRedoShortcuts(['Ctrl+Z', 'Cmd+Z'], ['Ctrl+Y', 'Cmd+Shift+Z']);
```

### Components

#### `<UndoRedo />`

Button group for undo/redo:

```tsx
<UndoRedo
  className="mb-4"
  enableShortcuts={true}
  undoShortcut={['Ctrl+Z', 'Cmd+Z']}
  redoShortcut={['Ctrl+Y', 'Cmd+Shift+Z']}
  showTooltips={true}
  size="md"
  variant="outline"
  orientation="horizontal"
  showCount={true}
  labels={{
    undo: '撤销',
    redo: '重做',
  }}
/>
```

#### `<HistoryViewer />`

Display full history:

```tsx
<HistoryViewer
  maxHeight="400px"
  showTimestamp={true}
  showUser={true}
  showBadges={true}
  compact={false}
  onEntryClick={(entry, index) => {
    console.log('Clicked entry:', entry);
  }}
  filter={(entry) => entry.type !== 'internal'}
/>
```

#### `<HistoryMiniView />`

Compact history display:

```tsx
<HistoryMiniView limit={5} />
```

### API Routes

#### GET `/api/undo-redo`

Get current undo-redo state:

```typescript
const response = await fetch('/api/undo-redo');
const data = await response.json();

// Returns:
{
  success: true,
  data: {
    canUndo: boolean;
    canRedo: boolean;
    currentIndex: number;
    historyCount: number;
    history: HistoryEntry[];
    statistics: HistoryStatistics;
  };
}
```

#### POST `/api/undo-redo`

Perform undo/redo operations:

```typescript
// Undo
await fetch('/api/undo-redo', {
  method: 'POST',
  body: JSON.stringify({ action: 'undo' }),
});

// Redo
await fetch('/api/undo-redo', {
  method: 'POST',
  body: JSON.stringify({ action: 'redo' }),
});

// Clear
await fetch('/api/undo-redo', {
  method: 'POST',
  body: JSON.stringify({ action: 'clear' }),
});

// Start group
await fetch('/api/undo-redo', {
  method: 'POST',
  body: JSON.stringify({ action: 'start-group' }),
});

// End group
await fetch('/api/undo-redo', {
  method: 'POST',
  body: JSON.stringify({
    action: 'end-group',
    description: 'Batch update',
  }),
});
```

#### DELETE `/api/undo-redo`

Clear all history:

```typescript
await fetch('/api/undo-redo', { method: 'DELETE' });
```

#### GET `/api/undo-redo/export`

Export history as JSON:

```typescript
const response = await fetch('/api/undo-redo/export');
const blob = await response.blob();
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'undo-redo-history.json';
a.click();
```

#### POST `/api/undo-redo/import`

Import history from JSON:

```typescript
const file = /* File object */;
const text = await file.text();

await fetch('/api/undo-redo/import', {
  method: 'POST',
  body: JSON.stringify({ history: text }),
});
```

## Advanced Usage

### Filtering Operations

Exclude specific actions from history:

```typescript
const useStore = create()(
  undoRedo(
    (set) => ({
      count: 0,
      increment: () => set((state: any) => ({ count: state.count + 1 })),
      // Internal update won't be recorded
      internalUpdate: () =>
        set({ type: 'internal', count: useStore.getState().count + 1 }),
    }),
    {
      excludeActionTypes: ['internal'],
      shouldRecordAction: (action) => {
        // Custom logic to decide if action should be recorded
        return !action.type?.startsWith('_');
      },
    }
  )
);
```

### Skipping History Push

Temporarily skip history recording:

```typescript
const useStore = create()(
  undoRedo((set, get) => ({
    data: {},
    loadInitialData: async () => {
      const data = await fetchData();

      // Skip recording this initial load
      get().skipNextHistoryPush();
      set({ data });
    },
  }))
);
```

### Export/Import History

```typescript
import { useUndoRedoManager } from '@/lib/undo-redo';

// Export
const manager = useUndoRedoManager.getState();
const json = manager.export();
console.log(json); // Save this JSON

// Import
const result = manager.import(json);
console.log(`Imported ${result.imported} entries`);
```

### Custom History Entry

```typescript
import { createHistoryEntry } from '@/lib/undo-redo';

const entry = createHistoryEntry(
  'update',
  'Custom operation',
  () => {
    console.log('Undoing...');
    // Your undo logic
  },
  () => {
    console.log('Redoing...');
    // Your redo logic
  },
  { metadata: 'custom data' }
);

useUndoRedoManager.getState().push(entry);
```

## Testing

Run tests:

```bash
npm test src/lib/undo-redo
```

## Best Practices

1. **Use descriptive operation names**: Clear descriptions help users understand what they're undoing

2. **Group related operations**: Batch changes together for better UX

3. **Consider history size**: Set appropriate `maxHistorySize` based on memory constraints

4. **Filter irrelevant actions**: Exclude UI updates, loading states, etc.

5. **Test undo/redo**: Ensure your operations can be correctly reversed

6. **Handle async operations**: Use promises and ensure undo/redo functions are sync or properly await

7. **Persist only when needed**: Enable persistence only for critical data

## Examples

See the demo page at `/undo-redo-example` for a complete working example.

## License

MIT
