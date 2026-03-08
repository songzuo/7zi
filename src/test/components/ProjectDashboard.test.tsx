import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ProjectDashboard } from '@/components/ProjectDashboard'

// Mock useDashboard hook
vi.mock('@/hooks/useDashboard', () => ({
  useDashboard: () => ({
    tasks: [],
    members: [],
    dashboardStats: { totalMembers: 0, working: 0, busy: 0, idle: 0, offline: 0 },
    projects: [],
    activities: [],
    stats: { total: 0, completed: 0, inProgress: 0, todo: 0 },
    getTaskAssigneeName: () => '',
  }),
}))

// Mock dashboard components
vi.mock('@/components/dashboard', () => ({
  DashboardTabs: ({ activeTab, onTabChange }: { activeTab: string; onTabChange: (tab: string) => void }) => (
    <div data-testid="dashboard-tabs">
      <button onClick={() => onTabChange('overview')}>Overview</button>
      <button onClick={() => onTabChange('projects')}>Projects</button>
      <button onClick={() => onTabChange('activity')}>Activity</button>
    </div>
  ),
  DashboardHeader: () => <div data-testid="dashboard-header">Dashboard Header</div>,
  OverviewTab: () => <div data-testid="overview-tab">Overview</div>,
  ProjectsTab: () => <div data-testid="projects-tab">Projects</div>,
  ActivityTab: () => <div data-testid="activity-tab">Activity</div>,
}))

// Mock LoadingSpinner
vi.mock('@/components/LoadingSpinner', () => ({
  LoadingSpinner: () => <div data-testid="loading-spinner">Loading...</div>,
}))

describe('ProjectDashboard', () => {
  it('renders without crashing', () => {
    const { container } = render(<ProjectDashboard />)
    expect(container).toBeInTheDocument()
  })

  it('renders dashboard header', () => {
    render(<ProjectDashboard />)
    expect(screen.getByTestId('dashboard-header')).toBeInTheDocument()
  })

  it('renders dashboard tabs', () => {
    render(<ProjectDashboard />)
    expect(screen.getByTestId('dashboard-tabs')).toBeInTheDocument()
  })

  it('renders overview tab by default', () => {
    render(<ProjectDashboard />)
    expect(screen.getByTestId('overview-tab')).toBeInTheDocument()
  })
})
