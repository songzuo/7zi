import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { ThemeToggle } from '../ThemeToggle';
import { ThemeProvider } from '../ThemeProvider';

// Mock ThemeProvider context
const mockSetTheme = vi.fn();
const mockToggleTheme = vi.fn();

vi.mock('../ThemeProvider', () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useTheme: () => ({
    theme: 'light',
    resolvedTheme: 'light',
    setTheme: mockSetTheme,
    toggleTheme: mockToggleTheme,
  }),
}));

describe('ThemeToggle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('渲染', () => {
    it('渲染简单按钮模式', () => {
      render(<ThemeToggle />);

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      expect(button).toHaveAttribute('aria-label');
    });

    it('显示正确的图标（浅色模式）', () => {
      render(<ThemeToggle />);

      // mock 返回的是 light，所以应该显示太阳图标（切换到深色）
      expect(screen.getByText('☀️')).toBeInTheDocument();
    });

    it('显示下拉菜单模式', () => {
      render(<ThemeToggle showDropdown />);

      expect(screen.getByRole('button', { name: /主题/ })).toBeInTheDocument();
      // 浅色主题应该是当前选中的
      expect(screen.getByText('☀️')).toBeInTheDocument();
      expect(screen.getByText('🌙')).toBeInTheDocument();
      expect(screen.getByText('💻')).toBeInTheDocument();
    });

    it('在下拉模式显示当前主题标签', () => {
      render(<ThemeToggle showDropdown />);

      expect(screen.getByText('浅色')).toBeInTheDocument();
    });
  });

  describe('交互', () => {
    it('点击按钮切换主题（简单模式）', () => {
      render(<ThemeToggle />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(mockToggleTheme).toHaveBeenCalled();
    });

    it('点击按钮打开/关闭下拉菜单（下拉模式）', () => {
      render(<ThemeToggle showDropdown />);

      const button = screen.getByRole('button', { name: /主题/ });

      // 初始状态：下拉菜单应该关闭
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();

      // 打开下拉菜单
      fireEvent.click(button);
      const menu = screen.getByRole('menu');
      expect(menu).toBeInTheDocument();

      // 关闭下拉菜单
      fireEvent.click(button);
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });

    it('选择主题（下拉模式）', () => {
      render(<ThemeToggle showDropdown />);

      // 打开下拉菜单
      fireEvent.click(screen.getByRole('button', { name: /主题/ }));

      // 点击深色主题
      fireEvent.click(screen.getAllByRole('menuitem')[1]);

      expect(mockSetTheme).toHaveBeenCalledWith('dark');
    });

    it('选择主题后关闭下拉菜单', () => {
      render(<ThemeToggle showDropdown />);

      // 打开下拉菜单
      fireEvent.click(screen.getByRole('button', { name: /主题/ }));
      expect(screen.getByRole('menu')).toBeInTheDocument();

      // 点击一个选项
      fireEvent.click(screen.getAllByRole('menuitem')[0]);

      // 下拉菜单应该关闭
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });
  });

  describe('props', () => {
    it('接受不同的尺寸', () => {
      const { container } = render(<ThemeToggle size="sm" />);
      const button = container.querySelector('.p-1');
      expect(button).toBeInTheDocument();

      render(<ThemeToggle size="md" />);
      const mediumButton = document.body.querySelector('.p-2');
      expect(mediumButton).toBeInTheDocument();

      render(<ThemeToggle size="lg" />);
      const largeButton = document.body.querySelector('.p-3');
      expect(largeButton).toBeInTheDocument();
    });

    it('禁用涟漪动画', () => {
      render(<ThemeToggle enableRipple={false} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      // 不应该创建涟漪元素
      expect(document.querySelector('.theme-switch-ripple')).not.toBeInTheDocument();
    });
  });

  describe('键盘导航', () => {
    it('支持 Enter 键切换主题（简单模式）', () => {
      render(<ThemeToggle />);

      const button = screen.getByRole('button');
      fireEvent.keyDown(button, { key: 'Enter' });

      expect(mockToggleTheme).toHaveBeenCalled();
    });

    it('支持空格键切换主题（简单模式）', () => {
      render(<ThemeToggle />);

      const button = screen.getByRole('button');
      fireEvent.keyDown(button, { key: ' ' });

      expect(mockToggleTheme).toHaveBeenCalled();
    });

    it('支持 Enter 键打开下拉菜单（下拉模式）', () => {
      render(<ThemeToggle showDropdown />);

      const button = screen.getByRole('button', { name: /主题/ });
      fireEvent.keyDown(button, { key: 'Enter' });

      expect(screen.getByRole('menu')).toBeInTheDocument();
    });

    it('支持 Escape 键关闭下拉菜单', () => {
      render(<ThemeToggle showDropdown />);

      // 打开下拉菜单
      fireEvent.click(screen.getByRole('button', { name: /主题/ }));

      const button = screen.getByRole('button', { name: /主题/ });
      fireEvent.keyDown(button, { key: 'Escape' });

      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });

    it('支持下箭头键导航（下拉模式）', () => {
      render(<ThemeToggle showDropdown />);

      // 打开下拉菜单
      fireEvent.click(screen.getByRole('button', { name: /主题/ }));

      const menuitems = screen.getAllByRole('menuitem');
      const firstItem = menuitems[0];

      // 焦点在第一个项目
      firstItem.focus();
      expect(document.activeElement).toBe(firstItem);

      // 按下箭头
      fireEvent.keyDown(firstItem, { key: 'ArrowDown' });

      // 焦点应该移动到第二个项目
      expect(document.activeElement).toBe(menuitems[1]);
    });

    it('支持上箭头键导航（下拉模式）', () => {
      render(<ThemeToggle showDropdown />);

      // 打开下拉菜单
      fireEvent.click(screen.getByRole('button', { name: /主题/ }));

      const menuitems = screen.getAllByRole('menuitem');

      // 聚焦到第二个项目
      menuitems[1].focus();

      // 按上箭头
      fireEvent.keyDown(menuitems[1], { key: 'ArrowUp' });

      // 焦点应该移动到第一个项目
      expect(document.activeElement).toBe(menuitems[0]);
    });
  });

  describe('无障碍性', () => {
    it('简单模式有正确的 ARIA 属性', () => {
      render(<ThemeToggle />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label');
      expect(button).toHaveAttribute('type', 'button');
    });

    it('下拉模式有正确的 ARIA 属性', () => {
      render(<ThemeToggle showDropdown />);

      const button = screen.getByRole('button', { name: /主题/ });
      expect(button).toHaveAttribute('aria-haspopup', 'menu');

      // 打开菜单
      fireEvent.click(button);

      const menu = screen.getByRole('menu');
      expect(menu).toHaveAttribute('aria-orientation', 'vertical');
      expect(menu).toHaveAttribute('aria-label', '主题选项');

      const menuitems = screen.getAllByRole('menuitem');
      menuitems.forEach(item => {
        expect(item).toHaveAttribute('tabindex', '0');
      });
    });

    it('菜单项有正确的 aria-selected 属性', () => {
      render(<ThemeToggle showDropdown />);

      // 打开下拉菜单
      fireEvent.click(screen.getByRole('button', { name: /主题/ }));

      const menuitems = screen.getAllByRole('menuitem');
      expect(menuitems[0]).toHaveAttribute('aria-selected', 'true');
      expect(menuitems[1]).toHaveAttribute('aria-selected', 'false');
      expect(menuitems[2]).toHaveAttribute('aria-selected', 'false');
    });

    it('图标有正确的 aria-hidden 属性', () => {
      render(<ThemeToggle />);

      const icons = document.querySelectorAll('[aria-hidden="true"]');
      expect(icons.length).toBeGreaterThan(0);
    });
  });

  describe('视觉效果', () => {
    it('下拉菜单有动画效果', () => {
      render(<ThemeToggle showDropdown />);

      // 打开下拉菜单
      fireEvent.click(screen.getByRole('button', { name: /主题/ }));

      const menu = screen.getByRole('menu');
      expect(menu).toHaveClass('animate-fadeIn');
    });

    it('下拉箭头旋转效果', () => {
      render(<ThemeToggle showDropdown />);

      const button = screen.getByRole('button', { name: /主题/ });
      const arrow = button.querySelector('span:last-child');

      // 初始状态
      expect(arrow).not.toHaveClass('rotate-180');

      // 打开菜单
      fireEvent.click(button);
      expect(arrow).toHaveClass('rotate-180');
    });
  });
});