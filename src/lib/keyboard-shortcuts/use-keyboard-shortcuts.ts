/**
 * React Hooks for Keyboard Shortcuts
 *
 * Provides React integration for the ShortcutManager.
 */

import { useEffect, useCallback, useState, useRef, useMemo } from 'react'
import {
  ShortcutManager,
  KeyboardShortcut,
  getShortcutManager,
  initShortcutManager,
  destroyShortcutManager,
} from './shortcut-manager'
import type { ShortcutContext } from './shortcut-config'

/**
 * Props for the useKeyboardShortcuts hook
 */
export interface UseKeyboardShortcutsOptions {
  /** Initial context */
  context?: ShortcutContext
  /** Auto-attach the event listener */
  autoAttach?: boolean
  /** Enable debug logging */
  debug?: boolean
  /** Called when a shortcut is triggered */
  onShortcutTrigger?: (shortcut: KeyboardShortcut, event: KeyboardEvent) => void
  /** Called when context changes */
  onContextChange?: (context: ShortcutContext) => void
}

/**
 * Main hook for using keyboard shortcuts
 */
export function useKeyboardShortcuts(options: UseKeyboardShortcutsOptions = {}) {
  const {
    context = 'global',
    autoAttach = true,
    debug = false,
    onShortcutTrigger,
    onContextChange,
  } = options

  const managerRef = useRef<ShortcutManager | null>(null)
  const [currentContext, setCurrentContext] = useState<ShortcutContext>(context)
  const [activeShortcuts, setActiveShortcuts] = useState<KeyboardShortcut[]>([])
  const [isEnabled, setIsEnabled] = useState(true)

  // Initialize manager
  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    // Get or create manager
    managerRef.current = getShortcutManager({ debug })

    // Auto attach
    if (autoAttach) {
      managerRef.current.attach()
    }

    // Update active shortcuts
    setActiveShortcuts(managerRef.current.getActiveShortcuts())

    // Cleanup
    return () => {
      if (autoAttach) {
        // Don't detach on unmount as other components might be using it
        // Only detach when explicitly calling destroyShortcutManager()
      }
    }
  }, [autoAttach, debug])

  // Update context
  useEffect(() => {
    if (managerRef.current && context !== currentContext) {
      managerRef.current.setContext(context)
      setCurrentContext(context)
      setActiveShortcuts(managerRef.current.getActiveShortcuts())
    }
  }, [context, currentContext])

  // Register listeners
  useEffect(() => {
    if (!managerRef.current) {
      return
    }

    const unsubscribers: (() => void)[] = []

    if (onShortcutTrigger) {
      unsubscribers.push(managerRef.current.onShortcutTrigger(onShortcutTrigger))
    }

    if (onContextChange) {
      unsubscribers.push(managerRef.current.onContextChange(onContextChange))
    }

    return () => {
      unsubscribers.forEach(unsub => unsub())
    }
  }, [onShortcutTrigger, onContextChange])

  // Actions
  const setContext = useCallback((newContext: ShortcutContext) => {
    if (managerRef.current) {
      managerRef.current.setContext(newContext)
      setCurrentContext(newContext)
      setActiveShortcuts(managerRef.current.getActiveShortcuts())
    }
  }, [])

  const registerShortcut = useCallback((shortcut: KeyboardShortcut) => {
    if (managerRef.current) {
      managerRef.current.register(shortcut)
      setActiveShortcuts(managerRef.current.getActiveShortcuts())
    }
  }, [])

  const unregisterShortcut = useCallback((id: string) => {
    if (managerRef.current) {
      managerRef.current.unregister(id)
      setActiveShortcuts(managerRef.current.getActiveShortcuts())
    }
  }, [])

  const enableShortcuts = useCallback(() => {
    if (managerRef.current) {
      managerRef.current.enableAll()
      setIsEnabled(true)
    }
  }, [])

  const disableShortcuts = useCallback(() => {
    if (managerRef.current) {
      managerRef.current.disableAll()
      setIsEnabled(false)
    }
  }, [])

  const toggleShortcuts = useCallback(() => {
    if (isEnabled) {
      disableShortcuts()
    } else {
      enableShortcuts()
    }
  }, [isEnabled, enableShortcuts, disableShortcuts])

  return {
    /** Current context */
    currentContext,
    /** Active shortcuts for current context */
    activeShortcuts,
    /** Whether shortcuts are enabled */
    isEnabled,
    /** Set the current context */
    setContext,
    /** Register a new shortcut */
    registerShortcut,
    /** Unregister a shortcut */
    unregisterShortcut,
    /** Enable all shortcuts */
    enableShortcuts,
    /** Disable all shortcuts */
    disableShortcuts,
    /** Toggle shortcuts enabled state */
    toggleShortcuts,
    /** Get the underlying manager instance */
    getManager: () => managerRef.current,
  }
}

/**
 * Hook for registering a single shortcut
 */
