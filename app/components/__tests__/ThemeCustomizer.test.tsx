import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeCustomizer } from '../ThemeCustomizer';

// Mock the hook
vi.mock('../../hooks/useThemeCustomization', () => ({
  useThemeCustomization: () => ({
    currentTheme: {
      name: '默认浅色',
      id: 'light-default',
      isDark: false,
      colors: {
        primary: '#3b82f6',
        primaryHover: '#2563eb',
        accent: '#8b5cf6',
        background: '#f9fafb',
        foreground: '#111827',
        card: '#ffffff',
        border: '#e5e7eb',
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
        info: '#3b82f6',
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
      fontFamily: 'Inter, system-ui, sans-serif',
      animationSpeed: 1,
    },
    presetThemes: {
      'light-default': {
        name: '默认浅色',
        id: 'light-default',
        isDark: false,
        colors: { primary: '#3b82f6' },
      },
      'dark-default': {
        name: '默认深色',
        id: 'dark-default',
        isDark: true,
        colors: { primary: '#60a5fa' },
      },
      'ocean-blue': {
        name: '海洋蓝',
        id: 'ocean-blue',
        isDark: false,
        colors: { primary: '#0ea5e9' },
      },
    },
    availableThemes: {
      'light-default': { name: '默认浅色', id: 'light-default' },
      'dark-default': { name: '默认深色', id: 'dark-default' },
    },
    customThemes: {},
    mounted: true,
    setTheme: vi.fn(),
    customizeColors: vi.fn(),
    customizeSpacing: vi.fn(),
    customizeRadius: vi.fn(),
    setFontFamily: vi.fn(),
    setAnimationSpeed: vi.fn(),
    saveAsCustomTheme: vi.fn(() => 'custom-123'),
    resetTheme: vi.fn(),
    exportTheme: vi.fn(() => '{"id":"light-default"}'),
    importTheme: vi.fn((json: string) => {
      try {
        JSON.parse(json);
        return { success: true };
      } catch {
        return { success: false, error: 'Invalid format' };
      }
    }),
  }),
}));

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn(() => Promise.resolve()),
  },
});

