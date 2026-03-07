import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useUserPreferences } from '../useUserPreferences';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock navigator
Object.defineProperty(window, 'navigator', {
  value: {
    language: 'zh-CN',
  },
});

// Mock Intl
vi.stubGlobal('Intl', {
  DateTimeFormat: vi.fn(() => ({
    resolvedOptions: () => ({ timeZone: 'Asia/Shanghai' }),
  })),
});

describe('useUserPreferences', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  describe('初始化', () => {
    it('应该返回默认偏好设置', async () => {
      const { result } = renderHook(() => useUserPreferences());

      // 等待 useEffect 执行
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      expect(result.current.preferences).toBeDefined();
      expect(result.current.preferences.theme).toBe('system');
      expect(result.current.mounted).toBe(true);
    });

    it('应该从 localStorage 加载已保存的偏好设置', async () => {
      const savedPreferences = {
        theme: 'dark',
        display: {
          animations: false,
          compactMode: true,
          fontSize: 'large',
        },
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(savedPreferences));

      const { result } = renderHook(() => useUserPreferences());

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      expect(result.current.preferences.theme).toBe('dark');
      expect(result.current.preferences.display.animations).toBe(false);
    });
  });

  describe('updatePreference', () => {
    it('应该更新 display 设置', async () => {
      const { result } = renderHook(() => useUserPreferences());

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      act(() => {
        result.current.updatePreference('display', { animations: false });
      });

      expect(result.current.preferences.display.animations).toBe(false);
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });

    it('应该更新 notifications 设置', async () => {
      const { result } = renderHook(() => useUserPreferences());

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      act(() => {
        result.current.updatePreference('notifications', { enabled: true });
      });

      expect(result.current.preferences.notifications.enabled).toBe(true);
    });

    it('应该更新 locale 设置', async () => {
      const { result } = renderHook(() => useUserPreferences());

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      act(() => {
        result.current.updatePreference('locale', { language: 'en' });
      });

      expect(result.current.preferences.locale.language).toBe('en');
    });
  });

  describe('updateTheme', () => {
    it('应该更新主题', async () => {
      const { result } = renderHook(() => useUserPreferences());

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      act(() => {
        result.current.updateTheme('dark');
      });

      expect(result.current.preferences.theme).toBe('dark');
    });
  });

  describe('resetPreferences', () => {
    it('应该重置所有设置为默认值', async () => {
      const { result } = renderHook(() => useUserPreferences());

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      // 先修改一些设置
      act(() => {
        result.current.updatePreference('display', { animations: false });
      });

      expect(result.current.preferences.display.animations).toBe(false);

      // 重置
      act(() => {
        result.current.resetPreferences();
      });

      expect(result.current.preferences.display.animations).toBe(true);
    });
  });

  describe('exportPreferences', () => {
    it('应该导出有效的 JSON 字符串', async () => {
      const { result } = renderHook(() => useUserPreferences());

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      const exported = result.current.exportPreferences();

      expect(() => JSON.parse(exported)).not.toThrow();
      const parsed = JSON.parse(exported);
      expect(parsed).toHaveProperty('theme');
      expect(parsed).toHaveProperty('display');
    });
  });

  describe('importPreferences', () => {
    it('应该成功导入有效的 JSON', async () => {
      const { result } = renderHook(() => useUserPreferences());

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      const validJson = JSON.stringify({
        theme: 'dark',
        display: {
          animations: false,
          compactMode: true,
          fontSize: 'large',
        },
      });

      let importResult: { success: boolean; error?: string } | undefined;
      act(() => {
        importResult = result.current.importPreferences(validJson);
      });

      expect(importResult).toBeDefined();
      expect(importResult!.success).toBe(true);
      expect(result.current.preferences.theme).toBe('dark');
    });

    it('应该拒绝无效的 JSON', async () => {
      const { result } = renderHook(() => useUserPreferences());

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      let importResult: { success: boolean; error?: string } | undefined;
      act(() => {
        importResult = result.current.importPreferences('invalid json');
      });

      expect(importResult).toBeDefined();
      expect(importResult!.success).toBe(false);
      expect(importResult!.error).toBeDefined();
    });
  });

  describe('hasChanges', () => {
    it('修改设置后 should set hasChanges to true', async () => {
      const { result } = renderHook(() => useUserPreferences());

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      expect(result.current.hasChanges).toBe(false);

      act(() => {
        result.current.updatePreference('display', { animations: false });
      });

      expect(result.current.hasChanges).toBe(true);
    });
  });
});