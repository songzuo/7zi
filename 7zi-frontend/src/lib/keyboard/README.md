# Keyboard Shortcuts System

A comprehensive keyboard shortcuts system for 7zi-frontend v1.12.3.

## Features

- **Centralized Registry**: Manage all shortcuts in one place
- **Category Organization**: Group shortcuts by category (navigation, editing, workflow, system)
- **Dynamic Registration**: Register/unregister shortcuts at runtime
- **Enable/Disable**: Toggle shortcuts on/off
- **Customizable**: Users can customize key combinations
- **Platform-aware**: Automatically adapts to Mac (⌘) and Windows/Linux (Ctrl)
- **Settings Panel**: Built-in UI for managing shortcuts

## Installation

The system is already integrated into the project. No additional installation required.

## Usage

### Basic Usage

```tsx
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { Shortcut } from '@/lib/keyboard';

function MyComponent() {
  const shortcuts: Shortcut[] = [
    {
      key: 'cmd+k',
      description: 'Open search',
      category: 'navigation',
      action: () => console.log('Search opened'),
      enabled: true,
    },
  ];

  useKeyboardShortcuts(shortcuts);

  return <div>Press Cmd+K to open search</div>;
}
```

### Using Default Shortcuts

```tsx
import { getDefaultShortcuts } from '@/lib/keyboard/defaults';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

function App() {
  const shortcuts = getDefaultShortcuts({
    onGlobalSearch: () => console.log('Search'),
    onSave: () => console.log('Saved'),
    onNewWorkflow: () => console.log('New workflow'),
    onExecuteWorkflow: () => console.log('Executing'),
  });

  useKeyboardShortcuts(shortcuts);

  return <div>App with shortcuts</div>;
}
```

### Settings Panel

```tsx
import ShortcutSettings from '@/components/keyboard/ShortcutSettings';

function App() {
  const [showSettings, setShowSettings] = useState(false);

  return (
    <>
      <button onClick={() => setShowSettings(true)}>
        Keyboard Settings
      </button>
      <ShortcutSettings
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </>
  );
}
```

## API Reference

### Shortcut Interface

```typescript
interface Shortcut {
  key: string;              // Key combination (e.g., 'cmd+k', 'ctrl+s')
  description: string;      // Human-readable description
  category: ShortcutCategory; // Category: 'navigation' | 'editing' | 'workflow' | 'system'
  action: () => void;       // Action to execute
  enabled?: boolean;        // Whether shortcut is enabled (default: true)
}
```

### ShortcutRegistry

```typescript
class ShortcutRegistry {
  register(shortcut: Shortcut): void;
  unregister(key: string): void;
  get(key: string): Shortcut | undefined;
  getAll(): Shortcut[];
  getByCategory(category: ShortcutCategory): Shortcut[];
  update(key: string, updates: Partial<Shortcut>): void;
  clear(): void;
  enable(key: string): void;
  disable(key: string): void;
}
```

### useKeyboardShortcuts Hook

```typescript
function useKeyboardShortcuts(
  shortcuts: Shortcut[],
  options?: {
    enabled?: boolean;
    preventDefault?: boolean;
    stopPropagation?: boolean;
  }
): {
  registry: ShortcutRegistry;
  register: (shortcut: Shortcut) => void;
  unregister: (key: string) => void;
  get: (key: string) => Shortcut | undefined;
  getAll: () => Shortcut[];
  getByCategory: (category: ShortcutCategory) => Shortcut[];
};
```

## Default Shortcuts

| Key Combination | Description | Category |
|----------------|-------------|----------|
| ⌘K / Ctrl+K | Global search | Navigation |
| ⌘S / Ctrl+S | Save | System |
| ⌘N / Ctrl+N | New workflow | Workflow |
| ⌘E / Ctrl+E | Execute workflow | Workflow |

## Key Combination Format

Key combinations are formatted as:

```
[modifier+]+key
```

Modifiers:
- `ctrl` - Control key
- `cmd` - Command key (Mac)
- `shift` - Shift key
- `alt` - Alt/Option key

Examples:
- `cmd+k` - Command + K
- `ctrl+shift+s` - Control + Shift + S
- `alt+cmd+f` - Alt + Command + F

## Platform Support

The system automatically detects the platform and displays appropriate key symbols:

- **Mac**: Uses ⌘ symbol for Command key
- **Windows/Linux**: Uses Ctrl for Control key

## Examples

See `src/components/keyboard/KeyboardShortcutsExample.tsx` for a complete working example.

## Testing

Run the example component to test the shortcuts:

```tsx
import KeyboardShortcutsExample from '@/components/keyboard/KeyboardShortcutsExample';

export default function Page() {
  return <KeyboardShortcutsExample />;
}
```

## Future Enhancements

- [ ] Import/export shortcut configurations
- [ ] Conflict detection when customizing shortcuts
- [ ] Shortcut recording UI
- [ ] Keyboard shortcut help overlay
- [ ] Per-page shortcut contexts
- [ ] Multi-key sequences (e.g., `g g` for go to top)