/**
 * Keyboard Shortcuts Module
 *
 * Global keyboard shortcut system with context-aware support,
 * customizable keybindings, and React integration.
 */

// Core manager
export {
  ShortcutManager,
  getShortcutManager,
  initShortcutManager,
  destroyShortcutManager
} from './shortcut-manager';

export type {
  KeyboardShortcut,
  ShortcutManagerConfig,
  ContextChangeListener,
  ShortcutTriggerListener
} from './shortcut-manager';

// Configuration
export {
  DEFAULT_SHORTCUTS,
  SHORTCUT_CATEGORIES,
  MODIFIER_KEYS,
  getShortcutDisplayText,
  DEFAULT_USER_SHORTCUTS
} from './shortcut-config';

export type { ShortcutContext } from './shortcut-config';

// React hooks
export {
  useKeyboardShortcuts,
  useShortcut,
  useShortcuts,
  useContextualShortcuts,
  useShortcutsDisplay,
  useGlobalShortcuts,
  useInitShortcuts,
  useShortcutCustomization,
  useShortcutManager
} from './use-keyboard-shortcuts';

export type {
  UseKeyboardShortcutsOptions,
  ShortcutProviderProps
} from './use-keyboard-shortcuts';

// Components
export {
  ShortcutTooltip,
  ShortcutBadge,
  ShortcutDisplay,
  ShortcutMenuButton,
  withShortcutTooltip
} from './shortcut-tooltip';

export type {
  ShortcutTooltipProps,
  ShortcutBadgeProps,
  ShortcutDisplayProps,
  ShortcutMenuButtonProps
} from './shortcut-tooltip';
