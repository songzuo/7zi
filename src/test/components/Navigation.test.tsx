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
      expect(screen.getByRole('navigation', { name: '主导航' })).toBeInTheDocument();
    });

    it('应该显示 Logo 和品牌名称', () => {
      render(<Navigation />);
      // 使用更具体的查询避免匹配多个元素
      const logo = screen.getAllByText('🤖')[0];
      expect(logo).toBeInTheDocument();
      
      const brandName = screen.getAllByText('AI 团队')[0];
      expect(brandName).toBeInTheDocument();
    });

    it('应该渲染所有导航链接', () => {
      render(<Navigation />);
      
      // 使用更具体的查询，只检查桌面端导航（不检查移动端菜单中的重复项）
      const nav = screen.getByRole('navigation', { name: '主导航' });
      const navItems = ['首页', '实时看板', '子代理', '任务', '记忆'];
      navItems.forEach(item => {
        // 在主导航容器内查找
        expect(nav).toHaveTextContent(item);
      });
    });

    it('应该渲染主题切换按钮', () => {
      render(<Navigation />);
      // 桌面端只有一个主题切换按钮
      const nav = screen.getByRole('navigation', { name: '主导航' });
      expect(nav.querySelector('[data-testid="theme-toggle"]')).toBeInTheDocument();
    });

    it('应该渲染设置按钮', () => {
      render(<Navigation />);
      expect(screen.getByTestId('settings-button')).toBeInTheDocument();
    });

    it('应该渲染语言切换器', () => {
      render(<Navigation />);
      const nav = screen.getByRole('navigation', { name: '主导航' });
      expect(nav.querySelector('[data-testid="language-switcher"]')).toBeInTheDocument();
    });
  });

  describe('活动状态测试', () => {
    it('首页应该显示活动状态', () => {
      vi.mocked(usePathname).mockReturnValue('/');
      render(<Navigation />);
      
      // 在桌面端导航内查找
      const nav = screen.getByRole('navigation', { name: '主导航' });
      const desktopNav = nav.querySelector('.hidden.md\\:flex');
      const homeLink = desktopNav?.querySelector('a[href="/"]');
      expect(homeLink).toHaveClass('bg-[var(--nav-active-bg)]');
    });

    it('Dashboard 应该显示活动状态', () => {
      vi.mocked(usePathname).mockReturnValue('/dashboard');
      render(<Navigation />);
      
      const nav = screen.getByRole('navigation', { name: '主导航' });
      const desktopNav = nav.querySelector('.hidden.md\\:flex');
      const dashboardLink = desktopNav?.querySelector('a[href="/dashboard"]');
      expect(dashboardLink).toHaveClass('bg-[var(--nav-active-bg)]');
    });

    it('任务页面应该显示活动状态', () => {
      vi.mocked(usePathname).mockReturnValue('/tasks');
      render(<Navigation />);
      
      const nav = screen.getByRole('navigation', { name: '主导航' });
      const desktopNav = nav.querySelector('.hidden.md\\:flex');
      const tasksLink = desktopNav?.querySelector('a[href="/tasks"]');
      expect(tasksLink).toHaveClass('bg-[var(--nav-active-bg)]');
    });

    it('非活动链接应该有正确的样式', () => {
      vi.mocked(usePathname).mockReturnValue('/');
      render(<Navigation />);
      
      const nav = screen.getByRole('navigation', { name: '主导航' });
      const desktopNav = nav.querySelector('.hidden.md\\:flex');
      const tasksLink = desktopNav?.querySelector('a[href="/tasks"]');
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
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
      
      // 点击遮罩层
      const dialog = screen.getByRole('dialog');
      const overlay = dialog.querySelector('.bg-black\\/60') || dialog.querySelector('.absolute');
      if (overlay) {
        fireEvent.click(overlay as Element);
      }
      
      // 菜单应该关闭 - 检查是否包含 invisible 类
      await waitFor(() => {
        const dialogEl = screen.queryByRole('dialog');
        expect(dialogEl).toHaveClass('invisible');
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
      
      // 点击链接 - 在移动端菜单的导航项中找到首页链接
      const dialog = screen.getByRole('dialog');
      const mobileHomeLink = dialog.querySelector('a[href="/"]');
      if (mobileHomeLink) {
        fireEvent.click(mobileHomeLink);
      }
      
      // 菜单应该关闭 - 检查是否包含 invisible 类
      await waitFor(() => {
        const dialogEl = screen.queryByRole('dialog');
        expect(dialogEl).toHaveClass('invisible');
      });
    });
  });

  describe('可访问性测试', () => {
    it('导航应该有正确的语义标签', () => {
      render(<Navigation />);
      const nav = screen.getByRole('navigation', { name: '主导航' });
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
      
      // 使用角色查询找到导航链接
      const nav = screen.getByRole('navigation', { name: '主导航' });
      const desktopLinks = nav.querySelectorAll('.hidden.md\\:flex a[href]');
      
      const expectedHrefs = ['/', '/dashboard', '/subagents', '/tasks', '/memory'];
      expect(desktopLinks.length).toBe(expectedHrefs.length);
      
      expectedHrefs.forEach((href, index) => {
        expect(desktopLinks[index]).toHaveAttribute('href', href);
      });
    });

    it('Logo 链接应该指向首页', () => {
      render(<Navigation />);
      
      // 在主导航内查找Logo链接
      const nav = screen.getByRole('navigation', { name: '主导航' });
      const logoLink = nav.querySelector('a[href="/"]');
      expect(logoLink).toBeInTheDocument();
      expect(logoLink).toHaveTextContent(/AI 团队/);
    });
  });
});