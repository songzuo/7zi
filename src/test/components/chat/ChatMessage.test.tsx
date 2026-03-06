import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ChatMessage, TypingIndicator } from '@/components/chat/ChatMessage'
import { Message, TeamMember } from '@/components/chat/types'

const mockTeamMembers: TeamMember[] = [
  {
    id: 'member-1',
    name: '测试AI',
    emoji: '🤖',
    avatar: '/avatar1.png',
    status: 'online',
    provider: 'test',
  },
]

const createMockMessage = (overrides: Partial<Message> = {}): Message => ({
  id: 'msg-1',
  role: 'user',
  content: '测试消息',
  timestamp: new Date('2024-01-15T10:30:00'),
  ...overrides,
})

describe('ChatMessage', () => {
  describe('user messages', () => {
    it('renders user message correctly', () => {
      const message = createMockMessage({ role: 'user' })
      render(<ChatMessage message={message} teamMembers={mockTeamMembers} />)
      
      expect(screen.getByText('测试消息')).toBeInTheDocument()
    })

    it('aligns user message to the right', () => {
      const message = createMockMessage({ role: 'user' })
      const { container } = render(<ChatMessage message={message} teamMembers={mockTeamMembers} />)
      
      const wrapper = container.firstChild as HTMLElement
      expect(wrapper.className).toContain('justify-end')
    })

    it('shows timestamp for user message', () => {
      const message = createMockMessage({ 
        role: 'user',
        timestamp: new Date('2024-01-15T10:30:00')
      })
      render(<ChatMessage message={message} teamMembers={mockTeamMembers} />)
      
      expect(screen.getByText(/10:30/)).toBeInTheDocument()
    })
  })

  describe('assistant messages', () => {
    it('renders assistant message correctly', () => {
      const message = createMockMessage({ role: 'assistant' })
      render(<ChatMessage message={message} teamMembers={mockTeamMembers} />)
      
      expect(screen.getByText('测试消息')).toBeInTheDocument()
    })

    it('aligns assistant message to the left', () => {
      const message = createMockMessage({ role: 'assistant' })
      const { container } = render(<ChatMessage message={message} teamMembers={mockTeamMembers} />)
      
      const wrapper = container.firstChild as HTMLElement
      expect(wrapper.className).toContain('justify-start')
    })

    it('shows member info for assistant message with memberId', () => {
      const message = createMockMessage({ 
        role: 'assistant',
        memberId: 'member-1'
      })
      render(<ChatMessage message={message} teamMembers={mockTeamMembers} />)
      
      expect(screen.getByText('🤖 测试AI')).toBeInTheDocument()
    })

    it('does not show member info when memberId is not found', () => {
      const message = createMockMessage({ 
        role: 'assistant',
        memberId: 'non-existent'
      })
      render(<ChatMessage message={message} teamMembers={mockTeamMembers} />)
      
      expect(screen.queryByText('🤖 测试AI')).not.toBeInTheDocument()
    })

    it('does not show member info when memberId is not provided', () => {
      const message = createMockMessage({ role: 'assistant' })
      render(<ChatMessage message={message} teamMembers={mockTeamMembers} />)
      
      expect(screen.queryByText('🤖 测试AI')).not.toBeInTheDocument()
    })
  })

  describe('message content', () => {
    it('preserves whitespace in message content', () => {
      const message = createMockMessage({ content: 'line1\nline2\nline3' })
      const { container } = render(<ChatMessage message={message} teamMembers={mockTeamMembers} />)
      
      const contentElement = container.querySelector('.whitespace-pre-wrap')
      expect(contentElement).toBeInTheDocument()
      expect(contentElement?.textContent).toBe('line1\nline2\nline3')
    })
  })
})

describe('TypingIndicator', () => {
  it('renders typing indicator', () => {
    render(<TypingIndicator />)
    
    const dots = screen.getAllByText('', { selector: 'span.animate-bounce' })
    expect(dots).toHaveLength(3)
  })

  it('has correct animation delays', () => {
    const { container } = render(<TypingIndicator />)
    
    const dots = container.querySelectorAll('span.animate-bounce')
    expect(dots[0]).not.toHaveStyle({ animationDelay: '0.1s' })
    expect(dots[1]).toHaveStyle({ animationDelay: '0.1s' })
    expect(dots[2]).toHaveStyle({ animationDelay: '0.2s' })
  })
})