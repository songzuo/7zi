# Keyboard Shortcuts System

Enhanced keyboard shortcuts system for 7zi-frontend v1.14

## Features

- **Global Shortcut Manager** - Centralized management of all keyboard shortcuts
- **Conflict Detection** - Automatically detects and warns about conflicting shortcuts
- **Visual Tooltips** - Beautiful keyboard key visualizations with icons
- **Shortcut Search** - Quick search (Ctrl+/) to find and trigger shortcuts
- **Custom Bindings** - Allow users to rebind shortcuts to their preferred keys
- **Tutorial Mode** - Interactive tutorial to teach shortcuts

## Components

### ShortcutSettingsEnhanced

Enhanced settings panel with conflict detection and custom binding support.

```tsx
import { ShortcutSettingsEnhanced } from '@/components/keyboard';

<ShortcutSettingsEnhanced
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
/>
```

### ShortcutSearch

Search modal to find and trigger shortcuts quickly.

```tsx
import { ShortcutSearch, useShortcutSearch } from '@/components/keyboard';

const search = useShortcutSearch();

<button onClick={search.open}>Search Shortcuts</button>
<ShortcutSearch isOpen={search.isOpen} onClose={search.close} />
```

### ShortcutTutorial

Interactive tutorial mode for learning shortcuts.

```tsx
import { ShortcutTutorial, useShortcutTutorial } from '@/components/keyboard';

const tutorial = useShortcutTutorial();

<button onClick={tutorial.open}>Start Tutorial</button>
<ShortcutTutorial
  isOpen={tutorial.isOpen}
  onClose={tutorial.close}
  onComplete={tutorial.onComplete}
/>
```

### Visual Components

- **ShortcutTooltip** - Full tooltip with key visualization
- **ShortcutBadge** - Compact badge for inline use
- **KeyboardKey** - Individual key visualization

```tsx
import { ShortcutTooltip, ShortcutBadge, KeyboardKey } from '@/components/keyboard';

// Full tooltip
<ShortcutTooltip shortcut="cmd+k" description="Search" showIcon />

// Compact badge
<ShortcutBadge shortcut="cmd+s" />

// Individual key
<KeyboardKey keyDisplay="⌘" />
```

## Hooks

### useKeyboardShortcutsEnhanced

Enhanced hook with conflict detection and custom bindings support.

```tsx
import { useKeyboardShortcutsEnhanced } from '@/hooks';

const shortcuts: Shortcut[] = [
  {
    key: 'cmd+k',
    description: 'Open search',
    category: 'navigation',
    action: handleSearch,
    enabled: true,
  },
];

const { conflicts, manager, setCustomBinding } = useKeyboardShortcutsEnhanced(shortcuts, {
  onConflict: (conflict) => {
    console.warn('Conflict:', conflict);
  },
});
```

### useCustomBindings

Manage custom key bindings.

```tsx
import { useCustomBindings } from '@/hooks';

const { customBindings, setBinding, resetBinding, exportBindings } = useCustomBindings();

// Set custom binding
setBinding('cmd+k', 'ctrl+shift+f');

// Reset to default
resetBinding('cmd+k', 'cmd+k');

// Export configuration
const config = exportBindings();
```

## API

### ShortcutManager

```typescript
import { shortcutManager } from '@/lib/keyboard';

// Register shortcuts
shortcutManager.register(shortcut);

// Register batch with conflict detection
const result = shortcutManager.registerBatch(shortcuts);

// Set custom binding
const result = shortcutManager.setCustomBinding('cmd+k', 'ctrl+shift+f');

// Search shortcuts
const results = shortcutManager.search('search');

// Export/Import configuration
const config = shortcutManager.exportConfig();
shortcutManager.importConfig(config);
```

## Shortcut Categories

- `navigation` - Navigation shortcuts
- `editing` - Text editing shortcuts
- `workflow` - Workflow-related shortcuts
- `system` - System-level shortcuts

## Testing

Run tests with:

```bash
npm test -- --testPathPattern="keyboard"
```
