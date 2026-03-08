import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DashboardTabs } from '@/components/dashboard/DashboardTabs'
import { StatsCards } from '@/components/dashboard/StatsCards'
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { ActivityItem } from '@/components/dashboard/ActivityItem'

describe('Dashboard Components', () => {
  describe('DashboardTabs', () => {
    const mockOnTabChange = vi.fn()

    beforeEach(() => {
      mockOnTabChange.mockClear()
    })

    it('renders all three tabs', () => {
      render(<DashboardTabs activeTab="overview" onTabChange={mockOnTabChange} />)
      
      expect(screen.getByText('总览')).toBeInTheDocument()
      expect(screen.getByText('任务')).toBeInTheDocument()
      expect(screen.getByText('动态')).toBeInTheDocument()
    })

    it('displays tab emojis', () => {
      render(<DashboardTabs activeTab="overview" onTabChange={mockOnTabChange} />)
      
      expect(screen.getByText('📈')).toBeInTheDocument()
      expect(screen.getByText('📁')).toBeInTheDocument()
      expect(screen.getByText('🔔')).toBeInTheDocument()
    })

    it('highlights active tab', () => {
      render(<DashboardTabs activeTab="overview" onTabChange={mockOnTabChange} />)
      
      const overviewTab = screen.getByRole('button', { name: /总览/ })
      expect(overviewTab).toHaveClass('bg-gradient-to-r')
    })

    it('calls onTabChange when tab is clicked', () => {
      render(<DashboardTabs activeTab="overview" onTabChange={mockOnTabChange} />)
      
      fireEvent.click(screen.getByRole('button', { name: /任务/ }))
      
      expect(mockOnTabChange).toHaveBeenCalledWith('projects')
    })

    it('updates active tab styling when changed', () => {
      const { rerender } = render(
        <DashboardTabs activeTab="overview" onTabChange={mockOnTabChange} />
      )
      
      let activeTab = screen.getByRole('button', { name: /总览/ })
      expect(activeTab).toHaveClass('bg-gradient-to-r')
      
      rerender(<DashboardTabs activeTab="projects" onTabChange={mockOnTabChange} />)
      
      activeTab = screen.getByRole('button', { name: /任务/ })
      expect(activeTab).toHaveClass('bg-gradient-to-r')
    })

    it('applies correct non-active tab styling', () => {
      render(<DashboardTabs activeTab="overview" onTabChange={mockOnTabChange} />)
      
      const projectsTab = screen.getByRole('button', { name: /任务/ })
      expect(projectsTab).toHaveClass('bg-white')
    })

    it('has centered tabs', () => {
      const { container } = render(
        <DashboardTabs activeTab="overview" onTabChange={mockOnTabChange} />
      )
      
      const tabsContainer = container.querySelector('.justify-center')
      expect(tabsContainer).toBeInTheDocument()
    })
  })

  describe('StatsCards', () => {
    it('renders all four stat cards', () => {
      render(
        <StatsCards
          totalMembers={11}
          overallProgress={80}
          completedTasks={24}
          activityCount={15}
        />
      )
      
      expect(screen.getByText('11')).toBeInTheDocument()
      expect(screen.getByText('80%')).toBeInTheDocument()
      expect(screen.getByText('24')).toBeInTheDocument()
      expect(screen.getByText('15')).toBeInTheDocument()
    })

    it('renders correct labels', () => {
      render(
        <StatsCards
          totalMembers={11}
          overallProgress={80}
          completedTasks={24}
          activityCount={15}
        />
      )
      
      expect(screen.getByText('AI 成员')).toBeInTheDocument()
      expect(screen.getByText('任务完成率')).toBeInTheDocument()
      expect(screen.getByText('已完成任务')).toBeInTheDocument()
      expect(screen.getByText('近期活动')).toBeInTheDocument()
    })

    it('applies correct color classes', () => {
      const { container } = render(
        <StatsCards
          totalMembers={11}
          overallProgress={80}
          completedTasks={24}
          activityCount={15}
        />
      )
      
      expect(container.querySelector('.text-cyan-600')).toBeInTheDocument()
      expect(container.querySelector('.text-purple-600')).toBeInTheDocument()
      expect(container.querySelector('.text-green-600')).toBeInTheDocument()
      expect(container.querySelector('.text-pink-600')).toBeInTheDocument()
    })

    it('has responsive grid layout', () => {
      const { container } = render(
        <StatsCards
          totalMembers={11}
          overallProgress={80}
          completedTasks={24}
          activityCount={15}
        />
      )
      
      const grid = container.querySelector('.grid-cols-2')
      expect(grid).toBeInTheDocument()
      expect(grid).toHaveClass('md:grid-cols-4')
    })

    it('renders cards with shadow', () => {
      const { container } = render(
        <StatsCards
          totalMembers={11}
          overallProgress={80}
          completedTasks={24}
          activityCount={15}
        />
      )
      
      const cards = container.querySelectorAll('.shadow-lg')
      expect(cards).toHaveLength(4)
    })
  })

  describe('DashboardHeader', () => {
    it('renders header title', () => {
      render(<DashboardHeader />)
      
      expect(screen.getByText('实时看板')).toBeInTheDocument()
    })

    it('renders header description', () => {
      render(<DashboardHeader />)
      
      expect(screen.getByText('AI 团队工作状态实时监控')).toBeInTheDocument()
    })

    it('renders header emoji', () => {
      render(<DashboardHeader />)
      
      expect(screen.getByText('📊')).toBeInTheDocument()
    })

    it('applies correct title styling', () => {
      const { container } = render(<DashboardHeader />)
      
      const title = container.querySelector('h2')
      expect(title).toHaveClass('text-3xl')
      expect(title).toHaveClass('font-bold')
    })
  })

  describe('ActivityItem', () => {
    const mockActivity = {
      id: '1',
      type: 'commit' as const,
      message: '添加 AI 聊天组件',
      user: 'Executor',
      time: '5 分钟前',
      emoji: '💻',
    }

    it('renders activity message', () => {
      render(<ActivityItem activity={mockActivity} index={0} />)
      
      expect(screen.getByText('添加 AI 聊天组件')).toBeInTheDocument()
    })

    it('renders activity user', () => {
      render(<ActivityItem activity={mockActivity} index={0} />)
      
      expect(screen.getByText('Executor')).toBeInTheDocument()
    })

    it('renders activity time', () => {
      render(<ActivityItem activity={mockActivity} index={0} />)
      
      expect(screen.getByText('5 分钟前')).toBeInTheDocument()
    })

    it('renders activity emoji', () => {
      render(<ActivityItem activity={mockActivity} index={0} />)
      
      expect(screen.getByText('💻')).toBeInTheDocument()
    })

    it('renders different activity types', () => {
      const deployActivity = {
        ...mockActivity,
        type: 'deploy' as const,
        emoji: '🚀',
      }
      
      render(<ActivityItem activity={deployActivity} index={0} />)
      
      expect(screen.getByText('🚀')).toBeInTheDocument()
    })
  })
})