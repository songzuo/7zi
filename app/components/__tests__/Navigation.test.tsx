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
      
      const tasksLinks = screen.getAllByRole('link', { name: /任务/ });
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
    it('should focus next item on ArrowRight', () => {
      render(<Navigation />);
      
      const links = screen.getAllByRole('link').filter(link => link.hasAttribute('data-nav-index'));
      links[0].focus();
      
      fireEvent.keyDown(links[0], { key: 'ArrowRight' });
      
      // 验证下一个链接获得焦点
      expect(document.activeElement).toBe(links[1]);
    });

    it('should focus previous item on ArrowLeft', () => {
      render(<Navigation />);
      
      const links = screen.getAllByRole('link').filter(link => link.hasAttribute('data-nav-index'));
      links[1].focus();
      
      fireEvent.keyDown(links[1], { key: 'ArrowLeft' });
      
      // 验证上一个链接获得焦点
      expect(document.activeElement).toBe(links[0]);
    });

    it('should wrap to first item on ArrowRight from last item', () => {
      render(<Navigation />);
      
      const links = screen.getAllByRole('link').filter(link => link.hasAttribute('data-nav-index'));
      const lastIndex = links.length - 1;
      links[lastIndex].focus();
      
      fireEvent.keyDown(links[lastIndex], { key: 'ArrowRight' });
      
      // 验证焦点回到第一个链接
      expect(document.activeElement).toBe(links[0]);
    });

    it('should wrap to last item on ArrowLeft from first item', () => {
      render(<Navigation />);
      
      const links = screen.getAllByRole('link').filter(link => link.hasAttribute('data-nav-index'));
      links[0].focus();
      
      fireEvent.keyDown(links[0], { key: 'ArrowLeft' });
      
      // 验证焦点到最后一个链接
      const lastIndex = links.length - 1;
      expect(document.activeElement).toBe(links[lastIndex]);
    });

    it('should focus first item on Home key', () => {
      render(<Navigation />);
      
      const links = screen.getAllByRole('link').filter(link => link.hasAttribute('data-nav-index'));
      links[3].focus();
      
      fireEvent.keyDown(links[3], { key: 'Home' });
      
      expect(document.activeElement).toBe(links[0]);
    });

    it('should focus last item on End key', () => {
      render(<Navigation />);
      
      const links = screen.getAllByRole('link').filter(link => link.hasAttribute('data-nav-index'));
      links[0].focus();
      
      fireEvent.keyDown(links[0], { key: 'End' });
      
      const lastIndex = links.length - 1;
      expect(document.activeElement).toBe(links[lastIndex]);
    });
  });

  // ============================================================================
  // 右侧操作区测试
  // ============================================================================

  describe('Right Side Actions', () => {
    it('should render theme toggle button', () => {
      render(<Navigation />);
      
      const themeToggle = screen.getByTestId('theme-toggle');
      expect(themeToggle).toBeDefined();
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
        link => link.getAttribute('href') === '/settings' && link.getAttribute('aria-label') === '设置'
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

    it('should have aria-label with current page indicator', () => {
      mockUsePathname.mockReturnValue('/dashboard');
      render(<Navigation />);
      
      // 查找包含"当前页面"的链接
      const links = screen.getAllByRole('link');
      const dashboardLink = links.find(link => 
        link.getAttribute('aria-label')?.includes('实时看板') && 
        link.getAttribute('aria-label')?.includes('当前')
      );
      expect(dashboardLink).toBeDefined();
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