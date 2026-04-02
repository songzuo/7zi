/**
 * Analytics Chart Tests
 * Tests for AnalyticsChart.tsx - analytics visualization component
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import AnalyticsChart from '../AnalyticsChart'
import { type ChartConfig } from '@/lib/types/analytics'

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
}))

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  BarChart3: ({ className }: { className?: string }) => (
    <div data-testid="bar-chart-icon" className={className} />
  ),
  LineChart: ({ className }: { className?: string }) => (
    <div data-testid="line-chart-icon" className={className} />
  ),
  PieChart: ({ className }: { className?: string }) => (
    <div data-testid="pie-chart-icon" className={className} />
  ),
  Activity: ({ className }: { className?: string }) => (
    <div data-testid="activity-icon" className={className} />
  ),
  Download: ({ className }: { className?: string }) => (
    <div data-testid="download-icon" className={className} />
  ),
  TrendingUp: ({ className }: { className?: string }) => (
    <div data-testid="trending-up-icon" className={className} />
  ),
}))

describe('AnalyticsChart Component', () => {
  const mockData = [
    { date: '2024-01-01', timestamp: '2024-01-01T00:00:00Z', tasks: 120, bugs: 25 },
    { date: '2024-01-02', timestamp: '2024-01-02T00:00:00Z', tasks: 135, bugs: 22 },
    { date: '2024-01-03', timestamp: '2024-01-03T00:00:00Z', tasks: 145, bugs: 30 },
    { date: '2024-01-04', timestamp: '2024-01-04T00:00:00Z', tasks: 110, bugs: 20 },
  ]

  const createMockConfig = (overrides: Partial<ChartConfig> = {}): ChartConfig => ({
    type: 'bar',
    title: 'Test Chart',
    data: mockData,
    metrics: ['tasks', 'bugs'],
    ...overrides,
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render without crashing', () => {
    render(<AnalyticsChart config={createMockConfig()} />)

    expect(screen.getByTestId('responsive-container')).toBeInTheDocument()
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument()
  })

  it('should render chart with provided config', () => {
    render(<AnalyticsChart config={createMockConfig({ title: 'Test Analytics' })} />)

    const chart = screen.getByTestId('bar-chart')
    expect(chart).toBeInTheDocument()
  })

  it('should render empty state when no data is provided', () => {
    render(<AnalyticsChart config={createMockConfig({ data: [] })} />)

    expect(screen.getByTestId('responsive-container')).toBeInTheDocument()
  })

  it('should render chart axes', () => {
    render(<AnalyticsChart config={createMockConfig()} />)

    expect(screen.getByTestId('x-axis')).toBeInTheDocument()
    expect(screen.getByTestId('y-axis')).toBeInTheDocument()
  })

  it('should render legend', () => {
    render(<AnalyticsChart config={createMockConfig({ showLegend: true })} />)

    expect(screen.getByTestId('legend')).toBeInTheDocument()
  })

  it('should render tooltip', () => {
    render(<AnalyticsChart config={createMockConfig({ showTooltip: true })} />)

    expect(screen.getByTestId('tooltip')).toBeInTheDocument()
  })

  it('should render grid', () => {
    render(<AnalyticsChart config={createMockConfig()} />)

    expect(screen.getByTestId('cartesian-grid')).toBeInTheDocument()
  })

  it('should render bar component', () => {
    render(<AnalyticsChart config={createMockConfig({ type: 'bar' })} />)

    expect(screen.getByTestId('bar')).toBeInTheDocument()
  })

  it('should handle single data point', () => {
    const singleData = [{ date: '2024-01-01', timestamp: '2024-01-01T00:00:00Z', tasks: 120 }]

    render(<AnalyticsChart config={createMockConfig({ data: singleData })} />)

    expect(screen.getByTestId('responsive-container')).toBeInTheDocument()
  })

  it('should handle large dataset', () => {
    const largeData = Array.from({ length: 50 }, (_, i) => ({
      date: `2024-01-${String(i + 1).padStart(2, '0')}`,
      timestamp: `2024-01-${String(i + 1).padStart(2, '0')}T00:00:00Z`,
      tasks: Math.floor(Math.random() * 1000),
      bugs: Math.floor(Math.random() * 100),
    }))

    render(<AnalyticsChart config={createMockConfig({ data: largeData })} />)

    expect(screen.getByTestId('responsive-container')).toBeInTheDocument()
  })

  it('should handle zero values', () => {
    const zeroData = [
      { date: '2024-01-01', timestamp: '2024-01-01T00:00:00Z', tasks: 0, bugs: 0 },
      { date: '2024-01-02', timestamp: '2024-01-02T00:00:00Z', tasks: 0, bugs: 0 },
      { date: '2024-01-03', timestamp: '2024-01-03T00:00:00Z', tasks: 0, bugs: 0 },
    ]

    render(<AnalyticsChart config={createMockConfig({ data: zeroData })} />)

    expect(screen.getByTestId('responsive-container')).toBeInTheDocument()
  })

  it('should handle negative values if supported', () => {
    const negativeData = [
      { date: '2024-01-01', timestamp: '2024-01-01T00:00:00Z', tasks: -10, bugs: 20 },
      { date: '2024-01-02', timestamp: '2024-01-02T00:00:00Z', tasks: 15, bugs: -5 },
      { date: '2024-01-03', timestamp: '2024-01-03T00:00:00Z', tasks: -20, bugs: 10 },
    ]

    render(<AnalyticsChart config={createMockConfig({ data: negativeData })} />)

    expect(screen.getByTestId('responsive-container')).toBeInTheDocument()
  })

  it('should render chart title', () => {
    render(<AnalyticsChart config={createMockConfig({ title: 'My Custom Chart' })} />)

    expect(screen.getByText('My Custom Chart')).toBeInTheDocument()
  })

  it('should render with custom className', () => {
    render(<AnalyticsChart config={createMockConfig()} className="custom-class" />)

    expect(screen.getByTestId('responsive-container').closest('.custom-class')).toBeInTheDocument()
  })

  it('should render with custom height', () => {
    render(<AnalyticsChart config={createMockConfig({ height: 500 })} />)

    expect(screen.getByTestId('responsive-container')).toBeInTheDocument()
  })

  it('should render with custom colors', () => {
    render(<AnalyticsChart config={createMockConfig({ colors: ['#ff0000', '#00ff00'] })} />)

    expect(screen.getByTestId('responsive-container')).toBeInTheDocument()
  })

  it('should hide legend when showLegend is false', () => {
    render(<AnalyticsChart config={createMockConfig({ showLegend: false })} />)

    const legend = screen.queryByTestId('legend')
    expect(legend).not.toBeInTheDocument()
  })

  it('should hide tooltip when showTooltip is false', () => {
    render(<AnalyticsChart config={createMockConfig({ showTooltip: false })} />)

    const tooltip = screen.queryByTestId('tooltip')
    expect(tooltip).not.toBeInTheDocument()
  })
})
