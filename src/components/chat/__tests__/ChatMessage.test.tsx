/**
 * ChatMessage Component Tests
 * @description Unit tests for ChatMessage component
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChatMessage } from '../ChatMessage';
import type { Message, TeamMember } from '../types';

describe('ChatMessage', () => {
  const mockTeamMembers: TeamMember[] = [
    {
      id: '1',
      name: 'Alice',
      role: 'Engineer',
      emoji: '👩‍💻',
      status: 'online',
      specialty: 'Frontend',
    },
    {
      id: '2',
      name: 'Bob',
      role: 'Designer',
      emoji: '👨‍🎨',
      status: 'busy',
      specialty: 'UI/UX',
    },
  ];

  describe('Rendering', () => {
    it('should render message content', () => {
      const mockMessage: Message = {
        id: '1',
        content: 'Hello, how are you?',
        role: 'user',
        timestamp: new Date('2024-01-01T10:30:00Z'),
      };

      render(<ChatMessage message={mockMessage} teamMembers={mockTeamMembers} />);
      expect(screen.getByText('Hello, how are you?')).toBeInTheDocument();
    });

    it('should render user message on the right', () => {
      const mockMessage: Message = {
        id: '1',
        content: 'Hello, how are you?',
        role: 'user',
        timestamp: new Date('2024-01-01T10:30:00Z'),
      };

      const { container } = render(<ChatMessage message={mockMessage} teamMembers={mockTeamMembers} />);
      const wrapper = container.querySelector('.flex.justify-end');
      expect(wrapper).toBeInTheDocument();
    });

    it('should render assistant message on the left', () => {
      const mockMessage: Message = {
        id: '1',
        content: 'Hello, how are you?',
        role: 'assistant',
        memberId: '1',
        timestamp: new Date('2024-01-01T10:30:00Z'),
      };

      const { container } = render(<ChatMessage message={mockMessage} teamMembers={mockTeamMembers} />);
      const wrapper = container.querySelector('.flex.justify-start');
      expect(wrapper).toBeInTheDocument();
    });

    it('should render timestamp', () => {
      const mockMessage: Message = {
        id: '1',
        content: 'Hello, how are you?',
        role: 'user',
        timestamp: new Date('2024-01-01T10:30:00Z'),
      };

      render(<ChatMessage message={mockMessage} teamMembers={mockTeamMembers} />);
      expect(screen.getByText(/10:30/)).toBeInTheDocument();
    });

    it('should display team member name for assistant messages', () => {
      const mockMessage: Message = {
        id: '1',
        content: 'Hello, how are you?',
        role: 'assistant',
        memberId: '1',
        timestamp: new Date('2024-01-01T10:30:00Z'),
      };

      render(<ChatMessage message={mockMessage} teamMembers={mockTeamMembers} />);
      expect(screen.getByText('👩‍💻 Alice')).toBeInTheDocument();
    });

    it('should not display team member name for user messages', () => {
      const mockMessage: Message = {
        id: '1',
        content: 'Hello, how are you?',
        role: 'user',
        timestamp: new Date('2024-01-01T10:30:00Z'),
      };

      render(<ChatMessage message={mockMessage} teamMembers={mockTeamMembers} />);
      expect(screen.queryByText(/👩‍💻/)).not.toBeInTheDocument();
    });

    it('should handle multiline messages', () => {
      const mockMessage: Message = {
        id: '1',
        content: 'Line 1\nLine 2\nLine 3',
        role: 'user',
        timestamp: new Date('2024-01-01T10:30:00Z'),
      };

      render(<ChatMessage message={mockMessage} teamMembers={mockTeamMembers} />);
      expect(screen.getByText('Line 1')).toBeInTheDocument();
      expect(screen.getByText('Line 2')).toBeInTheDocument();
      expect(screen.getByText('Line 3')).toBeInTheDocument();
    });

    it('should render empty message', () => {
      const mockMessage: Message = {
        id: '1',
        content: '',
        role: 'user',
        timestamp: new Date('2024-01-01T10:30:00Z'),
      };

      const { container } = render(<ChatMessage message={mockMessage} teamMembers={mockTeamMembers} />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('should handle very long messages', () => {
      const longContent = 'A'.repeat(1000);
      const mockMessage: Message = {
        id: '1',
        content: longContent,
        role: 'user',
        timestamp: new Date('2024-01-01T10:30:00Z'),
      };

      const { container } = render(<ChatMessage message={mockMessage} teamMembers={mockTeamMembers} />);
      const messageElement = container.querySelector('.max-w-\\[80\\%\\]');
      expect(messageElement).toBeInTheDocument();
      expect(messageElement?.textContent).toBe(longContent);
    });

    it('should handle special characters in messages', () => {
      const mockMessage: Message = {
        id: '1',
        content: 'Hello! @mentions #hashtags 🎉 emojis <>&"\'',
        role: 'user',
        timestamp: new Date('2024-01-01T10:30:00Z'),
      };

      render(<ChatMessage message={mockMessage} teamMembers={mockTeamMembers} />);
      expect(screen.getByText(/Hello! @mentions #hashtags 🎉 emojis/)).toBeInTheDocument();
    });

    it('should display correct styling for user messages', () => {
      const mockMessage: Message = {
        id: '1',
        content: 'User message',
        role: 'user',
        timestamp: new Date('2024-01-01T10:30:00Z'),
      };

      const { container } = render(<ChatMessage message={mockMessage} teamMembers={mockTeamMembers} />);
      const bubble = container.querySelector('.bg-gradient-to-r.from-cyan-500.to-purple-600');
      expect(bubble).toBeInTheDocument();
    });

    it('should display correct styling for assistant messages', () => {
      const mockMessage: Message = {
        id: '1',
        content: 'Assistant message',
        role: 'assistant',
        memberId: '1',
        timestamp: new Date('2024-01-01T10:30:00Z'),
      };

      const { container } = render(<ChatMessage message={mockMessage} teamMembers={mockTeamMembers} />);
      const bubble = container.querySelector('.bg-white.dark\\:bg-zinc-800');
      expect(bubble).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing team member gracefully', () => {
      const mockMessage: Message = {
        id: '1',
        content: 'Hello',
        role: 'assistant',
        memberId: '999', // Non-existent member
        timestamp: new Date('2024-01-01T10:30:00Z'),
      };

      render(<ChatMessage message={mockMessage} teamMembers={mockTeamMembers} />);
      expect(screen.getByText('Hello')).toBeInTheDocument();
      expect(screen.queryByText(/999/)).not.toBeInTheDocument();
    });

    it('should handle undefined memberId for assistant', () => {
      const mockMessage: Message = {
        id: '1',
        content: 'Hello',
        role: 'assistant',
        timestamp: new Date('2024-01-01T10:30:00Z'),
      };

      render(<ChatMessage message={mockMessage} teamMembers={mockTeamMembers} />);
      expect(screen.getByText('Hello')).toBeInTheDocument();
    });

    it('should handle empty team members array', () => {
      const mockMessage: Message = {
        id: '1',
        content: 'Hello',
        role: 'assistant',
        memberId: '1',
        timestamp: new Date('2024-01-01T10:30:00Z'),
      };

      render(<ChatMessage message={mockMessage} teamMembers={[]} />);
      expect(screen.getByText('Hello')).toBeInTheDocument();
    });

    it('should handle different timestamps', () => {
      const mockMessage: Message = {
        id: '1',
        content: 'Hello',
        role: 'user',
        timestamp: new Date('2024-01-01T23:59:59Z'),
      };

      render(<ChatMessage message={mockMessage} teamMembers={mockTeamMembers} />);
      expect(screen.getByText(/23:59/)).toBeInTheDocument();
    });
  });
});
