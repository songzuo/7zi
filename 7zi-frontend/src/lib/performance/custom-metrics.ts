/**
 * Custom Performance Metrics Tracker
 * 自定义性能指标追踪器
 */

import { monitor } from '../monitoring'

/**
 * 自定义指标类型
 */
export interface CustomMetrics {
  // 页面加载指标
  pageLoadTime?: number // 页面完全加载时间
  domContentLoaded?: number // DOM 内容加载完成时间
  firstPaint?: number // 首次绘制时间
  firstContentfulPaint?: number // 首次内容绘制时间

  // 资源加载指标
  largestContentfulPaint?: number // 最大内容绘制时间

  // 网络指标
  dnsLookup?: number // DNS 查询时间
  tcpConnection?: number // TCP 连接时间
  tlsHandshake?: number // TLS 握手时间
  serverResponse?: number // 服务器响应时间

  // WebSocket 指标
  wsConnectTime?: number // WebSocket 连接时间
  wsLatency?: number // WebSocket 延迟 (ping-pong)
  wsMessagesPerSecond?: number // 每秒消息数
  wsReconnectCount?: number // 重连次数

  // API 指标
  apiAverageResponseTime?: number // API 平均响应时间
  apiSuccessRate?: number // API 成功率
  apiErrorRate?: number // API 错误率

  // 错误指标
  errorCount?: number // 错误总数
  errorRate?: number // 错误率 (错误数/请求数)

  // 内存指标
  memoryUsage?: number // 内存使用量 (MB)
  memoryLimit?: number // 内存限制 (MB)
  memoryUsagePercent?: number // 内存使用百分比
}

/**
 * 指标追踪配置
 */
export interface MetricsTrackerConfig {
  trackMemory: boolean // 是否追踪内存
  memoryCheckInterval: number // 内存检查间隔 (ms)
  trackNetwork: boolean // 是否追踪网络指标
  trackResources: boolean // 是否追踪资源
  resourceTypes: string[] // 要追踪的资源类型
}

/**
 * 自定义指标追踪器
 */
export class CustomMetricsTracker {
  private config: MetricsTrackerConfig
  private metrics: CustomMetrics = {}
  private memoryCheckIntervalId?: NodeJS.Timeout
  private wsPingIntervalId?: NodeJS.Timeout
  private wsLatencyHistory: number[] = []
  private wsMessageCount = 0
  private wsLastMessageTime = Date.now()
  private wsReconnectCount = 0

  constructor(config: Partial<MetricsTrackerConfig> = {}) {
    this.config = {
      trackMemory: true,
      memoryCheckInterval: 5000,
      trackNetwork: true,
      trackResources: true,
      resourceTypes: ['script', 'stylesheet', 'image', 'font', 'fetch', 'xhr'],
      ...config,
    }
  }

  /**
   * 初始化追踪器
   */
  init(): void {
    if (typeof window === 'undefined') return

    // 追踪页面加载性能
    this.trackPageLoadMetrics()

    // 追踪网络指标
    if (this.config.trackNetwork) {
      this.trackNetworkMetrics()
    }

    // 追踪资源
    if (this.config.trackResources) {
      this.trackResourceMetrics()
    }

    // 追踪内存 (如果支持)
    if (this.config.trackMemory && 'memory' in performance) {
      this.startMemoryTracking()
    }
  }

  /**
   * 追踪页面加载指标
   */
  private trackPageLoadMetrics(): void {
    const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming

    if (!navEntry) return

    // 页面加载时间
    this.metrics.pageLoadTime = navEntry.loadEventEnd - navEntry.fetchStart

    // DOM 内容加载完成
    this.metrics.domContentLoaded = navEntry.domContentLoadedEventEnd - navEntry.fetchStart

    // 保存到监控
    monitor.trackCustomMetric('page_load_time', this.metrics.pageLoadTime, 'ms', {
      startTime: navEntry.fetchStart,
      endTime: navEntry.loadEventEnd,
    })

    monitor.trackCustomMetric('dom_content_loaded', this.metrics.domContentLoaded, 'ms')

    // 追踪 Paint 指标
    const paintEntries = performance.getEntriesByType('paint')
    paintEntries.forEach(entry => {
      if (entry.name === 'first-paint') {
        this.metrics.firstPaint = entry.startTime
        monitor.trackCustomMetric('first_paint', entry.startTime, 'ms')
      }
      if (entry.name === 'first-contentful-paint') {
        this.metrics.firstContentfulPaint = entry.startTime
        monitor.trackCustomMetric('first_contentful_paint', entry.startTime, 'ms')
      }
    })
  }

