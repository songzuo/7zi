/**
 * Keyboard Shortcuts System for 7zi-frontend v1.12.3
 */

export type ShortcutCategory = 'navigation' | 'editing' | 'workflow' | 'system';

export interface Shortcut {
  key: string;
  description: string;
  category: ShortcutCategory;
  action: () => void;
  enabled?: boolean;
}

export interface ShortcutConfig {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
}

export class ShortcutRegistry {
  private shortcuts: Map<string, Shortcut> = new Map();

  register(shortcut: Shortcut): void {
    this.shortcuts.set(shortcut.key, shortcut);
  }

  unregister(key: string): void {
    this.shortcuts.delete(key);
  }

  get(key: string): Shortcut | undefined {
    return this.shortcuts.get(key);
  }

  getAll(): Shortcut[] {
    return Array.from(this.shortcuts.values());
  }

  getByCategory(category: ShortcutCategory): Shortcut[] {
    return Array.from(this.shortcuts.values()).filter(
      shortcut => shortcut.category === category
    );
  }

  update(key: string, updates: Partial<Shortcut>): void {
    const shortcut = this.shortcuts.get(key);
    if (shortcut) {
      this.shortcuts.set(key, { ...shortcut, ...updates });
    }
  }

  clear(): void {
    this.shortcuts.clear();
  }

  enable(key: string): void {
    const shortcut = this.shortcuts.get(key);
    if (shortcut) {
      this.shortcuts.set(key, { ...shortcut, enabled: true });
    }
  }

  disable(key: string): void {
    const shortcut = this.shortcuts.get(key);
    if (shortcut) {
      this.shortcuts.set(key, { ...shortcut, enabled: false });
    }
  }
}

// Global singleton instance
export const shortcutRegistry = new ShortcutRegistry();
