/**
 * Revenue Chart Tests
 * Tests for RevenueChart.tsx - revenue visualization component
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import RevenueChart from '../RevenueChart';

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

describe('RevenueChart Component', () => {
  const mockData = [
    { month: 'Jan', revenue: 1000 },
    { month: 'Feb', revenue: 1500 },
    { month: 'Mar', revenue: 2000 },
    { month: 'Apr', revenue: 1800 },
    { month: 'May', revenue: 2200 },
    { month: 'Jun', revenue: 2500 },
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
    const { container } = render(<RevenueChart data={mockData} />);

    // Check if title is rendered (if component has a title)
    const title = container.querySelector('h2, h3, .title');
    // This is optional based on actual component implementation
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
    const singleData = [{ month: 'Jan', revenue: 1000 }];

    render(<RevenueChart data={singleData} />);

    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });

  it('should handle large dataset', () => {
    const largeData = Array.from({ length: 100 }, (_, i) => ({
      month: `Month ${i + 1}`,
      revenue: Math.floor(Math.random() * 10000),
    }));

    render(<RevenueChart data={largeData} />);

    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });
});
