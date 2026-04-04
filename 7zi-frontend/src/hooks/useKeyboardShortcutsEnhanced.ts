/**
 * Enhanced Keyboard Shortcuts Hook with Conflict Detection
 * Supports the new ShortcutManager
 */

import { useEffect, useCallback, useRef, useState } from 'react';
import { shortcutManager, ShortcutConflict } from '@/lib/keyboard/shortcut-manager';
import { Shortcut } from '@/lib/keyboard/shortcut-registry';

export interface UseKeyboardShortcutsEnhancedOptions {
  enabled?: boolean;
  preventDefault?: boolean;
  stopPropagation?: boolean;
  onConflict?: (conflict: ShortcutConflict) => void;
}

/**
 * Enhanced hook for using keyboard shortcuts with conflict detection
 */
export function useKeyboardShortcutsEnhanced(
  shortcuts: Shortcut[],
  options: UseKeyboardShortcutsEnhancedOptions = {}
) {
  const {
    enabled = true,
    preventDefault = true,
    stopPropagation = false,
    onConflict,
  } = options;

  const shortcutsRef = useRef<Shortcut[]>(shortcuts);
  const [conflicts, setConflicts] = useState<ShortcutConflict[]>([]);

  // Update ref when shortcuts change
  useEffect(() => {
    shortcutsRef.current = shortcuts;
  }, [shortcuts]);

  // Register shortcuts and detect conflicts
  useEffect(() => {
    const result = shortcutManager.registerBatch(shortcuts);

    if (result.conflicts.length > 0) {
      setConflicts(result.conflicts);
      result.conflicts.forEach(conflict => {
        onConflict?.(conflict);
      });
    } else {
      setConflicts([]);
    }

    return () => {
      shortcuts.forEach(shortcut => {
        shortcutManager.unregister(shortcut.key);
      });
      setConflicts([]);
    };
  }, [shortcuts, onConflict]);

  // Parse key combination
  const parseKey = useCallback((event: KeyboardEvent): string => {
    const parts: string[] = [];

    if (event.ctrlKey) parts.push('ctrl');
    if (event.metaKey) parts.push('cmd');
    if (event.shiftKey) parts.push('shift');
    if (event.altKey) parts.push('alt');

    const key = event.key.toLowerCase();
    parts.push(key);

    return parts.join('+');
  }, []);

  // Handle keyboard events
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      const keyCombo = parseKey(event);

      // Check all registered shortcuts
      const allShortcuts = shortcutManager.getAll();
      const matchingShortcut = allShortcuts.find(
        shortcut =>
          shortcut.key === keyCombo &&
          shortcut.enabled !== false
      );

      if (matchingShortcut) {
        if (preventDefault) {
          event.preventDefault();
        }
        if (stopPropagation) {
          event.stopPropagation();
        }

        matchingShortcut.action();
      }
    },
    [enabled, preventDefault, stopPropagation, parseKey]
  );

  // Add event listener
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  return {
    manager: shortcutManager,
    conflicts,
    register: shortcutManager.register.bind(shortcutManager),
    unregister: shortcutManager.unregister.bind(shortcutManager),
    get: shortcutManager.get.bind(shortcutManager),
    getAll: shortcutManager.getAll.bind(shortcutManager),
    getByCategory: shortcutManager.getByCategory.bind(shortcutManager),
    search: shortcutManager.search.bind(shortcutManager),
    setCustomBinding: shortcutManager.setCustomBinding.bind(shortcutManager),
    resetToDefault: shortcutManager.resetToDefault.bind(shortcutManager),
    exportConfig: shortcutManager.exportConfig.bind(shortcutManager),
    importConfig: shortcutManager.importConfig.bind(shortcutManager),
  };
}

/**
 * Hook for registering a single shortcut with conflict detection
 */
export function useKeyboardShortcutEnhanced(
  shortcut: Shortcut,
  options: UseKeyboardShortcutsEnhancedOptions = {}
) {
  return useKeyboardShortcutsEnhanced([shortcut], options);
}

/**
 * Hook for getting all registered shortcuts with reactive updates
 */
export function useRegisteredShortcutsEnhanced() {
  const [shortcuts, setShortcuts] = useState<Shortcut[]>([]);
  const [conflicts, setConflicts] = useState<ShortcutConflict[]>([]);

  useEffect(() => {
    // Initial load
    setShortcuts(shortcutManager.getAll());
    setConflicts(shortcutManager.getConflicts());

    // Poll for updates
    const interval = setInterval(() => {
      setShortcuts(shortcutManager.getAll());
      setConflicts(shortcutManager.getConflicts());
    }, 500);

    return () => clearInterval(interval);
  }, []);

  return {
    shortcuts,
    conflicts,
    manager: shortcutManager,
  };
}

/**
 * Hook for custom key binding management
 */
export function useCustomBindings() {
  const [customBindings, setCustomBindings] = useState(
    shortcutManager.getCustomBindings()
  );

  const setBinding = useCallback((originalKey: string, customKey: string) => {
    const result = shortcutManager.setCustomBinding(originalKey, customKey);
    if (result.success) {
      setCustomBindings(shortcutManager.getCustomBindings());
    }
    return result;
  }, []);

  const resetBinding = useCallback((originalKey: string, defaultKey: string) => {
    const success = shortcutManager.resetToDefault(originalKey, defaultKey);
    if (success) {
      setCustomBindings(shortcutManager.getCustomBindings());
    }
    return success;
  }, []);

  const exportBindings = useCallback(() => {
    return shortcutManager.exportConfig();
  }, []);

  const importBindings = useCallback((config: Record<string, any>) => {
    const result = shortcutManager.importConfig(config);
    if (result.success) {
      setCustomBindings(shortcutManager.getCustomBindings());
    }
    return result;
  }, []);

  return {
    customBindings,
    setBinding,
    resetBinding,
    exportBindings,
    importBindings,
    hasCustomBindings: customBindings.length > 0,
  };
}