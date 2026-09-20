/**
 * Keyboard Shortcut Manager
 *
 * Core manager for registering, handling, and managing keyboard shortcuts.
 * Supports global and context-sensitive shortcuts.
 */

import type {
  KeyboardShortcut,
  ShortcutContext,
  ShortcutManagerConfig,
  ContextChangeListener,
  ShortcutTriggerListener,
} from './shortcut-types'
import { DEFAULT_SHORTCUTS, getShortcutDisplayText } from './shortcut-config'

// Re-export types for backward compatibility
export type {
  KeyboardShortcut,
  ShortcutContext,
  ShortcutManagerConfig,
  ContextChangeListener,
  ShortcutTriggerListener,
} from './shortcut-types'

/**
 * ShortcutManager - Manages all keyboard shortcuts
 */
export class ShortcutManager {
  private shortcuts: Map<string, KeyboardShortcut> = new Map()
  private contextShortcuts: Map<ShortcutContext, Map<string, KeyboardShortcut>> = new Map()
  private currentContext: ShortcutContext = 'global'
  private contextListeners: Set<ContextChangeListener> = new Set()
  private triggerListeners: Set<ShortcutTriggerListener> = new Set()
  private boundHandler: (event: KeyboardEvent) => void
  private isAttached = false
  private config: ShortcutManagerConfig
  private userCustomizations: Map<string, Partial<KeyboardShortcut>> = new Map()

  constructor(config: ShortcutManagerConfig = {}) {
    this.config = {
      debug: false,
      preventDefaultAll: true,
      ...config,
    }

    // Create bound event handler
    this.boundHandler = this.handleKeyDown.bind(this)

    // Load default shortcuts
    this.loadDefaultShortcuts()
  }

  /**
   * Attach the keyboard event listener to the document
   */
  attach(): void {
    if (this.isAttached) {
      if (this.config.debug) {
        console.warn('[ShortcutManager] Already attached')
      }
      return
    }

    if (typeof document !== 'undefined') {
      document.addEventListener('keydown', this.boundHandler)
      this.isAttached = true

      if (this.config.debug) {
        console.log('[ShortcutManager] Attached to document')
      }
    }
  }

  /**
   * Detach the keyboard event listener from the document
   */
  detach(): void {
    if (!this.isAttached) {
      return
    }

    if (typeof document !== 'undefined') {
      document.removeEventListener('keydown', this.boundHandler)
      this.isAttached = false

      if (this.config.debug) {
        console.log('[ShortcutManager] Detached from document')
      }
    }
  }

  /**
   * Register a new keyboard shortcut
   */
  register(shortcut: KeyboardShortcut): void {
    if (!shortcut.id || !shortcut.key || !shortcut.action) {
      throw new Error('[ShortcutManager] Invalid shortcut: missing required fields')
    }

    // Apply user customizations if any
    const customizedShortcut = this.applyCustomizations(shortcut)

    // Store in main map
    this.shortcuts.set(customizedShortcut.id, customizedShortcut)

    // Store in context map
    if (!this.contextShortcuts.has(customizedShortcut.context)) {
      this.contextShortcuts.set(customizedShortcut.context, new Map())
    }
    this.contextShortcuts
      .get(customizedShortcut.context)!
      .set(customizedShortcut.id, customizedShortcut)

    if (this.config.debug) {
      console.log(`[ShortcutManager] Registered: ${customizedShortcut.id}`, customizedShortcut)
    }
  }

  /**
   * Unregister a keyboard shortcut
   */
  unregister(id: string): void {
    const shortcut = this.shortcuts.get(id)
    if (!shortcut) {
      return
    }

    // Remove from main map
    this.shortcuts.delete(id)

    // Remove from context map
    const contextMap = this.contextShortcuts.get(shortcut.context)
    if (contextMap) {
      contextMap.delete(id)
    }

    if (this.config.debug) {
      console.log(`[ShortcutManager] Unregistered: ${id}`)
    }
  }

  /**
   * Update an existing shortcut
   */
  update(id: string, updates: Partial<KeyboardShortcut>): boolean {
    const shortcut = this.shortcuts.get(id)
    if (!shortcut) {
      return false
    }

    const updated = { ...shortcut, ...updates }
    this.unregister(id)
    this.register(updated)

    return true
  }

