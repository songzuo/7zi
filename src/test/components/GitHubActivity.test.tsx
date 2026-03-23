import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { GitHubActivity } from '@/components/GitHubActivity'
import type { ActivityType } from '@/types'

// Mock the useGitHubData hook
vi.mock('@/hooks', () => ({
  useGitHubData: vi.fn(() => ({
    commits: [],
    issues: [],
    activities: [],
    stats: null,
    isLoading: false,
    error: null,
    lastUpdated: null,
    refresh: vi.fn(),
  })),
  getMockCommits: () => [
    {
      sha: 'abc123',
      commit: {
        message: 'feat: 添加 AI 聊天组件和团队状态展示',
        author: { name: 'Executor', date: new Date().toISOString() },
      },
      html_url: 'https://github.com/test/repo/commit/abc123',
      author: { avatar_url: 'https://example.com/avatar.png', login: 'executor' },
    },
    {
      sha: 'def456',
      commit: {
        message: 'feat: 实现暗色/亮色模式切换',
        author: { name: '设计师', date: new Date(Date.now() - 3600000).toISOString() },
      },
      html_url: 'https://github.com/test/repo/commit/def456',
      author: { avatar_url: 'https://example.com/avatar2.png', login: 'designer' },
    },
  ],
  getMockStats: () => ({
    stars: 128,
    forks: 24,
    openIssues: 5,
  }),
}))

const { useGitHubData, getMockCommits, getMockStats } = await import('@/hooks')

// Helper to create complete mock return value
const createMockReturn = (overrides: Record<string, unknown> = {}) => ({
  commits: [] as Array<{ sha: string; commit: { message: string; author: { name: string; date: string } }; html_url: string; author: { avatar_url: string; login: string } | null }>,
  issues: [] as Array<{ number: number; title: string; state: 'open' | 'closed'; labels: Array<{ name: string; color: string }>; created_at: string; updated_at: string; html_url: string }>,
  activities: [] as Array<{ id: string; type: ActivityType; title: string; author: string; timestamp: string; url: string }>,
  stats: null as { stars: number; forks: number; openIssues: number } | null,
  isLoading: false,
  error: null as string | null,
  lastUpdated: null as Date | null,
  refresh: vi.fn(),
  ...overrides,
})

describe('GitHubActivity', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders component header', async () => {
    useGitHubData.mockReturnValue(createMockReturn())
    
    render(<GitHubActivity />)
    
    expect(screen.getByText(/GitHub 实时动态/)).toBeInTheDocument()
    expect(screen.getByText('追踪我们的开发进度和代码提交')).toBeInTheDocument()
  })

  it('shows loading state when isLoading is true', () => {
    useGitHubData.mockReturnValue(createMockReturn({ isLoading: true }))
    
    render(<GitHubActivity />)
    
    // Loading skeletons should be present
    const skeletons = document.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('displays GitHub stats cards', async () => {
    useGitHubData.mockReturnValue(createMockReturn({
      commits: getMockCommits(),
      stats: getMockStats(),
    }))
    
    render(<GitHubActivity />)
    
    await waitFor(() => {
      // Stats labels include emoji prefixes
      expect(screen.getByText(/Stars/)).toBeInTheDocument()
      expect(screen.getByText(/Forks/)).toBeInTheDocument()
      expect(screen.getByText(/Issues/)).toBeInTheDocument()
    })
  })

  it('displays fetched stats values', async () => {
    useGitHubData.mockReturnValue(createMockReturn({
      commits: getMockCommits(),
      stats: getMockStats(),
    }))
    
    render(<GitHubActivity />)
    
    await waitFor(() => {
      expect(screen.getByText('128')).toBeInTheDocument()
      expect(screen.getByText('24')).toBeInTheDocument()
      expect(screen.getByText('5')).toBeInTheDocument()
    })
  })

  it('displays error message when present', () => {
    useGitHubData.mockReturnValue(createMockReturn({
      error: 'Failed to fetch data',
    }))
    
    render(<GitHubActivity />)
    
    expect(screen.getByText(/Failed to fetch data/)).toBeInTheDocument()
  })

  it('displays empty state when no data', () => {
    useGitHubData.mockReturnValue(createMockReturn())
    
    render(<GitHubActivity />)
    
    expect(screen.getByText(/暂无活动/)).toBeInTheDocument()
  })

  it('displays activities when present', async () => {
    const mockActivities: Array<{ id: string; type: ActivityType; title: string; author: string; timestamp: string; url: string }> = [
      {
        id: '1',
        type: 'commit',
        title: 'feat: 新功能',
        author: 'Executor',
        timestamp: new Date().toISOString(),
        url: 'https://github.com/test/test/commit/abc123',
      },
      {
        id: '2',
        type: 'issue',
        title: 'bug: 修复问题',
        author: '测试员',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        url: 'https://github.com/test/test/issues/1',
      },
    ]

    useGitHubData.mockReturnValue(createMockReturn({
      activities: mockActivities,
    }))
    
    render(<GitHubActivity />)
    
    await waitFor(() => {
      expect(screen.getByText('feat: 新功能')).toBeInTheDocument()
      expect(screen.getByText('bug: 修复问题')).toBeInTheDocument()
    })
  })

  it('calls refresh when refresh button is clicked', async () => {
    const mockRefresh = vi.fn()
    useGitHubData.mockReturnValue(createMockReturn({
      refresh: mockRefresh,
      lastUpdated: new Date(),
    }))
    
    render(<GitHubActivity />)
    
    const refreshButton = screen.getByRole('button', { name: /刷新/i })
    refreshButton.click()
    
    expect(mockRefresh).toHaveBeenCalled()
  })

  it('displays last updated time', async () => {
    const lastUpdated = new Date(Date.now() - 60000)
    useGitHubData.mockReturnValue(createMockReturn({
      lastUpdated,
      activities: [
        {
          id: '1',
          type: 'commit',
          title: 'test',
          author: 'test',
          timestamp: new Date().toISOString(),
          url: 'https://test.com',
        },
      ],
    }))
    
    render(<GitHubActivity />)
    
    await waitFor(() => {
      expect(screen.getByText(/分钟前/)).toBeInTheDocument()
    })
  })
})
