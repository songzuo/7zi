import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ProjectDashboard } from '@/components/ProjectDashboard'

// Mock the useDashboard hook
const mockMembers = [
  {
    id: 'agent-world-expert',
    name: '智能体世界专家',
    role: '视角转换/未来布局',
    emoji: '🌟',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=expert',
    status: 'working' as const,
    provider: 'minimax',
    currentTask: '#42 分析市场趋势',
    completedTasks: 156,
  },
  {
    id: 'consultant',
    name: '咨询师',
    role: '研究/分析',
    emoji: '📚',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=consultant',
    status: 'idle' as const,
    provider: 'minimax',
    currentTask: undefined,
    completedTasks: 203,
  },
  {
    id: 'architect',
    name: '架构师',
    role: '设计/规划',
    emoji: '🏗️',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=architect',
    status: 'busy' as const,
    provider: 'self-claude',
    currentTask: '#45 系统架构评审',
    completedTasks: 178,
  },
  {
    id: 'executor',
    name: 'Executor',
    role: '执行/实现',
    emoji: '⚡',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=executor',
    status: 'working' as const,
    provider: 'volcengine',
    currentTask: '#51 实现看板功能',
    completedTasks: 312,
  },
  {
    id: 'sysadmin',
    name: '系统管理员',
    role: '运维/部署',
    emoji: '🛡️',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=sysadmin',
    status: 'offline' as const,
    provider: 'bailian',
    currentTask: undefined,
    completedTasks: 145,
  },
]

const mockProjects = [
  {
    id: '1',
    name: '7zi.com 官网重构',
    progress: 75,
    status: 'active' as const,
    tasks: { total: 20, completed: 15 },
    team: ['Executor', '设计师'],
    deadline: '2024-03-15',
  },
  {
    id: '2',
    name: 'AI 聊天系统集成',
    progress: 90,
    status: 'active' as const,
    tasks: { total: 10, completed: 9 },
    team: ['Executor'],
    deadline: '2024-03-10',
  },
]

const mockActivities = [
  {
    id: '1',
    type: 'commit' as const,
    message: '添加 AI 聊天组件',
    user: 'Executor',
    time: '5 分钟前',
    emoji: '💻',
  },
  {
    id: '2',
    type: 'deploy' as const,
    message: '部署到生产环境',
    user: '系统管理员',
    time: '15 分钟前',
    emoji: '🚀',
  },
]

const mockStats = {
  totalTasks: 30,
  completedTasks: 24,
  overallProgress: 80,
}

// Mock useDashboard hook
vi.mock('@/hooks/useDashboard', () => ({
  useDashboard: vi.fn(() => ({
    tasks: [],
    members: mockMembers,
    dashboardStats: { totalMembers: mockMembers.length },
    projects: mockProjects,
    activities: mockActivities,
    stats: mockStats,
    getTaskAssigneeName: vi.fn((task) => task.assignee || '未分配'),
  })),
}))

// Mock LoadingSpinner
vi.mock('@/components/LoadingSpinner', () => ({
  LoadingSpinner: ({ size }: { size?: string }) => (
    <div data-testid="loading-spinner" data-size={size}>
      Loading...
    </div>
  ),
}))

// Mock dashboard components
vi.mock('@/components/dashboard', () => ({
  DashboardTabs: ({ activeTab, onTabChange }: { activeTab: string; onTabChange: (tab: string) => void }) => (
    <div data-testid="dashboard-tabs">
      <button 
        data-testid="tab-overview" 
        data-active={activeTab === 'overview'}
        onClick={() => onTabChange('overview')}
      >
        总览
      </button>
      <button 
        data-testid="tab-projects" 
        data-active={activeTab === 'projects'}
        onClick={() => onTabChange('projects')}
      >
        任务
      </button>
      <button 
        data-testid="tab-activity" 
        data-active={activeTab === 'activity'}
        onClick={() => onTabChange('activity')}
      >
        动态
      </button>
    </div>
  ),
  DashboardHeader: () => (
    <div data-testid="dashboard-header">Dashboard Header</div>
  ),
  OverviewTab: ({ members }: { members: typeof mockMembers }) => (
    <div data-testid="overview-tab">
      Overview Tab - {members.length} members
    </div>
  ),
  ProjectsTab: ({ tasks, members }: { tasks: unknown[]; members: typeof mockMembers }) => (
    <div data-testid="projects-tab">
      Projects Tab - {tasks?.length || 0} tasks, {members.length} members
    </div>
  ),
  ActivityTab: ({ activities }: { activities: typeof mockActivities }) => (
    <div data-testid="activity-tab">
      Activity Tab - {activities.length} activities
    </div>
  ),
}))

