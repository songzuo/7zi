/**
 * @fileoverview SocialLinks 组件测试
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SocialLinks } from '../../components/SocialLinks';

// Mock next/link
vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe('SocialLinks', () => {
  it('renders all social links in grid variant', () => {
    render(<SocialLinks variant="grid" />);

    expect(screen.getByText('微信公众号')).toBeInTheDocument();
    expect(screen.getByText('GitHub')).toBeInTheDocument();
    expect(screen.getByText('Twitter')).toBeInTheDocument();
    expect(screen.getByText('LinkedIn')).toBeInTheDocument();
    expect(screen.getByText('Discord')).toBeInTheDocument();
    expect(screen.getByText('YouTube')).toBeInTheDocument();
  });

  it('renders all social links in horizontal variant', () => {
    render(<SocialLinks variant="horizontal" />);

    expect(screen.getByText('微信公众号')).toBeInTheDocument();
    expect(screen.getByText('GitHub')).toBeInTheDocument();
    expect(screen.getByText('Twitter')).toBeInTheDocument();
  });

  it('renders all social links in vertical variant', () => {
    render(<SocialLinks variant="vertical" />);

    expect(screen.getByText('微信公众号')).toBeInTheDocument();
    expect(screen.getByText('GitHub')).toBeInTheDocument();
  });

  it('renders social link descriptions in grid variant with md size', () => {
    render(<SocialLinks variant="grid" size="md" />);

    expect(screen.getByText('关注我们获取最新资讯')).toBeInTheDocument();
    expect(screen.getByText('查看我们的开源项目')).toBeInTheDocument();
  });

  it('hides descriptions in sm size for grid variant', () => {
    render(<SocialLinks variant="grid" size="sm" />);

    // Social link names should be visible
    expect(screen.getByText('GitHub')).toBeInTheDocument();
    // But descriptions are hidden in sm size
    const descriptions = screen.queryAllByText('关注我们获取最新资讯');
    expect(descriptions.length).toBe(0);
  });

  it('renders icons for each social link', () => {
    render(<SocialLinks />);

    // Check for emoji icons
    expect(screen.getByText('💬')).toBeInTheDocument(); // 微信公众号
    expect(screen.getByText('🐙')).toBeInTheDocument(); // GitHub
    expect(screen.getByText('🐦')).toBeInTheDocument(); // Twitter
    expect(screen.getByText('💼')).toBeInTheDocument(); // LinkedIn
    expect(screen.getByText('🎮')).toBeInTheDocument(); // Discord
    expect(screen.getByText('📺')).toBeInTheDocument(); // YouTube
  });

  it('renders correct links', () => {
    render(<SocialLinks />);

    const githubLink = screen.getByRole('link', { name: /GitHub/i });
    expect(githubLink).toHaveAttribute('href', 'https://github.com/7zi-studio');

    const twitterLink = screen.getByRole('link', { name: /Twitter/i });
    expect(twitterLink).toHaveAttribute('href', 'https://twitter.com/7zistudio');

    const linkedinLink = screen.getByRole('link', { name: /LinkedIn/i });
    expect(linkedinLink).toHaveAttribute('href', 'https://linkedin.com/company/7zistudio');
  });

  it('applies custom className', () => {
    const { container } = render(<SocialLinks className="custom-class" />);

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('renders external links with correct attributes', () => {
    render(<SocialLinks />);

    const githubLink = screen.getByRole('link', { name: /GitHub/i });
    expect(githubLink).toHaveAttribute('target', '_blank');
    expect(githubLink).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('renders horizontal variant with correct layout', () => {
    const { container } = render(<SocialLinks variant="horizontal" />);

    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass('flex');
    expect(wrapper).toHaveClass('flex-wrap');
    expect(wrapper).toHaveClass('gap-3');
  });

  it('renders vertical variant with correct layout', () => {
    const { container } = render(<SocialLinks variant="vertical" />);

    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass('space-y-3');
  });

  it('renders grid variant with correct layout', () => {
    const { container } = render(<SocialLinks variant="grid" />);

    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass('grid');
    expect(wrapper).toHaveClass('grid-cols-2');
    expect(wrapper).toHaveClass('md:grid-cols-3');
  });

  it('applies size classes correctly', () => {
    const { container } = render(<SocialLinks size="sm" />);

    const links = container.querySelectorAll('a');
    links.forEach((link) => {
      expect(link).toHaveClass('p-3');
      expect(link).toHaveClass('text-sm');
    });
  });

  it('applies lg size classes correctly', () => {
    const { container } = render(<SocialLinks size="lg" />);

    const links = container.querySelectorAll('a');
    links.forEach((link) => {
      expect(link).toHaveClass('p-6');
      expect(link).toHaveClass('text-lg');
    });
  });

  it('renders 6 social links', () => {
    render(<SocialLinks />);

    const links = screen.getAllByRole('link');
    expect(links.length).toBe(6);
  });
});