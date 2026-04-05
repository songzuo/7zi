/**
 * Real-Time Performance Dashboard Service
 * 实时性能仪表板服务
 *
 * 功能：
 * - WebSocket 实时推送性能指标
 * - 实时数据聚合和缓存
 * - 性能趋势计算
 * - 多客户端连接管理
 */

import type { Server as SocketIOServer } from 'socket.io'
import type { Socket } from 'socket.io-client'
import type { DefaultEventsMap } from 'socket.io/dist/typed-events'
import { performanceCollector } from './performance.monitor'
import type { PerformanceMetric, CustomMetric, PerformanceAlert } from './performance.monitor'

// ============================================
// 类型定义
// ============================================

export interface RealTimeMetrics {
  /** 当前性能指标 */
  current: {
    LCP?: number
    FID?: number
    CLS?: number
    TTFB?: number
    FCP?: number
    INP?: number
  }
  /** 自定义指标 */
  custom: {
    heapSize?: number
    longTaskCount?: number
    avgRenderTime?: number
  }
  /** 性能评分 */
  score: {
    overall: number
    lcp: number
    fid: number
    cls: number
    inp: number
  }
  /** 时间戳 */
  timestamp: number
}

export interface PerformanceTrend {
  /** 时间序列数据 */
  data: Array<{
    timestamp: number
    LCP?: number
    CLS?: number
    INP?: number
    FCP?: number
    score: number
  }>
  /** 趋势方向 */
  trend: 'improving' | 'stable' | 'degrading'
  /** 变化百分比 */
  changePercent: number
}

export interface DashboardClient {
  id: string
  /** 客户端订阅的指标 */
  subscribedMetrics: string[]
  /** 客户端订阅的告警级别 */
  subscribedAlertLevels: Array<'info' | 'warning' | 'critical'>
  /** 最后活跃时间 */
  lastActive: number
}

// ============================================
// 实时性能仪表板服务
// ============================================

class RealTimeDashboardService {
  private static instance: RealTimeDashboardService

  /** 历史数据缓存（最多保留 60 秒） */
  private metricsHistory: RealTimeMetrics[] = []
  private maxHistoryLength = 60

  /** 告警历史 */
  private alertsHistory: PerformanceAlert[] = []
  private maxAlertHistory = 100

  /** 连接的客户端 */
  private clients: Map<string, DashboardClient> = new Map()

  /** Socket.IO 服务器实例 */
  private io: SocketIOServer | null = null

  /** 上次推送时间 */
  private lastPushTime = 0

  /** 推送间隔 */
  private pushInterval = 1000

  /** 定时器 */
  private pushTimer: NodeJS.Timeout | null = null

  private constructor() {}

  /**
   * 获取单例实例
   */
  static getInstance(): RealTimeDashboardService {
    if (!RealTimeDashboardService.instance) {
      RealTimeDashboardService.instance = new RealTimeDashboardService()
    }
    return RealTimeDashboardService.instance
  }

  /**
   * 初始化服务（服务端）
   */
  initialize(io: SocketIOServer) {
    this.io = io

    // 监听客户端连接
    io.on('connection', (socket: Socket) => {
      this.handleClientConnection(socket)
    })

    // 开始性能监控
    this.startMonitoring()

    // 启动定期推送
    this.startPushTimer()

    console.log('[RealTimeDashboard] Service initialized')
  }

  /**
   * 处理客户端连接
   */
  private handleClientConnection(socket: Socket) {
    const client: DashboardClient = {
      id: socket.id,
      subscribedMetrics: ['LCP', 'FID', 'CLS', 'INP', 'TTFB', 'FCP'],
      subscribedAlertLevels: ['warning', 'critical'],
      lastActive: Date.now(),
    }

    this.clients.set(socket.id, client)

    console.log(`[RealTimeDashboard] Client connected: ${socket.id}`)

    // 发送初始数据
    this.sendInitialData(socket)

    // 监听客户端消息
    socket.on('subscribe', (data: { metrics?: string[]; alertLevels?: string[] }) => {
      this.handleSubscribe(socket.id, data)
    })

    socket.on('unsubscribe', (data: { metrics?: string[]; alertLevels?: string[] }) => {
      this.handleUnsubscribe(socket.id, data)
    })

    socket.on('getHistory', (callback: (data: RealTimeMetrics[]) => void) => {
      callback(this.getMetricsHistory())
    })

    socket.on('getTrends', (data: { windowMs?: number }, callback: (data: PerformanceTrend) => void) => {
      callback(this.getPerformanceTrend(data.windowMs))
    })

    socket.on('disconnect', () => {
      this.handleClientDisconnect(socket.id)
    })
  }

