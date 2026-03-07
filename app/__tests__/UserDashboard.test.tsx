/**
 * 用户仪表板页面测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import UserDashboardPage from '@/app/users/[userId]/dashboard/page';

// Mock React Query
vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({
    data: null,
    isLoading: true,
    isFetching: false,
    error: null,
    refetch: vi.fn(),
  })),
}));

// Mock fetch
global.fetch = vi.fn();

describe('UserDashboardPage', () => {
  const mockDashboardData = {
    stats: {
      totalTasks: 156,
      completedTasks: 98,
      inProgressTasks: 42,
      overdueTasks: 3,
      contributionScore: 2450,
      ranking: 3,
      totalMembers: 11,
      streak: 7,
      achievements: 4,
    },
    taskTrend: [
      { date: '2024-01-01', completed: 5, created: 3 },
      { date: '2024-01-02', completed: 8, created: 2 },
    ],
    activities: [
      {
        id: '1',
        type: 'task_complete' as const,
        title: '完成了任务',
        timestamp: new Date().toISOString(),
      },
    ],
    achievements: [
      {
        id: 'first_task',
        name: '初出茅庐',
        description: '完成第一个任务',
        icon: '🌟',
        progress: 1,
        total: 1,
      },
    ],
    recentTasks: [
      {
        id: 'task-1',
        title: '测试任务',
        status: 'in_progress' as const,
        priority: 'high' as const,
        labels: ['test'],
      },
    ],
    lastUpdated: new Date().toISOString(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show loading state initially', () => {
    render(<UserDashboardPage params={Promise.resolve({ userId: 'test-user' })} />);
    // 加载骨架屏应该显示
    expect(screen.getByText(/加载/i) || document.querySelector('.animate-pulse')).toBeTruthy();
  });

  it('should render dashboard after loading', async () => {
    const { useQuery } = await import('@tanstack/react-query');
    vi.mocked(useQuery).mockReturnValue({
      data: mockDashboardData,
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    render(<UserDashboardPage params={Promise.resolve({ userId: 'test-user' })} />);

    await waitFor(() => {
      expect(screen.getByText('📊 我的仪表板')).toBeTruthy();
    });
  });

  it('should show error state on fetch failure', async () => {
    const { useQuery } = await import('@tanstack/react-query');
    vi.mocked(useQuery).mockReturnValue({
      data: null,
      isLoading: false,
      isFetching: false,
      error: new Error('Failed to fetch'),
      refetch: vi.fn(),
    } as any);

    render(<UserDashboardPage params={Promise.resolve({ userId: 'test-user' })} />);

    await waitFor(() => {
      expect(screen.getByText('加载失败')).toBeTruthy();
    });
  });

  it('should have refresh button', async () => {
    const { useQuery } = await import('@tanstack/react-query');
    const mockRefetch = vi.fn();
    vi.mocked(useQuery).mockReturnValue({
      data: mockDashboardData,
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: mockRefetch,
    } as any);

    render(<UserDashboardPage params={Promise.resolve({ userId: 'test-user' })} />);

    await waitFor(() => {
      const refreshBtn = screen.getByText('刷新');
      expect(refreshBtn).toBeTruthy();
    });
  });
});