  /**
   * Set user customization for a shortcut
   */
  setCustomization(id: string, customization: Partial<KeyboardShortcut>): void {
    this.userCustomizations.set(id, customization)

    // Re-register the shortcut with customizations
    const shortcut = this.shortcuts.get(id)
    if (shortcut) {
      this.unregister(id)
      this.register({ ...shortcut, ...customization })
    }
  }

  /**
   * Clear user customization for a shortcut
   */
  clearCustomization(id: string): void {
    this.userCustomizations.delete(id)

    // Re-register with default values
    const defaultShortcut = DEFAULT_SHORTCUTS.find(s => s.id === id)
    if (defaultShortcut) {
      this.unregister(id)
      this.register(defaultShortcut)
    }
  }

  /**
   * Get all customizations
   */
  getCustomizations(): Record<string, Partial<KeyboardShortcut>> {
    const result: Record<string, Partial<KeyboardShortcut>> = {}
    this.userCustomizations.forEach((value, key) => {
      result[key] = value
    })
    return result
  }

  /**
   * Load customizations from a record
   */
  loadCustomizations(customizations: Record<string, Partial<KeyboardShortcut>>): void {
    Object.entries(customizations).forEach(([id, customization]) => {
      this.setCustomization(id, customization)
    })
  }

  /**
   * Set the current context
   */
  setContext(context: ShortcutContext): void {
    if (this.currentContext === context) {
      return
    }

    this.currentContext = context

    // Notify listeners
    this.contextListeners.forEach(listener => {
      try {
        listener(context)
      } catch (error) {
        console.error('[ShortcutManager] Context listener error:', error)
      }
    })

    if (this.config.debug) {
      console.log(`[ShortcutManager] Context changed to: ${context}`)
    }
  }

  /**
   * Get the current context
   */
  getContext(): ShortcutContext {
    return this.currentContext
  }

  /**
   * Register a context change listener
   */
  onContextChange(listener: ContextChangeListener): () => void {
    this.contextListeners.add(listener)
    return () => {
      this.contextListeners.delete(listener)
    }
  }

  /**
   * Register a shortcut trigger listener
   */
  onShortcutTrigger(listener: ShortcutTriggerListener): () => void {
    this.triggerListeners.add(listener)
    return () => {
      this.triggerListeners.delete(listener)
    }
  }

  /**
   * Get all shortcuts for a context
   */
  getShortcutsForContext(context: ShortcutContext): KeyboardShortcut[] {
    const contextMap = this.contextShortcuts.get(context)
    if (!contextMap) {
      return []
    }
    return Array.from(contextMap.values())
  }

  /**
   * Get all global shortcuts
   */
  getGlobalShortcuts(): KeyboardShortcut[] {
    return this.getShortcutsForContext('global')
  }

  /**
   * Get all shortcuts for current context (including global)
   */
  getActiveShortcuts(): KeyboardShortcut[] {
    const globalShortcuts = this.getGlobalShortcuts()
    const contextShortcuts =
      this.currentContext !== 'global' ? this.getShortcutsForContext(this.currentContext) : []

    return [...globalShortcuts, ...contextShortcuts]
  }

  /**
   * Get a shortcut by ID
   */
  getShortcut(id: string): KeyboardShortcut | undefined {
    return this.shortcuts.get(id)
  }

  /**
   * Check if a shortcut exists
   */
  hasShortcut(id: string): boolean {
    return this.shortcuts.has(id)
  }

  /**
   * Enable a shortcut
   */
  enable(id: string): void {
    this.update(id, { enabled: true })
  }

  /**
   * Disable a shortcut
   */
  disable(id: string): void {
    this.update(id, { enabled: false })
  }

  /**
   * Enable all shortcuts
   */
  enableAll(): void {
    this.shortcuts.forEach((_, id) => this.enable(id))
  }

  /**
   * Disable all shortcuts
   */
  disableAll(): void {
    this.shortcuts.forEach((_, id) => this.disable(id))
  }

  /**
   * Handle keydown event
   */
  private handleKeyDown(event: KeyboardEvent): void {
    // Ignore if event target is an input field
    const target = event.target as HTMLElement
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.tagName === 'SELECT' ||
      target.isContentEditable
    ) {
      // Allow Escape key even in input fields
      if (event.key !== 'Escape') {
        return
      }
    }

    // Find matching shortcut
    const shortcut = this.findMatchingShortcut(event)
    if (!shortcut) {
      return
    }

    // Check if shortcut is enabled
    if (shortcut.enabled === false) {
      return
    }

