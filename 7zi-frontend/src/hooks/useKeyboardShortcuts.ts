/**
 * Global Keyboard Shortcuts Hook
 */

import { useEffect, useCallback, useRef } from 'react';
import { shortcutRegistry, Shortcut, ShortcutConfig } from '@/lib/keyboard/shortcut-registry';

export interface UseKeyboardShortcutsOptions {
  enabled?: boolean;
  preventDefault?: boolean;
  stopPropagation?: boolean;
}

export function useKeyboardShortcuts(
  shortcuts: Shortcut[],
  options: UseKeyboardShortcutsOptions = {}
) {
  const { enabled = true, preventDefault = true, stopPropagation = false } = options;
  const shortcutsRef = useRef<Shortcut[]>(shortcuts);

  // Update ref when shortcuts change
  useEffect(() => {
    shortcutsRef.current = shortcuts;
  }, [shortcuts]);

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
      const allShortcuts = shortcutRegistry.getAll();
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

  // Register and cleanup shortcuts
  useEffect(() => {
    // Register shortcuts
    shortcuts.forEach(shortcut => {
      shortcutRegistry.register(shortcut);
    });

    // Add event listener
    document.addEventListener('keydown', handleKeyDown);

    // Cleanup
    return () => {
      // Unregister shortcuts
      shortcuts.forEach(shortcut => {
        shortcutRegistry.unregister(shortcut.key);
      });

      // Remove event listener
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [shortcuts, handleKeyDown]);

  return {
    registry: shortcutRegistry,
    register: shortcutRegistry.register.bind(shortcutRegistry),
    unregister: shortcutRegistry.unregister.bind(shortcutRegistry),
    get: shortcutRegistry.get.bind(shortcutRegistry),
    getAll: shortcutRegistry.getAll.bind(shortcutRegistry),
    getByCategory: shortcutRegistry.getByCategory.bind(shortcutRegistry),
  };
}

/**
 * Hook for registering a single shortcut
 */
export function useKeyboardShortcut(
  shortcut: Shortcut,
  options: UseKeyboardShortcutsOptions = {}
) {
  return useKeyboardShortcuts([shortcut], options);
}

/**
 * Hook for getting all registered shortcuts
 */
export function useRegisteredShortcuts() {
  const [shortcuts, setShortcuts] = React.useState(shortcutRegistry.getAll());

  useEffect(() => {
    const interval = setInterval(() => {
      setShortcuts(shortcutRegistry.getAll());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return shortcuts;
}

import React from 'react';