  /**
   * 追踪网络指标
   */
  private trackNetworkMetrics(): void {
    const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming

    if (!navEntry) return

    // DNS 查询
    this.metrics.dnsLookup = navEntry.domainLookupEnd - navEntry.domainLookupStart

    // TCP 连接
    this.metrics.tcpConnection = navEntry.connectEnd - navEntry.connectStart

    // TLS 握手 (如果有)
    if (navEntry.secureConnectionStart > 0) {
      this.metrics.tlsHandshake = navEntry.connectEnd - navEntry.secureConnectionStart
    }

    // 服务器响应
    this.metrics.serverResponse = navEntry.responseStart - navEntry.requestStart

    // 保存到监控
    monitor.trackCustomMetric('dns_lookup', this.metrics.dnsLookup, 'ms')
    monitor.trackCustomMetric('tcp_connection', this.metrics.tcpConnection, 'ms')
    if (this.metrics.tlsHandshake) {
      monitor.trackCustomMetric('tls_handshake', this.metrics.tlsHandshake, 'ms')
    }
    monitor.trackCustomMetric('server_response', this.metrics.serverResponse, 'ms')
  }

  /**
   * 追踪资源指标
   */
  private trackResourceMetrics(): void {
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[]

    // 按类型分组统计
    const resourceStats: Record<string, { count: number; totalSize: number; totalTime: number }> =
      {}

    resources.forEach(resource => {
      const type = this.getResourceType(resource)

      if (!this.config.resourceTypes.includes(type)) return

      if (!resourceStats[type]) {
        resourceStats[type] = { count: 0, totalSize: 0, totalTime: 0 }
      }

      resourceStats[type].count++
      resourceStats[type].totalSize += resource.transferSize || 0
      resourceStats[type].totalTime += resource.duration
    })

    // 保存到监控
    Object.entries(resourceStats).forEach(([type, stats]) => {
      monitor.trackCustomMetric(`resource_${type}_count`, stats.count, 'count', {
        resourceType: type,
      })
      monitor.trackCustomMetric(`resource_${type}_total_size`, stats.totalSize, 'bytes', {
        resourceType: type,
      })
      monitor.trackCustomMetric(`resource_${type}_avg_time`, stats.totalTime / stats.count, 'ms', {
        resourceType: type,
      })
    })
  }

  /**
   * 获取资源类型
   */
  private getResourceType(entry: PerformanceResourceTiming): string {
    // 根据 initiatorType 判断
    switch (entry.initiatorType) {
      case 'script':
        return 'script'
      case 'link':
        // 检查 rel 属性
        if (entry.name.includes('.css')) return 'stylesheet'
        if (entry.name.match(/\.(woff|woff2|ttf|otf)$/i)) return 'font'
        return 'link'
      case 'img':
      case 'image':
        return 'image'
      case 'xmlhttprequest':
      case 'fetch':
        return 'fetch'
      case 'other':
      default:
        // 根据 URL 扩展名判断
        if (entry.name.match(/\.(js)$/i)) return 'script'
        if (entry.name.match(/\.(css)$/i)) return 'stylesheet'
        if (entry.name.match(/\.(woff|woff2|ttf|otf)$/i)) return 'font'
        if (entry.name.match(/\.(png|jpg|jpeg|gif|webp|svg)$/i)) return 'image'
        return 'other'
    }
  }

  /**
   * 开始追踪内存
   */
  private startMemoryTracking(): void {
    if (typeof window === 'undefined') return

    const checkMemory = () => {
      // @ts-ignore - performance.memory is non-standard but supported in Chrome
      if (performance.memory) {
        const memory = performance.memory
        this.metrics.memoryUsage = memory.usedJSHeapSize / 1024 / 1024 // MB
        this.metrics.memoryLimit = memory.totalJSHeapSize / 1024 / 1024 // MB
        this.metrics.memoryUsagePercent =
          (this.metrics.memoryUsage / this.metrics.memoryLimit) * 100

        // 保存到监控
        monitor.trackCustomMetric('memory_usage', this.metrics.memoryUsage, 'MB')
        monitor.trackCustomMetric('memory_usage_percent', this.metrics.memoryUsagePercent, '%')

        // 内存使用率告警
        if (this.metrics.memoryUsagePercent > 90) {
          monitor.trackError(
            'HighMemoryUsage',
            `Memory usage: ${this.metrics.memoryUsagePercent.toFixed(1)}%`,
            undefined,
            {
              currentUsage: this.metrics.memoryUsage,
              limit: this.metrics.memoryLimit,
            }
          )
        }
      }
    }

    // 立即检查一次
    checkMemory()

    // 定期检查
    this.memoryCheckIntervalId = setInterval(
      checkMemory,
      this.config.memoryCheckInterval
    ) as NodeJS.Timeout
  }

