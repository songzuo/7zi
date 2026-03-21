/**
 * @fileoverview analytics 组件单元测试
 * @description 测试 MetricCard, DateRangePicker, FilterPanel, AnalyticsChart 等组件
 */

import {describe, it, expect, beforeEach, vi} from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MetricCard } from '@/components/analytics/MetricCard';
import { DateRangePicker } from '@/components/analytics/DateRangePicker';
import { FilterPanel } from '@/components/analytics/FilterPanel';
import { AnalyticsChart } from '@/components/analytics/AnalyticsChart';
import { AnalyticsChartChartJS } from '@/components/analytics/AnalyticsChartChartJS';
import { type Statistic, type AnalyticsFilters, type TimeSeriesDataPoint, TimeRange } from '@/lib/types/analytics';

// ============================================================================
// Mock lucide-react icons
// ============================================================================

vi.mock('lucide-react', () => ({
  TrendingUp: ({ className }: { className: string }) => <svg className={className} data-testid="trending-up" />,
  TrendingDown: ({ className }: { className: string }) => <svg className={className} data-testid="trending-down" />,
  Minus: ({ className }: { className: string }) => <svg className={className} data-testid="minus" />,
  Calendar: ({ className }: { className: string }) => <svg className={className} data-testid="calendar" />,
  ChevronDown: ({ className }: { className: string }) => <svg className={className} data-testid="chevron-down" />,
  Check: ({ className }: { className: string }) => <svg className={className} data-testid="check" />,
  Filter: ({ className }: { className: string }) => <svg className={className} data-testid="filter" />,
  X: ({ className }: { className: string }) => <svg className={className} data-testid="x" />,
  ChevronUp: ({ className }: { className: string }) => <svg className={className} data-testid="chevron-up" />,
  Download: ({ className }: { className: string }) => <svg className={className} data-testid="download" />,
  Activity: ({ className }: { className: string }) => <svg className={className} data-testid="activity" />,
  LineChart: ({ className }: { className: string }) => <svg className={className} data-testid="line-chart-icon" />,
  PieChart: ({ className }: { className: string }) => <svg className={className} data-testid="pie-chart-icon" />,
  BarChart3: ({ className }: { className: string }) => <svg className={className} data-testid="bar-chart3" />
}));

// ============================================================================
// Test Suite: MetricCard
// ============================================================================

