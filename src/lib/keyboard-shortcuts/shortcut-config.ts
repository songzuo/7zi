/**
 * Keyboard Shortcuts Configuration
 *
 * Default shortcuts for the application. These can be customized by users.
 */

import type { KeyboardShortcut } from './shortcut-manager';

/**
 * Context types for shortcuts
 */
export type ShortcutContext =
  | 'global'
  | 'dashboard'
  | 'tasks'
  | 'editor'
  | 'settings'
  | 'calendar'
  | 'notifications';

/**
 * Default shortcuts configuration
 */
export const DEFAULT_SHORTCUTS: KeyboardShortcut[] = [
  // ========== GLOBAL SHORTCUTS ==========
  {
    id: 'global.command-palette',
    key: 'k',
    context: 'global',
    ctrl: true,
    meta: true, // Cmd on macOS
    description: 'Open command palette',
    category: 'navigation',
    action: () => {
      // Command palette action - to be implemented
      console.log('Open command palette');
    }
  },
  {
    id: 'global.search',
    key: '/',
    context: 'global',
    description: 'Open search',
    category: 'navigation',
    action: () => {
      console.log('Open search');
    }
  },
  {
    id: 'global.escape',
    key: 'Escape',
    context: 'global',
    description: 'Close modal/dropdown',
    category: 'ui',
    action: () => {
      console.log('Close all modals');
    }
  },
  {
    id: 'global.help',
    key: '?',
    context: 'global',
    shift: true,
    description: 'Show keyboard shortcuts help',
    category: 'help',
    action: () => {
      console.log('Show shortcuts help');
    }
  },
  {
    id: 'global.focus-search',
    key: 'f',
    context: 'global',
    ctrl: true,
    description: 'Focus search input',
    category: 'navigation',
    action: () => {
      console.log('Focus search');
    }
  },

  // ========== DASHBOARD SHORTCUTS ==========
  {
    id: 'dashboard.go-tasks',
    key: 'g',
    context: 'dashboard',
    shift: true,
    description: 'Go to tasks (g + t)',
    category: 'navigation',
    action: () => {
      console.log('Navigate to tasks');
    }
  },
  {
    id: 'dashboard.go-calendar',
    key: 'c',
    context: 'dashboard',
    shift: true,
    description: 'Go to calendar (g + c)',
    category: 'navigation',
    action: () => {
      console.log('Navigate to calendar');
    }
  },
  {
    id: 'dashboard.go-settings',
    key: 's',
    context: 'dashboard',
    shift: true,
    description: 'Go to settings (g + s)',
    category: 'navigation',
    action: () => {
      console.log('Navigate to settings');
    }
  },
  {
    id: 'dashboard.go-notifications',
    key: 'n',
    context: 'dashboard',
    shift: true,
    description: 'Go to notifications (g + n)',
    category: 'navigation',
    action: () => {
      console.log('Navigate to notifications');
    }
  },
  {
    id: 'dashboard.refresh',
    key: 'r',
    context: 'dashboard',
    description: 'Refresh dashboard',
    category: 'actions',
    action: () => {
      console.log('Refresh dashboard');
    }
  },
  {
    id: 'dashboard.new-task',
    key: 'n',
    context: 'dashboard',
    description: 'Create new task',
    category: 'actions',
    action: () => {
      console.log('Create new task');
    }
  },

  // ========== TASKS SHORTCUTS ==========
  {
    id: 'tasks.new-task',
    key: 'c',
    context: 'tasks',
    description: 'Create new task',
    category: 'actions',
    action: () => {
      console.log('Create new task');
    }
  },
  {
    id: 'tasks.edit-task',
    key: 'e',
    context: 'tasks',
    description: 'Edit selected task',
    category: 'actions',
    action: () => {
      console.log('Edit selected task');
    }
  },
  {
    id: 'tasks.delete-task',
    key: 'Backspace',
    context: 'tasks',
    description: 'Delete selected task',
    category: 'actions',
    action: () => {
      console.log('Delete selected task');
    }
  },
  {
    id: 'tasks.archive-task',
    key: 'a',
    context: 'tasks',
    description: 'Archive selected task',
    category: 'actions',
    action: () => {
      console.log('Archive selected task');
    }
  },
  {
    id: 'tasks.complete-task',
    key: 'Enter',
    context: 'tasks',
    description: 'Toggle task completion',
    category: 'actions',
    action: () => {
      console.log('Toggle task completion');
    }
  },
  {
    id: 'tasks.up',
    key: 'ArrowUp',
    context: 'tasks',
    description: 'Move to previous task',
    category: 'navigation',
    action: () => {
      console.log('Previous task');
    }
  },
  {
    id: 'tasks.down',
    key: 'ArrowDown',
    context: 'tasks',
    description: 'Move to next task',
    category: 'navigation',
    action: () => {
      console.log('Next task');
    }
  },
  {
    id: 'tasks.select-all',
    key: 'a',
    context: 'tasks',
    ctrl: true,
    description: 'Select all tasks',
    category: 'actions',
    action: () => {
      console.log('Select all tasks');
    }
  },

  // ========== EDITOR SHORTCUTS ==========
  {
    id: 'editor.save',
    key: 's',
    context: 'editor',
    ctrl: true,
    meta: true,
    description: 'Save content',
    category: 'actions',
    action: () => {
      console.log('Save content');
    }
  },
  {
    id: 'editor.bold',
    key: 'b',
    context: 'editor',
    ctrl: true,
    meta: true,
    description: 'Bold text',
    category: 'formatting',
    action: () => {
      console.log('Toggle bold');
    }
  },
  {
    id: 'editor.italic',
    key: 'i',
    context: 'editor',
    ctrl: true,
    meta: true,
    description: 'Italic text',
    category: 'formatting',
    action: () => {
      console.log('Toggle italic');
    }
  },
  {
    id: 'editor.underline',
    key: 'u',
    context: 'editor',
    ctrl: true,
    meta: true,
    description: 'Underline text',
    category: 'formatting',
    action: () => {
      console.log('Toggle underline');
    }
  },
  {
    id: 'editor.undo',
    key: 'z',
    context: 'editor',
    ctrl: true,
    meta: true,
    description: 'Undo',
    category: 'actions',
    action: () => {
      console.log('Undo');
    }
  },
  {
    id: 'editor.redo',
    key: 'z',
    context: 'editor',
    ctrl: true,
    shift: true,
    meta: true,
    description: 'Redo',
    category: 'actions',
    action: () => {
      console.log('Redo');
    }
  },
  {
    id: 'editor.fullscreen',
    key: 'f',
    context: 'editor',
    ctrl: true,
    meta: true,
    description: 'Toggle fullscreen',
    category: 'ui',
    action: () => {
      console.log('Toggle fullscreen');
    }
  },

  // ========== CALENDAR SHORTCUTS ==========
  {
    id: 'calendar.today',
    key: 't',
    context: 'calendar',
    description: 'Go to today',
    category: 'navigation',
    action: () => {
      console.log('Go to today');
    }
  },
  {
    id: 'calendar.day-view',
    key: 'd',
    context: 'calendar',
    description: 'Switch to day view',
    category: 'ui',
    action: () => {
      console.log('Day view');
    }
  },
  {
    id: 'calendar.week-view',
    key: 'w',
    context: 'calendar',
    description: 'Switch to week view',
    category: 'ui',
    action: () => {
      console.log('Week view');
    }
  },
  {
    id: 'calendar.month-view',
    key: 'm',
    context: 'calendar',
    description: 'Switch to month view',
    category: 'ui',
    action: () => {
      console.log('Month view');
    }
  },
  {
    id: 'calendar.new-event',
    key: 'n',
    context: 'calendar',
    description: 'Create new event',
    category: 'actions',
    action: () => {
      console.log('Create new event');
    }
  },
  {
    id: 'calendar.previous',
    key: 'ArrowLeft',
    context: 'calendar',
    description: 'Previous period',
    category: 'navigation',
    action: () => {
      console.log('Previous period');
    }
  },
  {
    id: 'calendar.next',
    key: 'ArrowRight',
    context: 'calendar',
    description: 'Next period',
    category: 'navigation',
    action: () => {
      console.log('Next period');
    }
  },

  // ========== NOTIFICATIONS SHORTCUTS ==========
  {
    id: 'notifications.mark-read',
    key: 'r',
    context: 'notifications',
    description: 'Mark as read',
    category: 'actions',
    action: () => {
      console.log('Mark as read');
    }
  },
  {
    id: 'notifications.mark-all-read',
    key: 'a',
    context: 'notifications',
    shift: true,
    description: 'Mark all as read',
    category: 'actions',
    action: () => {
      console.log('Mark all as read');
    }
  },
  {
    id: 'notifications.delete',
    key: 'Delete',
    context: 'notifications',
    description: 'Delete notification',
    category: 'actions',
    action: () => {
      console.log('Delete notification');
    }
  },

  // ========== SETTINGS SHORTCUTS ==========
  {
    id: 'settings.save',
    key: 's',
    context: 'settings',
    ctrl: true,
    description: 'Save settings',
    category: 'actions',
    action: () => {
      console.log('Save settings');
    }
  },
  {
    id: 'settings.reset',
    key: 'r',
    context: 'settings',
    shift: true,
    description: 'Reset to defaults',
    category: 'actions',
    action: () => {
      console.log('Reset settings');
    }
  }
];

