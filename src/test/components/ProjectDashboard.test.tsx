import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ProjectDashboard } from '@/components/ProjectDashboard'

describe('ProjectDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders dashboard header', () => {
    render(<ProjectDashboard />)
    
    expect(screen.getByText(/项目进度看板/)).toBeInTheDocument()
    expect(screen.getByText('实时追踪所有项目的进展和团队活动')).toBeInTheDocument()
  })

  it('renders all three tabs', () => {
    render(<ProjectDashboard />)
    
    expect(screen.getByText('总览')).toBeInTheDocument()
    expect(screen.getByText('项目')).toBeInTheDocument()
    expect(screen.getByText('动态')).toBeInTheDocument()
  })

  it('shows overview tab by default', () => {
    render(<ProjectDashboard />)
    
    expect(screen.getByText('项目进度概览')).toBeInTheDocument()
  })

  it('switches to projects tab when clicked', async () => {
    render(<ProjectDashboard />)
    
    // Find buttons by their text content
    const buttons = screen.getAllByRole('button')
    const projectsTab = buttons.find(btn => btn.textContent?.includes('项目'))
    
    fireEvent.click(projectsTab!)
    
    await waitFor(() => {
      expect(screen.getByText('7zi.com 官网重构')).toBeInTheDocument()
      expect(screen.getByText('AI 聊天系统集成')).toBeInTheDocument()
    })
  })

  it('switches to activity tab when clicked', async () => {
    render(<ProjectDashboard />)
    
    const buttons = screen.getAllByRole('button')
    const activityTab = buttons.find(btn => btn.textContent?.includes('动态'))
    
    fireEvent.click(activityTab!)
    
    await waitFor(() => {
      expect(screen.getByText('团队活动日志')).toBeInTheDocument()
    })
  })

  it('displays correct project count in overview', () => {
    render(<ProjectDashboard />)
    
    // 4 mock projects
    expect(screen.getByText('4')).toBeInTheDocument()
    expect(screen.getByText('进行中项目')).toBeInTheDocument()
  })

  it('displays completed tasks count', () => {
    render(<ProjectDashboard />)
    
    // Total completed: 15 + 9 + 15 + 11 = 50
    expect(screen.getByText('50')).toBeInTheDocument()
    expect(screen.getByText('完成任务')).toBeInTheDocument()
  })

  it('displays activity count', () => {
    render(<ProjectDashboard />)
    
    // 7 mock activities
    expect(screen.getByText('7')).toBeInTheDocument()
    expect(screen.getByText('今日活动')).toBeInTheDocument()
  })

  it('calculates overall progress correctly', () => {
    render(<ProjectDashboard />)
    
    // Total: 20+10+15+25=70, Completed: 15+9+15+11=50
    // Progress: 50/70 = 71.4... ≈ 71%
    expect(screen.getByText('71%')).toBeInTheDocument()
  })

  it('displays project names in overview progress section', () => {
    render(<ProjectDashboard />)
    
    expect(screen.getByText('7zi.com 官网重构')).toBeInTheDocument()
    expect(screen.getByText('AI 聊天系统集成')).toBeInTheDocument()
    expect(screen.getByText('品牌视觉升级')).toBeInTheDocument()
    expect(screen.getByText('SEO 优化项目')).toBeInTheDocument()
  })

  it('shows project progress percentages', () => {
    render(<ProjectDashboard />)
    
    const progressValues = screen.getAllByText('75%')
    expect(progressValues.length).toBeGreaterThan(0)
    expect(screen.getByText('90%')).toBeInTheDocument()
    expect(screen.getByText('100%')).toBeInTheDocument()
    expect(screen.getByText('45%')).toBeInTheDocument()
  })

  it('displays project status badges in projects tab', async () => {
    render(<ProjectDashboard />)
    
    const buttons = screen.getAllByRole('button')
    const projectsTab = buttons.find(btn => btn.textContent?.includes('项目'))
    fireEvent.click(projectsTab!)
    
    await waitFor(() => {
      expect(screen.getAllByText(/进行中/).length).toBeGreaterThan(0)
      expect(screen.getByText(/已完成/)).toBeInTheDocument()
    })
  })

  it('displays activity log entries in activity tab', async () => {
    render(<ProjectDashboard />)
    
    const buttons = screen.getAllByRole('button')
    const activityTab = buttons.find(btn => btn.textContent?.includes('动态'))
    fireEvent.click(activityTab!)
    
    await waitFor(() => {
      expect(screen.getByText('添加 AI 聊天组件')).toBeInTheDocument()
      expect(screen.getByText('部署到生产环境')).toBeInTheDocument()
    })
  })

  it('shows activity users and timestamps', async () => {
    render(<ProjectDashboard />)
    
    const buttons = screen.getAllByRole('button')
    const activityTab = buttons.find(btn => btn.textContent?.includes('动态'))
    fireEvent.click(activityTab!)
    
    await waitFor(() => {
      expect(screen.getByText('Executor')).toBeInTheDocument()
      expect(screen.getByText('系统管理员')).toBeInTheDocument()
    })
  })

  it('applies active tab styling correctly', () => {
    render(<ProjectDashboard />)
    
    const buttons = screen.getAllByRole('button')
    const overviewTab = buttons.find(btn => btn.textContent?.includes('总览'))
    const projectsTab = buttons.find(btn => btn.textContent?.includes('项目'))
    
    // Overview is active by default
    expect(overviewTab!.className).toContain('bg-gradient-to-r')
    
    // Click projects tab
    fireEvent.click(projectsTab!)
    
    // Projects tab now has active styling
    expect(projectsTab!.className).toContain('bg-gradient-to-r')
  })

  it('displays team member avatars in projects tab', async () => {
    render(<ProjectDashboard />)
    
    const buttons = screen.getAllByRole('button')
    const projectsTab = buttons.find(btn => btn.textContent?.includes('项目'))
    fireEvent.click(projectsTab!)
    
    await waitFor(() => {
      // Team members are displayed as avatar initials
      expect(screen.getByTitle('Executor')).toBeInTheDocument()
      expect(screen.getByTitle('设计师')).toBeInTheDocument()
    })
  })
})