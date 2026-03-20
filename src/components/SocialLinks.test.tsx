/**
 * @fileoverview Tests for SocialLinks component
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SocialLinks } from './SocialLinks';

describe('SocialLinks', () => {
  it('should render social links in grid variant by default', () => {
    render(<SocialLinks />);

    expect(screen.getByText('GitHub')).toBeInTheDocument();
    expect(screen.getByText('Twitter')).toBeInTheDocument();
    expect(screen.getByText('LinkedIn')).toBeInTheDocument();
    expect(screen.getByText('Discord')).toBeInTheDocument();
    expect(screen.getByText('YouTube')).toBeInTheDocument();
    expect(screen.getByText('微信公众号')).toBeInTheDocument();
  });

  it('should render in horizontal variant', () => {
    const { container } = render(<SocialLinks variant="horizontal" />);

    expect(container.firstChild).toHaveClass('flex', 'flex-wrap', 'gap-3');
  });

  it('should render in vertical variant', () => {
    const { container } = render(<SocialLinks variant="vertical" />);

    expect(container.firstChild).toHaveClass('space-y-3');
  });

  it('should render in grid variant', () => {
    const { container } = render(<SocialLinks variant="grid" />);

    expect(container.firstChild).toHaveClass('grid', 'grid-cols-2', 'md:grid-cols-3');
  });

  it('should render with small size', () => {
    const { container } = render(<SocialLinks size="sm" />);

    const link = screen.getByText('GitHub').closest('a');
    expect(link).toHaveClass('p-3', 'text-sm');
  });

  it('should render with medium size', () => {
    const { container } = render(<SocialLinks size="md" />);

    const link = screen.getByText('GitHub').closest('a');
    expect(link).toHaveClass('p-4', 'text-base');
  });

  it('should render with large size', () => {
    const { container } = render(<SocialLinks size="lg" />);

    const link = screen.getByText('GitHub').closest('a');
    expect(link).toHaveClass('p-6', 'text-lg');
  });

  it('should render with custom className', () => {
    const { container } = render(<SocialLinks className="custom-class" />);

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('should render GitHub link with correct attributes', () => {
    render(<SocialLinks />);

    const githubLink = screen.getByText('GitHub').closest('a');
    expect(githubLink).toHaveAttribute('href', 'https://github.com/7zi-studio');
    expect(githubLink).toHaveAttribute('target', '_blank');
    expect(githubLink).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('should render Twitter link with correct attributes', () => {
    render(<SocialLinks />);

    const twitterLink = screen.getByText('Twitter').closest('a');
    expect(twitterLink).toHaveAttribute('href', 'https://twitter.com/7zistudio');
    expect(twitterLink).toHaveAttribute('target', '_blank');
  });

  it('should render with icons', () => {
    render(<SocialLinks />);

    expect(screen.getByText('🐙')).toBeInTheDocument(); // GitHub
    expect(screen.getByText('🐦')).toBeInTheDocument(); // Twitter
    expect(screen.getByText('💼')).toBeInTheDocument(); // LinkedIn
    expect(screen.getByText('🎮')).toBeInTheDocument(); // Discord
    expect(screen.getByText('📺')).toBeInTheDocument(); // YouTube
    expect(screen.getByText('💬')).toBeInTheDocument(); // WeChat
  });

  it('should show descriptions for non-small sizes', () => {
    render(<SocialLinks size="md" />);

    expect(screen.getByText('查看我们的开源项目')).toBeInTheDocument();
  });

  it('should not show descriptions for small size', () => {
    render(<SocialLinks size="sm" />);

    expect(screen.queryByText('查看我们的开源项目')).not.toBeInTheDocument();
  });
});
