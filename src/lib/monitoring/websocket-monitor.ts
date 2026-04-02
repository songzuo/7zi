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
 * @module websocket-monitor
 * @version 1.8.0
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

  /** 延迟历史记录 */
  private latencyHistory: Map<string, LatencyRecord[]> = new Map()

  /** 事件历史 */
  private eventHistory: WebSocketEvent[] = []

  /** Socket 实例引用 */
  private sockets: Map<string, Socket | SocketIOServer> = new Map()

  /** 配置 */
  private config: Required<WebSocketMonitorConfig>

  /** 是否已初始化 */
  private initialized: boolean = false

  /** 单例私有构造函数 */
  private constructor(config?: WebSocketMonitorConfig) {
    this.config = { ...DEFAULT_WEBSOCKET_MONITOR_CONFIG, ...config }
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
    this.latencyHistory.set(ns, [])

    const startTime = Date.now()

    // 连接成功
    socket.on('connect', () => {
      metrics.connectTime = Date.now() - startTime
      metrics.connectionState = 'connected'

      this.recordEvent('connect', ns, { connectTime: metrics.connectTime })

      if (this.config.autoReport) {
        this.reportMetric(`ws_${ns}_connect_time`, metrics.connectTime)
      }

      this.log(`[${ns}] Connected in ${metrics.connectTime}ms`)
    })

    // 断开连接
    socket.on('disconnect', reason => {
      metrics.connectionState = 'disconnected'

      this.recordEvent('disconnect', ns, { reason })

      if (this.config.autoReport) {
        this.reportMetric(`ws_${ns}_disconnect`, 1, 'count')
      }

      this.log(`[${ns}] Disconnected: ${reason}`)
    })

    // 重连尝试
    socket.io.on('reconnect', attemptNumber => {
      metrics.reconnectCount++
      metrics.connectionState = 'connected'

      this.recordEvent('reconnect', ns, { attemptNumber })

      if (this.config.autoReport) {
        this.reportMetric(`ws_${ns}_reconnect`, metrics.reconnectCount, 'count')
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
        this.reportMetric(`ws_${ns}_error`, metrics.errorCount, 'count')
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
    this.latencyHistory.set(ns, [])

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
          this.reportMetric(`ws_${ns}_server_latency`, latency)
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
            this.reportMetric(`ws_${namespace}_latency`, latency)
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
    const history = this.latencyHistory.get(namespace) || []

    history.push({
      timestamp: Date.now(),
      latency,
      namespace,
    })

    // 限制历史记录长度
    if (history.length > this.config.maxHistoryLength) {
      history.shift()
    }

    this.latencyHistory.set(namespace, history)
  }

  /**
   * 更新延迟统计
   */
  private updateLatencyStats(namespace: string, latency: number): void {
    const metrics = this.metrics.get(namespace)
    if (!metrics) return

    metrics.latency = latency

    const history = this.latencyHistory.get(namespace) || []
    if (history.length > 0) {
      const latencies = history.map(r => r.latency)
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

    // 限制事件历史长度
    if (this.eventHistory.length > this.config.maxHistoryLength * 10) {
      this.eventHistory = this.eventHistory.slice(-this.config.maxHistoryLength)
    }
  }

  /**
   * 上报指标到性能监控系统
   */
  private reportMetric(name: string, value: number, unit: string = 'ms'): void {
    try {
      // 使用公共 API recordCustomMetric, WebSocket 指标归类为 "api"
      recordCustomMetric(name, value, 'api', { unit, type: 'websocket' })
    } catch (error) {
      this.log(`Failed to report metric ${name}: ${error}`)
    }
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
      return this.latencyHistory.get(namespace) || []
    }

    // 返回所有命名空间的历史
    const allHistory: LatencyRecord[] = []
    for (const history of this.latencyHistory.values()) {
      allHistory.push(...history)
    }
    return allHistory.sort((a, b) => a.timestamp - b.timestamp)
  }

  /**
   * 获取事件历史
   */
  getEventHistory(): WebSocketEvent[] {
    return [...this.eventHistory]
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
    this.eventHistory = []

    this.log('All metrics reset')
  }

  /**
   * 销毁实例
   */
  destroy(): void {
    this.reset()
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
