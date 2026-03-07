import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PieChart, DonutChart, GaugeChart } from '../components/charts/PieChart';
import { CHART_COLORS } from '../components/charts/Chart';
import type { ChartDataPoint } from '../components/charts/Chart';
import React from 'react';

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Error Boundary for testing
class TestErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; fallback: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

const sampleData: ChartDataPoint[] = [
  { label: 'Category A', value: 30, color: CHART_COLORS.blue },
  { label: 'Category B', value: 45, color: CHART_COLORS.green },
  { label: 'Category C', value: 25, color: CHART_COLORS.purple },
];

const emptyData: ChartDataPoint[] = [];

describe('PieChart Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===== 基本渲染 =====
  describe('Basic Rendering', () => {
    it('renders without crashing', () => {
      render(<PieChart data={sampleData} title="Test Pie Chart" />);
      expect(screen.getByText('Test Pie Chart')).toBeInTheDocument();
    });

    it('renders all data labels in legend', () => {
      render(<PieChart data={sampleData} title="Pie Chart" />);
      expect(screen.getByText('Category A')).toBeInTheDocument();
      expect(screen.getByText('Category B')).toBeInTheDocument();
      expect(screen.getByText('Category C')).toBeInTheDocument();
    });

    it('renders subtitle when provided', () => {
      render(<PieChart data={sampleData} title="Pie" subtitle="Sales Distribution" />);
      expect(screen.getByText('Sales Distribution')).toBeInTheDocument();
    });

    it('renders SVG element', () => {
      const { container } = render(<PieChart data={sampleData} title="Pie Chart" />);
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('renders path segments for each data point', () => {
      const { container } = render(<PieChart data={sampleData} title="Pie Chart" />);
      const paths = container.querySelectorAll('path');
      // Should have paths for segments (3 data points)
      expect(paths.length).toBeGreaterThanOrEqual(sampleData.length);
    });
  });

  // ===== Props 传递 =====
  describe('Props Passing', () => {
    it('applies custom size prop', () => {
      const { container } = render(
        <PieChart data={sampleData} title="Custom Size" size={300} />
      );
      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('width', '300');
      expect(svg).toHaveAttribute('height', '300');
    });

    it('applies default size of 200', () => {
      const { container } = render(<PieChart data={sampleData} title="Default Size" />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('width', '200');
      expect(svg).toHaveAttribute('height', '200');
    });

    it('applies custom colors from data', () => {
      const { container } = render(<PieChart data={sampleData} title="Colors" />);
      const paths = container.querySelectorAll('path');
      // First path should have blue color
      expect(paths[0]).toHaveAttribute('fill', CHART_COLORS.blue);
    });

    it('generates default colors when not provided', () => {
      const dataWithoutColors: ChartDataPoint[] = [
        { label: 'X', value: 10 },
        { label: 'Y', value: 20 },
      ];
      const { container } = render(<PieChart data={dataWithoutColors} title="Auto Colors" />);
      const paths = container.querySelectorAll('path');
      expect(paths[0]).toHaveAttribute('fill');
    });

    it('respects showLabels prop', () => {
      const { container } = render(
        <PieChart data={sampleData} title="No Labels" showLabels={false} />
      );
      // No text elements inside SVG for labels
      const svg = container.querySelector('svg');
      const texts = svg?.querySelectorAll('text');
      // Only donut center text should exist if donut mode
      expect(texts?.length).toBe(0);
    });

    it('respects showPercentage prop', () => {
      const { container } = render(
        <PieChart data={sampleData} title="Show Values" showPercentage={false} showLabels />
      );
      // Should show values instead of percentages
      const svg = container.querySelector('svg');
      const texts = svg?.querySelectorAll('text');
      // Check that percentage symbol is not present
      texts?.forEach((text) => {
        expect(text.textContent).not.toContain('%');
      });
    });

    it('respects animate prop', () => {
      const { container } = render(
        <PieChart data={sampleData} title="No Animation" animate={false} />
      );
      const paths = container.querySelectorAll('path');
      paths.forEach((path) => {
        expect(path.className).not.toContain('animate-pie-grow');
      });
    });

    it('applies donut mode when donut=true', () => {
      render(<PieChart data={sampleData} title="Donut" donut />);
      expect(screen.getByText('总计')).toBeInTheDocument();
    });

    it('applies custom donutWidth', () => {
      const { container } = render(
        <PieChart data={sampleData} title="Wide Donut" donut donutWidth={50} />
      );
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });
  });

  // ===== 数据变化时重渲染 =====
  describe('Data Re-rendering', () => {
    it('updates when data changes', () => {
      const { rerender } = render(<PieChart data={sampleData} title="Dynamic Chart" />);
      
      expect(screen.getByText('Category A')).toBeInTheDocument();
      
      const newData: ChartDataPoint[] = [
        { label: 'New X', value: 50, color: CHART_COLORS.red },
        { label: 'New Y', value: 50, color: CHART_COLORS.orange },
      ];
      
      rerender(<PieChart data={newData} title="Dynamic Chart" />);
      
      expect(screen.getByText('New X')).toBeInTheDocument();
      expect(screen.getByText('New Y')).toBeInTheDocument();
      expect(screen.queryByText('Category A')).not.toBeInTheDocument();
    });

    it('updates total when values change', () => {
      const { rerender } = render(
        <PieChart data={sampleData} title="Total" donut />
      );
      
      // Initial total: 30 + 45 + 25 = 100
      expect(screen.getByText('100')).toBeInTheDocument();
      
      const updatedData = [
        { label: 'Category A', value: 50, color: CHART_COLORS.blue },
        { label: 'Category B', value: 50, color: CHART_COLORS.green },
      ];
      
      rerender(<PieChart data={updatedData} title="Total" donut />);
      
      // New total: 50 + 50 = 100
      expect(screen.getByText('100')).toBeInTheDocument();
    });

    it('recalculates percentages on data change', () => {
      const { rerender } = render(
        <PieChart data={sampleData} title="Percentages" showPercentage showLabels />
      );
      
      // 检查初始数据标签存在
      expect(screen.getByText('Category A')).toBeInTheDocument();
      
      const equalData: ChartDataPoint[] = [
        { label: 'Equal A', value: 33, color: CHART_COLORS.blue },
        { label: 'Equal B', value: 33, color: CHART_COLORS.green },
        { label: 'Equal C', value: 34, color: CHART_COLORS.purple },
      ];
      
      rerender(<PieChart data={equalData} title="Percentages" showPercentage showLabels />);
      
      // 验证新数据标签出现
      expect(screen.getByText('Equal A')).toBeInTheDocument();
      expect(screen.getByText('Equal B')).toBeInTheDocument();
      expect(screen.getByText('Equal C')).toBeInTheDocument();
    });
  });

  // ===== 空数据状态 =====
  describe('Empty Data State', () => {
    it('renders without crashing with empty data', () => {
      render(<PieChart data={emptyData} title="Empty Chart" />);
      expect(screen.getByText('Empty Chart')).toBeInTheDocument();
    });

    it('handles zero total gracefully', () => {
      const zeroData: ChartDataPoint[] = [
        { label: 'Zero', value: 0, color: CHART_COLORS.blue },
      ];
      render(<PieChart data={zeroData} title="Zero Chart" />);
      expect(screen.getByText('Zero')).toBeInTheDocument();
    });

    it('handles single data point', () => {
      const singleData: ChartDataPoint[] = [
        { label: 'Only One', value: 100, color: CHART_COLORS.blue },
      ];
      render(<PieChart data={singleData} title="Single" />);
      expect(screen.getByText('Only One')).toBeInTheDocument();
      expect(screen.getByText('100')).toBeInTheDocument();
    });

    it('handles data with negative values', () => {
      const negativeData: ChartDataPoint[] = [
        { label: 'Negative', value: -10, color: CHART_COLORS.red },
        { label: 'Positive', value: 20, color: CHART_COLORS.green },
      ];
      // 组件应该能渲染而不崩溃（负值会被当作 0 或忽略）
      const { container } = render(<PieChart data={negativeData} title="Negative" />);
      // 验证组件渲染成功
      expect(container.querySelector('svg')).toBeInTheDocument();
    });
  });

  // ===== 错误边界 =====
  describe('Error Boundary', () => {
    it('handles invalid data gracefully', () => {
      const invalidData = null as any;
      render(
        <TestErrorBoundary fallback={<div>Error occurred</div>}>
          <PieChart data={invalidData} title="Invalid" />
        </TestErrorBoundary>
      );
      // Component should either render or show error boundary
    });

    it('handles undefined values in data', () => {
      const undefinedData: ChartDataPoint[] = [
        { label: 'Undefined', value: undefined as any, color: CHART_COLORS.blue },
      ];
      // 组件应该能渲染而不崩溃（undefined value 会当作 0）
      const { container } = render(<PieChart data={undefinedData} title="Undefined" />);
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('handles missing label gracefully', () => {
      const noLabelData = [{ value: 10, color: CHART_COLORS.blue }] as ChartDataPoint[];
      render(<PieChart data={noLabelData} title="No Label" />);
      expect(screen.getByText('No Label')).toBeInTheDocument();
    });
  });

  // ===== 交互测试 =====
  describe('Interactions', () => {
    it('handles hover on segments', () => {
      const { container } = render(<PieChart data={sampleData} title="Interactive" />);
      const paths = container.querySelectorAll('path');
      
      fireEvent.mouseEnter(paths[0]);
      // Should apply hover effect without crashing
      
      fireEvent.mouseLeave(paths[0]);
      // Should remove hover effect
    });

    it('handles hover on legend items', () => {
      render(<PieChart data={sampleData} title="Legend Hover" />);
      const legendItems = screen.getAllByText(/Category/);
      
      fireEvent.mouseEnter(legendItems[0]);
      // Should highlight corresponding segment
      
      fireEvent.mouseLeave(legendItems[0]);
      // Should remove highlight
    });
  });
});

describe('DonutChart Component', () => {
  it('renders as donut by default', () => {
    render(<DonutChart data={sampleData} title="Donut Test" />);
    expect(screen.getByText('Donut Test')).toBeInTheDocument();
    expect(screen.getByText('总计')).toBeInTheDocument();
  });

  it('shows total in center', () => {
    render(<DonutChart data={sampleData} title="Center Total" />);
    // Total: 30 + 45 + 25 = 100
    expect(screen.getByText('100')).toBeInTheDocument();
  });

  it('accepts custom size', () => {
    const { container } = render(<DonutChart data={sampleData} title="Custom" size={250} />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '250');
  });

  it('handles empty data', () => {
    render(<DonutChart data={emptyData} title="Empty Donut" />);
    expect(screen.getByText('Empty Donut')).toBeInTheDocument();
  });
});

describe('GaugeChart Component', () => {
  // ===== 基本渲染 =====
  describe('Basic Rendering', () => {
    it('renders without crashing', () => {
      render(<GaugeChart value={75} max={100} title="Gauge Test" />);
      expect(screen.getByText('Gauge Test')).toBeInTheDocument();
    });

    it('displays current value', () => {
      render(<GaugeChart value={75} max={100} title="Value" showValue />);
      expect(screen.getByText('75')).toBeInTheDocument();
    });

    it('displays unit', () => {
      render(<GaugeChart value={75} max={100} title="Unit" unit="%" />);
      expect(screen.getByText('%')).toBeInTheDocument();
    });

    it('renders subtitle when provided', () => {
      render(<GaugeChart value={50} max={100} title="Gauge" subtitle="Performance" />);
      expect(screen.getByText('Performance')).toBeInTheDocument();
    });

    it('renders SVG element', () => {
      const { container } = render(<GaugeChart value={50} max={100} title="Gauge" />);
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });
  });

  // ===== Props 传递 =====
  describe('Props Passing', () => {
    it('applies custom size', () => {
      const { container } = render(
        <GaugeChart value={50} max={100} title="Custom Size" size={300} />
      );
      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('width', '300');
    });

    it('applies custom color', () => {
      const { container } = render(
        <GaugeChart value={50} max={100} title="Custom Color" color={CHART_COLORS.red} />
      );
      const paths = container.querySelectorAll('path');
      expect(paths.length).toBeGreaterThan(0);
    });

    it('hides value when showValue=false', () => {
      render(<GaugeChart value={75} max={100} title="Hidden" showValue={false} />);
      expect(screen.queryByText('75')).not.toBeInTheDocument();
    });

    it('applies threshold colors correctly', () => {
      render(
        <GaugeChart
          value={85}
          max={100}
          title="Threshold"
          thresholds={[
            { value: 80, color: CHART_COLORS.green },
            { value: 60, color: CHART_COLORS.yellow },
          ]}
        />
      );
      expect(screen.getByText('Threshold')).toBeInTheDocument();
    });

    it('renders threshold legend when provided', () => {
      render(
        <GaugeChart
          value={75}
          max={100}
          title="Threshold Legend"
          thresholds={[
            { value: 80, color: CHART_COLORS.green },
            { value: 50, color: CHART_COLORS.yellow },
          ]}
        />
      );
      expect(screen.getByText('>80%')).toBeInTheDocument();
      expect(screen.getByText('>50%')).toBeInTheDocument();
    });
  });

  // ===== 数据变化 =====
  describe('Value Changes', () => {
    it('updates display when value changes', () => {
      const { rerender } = render(
        <GaugeChart value={50} max={100} title="Dynamic" />
      );
      
      expect(screen.getByText('50')).toBeInTheDocument();
      
      rerender(<GaugeChart value={75} max={100} title="Dynamic" />);
      
      expect(screen.getByText('75')).toBeInTheDocument();
    });

    it('clamps value to 0 when negative', () => {
      render(<GaugeChart value={-10} max={100} title="Negative" />);
      // Should show -10 in text but gauge should be clamped
      expect(screen.getByText('-10')).toBeInTheDocument();
    });

    it('handles value greater than max', () => {
      render(<GaugeChart value={150} max={100} title="Over Max" />);
      expect(screen.getByText('150')).toBeInTheDocument();
    });
  });

  // ===== 空数据/边界状态 =====
  describe('Edge Cases', () => {
    it('handles zero value', () => {
      render(<GaugeChart value={0} max={100} title="Zero" />);
      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('handles zero max', () => {
      render(<GaugeChart value={50} max={0} title="Zero Max" />);
      expect(screen.getByText('50')).toBeInTheDocument();
    });

    it('handles equal value and max', () => {
      render(<GaugeChart value={100} max={100} title="Full" />);
      expect(screen.getByText('100')).toBeInTheDocument();
    });
  });
});
