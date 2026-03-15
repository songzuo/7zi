import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TeamMembers } from '@/components/about/TeamMembers';

// Mock useAboutData hook
vi.mock('@/components/about/subcomponents/useAboutData', () => ({
  useAboutData: () => ({
    teamMembers: [
      { id: 'expert', key: 'expert', emoji: '🌟', color: 'from-cyan-500 to-blue-500' },
      { id: 'consultant', key: 'consultant', emoji: '📚', color: 'from-purple-500 to-pink-500' },
      { id: 'architect', key: 'architect', emoji: '🏗️', color: 'from-orange-500 to-red-500' },
      { id: 'executor', key: 'executor', emoji: '⚡', color: 'from-yellow-500 to-amber-500' },
      { id: 'admin', key: 'admin', emoji: '🛡️', color: 'from-green-500 to-emerald-500' },
      { id: 'tester', key: 'tester', emoji: '🧪', color: 'from-teal-500 to-cyan-500' },
      { id: 'designer', key: 'designer', emoji: '🎨', color: 'from-pink-500 to-rose-500' },
      { id: 'promoter', key: 'promoter', emoji: '📣', color: 'from-indigo-500 to-purple-500' },
      { id: 'sales', key: 'sales', emoji: '💼', color: 'from-blue-500 to-indigo-500' },
      { id: 'finance', key: 'finance', emoji: '💰', color: 'from-green-500 to-teal-500' },
      { id: 'media', key: 'media', emoji: '📺', color: 'from-red-500 to-orange-500' },
    ],
  }),
}));

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: vi.fn((namespace: string) => {
    const translations: Record<string, Record<string, string>> = {
      about: {
        'team.badge': 'Our Team',
        'team.title': 'Meet the Team',
        'team.description': 'A diverse group of experts working together.',
      },
      'team.members': {
        'expert.name': 'Technical Expert',
        'expert.role': 'Full-Stack Development',
        'expert.description': 'Building robust and scalable solutions.',
        'consultant.name': 'Business Consultant',
        'consultant.role': 'Business Strategy',
        'consultant.description': 'Providing strategic business guidance.',
        'architect.name': 'Solution Architect',
        'architect.role': 'System Design',
        'architect.description': 'Designing system architecture.',
        'executor.name': 'Project Executor',
        'executor.role': 'Project Management',
        'executor.description': 'Managing projects efficiently.',
        'admin.name': 'System Admin',
        'admin.role': 'Infrastructure',
        'admin.description': 'Maintaining system infrastructure.',
        'tester.name': 'QA Engineer',
        'tester.role': 'Quality Assurance',
        'tester.description': 'Ensuring product quality.',
        'designer.name': 'UI Designer',
        'designer.role': 'User Experience',
        'designer.description': 'Creating beautiful interfaces.',
        'promoter.name': 'Marketing Lead',
        'promoter.role': 'Brand Promotion',
        'promoter.description': 'Promoting brand awareness.',
        'sales.name': 'Sales Manager',
        'sales.role': 'Client Relations',
        'sales.description': 'Building client relationships.',
        'finance.name': 'Finance Lead',
        'finance.role': 'Financial Planning',
        'finance.description': 'Managing financial operations.',
        'media.name': 'Media Specialist',
        'media.role': 'Content Creation',
        'media.description': 'Producing engaging content.',
      },
    };
    return (key: string) => translations[namespace]?.[key] || key;
  }),
  useLocale: () => 'en',
}));

describe('TeamMembers', () => {
  it('renders the section title', () => {
    render(<TeamMembers />);
    
    expect(screen.getByText('Meet the Team')).toBeInTheDocument();
  });

  it('renders the badge', () => {
    render(<TeamMembers />);
    
    expect(screen.getByText('👥')).toBeInTheDocument();
    expect(screen.getByText('Our Team')).toBeInTheDocument();
  });

  it('renders the description', () => {
    render(<TeamMembers />);
    
    expect(screen.getByText('A diverse group of experts working together.')).toBeInTheDocument();
  });

  it('renders all team member cards', () => {
    render(<TeamMembers />);
    
    // Check for all member names
    expect(screen.getByText('Technical Expert')).toBeInTheDocument();
    expect(screen.getByText('Business Consultant')).toBeInTheDocument();
    expect(screen.getByText('Solution Architect')).toBeInTheDocument();
    expect(screen.getByText('Project Executor')).toBeInTheDocument();
    expect(screen.getByText('System Admin')).toBeInTheDocument();
    expect(screen.getByText('QA Engineer')).toBeInTheDocument();
    expect(screen.getByText('UI Designer')).toBeInTheDocument();
    expect(screen.getByText('Marketing Lead')).toBeInTheDocument();
    expect(screen.getByText('Sales Manager')).toBeInTheDocument();
    expect(screen.getByText('Finance Lead')).toBeInTheDocument();
    expect(screen.getByText('Media Specialist')).toBeInTheDocument();
  });

  it('renders team member roles', () => {
    render(<TeamMembers />);
    
    expect(screen.getByText('Full-Stack Development')).toBeInTheDocument();
    expect(screen.getByText('Business Strategy')).toBeInTheDocument();
    expect(screen.getByText('System Design')).toBeInTheDocument();
  });

  it('renders team member descriptions', () => {
    render(<TeamMembers />);
    
    expect(screen.getByText('Building robust and scalable solutions.')).toBeInTheDocument();
    expect(screen.getByText('Providing strategic business guidance.')).toBeInTheDocument();
  });

  it('renders all member emojis', () => {
    render(<TeamMembers />);
    
    expect(screen.getByText('🌟')).toBeInTheDocument();
    expect(screen.getByText('📚')).toBeInTheDocument();
    expect(screen.getByText('🏗️')).toBeInTheDocument();
    expect(screen.getByText('⚡')).toBeInTheDocument();
    expect(screen.getByText('🛡️')).toBeInTheDocument();
    expect(screen.getByText('🧪')).toBeInTheDocument();
    expect(screen.getByText('🎨')).toBeInTheDocument();
    expect(screen.getByText('📣')).toBeInTheDocument();
    expect(screen.getByText('💼')).toBeInTheDocument();
    expect(screen.getByText('💰')).toBeInTheDocument();
    expect(screen.getByText('📺')).toBeInTheDocument();
  });

  it('renders online status indicator', () => {
    render(<TeamMembers />);
    
    // All members should show 24/7 Online
    const onlineIndicators = screen.getAllByText(/24\/7 Online/);
    expect(onlineIndicators.length).toBe(11);
  });

  it('applies correct grid layout', () => {
    const { container } = render(<TeamMembers />);
    
    expect(container.querySelector('.grid-cols-1.md\\:grid-cols-2.lg\\:grid-cols-3')).toBeInTheDocument();
  });

  it('has dark mode support', () => {
    const { container } = render(<TeamMembers />);
    
    expect(container.querySelector('.dark\\:bg-zinc-900')).toBeInTheDocument();
    expect(container.querySelector('.dark\\:text-white')).toBeInTheDocument();
  });

  it('renders the correct number of member cards', () => {
    const { container } = render(<TeamMembers />);
    
    const cards = container.querySelectorAll('.group');
    expect(cards.length).toBe(11);
  });
});