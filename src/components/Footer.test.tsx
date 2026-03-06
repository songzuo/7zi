import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Footer } from './Footer';

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href, className }: { children: React.ReactNode; href: string; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

// Mock SocialLinks
vi.mock('./SocialLinks', () => ({
  SocialLinks: ({ variant, size }: { variant?: string; size?: string }) => (
    <div data-testid="social-links" data-variant={variant} data-size={size}>
      社交链接
    </div>
  ),
}));

describe('Footer', () => {
  describe('渲染测试', () => {
    it('应该渲染品牌名称', () => {
      render(<Footer />);
      // 使用更精确的选择器查找 h2 标题
      const brandTitle = screen.getByRole('heading', { level: 2, name: /7zi/ });
      expect(brandTitle).toBeInTheDocument();
      expect(screen.getByText('Studio')).toBeInTheDocument();
    });

    it('应该渲染品牌描述', () => {
      render(<Footer />);
      expect(screen.getByText(/由 11 位专业 AI 代理组成/)).toBeInTheDocument();
    });

    it('应该渲染社交链接组件', () => {
      render(<Footer />);
      expect(screen.getByTestId('social-links')).toBeInTheDocument();
    });
  });

  describe('快速链接', () => {
    it('应该渲染快速链接标题', () => {
      render(<Footer />);
      expect(screen.getByText('快速链接')).toBeInTheDocument();
    });

    it('应该渲染所有快速链接', () => {
      render(<Footer />);
      expect(screen.getByRole('link', { name: '首页' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: '关于我们' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: '团队成员' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: '博客' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: '联系我们' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument();
    });

    it('快速链接应该有正确的 href', () => {
      render(<Footer />);
      expect(screen.getByRole('link', { name: '首页' })).toHaveAttribute('href', '/');
      expect(screen.getByRole('link', { name: '关于我们' })).toHaveAttribute('href', '/about');
      expect(screen.getByRole('link', { name: '团队成员' })).toHaveAttribute('href', '/team');
      expect(screen.getByRole('link', { name: '博客' })).toHaveAttribute('href', '/blog');
      expect(screen.getByRole('link', { name: '联系我们' })).toHaveAttribute('href', '/contact');
      expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/dashboard');
    });
  });

  describe('服务项目', () => {
    it('应该渲染服务项目标题', () => {
      render(<Footer />);
      expect(screen.getByText('服务项目')).toBeInTheDocument();
    });

    it('应该渲染所有服务项目', () => {
      render(<Footer />);
      expect(screen.getByRole('link', { name: '网站开发' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: '品牌设计' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'SEO 优化' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: '营销推广' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'UI/UX 设计' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'AI 解决方案' })).toBeInTheDocument();
    });

    it('服务项目链接应该指向 #services', () => {
      render(<Footer />);
      const serviceLinks = ['网站开发', '品牌设计', 'SEO 优化', '营销推广', 'UI/UX 设计', 'AI 解决方案'];
      
      serviceLinks.forEach(name => {
        expect(screen.getByRole('link', { name })).toHaveAttribute('href', '#services');
      });
    });
  });

  describe('联系方式', () => {
    it('应该渲染联系方式标题', () => {
      render(<Footer />);
      expect(screen.getByText('联系方式')).toBeInTheDocument();
    });

    it('应该渲染邮箱信息', () => {
      render(<Footer />);
      expect(screen.getByText('📧')).toBeInTheDocument();
      expect(screen.getByText('business@7zi.studio')).toBeInTheDocument();
    });

    it('应该渲染网站信息', () => {
      render(<Footer />);
      expect(screen.getByText('🌐')).toBeInTheDocument();
      expect(screen.getByText('7zi.studio')).toBeInTheDocument();
    });

    it('应该渲染地址信息', () => {
      render(<Footer />);
      expect(screen.getByText('📍')).toBeInTheDocument();
      expect(screen.getByText('中国')).toBeInTheDocument();
    });

    it('邮箱链接应该是 mailto:', () => {
      render(<Footer />);
      const emailLink = screen.getByRole('link', { name: /business@7zi\.studio/ });
      expect(emailLink).toHaveAttribute('href', 'mailto:business@7zi.studio');
    });

    it('网站链接应该指向正确 URL', () => {
      render(<Footer />);
      // 使用更精确的选择器，排除 mailto 链接
      const websiteLinks = screen.getAllByRole('link', { name: /7zi\.studio/ });
      const httpsLink = websiteLinks.find(link => link.getAttribute('href') === 'https://7zi.studio');
      expect(httpsLink).toBeDefined();
      expect(httpsLink).toHaveAttribute('href', 'https://7zi.studio');
    });
  });

  describe('版权信息', () => {
    it('应该显示当前年份', () => {
      render(<Footer />);
      const currentYear = new Date().getFullYear();
      expect(screen.getByText(new RegExp(`© ${currentYear}`))).toBeInTheDocument();
    });

    it('应该显示版权声明', () => {
      render(<Footer />);
      expect(screen.getByText(/All rights reserved/)).toBeInTheDocument();
    });

    it('应该显示 AI 驱动声明', () => {
      render(<Footer />);
      expect(screen.getByText(/由 AI 代理团队驱动/)).toBeInTheDocument();
    });
  });

  describe('法律链接', () => {
    it('应该渲染隐私政策链接', () => {
      render(<Footer />);
      expect(screen.getByRole('link', { name: '隐私政策' })).toHaveAttribute('href', '/privacy');
    });

    it('应该渲染服务条款链接', () => {
      render(<Footer />);
      expect(screen.getByRole('link', { name: '服务条款' })).toHaveAttribute('href', '/terms');
    });

    it('应该渲染 Cookie 政策链接', () => {
      render(<Footer />);
      expect(screen.getByRole('link', { name: 'Cookie 政策' })).toHaveAttribute('href', '/cookies');
    });
  });
});