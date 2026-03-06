import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { GitHubActivity } from '@/components/GitHubActivity'

// Mock the useGitHubData hook
vi.mock('@/hooks', () => ({
  useGitHubData: vi.fn(() => ({
    commits: [],
    stats: null,
    isLoading: false,
    error: null,
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

describe('GitHubActivity', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders component header', async () => {
    vi.mocked(useGitHubData).mockReturnValue({
      commits: [],
      stats: null,
      isLoading: false,
      error: null,
      refresh: vi.fn(),
    } as ReturnType<typeof useGitHubData>)
    
    render(<GitHubActivity />)
    
    expect(screen.getByText(/GitHub 实时动态/)).toBeInTheDocument()
    expect(screen.getByText('追踪我们的开发进度和代码提交')).toBeInTheDocument()
  })

  it('shows loading state when isLoading is true', () => {
    vi.mocked(useGitHubData).mockReturnValue({
      commits: [],
      stats: null,
      isLoading: true,
      error: null,
      refresh: vi.fn(),
    } as ReturnType<typeof useGitHubData>)
    
    render(<GitHubActivity />)
    
    // Loading skeletons should be present
    const skeletons = document.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('displays GitHub stats cards', async () => {
    vi.mocked(useGitHubData).mockReturnValue({
      commits: getMockCommits(),
      stats: getMockStats(),
      isLoading: false,
      error: null,
      refresh: vi.fn(),
    } as ReturnType<typeof useGitHubData>)
    
    render(<GitHubActivity />)
    
    await waitFor(() => {
      expect(screen.getByText('Stars')).toBeInTheDocument()
      expect(screen.getByText('Forks')).toBeInTheDocument()
      expect(screen.getByText('Issues')).toBeInTheDocument()
    })
  })

  it('displays fetched stats values', async () => {
    vi.mocked(useGitHubData).mockReturnValue({
      commits: getMockCommits(),
      stats: getMockStats(),
      isLoading: false,
      error: null,
      refresh: vi.fn(),
    } as ReturnType<typeof useGitHubData>)
    
    render(<GitHubActivity />)
    
    await waitFor(() => {
      expect(screen.getByText('128')).toBeInTheDocument()
      expect(screen.getByText('24')).toBeInTheDocument()
      expect(screen.getByText('5')).toBeInTheDocument()
    })
  })

  it('displays commits after loading', async () => {
    vi.mocked(useGitHubData).mockReturnValue({
      commits: getMockCommits(),
      stats: getMockStats(),
      isLoading: false,
      error: null,
      refresh: vi.fn(),
    } as ReturnType<typeof useGitHubData>)
    
    render(<GitHubActivity />)
    
    await waitFor(() => {
      expect(screen.getByText('最近提交')).toBeInTheDocument()
    })
    
    await waitFor(() => {
      expect(screen.getByText('feat: 添加 AI 聊天组件和团队状态展示')).toBeInTheDocument()
      expect(screen.getByText('feat: 实现暗色/亮色模式切换')).toBeInTheDocument()
    })
  })

  it('displays commit sha prefix', async () => {
    vi.mocked(useGitHubData).mockReturnValue({
      commits: getMockCommits(),
      stats: getMockStats(),
      isLoading: false,
      error: null,
      refresh: vi.fn(),
    } as ReturnType<typeof useGitHubData>)
    
    render(<GitHubActivity />)
    
    await waitFor(() => {
      expect(screen.getByText('abc123')).toBeInTheDocument()
    })
  })

  it('displays commit author', async () => {
    vi.mocked(useGitHubData).mockReturnValue({
      commits: getMockCommits(),
      stats: getMockStats(),
      isLoading: false,
      error: null,
      refresh: vi.fn(),
    } as ReturnType<typeof useGitHubData>)
    
    render(<GitHubActivity />)
    
    await waitFor(() => {
      expect(screen.getByText(/by Executor/)).toBeInTheDocument()
      expect(screen.getByText(/by 设计师/)).toBeInTheDocument()
    })
  })

  it('uses mock data when commits are empty', async () => {
    vi.mocked(useGitHubData).mockReturnValue({
      commits: [], // Empty commits - will use mock data
      stats: null,
      isLoading: false,
      error: null,
      refresh: vi.fn(),
    } as ReturnType<typeof useGitHubData>)
    
    render(<GitHubActivity />)
    
    await waitFor(() => {
      // Mock data contains these messages
      expect(screen.getByText(/AI 聊天组件/)).toBeInTheDocument()
    })
  })

  it('displays today activity statistics', async () => {
    vi.mocked(useGitHubData).mockReturnValue({
      commits: getMockCommits(),
      stats: getMockStats(),
      isLoading: false,
      error: null,
      refresh: vi.fn(),
    } as ReturnType<typeof useGitHubData>)
    
    render(<GitHubActivity />)
    
    await waitFor(() => {
      expect(screen.getByText(/今日活动统计/)).toBeInTheDocument()
      expect(screen.getByText('代码提交')).toBeInTheDocument()
      expect(screen.getByText('问题解决')).toBeInTheDocument()
      expect(screen.getByText('功能上线')).toBeInTheDocument()
      expect(screen.getByText('团队效率')).toBeInTheDocument()
    })
  })

  it('renders commit links correctly', async () => {
    vi.mocked(useGitHubData).mockReturnValue({
      commits: getMockCommits(),
      stats: getMockStats(),
      isLoading: false,
      error: null,
      refresh: vi.fn(),
    } as ReturnType<typeof useGitHubData>)
    
    render(<GitHubActivity />)
    
    await waitFor(() => {
      const links = screen.getAllByRole('link')
      const commitLinks = links.filter(link => 
        link.getAttribute('href')?.includes('github.com')
      )
      expect(commitLinks.length).toBeGreaterThan(0)
    })
  })
})
