# Keyboard Shortcuts Module

A comprehensive keyboard shortcut system for React applications with context-aware support, customizable keybindings, and accessible UI components.

## Features

- 🎯 **Context-aware shortcuts** - Different shortcuts for different contexts (dashboard, tasks, editor, etc.)
- 🔄 **Global shortcuts** - Shortcuts that work across all contexts
- ✏️ **Customizable** - Users can remap shortcuts to their preference
- 🎨 **Beautiful UI** - Keyboard hints and shortcut panels
- 📱 **Accessible** - Full keyboard navigation support
- ⚡ **React Integration** - Ready-to-use React hooks

## Installation

The module is already integrated in the project at `src/lib/keyboard-shortcuts/`.

## Quick Start

### 1. Initialize the Manager

```typescript
import { initShortcutManager } from '@/lib/keyboard-shortcuts';

// In your app entry point
initShortcutManager({ debug: false });
```

### 2. Use in React Components

```tsx
import { useKeyboardShortcuts, ShortcutTooltip } from '@/lib/keyboard-shortcuts';

function MyComponent() {
  const { currentContext, setContext, activeShortcuts } = useKeyboardShortcuts({
    context: 'dashboard',
    onShortcutTrigger: (shortcut, event) => {
      console.log('Triggered:', shortcut.id);
    }
  });

  const [showHelp, setShowHelp] = useState(false);

  return (
    <div>
      <button onClick={() => setShowHelp(true)}>
        Show Shortcuts
      </button>

      <ShortcutTooltip
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
        context="dashboard"
      />
    </div>
  );
}
```

### 3. Register Custom Shortcuts

```tsx
import { useShortcut } from '@/lib/keyboard-shortcuts';

function Editor() {
  const handleSave = (e) => {
    // Save logic
  };

  useShortcut('editor.save', 's', handleSave, {
    context: 'editor',
    ctrl: true,
    description: 'Save document'
  });

  return <div>Editor content</div>;
}
```

## API Reference

### ShortcutManager

Core class for managing keyboard shortcuts.

```typescript
import { ShortcutManager } from '@/lib/keyboard-shortcuts';

const manager = new ShortcutManager({
  debug: true,
  preventDefaultAll: true
});

// Attach to document
manager.attach();

// Register shortcuts
manager.register({
  id: 'custom.action',
  key: 'x',
  context: 'global',
  description: 'Custom action',
  action: () => console.log('Action!')
});

// Change context
manager.setContext('tasks');

// Get shortcuts
const shortcuts = manager.getActiveShortcuts();
```

#### Methods

| Method | Description |
|--------|-------------|
| `attach()` | Attach event listener to document |
| `detach()` | Remove event listener from document |
| `register(shortcut)` | Register a new shortcut |
| `unregister(id)` | Remove a shortcut |
| `update(id, updates)` | Update an existing shortcut |
| `setContext(context)` | Set the current context |
| `getContext()` | Get the current context |
| `getActiveShortcuts()` | Get shortcuts for current context |
| `getShortcutsForContext(context)` | Get shortcuts for a specific context |
| `enable(id)` / `disable(id)` | Enable/disable a shortcut |
| `enableAll()` / `disableAll()` | Enable/disable all shortcuts |

### React Hooks

#### useKeyboardShortcuts

Main hook for keyboard shortcut management.

```tsx
const {
  currentContext,      // Current shortcut context
  activeShortcuts,     // Shortcuts active in current context
  isEnabled,           // Whether shortcuts are enabled
  setContext,          // Change context
  registerShortcut,    // Register new shortcut
  unregisterShortcut,  // Remove shortcut
  enableShortcuts,     // Enable all shortcuts
  disableShortcuts,    // Disable all shortcuts
  toggleShortcuts      // Toggle enabled state
} = useKeyboardShortcuts({
  context: 'dashboard',
  autoAttach: true,
  debug: false,
  onShortcutTrigger: (shortcut, event) => {},
  onContextChange: (context) => {}
});
```

#### useShortcut

Register a single shortcut.

```tsx
useShortcut('my-action', 'a', handleAction, {
  context: 'editor',
  ctrl: true,
  description: 'My action'
});
```

#### useShortcuts

Register multiple shortcuts.

```tsx
useShortcuts([
  { id: 'save', key: 's', ctrl: true, action: handleSave, ... },
  { id: 'open', key: 'o', ctrl: true, action: handleOpen, ... }
]);
```

#### useGlobalShortcuts

Convenient hook for common global shortcuts.

```tsx
useGlobalShortcuts({
  onCommandPalette: () => openPalette(),
  onSearch: () => openSearch(),
  onEscape: () => closeModal(),
  onHelp: () => showHelp()
});
```

