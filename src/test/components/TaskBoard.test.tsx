import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TaskBoard } from '@/components/TaskBoard'
import { GitHubIssue } from '@/types'

const mockIssues: GitHubIssue[] = [
  {
    number: 1,
    title: '实现用户登录功能',
    state: 'open',
    labels: [{ name: 'feature', color: 'blue' }],
    assignee: { login: 'executor', avatar_url: 'https://example.com/avatar.png' },
    created_at: '2024-03-01T10:00:00Z',
    updated_at: '2024-03-06T10:00:00Z',
    html_url: 'https://github.com/test/repo/issues/1',
  },
  {
    number: 2,
    title: '修复导航栏样式问题',
    state: 'closed',
    labels: [{ name: 'bug', color: 'red' }, { name: 'ui', color: 'green' }],
    assignee: null,
    created_at: '2024-03-02T10:00:00Z',
    updated_at: '2024-03-05T10:00:00Z',
    html_url: 'https://github.com/test/repo/issues/2',
  },
  {
    number: 3,
    title: '添加暗色模式支持',
    state: 'open',
    labels: [],
    assignee: { login: 'designer', avatar_url: 'https://example.com/avatar2.png' },
    created_at: '2024-03-03T10:00:00Z',
    updated_at: '2024-03-06T09:00:00Z',
    html_url: 'https://github.com/test/repo/issues/3',
  },
]

describe('TaskBoard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('renders task board with header', () => {
      render(<TaskBoard issues={mockIssues} />)
      
      expect(screen.getByText(/GitHub 任务/)).toBeInTheDocument()
    })

    it('renders issue numbers', () => {
      render(<TaskBoard issues={mockIssues} />)
      
      expect(screen.getByText('#1')).toBeInTheDocument()
    })

    it('renders issue titles', () => {
      render(<TaskBoard issues={mockIssues} />)
      
      expect(screen.getByText('实现用户登录功能')).toBeInTheDocument()
    })
  })

  describe('progress calculation', () => {
    it('displays correct progress percentage', () => {
      render(<TaskBoard issues={mockIssues} />)
      
      // 1 closed out of 3 total = 33%
      expect(screen.getByText('33%')).toBeInTheDocument()
    })

    it('calculates 0% progress when no issues', () => {
      render(<TaskBoard issues={[]} />)
      
      expect(screen.getByText('0%')).toBeInTheDocument()
    })

    it('shows open and closed issue counts', () => {
      render(<TaskBoard issues={mockIssues} />)
      
      expect(screen.getByText(/2.*进行中/)).toBeInTheDocument()
      expect(screen.getByText(/1.*已完成/)).toBeInTheDocument()
    })
  })

  describe('filtering', () => {
    it('filters issues by open state by default', () => {
      render(<TaskBoard issues={mockIssues} />)
      
      // Should show open issues
      expect(screen.getByText('实现用户登录功能')).toBeInTheDocument()
      expect(screen.getByText('添加暗色模式支持')).toBeInTheDocument()
      // Closed issue should not be visible
      expect(screen.queryByText('修复导航栏样式问题')).not.toBeInTheDocument()
    })

    it('filters issues to show all when "all" is selected', () => {
      render(<TaskBoard issues={mockIssues} />)
      
      const select = screen.getByRole('combobox')
      fireEvent.change(select, { target: { value: 'all' } })
      
      expect(screen.getByText('实现用户登录功能')).toBeInTheDocument()
      expect(screen.getByText('修复导航栏样式问题')).toBeInTheDocument()
      expect(screen.getByText('添加暗色模式支持')).toBeInTheDocument()
    })

    it('filters issues to show closed when "closed" is selected', () => {
      render(<TaskBoard issues={mockIssues} />)
      
      const select = screen.getByRole('combobox')
      fireEvent.change(select, { target: { value: 'closed' } })
      
      expect(screen.queryByText('实现用户登录功能')).not.toBeInTheDocument()
      expect(screen.getByText('修复导航栏样式问题')).toBeInTheDocument()
    })
  })

  describe('empty state', () => {
    it('displays empty state when no issues match filter', () => {
      render(<TaskBoard issues={[]} />)
      
      expect(screen.getByText('暂无任务')).toBeInTheDocument()
    })
  })

  describe('task count', () => {
    it('shows correct task count in footer', () => {
      render(<TaskBoard issues={mockIssues} />)
      
      // Default filter is "open", showing 2 out of 3
      expect(screen.getByText(/显示.*2.*\/.*3.*个任务/)).toBeInTheDocument()
    })
  })

  describe('issue cards', () => {
    it('displays issue labels', () => {
      render(<TaskBoard issues={mockIssues} />)
      
      expect(screen.getByText('feature')).toBeInTheDocument()
    })

    it('displays multiple labels when present', () => {
      render(<TaskBoard issues={mockIssues} />)
      
      const select = screen.getByRole('combobox')
      fireEvent.change(select, { target: { value: 'all' } })
      
      expect(screen.getByText('bug')).toBeInTheDocument()
      expect(screen.getByText('ui')).toBeInTheDocument()
    })

    it('displays assignee when present', () => {
      render(<TaskBoard issues={mockIssues} />)
      
      expect(screen.getByText('executor')).toBeInTheDocument()
    })

    it('displays open state correctly', () => {
      render(<TaskBoard issues={mockIssues} />)
      
      expect(screen.getByText(/进行中/)).toBeInTheDocument()
    })

    it('displays closed state correctly', () => {
      render(<TaskBoard issues={mockIssues} />)
      
      const select = screen.getByRole('combobox')
      fireEvent.change(select, { target: { value: 'closed' } })
      
      expect(screen.getByText(/已完成/)).toBeInTheDocument()
    })

    it('renders link to GitHub issue', () => {
      render(<TaskBoard issues={mockIssues} />)
      
      const links = screen.getAllByRole('link')
      expect(links.some(link => link.getAttribute('href') === mockIssues[0].html_url)).toBe(true)
    })
  })
})