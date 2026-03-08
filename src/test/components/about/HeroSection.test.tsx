import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HeroSection } from '@/components/about/HeroSection';

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      'hero.badge': 'About Us',
      'hero.title': 'Welcome to',
      'hero.description': 'We are a creative studio building the future.',
    };
    return translations[key] || key;
  },
}));

describe('HeroSection', () => {
  it('renders the hero title', () => {
    render(<HeroSection />);
    
    expect(screen.getByText('Welcome to')).toBeInTheDocument();
  });

  it('renders the company name with gradient', () => {
    render(<HeroSection />);
    
    expect(screen.getByText('7zi Studio')).toBeInTheDocument();
  });

  it('renders the badge', () => {
    render(<HeroSection />);
    
    expect(screen.getByText('✨')).toBeInTheDocument();
    expect(screen.getByText('About Us')).toBeInTheDocument();
  });

  it('renders the description', () => {
    render(<HeroSection />);
    
    expect(screen.getByText('We are a creative studio building the future.')).toBeInTheDocument();
  });

  it('applies correct section styling', () => {
    const { container } = render(<HeroSection />);
    
    expect(container.querySelector('.py-32')).toBeInTheDocument();
    expect(container.querySelector('.max-w-4xl')).toBeInTheDocument();
  });

  it('has dark mode support', () => {
    const { container } = render(<HeroSection />);
    
    expect(container.querySelector('.dark\\:from-black')).toBeInTheDocument();
  });

  it('renders the grid background pattern', () => {
    const { container } = render(<HeroSection />);
    
    const gridPattern = container.querySelector('.bg-\\[linear-gradient');
    expect(gridPattern).toBeInTheDocument();
  });

  it('renders the title with gradient text', () => {
    const { container } = render(<HeroSection />);
    
    const gradientText = container.querySelector('.bg-gradient-to-r');
    expect(gradientText).toBeInTheDocument();
  });

  it('has centered text alignment', () => {
    const { container } = render(<HeroSection />);
    
    expect(container.querySelector('.text-center')).toBeInTheDocument();
  });

  it('renders with proper z-index for content', () => {
    const { container } = render(<HeroSection />);
    
    expect(container.querySelector('.z-10')).toBeInTheDocument();
  });
});