import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useThemeCustomization, PRESET_THEMES, ThemeConfig } from '../useThemeCustomization';

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

// Mock document.documentElement
const mockStyle = {
  setProperty: vi.fn(),
};

const mockDocumentElement = {
  classList: {
    add: vi.fn(),
    remove: vi.fn(),
    contains: vi.fn(),
  },
  style: mockStyle,
};

vi.stubGlobal('document', {
  documentElement: mockDocumentElement,
});

describe('useThemeCustomization', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('初始化', () => {
    it('应该返回默认主题配置', () => {
      const { result } = renderHook(() => useThemeCustomization());

      expect(result.current.currentTheme).toBeDefined();
      expect(result.current.currentTheme.id).toBeDefined();
      expect(result.current.currentTheme.colors).toBeDefined();
      expect(result.current.currentTheme.spacing).toBeDefined();
      expect(result.current.currentTheme.radius).toBeDefined();
    });

    it('应该提供所有预设主题', () => {
      const { result } = renderHook(() => useThemeCustomization());

      expect(result.current.presetThemes).toBeDefined();
      expect(Object.keys(result.current.presetThemes).length).toBeGreaterThan(0);
      expect(result.current.presetThemes['light-default']).toBeDefined();
      expect(result.current.presetThemes['dark-default']).toBeDefined();
    });

    it('应该在 mounted 后设置为 true', async () => {
      const { result } = renderHook(() => useThemeCustomization());

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current.mounted).toBe(true);
    });
  });

  describe('setTheme', () => {
    it('应该切换到指定主题', async () => {
      const { result } = renderHook(() => useThemeCustomization());

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      act(() => {
        result.current.setTheme('dark-default');
      });

      expect(result.current.currentTheme.id).toBe('dark-default');
      expect(result.current.currentTheme.isDark).toBe(true);
    });

    it('应该切换到 ocean-blue 主题', async () => {
      const { result } = renderHook(() => useThemeCustomization());

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      act(() => {
        result.current.setTheme('ocean-blue');
      });

      expect(result.current.currentTheme.id).toBe('ocean-blue');
      expect(result.current.currentTheme.colors.primary).toBe('#0ea5e9');
    });
  });

  describe('customizeColors', () => {
    it('应该自定义主色调', async () => {
      const { result } = renderHook(() => useThemeCustomization());

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      act(() => {
        result.current.customizeColors({ primary: '#ff0000' });
      });

      expect(result.current.currentTheme.colors.primary).toBe('#ff0000');
    });

    it('应该自定义多个颜色', async () => {
      const { result } = renderHook(() => useThemeCustomization());

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      act(() => {
        result.current.customizeColors({
          primary: '#ff0000',
          accent: '#00ff00',
          background: '#f0f0f0',
        });
      });

      expect(result.current.currentTheme.colors.primary).toBe('#ff0000');
      expect(result.current.currentTheme.colors.accent).toBe('#00ff00');
      expect(result.current.currentTheme.colors.background).toBe('#f0f0f0');
    });
  });

  describe('customizeSpacing', () => {
    it('应该自定义间距配置', async () => {
      const { result } = renderHook(() => useThemeCustomization());

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      act(() => {
        result.current.customizeSpacing({
          componentGap: 24,
          cardPadding: 20,
        });
      });

      expect(result.current.currentTheme.spacing.componentGap).toBe(24);
      expect(result.current.currentTheme.spacing.cardPadding).toBe(20);
    });
  });

  describe('customizeRadius', () => {
    it('应该自定义圆角配置', async () => {
      const { result } = renderHook(() => useThemeCustomization());

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      act(() => {
        result.current.customizeRadius({
          button: 12,
          card: 16,
        });
      });

      expect(result.current.currentTheme.radius.button).toBe(12);
      expect(result.current.currentTheme.radius.card).toBe(16);
    });
  });

  describe('setFontFamily', () => {
    it('应该设置字体', async () => {
      const { result } = renderHook(() => useThemeCustomization());

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      act(() => {
        result.current.setFontFamily('Roboto, sans-serif');
      });

      expect(result.current.currentTheme.fontFamily).toBe('Roboto, sans-serif');
    });
  });

  describe('setAnimationSpeed', () => {
    it('应该设置动画速度', async () => {
      const { result } = renderHook(() => useThemeCustomization());

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      act(() => {
        result.current.setAnimationSpeed(0.5);
      });

      expect(result.current.currentTheme.animationSpeed).toBe(0.5);
    });
  });

  describe('resetTheme', () => {
    it('应该重置为默认主题', async () => {
      const { result } = renderHook(() => useThemeCustomization());

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      // 先修改
      act(() => {
        result.current.customizeColors({ primary: '#ff0000' });
      });

      // 重置
      act(() => {
        result.current.resetTheme();
      });

      expect(result.current.currentTheme.id).toBe('light-default');
      expect(result.current.currentTheme.colors.primary).toBe('#3b82f6');
    });
  });

  describe('exportTheme', () => {
    it('应该导出有效的 JSON', async () => {
      const { result } = renderHook(() => useThemeCustomization());

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      const exported = result.current.exportTheme();

      expect(() => JSON.parse(exported)).not.toThrow();
      const parsed = JSON.parse(exported);
      expect(parsed).toHaveProperty('id');
      expect(parsed).toHaveProperty('colors');
      expect(parsed).toHaveProperty('spacing');
      expect(parsed).toHaveProperty('radius');
    });
  });

  describe('importTheme', () => {
    it('应该成功导入有效的主题配置', async () => {
      const { result } = renderHook(() => useThemeCustomization());

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      const customTheme: ThemeConfig = {
        name: '自定义主题',
        id: 'custom-test',
        isDark: false,
        colors: {
          primary: '#ff6b6b',
          primaryHover: '#ee5a5a',
          accent: '#4ecdc4',
          background: '#f7f7f7',
          foreground: '#2d3436',
          card: '#ffffff',
          border: '#dfe6e9',
          success: '#00b894',
          warning: '#fdcb6e',
          error: '#d63031',
          info: '#0984e3',
        },
        spacing: {
          baseUnit: 4,
          componentGap: 16,
          cardPadding: 16,
          pagePadding: 24,
        },
        radius: {
          button: 8,
          card: 12,
          input: 6,
          modal: 16,
        },
        fontFamily: 'Inter, sans-serif',
        animationSpeed: 1,
      };

      let importResult: { success: boolean; error?: string };
      act(() => {
        importResult = result.current.importTheme(JSON.stringify(customTheme));
      });

      expect(importResult!).toBeDefined();
      if (importResult!) {
        expect(importResult.success).toBe(true);
      }
      expect(result.current.currentTheme.name).toBe('自定义主题');
      expect(result.current.currentTheme.colors.primary).toBe('#ff6b6b');
    });

    it('应该拒绝无效的主题配置', async () => {
      const { result } = renderHook(() => useThemeCustomization());

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      let importResult: { success: boolean; error?: string };
      act(() => {
        importResult = result.current.importTheme('invalid json');
      });

      expect(importResult!).toBeDefined();
      if (importResult!) {
        expect(importResult.success).toBe(false);
        expect(importResult.error).toBeDefined();
      }
    });

    it('应该拒绝缺少必要字段的主题配置', async () => {
      const { result } = renderHook(() => useThemeCustomization());

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      const incompleteTheme = {
        name: '不完整主题',
        id: 'incomplete',
        // 缺少 colors, spacing, radius
      };

      let importResult: { success: boolean; error?: string };
      act(() => {
        importResult = result.current.importTheme(JSON.stringify(incompleteTheme));
      });

      expect(importResult!).toBeDefined();
      if (importResult!) {
        expect(importResult.success).toBe(false);
        expect(importResult.error).toBe('主题配置不完整');
      }
    });
  });

  describe('saveAsCustomTheme', () => {
    it('应该保存为自定义主题', async () => {
      const { result } = renderHook(() => useThemeCustomization());

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      // 先修改当前主题
      act(() => {
        result.current.customizeColors({ primary: '#ff0000' });
      });

      // 保存为自定义主题
      let customId: string;
      act(() => {
        customId = result.current.saveAsCustomTheme('我的主题');
      });

      expect(customId!).toBeDefined();
      expect(result.current.customThemes[customId!]).toBeDefined();
      expect(result.current.customThemes[customId!].name).toBe('我的主题');
      expect(result.current.customThemes[customId!].colors.primary).toBe('#ff0000');
    });
  });

  describe('availableThemes', () => {
    it('应该包含预设和自定义主题', async () => {
      const { result } = renderHook(() => useThemeCustomization());

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      // 添加自定义主题
      act(() => {
        result.current.saveAsCustomTheme('测试主题');
      });

      // availableThemes 应该包含预设和自定义主题
      const themeIds = Object.keys(result.current.availableThemes);
      expect(themeIds.length).toBeGreaterThan(Object.keys(PRESET_THEMES).length);
    });
  });
});

