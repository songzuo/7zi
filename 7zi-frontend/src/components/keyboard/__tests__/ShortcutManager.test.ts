/**
 * Unit tests for ShortcutManager
 */

import { ShortcutManager } from '@/lib/keyboard/shortcut-manager';
import { Shortcut } from '@/lib/keyboard/shortcut-registry';

describe('ShortcutManager', () => {
  let manager: ShortcutManager;

  beforeEach(() => {
    manager = new ShortcutManager();
  });

  describe('register', () => {
    it('registers a shortcut successfully', () => {
      const shortcut: Shortcut = {
        key: 'cmd+k',
        description: 'Test shortcut',
        category: 'navigation',
        action: vi.fn(),
        enabled: true,
      };

      const result = manager.register(shortcut);

      expect(result.success).toBe(true);
      expect(result.conflict).toBeUndefined();
      expect(manager.get('cmd+k')).toEqual(shortcut);
    });

    it('detects conflicts when registering duplicate key', () => {
      const shortcut1: Shortcut = {
        key: 'cmd+k',
        description: 'First shortcut',
        category: 'navigation',
        action: vi.fn(),
        enabled: true,
      };

      const shortcut2: Shortcut = {
        key: 'cmd+k',
        description: 'Second shortcut',
        category: 'system',
        action: vi.fn(),
        enabled: true,
      };

      manager.register(shortcut1);
      const result = manager.register(shortcut2);

      expect(result.success).toBe(false);
      expect(result.conflict).toBeDefined();
      expect(result.conflict?.existingShortcut).toEqual(shortcut1);
      expect(result.conflict?.newShortcut).toEqual(shortcut2);
    });
  });

  describe('registerBatch', () => {
    it('registers multiple shortcuts', () => {
      const shortcuts: Shortcut[] = [
        {
          key: 'cmd+k',
          description: 'Search',
          category: 'navigation',
          action: vi.fn(),
          enabled: true,
        },
        {
          key: 'cmd+s',
          description: 'Save',
          category: 'system',
          action: vi.fn(),
          enabled: true,
        },
      ];

      const result = manager.registerBatch(shortcuts);

      expect(result.success).toBe(true);
      expect(result.conflicts).toHaveLength(0);
      expect(manager.getAll()).toHaveLength(2);
    });

    it('returns conflicts for duplicate keys', () => {
      const shortcuts: Shortcut[] = [
        {
          key: 'cmd+k',
          description: 'First',
          category: 'navigation',
          action: vi.fn(),
          enabled: true,
        },
        {
          key: 'cmd+k',
          description: 'Second',
          category: 'system',
          action: vi.fn(),
          enabled: true,
        },
      ];

      const result = manager.registerBatch(shortcuts);

      expect(result.success).toBe(false);
      expect(result.conflicts).toHaveLength(1);
    });
  });

  describe('update', () => {
    it('updates shortcut properties', () => {
      const shortcut: Shortcut = {
        key: 'cmd+k',
        description: 'Original',
        category: 'navigation',
        action: vi.fn(),
        enabled: true,
      };

      manager.register(shortcut);
      const result = manager.update('cmd+k', { description: 'Updated' });

      expect(result.success).toBe(true);
      expect(manager.get('cmd+k')?.description).toBe('Updated');
    });

    it('detects conflicts when changing key', () => {
      const shortcut1: Shortcut = {
        key: 'cmd+k',
        description: 'First',
        category: 'navigation',
        action: vi.fn(),
        enabled: true,
      };

      const shortcut2: Shortcut = {
        key: 'cmd+s',
        description: 'Second',
        category: 'system',
        action: vi.fn(),
        enabled: true,
      };

      manager.register(shortcut1);
      manager.register(shortcut2);

      const result = manager.update('cmd+k', { key: 'cmd+s' });

      expect(result.success).toBe(false);
      expect(result.conflict).toBeDefined();
    });
  });

  describe('setCustomBinding', () => {
    it('sets custom key binding', () => {
      const shortcut: Shortcut = {
        key: 'cmd+k',
        description: 'Search',
        category: 'navigation',
        action: vi.fn(),
        enabled: true,
      };

      manager.register(shortcut);
      const result = manager.setCustomBinding('cmd+k', 'ctrl+shift+f');

      expect(result.success).toBe(true);
      expect(manager.get('ctrl+shift+f')).toBeDefined();
    });

    it('detects conflicts with existing shortcuts', () => {
      const shortcut1: Shortcut = {
        key: 'cmd+k',
        description: 'Search',
        category: 'navigation',
        action: vi.fn(),
        enabled: true,
      };

      const shortcut2: Shortcut = {
        key: 'cmd+s',
        description: 'Save',
        category: 'system',
        action: vi.fn(),
        enabled: true,
      };

      manager.register(shortcut1);
      manager.register(shortcut2);

      const result = manager.setCustomBinding('cmd+k', 'cmd+s');

      expect(result.success).toBe(false);
      expect(result.conflict).toBeDefined();
    });
  });

  describe('search', () => {
    beforeEach(() => {
      manager.register({
        key: 'cmd+k',
        description: 'Open global search',
        category: 'navigation',
        action: vi.fn(),
        enabled: true,
      });

      manager.register({
        key: 'cmd+s',
        description: 'Save document',
        category: 'system',
        action: vi.fn(),
        enabled: true,
      });
    });

    it('searches by description', () => {
      const results = manager.search('search');

      expect(results).toHaveLength(1);
      expect(results[0].description).toContain('search');
    });

    it('searches by key', () => {
      const results = manager.search('cmd+s');

      expect(results).toHaveLength(1);
      expect(results[0].key).toBe('cmd+s');
    });

    it('searches by category', () => {
      const results = manager.search('navigation');

      expect(results).toHaveLength(1);
      expect(results[0].category).toBe('navigation');
    });

    it('returns empty array for no matches', () => {
      const results = manager.search('nonexistent');

      expect(results).toHaveLength(0);
    });
  });

  describe('exportConfig and importConfig', () => {
    it('exports and imports custom bindings', () => {
      const shortcut: Shortcut = {
        key: 'cmd+k',
        description: 'Search',
        category: 'navigation',
        action: vi.fn(),
        enabled: true,
      };

      manager.register(shortcut);
      manager.setCustomBinding('cmd+k', 'ctrl+shift+f');

      const config = manager.exportConfig();
      expect(config['ctrl+shift+f']).toBeDefined();

      const newManager = new ShortcutManager();
      newManager.register(shortcut);
      const result = newManager.importConfig(config);

      expect(result.success).toBe(true);
      expect(newManager.get('ctrl+shift+f')).toBeDefined();
    });
  });

  describe('getByCategory', () => {
    beforeEach(() => {
      manager.register({
        key: 'cmd+k',
        description: 'Search',
        category: 'navigation',
        action: vi.fn(),
        enabled: true,
      });

      manager.register({
        key: 'cmd+s',
        description: 'Save',
        category: 'system',
        action: vi.fn(),
        enabled: true,
      });

      manager.register({
        key: 'cmd+n',
        description: 'New',
        category: 'navigation',
        action: vi.fn(),
        enabled: true,
      });
    });

    it('returns shortcuts by category', () => {
      const navigationShortcuts = manager.getByCategory('navigation');

      expect(navigationShortcuts).toHaveLength(2);
      expect(navigationShortcuts.every(s => s.category === 'navigation')).toBe(true);
    });

    it('returns empty array for non-existent category', () => {
      const editingShortcuts = manager.getByCategory('editing');

      expect(editingShortcuts).toHaveLength(0);
    });
  });

  describe('enable and disable', () => {
    it('enables a shortcut', () => {
      const shortcut: Shortcut = {
        key: 'cmd+k',
        description: 'Search',
        category: 'navigation',
        action: vi.fn(),
        enabled: false,
      };

      manager.register(shortcut);
      manager.enable('cmd+k');

      expect(manager.get('cmd+k')?.enabled).toBe(true);
    });

    it('disables a shortcut', () => {
      const shortcut: Shortcut = {
        key: 'cmd+k',
        description: 'Search',
        category: 'navigation',
        action: vi.fn(),
        enabled: true,
      };

      manager.register(shortcut);
      manager.disable('cmd+k');

      expect(manager.get('cmd+k')?.enabled).toBe(false);
    });
  });

  describe('clear', () => {
    it('clears all shortcuts', () => {
      manager.register({
        key: 'cmd+k',
        description: 'Search',
        category: 'navigation',
        action: vi.fn(),
        enabled: true,
      });

      manager.clear();

      expect(manager.getAll()).toHaveLength(0);
    });
  });
});