describe('MetricCard', () => {
  const mockStatistic: Statistic = {
    label: 'Active Users',
    value: 1234,
    format: 'number',
    change: {
      value: 12.5,
      period: 'last week',
      type: 'increase'
    }
  };

  it('should render statistic with label and value', () => {
    render(<MetricCard statistic={mockStatistic} />);

    expect(screen.getByText('Active Users')).toBeInTheDocument();
    expect(screen.getByText('1,234')).toBeInTheDocument();
  });

  it('should render with trend indicator', () => {
    render(<MetricCard statistic={mockStatistic} />);

    expect(screen.getByText('+12.5%')).toBeInTheDocument();
    expect(screen.getByText('(last week)')).toBeInTheDocument();
    expect(screen.getByTestId('trending-up')).toBeInTheDocument();
  });

  it('should render negative trend', () => {
    const negativeStat: Statistic = {
      ...mockStatistic,
      change: { value: -5.3, period: 'last week', type: 'decrease' }
    };

    render(<MetricCard statistic={negativeStat} />);

    expect(screen.getByText('-5.3%')).toBeInTheDocument();
    expect(screen.getByTestId('trending-down')).toBeInTheDocument();
  });

  it('should render neutral trend', () => {
    const neutralStat: Statistic = {
      ...mockStatistic,
      change: { value: 0, period: 'last week', type: 'stable' }
    };

    render(<MetricCard statistic={neutralStat} />);

    expect(screen.getByText('0%')).toBeInTheDocument();
    expect(screen.getByTestId('minus')).toBeInTheDocument();
  });

  it('should format currency values', () => {
    const currencyStat: Statistic = {
      label: 'Revenue',
      value: 1234.56,
      format: 'currency'
    };

    render(<MetricCard statistic={currencyStat} />);

    expect(screen.getByText('$1,234.56')).toBeInTheDocument();
  });

  it('should format percentage values', () => {
    const percentStat: Statistic = {
      label: 'Completion Rate',
      value: 85.5,
      format: 'percentage'
    };

    render(<MetricCard statistic={percentStat} />);

    expect(screen.getByText('85.5%')).toBeInTheDocument();
  });

  it('should format bytes values', () => {
    const bytesStat: Statistic = {
      label: 'Storage Used',
      value: 1572864, // Exactly 1.5 MiB (1024² × 1.5)
      format: 'bytes'
    };

    render(<MetricCard statistic={bytesStat} />);

    expect(screen.getByText('1.5 MB')).toBeInTheDocument();
  });

  it('should format duration values', () => {
    const durationStat: Statistic = {
      label: 'Session Duration',
      value: 3665,
      format: 'duration'
    };

    render(<MetricCard statistic={durationStat} />);

    expect(screen.getByText('1h 1m')).toBeInTheDocument();
  });

  it('should render loading state', () => {
    render(<MetricCard statistic={mockStatistic} loading={true} />);

    expect(screen.queryByText('Active Users')).not.toBeInTheDocument();
    expect(screen.queryByText('1,234')).not.toBeInTheDocument();
  });

  it('should call onClick handler', () => {
    const handleClick = vi.fn();
    render(<MetricCard statistic={mockStatistic} onClick={handleClick} />);

    const card = screen.getByText('Active Users').closest('div');
    card && fireEvent.click(card);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should apply color variants', () => {
    const { rerender } = render(<MetricCard statistic={mockStatistic} color="blue" />);
    // Find root card div by matching the gradient class
    const getCardDiv = () => screen.getByText('Active Users').closest('[class*="bg-gradient"]');

    let card = getCardDiv();
    expect(card).toHaveClass('from-blue-50');

    rerender(<MetricCard statistic={mockStatistic} color="green" />);
    card = getCardDiv();
    expect(card).toHaveClass('from-green-50');
  });
});

// ============================================================================
// Test Suite: DateRangePicker
// ============================================================================

