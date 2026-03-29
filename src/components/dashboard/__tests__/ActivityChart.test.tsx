/**
 * Activity Chart Tests
 * Tests for ActivityChart.tsx - activity visualization component
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ActivityChart from '../ActivityChart';
import type { ActivityDataPoint } from '../ActivityChart';

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

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Activity: ({ className }: { className?: string }) => <div data-testid="activity-icon" className={className} />,
  Zap: ({ className }: { className?: string }) => <div data-testid="zap-icon" className={className} />,
  Users: ({ className }: { className?: string }) => <div data-testid="users-icon" className={className} />,
  Cpu: ({ className }: { className?: string }) => <div data-testid="cpu-icon" className={className} />,
}));

describe('ActivityChart Component', () => {
  const mockData: ActivityDataPoint[] = [
    { timestamp: '2024-01-01T00:00:00Z', agents: 10, users: 50, tokens: 1000 },
    { timestamp: '2024-01-02T00:00:00Z', agents: 15, users: 65, tokens: 1500 },
    { timestamp: '2024-01-03T00:00:00Z', agents: 20, users: 80, tokens: 2000 },
    { timestamp: '2024-01-04T00:00:00Z', agents: 18, users: 70, tokens: 1800 },
    { timestamp: '2024-01-05T00:00:00Z', agents: 25, users: 90, tokens: 2500 },
    { timestamp: '2024-01-06T00:00:00Z', agents: 30, users: 100, tokens: 3000 },
    { timestamp: '2024-01-07T00:00:00Z', agents: 22, users: 85, tokens: 2200 },
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
    const singleData: ActivityDataPoint[] = [
      { timestamp: '2024-01-01T00:00:00Z', agents: 10, users: 50, tokens: 1000 }
    ];

    render(<ActivityChart data={singleData} />);

    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });

  it('should handle large dataset', () => {
    const largeData: ActivityDataPoint[] = Array.from({ length: 100 }, (_, i) => ({
      timestamp: `2024-01-${String(i + 1).padStart(2, '0')}T00:00:00Z`,
      agents: Math.floor(Math.random() * 50),
      users: Math.floor(Math.random() * 100),
      tokens: Math.floor(Math.random() * 5000),
    }));

    render(<ActivityChart data={largeData} />);

    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });

  it('should handle zero activity values', () => {
    const zeroData: ActivityDataPoint[] = [
      { timestamp: '2024-01-01T00:00:00Z', agents: 0, users: 0, tokens: 0 },
      { timestamp: '2024-01-02T00:00:00Z', agents: 0, users: 0, tokens: 0 },
      { timestamp: '2024-01-03T00:00:00Z', agents: 0, users: 0, tokens: 0 },
    ];

    render(<ActivityChart data={zeroData} />);

    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });

  it('should handle high activity values', () => {
    const highData: ActivityDataPoint[] = [
      { timestamp: '2024-01-01T00:00:00Z', agents: 999999, users: 1000000, tokens: 9999999 },
      { timestamp: '2024-01-02T00:00:00Z', agents: 1000000, users: 1500000, tokens: 10000000 },
      { timestamp: '2024-01-03T00:00:00Z', agents: 1234567, users: 2000000, tokens: 12345678 },
    ];

    render(<ActivityChart data={highData} />);

    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });

  it('should render with custom title', () => {
    render(<ActivityChart data={mockData} title="Custom Activity Chart" />);

    expect(screen.getByText('Custom Activity Chart')).toBeInTheDocument();
  });

  it('should render with custom subtitle', () => {
    render(<ActivityChart data={mockData} subtitle="Activity over time" />);

    expect(screen.getByText('Activity over time')).toBeInTheDocument();
  });

  it('should render with custom metrics', () => {
    render(<ActivityChart data={mockData} metrics={['agents', 'users']} />);

    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });

  it('should render with custom height', () => {
    render(<ActivityChart data={mockData} height={500} />);

    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });

  it('should hide legend when showLegend is false', () => {
    render(<ActivityChart data={mockData} showLegend={false} />);

    const legend = screen.queryByTestId('legend');
    expect(legend).not.toBeInTheDocument();
  });

  it('should render with custom className', () => {
    render(<ActivityChart data={mockData} className="custom-class" />);

    expect(screen.getByTestId('responsive-container').closest('.custom-class')).toBeInTheDocument();
  });
});