export function useShortcut(
  id: string,
  key: string,
  action: (event: KeyboardEvent) => void,
  options: {
    context?: ShortcutContext
    ctrl?: boolean
    meta?: boolean
    alt?: boolean
    shift?: boolean
    description?: string
    enabled?: boolean
  } = {}
) {
  const { context = 'global', ctrl, meta, alt, shift, description = '', enabled = true } = options

  const shortcut: KeyboardShortcut = useMemo(
    () => ({
      id,
      key,
      context,
      ctrl,
      meta,
      alt,
      shift,
      description,
      action,
      enabled,
    }),
    [id, key, context, ctrl, meta, alt, shift, description, action, enabled]
  )

  useEffect(() => {
    const manager = getShortcutManager()

    if (enabled) {
      manager.register(shortcut)
    }

    return () => {
      manager.unregister(id)
    }
  }, [shortcut, id, enabled])
}

/**
 * Hook for managing multiple shortcuts
 */
export function useShortcuts(shortcuts: KeyboardShortcut[]) {
  useEffect(() => {
    const manager = getShortcutManager()

    shortcuts.forEach(shortcut => {
      manager.register(shortcut)
    })

    return () => {
      shortcuts.forEach(shortcut => {
        manager.unregister(shortcut.id)
      })
    }
  }, [shortcuts])
}

/**
 * Hook for context-aware shortcuts
 */
export function useContextualShortcuts(
  context: ShortcutContext,
  shortcuts: Omit<KeyboardShortcut, 'context'>[]
) {
  const manager = getShortcutManager()

  useEffect(() => {
    // Set context
    manager.setContext(context)

    // Register shortcuts
    const fullShortcuts = shortcuts.map(s => ({ ...s, context }))
    fullShortcuts.forEach(shortcut => {
      manager.register(shortcut)
    })

    return () => {
      // Unregister shortcuts
      fullShortcuts.forEach(shortcut => {
        manager.unregister(shortcut.id)
      })
    }
  }, [context, shortcuts, manager])
}

/**
 * Hook for getting shortcuts for display
 */
export function useShortcutsDisplay(context?: ShortcutContext) {
  const manager = getShortcutManager()
  const [shortcuts, setShortcuts] = useState<KeyboardShortcut[]>([])

  useEffect(() => {
    const targetContext = context || manager.getContext()
    setShortcuts(manager.getShortcutsForContext(targetContext))
  }, [context, manager])

  return shortcuts
}

/**
 * Hook for global shortcuts (Ctrl+K, Escape, etc.)
 */
export function useGlobalShortcuts(
  handlers: {
    onCommandPalette?: () => void
    onSearch?: () => void
    onEscape?: () => void
    onHelp?: () => void
  } = {}
) {
  const shortcuts: KeyboardShortcut[] = useMemo(() => {
    const result: KeyboardShortcut[] = []

    if (handlers.onCommandPalette) {
      result.push({
        id: 'global.command-palette',
        key: 'k',
        context: 'global',
        ctrl: true,
        meta: true,
        description: 'Open command palette',
        action: handlers.onCommandPalette,
      })
    }

    if (handlers.onSearch) {
      result.push({
        id: 'global.search',
        key: '/',
        context: 'global',
        description: 'Open search',
        action: handlers.onSearch,
      })
    }

    if (handlers.onEscape) {
      result.push({
        id: 'global.escape',
        key: 'Escape',
        context: 'global',
        description: 'Close modal/dropdown',
        action: handlers.onEscape,
      })
    }

    if (handlers.onHelp) {
      result.push({
        id: 'global.help',
        key: '?',
        context: 'global',
        shift: true,
        description: 'Show keyboard shortcuts help',
        action: handlers.onHelp,
      })
    }

    return result
  }, [handlers.onCommandPalette, handlers.onSearch, handlers.onEscape, handlers.onHelp])

  useShortcuts(shortcuts)
}

/**
 * Hook for initialization
 */
export function useInitShortcuts(
  options: {
    debug?: boolean
    autoAttach?: boolean
  } = {}
) {
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    initShortcutManager(options)
    setIsReady(true)

    return () => {
      destroyShortcutManager()
    }
  }, [options.debug, options.autoAttach])

  return isReady
}

/**
 * Hook for user customizations
 */
export function useShortcutCustomization() {
  const manager = getShortcutManager()
  const [customizations, setCustomizations] = useState<Record<string, Partial<KeyboardShortcut>>>(
    {}
  )

  useEffect(() => {
    setCustomizations(manager.getCustomizations())
  }, [manager])

  const customize = useCallback(
    (id: string, customization: Partial<KeyboardShortcut>) => {
      manager.setCustomization(id, customization)
      setCustomizations(manager.getCustomizations())
    },
    [manager]
  )

  const reset = useCallback(
    (id: string) => {
      manager.clearCustomization(id)
      setCustomizations(manager.getCustomizations())
    },
    [manager]
  )

  const resetAll = useCallback(() => {
    Object.keys(customizations).forEach(id => {
      manager.clearCustomization(id)
    })
    setCustomizations({})
  }, [manager, customizations])

  return {
    customizations,
    customize,
    reset,
    resetAll,
  }
}

/**
 * Provider component type
 */
export interface ShortcutProviderProps {
  children: React.ReactNode
  /** Initial context */
  initialContext?: ShortcutContext
  /** Enable debug logging */
  debug?: boolean
}

/**
 * Hook to get shortcut manager from context
 */
export function useShortcutManager() {
  return getShortcutManager()
}