describe('DateRangePicker', () => {
  const mockOnChange = vi.fn();
  const mockTimeRange: TimeRange = 'week';

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  it('should render with selected range', () => {
    render(
      <DateRangePicker
        selectedRange={mockTimeRange}
        onChange={mockOnChange}
        locale="en"
      />
    );

    expect(screen.getByText('Last 7 Days')).toBeInTheDocument();
  });

  it('should render Chinese labels', () => {
    render(
      <DateRangePicker
        selectedRange={mockTimeRange}
        onChange={mockOnChange}
        locale="zh"
      />
    );

    expect(screen.getByText('最近7天')).toBeInTheDocument();
  });

  it('should open dropdown on click', () => {
    render(
      <DateRangePicker
        selectedRange={mockTimeRange}
        onChange={mockOnChange}
        locale="en"
      />
    );

    const button = screen.getByText('Last 7 Days').closest('button');
    button && fireEvent.click(button);

    expect(screen.getByText('Today')).toBeInTheDocument();
    expect(screen.getByText('Last 30 Days')).toBeInTheDocument();
  });

  it('should call onChange when selecting a range', async () => {
    render(
      <DateRangePicker
        selectedRange={mockTimeRange}
        onChange={mockOnChange}
        locale="en"
      />
    );

    const triggerButton = screen.getByRole('button', { name: /last 7 days/i });
    fireEvent.click(triggerButton);

    // Wait for dropdown to open and option to be available
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /last 30 days/i })).toBeInTheDocument();
    });

    const monthOption = screen.getByRole('button', { name: /last 30 days/i });
    fireEvent.click(monthOption);

    // The onChange should be called immediately when a non-custom range is selected
    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith('month');
    });
  });

  it('should display custom range when selected', () => {
    const customRange = {
      start: '2024-01-01',
      end: '2024-01-31'
    };

    render(
      <DateRangePicker
        selectedRange="custom"
        customRange={customRange}
        onChange={mockOnChange}
        locale="en"
      />
    );

    expect(screen.getByText(/Jan 1, 2024/)).toBeInTheDocument();
    expect(screen.getByText(/Jan 31, 2024/)).toBeInTheDocument();
  });

  it('should show date inputs when custom is selected', async () => {
    render(
      <DateRangePicker
        selectedRange="week"
        onChange={mockOnChange}
        locale="en"
      />
    );

    const button = screen.getByText('Last 7 Days').closest('button');
    button && fireEvent.click(button);

    await waitFor(() => {
      const customOption = screen.getByText('Custom');
      customOption && fireEvent.click(customOption);
    });

    await waitFor(() => {
      expect(screen.getByText('Start Date')).toBeInTheDocument();
      expect(screen.getByText('End Date')).toBeInTheDocument();
    });
  });

  it('should apply custom range', async () => {
    render(
      <DateRangePicker
        selectedRange="custom"
        onChange={mockOnChange}
        locale="en"
      />
    );

    // Open dropdown to show custom range form
    const button = screen.getByText('Custom').closest('button');
    button && fireEvent.click(button);

    // Wait for custom form to appear
    await waitFor(() => {
      expect(screen.getByText('Start Date')).toBeInTheDocument();
      expect(screen.getByText('End Date')).toBeInTheDocument();
    });

    // Find date inputs (component uses native date inputs)
    const inputs = document.querySelectorAll('input[type="date"]');
    fireEvent.change(inputs[0], { target: { value: '2024-01-01' } });
    fireEvent.change(inputs[1], { target: { value: '2024-01-31' } });

    const applyButton = screen.getByText('Apply');
    fireEvent.click(applyButton);

    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith('custom', {
        start: '2024-01-01',
        end: '2024-01-31'
      });
    });
  });
});

// ============================================================================
// Test Suite: FilterPanel
// ============================================================================

describe('FilterPanel', () => {
  const mockFilters: AnalyticsFilters = {
    timeRange: 'week',
    taskStatuses: ['completed', 'in-progress'],
    metrics: ['agents', 'users']
  };

  const mockOnFiltersChange = vi.fn();

  beforeEach(() => {
    mockOnFiltersChange.mockClear();
  });

  it('should render filter sections', () => {
    render(
      <FilterPanel
        filters={mockFilters}
        onFiltersChange={mockOnFiltersChange}
        locale="en"
      />
    );

    expect(screen.getByText('Filters')).toBeInTheDocument();
  });

  it('should display active filter count', () => {
    render(
      <FilterPanel
        filters={mockFilters}
        onFiltersChange={mockOnFiltersChange}
        locale="en"
      />
    );

    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('should expand when button clicked', () => {
    render(
      <FilterPanel
        filters={mockFilters}
        onFiltersChange={mockOnFiltersChange}
        locale="en"
      />
    );

    const expandButton = screen.getByTestId('chevron-down');
    fireEvent.click(expandButton);

    expect(screen.getByText('Task Status')).toBeInTheDocument();
    expect(screen.getByText('Task Priority')).toBeInTheDocument();
  });

  it('should toggle filter section', () => {
    render(
      <FilterPanel
        filters={mockFilters}
        onFiltersChange={mockOnFiltersChange}
        locale="en"
      />
    );

    const expandButton = screen.getByTestId('chevron-down');
    fireEvent.click(expandButton);

    const taskStatusButton = screen.getByText('Task Status');
    fireEvent.click(taskStatusButton);

    expect(screen.queryByText('Completed')).not.toBeInTheDocument();
  });

  it('should call onFiltersChange when checkbox toggled', () => {
    render(
      <FilterPanel
        filters={mockFilters}
        onFiltersChange={mockOnFiltersChange}
        locale="en"
      />
    );

    const expandButton = screen.getByTestId('chevron-down');
    fireEvent.click(expandButton);

    const pendingCheckbox = screen.getByLabelText('Pending');
    fireEvent.click(pendingCheckbox);

    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      ...mockFilters,
      taskStatuses: ['completed', 'in-progress', 'pending']
    });
  });

  it('should remove filter when clicking X', () => {
    render(
      <FilterPanel
        filters={mockFilters}
        onFiltersChange={mockOnFiltersChange}
        locale="en"
      />
    );

    const expandButton = screen.getByTestId('chevron-down');
    fireEvent.click(expandButton);

    const removeButton = screen.getAllByTestId('x')[0];
    fireEvent.click(removeButton);

    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      ...mockFilters,
      taskStatuses: ['in-progress']
    });
  });

  it('should clear all filters', () => {
    render(
      <FilterPanel
        filters={mockFilters}
        onFiltersChange={mockOnFiltersChange}
        locale="en"
      />
    );

    const expandButton = screen.getByTestId('chevron-down');
    fireEvent.click(expandButton);

    const clearButton = screen.getByText('Clear All');
    fireEvent.click(clearButton);

    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      timeRange: 'week'
    });
  });

  it('should render Chinese labels', () => {
    render(
      <FilterPanel
        filters={mockFilters}
        onFiltersChange={mockOnFiltersChange}
        locale="zh"
      />
    );

    const expandButton = screen.getByTestId('chevron-down');
    fireEvent.click(expandButton);

    expect(screen.getByText('筛选')).toBeInTheDocument();
    expect(screen.getByText('任务状态')).toBeInTheDocument();
    expect(screen.getByText('已完成')).toBeInTheDocument();
  });
});

