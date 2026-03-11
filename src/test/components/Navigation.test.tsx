/**
 * Navigation 组件单元测试
 * 测试主导航组件的功能
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Navigation } from '@/components/Navigation';
import { usePathname } from 'next/navigation';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/'),
}));

// Mock child components
vi.mock('@/components/SettingsButton', () => ({
  SettingsButton: () => <button data-testid="settings-button">Settings</button>,
}));

vi.mock('@/components/LanguageSwitcher', () => ({
  LanguageSwitcherCompact: () => <div data-testid="language-switcher">Language</div>,
}));

vi.mock('@/components/ThemeToggle', () => ({
  ThemeToggle: () => <button data-testid="theme-toggle">Theme</button>,
}));

describe('Navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(usePathname).mockReturnValue('/');
  });

  describe('渲染测试', () => {
    it('应该正确渲染导航组件', () => {
      render(<Navigation />);
      expect(screen.getByRole('navigation')).toBeInTheDocument();
    });

    it('应该显示 Logo 和品牌名称', () => {
      render(<Navigation />);
      const logo = screen.getByText('🤖');
      expect(logo).toBeInTheDocument();
      
      const brandName = screen.getByText('AI 团队');
      expect(brandName).toBeInTheDocument();
    });

    it('应该渲染所有导航链接', () => {
      render(<Navigation />);
      
      const navItems = ['首页', '实时看板', '子代理', '任务', '记忆'];
      navItems.forEach(item => {
        expect(screen.getByText(item)).toBeInTheDocument();
      });
    });

    it('应该渲染主题切换按钮', () => {
      render(<Navigation />);
      expect(screen.getByTestId('theme-toggle')).toBeInTheDocument();
    });

    it('应该渲染设置按钮', () => {
      render(<Navigation />);
      expect(screen.getByTestId('settings-button')).toBeInTheDocument();
    });

    it('应该渲染语言切换器', () => {
      render(<Navigation />);
      expect(screen.getByTestId('language-switcher')).toBeInTheDocument();
    });
  });

  describe('活动状态测试', () => {
    it('首页应该显示活动状态', () => {
      vi.mocked(usePathname).mockReturnValue('/');
      render(<Navigation />);
      
      const homeLink = screen.getByRole('link', { name: /首页/ });
      expect(homeLink).toHaveClass('bg-[var(--nav-active-bg)]');
    });

    it('Dashboard 应该显示活动状态', () => {
      vi.mocked(usePathname).mockReturnValue('/dashboard');
      render(<Navigation />);
      
      const dashboardLink = screen.getByRole('link', { name: /实时看板/ });
      expect(dashboardLink).toHaveClass('bg-[var(--nav-active-bg)]');
    });

    it('任务页面应该显示活动状态', () => {
      vi.mocked(usePathname).mockReturnValue('/tasks');
      render(<Navigation />);
      
      const tasksLink = screen.getByRole('link', { name: /任务/ });
      expect(tasksLink).toHaveClass('bg-[var(--nav-active-bg)]');
    });

    it('非活动链接应该有正确的样式', () => {
      vi.mocked(usePathname).mockReturnValue('/');
      render(<Navigation />);
      
      const tasksLink = screen.getByRole('link', { name: /任务/ });
      expect(tasksLink).not.toHaveClass('bg-[var(--nav-active-bg)]');
    });
  });

  describe('移动端菜单测试', () => {
    it('应该有移动端菜单按钮', () => {
      render(<Navigation />);
      
      const menuButton = screen.getByLabelText('打开菜单');
      expect(menuButton).toBeInTheDocument();
    });

    it('点击菜单按钮应该打开移动端菜单', async () => {
      render(<Navigation />);
      
      const menuButton = screen.getByLabelText('打开菜单');
      fireEvent.click(menuButton);
      
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });

    it('打开菜单后按钮标签应该改变', async () => {
      render(<Navigation />);
      
      const menuButton = screen.getByLabelText('打开菜单');
      fireEvent.click(menuButton);
      
      await waitFor(() => {
        expect(screen.getByLabelText('关闭菜单')).toBeInTheDocument();
      });
    });

    it('点击遮罩层应该关闭菜单', async () => {
      render(<Navigation />);
      
      // 打开菜单
      const menuButton = screen.getByLabelText('打开菜单');
      fireEvent.click(menuButton);
      
      await waitFor(() => {
        const overlay = screen.getByRole('dialog').querySelector('.bg-black\\/60');
        if (overlay) {
          fireEvent.click(overlay);
        }
      });
      
      // 菜单应该关闭
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    it('移动端菜单应该显示所有导航项', async () => {
      render(<Navigation />);
      
      const menuButton = screen.getByLabelText('打开菜单');
      fireEvent.click(menuButton);
      
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
      
      // 移动端菜单中的导航项
      const navItems = ['首页', '实时看板', '子代理', '任务', '记忆'];
      navItems.forEach(item => {
        const links = screen.getAllByText(item);
        expect(links.length).toBeGreaterThan(0);
      });
    });

    it('点击导航链接应该关闭移动端菜单', async () => {
      render(<Navigation />);
      
      // 打开菜单
      const menuButton = screen.getByLabelText('打开菜单');
      fireEvent.click(menuButton);
      
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
      
      // 点击链接
      const homeLinks = screen.getAllByRole('link', { name: /首页/ });
      const mobileHomeLink = homeLinks.find(link => link.closest('[role="menuitem"]'));
      if (mobileHomeLink) {
        fireEvent.click(mobileHomeLink);
      }
      
      // 菜单应该关闭
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });
  });

  describe('可访问性测试', () => {
    it('导航应该有正确的语义标签', () => {
      render(<Navigation />);
      const nav = screen.getByRole('navigation');
      expect(nav).toBeInTheDocument();
    });

    it('移动端菜单应该有正确的 ARIA 属性', async () => {
      render(<Navigation />);
      
      const menuButton = screen.getByLabelText('打开菜单');
      expect(menuButton).toHaveAttribute('aria-expanded', 'false');
      
      fireEvent.click(menuButton);
      
      await waitFor(() => {
        expect(menuButton).toHaveAttribute('aria-expanded', 'true');
      });
    });

    it('移动端菜单应该有 dialog 角色', async () => {
      render(<Navigation />);
      
      const menuButton = screen.getByLabelText('打开菜单');
      fireEvent.click(menuButton);
      
      await waitFor(() => {
        const dialog = screen.getByRole('dialog');
        expect(dialog).toHaveAttribute('aria-modal', 'true');
        expect(dialog).toHaveAttribute('aria-label', '导航菜单');
      });
    });
  });

  describe('链接测试', () => {
    it('导航链接应该有正确的 href', () => {
      render(<Navigation />);
      
      const linkTests = [
        { text: /首页/, href: '/' },
        { text: /实时看板/, href: '/dashboard' },
        { text: /子代理/, href: '/subagents' },
        { text: /任务/, href: '/tasks' },
        { text: /记忆/, href: '/memory' },
      ];
      
      linkTests.forEach(({ text, href }) => {
        const link = screen.getByRole('link', { name: text });
        expect(link).toHaveAttribute('href', href);
      });
    });

    it('Logo 链接应该指向首页', () => {
      render(<Navigation />);
      
      const logoLink = screen.getByRole('link', { name: /AI 团队/ });
      expect(logoLink).toHaveAttribute('href', '/');
    });
  });
});