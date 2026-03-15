/**
 * Footer 组件单元测试
 * 测试页脚组件的功能
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Footer } from '@/components/Footer';

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href, className }: { children: React.ReactNode; href: string; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

// Mock SocialLinks component
vi.mock('@/components/SocialLinks', () => ({
  SocialLinks: ({ variant, size }: { variant: string; size: string }) => (
    <div data-testid="social-links" data-variant={variant} data-size={size}>
      Social Links
    </div>
  ),
}));

describe('Footer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('渲染测试', () => {
    it('应该正确渲染页脚组件', () => {
      render(<Footer />);
      expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    });

    it('应该显示品牌名称', () => {
      render(<Footer />);
      // 使用更具体的查询找到品牌名称（h2标题）
      const footer = screen.getByRole('contentinfo');
      const brandName = footer.querySelector('h2');
      expect(brandName).toHaveTextContent(/7zi/);
    });

    it('应该显示品牌描述', () => {
      render(<Footer />);
      const description = screen.getByText(/11 位专业 AI 代理/);
      expect(description).toBeInTheDocument();
    });

    it('应该渲染 SocialLinks 组件', () => {
      render(<Footer />);
      expect(screen.getByTestId('social-links')).toBeInTheDocument();
    });
  });

  describe('快速链接测试', () => {
    it('应该显示快速链接标题', () => {
      render(<Footer />);
      expect(screen.getByText('快速链接')).toBeInTheDocument();
    });

    it('应该渲染所有快速链接', () => {
      render(<Footer />);
      
      const quickLinks = [
        '首页',
        '关于我们',
        '团队成员',
        '博客',
        '联系我们',
        'Dashboard',
      ];
      
      quickLinks.forEach(link => {
        expect(screen.getByText(link)).toBeInTheDocument();
      });
    });

    it('快速链接应该有正确的 href', () => {
      render(<Footer />);
      
      const linkTests = [
        { text: '首页', href: '/' },
        { text: '关于我们', href: '/about' },
        { text: '团队成员', href: '/team' },
        { text: '博客', href: '/blog' },
        { text: '联系我们', href: '/contact' },
        { text: 'Dashboard', href: '/dashboard' },
      ];
      
      linkTests.forEach(({ text, href }) => {
        const link = screen.getByRole('link', { name: text });
        expect(link).toHaveAttribute('href', href);
      });
    });
  });

  describe('服务项目测试', () => {
    it('应该显示服务项目标题', () => {
      render(<Footer />);
      expect(screen.getByText('服务项目')).toBeInTheDocument();
    });

    it('应该渲染所有服务项目', () => {
      render(<Footer />);
      
      const services = [
        '网站开发',
        '品牌设计',
        'SEO 优化',
        '营销推广',
        'UI/UX 设计',
        'AI 解决方案',
      ];
      
      services.forEach(service => {
        expect(screen.getByText(service)).toBeInTheDocument();
      });
    });
  });

  describe('联系方式测试', () => {
    it('应该显示联系方式标题', () => {
      render(<Footer />);
      expect(screen.getByText('联系方式')).toBeInTheDocument();
    });

    it('应该显示邮箱信息', () => {
      render(<Footer />);
      expect(screen.getByText('business@7zi.studio')).toBeInTheDocument();
    });

    it('应该显示网站信息', () => {
      render(<Footer />);
      expect(screen.getByText('7zi.studio')).toBeInTheDocument();
    });

    it('应该显示地址信息', () => {
      render(<Footer />);
      expect(screen.getByText('中国')).toBeInTheDocument();
    });

    it('邮箱链接应该是 mailto 链接', () => {
      render(<Footer />);
      const emailLink = screen.getByRole('link', { name: /business@7zi\.studio/ });
      expect(emailLink).toHaveAttribute('href', 'mailto:business@7zi.studio');
    });

    it('网站链接应该是外部链接', () => {
      render(<Footer />);
      // 在 footer 内查找网站链接
      const footer = screen.getByRole('contentinfo');
      const links = footer.querySelectorAll('a[href^="https://"]');
      const websiteLink = Array.from(links).find(link => link.textContent?.includes('7zi.studio'));
      expect(websiteLink).toBeInTheDocument();
      expect(websiteLink).toHaveAttribute('href', 'https://7zi.studio');
    });
  });

  describe('版权信息测试', () => {
    it('应该显示当前年份', () => {
      render(<Footer />);
      expect(screen.getByText(/2024/)).toBeInTheDocument();
    });

    it('应该显示版权声明', () => {
      render(<Footer />);
      expect(screen.getByText(/All rights reserved/)).toBeInTheDocument();
    });

    it('应该显示 AI 驱动标语', () => {
      render(<Footer />);
      expect(screen.getByText(/AI 代理团队驱动/)).toBeInTheDocument();
    });
  });

  describe('法律链接测试', () => {
    it('应该显示隐私政策链接', () => {
      render(<Footer />);
      const privacyLink = screen.getByRole('link', { name: '隐私政策' });
      expect(privacyLink).toHaveAttribute('href', '/privacy');
    });

    it('应该显示服务条款链接', () => {
      render(<Footer />);
      const termsLink = screen.getByRole('link', { name: '服务条款' });
      expect(termsLink).toHaveAttribute('href', '/terms');
    });

    it('应该显示 Cookie 政策链接', () => {
      render(<Footer />);
      const cookiesLink = screen.getByRole('link', { name: 'Cookie 政策' });
      expect(cookiesLink).toHaveAttribute('href', '/cookies');
    });
  });

  describe('可访问性测试', () => {
    it('页脚应该有正确的语义标签', () => {
      render(<Footer />);
      const footer = screen.getByRole('contentinfo');
      expect(footer).toBeInTheDocument();
    });

    it('品牌链接应该指向首页', () => {
      render(<Footer />);
      const brandLink = screen.getByRole('link', { name: /7zi.*Studio/ });
      expect(brandLink).toHaveAttribute('href', '/');
    });
  });

  describe('年份动态测试', () => {
    it('应该根据当前日期动态显示年份', () => {
      vi.setSystemTime(new Date('2025-06-20'));
      render(<Footer />);
      expect(screen.getByText(/2025/)).toBeInTheDocument();
    });

    it('跨年应该显示新年份', () => {
      vi.setSystemTime(new Date('2026-01-01'));
      render(<Footer />);
      expect(screen.getByText(/2026/)).toBeInTheDocument();
    });
  });
});