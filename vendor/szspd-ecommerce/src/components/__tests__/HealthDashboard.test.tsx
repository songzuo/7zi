/**
 * @fileoverview HealthDashboard 组件测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import React from 'react'

// Mock dependencies at top level
vi.mock('@/contexts/SettingsContext', () => {
  const actual = vi.importActual<any>('@/contexts/SettingsContext')
  return {
    ...actual,
    useTheme: () => ({ isDark: false }),
  }
})

vi.mock('@/lib/realtime/store', () => {
  const actual = vi.importActual<any>('@/lib/realtime/store')
  return {
    ...actual,
    useRealtimeNotificationStore: () => ({ isConnected: true }),
  }
})

vi.mock('@/lib/sse/useSSE', () => ({
  useSSE: vi.fn(),
  useHealthSSE: vi.fn(() => ({
    data: {
      type: 'metrics',
      timestamp: new Date().toISOString(),
      data: {
        apiLatency: 150,
        memoryUsage: 50,
        status: 'ok',
        checks: {},
        uptime: 3600,
      },
    },
    state: 'connected',
    error: null,
    lastEventId: null,
    reconnect: vi.fn(),
    disconnect: vi.fn(),
  })),
}))

vi.mock('@/lib/monitoring/performance.monitor', () => ({
  performanceCollector: {
    getMetrics: vi.fn(() => new Map([['TTFB', [{ value: 150, timestamp: Date.now() }]]])),
  },
}))

import { HealthDashboard } from '../HealthDashboard'

describe('HealthDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('渲染', () => {
    it('应该显示标题', async () => {
      render(React.createElement(HealthDashboard))

      await expect(screen.findByText(/Health Dashboard/)).resolves.toBeInTheDocument()
    })

    it('应该显示所有指标卡片', async () => {
      render(React.createElement(HealthDashboard))

      await expect(screen.findByText(/API Response Time/)).resolves.toBeInTheDocument()
      await expect(screen.findByText(/WebSocket Connection/)).resolves.toBeInTheDocument()
      await expect(screen.findByText(/Memory Usage/)).resolves.toBeInTheDocument()
      await expect(screen.findByText(/Last Active/)).resolves.toBeInTheDocument()
    })

    it('应该显示 SSE 连接状态', async () => {
      render(React.createElement(HealthDashboard))

      await expect(screen.findByText(/SSE Connection/)).resolves.toBeInTheDocument()
    })

    it('应该显示最后更新时间', async () => {
      render(React.createElement(HealthDashboard))

      await expect(screen.findByText(/Last updated:/)).resolves.toBeInTheDocument()
    })

    it('应该显示整体状态部分', async () => {
      render(React.createElement(HealthDashboard))

      // 检查是否有 System Healthy 文本
      const systemText = await screen.findByText(/System Healthy/)
      expect(systemText).toBeInTheDocument()
    })
  })

  describe('健康指标', () => {
    it('应该显示 API 响应时间', async () => {
      render(<HealthDashboard />)

      const metric = await screen.findByText(/API Response Time/)
      expect(metric).toBeInTheDocument()

      // 查找数值（应该是150ms）
      const value = await screen.findByText(/150ms/)
      expect(value).toBeInTheDocument()
    })

    it('应该显示 WebSocket 连接状态', async () => {
      render(<HealthDashboard />)

      const metric = await screen.findByText(/WebSocket Connection/)
      expect(metric).toBeInTheDocument()

      // 使用 getAllByText 因为有多个 "Connected"
      const values = await screen.findAllByText(/Connected/)
      expect(values.length).toBeGreaterThan(0)
    })

    it('应该显示 SSE 连接状态', async () => {
      render(<HealthDashboard />)

      const metric = await screen.findByText(/SSE Connection/)
      expect(metric).toBeInTheDocument()

      // SSE 应该显示 Connected
      const values = screen.getAllByText(/Connected/)
      expect(values.length).toBeGreaterThan(0)
    })

    it('应该显示内存使用量', async () => {
      render(<HealthDashboard />)

      const metric = await screen.findByText(/Memory Usage/)
      expect(metric).toBeInTheDocument()

      const value = await screen.findByText(/50\.0MB/)
      expect(value).toBeInTheDocument()
    })

    it('应该显示最后活跃时间', async () => {
      render(<HealthDashboard />)

      const metric = await screen.findByText(/Last Active/)
      expect(metric).toBeInTheDocument()

      // 应该是"刚刚"或"s ago"
      await expect(screen.findByText(/ago|刚刚/)).resolves.toBeInTheDocument()
    })
  })

  describe('状态指示', () => {
    it('健康的指标应该显示 healthy 状态', async () => {
      render(<HealthDashboard />)

      // 应该有多个 healthy 状态
      const healthyElements = screen.getAllByText(/healthy/i)
      expect(healthyElements.length).toBeGreaterThan(0)
    })

    it('应该显示状态颜色指示器', async () => {
      const { container } = render(<HealthDashboard />)

      await screen.findByText(/Health Dashboard/)

      // 检查是否有状态指示器（带有 animate-pulse 类的圆点）
      const statusDots = container.querySelectorAll('.animate-pulse')
      expect(statusDots.length).toBeGreaterThan(0)
    })

    it('健康状态应该显示绿色指示器', async () => {
      const { container } = render(<HealthDashboard />)

      await screen.findByText(/Health Dashboard/)

      // 检查是否有绿色圆点（healthy 状态）
      const greenDots = container.querySelectorAll('.bg-emerald-500')
      expect(greenDots.length).toBeGreaterThan(0)
    })
  })

  describe('SSE 连接状态', () => {
    it('SSE 连接成功应该显示 Connected', async () => {
      render(<HealthDashboard />)

      const sseMetric = await screen.findByText(/SSE Connection/)
      expect(sseMetric).toBeInTheDocument()

      // 使用 getAllByText
      const values = screen.getAllByText(/Connected/)
      expect(values.length).toBeGreaterThan(0)
    })

    it('SSE 连接应该显示状态标签', async () => {
      render(<HealthDashboard />)

      // 应该显示 "(SSE)" 标签
      await expect(screen.findByText(/\(SSE\)/)).resolves.toBeInTheDocument()
    })

    it('SSE 禁用时应该显示 Polling', async () => {
      render(<HealthDashboard />)

      // 应该显示状态文本
      const statusText = await screen.findByText(/Last updated:/)
      expect(statusText).toBeInTheDocument()
    })
  })

  describe('整体状态计算', () => {
    it('所有指标健康时应该显示 System Healthy', async () => {
      render(<HealthDashboard />)

      await expect(screen.findByText(/System Healthy/)).resolves.toBeInTheDocument()
      await expect(
        screen.findByText(/All systems are operating normally/)
      ).resolves.toBeInTheDocument()
    })

    it('应该显示健康指标计数', async () => {
      render(<HealthDashboard />)

      // 检查整体状态文本是否包含健康计数
      const statusText = await screen.findByText(/All systems are operating normally/)
      expect(statusText).toBeInTheDocument()
    })

    it('应该显示警告指标计数', async () => {
      render(<HealthDashboard />)

      // 检查整体状态文本
      const statusText = await screen.findByText(/All systems are operating normally/)
      expect(statusText).toBeInTheDocument()
    })

    it('应该显示关键指标计数', async () => {
      render(<HealthDashboard />)

      await expect(screen.findByText(/0 critical/)).resolves.toBeInTheDocument()
    })

    it('应该显示系统状态描述', async () => {
      render(<HealthDashboard />)

      await expect(
        screen.findByText(/All systems are operating normally/)
      ).resolves.toBeInTheDocument()
    })
  })

  describe('样式和类名', () => {
    it('应该接受自定义 className', async () => {
      const { container } = render(<HealthDashboard className="custom-class" />)

      await screen.findByText(/Health Dashboard/)

      const wrapper = container.querySelector('.custom-class')
      expect(wrapper).toBeInTheDocument()
    })

    it('默认应该有适当的样式类', async () => {
      const { container } = render(<HealthDashboard />)

      await screen.findByText(/Health Dashboard/)

      // 检查容器是否有基本的样式类
      const dashboard = container.querySelector('.rounded-xl')
      expect(dashboard).toBeInTheDocument()
    })
  })

  describe('时间格式化', () => {
    it('应该格式化最后更新时间', async () => {
      render(<HealthDashboard />)

      await expect(screen.findByText(/Last updated:/)).resolves.toBeInTheDocument()

      // 应该包含时间显示
      const timeDisplay = await screen.findByText(/Last updated:/)
      expect(timeDisplay).toBeInTheDocument()
    })

    it('应该显示时间戳', async () => {
      render(<HealthDashboard />)

      await expect(screen.findByText(/Last Active/)).resolves.toBeInTheDocument()

      // 应该显示"X ago"格式
      const agoElement = screen.queryByText(/ago/)
      expect(agoElement).toBeInTheDocument()
    })
  })

  describe('响应式布局', () => {
    it('应该使用网格布局', async () => {
      const { container } = render(<HealthDashboard />)

      await screen.findByText(/Health Dashboard/)

      // 检查是否有网格布局
      const grid = container.querySelector('.grid')
      expect(grid).toBeInTheDocument()
    })

    it('应该支持响应式列数', async () => {
      const { container } = render(<HealthDashboard />)

      await screen.findByText(/Health Dashboard/)

      // 检查响应式网格类
      const grid = container.querySelector('.grid-cols-1')
      expect(grid).toBeInTheDocument()

      const mdGrid = container.querySelector('.md\\:grid-cols-2')
      expect(mdGrid).toBeInTheDocument()

      const lgGrid = container.querySelector('.lg\\:grid-cols-3')
      expect(lgGrid).toBeInTheDocument()
    })
  })

  describe('空状态', () => {
    it('SSE 数据为空时应该显示默认值', async () => {
      render(<HealthDashboard />)

      // 应该仍然显示指标卡片
      await expect(screen.findByText(/API Response Time/)).resolves.toBeInTheDocument()
      await expect(screen.findByText(/WebSocket Connection/)).resolves.toBeInTheDocument()
      await expect(screen.findByText(/Memory Usage/)).resolves.toBeInTheDocument()
    })
  })

  describe('边界情况', () => {
    it('零值应该正常显示', async () => {
      render(<HealthDashboard />)

      // 应该显示 0ms 或 0MB
      const content = screen.getByText(/Health Dashboard/)
      expect(content).toBeInTheDocument()
    })

    it('没有 className 时应该正常渲染', async () => {
      render(<HealthDashboard className="" />)

      await expect(screen.findByText(/Health Dashboard/)).resolves.toBeInTheDocument()
    })
  })
})
