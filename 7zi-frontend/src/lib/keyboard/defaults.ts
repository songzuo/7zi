/**
 * Default Keyboard Shortcuts for 7zi-frontend v1.12.3
 */

import { Shortcut, ShortcutCategory } from './shortcut-registry';

export type DefaultShortcutKey = 
  | 'global-search' 
  | 'save' 
  | 'new-workflow' 
  | 'execute-workflow';

export interface DefaultShortcut {
  key: string;
  displayKey: string;
  description: string;
  category: ShortcutCategory;
  defaultKeyCombo: string;
  action: () => void;
  enabled?: boolean;
}

// Placeholder actions - these should be connected to actual functionality
const noop = () => {
  console.log('Shortcut triggered');
};

// Default shortcuts configuration
export const defaultShortcuts: Record<DefaultShortcutKey, DefaultShortcut> = {
  'global-search': {
    key: 'cmd+k',
    displayKey: '⌘K',
    description: 'Open global search',
    category: 'navigation',
    defaultKeyCombo: 'cmd+k',
    action: noop,
    enabled: true,
  },
  'save': {
    key: 'cmd+s',
    displayKey: '⌘S',
    description: 'Save current work',
    category: 'system',
    defaultKeyCombo: 'cmd+s',
    action: noop,
    enabled: true,
  },
  'new-workflow': {
    key: 'cmd+n',
    displayKey: '⌘N',
    description: 'Create new workflow',
    category: 'workflow',
    defaultKeyCombo: 'cmd+n',
    action: noop,
    enabled: true,
  },
  'execute-workflow': {
    key: 'cmd+e',
    displayKey: '⌘E',
    description: 'Execute current workflow',
    category: 'workflow',
    defaultKeyCombo: 'cmd+e',
    action: noop,
    enabled: true,
  },
};

// Convert default shortcuts to Shortcut format
export function getDefaultShortcuts(actions?: {
  onGlobalSearch?: () => void;
  onSave?: () => void;
  onNewWorkflow?: () => void;
  onExecuteWorkflow?: () => void;
}): Shortcut[] {
  const {
    onGlobalSearch,
    onSave,
    onNewWorkflow,
    onExecuteWorkflow,
  } = actions || {};

  return [
    {
      key: 'cmd+k',
      description: defaultShortcuts['global-search'].description,
      category: 'navigation',
      action: onGlobalSearch || defaultShortcuts['global-search'].action,
      enabled: true,
    },
    {
      key: 'cmd+s',
      description: defaultShortcuts['save'].description,
      category: 'system',
      action: onSave || defaultShortcuts['save'].action,
      enabled: true,
    },
    {
      key: 'cmd+n',
      description: defaultShortcuts['new-workflow'].description,
      category: 'workflow',
      action: onNewWorkflow || defaultShortcuts['new-workflow'].action,
      enabled: true,
    },
    {
      key: 'cmd+e',
      description: defaultShortcuts['execute-workflow'].description,
      category: 'workflow',
      action: onExecuteWorkflow || defaultShortcuts['execute-workflow'].action,
      enabled: true,
    },
  ];
}

// Get shortcuts by category
export function getShortcutsByCategory(category: ShortcutCategory): Shortcut[] {
  return getDefaultShortcuts().filter(s => s.category === category);
}

// Get all shortcut categories
export function getCategories(): ShortcutCategory[] {
  return ['navigation', 'editing', 'workflow', 'system'];
}

// Platform-specific key display
export function getPlatformKey(key: string): string {
  const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
  
  if (isMac) {
    return key.replace(/ctrl/gi, '⌘').replace(/cmd/gi, '⌘');
  }
  
  return key.replace(/cmd/gi, 'Ctrl').replace(/ctrl/gi, 'Ctrl');
}
