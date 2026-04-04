/**
 * Global Keyboard Shortcut Manager with Conflict Detection
 * Enhanced version of shortcut-registry with advanced features
 */

import { Shortcut, ShortcutCategory } from './shortcut-registry';

export interface ShortcutConflict {
  existingShortcut: Shortcut;
  newShortcut: Shortcut;
  severity: 'error' | 'warning';
}

export interface ShortcutBinding {
  key: string;
  customKey?: string;
  enabled: boolean;
}

export class ShortcutManager {
  private shortcuts: Map<string, Shortcut> = new Map();
  private customBindings: Map<string, ShortcutBinding> = new Map();
  private conflicts: ShortcutConflict[] = [];

  /**
   * Register a shortcut with conflict detection
   */
  register(shortcut: Shortcut): { success: boolean; conflict?: ShortcutConflict } {
    const existing = this.shortcuts.get(shortcut.key);

    if (existing) {
      const conflict: ShortcutConflict = {
        existingShortcut: existing,
        newShortcut: shortcut,
        severity: 'error',
      };
      this.conflicts.push(conflict);
      return { success: false, conflict };
    }

    this.shortcuts.set(shortcut.key, shortcut);
    return { success: true };
  }

  /**
   * Register multiple shortcuts
   */
  registerBatch(shortcuts: Shortcut[]): { success: boolean; conflicts: ShortcutConflict[] } {
    const conflicts: ShortcutConflict[] = [];
    let allSuccess = true;

    for (const shortcut of shortcuts) {
      const result = this.register(shortcut);
      if (!result.success && result.conflict) {
        conflicts.push(result.conflict);
        allSuccess = false;
      }
    }

    return { success: allSuccess, conflicts };
  }

  /**
   * Unregister a shortcut
   */
  unregister(key: string): void {
    this.shortcuts.delete(key);
    this.customBindings.delete(key);
    this.clearConflictsFor(key);
  }

  /**
   * Get a shortcut by key
   */
  get(key: string): Shortcut | undefined {
    return this.shortcuts.get(key);
  }

  /**
   * Get all shortcuts
   */
  getAll(): Shortcut[] {
    return Array.from(this.shortcuts.values());
  }

  /**
   * Get shortcuts by category
   */
  getByCategory(category: ShortcutCategory): Shortcut[] {
    return Array.from(this.shortcuts.values()).filter(
      shortcut => shortcut.category === category
    );
  }

  /**
   * Update a shortcut
   */
  update(key: string, updates: Partial<Shortcut>): { success: boolean; conflict?: ShortcutConflict } {
    const shortcut = this.shortcuts.get(key);
    if (!shortcut) {
      return { success: false };
    }

    const updated = { ...shortcut, ...updates };

    // If key is being changed, check for conflicts
    if (updates.key && updates.key !== key) {
      const existing = this.shortcuts.get(updates.key);
      if (existing) {
        const conflict: ShortcutConflict = {
          existingShortcut: existing,
          newShortcut: updated,
          severity: 'error',
        };
        return { success: false, conflict };
      }

      this.shortcuts.delete(key);
      this.shortcuts.set(updates.key, updated);
      return { success: true };
    }

    this.shortcuts.set(key, updated);
    return { success: true };
  }

  /**
   * Clear all shortcuts
   */
  clear(): void {
    this.shortcuts.clear();
    this.customBindings.clear();
    this.conflicts = [];
  }

  /**
   * Enable a shortcut
   */
  enable(key: string): void {
    const shortcut = this.shortcuts.get(key);
    if (shortcut) {
      this.shortcuts.set(key, { ...shortcut, enabled: true });
    }
  }

  /**
   * Disable a shortcut
   */
  disable(key: string): void {
    const shortcut = this.shortcuts.get(key);
    if (shortcut) {
      this.shortcuts.set(key, { ...shortcut, enabled: false });
    }
  }

  /**
   * Set custom key binding
   */
  setCustomBinding(originalKey: string, customKey: string): { success: boolean; conflict?: ShortcutConflict } {
    const shortcut = this.shortcuts.get(originalKey);
    if (!shortcut) {
      return { success: false };
    }

    // Check if custom key conflicts with existing shortcut
    const existing = this.shortcuts.get(customKey);
    if (existing && existing.key !== originalKey) {
      const conflict: ShortcutConflict = {
        existingShortcut: existing,
        newShortcut: { ...shortcut, key: customKey },
        severity: 'error',
      };
      return { success: false, conflict };
    }

    // Update the shortcut with new key
    const result = this.update(originalKey, { key: customKey });
    if (result.success) {
      this.customBindings.set(customKey, {
        key: originalKey,
        customKey,
        enabled: shortcut.enabled !== false,
      });
    }

    return result;
  }

  /**
   * Reset a shortcut to its default key
   */
  resetToDefault(originalKey: string, defaultKey: string): boolean {
    const binding = this.customBindings.get(originalKey);
    if (!binding) {
      return false;
    }

    const result = this.update(originalKey, { key: defaultKey });
    if (result.success) {
      this.customBindings.delete(originalKey);
    }

    return result.success;
  }

  /**
   * Get all custom bindings
   */
  getCustomBindings(): ShortcutBinding[] {
    return Array.from(this.customBindings.values());
  }

  /**
   * Get all conflicts
   */
  getConflicts(): ShortcutConflict[] {
    return [...this.conflicts];
  }

  /**
   * Clear conflicts for a specific key
   */
  private clearConflictsFor(key: string): void {
    this.conflicts = this.conflicts.filter(
      conflict => conflict.existingShortcut.key !== key && conflict.newShortcut.key !== key
    );
  }

  /**
   * Search shortcuts by description or key
   */
  search(query: string): Shortcut[] {
    const lowerQuery = query.toLowerCase();
    return this.getAll().filter(shortcut =>
      shortcut.description.toLowerCase().includes(lowerQuery) ||
      shortcut.key.toLowerCase().includes(lowerQuery) ||
      shortcut.category.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Export shortcuts configuration
   */
  exportConfig(): Record<string, ShortcutBinding> {
    const config: Record<string, ShortcutBinding> = {};
    this.customBindings.forEach((binding, key) => {
      config[key] = binding;
    });
    return config;
  }

  /**
   * Import shortcuts configuration
   */
  importConfig(config: Record<string, ShortcutBinding>): { success: boolean; conflicts: ShortcutConflict[] } {
    const conflicts: ShortcutConflict[] = [];
    let allSuccess = true;

    for (const [customKey, binding] of Object.entries(config)) {
      const result = this.setCustomBinding(binding.key, customKey);
      if (!result.success && result.conflict) {
        conflicts.push(result.conflict);
        allSuccess = false;
      }
    }

    return { success: allSuccess, conflicts };
  }
}

// Global singleton instance
export const shortcutManager = new ShortcutManager();