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
      // 使用 getAllByText 因为 AI 团队 出现多次（桌面和移动端）
      const logoElements = screen.getAllByText('AI 团队');
      expect(logoElements.length).toBeGreaterThan(0);
    });

    it('应该渲染所有导航链接', () => {
      render(<Navigation />);
      // 使用 getAllByText 因为元素在桌面和移动端都有
      expect(screen.getAllByText('首页').length).toBeGreaterThan(0);
      expect(screen.getAllByText('实时看板').length).toBeGreaterThan(0);
      expect(screen.getAllByText('子代理').length).toBeGreaterThan(0);
      expect(screen.getAllByText('任务').length).toBeGreaterThan(0);
      expect(screen.getAllByText('记忆').length).toBeGreaterThan(0);
    });

    it('应该渲染主题切换按钮', () => {
      render(<Navigation />);
      // 桌面和移动端各有一个
      expect(screen.getAllByTestId('theme-toggle').length).toBeGreaterThan(0);
    });

    it('应该渲染语言切换按钮', () => {
      render(<Navigation />);
      // 桌面和移动端各有一个
      expect(screen.getAllByTestId('language-switcher').length).toBeGreaterThan(0);
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
      
      const homeLinks = screen.getAllByRole('link', { name: /首页/ });
      // 至少有一个首页链接有活跃状态
      const hasActiveLink = homeLinks.some(link => 
        link.className.includes('bg-[var(--nav-active-bg)]')
      );
      expect(hasActiveLink).toBe(true);
    });

    it('Dashboard 路径时，实时看板链接应该有活跃状态', () => {
      mockUsePathname.mockReturnValue('/dashboard');
      render(<Navigation />);
      
      const dashboardLinks = screen.getAllByRole('link', { name: /实时看板/ });
      const hasActiveLink = dashboardLinks.some(link => 
        link.className.includes('bg-[var(--nav-active-bg)]')
      );
      expect(hasActiveLink).toBe(true);
    });

    it('非活跃链接应该有默认样式', () => {
      mockUsePathname.mockReturnValue('/');
      render(<Navigation />);
      
      const dashboardLinks = screen.getAllByRole('link', { name: /实时看板/ });
      const hasDefaultStyle = dashboardLinks.some(link => 
        link.className.includes('text-[var(--nav-text)]')
      );
      expect(hasDefaultStyle).toBe(true);
    });
  });

  describe('移动端菜单', () => {
    it('默认情况下移动端菜单应该关闭', () => {
      render(<Navigation />);
      // 检查菜单按钮存在（使用 aria-label）
      const menuButton = screen.getByRole('button', { name: /打开菜单/ });
      expect(menuButton).toBeInTheDocument();
    });

    it('点击汉堡按钮应该打开移动端菜单', () => {
      render(<Navigation />);
      
      const menuButton = screen.getByRole('button', { name: /打开菜单/ });
      fireEvent.click(menuButton);
      
      // 菜单打开后按钮 aria-label 变为关闭
      expect(screen.getByRole('button', { name: /关闭菜单/ })).toBeInTheDocument();
    });

    it('再次点击汉堡按钮应该关闭移动端菜单', () => {
      render(<Navigation />);
      
      const menuButton = screen.getByRole('button', { name: /打开菜单/ });
      fireEvent.click(menuButton);
      fireEvent.click(screen.getByRole('button', { name: /关闭菜单/ }));
      
      expect(screen.getByRole('button', { name: /打开菜单/ })).toBeInTheDocument();
    });

    it('移动端菜单打开时应该显示所有导航链接', () => {
      render(<Navigation />);
      
      const menuButton = screen.getByRole('button', { name: /打开菜单/ });
      fireEvent.click(menuButton);
      
      // 移动端菜单中也有所有导航链接
      const links = screen.getAllByRole('link');
      expect(links.length).toBeGreaterThan(5); // Logo + 5 nav items + extra in mobile
    });
  });

  describe('导航链接目标', () => {
    it('所有导航链接应该有正确的 href', () => {
      render(<Navigation />);
      
      const homeLinks = screen.getAllByRole('link', { name: /首页/ });
      expect(homeLinks.some(link => link.getAttribute('href') === '/')).toBe(true);
      
      const dashboardLinks = screen.getAllByRole('link', { name: /实时看板/ });
      expect(dashboardLinks.some(link => link.getAttribute('href') === '/dashboard')).toBe(true);
      
      const subagentsLinks = screen.getAllByRole('link', { name: /子代理/ });
      expect(subagentsLinks.some(link => link.getAttribute('href') === '/subagents')).toBe(true);
      
      const tasksLinks = screen.getAllByRole('link', { name: /任务/ });
      expect(tasksLinks.some(link => link.getAttribute('href') === '/tasks')).toBe(true);
      
      const memoryLinks = screen.getAllByRole('link', { name: /记忆/ });
      expect(memoryLinks.some(link => link.getAttribute('href') === '/memory')).toBe(true);
    });

    it('Logo 链接应该指向首页', () => {
      render(<Navigation />);
      
      const logoLinks = screen.getAllByRole('link', { name: /AI 团队/ });
      expect(logoLinks.some(link => link.getAttribute('href') === '/')).toBe(true);
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
