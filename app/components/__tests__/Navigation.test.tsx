import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

// ============================================================================
// Mocks - 必须在导入被测组件之前设置
// ============================================================================

// Mock next/navigation
const mockUsePathname = vi.fn();
vi.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
}));

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode; [key: string]: any }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// Mock next-intl - 必须在导入被测组件之前设置
vi.mock('next-intl', () => ({
  useTranslations: (namespace: string) => (key: string, params?: Record<string, unknown>) => {
    const translations: Record<string, string> = {
      // navigation namespace
      'home': '首页',
      'dashboard': '实时看板',
      'subagents': '子代理',
      'tasks': '任务',
      'profile': '个人资料',
      'settings': '设置',
      'notifications': '通知',
      'mainNav': '主导航',
      'pageNav': '页面导航',
      'aiTeamHome': 'AI 团队首页',
      'current': '当前页面',
      'userActions': '用户操作',
      'openMenu': '打开菜单',
      'closeMenu': '关闭菜单',
      'mobileNav': '移动端导航',
      'menu': '菜单',
      'theme': '主题',
      'settings.language': '语言',
    };
    let result = translations[key] || key;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        result = result.replace(`{${k}}`, String(v));
      });
    }
    return result;
  },
}));

// Mock ThemeProvider
vi.mock('../ThemeProvider', () => ({
  useTheme: () => ({
    theme: 'light',
    resolvedTheme: 'light',
    toggleTheme: vi.fn(),
    setTheme: vi.fn(),
  }),
}));

// Mock ThemeToggle
vi.mock('../ThemeToggle', () => ({
  ThemeToggle: ({ size }: { size: string }) => (
    <button data-testid="theme-toggle" aria-label="切换主题" data-size={size}>
      🌓
    </button>
  ),
}));

// Mock LanguageSwitcher - 使用默认导出
vi.mock('../LanguageSwitcher', () => ({
  default: ({ size }: { size?: string }) => (
    <button data-testid="language-switcher" aria-label="切换语言" data-size={size}>
      🌐
    </button>
  ),
}));

// 导入被测组件
import { Navigation } from '../Navigation';

// ============================================================================
// 测试套件
// ============================================================================