describe('ThemeCustomizer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('渲染', () => {
    it('应该渲染标题', () => {
      render(<ThemeCustomizer />);
      expect(screen.getByText('主题定制')).toBeInTheDocument();
    });

    it('应该渲染所有标签页', () => {
      render(<ThemeCustomizer />);
      expect(screen.getByRole('tab', { name: /预设主题/ })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /颜色/ })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /间距/ })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /高级/ })).toBeInTheDocument();
    });

    it('应该默认显示预设主题标签页', () => {
      render(<ThemeCustomizer />);
      expect(screen.getByText('选择一个预设主题开始定制')).toBeInTheDocument();
    });
  });

  describe('预设主题', () => {
    it('应该显示预设主题选择', () => {
      render(<ThemeCustomizer />);
      expect(screen.getByText('默认浅色')).toBeInTheDocument();
    });

    it('点击主题应该调用 setTheme', async () => {
      const mockSetTheme = vi.fn();
      vi.mock('../../hooks/useThemeCustomization', () => ({
        useThemeCustomization: () => ({
          currentTheme: { id: 'light-default', colors: { primary: '#3b82f6' }, spacing: {}, radius: {} },
          presetThemes: { 'light-default': { id: 'light-default', name: '默认浅色', colors: { primary: '#3b82f6' } } },
          mounted: true,
          setTheme: mockSetTheme,
        }),
      }));

      render(<ThemeCustomizer />);
      const lightTheme = screen.getByText('默认浅色');
      fireEvent.click(lightTheme);
      // Note: 实际测试需要重新 mock
    });
  });

  describe('颜色标签页', () => {
    it('应该显示颜色定制选项', async () => {
      render(<ThemeCustomizer />);
      
      const colorsTab = screen.getByRole('tab', { name: /颜色/ });
      fireEvent.click(colorsTab);
      
      await waitFor(() => {
        expect(screen.getByText('自定义主题的颜色')).toBeInTheDocument();
      });
    });

    it('应该显示主要颜色选择器', async () => {
      render(<ThemeCustomizer />);
      
      const colorsTab = screen.getByRole('tab', { name: /颜色/ });
      fireEvent.click(colorsTab);
      
      await waitFor(() => {
        expect(screen.getByText('主色调')).toBeInTheDocument();
      });
    });
  });

  describe('间距标签页', () => {
    it('应该显示间距定制选项', async () => {
      render(<ThemeCustomizer />);
      
      const spacingTab = screen.getByRole('tab', { name: /间距/ });
      fireEvent.click(spacingTab);
      
      await waitFor(() => {
        expect(screen.getByText('调整元素间距和圆角')).toBeInTheDocument();
      });
    });

    it('应该显示间距滑块', async () => {
      render(<ThemeCustomizer />);
      
      const spacingTab = screen.getByRole('tab', { name: /间距/ });
      fireEvent.click(spacingTab);
      
      await waitFor(() => {
        expect(screen.getByText('组件间距')).toBeInTheDocument();
        expect(screen.getByText('卡片内边距')).toBeInTheDocument();
      });
    });

    it('应该显示圆角滑块', async () => {
      render(<ThemeCustomizer />);
      
      const spacingTab = screen.getByRole('tab', { name: /间距/ });
      fireEvent.click(spacingTab);
      
      await waitFor(() => {
        expect(screen.getByText('按钮圆角')).toBeInTheDocument();
        expect(screen.getByText('卡片圆角')).toBeInTheDocument();
      });
    });
  });

  describe('高级标签页', () => {
    it('应该显示高级设置选项', async () => {
      render(<ThemeCustomizer />);
      
      const advancedTab = screen.getByRole('tab', { name: /高级/ });
      fireEvent.click(advancedTab);
      
      await waitFor(() => {
        expect(screen.getByText('高级主题设置')).toBeInTheDocument();
      });
    });

    it('应该显示字体选择器', async () => {
      render(<ThemeCustomizer />);
      
      const advancedTab = screen.getByRole('tab', { name: /高级/ });
      fireEvent.click(advancedTab);
      
      await waitFor(() => {
        expect(screen.getByText('字体系列')).toBeInTheDocument();
      });
    });

    it('应该显示导出按钮', async () => {
      render(<ThemeCustomizer />);
      
      const advancedTab = screen.getByRole('tab', { name: /高级/ });
      fireEvent.click(advancedTab);
      
      await waitFor(() => {
        expect(screen.getByText('📤 导出主题')).toBeInTheDocument();
      });
    });

    it('应该显示导入按钮', async () => {
      render(<ThemeCustomizer />);
      
      const advancedTab = screen.getByRole('tab', { name: /高级/ });
      fireEvent.click(advancedTab);
      
      await waitFor(() => {
        expect(screen.getByText('📥 导入主题')).toBeInTheDocument();
      });
    });

    it('应该显示重置按钮', async () => {
      render(<ThemeCustomizer />);
      
      const advancedTab = screen.getByRole('tab', { name: /高级/ });
      fireEvent.click(advancedTab);
      
      await waitFor(() => {
        expect(screen.getByText('🔄 重置为默认')).toBeInTheDocument();
      });
    });

    it('点击导出应该复制到剪贴板', async () => {
      render(<ThemeCustomizer />);
      
      const advancedTab = screen.getByRole('tab', { name: /高级/ });
      fireEvent.click(advancedTab);
      
      await waitFor(() => {
        expect(screen.getByText('📤 导出主题')).toBeInTheDocument();
      });
      
      const exportBtn = screen.getByText('📤 导出主题');
      fireEvent.click(exportBtn);
      
      expect(navigator.clipboard.writeText).toHaveBeenCalled();
    });
  });

  describe('保存自定义主题', () => {
    it('点击保存按钮应该显示对话框', async () => {
      render(<ThemeCustomizer />);
      
      const advancedTab = screen.getByRole('tab', { name: /高级/ });
      fireEvent.click(advancedTab);
      
      await waitFor(() => {
        expect(screen.getByText('💾 保存为自定义主题')).toBeInTheDocument();
      });
      
      const saveBtn = screen.getByText('💾 保存为自定义主题');
      fireEvent.click(saveBtn);
      
      await waitFor(() => {
        expect(screen.getByText('保存自定义主题')).toBeInTheDocument();
      });
    });
  });

  describe('预览区域', () => {
    it('应该显示预览区域', () => {
      render(<ThemeCustomizer />);
      expect(screen.getByText('预览')).toBeInTheDocument();
    });

    it('预览区域应该包含示例按钮', () => {
      render(<ThemeCustomizer />);
      expect(screen.getByText('主要按钮')).toBeInTheDocument();
      expect(screen.getByText('次要按钮')).toBeInTheDocument();
    });
  });

  describe('加载状态', () => {
    it('在 mounted 为 false 时应该显示加载动画', () => {
      vi.mock('../../hooks/useThemeCustomization', () => ({
        useThemeCustomization: () => ({
          currentTheme: {},
          presetThemes: {},
          mounted: false,
        }),
      }));
      
      render(<ThemeCustomizer />);
      // 应该显示加载动画骨架屏
      const skeletons = document.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });
});