describe('ProjectDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('组件渲染测试', () => {
    it('renders without crashing', () => {
      const { container } = render(<ProjectDashboard />)
      
      expect(container).toBeTruthy()
    })

    it('renders the dashboard header', () => {
      render(<ProjectDashboard />)
      
      expect(screen.getByTestId('dashboard-header')).toBeInTheDocument()
    })

    it('renders the dashboard tabs', () => {
      render(<ProjectDashboard />)
      
      expect(screen.getByTestId('dashboard-tabs')).toBeInTheDocument()
    })

    it('renders overview tab by default', () => {
      render(<ProjectDashboard />)
      
      expect(screen.getByTestId('overview-tab')).toBeInTheDocument()
    })

    it('applies correct section styling', () => {
      const { container } = render(<ProjectDashboard />)
      
      const section = container.querySelector('section')
      expect(section).toHaveClass('py-16')
      expect(section).toHaveClass('px-6')
    })

    it('has dark mode background class', () => {
      const { container } = render(<ProjectDashboard />)
      
      expect(container.querySelector('.dark\\:bg-zinc-900')).toBeInTheDocument()
    })

    it('has correct container max-width', () => {
      const { container } = render(<ProjectDashboard />)
      
      expect(container.querySelector('.max-w-6xl')).toBeInTheDocument()
    })
  })

  describe('标签切换测试', () => {
    it('shows overview tab by default', () => {
      render(<ProjectDashboard />)
      
      const overviewTab = screen.getByTestId('tab-overview')
      expect(overviewTab).toHaveAttribute('data-active', 'true')
    })

    it('switches to projects tab when clicked', async () => {
      render(<ProjectDashboard />)
      
      const projectsTabButton = screen.getByTestId('tab-projects')
      fireEvent.click(projectsTabButton)
      
      await waitFor(() => {
        expect(projectsTabButton).toHaveAttribute('data-active', 'true')
      })
      
      expect(screen.getByTestId('projects-tab')).toBeInTheDocument()
    })

    it('switches to activity tab when clicked', async () => {
      render(<ProjectDashboard />)
      
      const activityTabButton = screen.getByTestId('tab-activity')
      fireEvent.click(activityTabButton)
      
      await waitFor(() => {
        expect(activityTabButton).toHaveAttribute('data-active', 'true')
      })
      
      expect(screen.getByTestId('activity-tab')).toBeInTheDocument()
    })

    it('only one tab is active at a time', async () => {
      render(<ProjectDashboard />)
      
      // Click projects tab
      fireEvent.click(screen.getByTestId('tab-projects'))
      
      await waitFor(() => {
        expect(screen.getByTestId('tab-overview')).toHaveAttribute('data-active', 'false')
        expect(screen.getByTestId('tab-projects')).toHaveAttribute('data-active', 'true')
        expect(screen.getByTestId('tab-activity')).toHaveAttribute('data-active', 'false')
      })
    })
  })

  describe('AI 成员列表渲染测试', () => {
    it('renders with correct number of members from hook', () => {
      render(<ProjectDashboard />)
      
      // Check that the overview tab received the correct member count
      expect(screen.getByText('Overview Tab - 5 members')).toBeInTheDocument()
    })
  })

  describe('任务统计显示测试', () => {
    it('displays stats from useDashboard hook', () => {
      render(<ProjectDashboard />)
      
      expect(screen.getByTestId('overview-tab')).toBeInTheDocument()
    })
  })

  describe('响应式布局测试', () => {
    it('has mx-auto for centering', () => {
      const { container } = render(<ProjectDashboard />)
      
      expect(container.querySelector('.mx-auto')).toBeInTheDocument()
    })

    it('has proper section padding for responsiveness', () => {
      const { container } = render(<ProjectDashboard />)
      
      const section = container.querySelector('section')
      expect(section).toHaveClass('py-16')
      expect(section).toHaveClass('px-6')
    })
  })
})