// ============================================================================
// Test Suite: AnalyticsChart (Recharts)
// ============================================================================

describe('AnalyticsChart', () => {
  const mockData: TimeSeriesDataPoint[] = [
    { timestamp: '2024-01-01', date: 'Jan 1', agents: 10, users: 50, tasks: 20 },
    { timestamp: '2024-01-02', date: 'Jan 2', agents: 12, users: 55, tasks: 25 },
    { timestamp: '2024-01-03', date: 'Jan 3', agents: 8, users: 45, tasks: 18 }
  ];

  const mockConfig = {
    type: 'line' as const,
    title: 'Activity Overview',
    data: mockData,
    metrics: ['agents', 'users'],
    showLegend: true,
    showTooltip: true,
    height: 300
  };

  it('should render chart with title', () => {
    render(<AnalyticsChart config={mockConfig} />);

    expect(screen.getByText('Activity Overview')).toBeInTheDocument();
  });

  it('should render chart type selector', () => {
    render(<AnalyticsChart config={mockConfig} />);

    expect(screen.getByTestId('activity')).toBeInTheDocument();
  });

  it('should switch chart type', () => {
    render(<AnalyticsChart config={mockConfig} />);

    const areaButton = screen.getByTitle('area');
    fireEvent.click(areaButton);

    // Chart type should change
    expect(screen.getByTitle('area')).toBeInTheDocument();
  });

  it('should show export dropdown', () => {
    const mockOnExport = vi.fn();
    render(<AnalyticsChart config={mockConfig} onExport={mockOnExport} />);

    const exportButton = screen.getByTestId('download');
    fireEvent.mouseEnter(exportButton);

    expect(screen.getByText('CSV')).toBeInTheDocument();
    expect(screen.getByText('XLSX')).toBeInTheDocument();
    expect(screen.getByText('JSON')).toBeInTheDocument();
  });

  it('should call onExport with format', () => {
    const mockOnExport = vi.fn();
    render(<AnalyticsChart config={mockConfig} onExport={mockOnExport} />);

    const exportButton = screen.getByTestId('download');
    fireEvent.mouseEnter(exportButton);

    const csvOption = screen.getByText('CSV');
    fireEvent.click(csvOption);

    expect(mockOnExport).toHaveBeenCalledWith('csv');
  });
});

