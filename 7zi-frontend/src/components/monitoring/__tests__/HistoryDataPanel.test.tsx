/**
 * HistoryDataPanel Component Tests
 * 历史数据面板组件单元测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { HistoryDataPanel } from '../HistoryDataPanel'

// Mock the monitoring module
vi.mock('@/lib/monitoring', () => ({
  monitor: {
    getMetrics: vi.fn().mockResolvedValue([]),
    getAggregatedMetrics: vi.fn().mockResolvedValue({
      apiMetrics: {
        totalRequests: 100,
        averageResponseTime: 500,
        successRate: 0.95,
        errorCount: 5,
        errorRate: 0.05,
      },
      operationMetrics: {
        totalOperations: 50,
        averageDuration: 1000,
        successRate: 0.98,
      },
      errorMetrics: {
        totalErrors: 5,
        errorsByType: {
          'NetworkError': 3,
          'TimeoutError': 2,
        },
      },
      timeWindow: {
        start: Date.now() - 3600000,
        end: Date.now(),
      },
    }),
    getAlarms: vi.fn().mockResolvedValue([]),
  },
}))

describe('HistoryDataPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders history data panel', () => {
    render(<HistoryDataPanel />)
    expect(screen.getByText('History Data')).toBeInTheDocument()
  })

  it('renders time range selector', () => {
    render(<HistoryDataPanel />)
    expect(screen.getByText('Time Range')).toBeInTheDocument()
  })

  it('renders metric type selector', () => {
    render(<HistoryDataPanel />)
    expect(screen.getByText('Metric Type')).toBeInTheDocument()
  })

  it('renders refresh button', () => {
    render(<HistoryDataPanel />)
    expect(screen.getByText('Refresh')).toBeInTheDocument()
  })

  it('renders export button', () => {
    render(<HistoryDataPanel />)
    expect(screen.getByText('Export')).toBeInTheDocument()
  })

  it('renders aggregated metrics cards', async () => {
    render(<HistoryDataPanel />)
    await waitFor(() => {
      expect(screen.getByText('API Requests')).toBeInTheDocument()
      expect(screen.getByText('Operations')).toBeInTheDocument()
      expect(screen.getByText('Errors')).toBeInTheDocument()
    })
  })

  it('renders chart tabs', async () => {
    render(<HistoryDataPanel />)
    await waitFor(() => {
      expect(screen.getByText('Response Time')).toBeInTheDocument()
      expect(screen.getByText('Operation Duration')).toBeInTheDocument()
      expect(screen.getByText('Error Rate')).toBeInTheDocument()
    })
  })

  it('renders raw metrics table', async () => {
    render(<HistoryDataPanel />)
    await waitFor(() => {
      expect(screen.getByText('Raw Metrics')).toBeInTheDocument()
    })
  })

  it('shows export panel when export button clicked', async () => {
    render(<HistoryDataPanel />)
    const exportButton = screen.getByText('Export')
    fireEvent.click(exportButton)

    await waitFor(() => {
      expect(screen.getByText('Export Data')).toBeInTheDocument()
    })
  })

  it('renders time range options', () => {
    render(<HistoryDataPanel />)
    expect(screen.getByText('Last 15 minutes')).toBeInTheDocument()
    expect(screen.getByText('Last 1 hour')).toBeInTheDocument()
    expect(screen.getByText('Last 6 hours')).toBeInTheDocument()
    expect(screen.getByText('Last 24 hours')).toBeInTheDocument()
    expect(screen.getByText('Last 7 days')).toBeInTheDocument()
  })

  it('renders metric type options', () => {
    render(<HistoryDataPanel />)
    expect(screen.getByText('All Metrics')).toBeInTheDocument()
    expect(screen.getByText('API Requests')).toBeInTheDocument()
    expect(screen.getByText('Operations')).toBeInTheDocument()
    expect(screen.getByText('Errors')).toBeInTheDocument()
    expect(screen.getByText('Custom')).toBeInTheDocument()
  })

  it('displays aggregated metrics values', async () => {
    render(<HistoryDataPanel />)
    await waitFor(() => {
      expect(screen.getByText('100')).toBeInTheDocument()
      expect(screen.getByText('50')).toBeInTheDocument()
      expect(screen.getByText('5')).toBeInTheDocument()
    })
  })

  it('displays error breakdown', async () => {
    render(<HistoryDataPanel />)
    await waitFor(() => {
      expect(screen.getByText('NetworkError')).toBeInTheDocument()
      expect(screen.getByText('TimeoutError')).toBeInTheDocument()
    })
  })
})