    // Log in debug mode
    if (this.config.debug) {
      console.log(`[ShortcutManager] Triggered: ${shortcut.id}`, {
        key: shortcut.key,
        context: shortcut.context,
        displayText: getShortcutDisplayText(shortcut),
      })
    }

    // Prevent default behavior
    if (this.config.preventDefaultAll) {
      event.preventDefault()
    }

    // Execute the action
    try {
      shortcut.action(event)

      // Notify trigger listeners
      this.triggerListeners.forEach(listener => {
        try {
          listener(shortcut, event)
        } catch (error) {
          console.error('[ShortcutManager] Trigger listener error:', error)
        }
      })
    } catch (error) {
      console.error(`[ShortcutManager] Action error for ${shortcut.id}:`, error)
    }
  }

  /**
   * Find a shortcut that matches the current key event
   */
  private findMatchingShortcut(event: KeyboardEvent): KeyboardShortcut | undefined {
    // Get active shortcuts (global + current context)
    const activeShortcuts = this.getActiveShortcuts()

    for (const shortcut of activeShortcuts) {
      if (this.matchesShortcut(event, shortcut)) {
        return shortcut
      }
    }

    return undefined
  }

  /**
   * Check if an event matches a shortcut
   */
  private matchesShortcut(event: KeyboardEvent, shortcut: KeyboardShortcut): boolean {
    // Check key match (case-insensitive)
    if (event.key.toLowerCase() !== shortcut.key.toLowerCase()) {
      return false
    }

    // Check modifiers
    const eventCtrl = event.ctrlKey || event.metaKey
    const shortcutCtrl = shortcut.ctrl || shortcut.meta || false

    if (shortcutCtrl !== eventCtrl) {
      return false
    }

    // For explicit ctrl/meta check
    if (shortcut.ctrl && !event.ctrlKey) {
      return false
    }

    if (shortcut.meta && !event.metaKey) {
      return false
    }

    // Check alt
    if ((shortcut.alt || false) !== event.altKey) {
      return false
    }

    // Check shift
    if ((shortcut.shift || false) !== event.shiftKey) {
      return false
    }

    return true
  }

  /**
   * Apply user customizations to a shortcut
   */
  private applyCustomizations(shortcut: KeyboardShortcut): KeyboardShortcut {
    const customization = this.userCustomizations.get(shortcut.id)
    if (!customization) {
      return shortcut
    }

    return { ...shortcut, ...customization }
  }

  /**
   * Load default shortcuts
   */
  private loadDefaultShortcuts(): void {
    DEFAULT_SHORTCUTS.forEach(shortcut => {
      this.register(shortcut)
    })
  }

  /**
   * Export shortcuts configuration
   */
  exportConfig(): {
    shortcuts: KeyboardShortcut[]
    customizations: Record<string, Partial<KeyboardShortcut>>
    context: ShortcutContext
  } {
    return {
      shortcuts: Array.from(this.shortcuts.values()),
      customizations: this.getCustomizations(),
      context: this.currentContext,
    }
  }

  /**
   * Import shortcuts configuration
   */
  importConfig(config: {
    shortcuts?: KeyboardShortcut[]
    customizations?: Record<string, Partial<KeyboardShortcut>>
    context?: ShortcutContext
  }): void {
    if (config.shortcuts) {
      config.shortcuts.forEach(shortcut => this.register(shortcut))
    }

    if (config.customizations) {
      this.loadCustomizations(config.customizations)
    }

    if (config.context) {
      this.setContext(config.context)
    }
  }

  /**
   * Reset all shortcuts to defaults
   */
  reset(): void {
    this.shortcuts.clear()
    this.contextShortcuts.clear()
    this.userCustomizations.clear()
    this.loadDefaultShortcuts()
  }
}

/**
 * Create a global singleton instance
 */
let globalInstance: ShortcutManager | null = null

/**
 * Get the global shortcut manager instance
 */
export function getShortcutManager(config?: ShortcutManagerConfig): ShortcutManager {
  if (!globalInstance) {
    globalInstance = new ShortcutManager(config)
  }
  return globalInstance
}

/**
 * Initialize the global shortcut manager
 */
export function initShortcutManager(config?: ShortcutManagerConfig): ShortcutManager {
  const manager = getShortcutManager(config)
  manager.attach()
  return manager
}

/**
 * Destroy the global shortcut manager
 */
export function destroyShortcutManager(): void {
  if (globalInstance) {
    globalInstance.detach()
    globalInstance = null
  }
}
