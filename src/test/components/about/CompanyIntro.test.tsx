import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CompanyIntro } from '@/components/about/CompanyIntro';

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      'intro.title': 'About Us',
      'intro.p1': 'is a creative studio focused on digital innovation.',
      'intro.p2': 'We build amazing products.',
      'intro.p3': 'Our team is passionate about technology.',
      'intro.stats.experts.value': '10+',
      'intro.stats.experts.label': 'Experts',
      'intro.stats.experts.sub': 'Team members',
      'intro.stats.projects.value': '50+',
      'intro.stats.projects.label': 'Projects',
      'intro.stats.projects.sub': 'Completed',
      'intro.stats.delivery.value': '98%',
      'intro.stats.delivery.label': 'Delivery',
      'intro.stats.delivery.sub': 'On time',
      'intro.stats.support.value': '24/7',
      'intro.stats.support.label': 'Support',
      'intro.stats.support.sub': 'Available',
    };
    return translations[key] || key;
  },
}));

describe('CompanyIntro', () => {
  it('renders the section title', () => {
    render(<CompanyIntro />);
    
    expect(screen.getByText('About Us')).toBeInTheDocument();
  });

  it('renders the company name', () => {
    render(<CompanyIntro />);
    
    expect(screen.getByText('7zi Studio')).toBeInTheDocument();
  });

  it('renders intro paragraphs', () => {
    render(<CompanyIntro />);
    
    expect(screen.getByText(/is a creative studio focused on digital innovation/)).toBeInTheDocument();
    expect(screen.getByText('We build amazing products.')).toBeInTheDocument();
    expect(screen.getByText('Our team is passionate about technology.')).toBeInTheDocument();
  });

  it('renders all stats cards', () => {
    render(<CompanyIntro />);
    
    // Check stat values
    expect(screen.getByText('10+')).toBeInTheDocument();
    expect(screen.getByText('50+')).toBeInTheDocument();
    expect(screen.getByText('98%')).toBeInTheDocument();
    expect(screen.getByText('24/7')).toBeInTheDocument();
  });

  it('renders stat labels', () => {
    render(<CompanyIntro />);
    
    expect(screen.getByText('Experts')).toBeInTheDocument();
    expect(screen.getByText('Projects')).toBeInTheDocument();
    expect(screen.getByText('Delivery')).toBeInTheDocument();
    expect(screen.getByText('Support')).toBeInTheDocument();
  });

  it('renders stat sub-labels', () => {
    render(<CompanyIntro />);
    
    expect(screen.getByText('Team members')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('On time')).toBeInTheDocument();
    expect(screen.getByText('Available')).toBeInTheDocument();
  });

  it('renders the rocket emoji icon', () => {
    render(<CompanyIntro />);
    
    expect(screen.getByText('🚀')).toBeInTheDocument();
  });

  it('applies correct container styling', () => {
    const { container } = render(<CompanyIntro />);
    
    expect(container.querySelector('.py-24')).toBeInTheDocument();
    expect(container.querySelector('.max-w-4xl')).toBeInTheDocument();
  });

  it('has dark mode support', () => {
    const { container } = render(<CompanyIntro />);
    
    expect(container.querySelector('.dark\\:bg-zinc-900')).toBeInTheDocument();
    expect(container.querySelector('.dark\\:text-white')).toBeInTheDocument();
  });

  it('renders the card with correct styling', () => {
    const { container } = render(<CompanyIntro />);
    
    expect(container.querySelector('.rounded-3xl')).toBeInTheDocument();
    expect(container.querySelector('.shadow-2xl')).toBeInTheDocument();
  });

  it('renders stats grid with correct columns', () => {
    const { container } = render(<CompanyIntro />);
    
    const statsGrid = container.querySelector('.grid-cols-2.md\\:grid-cols-4');
    expect(statsGrid).toBeInTheDocument();
  });
});