describe('Navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUsePathname.mockReturnValue('/');
  });

  // ============================================================================
  // 基础渲染测试
  // ============================================================================

  describe('Basic Rendering', () => {
    it('should render navigation element', () => {
      render(<Navigation />);
      
      const nav = screen.getByRole('navigation', { name: /主导航/i });
      expect(nav).toBeDefined();
    });

    it('should render logo with link to home', () => {
      render(<Navigation />);
      
      const logoLink = screen.getByRole('link', { name: /AI 团队首页/i });
      expect(logoLink).toBeDefined();
      expect(logoLink.getAttribute('href')).toBe('/');
    });

    it('should render logo icon', () => {
      render(<Navigation />);
      
      const logoLink = screen.getByRole('link', { name: /AI 团队首页/i });
      expect(logoLink.textContent).toContain('🤖');
    });

    it('should render all navigation items', () => {
      render(<Navigation />);
      
      const expectedItems = [
        { label: '首页', href: '/' },
        { label: '实时看板', href: '/dashboard' },
        { label: '子代理', href: '/subagents' },
        { label: '任务', href: '/tasks' },
        { label: '个人资料', href: '/profile' },
        { label: '设置', href: '/settings' },
      ];
      
      expectedItems.forEach(({ label, href }) => {
        const link = screen.getByRole('link', { name: new RegExp(label) });
        expect(link).toBeDefined();
        expect(link.getAttribute('href')).toBe(href);
      });
    });

    it('should render navigation icons', () => {
      render(<Navigation />);
      
      const icons = ['🏠', '📊', '🤖', '📋', '👤', '⚙️'];
      
      icons.forEach(icon => {
        expect(document.body.textContent).toContain(icon);
      });
    });
  });

  // ============================================================================
  // 当前页面高亮测试
  // ============================================================================

  describe('Current Page Highlighting', () => {
    it('should highlight home page when on home', () => {
      mockUsePathname.mockReturnValue('/');
      render(<Navigation />);
      
      const homeLinks = screen.getAllByRole('link', { name: /首页/ });
      expect(homeLinks[0].getAttribute('aria-current')).toBe('page');
    });

    it('should highlight dashboard when on dashboard', () => {
      mockUsePathname.mockReturnValue('/dashboard');
      render(<Navigation />);
      
      const dashboardLinks = screen.getAllByRole('link', { name: /实时看板/ });
      expect(dashboardLinks[0].getAttribute('aria-current')).toBe('page');
    });

    it('should highlight subagents when on subagents page', () => {
      mockUsePathname.mockReturnValue('/subagents');
      render(<Navigation />);
      
      const subagentsLinks = screen.getAllByRole('link', { name: /子代理/ });
      expect(subagentsLinks[0].getAttribute('aria-current')).toBe('page');
    });

    it('should highlight tasks when on tasks page', () => {
      mockUsePathname.mockReturnValue('/tasks');
      render(<Navigation />);
      
      // 查找 href="/tasks" 的链接
      const links = screen.getAllByRole('link');
      const tasksLinks = links.filter(link => link.getAttribute('href') === '/tasks');
      expect(tasksLinks.length).toBeGreaterThan(0);
      expect(tasksLinks[0].getAttribute('aria-current')).toBe('page');
    });

    it('should not highlight other pages when on different page', () => {
      mockUsePathname.mockReturnValue('/dashboard');
      render(<Navigation />);
      
      const homeLinks = screen.getAllByRole('link', { name: /首页/ });
      expect(homeLinks[0].getAttribute('aria-current')).toBeNull();
    });
  });

  // ============================================================================
  // 键盘导航测试
  // ============================================================================

  describe('Keyboard Navigation', () => {
    it('should have navigation links', () => {
      render(<Navigation />);
      
      // 检查所有导航链接
      const links = screen.getAllByRole('link');
      expect(links.length).toBeGreaterThan(0);
    });

    it('should have menuitem role on navigation items', () => {
      render(<Navigation />);
      
      // 检查 menuitem 角色
      const menuItems = screen.getAllByRole('menuitem');
      expect(menuItems.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle keyboard events without errors', () => {
      render(<Navigation />);
      
      const menuItems = screen.getAllByRole('menuitem');
      expect(menuItems.length).toBeGreaterThan(0);
      
      // 触发键盘事件，确保不抛出错误
      fireEvent.keyDown(menuItems[0], { key: 'ArrowRight' });
      fireEvent.keyDown(menuItems[0], { key: 'ArrowLeft' });
      fireEvent.keyDown(menuItems[0], { key: 'Home' });
      fireEvent.keyDown(menuItems[0], { key: 'End' });
    });

    it('should have tabIndex on menu items', () => {
      render(<Navigation />);
      
      const menuItems = screen.getAllByRole('menuitem');
      expect(menuItems.length).toBeGreaterThan(0);
      // 检查第一个 menuitem 的 tabIndex
      expect(menuItems[0].getAttribute('tabIndex')).toBe('0');
    });
  });

  // ============================================================================
  // 右侧操作区测试
  // ============================================================================

  describe('Right Side Actions', () => {
    it('should render theme toggle button', () => {
      render(<Navigation />);
      
      const themeToggles = screen.getAllByTestId('theme-toggle');
      expect(themeToggles.length).toBeGreaterThan(0);
    });

    it('should render notification button', () => {
      render(<Navigation />);
      
      const notificationButtons = screen.getAllByRole('button', { name: /通知/i });
      expect(notificationButtons.length).toBeGreaterThan(0);
    });

    it('should render settings link', () => {
      render(<Navigation />);
      
      const settingsLinks = screen.getAllByRole('link').filter(
        link => link.getAttribute('href') === '/settings'
      );
      // 导航栏和右侧都有设置链接
      expect(settingsLinks.length).toBeGreaterThanOrEqual(1);
    });

    it('should highlight settings icon when on settings page', () => {
      mockUsePathname.mockReturnValue('/settings');
      render(<Navigation />);
      
      const settingsLinks = screen.getAllByRole('link').filter(
        link => link.getAttribute('href') === '/settings'
      );
      const settingsIcon = settingsLinks.find(btn => btn.textContent?.includes('⚙️'));
      expect(settingsIcon?.getAttribute('aria-current')).toBe('page');
    });
  });

  // ============================================================================
  // 可访问性测试
  // ============================================================================

  describe('Accessibility', () => {
    it('should have role="navigation" on nav element', () => {
      render(<Navigation />);
      
      const nav = screen.getByRole('navigation');
      expect(nav).toBeDefined();
    });

    it('should have aria-label on navigation', () => {
      render(<Navigation />);
      
      const nav = screen.getByRole('navigation', { name: /主导航/i });
      expect(nav).toBeDefined();
    });

    it('should have role="menubar" on links container', () => {
      render(<Navigation />);
      
      const menubar = screen.getByRole('menubar', { name: /页面导航/i });
      expect(menubar).toBeDefined();
    });

    it('should have role="menuitem" on each link', () => {
      render(<Navigation />);
      
      const menuItems = screen.getAllByRole('menuitem');
      // 6 desktop + 6 mobile = 12 menuitems
      expect(menuItems.length).toBeGreaterThanOrEqual(6);
    });

    it('should have tabIndex on menu items', () => {
      render(<Navigation />);
      
      const menuItems = screen.getAllByRole('menuitem');
      // 只检查前 6 个（桌面端导航）
      menuItems.slice(0, 6).forEach(item => {
        expect(item.getAttribute('tabIndex')).toBe('0');
      });
    });

    it('should have aria-current on the current page link', () => {
      mockUsePathname.mockReturnValue('/dashboard');
      render(<Navigation />);
      
      // 查找当前页面的链接（使用 aria-current="page"）
      const menuItems = screen.getAllByRole('menuitem');
      const dashboardItem = menuItems.find(item => 
        item.getAttribute('aria-current') === 'page'
      );
      // 应该有 aria-current="page" 的项目
      expect(dashboardItem).toBeDefined();
    });

    it('should have aria-label without current page indicator for non-current pages', () => {
      mockUsePathname.mockReturnValue('/');
      render(<Navigation />);
      
      const menuItems = screen.getAllByRole('menuitem');
      const dashboardItem = menuItems.find(item => 
        item.getAttribute('aria-label')?.includes('实时看板')
      );
      expect(dashboardItem?.getAttribute('aria-label')).not.toContain('当前页面');
    });

    it('should have focus styles on logo link', () => {
      render(<Navigation />);
      
      const logoLink = screen.getByRole('link', { name: /AI 团队首页/i });
      expect(logoLink.className).toContain('focus:ring');
    });
  });

  // ============================================================================
  // 样式测试
  // ============================================================================

  describe('Styling', () => {
    it('should apply active styles to current page link', () => {
      mockUsePathname.mockReturnValue('/dashboard');
      render(<Navigation />);
      
      const menuItems = screen.getAllByRole('menuitem');
      const dashboardItem = menuItems.find(item => 
        item.getAttribute('aria-label')?.includes('实时看板')
      );
      expect(dashboardItem?.className).toContain('bg-blue-50');
    });

    it('should apply hover styles to non-current links', () => {
      mockUsePathname.mockReturnValue('/');
      render(<Navigation />);
      
      const menuItems = screen.getAllByRole('menuitem');
      const dashboardItem = menuItems.find(item => 
        item.getAttribute('aria-label')?.includes('实时看板')
      );
      expect(dashboardItem?.className).toContain('hover:bg-gray-100');
    });

    it('should have sticky positioning', () => {
      render(<Navigation />);
      
      const nav = screen.getByRole('navigation');
      expect(nav.className).toContain('sticky');
    });

    it('should have top-0 positioning', () => {
      render(<Navigation />);
      
      const nav = screen.getByRole('navigation');
      expect(nav.className).toContain('top-0');
    });

    it('should have high z-index', () => {
      render(<Navigation />);
      
      const nav = screen.getByRole('navigation');
      expect(nav.className).toContain('z-50');
    });
  });

  // ============================================================================
  // 边界情况测试
  // ============================================================================

  describe('Edge Cases', () => {
    it('should handle nested paths correctly', () => {
      mockUsePathname.mockReturnValue('/settings/profile');
      render(<Navigation />);
      
      // 嵌套路径不应该匹配任何导航项
      const menuItems = screen.getAllByRole('menuitem');
      const currentItems = menuItems.filter(item => item.getAttribute('aria-current') === 'page');
      expect(currentItems.length).toBe(0);
    });

    it('should handle query parameters', () => {
      mockUsePathname.mockReturnValue('/dashboard?tab=tasks');
      render(<Navigation />);
      
      const menuItems = screen.getAllByRole('menuitem');
      const dashboardItem = menuItems.find(item => 
        item.getAttribute('aria-label')?.includes('实时看板')
      );
      expect(dashboardItem?.getAttribute('aria-current')).toBe('page');
    });

    it('should have notification button with correct type', () => {
      render(<Navigation />);
      
      const notificationButtons = screen.getAllByRole('button', { name: /通知/i });
      expect(notificationButtons[0].getAttribute('type')).toBe('button');
    });
  });
});