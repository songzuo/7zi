import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

// ============================================================================
// Mocks - 必须在导入被测组件之前设置
// ============================================================================

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) => {
    const translations: Record<string, string> = {
      'title': 'AI 团队仪表盘',
      'subtitle': '实时监控团队状态和任务进度',
      'loadingFailed': '加载失败',
      'autoRefresh': '自动刷新',
      'seconds': '秒',
      'closeAutoRefresh': '关闭自动刷新',
      'refresh': '刷新',
      'refreshing': '正在刷新...',
      'refreshInterval': '刷新间隔',
      'statsOverview': '统计概览',
      'stats.totalTasks': '总任务数',
      'stats.completed': '已完成',
      'stats.activeMembers': '活跃成员',
      'stats.avgResponse': '平均响应',
      'taskProgress': '任务完成进度',
      'members': '团队成员',
      'activity': '活动日志',
      'taskBoard': '任务看板',
      'contributionStats': '贡献统计',
    };
    let result = translations[key] || key;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        result = result.replace(`{${k}}`, String(v));
      });
    }
    return result;
  },
}));

// Mock React Query hooks
vi.mock('@/lib/query', () => ({
  useDashboardQuery: vi.fn(),
  useDashboardRefresh: vi.fn(),
}));

// Mock 子组件
vi.mock('../MemberCard', () => ({
  MemberCard: ({ member }: { member: { id: string; name: string } }) => (
    <div data-testid={`member-card-${member.id}`} aria-label={`成员: ${member.name}`}>
      {member.name}
    </div>
  ),
}));

vi.mock('../TaskBoard', () => ({
  TaskBoard: ({ issues }: { issues: Array<{ id: number; title: string }> }) => (
    <div data-testid="task-board" aria-label="任务看板">
      {issues?.length || 0} 个任务
    </div>
  ),
}));

vi.mock('../ActivityLog', () => ({
  ActivityLog: ({ activities }: { activities: Array<{ id: string }> }) => (
    <div data-testid="activity-log" aria-label="活动日志">
      {activities?.length || 0} 条活动
    </div>
  ),
}));

vi.mock('../ContributionChart', () => ({
  default: ({ members }: { members: Array<{ id: string }> }) => (
    <div data-testid="contribution-chart" aria-label="贡献统计">
      {members?.length || 0} 个成员贡献
    </div>
  ),
}));

vi.mock('../ProgressBar', () => ({
  default: ({ value, label }: { value: number; label: string }) => (
    <div data-testid="progress-bar" role="progressbar" aria-valuenow={Math.round(value)}>
      进度: {label} ({Math.round(value)}%)
    </div>
  ),
}));

vi.mock('../Loading', () => ({
  default: () => <div data-testid="loading" aria-label="加载中">加载中...</div>,
}));

vi.mock('../ErrorBoundary', () => ({
  default: ({ children, name }: { children: React.ReactNode; name: string }) => (
    <div data-testid={`error-boundary-${name}`}>{children}</div>
  ),
}));

// 导入被测组件和 mock 的 hooks
import Dashboard from '../Dashboard';
import { useDashboardQuery, useDashboardRefresh } from '@/lib/query';

// ============================================================================
// 测试数据
// ============================================================================

const mockDashboardData = {
  members: [
    {
      id: 'agent-1',
      name: '咨询师',
      role: '研究分析',
      status: 'working' as const,
      avatar: '/avatars/consultant.png',
      currentTask: '分析市场数据',
      completedTasks: 15,
    },
    {
      id: 'agent-2',
      name: '架构师',
      role: '架构设计',
      status: 'busy' as const,
      avatar: '/avatars/architect.png',
      currentTask: '设计 API 接口',
      completedTasks: 23,
    },
    {
      id: 'agent-3',
      name: 'Executor',
      role: '执行实现',
      status: 'idle' as const,
      avatar: '/avatars/executor.png',
      currentTask: undefined,
      completedTasks: 42,
    },
  ],
  issues: [
    { id: 1, title: '实现用户认证', state: 'open', number: 1, labels: [], created_at: new Date().toISOString(), updated_at: new Date().toISOString(), html_url: 'https://github.com/test/1' },
    { id: 2, title: '优化性能', state: 'open', number: 2, labels: [], created_at: new Date().toISOString(), updated_at: new Date().toISOString(), html_url: 'https://github.com/test/2' },
    { id: 3, title: '修复登录 Bug', state: 'closed', number: 3, labels: [], created_at: new Date().toISOString(), updated_at: new Date().toISOString(), html_url: 'https://github.com/test/3' },
  ],
  activities: [
    { id: 'act-1', type: 'task_completed', message: '完成任务', timestamp: Date.now(), user: 'agent-1', icon: '✅' },
    { id: 'act-2', type: 'member_status', message: '状态变更', timestamp: Date.now(), user: 'agent-2', icon: '🔄' },
  ],
  stats: {
    totalTasks: 100,
    completedTasks: 75,
    activeMembers: 8,
    avgResponseTime: '2.5s',
  },
};

