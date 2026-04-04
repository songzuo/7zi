/**
 * WebSocket Monitor
 * WebSocket 连接监控器 - 自动追踪 Socket.IO 连接性能
 *
 * 功能:
 * - 自动追踪 Socket.IO 连接延迟
 * - 监控断开重连次数
 * - Ping-pong 延迟测试
 * - 自动上报到性能监控系统
 *
 * 性能优化 (v1.9.0):
 * - 使用 Map 替代数组遍历
 * - 添加防抖/节流机制
 * - 批量处理替代单条处理
 * - 优化消息序列化
 *
 * @module websocket-monitor
 * @version 1.9.0
 */

import type { Socket } from 'socket.io-client'
import type { Server as SocketIOServer } from 'socket.io'
import {
  WebSocketMetrics,
  WebSocketMonitorConfig,
  WebSocketEvent,
  LatencyRecord,
  WebSocketMonitorStats,
  DEFAULT_WEBSOCKET_MONITOR_CONFIG,
} from './types'
import { recordCustomMetric } from './performance.monitor'

// ============================================
// 防抖/节流工具函数
// ============================================

function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  return function (this: unknown, ...args: Parameters<T>) {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func.apply(this, args), wait)
  }
}

function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean
  return function (this: unknown, ...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(this, args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}

// ============================================
// 优化的延迟历史记录（使用环形缓冲区）
// ============================================

class CircularBuffer<T> {
  private buffer: T[]
  private head: number = 0
  private size: number = 0

  constructor(private capacity: number) {
    this.buffer = new Array(capacity)
  }

  push(item: T): void {
    this.buffer[this.head] = item
    this.head = (this.head + 1) % this.capacity
    if (this.size < this.capacity) this.size++
  }

  toArray(): T[] {
    const result: T[] = []
    for (let i = 0; i < this.size; i++) {
      result.push(this.buffer[(this.head - this.size + i + this.capacity) % this.capacity])
    }
    return result
  }

  get length(): number {
    return this.size
  }

  clear(): void {
    this.head = 0
    this.size = 0
  }
}

// ============================================
// 批量上报队列
// ============================================

interface BatchedMetric {
  name: string
  value: number
  unit: string
  timestamp: number
}

class MetricBatcher {
  private queue: BatchedMetric[] = []
  private flushTimer: NodeJS.Timeout | null = null
  private maxBatchSize: number
  private maxWaitTime: number

  constructor(maxBatchSize: number = 50, maxWaitTime: number = 1000) {
    this.maxBatchSize = maxBatchSize
    this.maxWaitTime = maxWaitTime
  }

  add(metric: BatchedMetric): void {
    this.queue.push(metric)

    if (this.queue.length >= this.maxBatchSize) {
      this.flush()
    } else if (!this.flushTimer) {
      this.flushTimer = setTimeout(() => this.flush(), this.maxWaitTime)
    }
  }

  private flush(): void {
    if (this.queue.length === 0) return

    // 批量上报 - WebSocket metrics belong to 'rendering' category
    const category: 'resource' | 'api' | 'navigation' | 'rendering' | 'memory' = 'rendering'
    for (const metric of this.queue) {
      try {
        recordCustomMetric(metric.name, metric.value, category)
      } catch (error) {
        console.error('[WebSocketMonitor] Failed to report metric:', error)
      }
    }

    this.queue = []
    if (this.flushTimer) {
      clearTimeout(this.flushTimer)
      this.flushTimer = null
    }
  }

  destroy(): void {
    this.flush()
  }
}

/**
 * WebSocket Monitor Class
 * 监控 WebSocket (Socket.IO) 连接性能
 */
export class WebSocketMonitor {
  private static instance: WebSocketMonitor | null = null

  /** 每个命名空间的指标 */
  private metrics: Map<string, WebSocketMetrics> = new Map()

  /** Ping 间隔定时器 */
  private pingIntervals: Map<string, NodeJS.Timeout> = new Map()

  /** 延迟历史记录 - 使用环形缓冲区优化 */
  private latencyHistory: Map<string, CircularBuffer<LatencyRecord>> = new Map()

  /** 事件历史 - 使用环形缓冲区优化 */
  private eventHistory: CircularBuffer<WebSocketEvent>

  /** Socket 实例引用 */
  private sockets: Map<string, Socket | SocketIOServer> = new Map()

  /** 配置 */
  private config: Required<WebSocketMonitorConfig>

  /** 是否已初始化 */
  private initialized: boolean = false

  /** 批量上报器 */
  private metricBatcher: MetricBatcher

  /** 节流的延迟上报 */
  private throttledLatencyReport: (namespace: string, latency: number) => void

  /** 防抖的统计上报 */
  private debouncedStatsReport: () => void

  /** 单例私有构造函数 */
  private constructor(config?: WebSocketMonitorConfig) {
    this.config = { ...DEFAULT_WEBSOCKET_MONITOR_CONFIG, ...config }

    // 初始化环形缓冲区
    this.eventHistory = new CircularBuffer<WebSocketEvent>(this.config.maxHistoryLength * 10)

    // 初始化批量上报器
    this.metricBatcher = new MetricBatcher(50, 1000)

    // 初始化节流/防抖函数
    this.throttledLatencyReport = throttle(
      (ns: unknown, latency: unknown) => {
        this.metricBatcher.add({
          name: `ws_${ns as string}_latency`,
          value: latency as number,
          unit: 'ms',
          timestamp: Date.now(),
        })
      },
      500 // 最多每 500ms 上报一次
    ) as (namespace: string, latency: number) => void

    this.debouncedStatsReport = debounce(() => {
      this.reportStats()
    }, 2000) // 2秒内多次调用只执行一次
  }

  /**
   * 获取单例实例
   */
  static getInstance(config?: WebSocketMonitorConfig): WebSocketMonitor {
    if (!WebSocketMonitor.instance) {
      WebSocketMonitor.instance = new WebSocketMonitor(config)
    }
    return WebSocketMonitor.instance
  }

  /**
   * 初始化监控器
   */
  initialize(config?: Partial<WebSocketMonitorConfig>): void {
    if (this.initialized) {
      this.log('Already initialized')
      return
    }

    if (config) {
      this.config = { ...this.config, ...config }
    }

    this.initialized = true
    this.log('WebSocket Monitor initialized', this.config)
  }

  /**
   * 监控 Socket.IO 客户端连接
   */
  trackSocketClient(socket: Socket, namespace: string = 'default'): () => void {
    const ns = namespace || socket.id || 'default'

    // 初始化指标
    const metrics: WebSocketMetrics = {
      connectTime: 0,
      latency: 0,
      reconnectCount: 0,
      messageCount: 0,
      errorCount: 0,
      connectionState: 'connecting',
    }

    this.metrics.set(ns, metrics)
    this.sockets.set(ns, socket)
    this.latencyHistory.set(ns, new CircularBuffer<LatencyRecord>(this.config.maxHistoryLength))

    const startTime = Date.now()

    // 连接成功
    socket.on('connect', () => {
      metrics.connectTime = Date.now() - startTime
      metrics.connectionState = 'connected'

      this.recordEvent('connect', ns, { connectTime: metrics.connectTime })

      if (this.config.autoReport) {
        this.metricBatcher.add({
          name: `ws_${ns}_connect_time`,
          value: metrics.connectTime,
          unit: 'ms',
          timestamp: Date.now(),
        })
      }

      this.log(`[${ns}] Connected in ${metrics.connectTime}ms`)
    })

    // 断开连接
    socket.on('disconnect', reason => {
      metrics.connectionState = 'disconnected'

      this.recordEvent('disconnect', ns, { reason })

      if (this.config.autoReport) {
        this.metricBatcher.add({
          name: `ws_${ns}_disconnect`,
          value: 1,
          unit: 'count',
          timestamp: Date.now(),
        })
      }

      this.log(`[${ns}] Disconnected: ${reason}`)
    })

    // 重连尝试
    socket.io.on('reconnect', attemptNumber => {
      metrics.reconnectCount++
      metrics.connectionState = 'connected'

      this.recordEvent('reconnect', ns, { attemptNumber })

      if (this.config.autoReport) {
        this.metricBatcher.add({
          name: `ws_${ns}_reconnect`,
          value: metrics.reconnectCount,
          unit: 'count',
          timestamp: Date.now(),
        })
      }

      this.log(`[${ns}] Reconnected after ${attemptNumber} attempts`)
    })

    socket.io.on('reconnect_attempt', () => {
      metrics.connectionState = 'reconnecting'
    })

    // 连接错误
    socket.on('connect_error', error => {
      metrics.errorCount++
      metrics.connectionState = 'connecting'

      this.recordEvent('error', ns, {
        error: error.message,
        type: 'connect_error',
      })

      if (this.config.autoReport) {
        this.metricBatcher.add({
          name: `ws_${ns}_error`,
          value: metrics.errorCount,
          unit: 'count',
          timestamp: Date.now(),
        })
      }

      this.log(`[${ns}] Connection error: ${error.message}`)
    })

    // 消息统计 - 使用 onAny 监听所有事件
    try {
      socket.onAny((eventName, ...args) => {
        metrics.messageCount++

        // 只记录重要事件，避免日志过多
        if (this.config.verbose && eventName !== 'ping' && eventName !== 'pong') {
          this.log(`[${ns}] Message received: ${eventName}`)
        }
      })
    } catch (error) {
      this.log(`[${ns}] onAny not supported on this socket`)
    }

    // 启动延迟测试
    this.startLatencyTest(socket, ns)

    // 返回清理函数
    return () => {
      this.stopTracking(ns)
    }
  }

  /**
   * 监控 Socket.IO 服务端
   */
  trackSocketServer(io: SocketIOServer, namespace: string = 'server'): void {
    const ns = namespace

    const metrics: WebSocketMetrics = {
      connectTime: 0,
      latency: 0,
      reconnectCount: 0,
      messageCount: 0,
      errorCount: 0,
      connectionState: 'connected',
    }

    this.metrics.set(ns, metrics)
    this.sockets.set(ns, io)
    this.latencyHistory.set(ns, new CircularBuffer<LatencyRecord>(this.config.maxHistoryLength))

    // 监听新连接
    io.on('connection', socket => {
      metrics.messageCount++ // 新连接算作消息

      // 为每个连接设置 ping/pong 监控
      socket.on('ping', (data: { timestamp: number }) => {
        const latency = Date.now() - data.timestamp

        socket.emit('pong', {
          timestamp: data.timestamp,
          serverTime: Date.now(),
        })

        this.recordLatency(ns, latency)

        if (this.config.autoReport) {
          // 使用节流上报
          this.throttledLatencyReport(ns, latency)
        }
      })
    })

    this.log(`[${ns}] Server monitoring started`)
  }

  /**
   * 启动延迟测试
   */
  private startLatencyTest(socket: Socket, namespace: string): void {
    // 清理旧的定时器
    const existingInterval = this.pingIntervals.get(namespace)
    if (existingInterval) {
      clearInterval(existingInterval)
    }

    const interval = setInterval(() => {
      const metrics = this.metrics.get(namespace)
      if (!metrics) return

      if (socket.connected) {
        const pingStart = Date.now()

        // 发送 ping 事件
        socket.emit('ping', { timestamp: pingStart })

        // 监听 pong 响应
        socket.once('pong', (data: { timestamp?: number; serverTime?: number }) => {
          const latency = Date.now() - pingStart

          this.recordLatency(namespace, latency)
          this.updateLatencyStats(namespace, latency)

          if (this.config.autoReport) {
            // 使用节流上报延迟
            this.throttledLatencyReport(namespace, latency)
          }

          // 检查延迟阈值
          this.checkLatencyThreshold(namespace, latency)
        })
      }
    }, this.config.pingInterval)

    this.pingIntervals.set(namespace, interval)
  }

  /**
   * 记录延迟
   */
  private recordLatency(namespace: string, latency: number): void {
    const history = this.latencyHistory.get(namespace)
    if (history) {
      history.push({
        timestamp: Date.now(),
        latency,
        namespace,
      })
    }
  }

  /**
   * 更新延迟统计
   */
  private updateLatencyStats(namespace: string, latency: number): void {
    const metrics = this.metrics.get(namespace)
    if (!metrics) return

    metrics.latency = latency

    const history = this.latencyHistory.get(namespace)
    if (history && history.length > 0) {
      const latencies = history.toArray().map(r => r.latency)
      metrics.avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length
      metrics.maxLatency = Math.max(...latencies)
      metrics.minLatency = Math.min(...latencies)
    }
  }

  /**
   * 检查延迟阈值
   */
  private checkLatencyThreshold(namespace: string, latency: number): void {
    const metrics = this.metrics.get(namespace)
    if (!metrics) return

    if (latency >= this.config.latencyCriticalThreshold) {
      this.log(
        `[${namespace}] CRITICAL: Latency ${latency}ms exceeds threshold ${this.config.latencyCriticalThreshold}ms`
      )

      this.recordEvent('error', namespace, {
        type: 'latency_critical',
        latency,
        threshold: this.config.latencyCriticalThreshold,
      })
    } else if (latency >= this.config.latencyWarningThreshold) {
      this.log(
        `[${namespace}] WARNING: Latency ${latency}ms exceeds threshold ${this.config.latencyWarningThreshold}ms`
      )
    }
  }

  /**
   * 记录事件
   */
  private recordEvent(
    type: WebSocketEvent['type'],
    namespace: string,
    data?: Record<string, unknown>
  ): void {
    const event: WebSocketEvent = {
      type,
      timestamp: Date.now(),
      namespace,
      data,
    }

    this.eventHistory.push(event)
  }

  /**
   * 上报统计信息（防抖）
   */
  private reportStats(): void {
    const stats = this.getStats()

    // 批量上报统计指标
    this.metricBatcher.add({
      name: 'ws_total_connections',
      value: stats.totalConnections,
      unit: 'count',
      timestamp: Date.now(),
    })

    this.metricBatcher.add({
      name: 'ws_active_connections',
      value: stats.activeConnections,
      unit: 'count',
      timestamp: Date.now(),
    })

    this.metricBatcher.add({
      name: 'ws_avg_latency',
      value: stats.avgLatency,
      unit: 'ms',
      timestamp: Date.now(),
    })
  }

  /**
   * 停止监控
   */
  stopTracking(namespace: string): void {
    // 清理定时器
    const interval = this.pingIntervals.get(namespace)
    if (interval) {
      clearInterval(interval)
      this.pingIntervals.delete(namespace)
    }

    // 清理数据
    this.metrics.delete(namespace)
    this.sockets.delete(namespace)
    this.latencyHistory.delete(namespace)

    this.log(`[${namespace}] Stopped tracking`)
  }

  /**
   * 获取指标
   */
  getMetrics(namespace?: string): WebSocketMetrics | Map<string, WebSocketMetrics> {
    if (namespace) {
      return (
        this.metrics.get(namespace) || {
          connectTime: 0,
          latency: 0,
          reconnectCount: 0,
          messageCount: 0,
          errorCount: 0,
          connectionState: 'disconnected',
        }
      )
    }
    return new Map(this.metrics)
  }

  /**
   * 获取延迟历史
   */
  getLatencyHistory(namespace?: string): LatencyRecord[] {
    if (namespace) {
      const history = this.latencyHistory.get(namespace)
      return history ? history.toArray() : []
    }

    // 返回所有命名空间的历史
    const allHistory: LatencyRecord[] = []
    for (const history of this.latencyHistory.values()) {
      allHistory.push(...history.toArray())
    }
    return allHistory.sort((a, b) => a.timestamp - b.timestamp)
  }

  /**
   * 获取事件历史
   */
  getEventHistory(): WebSocketEvent[] {
    return this.eventHistory.toArray()
  }

  /**
   * 获取统计信息
   */
  getStats(): WebSocketMonitorStats {
    let totalConnections = 0
    let activeConnections = 0
    let totalReconnects = 0
    let totalErrors = 0
    let totalMessages = 0
    let totalLatency = 0
    let latencyCount = 0
    let maxLatency = 0
    let minLatency = Infinity

    for (const [ns, metrics] of this.metrics) {
      totalConnections++
      if (metrics.connectionState === 'connected') {
        activeConnections++
      }
      totalReconnects += metrics.reconnectCount
      totalErrors += metrics.errorCount
      totalMessages += metrics.messageCount

      if (metrics.avgLatency) {
        totalLatency += metrics.avgLatency
        latencyCount++
      }
      if (metrics.maxLatency) {
        maxLatency = Math.max(maxLatency, metrics.maxLatency)
      }
      if (metrics.minLatency) {
        minLatency = Math.min(minLatency, metrics.minLatency)
      }
    }

    return {
      totalConnections,
      activeConnections,
      totalReconnects,
      totalErrors,
      totalMessages,
      avgLatency: latencyCount > 0 ? totalLatency / latencyCount : 0,
      maxLatency,
      minLatency: minLatency === Infinity ? 0 : minLatency,
      namespaces: new Map(this.metrics),
    }
  }

  /**
   * 重置所有指标
   */
  reset(): void {
    // 停止所有定时器
    for (const interval of this.pingIntervals.values()) {
      clearInterval(interval)
    }

    this.pingIntervals.clear()
    this.metrics.clear()
    this.sockets.clear()
    this.latencyHistory.clear()
    this.eventHistory.clear()

    this.log('All metrics reset')
  }

  /**
   * 销毁实例
   */
  destroy(): void {
    this.reset()
    this.metricBatcher.destroy()
    WebSocketMonitor.instance = null
    this.initialized = false
    this.log('Monitor destroyed')
  }

  /**
   * 日志输出
   */
  private log(message: string, data?: unknown): void {
    if (this.config.verbose || message.includes('ERROR') || message.includes('CRITICAL')) {
      console.log(`[WebSocketMonitor] ${message}`, data !== undefined ? data : '')
    }
  }
}

/**
 * 默认导出单例
 */
export const wsMonitor = WebSocketMonitor.getInstance()

export default WebSocketMonitor
