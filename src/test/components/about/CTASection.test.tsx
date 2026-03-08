import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CTASection } from '@/components/about/CTASection';

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      'cta.title': 'Ready to Start?',
      'cta.description': 'Let\'s build something amazing together.',
      'cta.button': 'Contact Us',
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

describe('CTASection', () => {
  it('renders the CTA title', () => {
    render(<CTASection />);
    
    expect(screen.getByText('Ready to Start?')).toBeInTheDocument();
  });

  it('renders the CTA description', () => {
    render(<CTASection />);
    
    expect(screen.getByText("Let's build something amazing together.")).toBeInTheDocument();
  });

  it('renders the contact button', () => {
    render(<CTASection />);
    
    expect(screen.getByText('Contact Us')).toBeInTheDocument();
  });

  it('button links to contact page', () => {
    render(<CTASection />);
    
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/contact');
  });

  it('renders the arrow icon in button', () => {
    render(<CTASection />);
    
    expect(screen.getByText('→')).toBeInTheDocument();
  });

  it('applies gradient background styling', () => {
    const { container } = render(<CTASection />);
    
    expect(container.querySelector('.bg-gradient-to-r')).toBeInTheDocument();
  });

  it('applies correct section styling', () => {
    const { container } = render(<CTASection />);
    
    expect(container.querySelector('.py-24')).toBeInTheDocument();
    expect(container.querySelector('.max-w-3xl')).toBeInTheDocument();
  });

  it('renders grid pattern overlay', () => {
    const { container } = render(<CTASection />);
    
    const gridPattern = container.querySelector('.bg-\\[linear-gradient');
    expect(gridPattern).toBeInTheDocument();
  });

  it('has centered content', () => {
    const { container } = render(<CTASection />);
    
    expect(container.querySelector('.text-center')).toBeInTheDocument();
  });

  it('button has hover styling', () => {
    render(<CTASection />);
    
    const button = screen.getByRole('link');
    expect(button).toHaveClass('hover:scale-105');
  });
});