  /**
   * 处理订阅请求
   */
  private handleSubscribe(socketId: string, data: { metrics?: string[]; alertLevels?: string[] }) {
    const client = this.clients.get(socketId)
    if (!client) return

    if (data.metrics) {
      client.subscribedMetrics = [...new Set([...client.subscribedMetrics, ...data.metrics])]
    }

    if (data.alertLevels) {
      client.subscribedAlertLevels = [
        ...new Set([...client.subscribedAlertLevels, ...(data.alertLevels as Array<'info' | 'warning' | 'critical'>)]),
      ]
    }

    client.lastActive = Date.now()
  }

  /**
   * 处理取消订阅
   */
  private handleUnsubscribe(socketId: string, data: { metrics?: string[]; alertLevels?: string[] }) {
    const client = this.clients.get(socketId)
    if (!client) return

    if (data.metrics) {
      client.subscribedMetrics = client.subscribedMetrics.filter(m => !data.metrics?.includes(m))
    }

    if (data.alertLevels) {
      client.subscribedAlertLevels = client.subscribedAlertLevels.filter(
        l => !data.alertLevels?.includes(l)
      )
    }

    client.lastActive = Date.now()
  }

  /**
   * 处理客户端断开
   */
  private handleClientDisconnect(socketId: string) {
    this.clients.delete(socketId)
    console.log(`[RealTimeDashboard] Client disconnected: ${socketId}`)
  }

  /**
   * 发送初始数据
   */
  private sendInitialData(socket: Socket) {
    const client = this.clients.get(socket.id)
    if (!client) return

    // 发送当前指标
    const currentMetrics = this.getCurrentMetrics()
    socket.emit('metrics:current', currentMetrics)

    // 发送历史数据
    const history = this.getMetricsHistory()
    socket.emit('metrics:history', history)

    // 发送性能趋势
    const trend = this.getPerformanceTrend(60000) // 1分钟趋势
    socket.emit('metrics:trend', trend)

    // 发送最近的告警
    const recentAlerts = this.getRecentAlerts(10)
    socket.emit('alerts:recent', recentAlerts)
  }

  /**
   * 开始性能监控
   */
  private startMonitoring() {
    // 监听性能指标
    performanceCollector.onMetric((metric: PerformanceMetric) => {
      this.recordMetric(metric)
    })

    // 监听告警
    performanceCollector.onAlert((alert: PerformanceAlert) => {
      this.recordAlert(alert)
    })
  }

  /**
   * 记录性能指标
   */
  private recordMetric(metric: PerformanceMetric) {
    const currentMetrics = this.getCurrentMetrics()

    // 更新对应指标
    switch (metric.name) {
      case 'LCP':
        currentMetrics.current.LCP = metric.value
        break
      case 'FID':
        currentMetrics.current.FID = metric.value
        break
      case 'CLS':
        currentMetrics.current.CLS = metric.value
        break
      case 'INP':
        currentMetrics.current.INP = metric.value
        break
      case 'TTFB':
        currentMetrics.current.TTFB = metric.value
        break
      case 'FCP':
        currentMetrics.current.FCP = metric.value
        break
    }

    // 计算评分
    currentMetrics.score = this.calculateScore(currentMetrics.current)
    currentMetrics.timestamp = Date.now()

    // 添加到历史
    this.metricsHistory.push({ ...currentMetrics })
    if (this.metricsHistory.length > this.maxHistoryLength) {
      this.metricsHistory.shift()
    }
  }

  /**
   * 记录告警
   */
  private recordAlert(alert: PerformanceAlert) {
    this.alertsHistory.push(alert)
    if (this.alertsHistory.length > this.maxAlertHistory) {
      this.alertsHistory.shift()
    }

    // 实时推送到订阅的客户端
    this.broadcastAlert(alert)
  }

