import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useUserSettings, type UserSettings } from '../useUserSettings';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get store() {
      return store;
    },
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock console.error
const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

const STORAGE_KEY = 'user-settings';

const DEFAULT_SETTINGS: UserSettings = {
  theme: 'system',
  animations: true,
  compact: false,
  notifications: false,
  sounds: false,
  language: 'zh-CN',
  pageSize: 20,
};

describe('useUserSettings', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initialization', () => {
    it('should return default settings when no stored settings', async () => {
      const { result } = renderHook(() => useUserSettings());
      
      await waitFor(() => {
        expect(result.current.mounted).toBe(true);
      });
      
      expect(result.current.settings).toEqual(DEFAULT_SETTINGS);
    });

    it('should load stored settings from localStorage', async () => {
      const storedSettings: Partial<UserSettings> = {
        theme: 'dark',
        animations: false,
        compact: true,
      };
      localStorageMock.setItem(STORAGE_KEY, JSON.stringify(storedSettings));
      
      const { result } = renderHook(() => useUserSettings());
      
      await waitFor(() => {
        expect(result.current.mounted).toBe(true);
      });
      
      expect(result.current.settings.theme).toBe('dark');
      expect(result.current.settings.animations).toBe(false);
      expect(result.current.settings.compact).toBe(true);
      // Default values preserved for missing fields
      expect(result.current.settings.notifications).toBe(false);
      expect(result.current.settings.language).toBe('zh-CN');
    });

    it('should set mounted to true after initialization', async () => {
      const { result } = renderHook(() => useUserSettings());
      
      expect(result.current.mounted).toBe(false);
      
      await waitFor(() => {
        expect(result.current.mounted).toBe(true);
      });
    });

    it('should handle invalid JSON in localStorage gracefully', async () => {
      localStorageMock.setItem(STORAGE_KEY, 'invalid json');
      
      const { result } = renderHook(() => useUserSettings());
      
      await waitFor(() => {
        expect(result.current.mounted).toBe(true);
      });
      
      expect(result.current.settings).toEqual(DEFAULT_SETTINGS);
    });
  });

  describe('updateSetting', () => {
    it('should update a single setting', async () => {
      const { result } = renderHook(() => useUserSettings());
      
      await waitFor(() => {
        expect(result.current.mounted).toBe(true);
      });
      
      act(() => {
        result.current.updateSetting('theme', 'dark');
      });
      
      expect(result.current.settings.theme).toBe('dark');
    });

    it('should update animations setting', async () => {
      const { result } = renderHook(() => useUserSettings());
      
      await waitFor(() => {
        expect(result.current.mounted).toBe(true);
      });
      
      act(() => {
        result.current.updateSetting('animations', false);
      });
      
      expect(result.current.settings.animations).toBe(false);
    });

    it('should update compact setting', async () => {
      const { result } = renderHook(() => useUserSettings());
      
      await waitFor(() => {
        expect(result.current.mounted).toBe(true);
      });
      
      act(() => {
        result.current.updateSetting('compact', true);
      });
      
      expect(result.current.settings.compact).toBe(true);
    });

    it('should update notifications setting', async () => {
      const { result } = renderHook(() => useUserSettings());
      
      await waitFor(() => {
        expect(result.current.mounted).toBe(true);
      });
      
      act(() => {
        result.current.updateSetting('notifications', true);
      });
      
      expect(result.current.settings.notifications).toBe(true);
    });

    it('should update sounds setting', async () => {
      const { result } = renderHook(() => useUserSettings());
      
      await waitFor(() => {
        expect(result.current.mounted).toBe(true);
      });
      
      act(() => {
        result.current.updateSetting('sounds', true);
      });
      
      expect(result.current.settings.sounds).toBe(true);
    });

    it('should update language setting', async () => {
      const { result } = renderHook(() => useUserSettings());
      
      await waitFor(() => {
        expect(result.current.mounted).toBe(true);
      });
      
      act(() => {
        result.current.updateSetting('language', 'en-US');
      });
      
      expect(result.current.settings.language).toBe('en-US');
    });

    it('should update pageSize setting', async () => {
      const { result } = renderHook(() => useUserSettings());
      
      await waitFor(() => {
        expect(result.current.mounted).toBe(true);
      });
      
      act(() => {
        result.current.updateSetting('pageSize', 50);
      });
      
      expect(result.current.settings.pageSize).toBe(50);
    });

    it('should save updated setting to localStorage', async () => {
      const { result } = renderHook(() => useUserSettings());
      
      await waitFor(() => {
        expect(result.current.mounted).toBe(true);
      });
      
      act(() => {
        result.current.updateSetting('theme', 'dark');
      });
      
      const stored = JSON.parse(localStorageMock.store[STORAGE_KEY]);
      expect(stored.theme).toBe('dark');
    });
  });

  describe('updateSettings', () => {
    it('should update multiple settings at once', async () => {
      const { result } = renderHook(() => useUserSettings());
      
      await waitFor(() => {
        expect(result.current.mounted).toBe(true);
      });
      
      act(() => {
        result.current.updateSettings({
          theme: 'dark',
          animations: false,
          compact: true,
        });
      });
      
      expect(result.current.settings.theme).toBe('dark');
      expect(result.current.settings.animations).toBe(false);
      expect(result.current.settings.compact).toBe(true);
    });

    it('should preserve unmodified settings', async () => {
      const { result } = renderHook(() => useUserSettings());
      
      await waitFor(() => {
        expect(result.current.mounted).toBe(true);
      });
      
      act(() => {
        result.current.updateSettings({ theme: 'dark' });
      });
      
      expect(result.current.settings.theme).toBe('dark');
      expect(result.current.settings.animations).toBe(DEFAULT_SETTINGS.animations);
      expect(result.current.settings.language).toBe(DEFAULT_SETTINGS.language);
    });

    it('should save batch updates to localStorage', async () => {
      const { result } = renderHook(() => useUserSettings());
      
      await waitFor(() => {
        expect(result.current.mounted).toBe(true);
      });
      
      act(() => {
        result.current.updateSettings({
          theme: 'dark',
          animations: false,
        });
      });
      
      const stored = JSON.parse(localStorageMock.store[STORAGE_KEY]);
      expect(stored.theme).toBe('dark');
      expect(stored.animations).toBe(false);
    });
  });

  describe('resetSettings', () => {
    it('should reset all settings to defaults', async () => {
      const { result } = renderHook(() => useUserSettings());
      
      await waitFor(() => {
        expect(result.current.mounted).toBe(true);
      });
      
      // Modify settings first
      act(() => {
        result.current.updateSettings({
          theme: 'dark',
          animations: false,
          compact: true,
          notifications: true,
          sounds: true,
          language: 'en-US',
          pageSize: 50,
        });
      });
      
      // Reset
      act(() => {
        result.current.resetSettings();
      });
      
      expect(result.current.settings).toEqual(DEFAULT_SETTINGS);
    });

    it('should save reset settings to localStorage', async () => {
      const { result } = renderHook(() => useUserSettings());
      
      await waitFor(() => {
        expect(result.current.mounted).toBe(true);
      });
      
      act(() => {
        result.current.updateSetting('theme', 'dark');
      });
      
      act(() => {
        result.current.resetSettings();
      });
      
      const stored = JSON.parse(localStorageMock.store[STORAGE_KEY]);
      expect(stored).toEqual(DEFAULT_SETTINGS);
    });
  });

  describe('exportSettings', () => {
    it('should export settings as JSON string', async () => {
      const { result } = renderHook(() => useUserSettings());
      
      await waitFor(() => {
        expect(result.current.mounted).toBe(true);
      });
      
      const exported = result.current.exportSettings();
      const parsed = JSON.parse(exported);
      
      expect(parsed).toEqual(DEFAULT_SETTINGS);
    });

    it('should export modified settings correctly', async () => {
      const { result } = renderHook(() => useUserSettings());
      
      await waitFor(() => {
        expect(result.current.mounted).toBe(true);
      });
      
      act(() => {
        result.current.updateSetting('theme', 'dark');
      });
      
      const exported = result.current.exportSettings();
      const parsed = JSON.parse(exported);
      
      expect(parsed.theme).toBe('dark');
    });
  });

  describe('importSettings', () => {
    it('should import valid settings', async () => {
      const { result } = renderHook(() => useUserSettings());
      
      await waitFor(() => {
        expect(result.current.mounted).toBe(true);
      });
      
      const importResult = act(() => {
        return result.current.importSettings(JSON.stringify({
          theme: 'dark',
          animations: false,
          compact: true,
          notifications: true,
          sounds: true,
          language: 'en-US',
          pageSize: 50,
        }));
      });
      
      expect(importResult.success).toBe(true);
      expect(result.current.settings.theme).toBe('dark');
      expect(result.current.settings.animations).toBe(false);
    });

    it('should return error for invalid JSON', async () => {
      const { result } = renderHook(() => useUserSettings());
      
      await waitFor(() => {
        expect(result.current.mounted).toBe(true);
      });
      
      const importResult = act(() => {
        return result.current.importSettings('invalid json');
      });
      
      expect(importResult.success).toBe(false);
      expect(importResult.error).toBe('Invalid settings format');
    });

    it('should use defaults for invalid field values', async () => {
      const { result } = renderHook(() => useUserSettings());
      
      await waitFor(() => {
        expect(result.current.mounted).toBe(true);
      });
      
      const importResult = act(() => {
        return result.current.importSettings(JSON.stringify({
          theme: 'invalid',
          animations: 'not a boolean',
          pageSize: 'not a number',
        }));
      });
      
      expect(importResult.success).toBe(true);
      expect(result.current.settings.theme).toBe(DEFAULT_SETTINGS.theme);
      expect(result.current.settings.animations).toBe(DEFAULT_SETTINGS.animations);
      expect(result.current.settings.pageSize).toBe(DEFAULT_SETTINGS.pageSize);
    });

    it('should save imported settings to localStorage', async () => {
      const { result } = renderHook(() => useUserSettings());
      
      await waitFor(() => {
        expect(result.current.mounted).toBe(true);
      });
      
      act(() => {
        result.current.importSettings(JSON.stringify({
          theme: 'dark',
        }));
      });
      
      const stored = JSON.parse(localStorageMock.store[STORAGE_KEY]);
      expect(stored.theme).toBe('dark');
    });
  });

  describe('persistence', () => {
    it('should persist settings across hook instances', async () => {
      // First instance sets settings
      const { result: result1 } = renderHook(() => useUserSettings());
      
      await waitFor(() => {
        expect(result1.current.mounted).toBe(true);
      });
      
      act(() => {
        result1.current.updateSetting('theme', 'dark');
      });
      
      // Second instance should load persisted settings
      const { result: result2 } = renderHook(() => useUserSettings());
      
      await waitFor(() => {
        expect(result2.current.mounted).toBe(true);
      });
      
      expect(result2.current.settings.theme).toBe('dark');
    });
  });
});