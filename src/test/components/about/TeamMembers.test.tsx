import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TeamMembers } from '@/components/about/TeamMembers';

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      'team.badge': 'Our Team',
      'team.title': 'Meet the Team',
      'team.description': 'A diverse group of experts working together.',
    };
    // Handle nested translations for team members
    if (key.startsWith('team.members.')) {
      const parts = key.split('.');
      const memberKey = parts[2];
      const field = parts[3];
      const names: Record<string, string> = {
        expert: 'Technical Expert',
        consultant: 'Business Consultant',
        architect: 'Solution Architect',
        executor: 'Project Executor',
        admin: 'System Admin',
        tester: 'QA Engineer',
        designer: 'UI Designer',
        promoter: 'Marketing Lead',
        sales: 'Sales Manager',
        finance: 'Finance Lead',
        media: 'Media Specialist',
      };
      const roles: Record<string, string> = {
        expert: 'Full-Stack Development',
        consultant: 'Business Strategy',
        architect: 'System Design',
        executor: 'Project Management',
        admin: 'Infrastructure',
        tester: 'Quality Assurance',
        designer: 'User Experience',
        promoter: 'Brand Promotion',
        sales: 'Client Relations',
        finance: 'Financial Planning',
        media: 'Content Creation',
      };
      const descriptions: Record<string, string> = {
        expert: 'Building robust and scalable solutions.',
        consultant: 'Providing strategic business guidance.',
        architect: 'Designing system architecture.',
        executor: 'Managing projects efficiently.',
        admin: 'Maintaining system infrastructure.',
        tester: 'Ensuring product quality.',
        designer: 'Creating beautiful interfaces.',
        promoter: 'Promoting brand awareness.',
        sales: 'Building client relationships.',
        finance: 'Managing financial operations.',
        media: 'Producing engaging content.',
      };
      
      if (field === 'name') return names[memberKey] || memberKey;
      if (field === 'role') return roles[memberKey] || memberKey;
      if (field === 'description') return descriptions[memberKey] || memberKey;
    }
    return translations[key] || key;
  },
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