### Components

#### ShortcutTooltip

Full shortcut help panel.

```tsx
<ShortcutTooltip
  isOpen={showHelp}
  onClose={() => setShowHelp(false)}
  context="dashboard"
  showGlobal={true}
  title="Keyboard Shortcuts"
/>
```

#### ShortcutBadge

Display a single shortcut badge.

```tsx
<ShortcutBadge shortcut={shortcut} showTooltip />
```

#### ShortcutDisplay

Display key combination inline.

```tsx
<ShortcutDisplay keys="Ctrl+K" description="Open palette" />
```

#### ShortcutMenuButton

Button to toggle shortcut panel.

```tsx
<ShortcutMenuButton
  text="Shortcuts"
  onClick={() => setShowHelp(true)}
/>
```

## Default Shortcuts

### Global Shortcuts

| Shortcut | Description |
|----------|-------------|
| `Ctrl+K` / `Cmd+K` | Open command palette |
| `/` | Open search |
| `Esc` | Close modal/dropdown |
| `Shift+?` | Show shortcuts help |
| `Ctrl+F` | Focus search |

### Dashboard Shortcuts

| Shortcut | Description |
|----------|-------------|
| `Shift+G` + `T` | Go to tasks |
| `Shift+G` + `C` | Go to calendar |
| `Shift+G` + `S` | Go to settings |
| `R` | Refresh dashboard |
| `N` | Create new task |

### Tasks Shortcuts

| Shortcut | Description |
|----------|-------------|
| `C` | Create new task |
| `E` | Edit selected task |
| `Backspace` | Delete selected task |
| `Enter` | Toggle completion |
| `↑` / `↓` | Navigate tasks |
| `Ctrl+A` | Select all tasks |

### Editor Shortcuts

| Shortcut | Description |
|----------|-------------|
| `Ctrl+S` / `Cmd+S` | Save content |
| `Ctrl+B` / `Cmd+B` | Bold text |
| `Ctrl+I` / `Cmd+I` | Italic text |
| `Ctrl+U` / `Cmd+U` | Underline text |
| `Ctrl+Z` / `Cmd+Z` | Undo |
| `Ctrl+Shift+Z` | Redo |
| `Ctrl+F` / `Cmd+F` | Toggle fullscreen |

### Calendar Shortcuts

| Shortcut | Description |
|----------|-------------|
| `T` | Go to today |
| `D` | Day view |
| `W` | Week view |
| `M` | Month view |
| `N` | Create new event |
| `←` / `→` | Navigate periods |

## Contexts

Available shortcut contexts:

- `global` - Shortcuts available everywhere
- `dashboard` - Dashboard-specific shortcuts
- `tasks` - Task management shortcuts
- `editor` - Content editor shortcuts
- `settings` - Settings page shortcuts
- `calendar` - Calendar view shortcuts
- `notifications` - Notification panel shortcuts

## User Customization

Allow users to customize shortcuts:

```tsx
import { useShortcutCustomization } from '@/lib/keyboard-shortcuts';

function ShortcutSettings() {
  const { customizations, customize, reset, resetAll } = useShortcutCustomization();

  const handleRemap = (id: string, newKey: string) => {
    customize(id, { key: newKey });
  };

  return (
    <div>
      {/* Render customization UI */}
      <button onClick={resetAll}>Reset All Shortcuts</button>
    </div>
  );
}
```

## Testing

Run the test suite:

```bash
npm test src/lib/keyboard-shortcuts/keyboard-shortcuts.test.ts
```

The test suite covers:
- ShortcutManager class (registration, context, events)
- Keyboard event handling
- Modifier keys (Ctrl, Shift, Alt, Meta)
- User customizations
- Export/Import functionality
- React hooks
- Configuration utilities

## Best Practices

1. **Context-aware**: Set the appropriate context when entering a view
2. **Accessibility**: Always provide keyboard alternatives for mouse actions
3. **Consistency**: Use standard shortcuts where possible (Ctrl+S for save, etc.)
4. **Documentation**: Document custom shortcuts in your UI
5. **Conflicts**: Avoid conflicting shortcuts in the same context

## Architecture

```
src/lib/keyboard-shortcuts/
├── shortcut-manager.ts     # Core manager class
├── shortcut-config.ts      # Default shortcuts and utilities
├── use-keyboard-shortcuts.ts # React hooks
├── shortcut-tooltip.tsx    # UI components
├── index.ts                # Public API exports
└── keyboard-shortcuts.test.ts # Unit tests
```

## License

MIT
