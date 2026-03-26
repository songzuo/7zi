/**
 * Analytics Chart Tests
 * Tests for AnalyticsChart.tsx - analytics visualization component
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import AnalyticsChart from '../AnalyticsChart';

// Mock recharts components
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  BarChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="bar-chart">{children}</div>
  ),
  Bar: () => <div data-testid="bar" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
}));

describe('AnalyticsChart Component', () => {
  const mockData = [
    { category: 'Tasks', value: 120 },
    { category: 'Bugs', value: 25 },
    { category: 'Features', value: 45 },
    { category: 'Optimizations', value: 30 },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render without crashing', () => {
    render(<AnalyticsChart data={mockData} />);

    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
  });

  it('should render chart with provided data', () => {
    render(<AnalyticsChart data={mockData} />);

    const chart = screen.getByTestId('bar-chart');
    expect(chart).toBeInTheDocument();
  });

  it('should render empty state when no data is provided', () => {
    render(<AnalyticsChart data={[]} />);

    // Component should handle empty data gracefully
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });

  it('should render chart axes', () => {
    render(<AnalyticsChart data={mockData} />);

    expect(screen.getByTestId('x-axis')).toBeInTheDocument();
    expect(screen.getByTestId('y-axis')).toBeInTheDocument();
  });

  it('should render legend', () => {
    render(<AnalyticsChart data={mockData} />);

    expect(screen.getByTestId('legend')).toBeInTheDocument();
  });

  it('should render tooltip', () => {
    render(<AnalyticsChart data={mockData} />);

    expect(screen.getByTestId('tooltip')).toBeInTheDocument();
  });

  it('should render grid', () => {
    render(<AnalyticsChart data={mockData} />);

    expect(screen.getByTestId('cartesian-grid')).toBeInTheDocument();
  });

  it('should render bar component', () => {
    render(<AnalyticsChart data={mockData} />);

    expect(screen.getByTestId('bar')).toBeInTheDocument();
  });

  it('should handle single data point', () => {
    const singleData = [{ category: 'Tasks', value: 120 }];

    render(<AnalyticsChart data={singleData} />);

    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });

  it('should handle large dataset', () => {
    const largeData = Array.from({ length: 50 }, (_, i) => ({
      category: `Category ${i + 1}`,
      value: Math.floor(Math.random() * 1000),
    }));

    render(<AnalyticsChart data={largeData} />);

    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });

  it('should handle zero values', () => {
    const zeroData = [
      { category: 'Tasks', value: 0 },
      { category: 'Bugs', value: 0 },
      { category: 'Features', value: 0 },
    ];

    render(<AnalyticsChart data={zeroData} />);

    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });

  it('should handle negative values if supported', () => {
    const negativeData = [
      { category: 'Tasks', value: -10 },
      { category: 'Bugs', value: 20 },
      { category: 'Features', value: -5 },
    ];

    render(<AnalyticsChart data={negativeData} />);

    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });
});
