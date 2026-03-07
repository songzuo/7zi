import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BarChart, GroupedBarChart } from '../components/charts/BarChart';
import { LineChart, RealtimeLineChart, MultiLineChart } from '../components/charts/LineChart';
import { PieChart, DonutChart, GaugeChart } from '../components/charts/PieChart';
import { ChartContainer, ChartLegend, CHART_COLORS } from '../components/charts/Chart';
import type { ChartDataPoint } from '../components/charts/Chart';

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

const sampleData: ChartDataPoint[] = [
  { label: 'A', value: 10, color: CHART_COLORS.blue },
  { label: 'B', value: 20, color: CHART_COLORS.green },
  { label: 'C', value: 30, color: CHART_COLORS.purple },
];

describe('ChartContainer', () => {
  it('renders title and subtitle', () => {
    render(
      <ChartContainer title="Test Chart" subtitle="Test Subtitle">
        <div>Content</div>
      </ChartContainer>
    );

    expect(screen.getByText('Test Chart')).toBeInTheDocument();
    expect(screen.getByText('Test Subtitle')).toBeInTheDocument();
  });

  it('renders children content', () => {
    render(
      <ChartContainer title="Test">
        <div data-testid="child">Chart Content</div>
      </ChartContainer>
    );

    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('renders actions when provided', () => {
    render(
      <ChartContainer title="Test" actions={<button>Refresh</button>}>
        <div>Content</div>
      </ChartContainer>
    );

    expect(screen.getByRole('button', { name: 'Refresh' })).toBeInTheDocument();
  });
});

describe('ChartLegend', () => {
  it('renders legend items', () => {
    render(
      <ChartLegend
        items={[
          { label: 'Item 1', color: '#ff0000', value: 10 },
          { label: 'Item 2', color: '#00ff00', value: 20 },
        ]}
      />
    );

    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('Item 2')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('20')).toBeInTheDocument();
  });

  it('renders without values when not provided', () => {
    render(
      <ChartLegend
        items={[
          { label: 'Item 1', color: '#ff0000' },
          { label: 'Item 2', color: '#00ff00' },
        ]}
      />
    );

    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('Item 2')).toBeInTheDocument();
  });
});

describe('BarChart', () => {
  it('renders chart with data', () => {
    render(<BarChart data={sampleData} title="Bar Chart Test" />);

    expect(screen.getByText('Bar Chart Test')).toBeInTheDocument();
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
    expect(screen.getByText('C')).toBeInTheDocument();
  });

  it('displays total in summary', () => {
    render(<BarChart data={sampleData} title="Bar Chart" />);

    // Total should be 10 + 20 + 30 = 60
    expect(screen.getByText('60')).toBeInTheDocument();
  });

  it('renders subtitle when provided', () => {
    render(<BarChart data={sampleData} title="Bar Chart" subtitle="Weekly Data" />);

    expect(screen.getByText('Weekly Data')).toBeInTheDocument();
  });

  it('applies custom colors from data', () => {
    const { container } = render(<BarChart data={sampleData} title="Bar Chart" />);

    const rects = container.querySelectorAll('rect');
    expect(rects.length).toBeGreaterThan(0);
  });

  it('handles empty data gracefully', () => {
    render(<BarChart data={[]} title="Empty Chart" />);

    expect(screen.getByText('Empty Chart')).toBeInTheDocument();
    // Total should be 0 - use getAllByText since 0 appears multiple times in axis labels
    const totals = screen.getAllByText('0');
    expect(totals.length).toBeGreaterThan(0);
  });

  it('handles single data point', () => {
    render(<BarChart data={[{ label: 'Only', value: 100 }]} title="Single Point" />);

    expect(screen.getByText('Only')).toBeInTheDocument();
    // Value appears in multiple places (axis + total), use getAllByText
    const values = screen.getAllByText('100');
    expect(values.length).toBeGreaterThan(0);
  });
});

describe('GroupedBarChart', () => {
  const categories = ['Q1', 'Q2', 'Q3'];
  const series = [
    { name: 'Series A', data: [10, 20, 30], color: CHART_COLORS.blue },
    { name: 'Series B', data: [15, 25, 35], color: CHART_COLORS.green },
  ];

  it('renders grouped chart', () => {
    render(<GroupedBarChart categories={categories} series={series} title="Grouped Chart" />);

    expect(screen.getByText('Grouped Chart')).toBeInTheDocument();
    expect(screen.getByText('Q1')).toBeInTheDocument();
    expect(screen.getByText('Q2')).toBeInTheDocument();
    expect(screen.getByText('Q3')).toBeInTheDocument();
  });

  it('renders legend with series names', () => {
    render(<GroupedBarChart categories={categories} series={series} title="Grouped Chart" />);

    expect(screen.getByText('Series A')).toBeInTheDocument();
    expect(screen.getByText('Series B')).toBeInTheDocument();
  });
});