// ============================================================================
// Test Suite: AnalyticsChartChartJS
// ============================================================================

describe('AnalyticsChartChartJS', () => {
  const mockData: TimeSeriesDataPoint[] = [
    { timestamp: '2024-01-01', date: 'Jan 1', agents: 10, users: 50, tasks: 20 },
    { timestamp: '2024-01-02', date: 'Jan 2', agents: 12, users: 55, tasks: 25 },
    { timestamp: '2024-01-03', date: 'Jan 3', agents: 8, users: 45, tasks: 18 }
  ];

  const mockConfig = {
    type: 'line' as const,
    title: 'Activity Overview (Chart.js)',
    data: mockData,
    metrics: ['agents', 'users'],
    showLegend: true,
    showTooltip: true,
    height: 300
  };

  it('should render chart with title', () => {
    render(<AnalyticsChartChartJS config={mockConfig} />);

    expect(screen.getByText('Activity Overview (Chart.js)')).toBeInTheDocument();
  });

  it('should render canvas for chart', () => {
    render(<AnalyticsChartChartJS config={mockConfig} />);

    const canvas = document.querySelector('canvas');
    expect(canvas).toBeInTheDocument();
  });

  it('should show export dropdown', () => {
    const mockOnExport = vi.fn();
    render(<AnalyticsChartChartJS config={mockConfig} onExport={mockOnExport} />);

    const exportButton = screen.getByTestId('export-button');
    fireEvent.mouseEnter(exportButton);

    expect(screen.getByText('CSV')).toBeInTheDocument();
    expect(screen.getByText('XLSX')).toBeInTheDocument();
    expect(screen.getByText('JSON')).toBeInTheDocument();
  });

  it('should call onExport with format', () => {
    const mockOnExport = vi.fn();
    render(<AnalyticsChartChartJS config={mockConfig} onExport={mockOnExport} />);

    const exportButton = screen.getByTestId('export-button');
    fireEvent.mouseEnter(exportButton);

    const jsonOption = screen.getByText('JSON');
    fireEvent.click(jsonOption);

    expect(mockOnExport).toHaveBeenCalledWith('json');
  });
});

// ============================================================================
// Test Suite: Chart Types
// ============================================================================

describe('Chart Types', () => {
  const mockData: TimeSeriesDataPoint[] = [
    { timestamp: '2024-01-01', date: 'Jan 1', agents: 10, users: 50 },
    { timestamp: '2024-01-02', date: 'Jan 2', agents: 12, users: 55 }
  ];

  it('should render bar chart', () => {
    render(
      <AnalyticsChart
        config={{
          type: 'bar',
          title: 'Bar Chart',
          data: mockData,
          metrics: ['agents']
        }}
      />
    );

    expect(screen.getByText('Bar Chart')).toBeInTheDocument();
  });

  it('should render area chart', () => {
    render(
      <AnalyticsChart
        config={{
          type: 'area',
          title: 'Area Chart',
          data: mockData,
          metrics: ['agents']
        }}
      />
    );

    expect(screen.getByText('Area Chart')).toBeInTheDocument();
  });

  it('should render pie chart', () => {
    render(
      <AnalyticsChart
        config={{
          type: 'pie',
          title: 'Pie Chart',
          data: mockData,
          metrics: ['agents', 'users']
        }}
      />
    );

    expect(screen.getByText('Pie Chart')).toBeInTheDocument();
  });

  it('should render donut chart', () => {
    render(
      <AnalyticsChart
        config={{
          type: 'donut',
          title: 'Donut Chart',
          data: mockData,
          metrics: ['agents', 'users']
        }}
      />
    );

    expect(screen.getByText('Donut Chart')).toBeInTheDocument();
  });

  it('should render radar chart', () => {
    render(
      <AnalyticsChart
        config={{
          type: 'radar',
          title: 'Radar Chart',
          data: mockData,
          metrics: ['agents', 'users']
        }}
      />
    );

    expect(screen.getByText('Radar Chart')).toBeInTheDocument();
  });
});
