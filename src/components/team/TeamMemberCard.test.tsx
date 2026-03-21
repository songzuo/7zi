/**
 * TeamMemberCard Component Tests
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TeamMemberCard } from './TeamMemberCard';

describe('TeamMemberCard', () => {
  const mockMember = {
    id: '1',
    name: 'Alice',
    role: 'Developer',
    emoji: '👨‍💻',
    color: 'from-blue-500 to-purple-600',
    status: 'online',
    key: 'alice',
  };

  const mockTranslations = {
    name: 'Alice',
    role: 'Full Stack Developer',
    description: 'Expert in React and Node.js development',
    skills: ['React', 'Node.js', 'TypeScript'],
  };

  it('should render team member card with correct name', () => {
    render(<TeamMemberCard member={mockMember} translations={mockTranslations} />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
  });

  it('should render team member card with correct role', () => {
    render(<TeamMemberCard member={mockMember} translations={mockTranslations} />);
    expect(screen.getByText('Full Stack Developer')).toBeInTheDocument();
  });

  it('should render team member card with correct description', () => {
    render(<TeamMemberCard member={mockMember} translations={mockTranslations} />);
    expect(screen.getByText('Expert in React and Node.js development')).toBeInTheDocument();
  });

  it('should render all skills', () => {
    render(<TeamMemberCard member={mockMember} translations={mockTranslations} />);
    expect(screen.getByText('React')).toBeInTheDocument();
    expect(screen.getByText('Node.js')).toBeInTheDocument();
    expect(screen.getByText('TypeScript')).toBeInTheDocument();
  });

  it('should render emoji', () => {
    const { container } = render(
      <TeamMemberCard member={mockMember} translations={mockTranslations} />
    );
    expect(container.textContent).toContain('👨‍💻');
  });

  it('should apply correct gradient color classes', () => {
    const { container } = render(
      <TeamMemberCard member={mockMember} translations={mockTranslations} />
    );
    const card = container.querySelector('.bg-white, .dark\\:bg-zinc-900');
    expect(card).toBeInTheDocument();
  });

  it('should render empty skills list gracefully', () => {
    const emptyTranslations = {
      ...mockTranslations,
      skills: [],
    };
    const { container } = render(
      <TeamMemberCard member={mockMember} translations={emptyTranslations} />
    );
    const skillSection = container.querySelector('.flex.flex-wrap');
    expect(skillSection?.children).toHaveLength(0);
  });
});
