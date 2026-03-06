import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemberCard, AIMember } from '@/components/MemberCard'

const mockMember: AIMember = {
  id: '1',
  name: '测试AI',
  role: '测试工程师',
  emoji: '🧪',
  avatar: '/test-avatar.png',
  status: 'working',
  provider: 'test-provider',
  currentTask: '编写测试用例',
  completedTasks: 42,
}

describe('MemberCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('default (non-compact) variant', () => {
    it('renders member information correctly', () => {
      render(<MemberCard member={mockMember} />)
      
      expect(screen.getByText('🧪 测试AI')).toBeInTheDocument()
      expect(screen.getByText('测试工程师')).toBeInTheDocument()
      expect(screen.getByText('提供商：test-provider')).toBeInTheDocument()
    })

    it('shows current task when provided', () => {
      render(<MemberCard member={mockMember} />)
      
      expect(screen.getByText('📌 编写测试用例')).toBeInTheDocument()
    })

    it('shows completed tasks count', () => {
      render(<MemberCard member={mockMember} />)
      
      expect(screen.getByText('42')).toBeInTheDocument()
      expect(screen.getByText('完成任务')).toBeInTheDocument()
    })

    it('does not show current task when not provided', () => {
      const memberWithoutTask = { ...mockMember, currentTask: undefined }
      render(<MemberCard member={memberWithoutTask} />)
      
      expect(screen.queryByText('📌')).not.toBeInTheDocument()
    })

    it('displays working status correctly', () => {
      render(<MemberCard member={mockMember} />)
      
      expect(screen.getByText('工作中')).toBeInTheDocument()
    })

    it('displays busy status correctly', () => {
      const busyMember = { ...mockMember, status: 'busy' as const }
      render(<MemberCard member={busyMember} />)
      
      expect(screen.getByText('忙碌')).toBeInTheDocument()
    })

    it('displays idle status correctly', () => {
      const idleMember = { ...mockMember, status: 'idle' as const }
      render(<MemberCard member={idleMember} />)
      
      expect(screen.getByText('空闲')).toBeInTheDocument()
    })

    it('displays offline status correctly', () => {
      const offlineMember = { ...mockMember, status: 'offline' as const }
      render(<MemberCard member={offlineMember} />)
      
      expect(screen.getByText('离线')).toBeInTheDocument()
    })
  })

  describe('compact variant', () => {
    it('renders compact card correctly', () => {
      render(<MemberCard member={mockMember} compact />)
      
      expect(screen.getByText('🧪 测试AI')).toBeInTheDocument()
      expect(screen.getByText('测试工程师')).toBeInTheDocument()
    })

    it('shows status badge in compact mode', () => {
      render(<MemberCard member={mockMember} compact />)
      
      expect(screen.getByText('工作中')).toBeInTheDocument()
    })

    it('shows current task in compact mode', () => {
      render(<MemberCard member={mockMember} compact />)
      
      expect(screen.getByText('📌 编写测试用例')).toBeInTheDocument()
    })

    it('shows completed tasks count in compact mode', () => {
      render(<MemberCard member={mockMember} compact />)
      
      expect(screen.getByText('42')).toBeInTheDocument()
    })

    it('shows provider in compact mode', () => {
      render(<MemberCard member={mockMember} compact />)
      
      expect(screen.getByText('test-provider')).toBeInTheDocument()
    })

    it('hides current task when not provided in compact mode', () => {
      const memberWithoutTask = { ...mockMember, currentTask: undefined }
      render(<MemberCard member={memberWithoutTask} compact />)
      
      expect(screen.queryByText('📌')).not.toBeInTheDocument()
    })
  })
})