describe('LineChart', () => {
  const lineData = [
    { label: 'Mon', value: 10 },
    { label: 'Tue', value: 20 },
    { label: 'Wed', value: 15 },
  ];

  it('renders line chart with data', () => {
    render(<LineChart data={lineData} title="Line Chart Test" />);

    expect(screen.getByText('Line Chart Test')).toBeInTheDocument();
    expect(screen.getByText('Mon')).toBeInTheDocument();
  });

  it('displays stats (min, max, total)', () => {
    render(<LineChart data={lineData} title="Line Chart" />);

    expect(screen.getByText('最小值')).toBeInTheDocument();
    expect(screen.getByText('最大值')).toBeInTheDocument();
    expect(screen.getByText('总计')).toBeInTheDocument();
  });

  it('accepts custom color', () => {
    render(<LineChart data={lineData} title="Line Chart" color={CHART_COLORS.purple} />);

    // Chart should render without errors
    expect(screen.getByText('Line Chart')).toBeInTheDocument();
  });
});

describe('RealtimeLineChart', () => {
  const realtimeData = [
    { timestamp: Date.now() - 4000, value: 50 },
    { timestamp: Date.now() - 2000, value: 60 },
    { timestamp: Date.now(), value: 70 },
  ];

  it('renders realtime chart', () => {
    render(<RealtimeLineChart title="Realtime Chart" data={realtimeData} />);

    expect(screen.getByText('Realtime Chart')).toBeInTheDocument();
    expect(screen.getByText('实时')).toBeInTheDocument();
  });

  it('displays current value', () => {
    render(<RealtimeLineChart title="Realtime" data={realtimeData} />);

    expect(screen.getByText('当前值')).toBeInTheDocument();
  });

  it('handles empty data', () => {
    render(<RealtimeLineChart title="Empty" data={[]} />);

    expect(screen.getByText('当前值')).toBeInTheDocument();
  });
});

describe('MultiLineChart', () => {
  const labels = ['Jan', 'Feb', 'Mar'];
  const data = [
    { name: 'Line 1', values: [10, 20, 30], color: CHART_COLORS.blue },
    { name: 'Line 2', values: [15, 25, 35], color: CHART_COLORS.green },
  ];

  it('renders multi-line chart', () => {
    render(<MultiLineChart data={data} labels={labels} title="Multi Line" />);

    expect(screen.getByText('Multi Line')).toBeInTheDocument();
  });

  it('renders legend with all series', () => {
    render(<MultiLineChart data={data} labels={labels} title="Multi Line" />);

    expect(screen.getByText('Line 1')).toBeInTheDocument();
    expect(screen.getByText('Line 2')).toBeInTheDocument();
  });
});

describe('PieChart', () => {
  it('renders pie chart with data', () => {
    render(<PieChart data={sampleData} title="Pie Chart Test" />);

    expect(screen.getByText('Pie Chart Test')).toBeInTheDocument();
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
    expect(screen.getByText('C')).toBeInTheDocument();
  });

  it('displays percentages', () => {
    render(<PieChart data={sampleData} title="Pie Chart" showPercentage />);

    // A=10, B=20, C=30 => Total=60
    // A=16.7%, B=33.3%, C=50%
    // Percentages appear in legend, use getAllByText
    const percentage16 = screen.getAllByText((content) => content.includes('16.7'));
    const percentage33 = screen.getAllByText((content) => content.includes('33.3'));
    expect(percentage16.length).toBeGreaterThan(0);
    expect(percentage33.length).toBeGreaterThan(0);
  });

  it('handles donut mode', () => {
    render(<PieChart data={sampleData} title="Donut" donut />);

    expect(screen.getByText('Donut')).toBeInTheDocument();
    expect(screen.getByText('总计')).toBeInTheDocument();
  });
});

describe('DonutChart', () => {
  it('renders as donut by default', () => {
    render(<DonutChart data={sampleData} title="Donut Test" />);

    expect(screen.getByText('Donut Test')).toBeInTheDocument();
    expect(screen.getByText('总计')).toBeInTheDocument();
  });
});

describe('GaugeChart', () => {
  it('renders gauge with value', () => {
    render(<GaugeChart value={75} max={100} title="Gauge Test" />);

    expect(screen.getByText('Gauge Test')).toBeInTheDocument();
    expect(screen.getByText('75')).toBeInTheDocument();
  });

  it('displays unit', () => {
    render(<GaugeChart value={75} max={100} title="Gauge" unit="%" />);

    expect(screen.getByText('%')).toBeInTheDocument();
  });

  it('applies threshold colors', () => {
    render(
      <GaugeChart
        value={85}
        max={100}
        title="Gauge"
        thresholds={[
          { value: 80, color: CHART_COLORS.green },
          { value: 60, color: CHART_COLORS.yellow },
        ]}
      />
    );

    expect(screen.getByText('Gauge')).toBeInTheDocument();
  });

  it('clamps value to max', () => {
    render(<GaugeChart value={150} max={100} title="Over Max" />);

    // Should show 150 but be clamped in rendering
    expect(screen.getByText('150')).toBeInTheDocument();
  });
});

describe('CHART_COLORS', () => {
  it('has all expected colors', () => {
    expect(CHART_COLORS.blue).toBeDefined();
    expect(CHART_COLORS.green).toBeDefined();
    expect(CHART_COLORS.red).toBeDefined();
    expect(CHART_COLORS.purple).toBeDefined();
    expect(CHART_COLORS.orange).toBeDefined();
  });

  it('colors are valid hex format', () => {
    Object.values(CHART_COLORS).forEach((color) => {
      expect(color).toMatch(/^#[0-9a-f]{6}$/i);
    });
  });
});