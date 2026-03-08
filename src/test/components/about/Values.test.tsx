import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Values } from '@/components/about/Values';

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      'values.badge': 'Our Values',
      'values.title': 'What We Believe',
      'values.items.collaboration.title': 'Collaboration',
      'values.items.collaboration.description': 'Working together to achieve great results.',
      'values.items.innovation.title': 'Innovation',
      'values.items.innovation.description': 'Pushing boundaries with creative solutions.',
      'values.items.quality.title': 'Quality',
      'values.items.quality.description': 'Delivering excellence in everything we do.',
      'values.items.customer.title': 'Customer Focus',
      'values.items.customer.description': 'Putting customers at the heart of our work.',
    };
    return translations[key] || key;
  },
}));

describe('Values', () => {
  it('renders the section title', () => {
    render(<Values />);
    
    expect(screen.getByText('What We Believe')).toBeInTheDocument();
  });

  it('renders the badge', () => {
    render(<Values />);
    
    expect(screen.getByText('💎')).toBeInTheDocument();
    expect(screen.getByText('Our Values')).toBeInTheDocument();
  });

  it('renders all value titles', () => {
    render(<Values />);
    
    expect(screen.getByText('Collaboration')).toBeInTheDocument();
    expect(screen.getByText('Innovation')).toBeInTheDocument();
    expect(screen.getByText('Quality')).toBeInTheDocument();
    expect(screen.getByText('Customer Focus')).toBeInTheDocument();
  });

  it('renders all value descriptions', () => {
    render(<Values />);
    
    expect(screen.getByText('Working together to achieve great results.')).toBeInTheDocument();
    expect(screen.getByText('Pushing boundaries with creative solutions.')).toBeInTheDocument();
    expect(screen.getByText('Delivering excellence in everything we do.')).toBeInTheDocument();
    expect(screen.getByText('Putting customers at the heart of our work.')).toBeInTheDocument();
  });

  it('renders value emojis', () => {
    render(<Values />);
    
    expect(screen.getByText('🚀')).toBeInTheDocument();
    expect(screen.getByText('💡')).toBeInTheDocument();
    expect(screen.getByText('🎯')).toBeInTheDocument();
    expect(screen.getByText('🤝')).toBeInTheDocument();
  });

  it('applies correct grid layout', () => {
    const { container } = render(<Values />);
    
    expect(container.querySelector('.grid-cols-1.md\\:grid-cols-2')).toBeInTheDocument();
  });

  it('has dark mode support', () => {
    const { container } = render(<Values />);
    
    expect(container.querySelector('.dark\\:bg-zinc-900')).toBeInTheDocument();
    expect(container.querySelector('.dark\\:text-white')).toBeInTheDocument();
  });

  it('renders the correct number of value cards', () => {
    const { container } = render(<Values />);
    
    const cards = container.querySelectorAll('.group');
    expect(cards.length).toBe(4);
  });

  it('applies section styling', () => {
    const { container } = render(<Values />);
    
    expect(container.querySelector('.py-24')).toBeInTheDocument();
    expect(container.querySelector('.max-w-6xl')).toBeInTheDocument();
  });

  it('renders cards with hover effects', () => {
    const { container } = render(<Values />);
    
    const cards = container.querySelectorAll('.hover\\:shadow-xl');
    expect(cards.length).toBe(4);
  });
});