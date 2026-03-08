import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Footer } from '@/components/about/Footer';

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      'nav.home': 'Home',
      'nav.about': 'About',
      'nav.team': 'Team',
      'nav.blog': 'Blog',
      'footer.copyright': '© 2024 7zi Studio. All rights reserved.',
    };
    return translations[key] || key;
  },
}));

// Mock the i18n routing Link
vi.mock('@/i18n/routing', () => ({
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

describe('Footer', () => {
  it('renders the company logo/name', () => {
    render(<Footer />);
    
    expect(screen.getByText('7zi')).toBeInTheDocument();
    expect(screen.getByText('Studio')).toBeInTheDocument();
  });

  it('renders navigation links', () => {
    render(<Footer />);
    
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('About')).toBeInTheDocument();
    expect(screen.getByText('Team')).toBeInTheDocument();
    expect(screen.getByText('Blog')).toBeInTheDocument();
  });

  it('renders copyright text', () => {
    render(<Footer />);
    
    expect(screen.getByText(/© 2024 7zi Studio/)).toBeInTheDocument();
  });

  it('navigation links have correct hrefs', () => {
    render(<Footer />);
    
    expect(screen.getByText('Home').closest('a')).toHaveAttribute('href', '/');
    expect(screen.getByText('About').closest('a')).toHaveAttribute('href', '/about');
    expect(screen.getByText('Team').closest('a')).toHaveAttribute('href', '/team');
    expect(screen.getByText('Blog').closest('a')).toHaveAttribute('href', '/blog');
  });

  it('has contentinfo role', () => {
    const { container } = render(<Footer />);
    
    expect(container.querySelector('[role="contentinfo"]')).toBeInTheDocument();
  });

  it('has footer navigation aria-label', () => {
    const { container } = render(<Footer />);
    
    expect(container.querySelector('[aria-label="Footer navigation"]')).toBeInTheDocument();
  });

  it('applies correct footer styling', () => {
    const { container } = render(<Footer />);
    
    expect(container.querySelector('.bg-zinc-900')).toBeInTheDocument();
    expect(container.querySelector('.text-zinc-400')).toBeInTheDocument();
  });

  it('renders navigation in a list', () => {
    const { container } = render(<Footer />);
    
    const list = container.querySelector('ul');
    const listItems = list?.querySelectorAll('li');
    
    expect(listItems?.length).toBe(4);
  });

  it('has max width container', () => {
    const { container } = render(<Footer />);
    
    expect(container.querySelector('.max-w-6xl')).toBeInTheDocument();
  });

  it('applies hover effect on navigation links', () => {
    render(<Footer />);
    
    const links = screen.getAllByRole('link');
    links.forEach(link => {
      expect(link).toHaveClass('hover:text-white');
    });
  });
});