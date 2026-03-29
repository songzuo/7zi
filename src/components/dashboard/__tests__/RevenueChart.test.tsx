/**
 * Revenue Chart Tests
 * Tests for RevenueChart.tsx - revenue visualization component
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import RevenueChart from '../RevenueChart';
import type { RevenueDataPoint } from '../RevenueChart';

// Mock recharts components
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  LineChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="line-chart">{children}</div>
  ),
  Line: () => <div data-testid="line" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  TrendingUp: ({ className }: { className?: string }) => <div data-testid="trending-up-icon" className={className} />,
  DollarSign: ({ className }: { className?: string }) => <div data-testid="dollar-sign-icon" className={className} />,
  Calendar: ({ className }: { className?: string }) => <div data-testid="calendar-icon" className={className} />,
}));

describe('RevenueChart Component', () => {
  const mockData: RevenueDataPoint[] = [
    { date: 'Jan', revenue: 1000 },
    { date: 'Feb', revenue: 1500 },
    { date: 'Mar', revenue: 2000 },
    { date: 'Apr', revenue: 1800 },
    { date: 'May', revenue: 2200 },
    { date: 'Jun', revenue: 2500 },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render without crashing', () => {
    render(<RevenueChart data={mockData} />);

    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
  });

  it('should render chart with provided data', () => {
    render(<RevenueChart data={mockData} />);

    const chart = screen.getByTestId('line-chart');
    expect(chart).toBeInTheDocument();
  });

  it('should render empty state when no data is provided', () => {
    render(<RevenueChart data={[]} />);

    // Component should handle empty data gracefully
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });

  it('should render with default title', () => {
    render(<RevenueChart data={mockData} />);

    // Component has a default title
    expect(screen.getByText('Revenue Trend')).toBeInTheDocument();
  });

  it('should render with custom title', () => {
    render(<RevenueChart data={mockData} title="My Revenue Chart" />);

    expect(screen.getByText('My Revenue Chart')).toBeInTheDocument();
  });

  it('should render chart axes', () => {
    render(<RevenueChart data={mockData} />);

    expect(screen.getByTestId('x-axis')).toBeInTheDocument();
    expect(screen.getByTestId('y-axis')).toBeInTheDocument();
  });

  it('should render legend', () => {
    render(<RevenueChart data={mockData} />);

    expect(screen.getByTestId('legend')).toBeInTheDocument();
  });

  it('should render tooltip', () => {
    render(<RevenueChart data={mockData} />);

    expect(screen.getByTestId('tooltip')).toBeInTheDocument();
  });

  it('should render grid', () => {
    render(<RevenueChart data={mockData} />);

    expect(screen.getByTestId('cartesian-grid')).toBeInTheDocument();
  });

  it('should render line component', () => {
    render(<RevenueChart data={mockData} />);

    expect(screen.getByTestId('line')).toBeInTheDocument();
  });

  it('should handle single data point', () => {
    const singleData: RevenueDataPoint[] = [{ date: 'Jan', revenue: 1000 }];

    render(<RevenueChart data={singleData} />);

    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });

  it('should handle large dataset', () => {
    const largeData: RevenueDataPoint[] = Array.from({ length: 100 }, (_, i) => ({
      date: `Month ${i + 1}`,
      revenue: Math.floor(Math.random() * 10000),
    }));

    render(<RevenueChart data={largeData} />);

    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });

  it('should handle zero revenue values', () => {
    const zeroData: RevenueDataPoint[] = [
      { date: 'Jan', revenue: 0 },
      { date: 'Feb', revenue: 0 },
      { date: 'Mar', revenue: 0 },
    ];

    render(<RevenueChart data={zeroData} />);

    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });

  it('should handle high revenue values', () => {
    const highData: RevenueDataPoint[] = [
      { date: 'Jan', revenue: 999999 },
      { date: 'Feb', revenue: 1000000 },
      { date: 'Mar', revenue: 1234567 },
    ];

    render(<RevenueChart data={highData} />);

    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });

  it('should render with custom color', () => {
    render(<RevenueChart data={mockData} color="#ff0000" />);

    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });

  it('should render with custom height', () => {
    render(<RevenueChart data={mockData} height={500} />);

    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });

  it('should render with custom subtitle', () => {
    render(<RevenueChart data={mockData} subtitle="Monthly revenue data" />);

    expect(screen.getByText('Monthly revenue data')).toBeInTheDocument();
  });

  it('should render with showTarget enabled', () => {
    const dataWithTarget: RevenueDataPoint[] = [
      { date: 'Jan', revenue: 1000, target: 1200 },
      { date: 'Feb', revenue: 1500, target: 1500 },
      { date: 'Mar', revenue: 2000, target: 1800 },
    ];

    render(<RevenueChart data={dataWithTarget} showTarget={true} />);

    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });

  it('should render with showProfit enabled', () => {
    const dataWithProfit: RevenueDataPoint[] = [
      { date: 'Jan', revenue: 1000, profit: 500 },
      { date: 'Feb', revenue: 1500, profit: 750 },
      { date: 'Mar', revenue: 2000, profit: 1000 },
    ];

    render(<RevenueChart data={dataWithProfit} showProfit={true} />);

    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });

  it('should render with custom locale', () => {
    render(<RevenueChart data={mockData} locale="zh" />);

    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });

  it('should render with custom className', () => {
    render(<RevenueChart data={mockData} className="custom-class" />);

    expect(screen.getByTestId('responsive-container').closest('.custom-class')).toBeInTheDocument();
  });
});