  /**
   * 广播告警
   */
  private broadcastAlert(alert: PerformanceAlert) {
    if (!this.io) return

    this.clients.forEach((client, socketId) => {
      if (client.subscribedAlertLevels.includes(alert.level)) {
        this.io?.to(socketId).emit('alert', alert)
      }
    })
  }

  /**
   * 启动定期推送
   */
  private startPushTimer() {
    this.pushTimer = setInterval(() => {
      this.pushMetricsToClients()
    }, this.pushInterval)
  }

  /**
   * 推送指标到客户端
   */
  private pushMetricsToClients() {
    if (!this.io) return

    const now = Date.now()
    if (now - this.lastPushTime < this.pushInterval) return

    const currentMetrics = this.getCurrentMetrics()
    const trend = this.getPerformanceTrend(60000)

    this.clients.forEach((client, socketId) => {
      // 过滤客户端订阅的指标
      const filteredMetrics: RealTimeMetrics = {
        current: {},
        custom: currentMetrics.custom,
        score: currentMetrics.score,
        timestamp: currentMetrics.timestamp,
      }

      client.subscribedMetrics.forEach(metricName => {
        if (currentMetrics.current[metricName as keyof typeof currentMetrics.current] !== undefined) {
          filteredMetrics.current[metricName as keyof typeof filteredMetrics.current] =
            currentMetrics.current[metricName as keyof typeof currentMetrics.current]
        }
      })

      // 推送数据
      this.io?.to(socketId).emit('metrics:update', filteredMetrics)
      this.io?.to(socketId).emit('metrics:trend', trend)
    })

    this.lastPushTime = now
  }

  /**
   * 获取当前指标
   */
  private getCurrentMetrics(): RealTimeMetrics {
    const metrics = performanceCollector.getMetrics()

    const current: RealTimeMetrics['current'] = {}
    let lcpValue = 0
    let fidValue = 0
    let clsValue = 0
    let inpValue = 0

    // 提取最新的 Core Web Vitals
    if (metrics.has('LCP')) {
      const lcpMetrics = metrics.get('LCP')!
      if (lcpMetrics.length > 0) {
        current.LCP = lcpMetrics[lcpMetrics.length - 1].value
        lcpValue = current.LCP
      }
    }

    if (metrics.has('FID')) {
      const fidMetrics = metrics.get('FID')!
      if (fidMetrics.length > 0) {
        current.FID = fidMetrics[fidMetrics.length - 1].value
        fidValue = current.FID
      }
    }

    if (metrics.has('CLS')) {
      const clsMetrics = metrics.get('CLS')!
      if (clsMetrics.length > 0) {
        current.CLS = clsMetrics[clsMetrics.length - 1].value
        clsValue = current.CLS
      }
    }

    if (metrics.has('INP')) {
      const inpMetrics = metrics.get('INP')!
      if (inpMetrics.length > 0) {
        current.INP = inpMetrics[inpMetrics.length - 1].value
        inpValue = current.INP
      }
    }

    if (metrics.has('TTFB')) {
      const ttfbMetrics = metrics.get('TTFB')!
      if (ttfbMetrics.length > 0) {
        current.TTFB = ttfbMetrics[ttfbMetrics.length - 1].value
      }
    }

    if (metrics.has('FCP')) {
      const fcpMetrics = metrics.get('FCP')!
      if (fcpMetrics.length > 0) {
        current.FCP = fcpMetrics[fcpMetrics.length - 1].value
      }
    }

    // 获取自定义指标
    const customMetrics = performanceCollector.getCustomMetrics()
    const custom: RealTimeMetrics['custom'] = {}

    const heapSizeMetric = customMetrics.find(m => m.name === 'heapSize')
    if (heapSizeMetric) {
      custom.heapSize = heapSizeMetric.value
    }

    const longTaskMetrics = customMetrics.filter(m => m.name === 'longTask')
    if (longTaskMetrics.length > 0) {
      custom.longTaskCount = longTaskMetrics.length
    }

    return {
      current,
      custom,
      score: this.calculateScore(current),
      timestamp: Date.now(),
    }
  }