describe('PRESET_THEMES', () => {
  it('应该包含所有预期的预设主题', () => {
    expect(PRESET_THEMES['light-default']).toBeDefined();
    expect(PRESET_THEMES['dark-default']).toBeDefined();
    expect(PRESET_THEMES['ocean-blue']).toBeDefined();
    expect(PRESET_THEMES['forest-green']).toBeDefined();
    expect(PRESET_THEMES['violet-dream']).toBeDefined();
    expect(PRESET_THEMES['midnight-dark']).toBeDefined();
    expect(PRESET_THEMES['high-contrast']).toBeDefined();
  });

  it('每个预设主题都应该有完整的配置', () => {
    Object.values(PRESET_THEMES).forEach((theme) => {
      expect(theme.id).toBeDefined();
      expect(theme.name).toBeDefined();
      expect(theme.isDark).toBeDefined();
      expect(theme.colors).toBeDefined();
      expect(theme.colors.primary).toBeDefined();
      expect(theme.colors.background).toBeDefined();
      expect(theme.colors.foreground).toBeDefined();
      expect(theme.spacing).toBeDefined();
      expect(theme.radius).toBeDefined();
      expect(theme.fontFamily).toBeDefined();
      expect(theme.animationSpeed).toBeDefined();
    });
  });

  it('深色主题应该有 isDark = true', () => {
    expect(PRESET_THEMES['dark-default'].isDark).toBe(true);
    expect(PRESET_THEMES['midnight-dark'].isDark).toBe(true);
  });

  it('浅色主题应该有 isDark = false', () => {
    expect(PRESET_THEMES['light-default'].isDark).toBe(false);
    expect(PRESET_THEMES['ocean-blue'].isDark).toBe(false);
    expect(PRESET_THEMES['forest-green'].isDark).toBe(false);
    expect(PRESET_THEMES['violet-dream'].isDark).toBe(false);
  });

  it('高对比度主题应该有特殊配置', () => {
    const hc = PRESET_THEMES['high-contrast'];
    expect(hc.colors.border).toBe('#000000');
    expect(hc.radius.button).toBe(4);
    expect(hc.animationSpeed).toBe(0.5);
  });
});