import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Navigation } from './Navigation';

// Mock next/navigation
const mockUsePathname = vi.fn();
vi.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  }),
}));

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href, className, onClick }: { children: React.ReactNode; href: string; className?: string; onClick?: () => void }) => (
    <a href={href} className={className} onClick={onClick}>
      {children}
    </a>
  ),
}));

// Mock ThemeToggle
vi.mock('./ThemeToggle', () => ({
  ThemeToggle: () => <button data-testid="theme-toggle">主题切换</button>,
}));

// Mock LanguageSwitcher
vi.mock('./LanguageSwitcher', () => ({
  LanguageSwitcherCompact: ({ className }: { className?: string }) => (
    <button data-testid="language-switcher" className={className}>语言</button>
  ),
}));

// Mock SettingsButton
vi.mock('./SettingsButton', () => ({
  SettingsButton: ({ compact }: { compact?: boolean }) => (
    <button data-testid="settings-button" data-compact={compact}>设置</button>
  ),
}));

describe('Navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUsePathname.mockReturnValue('/');
  });

  describe('渲染测试', () => {
    it('应该渲染 Logo', () => {
      render(<Navigation />);
      expect(screen.getByText('AI 团队')).toBeInTheDocument();
    });

    it('应该渲染所有导航链接', () => {
      render(<Navigation />);
      expect(screen.getByText('首页')).toBeInTheDocument();
      expect(screen.getByText('实时看板')).toBeInTheDocument();
      expect(screen.getByText('子代理')).toBeInTheDocument();
      expect(screen.getByText('任务')).toBeInTheDocument();
      expect(screen.getByText('记忆')).toBeInTheDocument();
    });

    it('应该渲染主题切换按钮', () => {
      render(<Navigation />);
      expect(screen.getByTestId('theme-toggle')).toBeInTheDocument();
    });

    it('应该渲染语言切换按钮', () => {
      render(<Navigation />);
      expect(screen.getByTestId('language-switcher')).toBeInTheDocument();
    });

    it('应该渲染设置按钮', () => {
      render(<Navigation />);
      expect(screen.getByTestId('settings-button')).toBeInTheDocument();
    });
  });

  describe('活跃状态', () => {
    it('首页路径时，首页链接应该有活跃状态', () => {
      mockUsePathname.mockReturnValue('/');
      render(<Navigation />);
      
      const homeLink = screen.getByRole('link', { name: /首页/ });
      expect(homeLink).toHaveClass('bg-[var(--nav-active-bg)]');
    });

    it('Dashboard 路径时，实时看板链接应该有活跃状态', () => {
      mockUsePathname.mockReturnValue('/dashboard');
      render(<Navigation />);
      
      const dashboardLink = screen.getByRole('link', { name: /实时看板/ });
      expect(dashboardLink).toHaveClass('bg-[var(--nav-active-bg)]');
    });

    it('非活跃链接应该有默认样式', () => {
      mockUsePathname.mockReturnValue('/');
      render(<Navigation />);
      
      const dashboardLink = screen.getByRole('link', { name: /实时看板/ });
      expect(dashboardLink).toHaveClass('text-[var(--nav-text)]');
    });
  });

  describe('移动端菜单', () => {
    it('默认情况下移动端菜单应该关闭', () => {
      render(<Navigation />);
      expect(screen.getByText('☰')).toBeInTheDocument();
    });

    it('点击汉堡按钮应该打开移动端菜单', () => {
      render(<Navigation />);
      
      const menuButton = screen.getByRole('button', { name: 'Toggle menu' });
      fireEvent.click(menuButton);
      
      // 菜单打开后按钮显示关闭图标
      expect(screen.getByText('✕')).toBeInTheDocument();
    });

    it('再次点击汉堡按钮应该关闭移动端菜单', () => {
      render(<Navigation />);
      
      const menuButton = screen.getByRole('button', { name: 'Toggle menu' });
      fireEvent.click(menuButton);
      fireEvent.click(menuButton);
      
      expect(screen.getByText('☰')).toBeInTheDocument();
    });

    it('移动端菜单打开时应该显示所有导航链接', () => {
      render(<Navigation />);
      
      const menuButton = screen.getByRole('button', { name: 'Toggle menu' });
      fireEvent.click(menuButton);
      
      // 移动端菜单中也有所有导航链接
      const links = screen.getAllByRole('link');
      expect(links.length).toBeGreaterThan(5); // Logo + 5 nav items + extra in mobile
    });
  });

  describe('导航链接目标', () => {
    it('所有导航链接应该有正确的 href', () => {
      render(<Navigation />);
      
      expect(screen.getByRole('link', { name: /首页/ })).toHaveAttribute('href', '/');
      expect(screen.getByRole('link', { name: /实时看板/ })).toHaveAttribute('href', '/dashboard');
      expect(screen.getByRole('link', { name: /子代理/ })).toHaveAttribute('href', '/subagents');
      expect(screen.getByRole('link', { name: /任务/ })).toHaveAttribute('href', '/tasks');
      expect(screen.getByRole('link', { name: /记忆/ })).toHaveAttribute('href', '/memory');
    });

    it('Logo 链接应该指向首页', () => {
      render(<Navigation />);
      
      const logoLink = screen.getByRole('link', { name: /AI 团队/ });
      expect(logoLink).toHaveAttribute('href', '/');
    });
  });

  describe('图标显示', () => {
    it('每个导航链接应该显示对应的图标', () => {
      render(<Navigation />);
      
      // 使用 getAllByText 因为 Logo 也使用了 🤖
      expect(screen.getAllByText('🏠').length).toBeGreaterThan(0); // 首页
      expect(screen.getAllByText('📊').length).toBeGreaterThan(0); // 实时看板
      expect(screen.getAllByText('🤖').length).toBeGreaterThan(0); // 子代理 + Logo
      expect(screen.getAllByText('📋').length).toBeGreaterThan(0); // 任务
      expect(screen.getAllByText('🧠').length).toBeGreaterThan(0); // 记忆
    });
  });
});