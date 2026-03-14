import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ActivityLog, ActivityItem } from '@/components/ActivityLog'

describe('ActivityLog', () => {
  const mockActivities: ActivityItem[] = [
    {
      id: '1',
      type: 'commit',
      title: 'Add new feature',
      author: 'John Doe',
      avatar: 'https://example.com/avatar1.jpg',
      timestamp: '2024-01-15T10:30:00Z',
      url: 'https://github.com/test/repo/commit/1'
    },
    {
      id: '2',
      type: 'issue',
      title: 'Fix bug in login',
      author: 'Jane Smith',
      timestamp: '2024-01-15T09:00:00Z',
      url: 'https://github.com/test/repo/issues/2'
    },
    {
      id: '3',
      type: 'comment',
      title: 'Review PR',
      author: 'Bob Wilson',
      timestamp: '2024-01-15T08:00:00Z',
      url: 'https://github.com/test/repo/pulls/3'
    }
  ]

  it('renders activity list correctly', () => {
    render(<ActivityLog activities={mockActivities} />)
    
    // Check all activities are rendered
    expect(screen.getByText('Add new feature')).toBeInTheDocument()
    expect(screen.getByText('Fix bug in login')).toBeInTheDocument()
    expect(screen.getByText('Review PR')).toBeInTheDocument()
  })

  it('renders activity authors', () => {
    render(<ActivityLog activities={mockActivities} />)
    
    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('Jane Smith')).toBeInTheDocument()
    expect(screen.getByText('Bob Wilson')).toBeInTheDocument()
  })

  it('renders commit type with correct icon', () => {
    render(<ActivityLog activities={[mockActivities[0]]} />)
    
    expect(screen.getByText('💻')).toBeInTheDocument()
    expect(screen.getByText('提交')).toBeInTheDocument()
  })

  it('renders issue type with correct icon', () => {
    render(<ActivityLog activities={[mockActivities[1]]} />)
    
    expect(screen.getByText('📋')).toBeInTheDocument()
    expect(screen.getByText('任务')).toBeInTheDocument()
  })

  it('renders comment type with correct icon', () => {
    render(<ActivityLog activities={[mockActivities[2]]} />)
    
    expect(screen.getByText('💬')).toBeInTheDocument()
    expect(screen.getByText('评论')).toBeInTheDocument()
  })

  it('renders links for each activity', () => {
    render(<ActivityLog activities={mockActivities} />)
    
    const links = screen.getAllByRole('link')
    expect(links).toHaveLength(3)
    expect(links[0]).toHaveAttribute('href', 'https://github.com/test/repo/commit/1')
    expect(links[1]).toHaveAttribute('href', 'https://github.com/test/repo/issues/2')
    expect(links[2]).toHaveAttribute('href', 'https://github.com/test/repo/pulls/3')
  })

  it('handles empty activities array', () => {
    render(<ActivityLog activities={[]} />)
    
    expect(screen.queryByText('John Doe')).not.toBeInTheDocument()
  })
})
