import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import Dashboard from '../components/Dashboard';

// Mock @/lib/query hooks - 必须在组件导入之前
vi.mock('@/lib/query', () => ({
  useDashboardQuery: vi.fn(),
  useDashboardRefresh: vi.fn(),
}));

// Mock child components
vi.mock('../components/MemberCard', () => ({
  MemberCard: ({ member }: any) => (
    <div data-testid="member-card">{member.name}</div>
  ),
}));

vi.mock('../components/TaskBoard', () => ({
  TaskBoard: ({ issues }: any) => (
    <div data-testid="task-board">Tasks: {issues?.length || 0}</div>
  ),
}));

vi.mock('../components/ActivityLog', () => ({
  ActivityLog: ({ activities }: any) => (
    <div data-testid="activity-log">Activities: {activities?.length || 0}</div>
  ),
}));

vi.mock('../components/ContributionChart', () => ({
  default: ({ members }: any) => (
    <div data-testid="contribution-chart">Members: {members.length}</div>
  ),
}));

vi.mock('../components/ProgressBar', () => ({
  default: ({ value, showPercentage, label }: any) => (
    <div data-testid="progress-bar">
      {label && <span>{label}</span>}
      {showPercentage && <span>{value.toFixed(1)}%</span>}
    </div>
  ),
}));

vi.mock('../components/Loading', () => ({
  default: () => <div data-testid="loading">加载中...</div>,
}));

vi.mock('../components/ErrorBoundary', () => ({
  default: ({ children }: any) => <div data-testid="error-boundary">{children}</div>,
}));

// Import mocked functions after vi.mock
import { useDashboardQuery, useDashboardRefresh } from '@/lib/query';

const mockRefetch = vi.fn();
const mockRefresh = vi.fn();

describe('Dashboard Component', () => {
  const mockDashboardData = {
    members: [
      {
        id: '1',
        name: 'Test Member',
        role: 'Developer',
        status: 'working' as const,
        completedTasks: 10,
        contributionScore: 100,
      },
      {
        id: '2',
        name: 'Another Member',
        role: 'Designer',
        status: 'idle' as const,
        completedTasks: 5,
        contributionScore: 50,
      },
    ],
    issues: [
      {
        id: 't1',
        title: 'Test Task',
        assignee: 'Test Member',
        status: 'in-progress' as const,
        priority: 'high' as const,
      },
      {
        id: 't2',
        title: 'Done Task',
        assignee: 'Another Member',
        status: 'done' as const,
        priority: 'medium' as const,
      },
    ],
    tasks: [
      {
        id: 't1',
        title: 'Test Task',
        assignee: 'Test Member',
        status: 'in-progress' as const,
        priority: 'high' as const,
      },
      {
        id: 't2',
        title: 'Done Task',
        assignee: 'Another Member',
        status: 'done' as const,
        priority: 'medium' as const,
      },
    ],
    activities: [
      {
        id: 'a1',
        type: 'commit' as const,
        user: 'Test User',
        message: 'Test commit',
        timestamp: new Date().toISOString(),
        icon: '📝',
      },
    ],
    stats: {
      totalTasks: 10,
      completedTasks: 5,
      activeMembers: 3,
      avgResponseTime: '2h',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mock implementations
    (useDashboardRefresh as any).mockReturnValue({
      refresh: mockRefresh,
      reset: vi.fn(),
    });
  });

  it('renders loading state initially', () => {
    (useDashboardQuery as any).mockReturnValue({
      data: null,
      isLoading: true,
      isFetching: false,
      error: null,
      refetch: mockRefetch,
    });

    render(<Dashboard />);
    expect(screen.getByTestId('loading')).toBeTruthy();
  });

  it('renders dashboard after data loads', async () => {
    (useDashboardQuery as any).mockReturnValue({
      data: mockDashboardData,
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: mockRefetch,
    });

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('📊 AI 团队仪表盘')).toBeTruthy();
    });
  });

  it('displays stats cards', async () => {
    (useDashboardQuery as any).mockReturnValue({
      data: mockDashboardData,
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: mockRefetch,
    });

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('总任务数')).toBeTruthy();
      expect(screen.getByText('已完成')).toBeTruthy();
      expect(screen.getByText('活跃成员')).toBeTruthy();
      expect(screen.getByText('平均响应')).toBeTruthy();
    });
  });

  it('displays team members section', async () => {
    (useDashboardQuery as any).mockReturnValue({
      data: mockDashboardData,
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: mockRefetch,
    });

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText(/团队成员/)).toBeTruthy();
    });
  });

  it('displays task board section', async () => {
    (useDashboardQuery as any).mockReturnValue({
      data: mockDashboardData,
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: mockRefetch,
    });

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByTestId('task-board')).toBeTruthy();
    });
  });

  it('displays activity log section', async () => {
    (useDashboardQuery as any).mockReturnValue({
      data: mockDashboardData,
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: mockRefetch,
    });

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByTestId('activity-log')).toBeTruthy();
    });
  });

  it('displays contribution chart section', async () => {
    (useDashboardQuery as any).mockReturnValue({
      data: mockDashboardData,
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: mockRefetch,
    });

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByTestId('contribution-chart')).toBeTruthy();
    });
  });

  it('handles fetch error gracefully', async () => {
    (useDashboardQuery as any).mockReturnValue({
      data: null,
      isLoading: false,
      isFetching: false,
      error: new Error('Network error'),
      refetch: mockRefetch,
    });

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText(/加载失败/)).toBeTruthy();
    });
  });

  it('has refresh button', async () => {
    (useDashboardQuery as any).mockReturnValue({
      data: mockDashboardData,
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: mockRefetch,
    });

    render(<Dashboard />);

    await waitFor(() => {
      const refreshButtons = screen.getAllByRole('button');
      const refreshButton = refreshButtons.find(btn => btn.textContent?.includes('刷新'));
      expect(refreshButton).toBeTruthy();
    });
  });

  it('shows auto-refresh interval', async () => {
    (useDashboardQuery as any).mockReturnValue({
      data: mockDashboardData,
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: mockRefetch,
    });

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText(/自动刷新/)).toBeTruthy();
    });
  });

  it('displays progress bar section', async () => {
    (useDashboardQuery as any).mockReturnValue({
      data: mockDashboardData,
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: mockRefetch,
    });

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('任务完成进度')).toBeTruthy();
    });
  });
});
