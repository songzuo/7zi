/**
 * Dashboard Component Tests
 * 数据可视化仪表板组件测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Dashboard } from '../components/Dashboard';
import * as dashboardApi from '../services/dashboard-api';

// Mock the dashboard API
vi.mock('../services/dashboard-api', async () => {
  const actual = await vi.importActual('../services/dashboard-api');
  return {
    ...actual,
    dashboardApi: {
      getWorkflowStats: vi.fn(),
      getUserActivityStats: vi.fn(),
      getPerformanceStats: vi.fn(),
      getSystemStats: vi.fn(),
      getAggregatedMetrics: vi.fn(),
    },
  };
});

describe('Dashboard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should render dashboard header', () => {
    render(<Dashboard />);

    expect(screen.getByText('默认仪表板')).toBeInTheDocument();
  });

  it('should render stat cards', async () => {
    // Mock at least one API call so the test doesn't timeout
    vi.mocked(dashboardApi.dashboardApi.getWorkflowStats).mockResolvedValue({
      total: 100,
      success: 90,
      failed: 10,
      avgDuration: 5,
      successRate: 90,
    });

    vi.mocked(dashboardApi.dashboardApi.getUserActivityStats).mockResolvedValue({
      activeUsers: 50,
      newUsers: 10,
      sessions: 200,
      peakActiveUsers: 80,
    });

    vi.mocked(dashboardApi.dashboardApi.getPerformanceStats).mockResolvedValue({
      responseTime: 100,
      throughput: 80,
      errorRate: 1.5,
      p50: 80,
      p90: 150,
      p99: 300,
    });

    vi.mocked(dashboardApi.dashboardApi.getSystemStats).mockResolvedValue({
      cpu: 45,
      memory: 60,
      disk: 70,
      networkIn: 1000000,
      networkOut: 800000,
    });

    render(<Dashboard />);

    // Check for stat card titles - need to wait for async data loading
    await waitFor(() => {
      expect(screen.getByText(/工作流执行总数/i)).toBeInTheDocument();
    })
    expect(screen.getByText(/成功执行数/i)).toBeInTheDocument();
    expect(screen.getByText(/失败执行数/i)).toBeInTheDocument();
    expect(screen.getByText(/活跃用户数/i)).toBeInTheDocument();
  });

  it('should render charts', async () => {
    // Mock API responses
    vi.mocked(dashboardApi.dashboardApi.getWorkflowStats).mockResolvedValue({
      total: 1000,
      success: 950,
      failed: 50,
      avgDuration: 5.5,
      successRate: 95,
    });

    vi.mocked(dashboardApi.dashboardApi.getUserActivityStats).mockResolvedValue({
      activeUsers: 100,
      newUsers: 20,
      sessions: 500,
      peakActiveUsers: 150,
    });

    vi.mocked(dashboardApi.dashboardApi.getPerformanceStats).mockResolvedValue({
      responseTime: 100,
      throughput: 80,
      errorRate: 1.5,
      p50: 80,
      p90: 150,
      p99: 300,
    });

    vi.mocked(dashboardApi.dashboardApi.getSystemStats).mockResolvedValue({
      cpu: 45,
      memory: 60,
      disk: 70,
      networkIn: 1000000,
      networkOut: 800000,
    });

    vi.mocked(dashboardApi.dashboardApi.getAggregatedMetrics).mockResolvedValue([]);

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText(/CPU 使用率/i)).toBeInTheDocument();
      expect(screen.getByText(/内存使用率/i)).toBeInTheDocument();
      expect(screen.getByText(/响应时间/i)).toBeInTheDocument();
      expect(screen.getByText(/吞吐量/i)).toBeInTheDocument();
    });
  });

  it('should display loading state', () => {
    // Mock API to never resolve
    vi.mocked(dashboardApi.dashboardApi.getWorkflowStats).mockReturnValue(
      new Promise(() => {})
    );

    render(<Dashboard />);

    // Loading spinners should be present
    const loadingSpinners = document.querySelectorAll('.animate-spin');
    expect(loadingSpinners.length).toBeGreaterThan(0);
  });

  it('should display error message on API failure', async () => {
    // Mock API to reject
    vi.mocked(dashboardApi.dashboardApi.getWorkflowStats).mockRejectedValue(
      new Error('API Error')
    );

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText(/加载数据失败/i)).toBeInTheDocument();
    });
  });

  it('should render time range selector', () => {
    render(<Dashboard />);

    const selector = screen.getByRole('button', { name: /选择时间范围/i });
    expect(selector).toBeInTheDocument();
  });

  it('should update data when time range changes', async () => {
    const mockGetWorkflowStats = vi.mocked(dashboardApi.dashboardApi.getWorkflowStats);
    mockGetWorkflowStats.mockResolvedValue({
      total: 1000,
      success: 950,
      failed: 50,
      avgDuration: 5.5,
      successRate: 95,
    });

    vi.mocked(dashboardApi.dashboardApi.getUserActivityStats).mockResolvedValue({
      activeUsers: 100,
      newUsers: 20,
      sessions: 500,
      peakActiveUsers: 150,
    });

    vi.mocked(dashboardApi.dashboardApi.getPerformanceStats).mockResolvedValue({
      responseTime: 100,
      throughput: 80,
      errorRate: 1.5,
      p50: 80,
      p90: 150,
      p99: 300,
    });

    vi.mocked(dashboardApi.dashboardApi.getSystemStats).mockResolvedValue({
      cpu: 45,
      memory: 60,
      disk: 70,
      networkIn: 1000000,
      networkOut: 800000,
    });

    vi.mocked(dashboardApi.dashboardApi.getAggregatedMetrics).mockResolvedValue([]);

    render(<Dashboard />);

    // Wait for initial load
    await waitFor(() => {
      expect(mockGetWorkflowStats).toHaveBeenCalledWith('24h');
    });

    // Change time range
    const selector = screen.getByRole('button', { name: /选择时间范围/i });
    selector.click();

    // Click on 7 days option
    const sevenDaysOption = await screen.findByText('7天');
    sevenDaysOption.click();

    // Check if API was called with new time range
    await waitFor(() => {
      expect(mockGetWorkflowStats).toHaveBeenCalledWith('7d');
    });
  });
});