  /**
   * 计算性能评分
   */
  private calculateScore(current: RealTimeMetrics['current']): RealTimeMetrics['score'] {
    let lcpScore = 100
    let fidScore = 100
    let clsScore = 100
    let inpScore = 100

    // LCP 评分 (0-100)
    if (current.LCP) {
      if (current.LCP <= 2500) lcpScore = 100
      else if (current.LCP <= 4000) lcpScore = 75 - ((current.LCP - 2500) / 1500) * 25
      else lcpScore = Math.max(0, 50 - ((current.LCP - 4000) / 2000) * 50)
    }

    // FID 评分 (0-100)
    if (current.FID) {
      if (current.FID <= 100) fidScore = 100
      else if (current.FID <= 300) fidScore = 75 - ((current.FID - 100) / 200) * 25
      else fidScore = Math.max(0, 50 - ((current.FID - 300) / 200) * 50)
    }

    // CLS 评分 (0-100)
    if (current.CLS) {
      if (current.CLS <= 0.1) clsScore = 100
      else if (current.CLS <= 0.25) clsScore = 75 - ((current.CLS - 0.1) / 0.15) * 25
      else clsScore = Math.max(0, 50 - ((current.CLS - 0.25) / 0.25) * 50)
    }

    // INP 评分 (0-100)
    if (current.INP) {
      if (current.INP <= 200) inpScore = 100
      else if (current.INP <= 500) inpScore = 75 - ((current.INP - 200) / 300) * 25
      else inpScore = Math.max(0, 50 - ((current.INP - 500) / 500) * 50)
    }

    // 总分（加权平均）
    const overall = (lcpScore * 0.25 + fidScore * 0.1 + clsScore * 0.25 + inpScore * 0.4)

    return {
      overall: Math.round(overall),
      lcp: Math.round(lcpScore),
      fid: Math.round(fidScore),
      cls: Math.round(clsScore),
      inp: Math.round(inpScore),
    }
  }

  /**
   * 获取指标历史
   */
  getMetricsHistory(): RealTimeMetrics[] {
    return [...this.metricsHistory]
  }

  /**
   * 获取性能趋势
   */
  getPerformanceTrend(windowMs: number = 60000): PerformanceTrend {
    const windowStart = Date.now() - windowMs

    // 过滤指定时间窗口的数据
    const windowData = this.metricsHistory.filter(m => m.timestamp >= windowStart)

    if (windowData.length < 2) {
      return {
        data: windowData.map(m => ({
          timestamp: m.timestamp,
          LCP: m.current.LCP,
          CLS: m.current.CLS,
          INP: m.current.INP,
          FCP: m.current.FCP,
          score: m.score.overall,
        })),
        trend: 'stable',
        changePercent: 0,
      }
    }

    const firstScore = windowData[0].score.overall
    const lastScore = windowData[windowData.length - 1].score.overall
    const changePercent = ((lastScore - firstScore) / firstScore) * 100

    let trend: 'improving' | 'stable' | 'degrading'
    if (changePercent > 5) {
      trend = 'improving'
    } else if (changePercent < -5) {
      trend = 'degrading'
    } else {
      trend = 'stable'
    }

    return {
      data: windowData.map(m => ({
        timestamp: m.timestamp,
        LCP: m.current.LCP,
        CLS: m.current.CLS,
        INP: m.current.INP,
        FCP: m.current.FCP,
        score: m.score.overall,
      })),
      trend,
      changePercent,
    }
  }

  /**
   * 获取最近的告警
   */
  getRecentAlerts(count: number = 10): PerformanceAlert[] {
    return this.alertsHistory.slice(-count).reverse()
  }

  /**
   * 销毁服务
   */
  destroy() {
    if (this.pushTimer) {
      clearInterval(this.pushTimer)
    }

    this.metricsHistory = []
    this.alertsHistory = []
    this.clients.clear()

    console.log('[RealTimeDashboard] Service destroyed')
  }
}

/**
 * 导出单例
 */
export const realTimeDashboard = RealTimeDashboardService.getInstance()

export default RealTimeDashboardService
