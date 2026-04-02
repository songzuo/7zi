/**
 * Keyboard Shortcut Types
 *
 * Shared type definitions for keyboard shortcuts system.
 * This file breaks the circular dependency between shortcut-config and shortcut-manager.
 */

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
  | 'notifications'

/**
 * Keyboard shortcut definition
 */
export interface KeyboardShortcut {
  /** Unique identifier for the shortcut */
  id: string
  /** Key code (e.g., 'a', 'Enter', 'ArrowUp') */
  key: string
  /** Context where this shortcut is active */
  context: ShortcutContext
  /** Whether Ctrl key is required */
  ctrl?: boolean
  /** Whether Meta/Cmd key is required */
  meta?: boolean
  /** Whether Alt key is required */
  alt?: boolean
  /** Whether Shift key is required */
  shift?: boolean
  /** Human-readable description */
  description: string
  /** Category for grouping in help panel */
  category?: string
  /** Action to execute when shortcut is triggered */
  action: (event: KeyboardEvent) => void
  /** Whether this shortcut is enabled */
  enabled?: boolean
}

/**
 * Shortcut manager configuration
 */
export interface ShortcutManagerConfig {
  /** Enable debug logging */
  debug?: boolean
  /** Prevent default behavior for all shortcuts */
  preventDefaultAll?: boolean
  /** Custom key formatter */
  keyFormatter?: (shortcut: KeyboardShortcut) => string
}

/**
 * Event listener for context changes
 */
export type ContextChangeListener = (context: ShortcutContext) => void

/**
 * Event listener for shortcut triggers
 */
export type ShortcutTriggerListener = (shortcut: KeyboardShortcut, event: KeyboardEvent) => void
