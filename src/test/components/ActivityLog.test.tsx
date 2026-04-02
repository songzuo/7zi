/**
 * @fileoverview ActivityLog component tests
 */
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ActivityLog } from '../../components/ActivityLog'

const mockActivities = [
  {
    id: '1',
    type: 'commit' as const,
    title: 'Add new feature',
    author: 'John Doe',
    avatar: '/avatar1.jpg',
    timestamp: '2024-01-01T12:00:00Z',
    url: 'https://github.com/repo/commit/abc123',
  },
  {
    id: '2',
    type: 'issue' as const,
    title: 'Fix bug in login',
    author: 'Jane Smith',
    avatar: '/avatar2.jpg',
    timestamp: '2024-01-02T10:00:00Z',
    url: 'https://github.com/repo/issues/456',
  },
  {
    id: '3',
    type: 'comment' as const,
    title: 'Review requested',
    author: 'Bob Wilson',
    timestamp: '2024-01-03T08:00:00Z',
    url: 'https://github.com/repo/pull/789#comment-123',
  },
]

describe('ActivityLog', () => {
  it('renders activity log header', () => {
    render(<ActivityLog activities={mockActivities} />)

    expect(screen.getByText('⚡')).toBeInTheDocument()
    expect(screen.getByText('实时活动日志')).toBeInTheDocument()
    expect(screen.getByText(/最近 3 条活动/)).toBeInTheDocument()
  })

  it('renders all activity items', () => {
    render(<ActivityLog activities={mockActivities} />)

    expect(screen.getByText('Add new feature')).toBeInTheDocument()
    expect(screen.getByText('Fix bug in login')).toBeInTheDocument()
    expect(screen.getByText('Review requested')).toBeInTheDocument()
  })

  it('renders author names', () => {
    render(<ActivityLog activities={mockActivities} />)

    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('Jane Smith')).toBeInTheDocument()
    expect(screen.getByText('Bob Wilson')).toBeInTheDocument()
  })

  it('renders correct type icons', () => {
    const { container } = render(<ActivityLog activities={mockActivities} />)

    expect(container.textContent).toContain('💻') // commit
    expect(container.textContent).toContain('📋') // issue
    expect(container.textContent).toContain('💬') // comment
  })

  it('renders correct type labels', () => {
    render(<ActivityLog activities={mockActivities} />)

    expect(screen.getByText('提交')).toBeInTheDocument()
    expect(screen.getByText('任务')).toBeInTheDocument()
    expect(screen.getByText('评论')).toBeInTheDocument()
  })

  it('renders empty state when no activities', () => {
    render(<ActivityLog activities={[]} />)

    expect(screen.getByText('暂无活动')).toBeInTheDocument()
  })

  it('renders correct number of activities in header', () => {
    render(<ActivityLog activities={mockActivities} />)

    expect(screen.getByText(/最近 3 条活动/)).toBeInTheDocument()
  })

  it('renders links to activities', () => {
    const { container } = render(<ActivityLog activities={mockActivities} />)

    const links = container.querySelectorAll('a')
    expect(links.length).toBeGreaterThan(0)
  })

  it('renders avatar images when provided', () => {
    render(<ActivityLog activities={mockActivities} />)

    const images = screen.getAllByRole('img')
    expect(images.length).toBeGreaterThan(0)
  })

  it('handles missing avatar gracefully', () => {
    const activitiesWithoutAvatar = [
      {
        id: '1',
        type: 'commit' as const,
        title: 'Test commit',
        author: 'Test Author',
        timestamp: '2024-01-01T12:00:00Z',
        url: 'https://github.com/repo/commit/abc123',
      },
    ]

    const { container } = render(<ActivityLog activities={activitiesWithoutAvatar} />)

    // Should not throw error
    expect(container.querySelector('.activity-log')).toBeInTheDocument()
  })
})
