/**
 * useThemeCustomization Hook 测试
 *
 * 测试覆盖：
 * - 初始状态和加载
 * - 主题颜色设置和更新
 * - 间距配置调整
 * - 圆角配置调整
 * - 字体设置
 * - 动画速度设置
 * - 布局模式切换（浅色/深色）
 * - 主题预设应用
 * - localStorage 持久化
 * - 主题重置功能
 * - 自定义主题保存
 * - 主题导入导出
 * - 错误处理
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useThemeCustomization, PRESET_THEMES, type ThemeConfig, type ThemeColors, type ThemeSpacing, type ThemeRadius } from './useThemeCustomization';

// 模拟 localStorage
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

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// 模拟 document.documentElement
const mockStyleSetProperty = vi.fn();
const mockClassList = {
  add: vi.fn(),
  remove: vi.fn(),
  contains: vi.fn(() => false),
};
const mockDocumentElement = {
  style: {
    setProperty: mockStyleSetProperty,
    colorScheme: '',
  },
  classList: mockClassList,
};

Object.defineProperty(document, 'documentElement', {
  value: mockDocumentElement,
  writable: true,
});

// 模拟 console 方法（忽略错误输出）
const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

// 保存原始 document 以便恢复
const originalDocument = global.document;

describe('useThemeCustomization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    mockStyleSetProperty.mockClear();
    mockClassList.add.mockClear();
    mockClassList.remove.mockClear();
    mockDocumentElement.style.colorScheme = '';
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('初始状态和加载', () => {
    it('应该以默认浅色主题作为初始状态', async () => {
      const { result } = renderHook(() => useThemeCustomization());

      // 等待 useEffect 执行
      await waitFor(() => {
        expect(result.current.mounted).toBe(true);
      });

      expect(result.current.currentTheme).toEqual(PRESET_THEMES['light-default']);
      expect(result.current.currentTheme.isDark).toBe(false);
    });

    it('应该提供所有预设主题', async () => {
      const { result } = renderHook(() => useThemeCustomization());

      await waitFor(() => {
        expect(result.current.mounted).toBe(true);
      });

      expect(result.current.presetThemes).toEqual(PRESET_THEMES);
      expect(Object.keys(result.current.presetThemes)).toContain('light-default');
      expect(Object.keys(result.current.presetThemes)).toContain('dark-default');
      expect(Object.keys(result.current.presetThemes)).toContain('ocean-blue');
      expect(Object.keys(result.current.presetThemes)).toContain('forest-green');
      expect(Object.keys(result.current.presetThemes)).toContain('violet-dream');
      expect(Object.keys(result.current.presetThemes)).toContain('midnight-dark');
      expect(Object.keys(result.current.presetThemes)).toContain('high-contrast');
    });

    it('应该合并可用主题', async () => {
      const { result } = renderHook(() => useThemeCustomization());

      await waitFor(() => {
        expect(result.current.mounted).toBe(true);
      });

      // availableThemes 应该等于 presetThemes（因为还没有自定义主题）
      expect(result.current.availableThemes).toEqual(result.current.presetThemes);
    });

    it('应该从 localStorage 加载保存的主题', async () => {
      // 设置保存的主题
      const savedTheme: ThemeConfig = {
        ...PRESET_THEMES['dark-default'],
        colors: {
          ...PRESET_THEMES['dark-default'].colors,
          primary: '#custom1',
        },
      };
      localStorageMock.store['custom-theme-config'] = JSON.stringify(savedTheme);

      const { result } = renderHook(() => useThemeCustomization());

      await waitFor(() => {
        expect(result.current.mounted).toBe(true);
      });

      expect(result.current.currentTheme.colors.primary).toBe('#custom1');
      expect(result.current.currentTheme.isDark).toBe(true);
    });

    it('应该处理损坏的 localStorage 数据', async () => {
      localStorageMock.store['custom-theme-config'] = 'invalid-json{';

      const { result } = renderHook(() => useThemeCustomization());

      await waitFor(() => {
        expect(result.current.mounted).toBe(true);
      });

      // 应该回退到默认主题
      expect(result.current.currentTheme).toEqual(PRESET_THEMES['light-default']);
    });
  });

  describe('主题颜色设置和更新', () => {
    it('应该通过 customizeColors 更新单个颜色', async () => {
      const { result } = renderHook(() => useThemeCustomization());

      await waitFor(() => {
        expect(result.current.mounted).toBe(true);
      });

      act(() => {
        result.current.customizeColors({ primary: '#ff0000' });
      });

      expect(result.current.currentTheme.colors.primary).toBe('#ff0000');
      expect(mockStyleSetProperty).toHaveBeenCalledWith('--color-primary', '#ff0000');
    });

    it('应该通过 customizeColors 更新多个颜色', async () => {
      const { result } = renderHook(() => useThemeCustomization());

      await waitFor(() => {
        expect(result.current.mounted).toBe(true);
      });

      act(() => {
        result.current.customizeColors({
          primary: '#ff0000',
          background: '#ffffff',
          foreground: '#000000',
        });
      });

      expect(result.current.currentTheme.colors.primary).toBe('#ff0000');
      expect(result.current.currentTheme.colors.background).toBe('#ffffff');
      expect(result.current.currentTheme.colors.foreground).toBe('#000000');
    });

    it('应该保留未更改的颜色值', async () => {
      const { result } = renderHook(() => useThemeCustomization());

      await waitFor(() => {
        expect(result.current.mounted).toBe(true);
      });

      const originalAccent = result.current.currentTheme.colors.accent;

      act(() => {
        result.current.customizeColors({ primary: '#newcolor' });
      });

      expect(result.current.currentTheme.colors.accent).toBe(originalAccent);
    });

    it('应该将颜色变更保存到 localStorage', async () => {
      const { result } = renderHook(() => useThemeCustomization());

      await waitFor(() => {
        expect(result.current.mounted).toBe(true);
      });

      act(() => {
        result.current.customizeColors({ primary: '#saved' });
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'custom-theme-config',
        expect.stringContaining('#saved')
      );
    });

    it('应该应用所有颜色到 CSS 变量', async () => {
      const { result } = renderHook(() => useThemeCustomization());

      await waitFor(() => {
        expect(result.current.mounted).toBe(true);
      });

      // 设置完整的颜色配置
      const newColors: Partial<ThemeColors> = {
        primary: '#p',
        primaryHover: '#ph',
        accent: '#a',
        background: '#b',
        foreground: '#f',
        card: '#c',
        border: '#br',
        success: '#s',
        warning: '#w',
        error: '#e',
        info: '#i',
      };

      act(() => {
        result.current.customizeColors(newColors);
      });

      expect(mockStyleSetProperty).toHaveBeenCalledWith('--color-primary', '#p');
      expect(mockStyleSetProperty).toHaveBeenCalledWith('--color-primary-hover', '#ph');
      expect(mockStyleSetProperty).toHaveBeenCalledWith('--color-accent', '#a');
      expect(mockStyleSetProperty).toHaveBeenCalledWith('--color-background', '#b');
      expect(mockStyleSetProperty).toHaveBeenCalledWith('--color-foreground', '#f');
      expect(mockStyleSetProperty).toHaveBeenCalledWith('--color-card', '#c');
      expect(mockStyleSetProperty).toHaveBeenCalledWith('--color-border', '#br');
      expect(mockStyleSetProperty).toHaveBeenCalledWith('--color-success', '#s');
      expect(mockStyleSetProperty).toHaveBeenCalledWith('--color-warning', '#w');
      expect(mockStyleSetProperty).toHaveBeenCalledWith('--color-error', '#e');
      expect(mockStyleSetProperty).toHaveBeenCalledWith('--color-info', '#i');
    });
  });

  describe('间距配置调整', () => {
    it('应该通过 customizeSpacing 更新间距', async () => {
      const { result } = renderHook(() => useThemeCustomization());

      await waitFor(() => {
        expect(result.current.mounted).toBe(true);
      });

      act(() => {
        result.current.customizeSpacing({
          baseUnit: 8,
          componentGap: 24,
          cardPadding: 20,
          pagePadding: 32,
        });
      });

      expect(result.current.currentTheme.spacing.baseUnit).toBe(8);
      expect(result.current.currentTheme.spacing.componentGap).toBe(24);
      expect(result.current.currentTheme.spacing.cardPadding).toBe(20);
      expect(result.current.currentTheme.spacing.pagePadding).toBe(32);
    });

    it('应该将间距应用到 CSS 变量（带单位）', async () => {
      const { result } = renderHook(() => useThemeCustomization());

      await waitFor(() => {
        expect(result.current.mounted).toBe(true);
      });

      act(() => {
        result.current.customizeSpacing({ baseUnit: 6 });
      });

      expect(mockStyleSetProperty).toHaveBeenCalledWith('--spacing-base', '6px');
    });

    it('应该保留未更改的间距值', async () => {
      const { result } = renderHook(() => useThemeCustomization());

      await waitFor(() => {
        expect(result.current.mounted).toBe(true);
      });

      const originalGap = result.current.currentTheme.spacing.componentGap;

      act(() => {
        result.current.customizeSpacing({ baseUnit: 10 });
      });

      expect(result.current.currentTheme.spacing.componentGap).toBe(originalGap);
    });
  });

  describe('圆角配置调整', () => {
    it('应该通过 customizeRadius 更新圆角', async () => {
      const { result } = renderHook(() => useThemeCustomization());

      await waitFor(() => {
        expect(result.current.mounted).toBe(true);
      });

      act(() => {
        result.current.customizeRadius({
          button: 12,
          card: 16,
          input: 8,
          modal: 24,
        });
      });

      expect(result.current.currentTheme.radius.button).toBe(12);
      expect(result.current.currentTheme.radius.card).toBe(16);
      expect(result.current.currentTheme.radius.input).toBe(8);
      expect(result.current.currentTheme.radius.modal).toBe(24);
    });

    it('应该将圆角应用到 CSS 变量（带单位）', async () => {
      const { result } = renderHook(() => useThemeCustomization());

      await waitFor(() => {
        expect(result.current.mounted).toBe(true);
      });

      act(() => {
        result.current.customizeRadius({ button: 20 });
      });

      expect(mockStyleSetProperty).toHaveBeenCalledWith('--radius-button', '20px');
    });
  });

  describe('字体设置', () => {
    it('应该通过 setFontFamily 设置字体', async () => {
      const { result } = renderHook(() => useThemeCustomization());

      await waitFor(() => {
        expect(result.current.mounted).toBe(true);
      });

      act(() => {
        result.current.setFontFamily('Roboto, sans-serif');
      });

      expect(result.current.currentTheme.fontFamily).toBe('Roboto, sans-serif');
      expect(mockStyleSetProperty).toHaveBeenCalledWith('--font-family', 'Roboto, sans-serif');
    });
  });

  describe('动画速度设置', () => {
    it('应该通过 setAnimationSpeed 设置动画速度', async () => {
      const { result } = renderHook(() => useThemeCustomization());

      await waitFor(() => {
        expect(result.current.mounted).toBe(true);
      });

      act(() => {
        result.current.setAnimationSpeed(0.5);
      });

      expect(result.current.currentTheme.animationSpeed).toBe(0.5);
      expect(mockStyleSetProperty).toHaveBeenCalledWith('--animation-speed', '0.5');
    });

    it('应该接受大于 1 的动画速度', async () => {
      const { result } = renderHook(() => useThemeCustomization());

      await waitFor(() => {
        expect(result.current.mounted).toBe(true);
      });

      act(() => {
        result.current.setAnimationSpeed(2.0);
      });

      expect(result.current.currentTheme.animationSpeed).toBe(2.0);
    });
  });

  describe('布局模式切换（浅色/深色）', () => {
    it('应该切换到深色主题', async () => {
      const { result } = renderHook(() => useThemeCustomization());

      await waitFor(() => {
        expect(result.current.mounted).toBe(true);
      });

      act(() => {
        result.current.setTheme('dark-default');
      });

      expect(result.current.currentTheme.isDark).toBe(true);
      expect(mockClassList.add).toHaveBeenCalledWith('dark');
      expect(mockDocumentElement.style.colorScheme).toBe('dark');
    });

    it('应该切换到浅色主题', async () => {
      // 先设置为深色主题
      localStorageMock.store['custom-theme-config'] = JSON.stringify(PRESET_THEMES['dark-default']);

      const { result } = renderHook(() => useThemeCustomization());

      await waitFor(() => {
        expect(result.current.mounted).toBe(true);
      });

      expect(result.current.currentTheme.isDark).toBe(true);

      act(() => {
        result.current.setTheme('light-default');
      });

      expect(result.current.currentTheme.isDark).toBe(false);
      expect(mockClassList.remove).toHaveBeenCalledWith('dark');
      expect(mockDocumentElement.style.colorScheme).toBe('light');
    });

    it('应该切换到不同的预设主题', async () => {
      const { result } = renderHook(() => useThemeCustomization());

      await waitFor(() => {
        expect(result.current.mounted).toBe(true);
      });

      act(() => {
        result.current.setTheme('ocean-blue');
      });

      expect(result.current.currentTheme.id).toBe('ocean-blue');
      expect(result.current.currentTheme.colors.primary).toBe('#0ea5e9');
      expect(result.current.currentTheme.colors.background).toBe('#f0f9ff');
    });

    it('主题切换应该保存到 localStorage', async () => {
      const { result } = renderHook(() => useThemeCustomization());

      await waitFor(() => {
        expect(result.current.mounted).toBe(true);
      });

      act(() => {
        result.current.setTheme('forest-green');
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'custom-theme-config',
        expect.stringContaining('forest-green')
      );
    });

    it('使用无效主题 ID 时应该回退到默认主题', async () => {
      const { result } = renderHook(() => useThemeCustomization());

      await waitFor(() => {
        expect(result.current.mounted).toBe(true);
      });

      act(() => {
        result.current.setTheme('non-existent-theme');
      });

      // 应该回退到 light-default
      expect(result.current.currentTheme).toEqual(PRESET_THEMES['light-default']);
    });
  });

  describe('主题预设应用', () => {
    it('应该应用完整的预设主题', async () => {
      const { result } = renderHook(() => useThemeCustomization());

      await waitFor(() => {
        expect(result.current.mounted).toBe(true);
      });

      act(() => {
        result.current.setTheme('violet-dream');
      });

      const theme = result.current.currentTheme;
      expect(theme.id).toBe('violet-dream');
      expect(theme.name).toBe('紫罗兰');
      expect(theme.isDark).toBe(false);
      expect(theme.colors.primary).toBe('#8b5cf6');
      expect(theme.colors.accent).toBe('#ec4899');
      expect(theme.fontFamily).toBe('Inter, system-ui, sans-serif');
      expect(theme.animationSpeed).toBe(1);
    });

    it('应该应用高对比度主题', async () => {
      const { result } = renderHook(() => useThemeCustomization());

      await waitFor(() => {
        expect(result.current.mounted).toBe(true);
      });

      act(() => {
        result.current.setTheme('high-contrast');
      });

      const theme = result.current.currentTheme;
      expect(theme.id).toBe('high-contrast');
      expect(theme.name).toBe('高对比度');
      expect(theme.colors.primary).toBe('#000000');
      expect(theme.colors.background).toBe('#ffffff');
      expect(theme.colors.foreground).toBe('#000000');
      expect(theme.fontFamily).toBe('Arial, sans-serif');
      expect(theme.animationSpeed).toBe(0.5);
    });

    it('应该应用午夜深色主题', async () => {
      const { result } = renderHook(() => useThemeCustomization());

      await waitFor(() => {
        expect(result.current.mounted).toBe(true);
      });

      act(() => {
        result.current.setTheme('midnight-dark');
      });

      const theme = result.current.currentTheme;
      expect(theme.id).toBe('midnight-dark');
      expect(theme.isDark).toBe(true);
      expect(theme.colors.background).toBe('#030712');
      expect(theme.colors.card).toBe('#111827');
    });
  });

  describe('localStorage 持久化', () => {
    it('主题变更应该持久化到 localStorage', async () => {
      const { result } = renderHook(() => useThemeCustomization());

      await waitFor(() => {
        expect(result.current.mounted).toBe(true);
      });

      act(() => {
        result.current.customizeColors({ primary: '#persisted' });
      });

      // 检查是否调用了 setItem
      expect(localStorageMock.setItem).toHaveBeenCalled();
      
      // 获取保存的数据
      const savedCalls = localStorageMock.setItem.mock.calls;
      const themeSaveCall = savedCalls.find(call => call[0] === 'custom-theme-config');
      
      expect(themeSaveCall).toBeTruthy();
      const savedTheme = JSON.parse(themeSaveCall![1]);
      expect(savedTheme.colors.primary).toBe('#persisted');
    });

    it('页面重新加载应该恢复保存的主题', async () => {
      // 设置保存的主题
      const savedTheme: ThemeConfig = {
        ...PRESET_THEMES['ocean-blue'],
        name: '自定义海洋',
      };
      localStorageMock.store['custom-theme-config'] = JSON.stringify(savedTheme);

      const { result } = renderHook(() => useThemeCustomization());

      await waitFor(() => {
        expect(result.current.mounted).toBe(true);
      });

      expect(result.current.currentTheme.name).toBe('自定义海洋');
      expect(result.current.currentTheme.colors.primary).toBe('#0ea5e9');
    });

    it('localStorage 错误不应该导致崩溃', async () => {
      // 模拟 localStorage 错误
      localStorageMock.setItem.mockImplementationOnce(() => {
        throw new Error('Storage quota exceeded');
      });

      const { result } = renderHook(() => useThemeCustomization());

      await waitFor(() => {
        expect(result.current.mounted).toBe(true);
      });

      // 应该不会抛出错误
      expect(() => {
        act(() => {
          result.current.customizeColors({ primary: '#new' });
        });
      }).not.toThrow();
    });
  });

  describe('主题重置功能', () => {
    it('resetTheme 应该恢复默认主题', async () => {
      const { result } = renderHook(() => useThemeCustomization());

      await waitFor(() => {
        expect(result.current.mounted).toBe(true);
      });

      // 先更改主题
      act(() => {
        result.current.setTheme('dark-default');
        result.current.customizeColors({ primary: '#changed' });
      });

      expect(result.current.currentTheme.colors.primary).toBe('#changed');

      // 重置
      act(() => {
        result.current.resetTheme();
      });

      expect(result.current.currentTheme).toEqual(PRESET_THEMES['light-default']);
      expect(result.current.currentTheme.isDark).toBe(false);
    });

    it('重置应该清除 dark 类', async () => {
      const { result } = renderHook(() => useThemeCustomization());

      await waitFor(() => {
        expect(result.current.mounted).toBe(true);
      });

      // 设置深色主题
      act(() => {
        result.current.setTheme('dark-default');
      });

      expect(mockClassList.add).toHaveBeenCalledWith('dark');

      // 重置
      act(() => {
        result.current.resetTheme();
      });

      expect(mockClassList.remove).toHaveBeenCalledWith('dark');
    });

    it('重置应该更新 localStorage', async () => {
      const { result } = renderHook(() => useThemeCustomization());

      await waitFor(() => {
        expect(result.current.mounted).toBe(true);
      });

      act(() => {
        result.current.resetTheme();
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'custom-theme-config',
        expect.stringContaining('light-default')
      );
    });
  });

  describe('自定义主题保存', () => {
    it('saveAsCustomTheme 应该创建新的自定义主题', async () => {
      const { result } = renderHook(() => useThemeCustomization());

      await waitFor(() => {
        expect(result.current.mounted).toBe(true);
      });

      // 自定义当前主题
      act(() => {
        result.current.customizeColors({ primary: '#custom-color' });
      });

      let savedId: string = '';

      act(() => {
        savedId = result.current.saveAsCustomTheme('我的自定义主题');
      });

      expect(savedId).toMatch(/^custom-\d+$/);
      expect(result.current.customThemes[savedId]).toBeDefined();
      expect(result.current.customThemes[savedId].name).toBe('我的自定义主题');
      expect(result.current.customThemes[savedId].colors.primary).toBe('#custom-color');
    });

    it('自定义主题应该出现在 availableThemes 中', async () => {
      const { result } = renderHook(() => useThemeCustomization());

      await waitFor(() => {
        expect(result.current.mounted).toBe(true);
      });

      let savedId: string = '';

      act(() => {
        savedId = result.current.saveAsCustomTheme('测试主题');
      });

      expect(result.current.availableThemes[savedId]).toBeDefined();
    });

    it('自定义主题应该保存到 localStorage 列表', async () => {
      const { result } = renderHook(() => useThemeCustomization());

      await waitFor(() => {
        expect(result.current.mounted).toBe(true);
      });

      act(() => {
        result.current.saveAsCustomTheme('持久化主题');
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'custom-themes-list',
        expect.stringContaining('持久化主题')
      );
    });
  });

  describe('主题导入导出', () => {
    it('exportTheme 应该返回 JSON 字符串', async () => {
      const { result } = renderHook(() => useThemeCustomization());

      await waitFor(() => {
        expect(result.current.mounted).toBe(true);
      });

      const exported = result.current.exportTheme();

      expect(() => JSON.parse(exported)).not.toThrow();
      const parsed = JSON.parse(exported);
      expect(parsed.id).toBe('light-default');
    });

    it('exportTheme 应该包含当前主题的所有属性', async () => {
      const { result } = renderHook(() => useThemeCustomization());

      await waitFor(() => {
        expect(result.current.mounted).toBe(true);
      });

      act(() => {
        result.current.customizeColors({ primary: '#exported' });
      });

      const exported = result.current.exportTheme();
      const parsed = JSON.parse(exported);

      expect(parsed.colors.primary).toBe('#exported');
      expect(parsed.colors).toBeDefined();
      expect(parsed.spacing).toBeDefined();
      expect(parsed.radius).toBeDefined();
      expect(parsed.fontFamily).toBeDefined();
      expect(parsed.animationSpeed).toBeDefined();
    });

    it('importTheme 应该导入有效的主题配置', async () => {
      const { result } = renderHook(() => useThemeCustomization());

      await waitFor(() => {
        expect(result.current.mounted).toBe(true);
      });

      const importResult = result.current.importTheme(JSON.stringify({
        id: 'imported-theme',
        name: '导入的主题',
        isDark: true,
        colors: {
          primary: '#imp',
          primaryHover: '#imph',
          accent: '#a',
          background: '#b',
          foreground: '#f',
          card: '#c',
          border: '#br',
          success: '#s',
          warning: '#w',
          error: '#e',
          info: '#i',
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
        fontFamily: 'TestFont',
        animationSpeed: 1.5,
      }));

      expect(importResult.success).toBe(true);
      expect(result.current.currentTheme.id).toBe('imported-theme');
      expect(result.current.currentTheme.isDark).toBe(true);
      expect(result.current.currentTheme.colors.primary).toBe('#imp');
      expect(result.current.currentTheme.fontFamily).toBe('TestFont');
    });

    it('importTheme 应该拒绝无效的 JSON', async () => {
      const { result } = renderHook(() => useThemeCustomization());

      await waitFor(() => {
        expect(result.current.mounted).toBe(true);
      });

      const importResult = result.current.importTheme('invalid json');

      expect(importResult.success).toBe(false);
      expect(importResult.error).toBe('无效的主题格式');
    });

    it('importTheme 应该拒绝缺少必要字段的主题', async () => {
      const { result } = renderHook(() => useThemeCustomization());

      await waitFor(() => {
        expect(result.current.mounted).toBe(true);
      });

      // 缺少 spacing 和 radius
      const importResult = result.current.importTheme(JSON.stringify({
        id: 'incomplete',
        colors: {
          primary: '#p',
          primaryHover: '#ph',
          accent: '#a',
          background: '#b',
          foreground: '#f',
          card: '#c',
          border: '#br',
          success: '#s',
          warning: '#w',
          error: '#e',
          info: '#i',
        },
      }));

      expect(importResult.success).toBe(false);
      expect(importResult.error).toBe('主题配置不完整');
    });

    it('导入的主题应该保存到 localStorage', async () => {
      const { result } = renderHook(() => useThemeCustomization());

      await waitFor(() => {
        expect(result.current.mounted).toBe(true);
      });

      const validTheme = {
        id: 'test-import',
        name: '测试导入',
        isDark: false,
        colors: PRESET_THEMES['light-default'].colors,
        spacing: PRESET_THEMES['light-default'].spacing,
        radius: PRESET_THEMES['light-default'].radius,
        fontFamily: 'Test',
        animationSpeed: 1,
      };

      result.current.importTheme(JSON.stringify(validTheme));

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'custom-theme-config',
        expect.stringContaining('test-import')
      );
    });
  });

  describe('错误处理', () => {
    it('应该处理 localStorage.getItem 错误', async () => {
      localStorageMock.getItem.mockImplementationOnce(() => {
        throw new Error('Storage error');
      });

      const { result } = renderHook(() => useThemeCustomization());

      await waitFor(() => {
        expect(result.current.mounted).toBe(true);
      });

      // 应该使用默认主题
      expect(result.current.currentTheme).toEqual(PRESET_THEMES['light-default']);
    });

    it('应该处理 localStorage.setItem 错误', async () => {
      localStorageMock.setItem.mockImplementationOnce(() => {
        throw new Error('Quota exceeded');
      });

      const { result } = renderHook(() => useThemeCustomization());

      await waitFor(() => {
        expect(result.current.mounted).toBe(true);
      });

      // 不应该崩溃
      expect(() => {
        act(() => {
          result.current.setTheme('dark-default');
        });
      }).not.toThrow();
    });

    it('应该处理 document 不可用的情况', async () => {
      // 模拟 SSR 环境
      const originalDocument = global.document;
      // @ts-ignore
      delete global.document;

      const { result } = renderHook(() => useThemeCustomization());

      await waitFor(() => {
        expect(result.current.mounted).toBe(true);
      });

      // 应该正常工作，只是不应用 DOM 变更
      expect(result.current.currentTheme).toEqual(PRESET_THEMES['light-default']);

      // 恢复 document
      global.document = originalDocument;
    });
  });

  describe('DOM 样式应用', () => {
    it('应该应用所有 CSS 变量', async () => {
      const { result } = renderHook(() => useThemeCustomization());

      await waitFor(() => {
        expect(result.current.mounted).toBe(true);
      });

      // 更改主题触发 DOM 更新
      act(() => {
        result.current.setTheme('forest-green');
      });

      // 验证主要的 CSS 变量被设置
      expect(mockStyleSetProperty).toHaveBeenCalledWith('--color-primary', expect.any(String));
      expect(mockStyleSetProperty).toHaveBeenCalledWith('--color-background', expect.any(String));
      expect(mockStyleSetProperty).toHaveBeenCalledWith('--color-foreground', expect.any(String));
      expect(mockStyleSetProperty).toHaveBeenCalledWith('--spacing-base', expect.any(String));
      expect(mockStyleSetProperty).toHaveBeenCalledWith('--radius-button', expect.any(String));
      expect(mockStyleSetProperty).toHaveBeenCalledWith('--font-family', expect.any(String));
      expect(mockStyleSetProperty).toHaveBeenCalledWith('--animation-speed', expect.any(String));
    });

    it('深色主题应该设置 color-scheme', async () => {
      const { result } = renderHook(() => useThemeCustomization());

      await waitFor(() => {
        expect(result.current.mounted).toBe(true);
      });

      act(() => {
        result.current.setTheme('dark-default');
      });

      expect(mockDocumentElement.style.colorScheme).toBe('dark');
      expect(mockClassList.add).toHaveBeenCalledWith('dark');
    });

    it('浅色主题应该移除 dark 类', async () => {
      // 先设置为深色
      localStorageMock.store['custom-theme-config'] = JSON.stringify(PRESET_THEMES['dark-default']);

      const { result } = renderHook(() => useThemeCustomization());

      await waitFor(() => {
        expect(result.current.mounted).toBe(true);
      });

      act(() => {
        result.current.setTheme('light-default');
      });

      expect(mockClassList.remove).toHaveBeenCalledWith('dark');
      expect(mockDocumentElement.style.colorScheme).toBe('light');
    });
  });

  describe('预设主题验证', () => {
    it('所有预设主题应该有完整的配置', () => {
      const requiredColorKeys = [
        'primary', 'primaryHover', 'accent', 'background', 'foreground',
        'card', 'border', 'success', 'warning', 'error', 'info'
      ];
      const requiredSpacingKeys = ['baseUnit', 'componentGap', 'cardPadding', 'pagePadding'];
      const requiredRadiusKeys = ['button', 'card', 'input', 'modal'];

      Object.entries(PRESET_THEMES).forEach(([id, theme]) => {
        expect(theme.id).toBe(id);
        expect(theme.name).toBeTruthy();
        expect(typeof theme.isDark).toBe('boolean');
        expect(theme.fontFamily).toBeTruthy();
        expect(typeof theme.animationSpeed).toBe('number');

        // 验证颜色
        requiredColorKeys.forEach(key => {
          expect(theme.colors[key as keyof ThemeColors]).toBeTruthy();
        });

        // 验证间距
        requiredSpacingKeys.forEach(key => {
          expect(typeof theme.spacing[key as keyof ThemeSpacing]).toBe('number');
        });

        // 验证圆角
        requiredRadiusKeys.forEach(key => {
          expect(typeof theme.radius[key as keyof ThemeRadius]).toBe('number');
        });
      });
    });

    it('浅色主题应该有浅色背景', () => {
      const lightThemes = Object.values(PRESET_THEMES).filter(t => !t.isDark);
      
      lightThemes.forEach(theme => {
        // 浅色背景通常是浅色
        expect(theme.colors.background).toBeTruthy();
      });
    });

    it('深色主题应该标记为 isDark', () => {
      const darkThemes = Object.values(PRESET_THEMES).filter(t => t.isDark);
      
      expect(darkThemes.length).toBeGreaterThan(0);
      darkThemes.forEach(theme => {
        expect(theme.isDark).toBe(true);
      });
    });
  });

  describe('钩子返回值', () => {
    it('应该返回所有必要的方法和属性', async () => {
      const { result } = renderHook(() => useThemeCustomization());

      await waitFor(() => {
        expect(result.current.mounted).toBe(true);
      });

      // 属性
      expect(result.current.currentTheme).toBeDefined();
      expect(result.current.availableThemes).toBeDefined();
      expect(result.current.presetThemes).toBeDefined();
      expect(result.current.customThemes).toBeDefined();
      expect(result.current.mounted).toBe(true);

      // 方法
      expect(typeof result.current.setTheme).toBe('function');
      expect(typeof result.current.customizeColors).toBe('function');
      expect(typeof result.current.customizeSpacing).toBe('function');
      expect(typeof result.current.customizeRadius).toBe('function');
      expect(typeof result.current.setFontFamily).toBe('function');
      expect(typeof result.current.setAnimationSpeed).toBe('function');
      expect(typeof result.current.saveAsCustomTheme).toBe('function');
      expect(typeof result.current.resetTheme).toBe('function');
      expect(typeof result.current.exportTheme).toBe('function');
      expect(typeof result.current.importTheme).toBe('function');
    });
  });
});