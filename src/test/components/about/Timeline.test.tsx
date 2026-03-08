import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Timeline } from '@/components/about/Timeline';

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => {
    const translations: Record<string, unknown> = {
      'timeline.badge': 'Our Journey',
      'timeline.title': 'Company Timeline',
      'timeline.description': 'A timeline of our growth.',
      'timeline.items': [
        { year: '2024', title: 'Company Founded', description: 'Started our journey' },
        { year: '2024', title: 'Team Growth', description: 'Expanded the team' },
        { year: '2025', title: 'Market Expansion', description: 'Entered new markets' },
        { year: '2025', title: 'Innovation', description: 'Launched new products' },
      ],
    };
    
    const t = (key: string) => translations[key] || key;
    t.raw = (key: string) => translations[key] || key;
    return t;
  },
}));

describe('Timeline', () => {
  it('renders the section title', () => {
    render(<Timeline />);
    
    expect(screen.getByText('Company Timeline')).toBeInTheDocument();
  });

  it('renders the badge', () => {
    render(<Timeline />);
    
    expect(screen.getByText('📅')).toBeInTheDocument();
    expect(screen.getByText('Our Journey')).toBeInTheDocument();
  });

  it('renders the description', () => {
    render(<Timeline />);
    
    expect(screen.getByText('A timeline of our growth.')).toBeInTheDocument();
  });

  it('renders timeline emojis', () => {
    render(<Timeline />);
    
    expect(screen.getByText('🚀')).toBeInTheDocument();
    expect(screen.getByText('👥')).toBeInTheDocument();
    expect(screen.getByText('📈')).toBeInTheDocument();
    expect(screen.getByText('⚡')).toBeInTheDocument();
  });

  it('renders timeline years', () => {
    render(<Timeline />);
    
    // 2024 and 2025 should appear in the timeline items
    const years2024 = screen.getAllByText('2024');
    const years2025 = screen.getAllByText('2025');
    
    expect(years2024.length).toBeGreaterThan(0);
    expect(years2025.length).toBeGreaterThan(0);
  });

  it('renders timeline step numbers', () => {
    render(<Timeline />);
    
    // Timeline shows step numbers 1-4
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
  });

  it('applies correct section styling', () => {
    const { container } = render(<Timeline />);
    
    expect(container.querySelector('.py-24')).toBeInTheDocument();
    expect(container.querySelector('.max-w-5xl')).toBeInTheDocument();
  });

  it('has dark mode support', () => {
    const { container } = render(<Timeline />);
    
    expect(container.querySelector('.dark\\:from-zinc-900')).toBeInTheDocument();
    expect(container.querySelector('.dark\\:text-white')).toBeInTheDocument();
  });

  it('renders timeline connector line', () => {
    const { container } = render(<Timeline />);
    
    // The vertical line connecting timeline items
    const line = container.querySelector('.absolute.left-8');
    expect(line).toBeInTheDocument();
  });

  it('renders the correct number of timeline items', () => {
    const { container } = render(<Timeline />);
    
    // Timeline has 4 items
    const timelineItems = container.querySelectorAll('.space-y-12 > div');
    expect(timelineItems.length).toBe(4);
  });

  it('renders centered step indicators', () => {
    const { container } = render(<Timeline />);
    
    // Check for the centered step indicators (circles with numbers)
    const stepIndicators = container.querySelectorAll('.rounded-full');
    expect(stepIndicators.length).toBeGreaterThan(0);
  });
});