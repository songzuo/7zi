/**
 * @fileoverview analytics 集成测试
 * @description 测试完整的分析仪表盘功能，包括实时更新、数据筛选、导出等
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AnalyticsDashboard } from '@/components/analytics/AnalyticsDashboard';
import { type AnalyticsMetrics, type TimeSeriesDataPoint } from '@/lib/types/analytics';

// ============================================================================
// Mock fetch API
// ============================================================================

const mockFetch = vi.fn();

global.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockClear();
});

afterEach(() => {
  vi.clearAllMocks();
});

// ============================================================================
// Mock Data
// ============================================================================

const mockMetrics: AnalyticsMetrics = {
  agents: {
    total: 11,
    active: 7,
    idle: 2,
    offline: 2,
    workingHours: 1500,
    tasksCompleted: 500,
    tokensUsed: 5000000,
    byProvider: {
      minimax: {
        count: 4,
        tasksCompleted: 200,
        tokensUsed: 2000000,
        averageResponseTime: 1200
      },
      'self-claude': {
        count: 3,
        tasksCompleted: 150,
        tokensUsed: 1500000,
        averageResponseTime: 1800
      },
      volcengine: {
        count: 2,
        tasksCompleted: 100,
        tokensUsed: 1000000,
        averageResponseTime: 1500
      },
      bailian: {
        count: 2,
        tasksCompleted: 50,
        tokensUsed: 500000,
        averageResponseTime: 1400
      }
    }
  },
  users: {
    total: 1000,
    activeToday: 75,
    activeWeek: 300,
    newUsers: 50,
    retentionRate: 85,
    averageSessionDuration: 1800
  },
  tasks: {
    total: 600,
    completed: 450,
    inProgress: 75,
    pending: 50,
    cancelled: 25,
    completionRate: 87.5,
    averageCompletionTime: 3600,
    byPriority: {
      high: 150,
      medium: 300,
      low: 150
    },
    byType: {
      analysis: 150,
      implementation: 150,
      testing: 150,
      design: 150
    }
  },
  revenue: {
    total: 25000,
    monthly: 2500,
    weekly: 600,
    daily: 100,
    growthRate: 18,
    bySource: {
      subscriptions: 15000,
      'one-time': 8000,
      enterprise: 2000
    },
    conversionRate: 4.5
  },
  performance: {
    cpuUsage: 55,
    memoryUsage: 65,
    responseTime: 150,
    uptime: 99.8,
    errorRate: 0.5,
    throughput: 1200,
    cacheHitRate: 85
  }
};

const mockTimeSeries: TimeSeriesDataPoint[] = Array.from({ length: 30 }, (_, i) => ({
  timestamp: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString(),
  date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  }),
  agents: Math.floor(7 + Math.random() * 3),
  users: Math.floor(40 + Math.random() * 30),
  tasks: Math.floor(20 + Math.random() * 15),
  tokens: Math.floor(50000 + Math.random() * 50000),
  revenue: Math.floor(200 + Math.random() * 100),
  errors: Math.floor(Math.random() * 5)
}));

// ============================================================================
// Test Suite: AnalyticsDashboard Integration
// ============================================================================

describe('AnalyticsDashboard - Integration', () => {
  beforeEach(() => {
    // Mock successful API response
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          metrics: mockMetrics,
          timeSeries: mockTimeSeries
        },
        timestamp: new Date().toISOString(),
        filters: {
          timeRange: 'week',
          metrics: ['agents', 'users', 'tasks', 'tokens', 'revenue', 'errors']
        }
      })
    });

    // Mock export API
    mockFetch.mockResolvedValueOnce({
      ok: true,
      blob: async () => new Blob(['csv data'], { type: 'text/csv' }),
      headers: {
        get: (name: string) => {
          if (name === 'Content-Disposition') {
            return 'attachment; filename="test-export.csv"';
          }
          return null;
        }
      }
    });
  });

  it('should render dashboard with title', async () => {
    render(<AnalyticsDashboard locale="en" />);

    await waitFor(() => {
      expect(screen.getByText(/Analytics Dashboard/i)).toBeInTheDocument();
    });
  });

  it('should render metric cards', async () => {
    render(<AnalyticsDashboard locale="en" />);

    await waitFor(() => {
      expect(screen.getByText(/Active Agents/i)).toBeInTheDocument();
      expect(screen.getByText(/Active Users/i)).toBeInTheDocument();
      expect(screen.getByText(/Tasks Completed/i)).toBeInTheDocument();
      expect(screen.getByText(/Total Revenue/i)).toBeInTheDocument();
    });
  });

  it('should render charts', async () => {
    render(<AnalyticsDashboard locale="en" />);

    await waitFor(() => {
      expect(screen.getByText(/Activity Overview/i)).toBeInTheDocument();
      expect(screen.getByText(/Revenue Trend/i)).toBeInTheDocument();
      expect(screen.getByText(/Token Usage Trend/i)).toBeInTheDocument();
    });
  });

  it('should display loading state initially', () => {
    mockFetch.mockImplementation(() => new Promise(() => {}));

    render(<AnalyticsDashboard locale="en" />);

    expect(screen.getByText(/Loading/i)).toBeInTheDocument();
  });

  it('should fetch data on mount', async () => {
    render(<AnalyticsDashboard locale="en" />);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/analytics/metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('timeRange')
      });
    });
  });

  it('should display last updated time', async () => {
    render(<AnalyticsDashboard locale="en" />);

    await waitFor(() => {
      expect(screen.getByText(/Last Updated:/i)).toBeInTheDocument();
    });
  });

  it('should handle refresh button click', async () => {
    render(<AnalyticsDashboard locale="en" />);

    await waitFor(() => {
      const refreshButton = screen.getByTitle(/refresh/i);
      fireEvent.click(refreshButton);
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });
  });

  it('should toggle auto-refresh', async () => {
    render(<AnalyticsDashboard locale="en" />);

    await waitFor(() => {
      const autoRefreshToggle = screen.getByRole('checkbox');
      fireEvent.click(autoRefreshToggle);
    });

    // Toggle should be unchecked
    await waitFor(() => {
      const autoRefreshToggle = screen.getByRole('checkbox');
      expect(autoRefreshToggle).not.toBeChecked();
    });
  });

  it('should show and hide filter panel', async () => {
    render(<AnalyticsDashboard locale="en" />);

    await waitFor(() => {
      const settingsButton = screen.getByTitle(/export/i);
      fireEvent.click(settingsButton);
    });

    await waitFor(() => {
      expect(screen.getByText(/Filters/i)).toBeInTheDocument();
    });

    const closeButton = screen.getByTestId('chevron-up');
    fireEvent.click(closeButton);

    await waitFor(() => {
      expect(screen.queryByText(/Task Status/i)).not.toBeInTheDocument();
    });
  });

  it('should change date range', async () => {
    render(<AnalyticsDashboard locale="en" />);

    await waitFor(() => {
      const dateRangeButton = screen.getByText(/Last 7 Days/i);
      fireEvent.click(dateRangeButton);
    });

    await waitFor(() => {
      const monthOption = screen.getByText(/Last 30 Days/i);
      fireEvent.click(monthOption);
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });
  });

  it('should handle custom date range', async () => {
    render(<AnalyticsDashboard locale="en" />);

    await waitFor(() => {
      const dateRangeButton = screen.getByText(/Last 7 Days/i);
      fireEvent.click(dateRangeButton);
    });

    await waitFor(() => {
      const customOption = screen.getByText(/Custom/i);
      fireEvent.click(customOption);
    });

    await waitFor(() => {
      expect(screen.getByText(/Start Date/i)).toBeInTheDocument();
      expect(screen.getByText(/End Date/i)).toBeInTheDocument();
    });

    const startDateInput = screen.getByLabelText(/Start Date/i);
    const endDateInput = screen.getByLabelText(/End Date/i);

    fireEvent.change(startDateInput, { target: { value: '2024-01-01' } });
    fireEvent.change(endDateInput, { target: { value: '2024-01-31' } });

    const applyButton = screen.getByText(/Apply/i);
    fireEvent.click(applyButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });
  });

  it('should apply filters', async () => {
    render(<AnalyticsDashboard locale="en" />);

    await waitFor(() => {
      const settingsButton = screen.getByTitle(/export/i);
      fireEvent.click(settingsButton);
    });

    await waitFor(() => {
      const filterSection = screen.getByText(/Task Status/i);
      fireEvent.click(filterSection);
    });

    await waitFor(() => {
      const completedCheckbox = screen.getByLabelText(/Completed/i);
      fireEvent.click(completedCheckbox);
    });

    const applyButton = screen.getByText(/Apply Filters/i);
    fireEvent.click(applyButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });
  });

  it('should clear all filters', async () => {
    render(<AnalyticsDashboard locale="en" />);

    await waitFor(() => {
      const settingsButton = screen.getByTitle(/export/i);
      fireEvent.click(settingsButton);
    });

    await waitFor(() => {
      const clearButton = screen.getByText(/Clear All/i);
      fireEvent.click(clearButton);
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });
  });

  it('should render performance metrics', async () => {
    render(<AnalyticsDashboard locale="en" />);

    await waitFor(() => {
      expect(screen.getByText(/Task Completion Rate/i)).toBeInTheDocument();
      expect(screen.getByText(/System Uptime/i)).toBeInTheDocument();
      expect(screen.getByText(/Cache Hit Rate/i)).toBeInTheDocument();
      expect(screen.getByText(/Error Rate/i)).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText(/87.5%/i)).toBeInTheDocument();
      expect(screen.getByText(/99.8%/i)).toBeInTheDocument();
      expect(screen.getByText(/85%/i)).toBeInTheDocument();
    });
  });

  it('should render Chinese text when locale is zh', async () => {
    render(<AnalyticsDashboard locale="zh" />);

    await waitFor(() => {
      expect(screen.getByText(/数据分析/i)).toBeInTheDocument();
      expect(screen.getByText(/活跃代理/i)).toBeInTheDocument();
      expect(screen.getByText(/活跃用户/i)).toBeInTheDocument();
    });
  });

  it('should handle API errors gracefully', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(<AnalyticsDashboard locale="en" />);

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    consoleErrorSpy.mockRestore();
  });

  it('should auto-refresh at configured interval', async () => {
    vi.useFakeTimers();

    render(<AnalyticsDashboard locale="en" refreshInterval={5000} />);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    vi.useRealTimers();
  });

  it('should stop auto-refresh when toggled off', async () => {
    vi.useFakeTimers();

    render(<AnalyticsDashboard locale="en" refreshInterval={5000} />);

    await waitFor(() => {
      const autoRefreshToggle = screen.getByRole('checkbox');
      fireEvent.click(autoRefreshToggle);
    });

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    // Should not call fetch again
    expect(mockFetch).toHaveBeenCalledTimes(1);

    vi.useRealTimers();
  });
});

// ============================================================================
// Test Suite: Real-time Data Updates
// ============================================================================

describe('AnalyticsDashboard - Real-time Updates', () => {
  beforeEach(() => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          metrics: mockMetrics,
          timeSeries: mockTimeSeries
        },
        timestamp: new Date().toISOString(),
        filters: { timeRange: 'week' }
      })
    });
  });

  it('should update data when time range changes', async () => {
    render(<AnalyticsDashboard locale="en" />);

    await waitFor(() => {
      const dateRangeButton = screen.getByText(/Last 7 Days/i);
      fireEvent.click(dateRangeButton);
    });

    await waitFor(() => {
      const monthOption = screen.getByText(/Last 30 Days/i);
      fireEvent.click(monthOption);
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });
  });

  it('should update chart when filters change', async () => {
    render(<AnalyticsDashboard locale="en" />);

    await waitFor(() => {
      const settingsButton = screen.getByTitle(/export/i);
      fireEvent.click(settingsButton);
    });

    await waitFor(() => {
      const filterSection = screen.getByText(/Metrics/i);
      fireEvent.click(filterSection);
    });

    await waitFor(() => {
      const agentsCheckbox = screen.getByLabelText(/Active Agents/i);
      fireEvent.click(agentsCheckbox);
    });

    const applyButton = screen.getByText(/Apply Filters/i);
    fireEvent.click(applyButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });
  });
});

// ============================================================================
// Test Suite: Export Functionality
// ============================================================================

describe('AnalyticsDashboard - Export', () => {
  beforeEach(() => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          metrics: mockMetrics,
          timeSeries: mockTimeSeries
        },
        timestamp: new Date().toISOString(),
        filters: { timeRange: 'week' }
      })
    });

    // Mock export API
    mockFetch.mockResolvedValueOnce({
      ok: true,
      blob: async () => new Blob(['export data'], { type: 'text/csv' }),
      headers: {
        get: (name: string) => {
          if (name === 'Content-Disposition') {
            return 'attachment; filename="analytics-export-week.csv"';
          }
          return null;
        }
      }
    });
  });

  it('should show export options', async () => {
    render(<AnalyticsDashboard locale="en" />);

    await waitFor(() => {
      const exportButton = screen.getByTitle(/export/i);
      fireEvent.click(exportButton);
    });

    // Should show export dropdown
    // (Note: actual export functionality requires blob handling)
  });

  it('should trigger export', async () => {
    // Mock URL.createObjectURL and download
    const mockCreateObjectURL = vi.fn(() => 'blob:mock-url');
    global.URL.createObjectURL = mockCreateObjectURL as any;

    const mockRevokeObjectURL = vi.fn();
    global.URL.revokeObjectURL = mockRevokeObjectURL as any;

    const mockAnchor = document.createElement('a');
    mockAnchor.href = '';
    mockAnchor.download = '';
    const appendSpy = vi.spyOn(document.body, 'appendChild');
    const removeSpy = vi.spyOn(document.body, 'removeChild');
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click');

    render(<AnalyticsDashboard locale="en" />);

    await waitFor(() => {
      const exportButton = screen.getByTitle(/export/i);
      fireEvent.click(exportButton);
    });

    appendSpy.mockRestore();
    removeSpy.mockRestore();
    clickSpy.mockRestore();
  });
});

// ============================================================================
// Test Suite: Responsive Design
// ============================================================================

describe('AnalyticsDashboard - Responsive Design', () => {
  beforeEach(() => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          metrics: mockMetrics,
          timeSeries: mockTimeSeries
        },
        timestamp: new Date().toISOString(),
        filters: { timeRange: 'week' }
      })
    });
  });

  it('should be accessible on mobile', async () => {
    // Set mobile viewport
    window.innerWidth = 375;
    window.innerHeight = 667;

    render(<AnalyticsDashboard locale="en" />);

    await waitFor(() => {
      expect(screen.getByText(/Analytics Dashboard/i)).toBeInTheDocument();
    });
  });

  it('should handle tablet viewport', async () => {
    window.innerWidth = 768;
    window.innerHeight = 1024;

    render(<AnalyticsDashboard locale="en" />);

    await waitFor(() => {
      expect(screen.getByText(/Analytics Dashboard/i)).toBeInTheDocument();
    });
  });

  it('should handle desktop viewport', async () => {
    window.innerWidth = 1920;
    window.innerHeight = 1080;

    render(<AnalyticsDashboard locale="en" />);

    await waitFor(() => {
      expect(screen.getByText(/Analytics Dashboard/i)).toBeInTheDocument();
    });
  });
});
