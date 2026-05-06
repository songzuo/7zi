/**
 * PerformanceChart Component Tests
 * 性能图表组件单元测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { PerformanceChart } from '../PerformanceChart'

describe('PerformanceChart', () => {
  const mockData = [
    { timestamp: Date.now() - 4000, value: 100 },
    { timestamp: Date.now() - 3000, value: 150 },
    { timestamp: Date.now() - 2000, value: 120 },
    { timestamp: Date.now() - 1000, value: 180 },
    { timestamp: Date.now(), value: 160 },
  ]

  beforeEach(() => {
    // Mock ResizeObserver
    global.ResizeObserver = vi.fn().mockImplementation(() => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    }))
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders chart with title', () => {
    render(<PerformanceChart data={mockData} title="Test Chart" />)
    expect(screen.getByText('Test Chart')).toBeInTheDocument()
  })

  it('renders chart with unit', () => {
    render(<PerformanceChart data={mockData} title="Test Chart" unit="ms" />)
    expect(screen.getByText('Test Chart')).toBeInTheDocument()
  })

  it('renders chart with threshold', () => {
    render(
      <PerformanceChart
        data={mockData}
        title="Test Chart"
        threshold={200}
        thresholdLabel="200ms Threshold"
      />
    )
    expect(screen.getByText('Test Chart')).toBeInTheDocument()
  })

  it('renders empty chart when no data', () => {
    render(<PerformanceChart data={[]} title="Empty Chart" />)
    expect(screen.getByText('Empty Chart')).toBeInTheDocument()
  })

  it('renders chart with custom color', () => {
    render(<PerformanceChart data={mockData} title="Test Chart" color="#ff0000" />)
    expect(screen.getByText('Test Chart')).toBeInTheDocument()
  })

  it('renders chart with custom height', () => {
    render(<PerformanceChart data={mockData} title="Test Chart" height={300} />)
    expect(screen.getByText('Test Chart')).toBeInTheDocument()
  })

  it('renders chart without grid', () => {
    render(<PerformanceChart data={mockData} title="Test Chart" showGrid={false} />)
    expect(screen.getByText('Test Chart')).toBeInTheDocument()
  })

  it('renders chart without area', () => {
    render(<PerformanceChart data={mockData} title="Test Chart" showArea={false} />)
    expect(screen.getByText('Test Chart')).toBeInTheDocument()
  })

  it('renders chart with custom Y-axis range', () => {
    render(
      <PerformanceChart
        data={mockData}
        title="Test Chart"
        minY={0}
        maxY={200}
      />
    )
    expect(screen.getByText('Test Chart')).toBeInTheDocument()
  })

  it('renders SVG element', () => {
    const { container } = render(<PerformanceChart data={mockData} title="Test Chart" />)
    const svg = container.querySelector('svg')
    expect(svg).toBeInTheDocument()
  })

  it('handles mouse events on chart', async () => {
    const { container } = render(<PerformanceChart data={mockData} title="Test Chart" />)
    const svg = container.querySelector('svg')

    if (svg) {
      // Mock SVG dimensions for testing
      Object.defineProperty(svg, 'clientWidth', { value: 400, configurable: true })
      Object.defineProperty(svg, 'clientHeight', { value: 200, configurable: true })

      fireEvent.mouseMove(svg, {
        clientX: 100,
        clientY: 100,
      })

      await waitFor(() => {
        const tooltip = svg.querySelector('.tooltip')
        expect(tooltip).toBeInTheDocument()
      })
    }
  })

  it('removes tooltip on mouse leave', async () => {
    const { container } = render(<PerformanceChart data={mockData} title="Test Chart" />)
    const svg = container.querySelector('svg')

    if (svg) {
      // Mock SVG dimensions for testing
      Object.defineProperty(svg, 'clientWidth', { value: 400, configurable: true })
      Object.defineProperty(svg, 'clientHeight', { value: 200, configurable: true })

      fireEvent.mouseMove(svg, {
        clientX: 100,
        clientY: 100,
      })

      await waitFor(() => {
        const tooltip = svg.querySelector('.tooltip')
        expect(tooltip).toBeInTheDocument()
      })

      fireEvent.mouseLeave(svg)

      await waitFor(() => {
        const tooltip = svg.querySelector('.tooltip')
        expect(tooltip).not.toBeInTheDocument()
      })
    }
  })
})