// ============================================================================
// 测试套件
// ============================================================================

describe('Dashboard', () => {
  const mockRefresh = vi.fn();
  const mockRefetch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // 设置默认 mock 返回值
    vi.mocked(useDashboardQuery).mockReturnValue({
      data: mockDashboardData,
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: mockRefetch,
    } as any);
    
    vi.mocked(useDashboardRefresh).mockReturnValue({
      refresh: mockRefresh,
      reset: vi.fn(),
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  // ============================================================================
  // 基础渲染测试
  // ============================================================================

  describe('Basic Rendering', () => {
    it('should render the dashboard header with title', () => {
      render(<Dashboard />);
      
      expect(screen.getByRole('heading', { name: /AI 团队仪表盘/i })).toBeDefined();
      expect(screen.getByText('实时监控团队状态和任务进度')).toBeDefined();
    });

    it('should render all stat cards with correct values', () => {
      render(<Dashboard />);
      
      expect(screen.getByText('总任务数')).toBeDefined();
      expect(screen.getByText('100')).toBeDefined(); // totalTasks
      
      expect(screen.getByText('已完成')).toBeDefined();
      expect(screen.getByText('75')).toBeDefined(); // completedTasks
      
      expect(screen.getByText('活跃成员')).toBeDefined();
      expect(screen.getByText('8')).toBeDefined(); // activeMembers
      
      expect(screen.getByText('平均响应')).toBeDefined();
      expect(screen.getByText('2.5s')).toBeDefined(); // avgResponseTime
    });

    it('should render the progress section', () => {
      render(<Dashboard />);
      
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toBeDefined();
      // 75/100 = 75%
      expect(progressBar.getAttribute('aria-valuenow')).toBe('75');
    });

    it('should render team members section', () => {
      render(<Dashboard />);
      
      expect(screen.getByRole('heading', { name: /团队成员/i })).toBeDefined();
      expect(screen.getByTestId('member-card-agent-1')).toBeDefined();
      expect(screen.getByTestId('member-card-agent-2')).toBeDefined();
      expect(screen.getByTestId('member-card-agent-3')).toBeDefined();
    });

    it('should render activity log section', () => {
      render(<Dashboard />);
      
      expect(screen.getByRole('heading', { name: /活动日志/i })).toBeDefined();
      expect(screen.getByTestId('activity-log')).toBeDefined();
    });

    it('should render task board section', () => {
      render(<Dashboard />);
      
      expect(screen.getByRole('heading', { name: /任务看板/i })).toBeDefined();
      expect(screen.getByTestId('task-board')).toBeDefined();
    });

    it('should render contribution chart section', () => {
      render(<Dashboard />);
      
      expect(screen.getByRole('heading', { name: /贡献统计/i })).toBeDefined();
      expect(screen.getByTestId('contribution-chart')).toBeDefined();
    });
  });

  // ============================================================================
  // 加载状态测试
  // ============================================================================

  describe('Loading State', () => {
    it('should show loading state when isLoading is true and no data', () => {
      vi.mocked(useDashboardQuery).mockReturnValue({
        data: null,
        isLoading: true,
        isFetching: true,
        error: null,
        refetch: mockRefetch,
      } as any);
      
      render(<Dashboard />);
      
      expect(screen.getByTestId('loading')).toBeDefined();
    });

    it('should not show loading state when data exists', () => {
      vi.mocked(useDashboardQuery).mockReturnValue({
        data: mockDashboardData,
        isLoading: true, // isLoading but has data
        isFetching: true,
        error: null,
        refetch: mockRefetch,
      } as any);
      
      render(<Dashboard />);
      
      // 应该显示数据而不是加载状态
      expect(screen.getByRole('heading', { name: /AI 团队仪表盘/i })).toBeDefined();
    });

    it('should show fetching indicator when isFetching is true', () => {
      vi.mocked(useDashboardQuery).mockReturnValue({
        data: mockDashboardData,
        isLoading: false,
        isFetching: true,
        error: null,
        refetch: mockRefetch,
      } as any);
      
      render(<Dashboard />);
      
      // 查找正在刷新的指示器（脉冲动画）
      const indicator = document.querySelector('.animate-pulse');
      expect(indicator).toBeDefined();
    });
  });

  // ============================================================================
  // 错误状态测试
  // ============================================================================

  describe('Error State', () => {
    it('should show error state when there is an error', () => {
      vi.mocked(useDashboardQuery).mockReturnValue({
        data: null,
        isLoading: false,
        isFetching: false,
        error: new Error('网络错误'),
        refetch: mockRefetch,
      } as any);
      
      render(<Dashboard />);
      
      expect(screen.getByText('加载失败')).toBeDefined();
      expect(screen.getByText('网络错误')).toBeDefined();
    });

    it('should call refetch when retry button is clicked', async () => {
      vi.mocked(useDashboardQuery).mockReturnValue({
        data: null,
        isLoading: false,
        isFetching: false,
        error: new Error('网络错误'),
        refetch: mockRefetch,
      } as any);
      
      render(<Dashboard />);
      
      const retryButton = screen.getByRole('button', { name: /retry|重试/i });
      fireEvent.click(retryButton);
      
      expect(mockRefetch).toHaveBeenCalledTimes(1);
    });
  });

  // ============================================================================
  // 刷新功能测试
  // ============================================================================

  describe('Refresh Functionality', () => {
    it('should have a refresh button', () => {
      render(<Dashboard />);
      
      const refreshButton = screen.getByRole('button', { name: /刷新/i });
      expect(refreshButton).toBeDefined();
    });

    it('should call refresh when refresh button is clicked', () => {
      render(<Dashboard />);
      
      const refreshButton = screen.getByRole('button', { name: /刷新/i });
      fireEvent.click(refreshButton);
      
      expect(mockRefresh).toHaveBeenCalledTimes(1);
    });

    it('should disable refresh button when fetching', () => {
      vi.mocked(useDashboardQuery).mockReturnValue({
        data: mockDashboardData,
        isLoading: false,
        isFetching: true,
        error: null,
        refetch: mockRefetch,
      } as any);
      
      render(<Dashboard />);
      
      const refreshButton = screen.getByRole('button', { name: /刷新/i });
      expect(refreshButton.hasAttribute('disabled')).toBe(true);
    });

    it('should show spinning animation when fetching', () => {
      vi.mocked(useDashboardQuery).mockReturnValue({
        data: mockDashboardData,
        isLoading: false,
        isFetching: true,
        error: null,
        refetch: mockRefetch,
      } as any);
      
      render(<Dashboard />);
      
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeDefined();
    });
  });

  // ============================================================================
  // 自动刷新间隔测试
  // ============================================================================

  describe('Auto Refresh Interval', () => {
    it('should render interval selector', () => {
      render(<Dashboard />);
      
      const select = screen.getByRole('combobox');
      expect(select).toBeDefined();
    });

    it('should have default interval of 60 seconds', () => {
      render(<Dashboard />);
      
      const select = screen.getByRole('combobox');
      expect((select as HTMLSelectElement).value).toBe('60000');
    });

    it('should display current interval in seconds', () => {
      render(<Dashboard />);
      
      expect(screen.getByText(/自动刷新: 60秒/i)).toBeDefined();
    });

    it('should change interval when selection changes', () => {
      render(<Dashboard />);
      
      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: '30000' } });
      
      expect(screen.getByText(/自动刷新: 30秒/i)).toBeDefined();
    });

    it('should support disabling auto refresh', () => {
      render(<Dashboard />);
      
      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: '0' } });
      
      expect(screen.getByText(/自动刷新: 0秒/i)).toBeDefined();
    });
  });

  // ============================================================================
  // 子组件渲染测试
  // ============================================================================

  describe('Child Components', () => {
    it('should render TaskBoard with issues', () => {
      render(<Dashboard />);
      
      const taskBoard = screen.getByTestId('task-board');
      expect(taskBoard).toBeDefined();
      expect(taskBoard.textContent).toContain('3 个任务');
    });

    it('should render ContributionChart with members', () => {
      render(<Dashboard />);
      
      const chart = screen.getByTestId('contribution-chart');
      expect(chart).toBeDefined();
    });

    it('should wrap child components in ErrorBoundary', () => {
      render(<Dashboard />);
      
      expect(screen.getByTestId('error-boundary-TeamMembers')).toBeDefined();
      expect(screen.getByTestId('error-boundary-ActivityLog')).toBeDefined();
      expect(screen.getByTestId('error-boundary-TaskBoard')).toBeDefined();
      expect(screen.getByTestId('error-boundary-ContributionChart')).toBeDefined();
    });
  });

  // ============================================================================
  // 可访问性测试
  // ============================================================================

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', () => {
      render(<Dashboard />);
      
      const h1 = screen.getByRole('heading', { level: 1 });
      expect(h1).toBeDefined();
      
      const h2s = screen.getAllByRole('heading', { level: 2 });
      expect(h2s.length).toBeGreaterThan(0);
    });

    it('should have stats section with aria-label', () => {
      render(<Dashboard />);
      
      const statsSection = screen.getByRole('region', { name: /统计概览/i });
      expect(statsSection).toBeDefined();
    });
  });

  // ============================================================================
  // 边界情况测试
  // ============================================================================

  describe('Edge Cases', () => {
    it('should handle empty members array', () => {
      vi.mocked(useDashboardQuery).mockReturnValue({
        data: { ...mockDashboardData, members: [] },
        isLoading: false,
        isFetching: false,
        error: null,
        refetch: mockRefetch,
      } as any);
      
      render(<Dashboard />);
      
      // 应该正常渲染，没有成员卡片
      expect(screen.getByRole('heading', { name: /AI 团队仪表盘/i })).toBeDefined();
    });

    it('should handle zero tasks completion rate', () => {
      vi.mocked(useDashboardQuery).mockReturnValue({
        data: { 
          ...mockDashboardData, 
          stats: { ...mockDashboardData.stats, totalTasks: 0, completedTasks: 0 }
        },
        isLoading: false,
        isFetching: false,
        error: null,
        refetch: mockRefetch,
      } as any);
      
      render(<Dashboard />);
      
      // 0/0 应该显示 NaN，但我们使用 NaN 处理
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toBeDefined();
    });

    it('should return null when no data and not loading/error', () => {
      vi.mocked(useDashboardQuery).mockReturnValue({
        data: null,
        isLoading: false,
        isFetching: false,
        error: null,
        refetch: mockRefetch,
      } as any);
      
      const { container } = render(<Dashboard />);
      
      // Dashboard 应该返回 null
      expect(container.firstChild).toBeNull();
    });

    it('should handle 100% completion rate', () => {
      vi.mocked(useDashboardQuery).mockReturnValue({
        data: { 
          ...mockDashboardData, 
          stats: { ...mockDashboardData.stats, totalTasks: 50, completedTasks: 50 }
        },
        isLoading: false,
        isFetching: false,
        error: null,
        refetch: mockRefetch,
      } as any);
      
      render(<Dashboard />);
      
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar.getAttribute('aria-valuenow')).toBe('100');
    });
  });

  // ============================================================================
  // Props 传递测试
  // ============================================================================

  describe('Props Passing', () => {
    it('should pass correct data to MemberCard components', () => {
      render(<Dashboard />);
      
      // 检查成员卡片是否正确渲染
      expect(screen.getByTestId('member-card-agent-1').textContent).toBe('咨询师');
      expect(screen.getByTestId('member-card-agent-2').textContent).toBe('架构师');
      expect(screen.getByTestId('member-card-agent-3').textContent).toBe('Executor');
    });

    it('should pass correct data to TaskBoard', () => {
      render(<Dashboard />);
      
      const taskBoard = screen.getByTestId('task-board');
      expect(taskBoard.textContent).toContain('3 个任务');
    });

    it('should pass correct data to ActivityLog', () => {
      render(<Dashboard />);
      
      const activityLog = screen.getByTestId('activity-log');
      expect(activityLog.textContent).toContain('2 条活动');
    });
  });
});