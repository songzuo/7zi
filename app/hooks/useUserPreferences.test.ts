/**
 * useUserPreferences Hook 测试
 * 
 * 测试覆盖：
 * - 用户偏好设置读取
 * - 偏好设置更新
 * - 通知偏好
 * - 语言设置
 * - 时区设置
 * - 默认值处理
 * - localStorage 模拟
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useUserPreferences, UserPreferences } from './useUserPreferences';

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

// Mock navigator
const mockNavigator = {
  language: 'zh-CN',
};

// Mock Intl.DateTimeFormat
const mockTimezone = 'Asia/Shanghai';
vi.stubGlobal('Intl', {
  DateTimeFormat: vi.fn().mockImplementation(() => ({
    resolvedOptions: () => ({ timeZone: mockTimezone }),
  })),
});

// Setup global mocks
Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
});

Object.defineProperty(global, 'navigator', {
  value: mockNavigator,
  writable: true,
});

describe('useUserPreferences', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('默认值处理', () => {
    it('should return default preferences on initial render', () => {
      const { result } = renderHook(() => useUserPreferences());

      expect(result.current.preferences).toBeDefined();
      expect(result.current.preferences.theme).toBe('system');
      expect(result.current.preferences.display.animations).toBe(true);
      expect(result.current.preferences.display.compactMode).toBe(false);
      expect(result.current.preferences.display.fontSize).toBe('medium');
    });

    it('should have correct default notification settings', () => {
      const { result } = renderHook(() => useUserPreferences());

      expect(result.current.preferences.notifications.enabled).toBe(false);
      expect(result.current.preferences.notifications.taskUpdates).toBe(true);
      expect(result.current.preferences.notifications.mentions).toBe(true);
      expect(result.current.preferences.notifications.system).toBe(true);
      expect(result.current.preferences.notifications.sounds).toBe(false);
      expect(result.current.preferences.notifications.duration).toBe(5);
    });

    it('should have correct default locale settings', () => {
      const { result } = renderHook(() => useUserPreferences());

      expect(result.current.preferences.locale.language).toBe('zh-CN');
      expect(result.current.preferences.locale.timezone).toBe('Asia/Shanghai');
      expect(result.current.preferences.locale.dateFormat).toBe('YYYY-MM-DD');
      expect(result.current.preferences.locale.timeFormat).toBe('24h');
      expect(result.current.preferences.locale.weekStartsOn).toBe(1);
    });

    it('should have correct default privacy settings', () => {
      const { result } = renderHook(() => useUserPreferences());

      expect(result.current.preferences.privacy.showOnlineStatus).toBe(true);
      expect(result.current.preferences.privacy.allowAnalytics).toBe(false);
      expect(result.current.preferences.privacy.publicProfile).toBe(false);
    });

    it('should have correct default advanced settings', () => {
      const { result } = renderHook(() => useUserPreferences());

      expect(result.current.preferences.advanced.autoSaveInterval).toBe(30);
      expect(result.current.preferences.advanced.pageSize).toBe(20);
      expect(result.current.preferences.advanced.experimentalFeatures).toBe(false);
      expect(result.current.preferences.advanced.debugMode).toBe(false);
    });

    it('should start with mounted=false and hasChanges=false', () => {
      const { result } = renderHook(() => useUserPreferences());

      expect(result.current.mounted).toBe(false);
      expect(result.current.hasChanges).toBe(false);
      expect(result.current.lastSaved).toBeNull();
    });
  });

  describe('用户偏好设置读取', () => {
    it('should load preferences from localStorage on mount', async () => {
      const savedPreferences: Partial<UserPreferences> = {
        theme: 'dark',
        display: {
          animations: false,
          compactMode: true,
          fontSize: 'large',
          sidebarExpanded: false,
          showAvatars: false,
          showStatusIndicators: false,
        },
      };

      localStorageMock.setItem('user-preferences-v2', JSON.stringify(savedPreferences));

      const { result } = renderHook(() => useUserPreferences());

      await waitFor(() => {
        expect(result.current.mounted).toBe(true);
      });

      expect(result.current.preferences.theme).toBe('dark');
      expect(result.current.preferences.display.animations).toBe(false);
      expect(result.current.preferences.display.compactMode).toBe(true);
      expect(result.current.preferences.display.fontSize).toBe('large');
    });

    it('should merge saved preferences with defaults', async () => {
      const savedPreferences: Partial<UserPreferences> = {
        theme: 'light',
        notifications: {
          enabled: true,
          taskUpdates: false,
          mentions: true,
          system: true,
          sounds: true,
          duration: 10,
        },
      };

      localStorageMock.setItem('user-preferences-v2', JSON.stringify(savedPreferences));

      const { result } = renderHook(() => useUserPreferences());

      await waitFor(() => {
        expect(result.current.mounted).toBe(true);
      });

      // Saved values
      expect(result.current.preferences.theme).toBe('light');
      expect(result.current.preferences.notifications.enabled).toBe(true);
      expect(result.current.preferences.notifications.duration).toBe(10);

      // Default values (not overridden)
      expect(result.current.preferences.display.animations).toBe(true);
      expect(result.current.preferences.locale.dateFormat).toBe('YYYY-MM-DD');
    });

    it('should handle invalid localStorage data gracefully', async () => {
      localStorageMock.setItem('user-preferences-v2', 'invalid json{');

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { result } = renderHook(() => useUserPreferences());

      await waitFor(() => {
        expect(result.current.mounted).toBe(true);
      });

      // Should fall back to defaults
      expect(result.current.preferences.theme).toBe('system');
      expect(result.current.preferences.display.animations).toBe(true);

      consoleSpy.mockRestore();
    });

    it('should handle empty localStorage', async () => {
      const { result } = renderHook(() => useUserPreferences());

      await waitFor(() => {
        expect(result.current.mounted).toBe(true);
      });

      expect(result.current.preferences.theme).toBe('system');
      expect(localStorageMock.getItem).toHaveBeenCalledWith('user-preferences-v2');
    });
  });

  describe('偏好设置更新', () => {
    it('should update a single preference category', async () => {
      const { result } = renderHook(() => useUserPreferences());

      await waitFor(() => {
        expect(result.current.mounted).toBe(true);
      });

      act(() => {
        result.current.updatePreference('display', { animations: false });
      });

      expect(result.current.preferences.display.animations).toBe(false);
      expect(result.current.hasChanges).toBe(true);
      expect(result.current.lastSaved).not.toBeNull();
    });

    it('should update multiple properties in a category', async () => {
      const { result } = renderHook(() => useUserPreferences());

      await waitFor(() => {
        expect(result.current.mounted).toBe(true);
      });

      act(() => {
        result.current.updatePreference('display', {
          animations: false,
          compactMode: true,
          fontSize: 'large',
        });
      });

      expect(result.current.preferences.display.animations).toBe(false);
      expect(result.current.preferences.display.compactMode).toBe(true);
      expect(result.current.preferences.display.fontSize).toBe('large');
      // Other display properties should remain default
      expect(result.current.preferences.display.sidebarExpanded).toBe(true);
    });

    it('should save to localStorage when updating', async () => {
      const { result } = renderHook(() => useUserPreferences());

      await waitFor(() => {
        expect(result.current.mounted).toBe(true);
      });

      act(() => {
        result.current.updatePreference('notifications', { enabled: true });
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'user-preferences-v2',
        expect.stringContaining('"enabled":true')
      );
    });

    it('should update theme directly', async () => {
      const { result } = renderHook(() => useUserPreferences());

      await waitFor(() => {
        expect(result.current.mounted).toBe(true);
      });

      act(() => {
        result.current.updateTheme('dark');
      });

      expect(result.current.preferences.theme).toBe('dark');
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });

    it('should update preferences in batch', async () => {
      const { result } = renderHook(() => useUserPreferences());

      await waitFor(() => {
        expect(result.current.mounted).toBe(true);
      });

      act(() => {
        result.current.updatePreferences({
          theme: 'light',
          display: { ...result.current.preferences.display, compactMode: true },
        });
      });

      expect(result.current.preferences.theme).toBe('light');
      expect(result.current.preferences.display.compactMode).toBe(true);
      expect(result.current.hasChanges).toBe(true);
    });

    it('should preserve other categories when updating one category', async () => {
      const { result } = renderHook(() => useUserPreferences());

      await waitFor(() => {
        expect(result.current.mounted).toBe(true);
      });

      // Update display
      act(() => {
        result.current.updatePreference('display', { animations: false });
      });

      // Update notifications
      act(() => {
        result.current.updatePreference('notifications', { enabled: true });
      });

      // Both updates should be preserved
      expect(result.current.preferences.display.animations).toBe(false);
      expect(result.current.preferences.notifications.enabled).toBe(true);
    });
  });

  describe('通知偏好', () => {
    it('should update notification settings', async () => {
      const { result } = renderHook(() => useUserPreferences());

      await waitFor(() => {
        expect(result.current.mounted).toBe(true);
      });

      act(() => {
        result.current.updatePreference('notifications', {
          enabled: true,
          sounds: true,
          duration: 10,
        });
      });

      expect(result.current.preferences.notifications.enabled).toBe(true);
      expect(result.current.preferences.notifications.sounds).toBe(true);
      expect(result.current.preferences.notifications.duration).toBe(10);
    });

    it('should compute hasAnyNotificationsEnabled correctly', async () => {
      const { result } = renderHook(() => useUserPreferences());

      await waitFor(() => {
        expect(result.current.mounted).toBe(true);
      });

      // Default: taskUpdates, mentions, system are true
      expect(result.current.hasAnyNotificationsEnabled).toBe(true);

      // Disable all
      act(() => {
        result.current.updatePreference('notifications', {
          taskUpdates: false,
          mentions: false,
          system: false,
        });
      });

      expect(result.current.hasAnyNotificationsEnabled).toBe(false);
    });
  });

  describe('语言设置', () => {
    it('should update language setting', async () => {
      const { result } = renderHook(() => useUserPreferences());

      await waitFor(() => {
        expect(result.current.mounted).toBe(true);
      });

      act(() => {
        result.current.updatePreference('locale', { language: 'en-US' });
      });

      expect(result.current.preferences.locale.language).toBe('en-US');
    });

    it('should update multiple locale settings', async () => {
      const { result } = renderHook(() => useUserPreferences());

      await waitFor(() => {
        expect(result.current.mounted).toBe(true);
      });

      act(() => {
        result.current.updatePreference('locale', {
          language: 'ja-JP',
          dateFormat: 'YYYY-MM-DD',
          timeFormat: '12h',
        });
      });

      expect(result.current.preferences.locale.language).toBe('ja-JP');
      expect(result.current.preferences.locale.dateFormat).toBe('YYYY-MM-DD');
      expect(result.current.preferences.locale.timeFormat).toBe('12h');
    });

    it('should auto-detect browser language on mount', async () => {
      mockNavigator.language = 'en-US';

      const { result } = renderHook(() => useUserPreferences());

      await waitFor(() => {
        expect(result.current.mounted).toBe(true);
      });

      expect(result.current.preferences.locale.language).toBe('en-US');

      // Reset
      mockNavigator.language = 'zh-CN';
    });
  });

  describe('时区设置', () => {
    it('should update timezone setting', async () => {
      const { result } = renderHook(() => useUserPreferences());

      await waitFor(() => {
        expect(result.current.mounted).toBe(true);
      });

      act(() => {
        result.current.updatePreference('locale', { timezone: 'America/New_York' });
      });

      expect(result.current.preferences.locale.timezone).toBe('America/New_York');
    });

    it('should support various timezone values', async () => {
      const { result } = renderHook(() => useUserPreferences());

      await waitFor(() => {
        expect(result.current.mounted).toBe(true);
      });

      const timezones = [
        'Europe/London',
        'America/Los_Angeles',
        'Asia/Tokyo',
        'Australia/Sydney',
      ];

      for (const tz of timezones) {
        act(() => {
          result.current.updatePreference('locale', { timezone: tz });
        });

        expect(result.current.preferences.locale.timezone).toBe(tz);
      }
    });

    it('should auto-detect browser timezone on mount', async () => {
      const { result } = renderHook(() => useUserPreferences());

      await waitFor(() => {
        expect(result.current.mounted).toBe(true);
      });

      // Should use mocked timezone
      expect(result.current.preferences.locale.timezone).toBe('Asia/Shanghai');
    });
  });

  describe('重置功能', () => {
    it('should reset all preferences to defaults', async () => {
      const { result } = renderHook(() => useUserPreferences());

      await waitFor(() => {
        expect(result.current.mounted).toBe(true);
      });

      // Make some changes
      act(() => {
        result.current.updatePreferences({
          theme: 'dark',
          display: { ...result.current.preferences.display, compactMode: true },
          notifications: { ...result.current.preferences.notifications, enabled: true },
        });
      });

      expect(result.current.preferences.theme).toBe('dark');
      expect(result.current.hasChanges).toBe(true);

      // Reset
      act(() => {
        result.current.resetPreferences();
      });

      expect(result.current.preferences.theme).toBe('system');
      expect(result.current.preferences.display.compactMode).toBe(false);
      expect(result.current.preferences.notifications.enabled).toBe(false);
      expect(result.current.hasChanges).toBe(false);
    });

    it('should reset a single category', async () => {
      const { result } = renderHook(() => useUserPreferences());

      await waitFor(() => {
        expect(result.current.mounted).toBe(true);
      });

      // Make changes to multiple categories
      act(() => {
        result.current.updatePreference('display', { animations: false, compactMode: true });
        result.current.updatePreference('notifications', { enabled: true });
      });

      // Reset only display
      act(() => {
        result.current.resetCategory('display');
      });

      // Display should be reset
      expect(result.current.preferences.display.animations).toBe(true);
      expect(result.current.preferences.display.compactMode).toBe(false);

      // Notifications should still have changes
      expect(result.current.preferences.notifications.enabled).toBe(true);
    });

    it('should save to localStorage when resetting', async () => {
      const { result } = renderHook(() => useUserPreferences());

      await waitFor(() => {
        expect(result.current.mounted).toBe(true);
      });

      act(() => {
        result.current.updatePreference('display', { animations: false });
      });

      const savedBefore = localStorageMock.setItem.mock.calls.length;

      act(() => {
        result.current.resetPreferences();
      });

      expect(localStorageMock.setItem).toHaveBeenCalledTimes(savedBefore + 1);
    });
  });

  describe('导入导出功能', () => {
    it('should export preferences as JSON string', async () => {
      const { result } = renderHook(() => useUserPreferences());

      await waitFor(() => {
        expect(result.current.mounted).toBe(true);
      });

      act(() => {
        result.current.updatePreference('display', { animations: false });
      });

      const exported = result.current.exportPreferences();

      expect(exported).toBeDefined();
      expect(typeof exported).toBe('string');

      const parsed = JSON.parse(exported);
      expect(parsed.display.animations).toBe(false);
    });

    it('should import valid preferences', async () => {
      const { result } = renderHook(() => useUserPreferences());

      await waitFor(() => {
        expect(result.current.mounted).toBe(true);
      });

      const importJson = JSON.stringify({
        theme: 'dark',
        display: {
          animations: false,
          compactMode: true,
        },
      });

      let importResult: { success: boolean; error?: string };

      act(() => {
        importResult = result.current.importPreferences(importJson);
      });

      expect(importResult!.success).toBe(true);
      expect(result.current.preferences.theme).toBe('dark');
      expect(result.current.preferences.display.animations).toBe(false);
    });

    it('should reject invalid JSON on import', async () => {
      const { result } = renderHook(() => useUserPreferences());

      await waitFor(() => {
        expect(result.current.mounted).toBe(true);
      });

      let importResult: { success: boolean; error?: string };

      act(() => {
        importResult = result.current.importPreferences('not valid json');
      });

      expect(importResult!.success).toBe(false);
      expect(importResult!.error).toBe('无效的设置格式');
    });

    it('should merge imported preferences with defaults', async () => {
      const { result } = renderHook(() => useUserPreferences());

      await waitFor(() => {
        expect(result.current.mounted).toBe(true);
      });

      // Import partial settings
      const importJson = JSON.stringify({
        theme: 'light',
      });

      act(() => {
        result.current.importPreferences(importJson);
      });

      // Imported value
      expect(result.current.preferences.theme).toBe('light');

      // Other values should be defaults
      expect(result.current.preferences.display.animations).toBe(true);
      expect(result.current.preferences.locale.language).toBe('zh-CN');
    });
  });

  describe('派生值', () => {
    it('should compute hasAnyNotificationsEnabled correctly', async () => {
      const { result } = renderHook(() => useUserPreferences());

      await waitFor(() => {
        expect(result.current.mounted).toBe(true);
      });

      // Default has some notifications enabled
      expect(result.current.hasAnyNotificationsEnabled).toBe(true);

      act(() => {
        result.current.updatePreference('notifications', {
          taskUpdates: false,
          mentions: false,
          system: false,
        });
      });

      expect(result.current.hasAnyNotificationsEnabled).toBe(false);

      act(() => {
        result.current.updatePreference('notifications', { mentions: true });
      });

      expect(result.current.hasAnyNotificationsEnabled).toBe(true);
    });

    it('should compute is12HourFormat correctly', async () => {
      const { result } = renderHook(() => useUserPreferences());

      await waitFor(() => {
        expect(result.current.mounted).toBe(true);
      });

      // Default is 24h
      expect(result.current.is12HourFormat).toBe(false);

      act(() => {
        result.current.updatePreference('locale', { timeFormat: '12h' });
      });

      expect(result.current.is12HourFormat).toBe(true);
    });

    it('should compute isCompactLayout correctly', async () => {
      const { result } = renderHook(() => useUserPreferences());

      await waitFor(() => {
        expect(result.current.mounted).toBe(true);
      });

      expect(result.current.isCompactLayout).toBe(false);

      act(() => {
        result.current.updatePreference('display', { compactMode: true });
      });

      expect(result.current.isCompactLayout).toBe(true);
    });

    it('should compute fontSizePx correctly', async () => {
      const { result } = renderHook(() => useUserPreferences());

      await waitFor(() => {
        expect(result.current.mounted).toBe(true);
      });

      expect(result.current.fontSizePx).toBe(16); // medium

      act(() => {
        result.current.updatePreference('display', { fontSize: 'small' });
      });
      expect(result.current.fontSizePx).toBe(14);

      act(() => {
        result.current.updatePreference('display', { fontSize: 'large' });
      });
      expect(result.current.fontSizePx).toBe(18);
    });
  });

  describe('隐私设置', () => {
    it('should update privacy settings', async () => {
      const { result } = renderHook(() => useUserPreferences());

      await waitFor(() => {
        expect(result.current.mounted).toBe(true);
      });

      act(() => {
        result.current.updatePreference('privacy', {
          showOnlineStatus: false,
          allowAnalytics: true,
          publicProfile: true,
        });
      });

      expect(result.current.preferences.privacy.showOnlineStatus).toBe(false);
      expect(result.current.preferences.privacy.allowAnalytics).toBe(true);
      expect(result.current.preferences.privacy.publicProfile).toBe(true);
    });
  });

  describe('高级设置', () => {
    it('should update advanced settings', async () => {
      const { result } = renderHook(() => useUserPreferences());

      await waitFor(() => {
        expect(result.current.mounted).toBe(true);
      });

      act(() => {
        result.current.updatePreference('advanced', {
          autoSaveInterval: 60,
          pageSize: 50,
          experimentalFeatures: true,
          debugMode: true,
        });
      });

      expect(result.current.preferences.advanced.autoSaveInterval).toBe(60);
      expect(result.current.preferences.advanced.pageSize).toBe(50);
      expect(result.current.preferences.advanced.experimentalFeatures).toBe(true);
      expect(result.current.preferences.advanced.debugMode).toBe(true);
    });
  });

  describe('主题设置', () => {
    it('should update theme', async () => {
      const { result } = renderHook(() => useUserPreferences());

      await waitFor(() => {
        expect(result.current.mounted).toBe(true);
      });

      act(() => {
        result.current.updateTheme('dark');
      });

      expect(result.current.preferences.theme).toBe('dark');
    });

    it('should support all theme options', async () => {
      const { result } = renderHook(() => useUserPreferences());

      await waitFor(() => {
        expect(result.current.mounted).toBe(true);
      });

      const themes: Array<'light' | 'dark' | 'system'> = ['light', 'dark', 'system'];

      for (const theme of themes) {
        act(() => {
          result.current.updateTheme(theme);
        });

        expect(result.current.preferences.theme).toBe(theme);
      }
    });
  });

  describe('lastSaved 时间戳', () => {
    it('should update lastSaved on preference change', async () => {
      const { result } = renderHook(() => useUserPreferences());

      await waitFor(() => {
        expect(result.current.mounted).toBe(true);
      });

      expect(result.current.lastSaved).toBeNull();

      act(() => {
        result.current.updatePreference('display', { animations: false });
      });

      expect(result.current.lastSaved).not.toBeNull();
      expect(result.current.lastSaved).toBeInstanceOf(Date);
    });

    it('should update lastSaved on theme change', async () => {
      const { result } = renderHook(() => useUserPreferences());

      await waitFor(() => {
        expect(result.current.mounted).toBe(true);
      });

      act(() => {
        result.current.updateTheme('dark');
      });

      expect(result.current.lastSaved).not.toBeNull();
    });

    it('should update lastSaved on reset', async () => {
      const { result } = renderHook(() => useUserPreferences());

      await waitFor(() => {
        expect(result.current.mounted).toBe(true);
      });

      act(() => {
        result.current.resetPreferences();
      });

      expect(result.current.lastSaved).not.toBeNull();
    });
  });
});