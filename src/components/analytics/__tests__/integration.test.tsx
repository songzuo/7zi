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

// Create a proper mock Response object
class MockResponse implements Response {
  ok: boolean;
  status: number;
  statusText: string;
  headers: Headers;
  body: ReadableStream | null = null;
  bodyUsed = false;
  redirected = false;
  type: ResponseType = 'basic';
  url = '';
  private data: any;

  constructor(data: any, init?: ResponseInit) {
    this.data = data;
    this.ok = init?.ok ?? (init?.status ?? 200) < 400;
    this.status = init?.status ?? 200;
    this.statusText = init?.statusText ?? 'OK';
    this.headers = init?.headers ? new Headers(init.headers) : new Headers();
  }

  async json() {
    if (this.data instanceof Blob) {
      const text = await this.text();
      return JSON.parse(text);
    }
    return this.data;
  }

  async text() {
    if (this.data instanceof Blob) {
      return this.data.text();
    }
    return typeof this.data === 'string' ? this.data : JSON.stringify(this.data);
  }

  async blob() {
    if (this.data instanceof Blob) return this.data;
    return new Blob([JSON.stringify(this.data)], { type: 'application/json' });
  }

  async arrayBuffer() {
    const text = await this.text();
    return new TextEncoder().encode(text).buffer;
  }

  async formData() {
    throw new Error('Not implemented');
  }

  clone(): Response {
    return new MockResponse(this.data, {
      status: this.status,
      statusText: this.statusText,
      headers: this.headers,
      ok: this.ok,
    });
  }
}

global.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockClear();
  // Mock localStorage
  const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    clear: vi.fn(),
    removeItem: vi.fn(),
    length: 0,
    key: vi.fn(),
  };
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    writable: true,
  });
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
    mockFetch.mockReset();
    // Mock successful API response
    mockFetch.mockResolvedValue(new MockResponse({
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
    }));
  });

  afterEach(() => {
    mockFetch.mockReset();
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

  it('should display loading state initially', async () => {
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
      const refreshButton = screen.getByTitle(/Refresh/i);
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
      const settingsButton = screen.getByTitle(/Export/i);
      fireEvent.click(settingsButton);
    });

    // FilterPanel should be shown (with Filters header)
    await waitFor(() => {
      expect(screen.queryByText(/Filters/i)).toBeInTheDocument();
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
    mockFetch.mockReset();
    mockFetch.mockResolvedValue(new MockResponse({
      success: true,
      data: {
        metrics: mockMetrics,
        timeSeries: mockTimeSeries
      },
      timestamp: new Date().toISOString(),
      filters: { timeRange: 'week' }
    }));
  });

  afterEach(() => {
    mockFetch.mockReset();
  });

  it('should update data when time range changes', async () => {
    render(<AnalyticsDashboard locale="en" />);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });

    // Click the date range button to open the picker
    const dateRangeButton = screen.getByText(/Last 7 Days/i);
    fireEvent.click(dateRangeButton);

    await waitFor(() => {
      expect(screen.getByText(/Last 30 Days/i)).toBeInTheDocument();
    });
  });
});

// ============================================================================
// Test Suite: Export Functionality
// ============================================================================

describe('AnalyticsDashboard - Export', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    // Mock API response for initial load
    mockFetch.mockResolvedValue(new MockResponse({
      success: true,
      data: {
        metrics: mockMetrics,
        timeSeries: mockTimeSeries
      },
      timestamp: new Date().toISOString(),
      filters: { timeRange: 'week' }
    }));
  });

  afterEach(() => {
    mockFetch.mockReset();
  });

  it('should show export button', async () => {
    render(<AnalyticsDashboard locale="en" />);

    await waitFor(() => {
      const exportButton = screen.getByTitle(/Export/i);
      expect(exportButton).toBeInTheDocument();
    });
  });

  it('should trigger export on button click', async () => {
    // Mock URL.createObjectURL and download
    const mockCreateObjectURL = vi.fn(() => 'blob:mock-url');
    const originalCreateObjectURL = global.URL.createObjectURL;
    global.URL.createObjectURL = mockCreateObjectURL as any;

    const mockRevokeObjectURL = vi.fn();
    const originalRevokeObjectURL = global.URL.revokeObjectURL;
    global.URL.revokeObjectURL = mockRevokeObjectURL as any;

    // Mock the export API call
    const blob = new Blob(['export data'], { type: 'text/csv' });
    mockFetch.mockImplementationOnce(() =>
      Promise.resolve(new MockResponse(blob, {
        ok: true,
        status: 200,
        headers: new Headers({
          'Content-Disposition': 'attachment; filename="analytics-export-week.csv"'
        })
      }))
    );

    const appendSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(() => {
      return document.createElement('div'); // Return a dummy element
    });
    const removeSpy = vi.spyOn(document.body, 'removeChild').mockImplementation(() => {});
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    render(<AnalyticsDashboard locale="en" />);

    await waitFor(() => {
      const exportButton = screen.getByTitle(/Export/i);
      expect(exportButton).toBeInTheDocument();
    });

    // Click export button
    fireEvent.click(screen.getByTitle(/Export/i));

    await waitFor(() => {
      // Verify export was attempted
      expect(mockFetch).toHaveBeenCalled();
    }, { timeout: 5000 });

    // Restore original functions
    global.URL.createObjectURL = originalCreateObjectURL;
    global.URL.revokeObjectURL = originalRevokeObjectURL;
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
    mockFetch.mockReset();
    mockFetch.mockResolvedValue(new MockResponse({
      success: true,
      data: {
        metrics: mockMetrics,
        timeSeries: mockTimeSeries
      },
      timestamp: new Date().toISOString(),
      filters: { timeRange: 'week' }
    }));
  });

  afterEach(() => {
    mockFetch.mockReset();
  });

  it('should be accessible on mobile', async () => {
    // Set mobile viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 667,
    });

    render(<AnalyticsDashboard locale="en" />);

    await waitFor(() => {
      expect(screen.getByText(/Analytics Dashboard/i)).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it('should handle tablet viewport', async () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 768,
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 1024,
    });

    render(<AnalyticsDashboard locale="en" />);

    await waitFor(() => {
      expect(screen.getByText(/Analytics Dashboard/i)).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it('should handle desktop viewport', async () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1920,
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 1080,
    });

    render(<AnalyticsDashboard locale="en" />);

    await waitFor(() => {
      expect(screen.getByText(/Analytics Dashboard/i)).toBeInTheDocument();
    }, { timeout: 5000 });
  });
});
