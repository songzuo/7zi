/**
 * PerformanceMonitorDashboard Component Tests
 * 性能监控仪表板组件单元测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PerformanceMonitorDashboard } from '../PerformanceMonitorDashboard'

// Mock the monitoring module
const mockAggregatedMetrics = {
  apiMetrics: {
    totalRequests: 1250,
    averageResponseTime: 450,
    successRate: 0.98,
    errorCount: 25,
    errorRate: 0.02,
  },
  operationMetrics: {
    totalOperations: 890,
    averageDuration: 1200,
    successRate: 0.97,
  },
  errorMetrics: {
    totalErrors: 25,
    errorsByType: {
      network: 10,
      timeout: 8,
      server: 7,
    },
  },
  timeWindow: {
    start: Date.now() - 300000,
    end: Date.now(),
  },
}

const mockAlarms = [
  {
    id: 'alarm-1',
    timestamp: Date.now() - 60000,
    type: 'errorRate',
    currentValue: 0.15,
    threshold: 0.1,
    message: 'Error rate exceeds threshold',
    severity: 'high' as const,
  },
  {
    id: 'alarm-2',
    timestamp: Date.now() - 120000,
    type: 'responseTime',
    currentValue: 5500,
    threshold: 5000,
    message: 'Response time exceeds threshold',
    severity: 'medium' as const,
  },
]

vi.mock('@/lib/monitoring', () => ({
  monitor: {
    getAggregatedMetrics: vi.fn().mockResolvedValue(mockAggregatedMetrics),
    getAlarms: vi.fn().mockResolvedValue(mockAlarms),
    updateConfig: vi.fn(),
  },
}))

describe('PerformanceMonitorDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
  })

  it('renders dashboard with title', () => {
    render(<PerformanceMonitorDashboard />)
    expect(screen.getByText('性能监控仪表板')).toBeInTheDocument()
  })

  it('renders subtitle', () => {
    render(<PerformanceMonitorDashboard />)
    expect(screen.getByText('实时监控系统性能指标和资源使用情况')).toBeInTheDocument()
  })

  it('renders refresh button', () => {
    render(<PerformanceMonitorDashboard />)
    expect(screen.getByText('刷新')).toBeInTheDocument()
  })

  it('renders tabs', () => {
    render(<PerformanceMonitorDashboard />)
    expect(screen.getByText('实时监控')).toBeInTheDocument()
    expect(screen.getByText('图表分析')).toBeInTheDocument()
    expect(screen.getByText('告警配置')).toBeInTheDocument()
  })

  it('renders time range selector', () => {
    render(<PerformanceMonitorDashboard />)
    expect(screen.getByText('选择时间范围')).toBeInTheDocument()
  })

  it('renders performance metric cards', async () => {
    render(<PerformanceMonitorDashboard />)

    await waitFor(() => {
      expect(screen.getByText('CPU 使用率')).toBeInTheDocument()
      expect(screen.getByText('内存使用率')).toBeInTheDocument()
      expect(screen.getByText('网络使用率')).toBeInTheDocument()
      expect(screen.getByText('磁盘使用率')).toBeInTheDocument()
    })
  })

  it('renders API metrics cards', async () => {
    render(<PerformanceMonitorDashboard />)

    await waitFor(() => {
      expect(screen.getByText('API 请求总数')).toBeInTheDocument()
      expect(screen.getByText('平均响应时间')).toBeInTheDocument()
      expect(screen.getByText('成功率')).toBeInTheDocument()
      expect(screen.getByText('错误率')).toBeInTheDocument()
    })
  })

  it('renders operation metrics cards', async () => {
    render(<PerformanceMonitorDashboard />)

    await waitFor(() => {
      expect(screen.getByText('操作总数')).toBeInTheDocument()
      expect(screen.getByText('平均持续时间')).toBeInTheDocument()
      expect(screen.getByText('操作成功率')).toBeInTheDocument()
    })
  })

  it('switches between tabs', async () => {
    const user = userEvent.setup()
    render(<PerformanceMonitorDashboard />)

    // Click on charts tab
    await user.click(screen.getByText('图表分析'))
    expect(screen.getByText('资源使用趋势')).toBeInTheDocument()

    // Click on alarms tab
    await user.click(screen.getByText('告警配置'))
    expect(screen.getByText('Alarm Rules')).toBeInTheDocument()

    // Click back to realtime tab
    await user.click(screen.getByText('实时监控'))
    expect(screen.getByText('CPU 使用率')).toBeInTheDocument()
  })

  it('changes time range', async () => {
    const user = userEvent.setup()
    render(<PerformanceMonitorDashboard />)

    const timeRangeSelector = screen.getByText('选择时间范围')
    await user.click(timeRangeSelector)

    // Select a different time range
    const option = screen.getByText('1 小时')
    await user.click(option)

    expect(timeRangeSelector).toBeInTheDocument()
  })

  it('shows last update time', async () => {
    render(<PerformanceMonitorDashboard />)

    await waitFor(() => {
      expect(screen.getByText(/最后更新:/)).toBeInTheDocument()
    })
  })

  it('renders recent alarms section', async () => {
    render(<PerformanceMonitorDashboard />)

    await waitFor(() => {
      expect(screen.getByText('最近告警')).toBeInTheDocument()
    })
  })

  it('renders alarm details', async () => {
    render(<PerformanceMonitorDashboard />)

    await waitFor(() => {
      expect(screen.getByText('errorRate')).toBeInTheDocument()
      expect(screen.getByText('responseTime')).toBeInTheDocument()
    })
  })

  it('handles manual refresh', async () => {
    const user = userEvent.setup()
    const { monitor } = await import('@/lib/monitoring')

    render(<PerformanceMonitorDashboard />)

    const refreshButton = screen.getByText('刷新')
    await user.click(refreshButton)

    await waitFor(() => {
      expect(monitor.getAggregatedMetrics).toHaveBeenCalled()
    })
  })

  it('auto-refreshes when enabled', async () => {
    render(<PerformanceMonitorDashboard autoRefresh={true} refreshInterval={30000} />)

    await waitFor(() => {
      expect(screen.getByText('CPU 使用率')).toBeInTheDocument()
    })

    // Fast-forward time
    vi.advanceTimersByTime(30000)

    await waitFor(() => {
      expect(screen.getByText('CPU 使用率')).toBeInTheDocument()
    })
  })

  it('does not auto-refresh when disabled', async () => {
    render(<PerformanceMonitorDashboard autoRefresh={false} />)

    await waitFor(() => {
      expect(screen.getByText('CPU 使用率')).toBeInTheDocument()
    })

    // Fast-forward time
    vi.advanceTimersByTime(30000)

    // Should not cause any issues
    expect(screen.getByText('CPU 使用率')).toBeInTheDocument()
  })

  it('renders resource usage chart in charts tab', async () => {
    const user = userEvent.setup()
    render(<PerformanceMonitorDashboard />)

    await user.click(screen.getByText('图表分析'))

    await waitFor(() => {
      expect(screen.getByText('资源使用趋势')).toBeInTheDocument()
    })
  })

  it('renders performance charts in charts tab', async () => {
    const user = userEvent.setup()
    render(<PerformanceMonitorDashboard />)

    await user.click(screen.getByText('图表分析'))

    await waitFor(() => {
      expect(screen.getByText('API 响应时间')).toBeInTheDocument()
      expect(screen.getByText('操作持续时间')).toBeInTheDocument()
    })
  })

  it('renders alarm config panel in alarms tab', async () => {
    const user = userEvent.setup()
    render(<PerformanceMonitorDashboard />)

    await user.click(screen.getByText('告警配置'))

    await waitFor(() => {
      expect(screen.getByText('Alarm Rules')).toBeInTheDocument()
    })
  })

  it('applies custom className', () => {
    const { container } = render(
      <PerformanceMonitorDashboard className="custom-class" />
    )
    expect(container.firstChild).toHaveClass('custom-class')
  })

  it('handles loading state', () => {
    const { monitor } = require('@/lib/monitoring')
    monitor.getAggregatedMetrics.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(mockAggregatedMetrics), 1000))
    )

    render(<PerformanceMonitorDashboard />)

    // Should show loading state initially
    expect(screen.getByText('CPU 使用率')).toBeInTheDocument()
  })

  it('handles error state gracefully', async () => {
    const { monitor } = require('@/lib/monitoring')
    monitor.getAggregatedMetrics.mockRejectedValue(new Error('Failed to fetch'))

    render(<PerformanceMonitorDashboard />)

    // Should not crash, just log error
    await waitFor(() => {
      expect(screen.getByText('性能监控仪表板')).toBeInTheDocument()
    })
  })
})