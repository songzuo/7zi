/**
 * Activity Chart Tests
 * Tests for ActivityChart.tsx - activity visualization component
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ActivityChart from '../ActivityChart';

// Mock recharts components
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  AreaChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="area-chart">{children}</div>
  ),
  Area: () => <div data-testid="area" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
}));

describe('ActivityChart Component', () => {
  const mockData = [
    { date: '2024-01-01', activity: 10 },
    { date: '2024-01-02', activity: 15 },
    { date: '2024-01-03', activity: 20 },
    { date: '2024-01-04', activity: 18 },
    { date: '2024-01-05', activity: 25 },
    { date: '2024-01-06', activity: 30 },
    { date: '2024-01-07', activity: 22 },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render without crashing', () => {
    render(<ActivityChart data={mockData} />);

    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    expect(screen.getByTestId('area-chart')).toBeInTheDocument();
  });

  it('should render chart with provided data', () => {
    render(<ActivityChart data={mockData} />);

    const chart = screen.getByTestId('area-chart');
    expect(chart).toBeInTheDocument();
  });

  it('should render empty state when no data is provided', () => {
    render(<ActivityChart data={[]} />);

    // Component should handle empty data gracefully
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });

  it('should render chart axes', () => {
    render(<ActivityChart data={mockData} />);

    expect(screen.getByTestId('x-axis')).toBeInTheDocument();
    expect(screen.getByTestId('y-axis')).toBeInTheDocument();
  });

  it('should render legend', () => {
    render(<ActivityChart data={mockData} />);

    expect(screen.getByTestId('legend')).toBeInTheDocument();
  });

  it('should render tooltip', () => {
    render(<ActivityChart data={mockData} />);

    expect(screen.getByTestId('tooltip')).toBeInTheDocument();
  });

  it('should render grid', () => {
    render(<ActivityChart data={mockData} />);

    expect(screen.getByTestId('cartesian-grid')).toBeInTheDocument();
  });

  it('should render area component', () => {
    render(<ActivityChart data={mockData} />);

    expect(screen.getByTestId('area')).toBeInTheDocument();
  });

  it('should handle single data point', () => {
    const singleData = [{ date: '2024-01-01', activity: 10 }];

    render(<ActivityChart data={singleData} />);

    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });

  it('should handle large dataset', () => {
    const largeData = Array.from({ length: 100 }, (_, i) => ({
      date: `2024-01-${String(i + 1).padStart(2, '0')}`,
      activity: Math.floor(Math.random() * 100),
    }));

    render(<ActivityChart data={largeData} />);

    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });

  it('should handle zero activity values', () => {
    const zeroData = [
      { date: '2024-01-01', activity: 0 },
      { date: '2024-01-02', activity: 0 },
      { date: '2024-01-03', activity: 0 },
    ];

    render(<ActivityChart data={zeroData} />);

    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });

  it('should handle high activity values', () => {
    const highData = [
      { date: '2024-01-01', activity: 999999 },
      { date: '2024-01-02', activity: 1000000 },
      { date: '2024-01-03', activity: 1234567 },
    ];

    render(<ActivityChart data={highData} />);

    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });
});