  /**
   * 追踪 WebSocket 延迟
   */
  trackWebSocketLatency(ws: WebSocket): void {
    // 记录连接时间
    const connectStartTime = Date.now()

    ws.addEventListener('open', () => {
      this.metrics.wsConnectTime = Date.now() - connectStartTime
      monitor.trackCustomMetric('ws_connect_time', this.metrics.wsConnectTime, 'ms')
    })

    // 启动 ping-pong 测试
    this.startWebSocketPingTest(ws)

    // 统计消息
    ws.addEventListener('message', () => {
      this.wsMessageCount++
      const now = Date.now()
      const timeSinceLastMessage = now - this.wsLastMessageTime

      // 计算每秒消息数
      if (timeSinceLastMessage > 1000) {
        this.metrics.wsMessagesPerSecond = this.wsMessageCount / (timeSinceLastMessage / 1000)
        monitor.trackCustomMetric(
          'ws_messages_per_second',
          this.metrics.wsMessagesPerSecond,
          'msg/s'
        )

        this.wsMessageCount = 0
        this.wsLastMessageTime = now
      }
    })

    // 统计重连
    ws.addEventListener('close', () => {
      this.wsReconnectCount++
      this.metrics.wsReconnectCount = this.wsReconnectCount
      monitor.trackCustomMetric('ws_reconnect_count', this.wsReconnectCount, 'count')
    })
  }

  /**
   * 启动 WebSocket ping-pong 测试
   */
  private startWebSocketPingTest(ws: WebSocket): void {
    const sendPing = () => {
      if (ws.readyState === WebSocket.OPEN) {
        const pingTime = Date.now()
        ws.send(JSON.stringify({ type: 'ping', timestamp: pingTime }))

        // 等待 pong 响应
        const timeout = setTimeout(() => {
          monitor.trackError('WebSocketTimeout', 'Ping timeout after 5s')
        }, 5000)

        const onMessage = (event: MessageEvent) => {
          try {
            const data = JSON.parse(event.data)
            if (data.type === 'pong' && data.timestamp === pingTime) {
              const latency = Date.now() - pingTime
              this.wsLatencyHistory.push(latency)

              // 只保留最近 10 次测量
              if (this.wsLatencyHistory.length > 10) {
                this.wsLatencyHistory.shift()
              }

              // 计算平均延迟
              const avgLatency =
                this.wsLatencyHistory.reduce((sum, val) => sum + val, 0) /
                this.wsLatencyHistory.length
              this.metrics.wsLatency = avgLatency

              monitor.trackCustomMetric('ws_latency', avgLatency, 'ms', {
                samples: this.wsLatencyHistory.length,
              })

              ws.removeEventListener('message', onMessage)
              clearTimeout(timeout)
            }
          } catch (e) {
            // 忽略非 JSON 消息
          }
        }

        ws.addEventListener('message', onMessage)
      }
    }

    // 每秒发送一次 ping
    this.wsPingIntervalId = setInterval(sendPing, 1000) as NodeJS.Timeout
  }

  /**
   * 更新 API 指标
   */
  async updateAPIMetrics(): Promise<void> {
    const metrics = await monitor.getAggregatedMetrics(5 * 60 * 1000) // 5 分钟窗口

    this.metrics.apiAverageResponseTime = metrics.apiMetrics.averageResponseTime
    this.metrics.apiSuccessRate = metrics.apiMetrics.successRate
    this.metrics.apiErrorRate = metrics.apiMetrics.errorRate

    // 保存自定义指标
    monitor.trackCustomMetric('api_success_rate', this.metrics.apiSuccessRate, 'ratio')
    monitor.trackCustomMetric('api_error_rate', this.metrics.apiErrorRate, 'ratio')
  }

  /**
   * 更新错误指标
   */
  async updateErrorMetrics(): Promise<void> {
    const metrics = await monitor.getAggregatedMetrics(5 * 60 * 1000) // 5 分钟窗口

    this.metrics.errorCount = metrics.errorMetrics.totalErrors

    // 计算错误率 (错误数 / 总请求数)
    const totalRequests =
      metrics.apiMetrics.totalRequests + metrics.operationMetrics.totalOperations
    this.metrics.errorRate = totalRequests > 0 ? this.metrics.errorCount / totalRequests : 0

    // 保存自定义指标
    monitor.trackCustomMetric('error_count', this.metrics.errorCount, 'count')
    monitor.trackCustomMetric('error_rate', this.metrics.errorRate, 'ratio')
  }

  /**
   * 获取所有指标
   */
  getMetrics(): CustomMetrics {
    return { ...this.metrics }
  }

  /**
   * 获取单个指标
   */
  getMetric<K extends keyof CustomMetrics>(name: K): CustomMetrics[K] {
    return this.metrics[name]
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<MetricsTrackerConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * 停止追踪
   */
  stop(): void {
    if (this.memoryCheckIntervalId) {
      clearInterval(this.memoryCheckIntervalId)
    }
    if (this.wsPingIntervalId) {
      clearInterval(this.wsPingIntervalId)
    }
  }

  /**
   * 重置指标
   */
  reset(): void {
    this.metrics = {}
    this.wsLatencyHistory = []
    this.wsMessageCount = 0
    this.wsLastMessageTime = Date.now()
  }
}

// 默认实例
export const customMetricsTracker = new CustomMetricsTracker()

/**
 * 初始化自定义指标追踪 (便捷函数)
 */
export function initCustomMetricsTracking(
  config?: Partial<MetricsTrackerConfig>
): CustomMetricsTracker {
  if (config) {
    customMetricsTracker.updateConfig(config)
  }
  customMetricsTracker.init()
  return customMetricsTracker
}