/**
 * Shortcut categories for organizing shortcuts in the help panel
 */
export const SHORTCUT_CATEGORIES: Record<string, string> = {
  navigation: 'Navigation',
  actions: 'Actions',
  ui: 'UI Controls',
  formatting: 'Text Formatting',
  help: 'Help'
};

/**
 * Platform-specific modifier keys
 */
export const MODIFIER_KEYS = {
  ctrl: 'Ctrl',
  meta: 'Cmd', // macOS
  alt: 'Alt',
  shift: 'Shift'
};

/**
 * Get display string for a shortcut key
 */
export function getShortcutDisplayText(shortcut: KeyboardShortcut): string {
  const parts: string[] = [];

  if (shortcut.ctrl) parts.push(MODIFIER_KEYS.ctrl);
  if (shortcut.meta) parts.push(MODIFIER_KEYS.meta);
  if (shortcut.alt) parts.push(MODIFIER_KEYS.alt);
  if (shortcut.shift) parts.push(MODIFIER_KEYS.shift);

  // Format special keys
  const keyDisplay = {
    ' ': 'Space',
    'ArrowUp': '↑',
    'ArrowDown': '↓',
    'ArrowLeft': '←',
    'ArrowRight': '→',
    'Enter': '↵',
    'Escape': 'Esc',
    'Backspace': '⌫',
    'Delete': '⌦'
  }[shortcut.key] || shortcut.key.toUpperCase();

  parts.push(keyDisplay);

  return parts.join(' + ');
}

/**
 * Default user customizations (empty)
 */
export const DEFAULT_USER_SHORTCUTS: Record<string, Partial<KeyboardShortcut>> = {};
