/**
 * WebSocket Connection Manager
 *
 * Provides stable WebSocket connection with:
 * - Heartbeat monitoring (ping/pong)
 * - Exponential backoff reconnection
 * - Connection state management
 * - Message queue for offline messages
 * - Performance monitoring integration
 * - Message compression (50% traffic reduction)
 * - Connection state persistence (recover after reconnect)
 * - Connection quality monitoring & alerting
 * - Reconnection history tracking
 *
 * 架构师: 🏗️ 架构师
 * 更新日期: 2026-04-04 (v1.12.2 增强版)
 */

// 动态导入 socket.io-client 以减少初始 bundle 大小
import type { Socket } from 'socket.io-client'
import { logger } from '@/lib/logger'
import { monitor } from '@/lib/monitoring'
import { customMetricsTracker } from '@/lib/performance'
import {
  MessageCompressor,
  CompressionConfig,
  DEFAULT_COMPRESSION_CONFIG,
  CompressionStats,
} from './websocket-compression'

/**
 * Connection states
 */
export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  ERROR = 'error',
}

/**
 * Message queue item
 */
export interface QueuedMessage {
  id: string
  event: string
  data: unknown
  timestamp: number
  retryCount: number
}

/**
 * Connection manager options
 */
export interface WebSocketManagerOptions {
  url: string
  autoConnect?: boolean
  transports?: ('websocket' | 'polling')[]
  heartbeatInterval?: number
  heartbeatTimeout?: number
  reconnectionDelay?: number
  reconnectionDelayMax?: number
  reconnectionAttempts?: number
  maxQueueSize?: number
  queueExpiry?: number
  auth?: Record<string, unknown>
  /** 消息压缩配置 */
  compression?: Partial<CompressionConfig>
}

/**
 * Connection statistics
 */
export interface ConnectionStats {
  messagesSent: number
  messagesReceived: number
  totalReconnections: number
  lastActiveTime: number
  lastPingTime: number
  currentPingLatency: number
  averagePingLatency: number
  /** 压缩统计 */
  compression?: CompressionStats & { compressionRatio: number }
  /** 连接质量指标 */
  connectionQuality?: ConnectionQuality
}

/**
 * Connection quality metrics (v1.12.2 enhanced)
 */
export interface ConnectionQuality {
  latencyScore: number // 0-100
  stabilityScore: number // 0-100
  packetLossEstimate: number // 0-1 (0% to 100%)
  qualityLevel: 'excellent' | 'good' | 'fair' | 'poor' | 'critical'
  /** 综合评分 */
  overallScore: number // 0-100
  /** 上次更新时间 */
  lastUpdated: number
}

/**
 * Reconnection history record (v1.12.2 new)
 */
export interface ReconnectionRecord {
  id: string
  timestamp: number
  attempt: number
  reason: string
  previousState: ConnectionState
  result: 'success' | 'failed' | 'aborted'
  latency?: number
  duration?: number // ms
  error?: string
}

/**
 * Connection state persistence (v1.12.2 new)
 */
export interface PersistedConnectionState {
  /** 最后连接的 URL */
  url: string
  /** 最后活跃时间 */
  lastActiveTime: number
  /** 最后连接时间 */
  lastConnectedTime: number
  /** 最后断开时间 */
  lastDisconnectedTime: number
  /** 最后连接质量 */
  lastConnectionQuality: ConnectionQuality | null
  /** 重连历史 (最近 20 条) */
  recentReconnections: ReconnectionRecord[]
  /** 会话 ID */
  sessionId: string
  /** 总重连次数 */
  totalReconnections: number
  /** 总连接次数 */
  totalConnections: number
}

/**
 * Quality alert configuration (v1.12.2 new)
 */
export interface QualityAlertConfig {
  /** 触发告警的质量级别阈值 */
  triggerLevel: ConnectionQuality['qualityLevel']
  /** 告警回调 */
  onAlert: (quality: ConnectionQuality, previousQuality: ConnectionQuality | null) => void
  /** 恢复回调 */
  onRecovered?: (quality: ConnectionQuality) => void
  /** 是否只触发一次 (冷却期内) */
  singleAlert: boolean
  /** 冷却时间 (ms) */
  cooldownMs: number
}

/**
 * Health check result (v1.12.2 new)
 */
export interface HealthCheckResult {
  healthy: boolean
  issues: string[]
  timestamp: number
  details: {
    latency: number
    lastPingDiff: number
    missedHeartbeats: number
    state: ConnectionState
    qualityLevel: ConnectionQuality['qualityLevel']
    overallScore: number
  }
}

/**
 * Connection state listener
 */
export type ConnectionStateListener = (
  state: ConnectionState,
  previousState: ConnectionState
) => void

/**
 * Message listener
 */
export type MessageListener = (event: string, data: unknown) => void

/**
 * WebSocket Manager Class
 */
export class WebSocketManager {
  private socket: Socket | null = null
  private state: ConnectionState = ConnectionState.DISCONNECTED
  private stateListeners: Set<ConnectionStateListener> = new Set()
  private messageListeners: Map<string, Set<MessageListener>> = new Map()
  private queue: QueuedMessage[] = []

  // Heartbeat
  private heartbeatTimer: NodeJS.Timeout | null = null
  private heartbeatTimeoutTimer: NodeJS.Timeout | null = null
  private lastPongTime: number = 0
  private missedHeartbeats: number = 0

  // Reconnection
  private reconnectionAttempts: number = 0
  private reconnectionTimer: NodeJS.Timeout | null = null
  private totalReconnections: number = 0

  // Statistics
  private stats: ConnectionStats = {
    messagesSent: 0,
    messagesReceived: 0,
    totalReconnections: 0,
    lastActiveTime: Date.now(),
    lastPingTime: 0,
    currentPingLatency: 0,
    averagePingLatency: 0,
    connectionQuality: {
      latencyScore: 100,
      stabilityScore: 100,
      packetLossEstimate: 0,
      qualityLevel: 'excellent',
    },
  }

  // Ping latency history for average calculation
  private pingLatencies: number[] = []

  // Connection quality tracking
  private consecutiveSuccessfulHeartbeats: number = 0
  private failedHeartbeatAttempts: number = 0
  private lastResetTime: number = Date.now()

  // Message compressor
  private compressor: MessageCompressor

  // Network event handlers
  private _onlineHandler: (() => void) | null = null
  private _offlineHandler: (() => void) | null = null
  private _wasConnected: boolean = false

  // Options
  private options: Required<WebSocketManagerOptions>

  // Default options
  private static readonly DEFAULT_OPTIONS: Required<WebSocketManagerOptions> = {
    url: '',
    autoConnect: true,
    transports: ['websocket', 'polling'],
    heartbeatInterval: 25000, // 25 seconds (matches server)
    heartbeatTimeout: 10000, // 10 seconds (server pingTimeout: 60s, so 25s + 10s < 60s is safe)
    reconnectionDelay: 1000, // Start with 1 second
    reconnectionDelayMax: 30000, // Max 30 seconds
    reconnectionAttempts: Infinity,
    maxQueueSize: 100,
    queueExpiry: 300000, // 5 minutes
    auth: {},
    compression: DEFAULT_COMPRESSION_CONFIG,
  }

  // v1.12.2: Connection state persistence
  private static readonly STORAGE_KEY = 'websocket_connection_state'
  private static readonly MAX_RECONNECTION_HISTORY = 20
  private sessionId: string
  private lastConnectedTime: number = 0
  private lastDisconnectedTime: number = 0
  private totalConnections: number = 0

  // v1.12.2: Reconnection history tracking
  private reconnectionHistory: ReconnectionRecord[] = []
  private currentReconnectionStartTime: number = 0

  // v1.12.2: Quality alerting
  private qualityAlerts: QualityAlertConfig[] = []
  private lastAlertTime: Map<string, number> = new Map()
  private lastQualityLevel: ConnectionQuality['qualityLevel'] | null = null
  private qualityCheckTimer: NodeJS.Timeout | null = null
  private readonly QUALITY_CHECK_INTERVAL = 10000 // 10 seconds

  constructor(options: WebSocketManagerOptions) {
    this.options = { ...WebSocketManager.DEFAULT_OPTIONS, ...options }
    this.lastPongTime = Date.now()

    // v1.12.2: Generate session ID and load persisted state
    this.sessionId = `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    this.loadPersistedState()

    // Initialize compressor with config
    this.compressor = new MessageCompressor(this.options.compression)

    // Set up network event listeners
    this.setupNetworkListeners()

    // v1.12.2: Start quality monitoring
    this.startQualityMonitoring()

    if (this.options.autoConnect) {
      this.connect()
    }
  }

  /**
   * Connect to WebSocket server
   */
  connect(): void {
    if (this.socket?.connected) {
      logger.info('[WebSocketManager] Already connected')
      return
    }

    if (this.state === ConnectionState.CONNECTING || this.state === ConnectionState.RECONNECTING) {
      logger.info('[WebSocketManager] Connection already in progress')
      return
    }

    const previousState = this.state
    this.setState(
      previousState === ConnectionState.DISCONNECTED
        ? ConnectionState.CONNECTING
        : ConnectionState.RECONNECTING
    )

    // 记录连接开始时间用于性能监控
    const connectStartTime = Date.now()

    try {
      // 动态导入 socket.io-client 以减少初始 bundle 大小
      import('socket.io-client').then(({ io }) => {
        this.socket = io(this.options.url, {
          transports: this.options.transports,
          reconnection: false, // We handle reconnection ourselves
          auth: this.options.auth,
        })

        // 监听连接成功事件以追踪连接时间
        this.socket.on('connect', () => {
          const connectTime = Date.now() - connectStartTime

          // 记录连接时间指标
          monitor.trackCustomMetric('websocket_connect_time', connectTime, 'ms', {
            url: this.options.url,
            attempts: this.reconnectionAttempts + 1,
          })

          logger.info(`[WebSocketManager] Connected in ${connectTime}ms`)
        })

        this.setupSocketListeners()
      }).catch((error) => {
        logger.error(
          '[WebSocketManager] Failed to import socket.io-client:',
          error instanceof Error ? error : undefined
        )

        // 记录连接错误
        monitor.trackError(
          'WebSocketImportError',
          error instanceof Error ? error.message : String(error),
          error instanceof Error ? error.stack : undefined,
          { url: this.options.url }
        )

        this.setState(ConnectionState.ERROR)
        this.scheduleReconnection()
      })
    } catch (error) {
      // This catch is for any synchronous errors during import setup
      logger.error(
        '[WebSocketManager] Failed to setup connection:',
        error instanceof Error ? error : undefined
      )
      this.setState(ConnectionState.ERROR)
      this.scheduleReconnection()
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    if (this.reconnectionTimer) {
      clearTimeout(this.reconnectionTimer)
      this.reconnectionTimer = null
    }

    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }

    if (this.heartbeatTimeoutTimer) {
      clearTimeout(this.heartbeatTimeoutTimer)
      this.heartbeatTimeoutTimer = null
    }

    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }

    this.removeNetworkListeners()

    // v1.12.2: Stop quality monitoring
    this.stopQualityMonitoring()

    // v1.12.2: Record disconnect time
    this.lastDisconnectedTime = Date.now()

    // 清理压缩器
    this.compressor.destroy()

    // v1.12.2: Save state before disconnect
    this.persistState()

    this.setState(ConnectionState.DISCONNECTED)
    this.reconnectionAttempts = 0
    this.stats.currentPingLatency = 0
  }

  /**
   * Emit message to server
   * If disconnected, queues the message for later sending
   * Uses message compression for traffic reduction
   */
  emit(event: string, data: unknown, queueIfOffline = true): boolean {
    if (this.socket?.connected) {
      // 使用新的压缩 API
      const compressed = this.compressor.compressForSend(event, data)

      // 发送压缩后的消息
      this.socket.emit('__compressed', compressed)

      this.stats.messagesSent++
      this.stats.lastActiveTime = Date.now()

      // 更新压缩统计
      this.stats.compression = this.compressor.getStats()

      return true
    }

    if (queueIfOffline) {
      this.queueMessage(event, data)
    }

    return false
  }

  /**
   * Emit without compression (for internal messages like ping/pong)
   */
  emitRaw(event: string, data: unknown): boolean {
    if (this.socket?.connected) {
      this.socket.emit(event, data)
      this.stats.messagesSent++
      this.stats.lastActiveTime = Date.now()
      return true
    }
    return false
  }

  /**
   * Add message listener
   */
  on(event: string, listener: MessageListener): void {
    if (!this.messageListeners.has(event)) {
      this.messageListeners.set(event, new Set())
    }
    this.messageListeners.get(event)!.add(listener)
  }

  /**
   * Remove message listener
   */
  off(event: string, listener: MessageListener): void {
    const listeners = this.messageListeners.get(event)
    if (listeners) {
      listeners.delete(listener)
      if (listeners.size === 0) {
        this.messageListeners.delete(event)
      }
    }
  }

  /**
   * Add connection state listener
   */
  onStateChange(listener: ConnectionStateListener): void {
    this.stateListeners.add(listener)
  }

  /**
   * Remove connection state listener
   */
  offStateChange(listener: ConnectionStateListener): void {
    this.stateListeners.delete(listener)
  }

  /**
   * Get current connection state
   */
  getState(): ConnectionState {
    return this.state
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.state === ConnectionState.CONNECTED
  }

  /**
   * Get queue size
   */
  getQueueSize(): number {
    return this.queue.length
  }

  /**
   * Clear message queue
   */
  clearQueue(): void {
    this.queue = []
    logger.info('[WebSocketManager] Message queue cleared')
  }

  /**
   * Get connection statistics
   */
  getStats(): ConnectionStats {
    return {
      ...this.stats,
      compression: this.compressor.getStats(),
      connectionQuality: this.calculateConnectionQuality(),
    }
  }

  /**
   * Get compression statistics
   */
  getCompressionStats(): CompressionStats & { compressionRatio: number } {
    return this.compressor.getStats()
  }

  // ==================== v1.12.2 新增功能 ====================

  /**
   * Get reconnection history (v1.12.2 new)
   */
  getReconnectionHistory(): ReconnectionRecord[] {
    return [...this.reconnectionHistory]
  }

  /**
   * Get persisted connection state (v1.12.2 new)
   */
  getPersistedState(): PersistedConnectionState {
    return {
      url: this.options.url,
      lastActiveTime: this.stats.lastActiveTime,
      lastConnectedTime: this.lastConnectedTime,
      lastDisconnectedTime: this.lastDisconnectedTime,
      lastConnectionQuality: this.stats.connectionQuality || null,
      recentReconnections: this.reconnectionHistory.slice(-20),
      sessionId: this.sessionId,
      totalReconnections: this.totalReconnections,
      totalConnections: this.totalConnections,
    }
  }

  /**
   * Register quality alert (v1.12.2 new)
   */
  registerQualityAlert(config: QualityAlertConfig): void {
    this.qualityAlerts.push(config)
    logger.info('[WebSocketManager] Quality alert registered:', {
      triggerLevel: config.triggerLevel,
      singleAlert: config.singleAlert,
    })
  }

  /**
   * Unregister quality alert (v1.12.2 new)
   */
  unregisterQualityAlert(config: QualityAlertConfig): void {
    const index = this.qualityAlerts.indexOf(config)
    if (index > -1) {
      this.qualityAlerts.splice(index, 1)
    }
  }

  /**
   * Perform health check (v1.12.2 new)
   */
  healthCheck(): HealthCheckResult {
    const issues: string[] = []
    const quality = this.calculateConnectionQuality()
    const now = Date.now()

    // Check latency
    if (this.stats.currentPingLatency > 500) {
      issues.push(`High latency: ${this.stats.currentPingLatency}ms`)
    }

    // Check last ping time
    if (this.stats.lastPingTime > 0) {
      const timeSinceLastPing = now - this.stats.lastPingTime
      if (timeSinceLastPing > this.options.heartbeatInterval + this.options.heartbeatTimeout) {
        issues.push('No ping response received within expected time')
      }
    }

    // Check missed heartbeats
    if (this.missedHeartbeats > 0) {
      issues.push(`Missed heartbeats: ${this.missedHeartbeats}`)
    }

    // Check connection state
    if (this.state !== ConnectionState.CONNECTED) {
      issues.push(`Not connected, current state: ${this.state}`)
    }

    // Check quality level
    if (quality.qualityLevel === 'critical') {
      issues.push('Connection quality is critical')
    } else if (quality.qualityLevel === 'poor') {
      issues.push('Connection quality is poor')
    }

    const healthy = issues.length === 0 && this.state === ConnectionState.CONNECTED

    return {
      healthy,
      issues,
      timestamp: now,
      details: {
        latency: this.stats.currentPingLatency,
        lastPingDiff: this.stats.lastPingTime > 0 ? now - this.stats.lastPingTime : -1,
        missedHeartbeats: this.missedHeartbeats,
        state: this.state,
        qualityLevel: quality.qualityLevel,
        overallScore: quality.overallScore,
      },
    }
  }

  /**
   * Get current session ID (v1.12.2 new)
   */
  getSessionId(): string {
    return this.sessionId
  }

  /**
   * Clear reconnection history (v1.12.2 new)
   */
  clearReconnectionHistory(): void {
    this.reconnectionHistory = []
    logger.info('[WebSocketManager] Reconnection history cleared')
  }

  /**
   * Reset connection statistics
   */
  resetStats(): void {
    this.stats = {
      messagesSent: 0,
      messagesReceived: 0,
      totalReconnections: this.stats.totalReconnections,
      lastActiveTime: Date.now(),
      lastPingTime: 0,
      currentPingLatency: 0,
      averagePingLatency: 0,
      connectionQuality: {
        latencyScore: 100,
        stabilityScore: 100,
        packetLossEstimate: 0,
        qualityLevel: 'excellent',
        overallScore: 100,
        lastUpdated: Date.now(),
      },
    }
    this.pingLatencies = []
    this.consecutiveSuccessfulHeartbeats = 0
    this.failedHeartbeatAttempts = 0
    this.lastResetTime = Date.now()
    this.compressor.resetStats()
    logger.info('[WebSocketManager] Statistics reset')
  }

  /**
   * Set up socket event listeners
   */
  private setupSocketListeners(): void {
    if (!this.socket) return

    this.socket.on('connect', () => {
      logger.info('[WebSocketManager] Connected to server')

      // v1.12.2: Record connection time
      this.lastConnectedTime = Date.now()
      this.totalConnections++

      // Track reconnections
      if (this.reconnectionAttempts > 0 || this.state === ConnectionState.RECONNECTING) {
        this.stats.totalReconnections++

        // v1.12.2: Record successful reconnection
        const duration = this.currentReconnectionStartTime > 0
          ? Date.now() - this.currentReconnectionStartTime
          : undefined

        this.recordReconnection({
          id: `reconn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: Date.now(),
          attempt: this.reconnectionAttempts,
          reason: 'reconnect_success',
          previousState: this.state,
          result: 'success',
          duration,
        })
      }

      this.setState(ConnectionState.CONNECTED)
      this.reconnectionAttempts = 0
      this.missedHeartbeats = 0
      this.startHeartbeat()
      this.sendQueuedMessages()

      // v1.12.2: Save state after successful connection
      this.persistState()
    })

    this.socket.on('disconnect', reason => {
      logger.info('[WebSocketManager] Disconnected:', { reason })

      const strategy = this.getReconnectStrategy(reason)

      // v1.12.2: Record disconnect event
      if (this.reconnectionAttempts > 0 || this.state === ConnectionState.RECONNECTING) {
        this.recordReconnection({
          id: `reconn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: Date.now(),
          attempt: this.reconnectionAttempts,
          reason: reason,
          previousState: this.state,
          result: strategy.shouldReconnect ? 'aborted' : 'failed',
        })
      }

      if (!strategy.shouldReconnect) {
        // User initiated disconnect or server explicitly disconnected us
        logger.info('[WebSocketManager] Not reconnecting:', { reason: strategy.reason })
        this.setState(ConnectionState.DISCONNECTED)
        this.stopHeartbeat()
      } else {
        // Try to reconnect with strategy-based delay
        this.setState(ConnectionState.RECONNECTING)
        this.stopHeartbeat()
        this.scheduleReconnection(strategy.initialDelay)
      }

      // v1.12.2: Record disconnect time
      this.lastDisconnectedTime = Date.now()
    })

    this.socket.on('connect_error', error => {
      logger.error('[WebSocketManager] Connection error:', error)
      this.setState(ConnectionState.ERROR)
      this.scheduleReconnection()
    })

    this.socket.on('error', error => {
      logger.error('[WebSocketManager] Socket error:', error)
    })

    // Handle pong response
    this.socket.on('pong', () => {
      this.lastPongTime = Date.now()
      this.missedHeartbeats = 0

      // Track successful heartbeats for quality calculation
      this.consecutiveSuccessfulHeartbeats++

      // Calculate ping latency
      if (this.stats.lastPingTime > 0) {
        const latency = this.lastPongTime - this.stats.lastPingTime
        this.stats.currentPingLatency = latency

        // 记录 WebSocket 延迟到监控系统
        monitor.trackCustomMetric('websocket_latency', latency, 'ms', {
          url: this.options.url,
        })

        // Update average (keep last 100 pings)
        this.pingLatencies.push(latency)
        if (this.pingLatencies.length > 100) {
          this.pingLatencies.shift()
        }
        this.stats.averagePingLatency =
          this.pingLatencies.reduce((a, b) => a + b, 0) / this.pingLatencies.length
      }

      if (this.heartbeatTimeoutTimer) {
        clearTimeout(this.heartbeatTimeoutTimer)
        this.heartbeatTimeoutTimer = null
      }
    })

    // Set up message forwarding with decompression
    this.socket.onAny((event: string, ...args: unknown[]) => {
      let data = args.length > 1 ? args : args[0]

      // 处理压缩消息
      if (event === '__compressed' && typeof data === 'object' && data !== null) {
        const decompressed = this.compressor.decompressFromReceive(data)
        event = decompressed.event
        data = decompressed.data
      }

      this.stats.messagesReceived++
      this.stats.lastActiveTime = Date.now()
      this.notifyMessageListeners(event, data)
    })
  }

  /**
   * Start heartbeat monitoring
   */
  private startHeartbeat(): void {
    this.stopHeartbeat()

    this.heartbeatTimer = setInterval(() => {
      if (this.socket?.connected) {
        this.stats.lastPingTime = Date.now()
        this.socket.emit('ping')

        // Set timeout for pong response
        this.heartbeatTimeoutTimer = setTimeout(() => {
          this.missedHeartbeats++
          this.failedHeartbeatAttempts++
          this.consecutiveSuccessfulHeartbeats = 0 // Reset consecutive success

          logger.warn(`[WebSocketManager] Missed heartbeat ${this.missedHeartbeats}/${3}`)

          // 记录心跳丢失
          monitor.trackCustomMetric('websocket_heartbeat_missed', 1, 'count', {
            totalMissed: this.missedHeartbeats,
            url: this.options.url,
          })

          // If we miss 3 heartbeats, consider connection dead and reconnect
          if (this.missedHeartbeats >= 3) {
            logger.error('[WebSocketManager] Too many missed heartbeats, reconnecting...')

            // 记录心跳超时错误
            monitor.trackError(
              'WebSocketHeartbeatTimeout',
              `Missed ${this.missedHeartbeats} consecutive heartbeats`,
              undefined,
              { url: this.options.url }
            )

            this.socket?.disconnect()
          }
        }, this.options.heartbeatTimeout)
      }
    }, this.options.heartbeatInterval)
  }

  /**
   * Stop heartbeat monitoring
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }

    if (this.heartbeatTimeoutTimer) {
      clearTimeout(this.heartbeatTimeoutTimer)
      this.heartbeatTimeoutTimer = null
    }
  }

  /**
   * Schedule reconnection with exponential backoff + jitter
   * v1.12.2: Enhanced with reconnection tracking
   */
  private scheduleReconnection(initialDelay?: number): void {
    if (this.reconnectionAttempts >= this.options.reconnectionAttempts) {
      logger.error('[WebSocketManager] Max reconnection attempts reached')

      // v1.12.2: Record failed reconnection
      this.recordReconnection({
        id: `reconn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        attempt: this.reconnectionAttempts,
        reason: 'max_attempts_reached',
        previousState: this.state,
        result: 'failed',
        error: 'Max reconnection attempts reached',
      })

      // 记录重连失败
      monitor.trackError(
        'WebSocketReconnectFailed',
        `Max reconnection attempts (${this.options.reconnectionAttempts}) reached`,
        undefined,
        {
          url: this.options.url,
          totalAttempts: this.reconnectionAttempts,
        }
      )

      this.setState(ConnectionState.ERROR)
      return
    }

    if (this.state === ConnectionState.CONNECTED) {
      return
    }

    // v1.12.2: Record reconnection start time
    if (this.currentReconnectionStartTime === 0) {
      this.currentReconnectionStartTime = Date.now()
    }

    // Calculate base delay with exponential backoff
    const baseDelay = this.options.reconnectionDelay * Math.pow(2, this.reconnectionAttempts)

    // Add jitter (0-50% of base delay) to avoid thundering herd
    const jitter = Math.random() * baseDelay * 0.5

    // Cap at max delay
    const delay = Math.min(baseDelay + jitter, this.options.reconnectionDelayMax)

    // Use provided initial delay if this is first attempt with custom strategy
    const finalDelay = initialDelay && this.reconnectionAttempts === 0 ? initialDelay : delay

    this.reconnectionAttempts++

    // 记录重连尝试
    monitor.trackCustomMetric('websocket_reconnect_attempt', 1, 'count', {
      attempt: this.reconnectionAttempts,
      delayMs: Math.round(finalDelay),
      url: this.options.url,
    })

    logger.info(
      `[WebSocketManager] Scheduling reconnection attempt ${this.reconnectionAttempts} in ${Math.round(finalDelay)}ms (base: ${Math.round(baseDelay)}ms, jitter: +${Math.round(jitter)}ms)`
    )

    this.reconnectionTimer = setTimeout(() => {
      this.reconnectionTimer = null
      this.connect()
    }, finalDelay)
  }

  /**
   * Queue message for later sending
   */
  private queueMessage(event: string, data: unknown): void {
    // Remove expired messages first
    this.cleanExpiredMessages()

    // Check queue size limit
    if (this.queue.length >= this.options.maxQueueSize) {
      // Remove oldest message
      this.queue.shift()
      logger.warn('[WebSocketManager] Queue full, removed oldest message')
    }

    const message: QueuedMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      event,
      data,
      timestamp: Date.now(),
      retryCount: 0,
    }

    this.queue.push(message)
    logger.info(`[WebSocketManager] Message queued: ${event} (queue size: ${this.queue.length})`)
  }

  /**
   * Send all queued messages
   */
  private sendQueuedMessages(): void {
    if (this.queue.length === 0) {
      return
    }

    logger.info(`[WebSocketManager] Sending ${this.queue.length} queued messages`)

    const messages = [...this.queue]
    this.queue = []

    messages.forEach(message => {
      try {
        this.socket?.emit(message.event, message.data)
      } catch (error) {
        logger.error(
          `[WebSocketManager] Failed to send queued message ${message.id}:`,
          error instanceof Error ? error : undefined
        )
        // Re-queue failed message
        message.retryCount++
        if (message.retryCount < 3) {
          this.queue.push(message)
        }
      }
    })
  }

  /**
   * Remove expired messages from queue
   */
  private cleanExpiredMessages(): void {
    const now = Date.now()
    const originalSize = this.queue.length

    this.queue = this.queue.filter(msg => now - msg.timestamp < this.options.queueExpiry)

    if (this.queue.length !== originalSize) {
      logger.info(
        `[WebSocketManager] Removed ${originalSize - this.queue.length} expired messages from queue`
      )
    }
  }

  /**
   * Set connection state and notify listeners
   */
  private setState(newState: ConnectionState): void {
    if (this.state === newState) return

    const previousState = this.state
    this.state = newState

    logger.info(`[WebSocketManager] State changed: ${previousState} -> ${newState}`)

    // Notify listeners
    this.stateListeners.forEach(listener => {
      try {
        listener(newState, previousState)
      } catch (error) {
        logger.error(
          '[WebSocketManager] Error in state listener:',
          error instanceof Error ? error : undefined
        )
      }
    })
  }

  /**
   * Notify message listeners
   */
  private notifyMessageListeners(event: string, data: unknown): void {
    const listeners = this.messageListeners.get(event)
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(event, data)
        } catch (error) {
          logger.error(
            `[WebSocketManager] Error in message listener for ${event}:`,
            error instanceof Error ? error : undefined
          )
        }
      })
    }
  }

  /**
   * Set up network status listeners
   */
  private setupNetworkListeners(): void {
    this._onlineHandler = () => {
      logger.info('[WebSocketManager] Network online, attempting fast reconnect')
      // Immediately try to reconnect if not already connected
      if (this.state !== ConnectionState.CONNECTED && this.state !== ConnectionState.CONNECTING) {
        this.fastReconnect()
      }
    }

    this._offlineHandler = () => {
      logger.info('[WebSocketManager] Network offline')
      // Remember if we were connected before going offline
      this._wasConnected = this.state === ConnectionState.CONNECTED
    }

    window.addEventListener('online', this._onlineHandler)
    window.addEventListener('offline', this._offlineHandler)
  }

  /**
   * Remove network status listeners
   */
  private removeNetworkListeners(): void {
    if (this._onlineHandler) {
      window.removeEventListener('online', this._onlineHandler)
      this._onlineHandler = null
    }

    if (this._offlineHandler) {
      window.removeEventListener('offline', this._offlineHandler)
      this._offlineHandler = null
    }
  }

  /**
   * Fast reconnect with minimal delay
   */
  private fastReconnect(): void {
    logger.info('[WebSocketManager] Fast reconnect initiated')
    this.reconnectionAttempts = 0
    this.connect()
  }

  /**
   * Calculate connection quality metrics
   * Based on latency, heartbeat success rate, and connection stability
   * v1.12.2: Enhanced with overall score and lastUpdated timestamp
   */
  private calculateConnectionQuality(): ConnectionQuality {
    // Calculate latency score (0-100)
    // <50ms = 100, <100ms = 90, <200ms = 75, <300ms = 60, <500ms = 40, >=500ms = 20
    let latencyScore: number
    if (this.stats.currentPingLatency === 0) {
      latencyScore = 100
    } else if (this.stats.currentPingLatency < 50) {
      latencyScore = 100
    } else if (this.stats.currentPingLatency < 100) {
      latencyScore = 90
    } else if (this.stats.currentPingLatency < 200) {
      latencyScore = 75
    } else if (this.stats.currentPingLatency < 300) {
      latencyScore = 60
    } else if (this.stats.currentPingLatency < 500) {
      latencyScore = 40
    } else {
      latencyScore = 20
    }

    // Calculate stability score (0-100) based on heartbeat success rate
    const totalHeartbeats = this.consecutiveSuccessfulHeartbeats + this.failedHeartbeatAttempts
    const successRate = totalHeartbeats > 0
      ? this.consecutiveSuccessfulHeartbeats / totalHeartbeats
      : 1

    // Stability also considers how long since last reset
    const timeSinceReset = Date.now() - this.lastResetTime
    const timeFactor = Math.min(timeSinceReset / 60000, 1) // Decay over 1 minute

    // Base stability on success rate, with some decay factor
    const stabilityScore = Math.round(successRate * 100 * (0.5 + 0.5 * timeFactor))

    // Estimate packet loss based on missed heartbeats
    const heartbeatInterval = this.options.heartbeatInterval
    const expectedHeartbeats = Math.max(1, Math.floor(timeSinceReset / heartbeatInterval))
    const packetLossEstimate = expectedHeartbeats > 0
      ? Math.min(this.failedHeartbeatAttempts / expectedHeartbeats, 1)
      : 0

    // Determine quality level
    let qualityLevel: ConnectionQuality['qualityLevel']
    const avgScore = (latencyScore + stabilityScore) / 2

    if (avgScore >= 90 && packetLossEstimate < 0.01) {
      qualityLevel = 'excellent'
    } else if (avgScore >= 70 && packetLossEstimate < 0.05) {
      qualityLevel = 'good'
    } else if (avgScore >= 50 && packetLossEstimate < 0.1) {
      qualityLevel = 'fair'
    } else if (avgScore >= 30 && packetLossEstimate < 0.2) {
      qualityLevel = 'poor'
    } else {
      qualityLevel = 'critical'
    }

    // v1.12.2: Calculate overall score (weighted average)
    const overallScore = Math.round(
      latencyScore * 0.4 + stabilityScore * 0.4 + (1 - packetLossEstimate) * 100 * 0.2
    )

    return {
      latencyScore,
      stabilityScore,
      packetLossEstimate,
      qualityLevel,
      overallScore,
      lastUpdated: Date.now(),
    }
  }

  /**
   * Get reconnection strategy based on disconnect reason
   */
  private getReconnectStrategy(reason: string): {
    shouldReconnect: boolean
    initialDelay: number
    maxAttempts: number
    reason: string
  } {
    const strategies: Record<string, ReturnType<typeof this.getReconnectStrategy>> = {
      'io client disconnect': {
        shouldReconnect: false,
        initialDelay: 0,
        maxAttempts: 0,
        reason: 'User initiated disconnect',
      },
      'io server disconnect': {
        shouldReconnect: false,
        initialDelay: 0,
        maxAttempts: 0,
        reason: 'Server initiated disconnect',
      },
      'ping timeout': {
        shouldReconnect: true,
        initialDelay: 500, // Fast reconnect for ping timeout
        maxAttempts: 5,
        reason: 'Ping timeout',
      },
      'transport close': {
        shouldReconnect: true,
        initialDelay: 1000,
        maxAttempts: 10,
        reason: 'Transport closed',
      },
      'transport error': {
        shouldReconnect: true,
        initialDelay: 2000, // Wait a bit longer for transport errors
        maxAttempts: 8,
        reason: 'Transport error',
      },
    }

    return (
      strategies[reason] || {
        shouldReconnect: true,
        initialDelay: this.options.reconnectionDelay,
        maxAttempts: this.options.reconnectionAttempts,
        reason: 'Unknown reason, using default strategy',
      }
    )
  }

  // ==================== v1.12.2 私有方法 ====================

  /**
   * Start quality monitoring (v1.12.2 new)
   * Periodically checks connection quality and triggers alerts
   */
  private startQualityMonitoring(): void {
    this.stopQualityMonitoring()

    this.qualityCheckTimer = setInterval(() => {
      this.checkConnectionQuality()
    }, this.QUALITY_CHECK_INTERVAL)

    logger.info('[WebSocketManager] Quality monitoring started')
  }

  /**
   * Stop quality monitoring (v1.12.2 new)
   */
  private stopQualityMonitoring(): void {
    if (this.qualityCheckTimer) {
      clearInterval(this.qualityCheckTimer)
      this.qualityCheckTimer = null
      logger.info('[WebSocketManager] Quality monitoring stopped')
    }
  }

  /**
   * Check connection quality and trigger alerts if needed (v1.12.2 new)
   */
  private checkConnectionQuality(): void {
    if (this.state !== ConnectionState.CONNECTED) {
      return
    }

    const currentQuality = this.calculateConnectionQuality()
    this.stats.connectionQuality = currentQuality

    // Check if quality level changed
    if (currentQuality.qualityLevel !== this.lastQualityLevel) {
      logger.info(
        `[WebSocketManager] Quality level changed: ${this.lastQualityLevel} -> ${currentQuality.qualityLevel}`,
        {
          overallScore: currentQuality.overallScore,
          latencyScore: currentQuality.latencyScore,
          stabilityScore: currentQuality.stabilityScore,
        }
      )

      // Trigger alerts
      this.qualityAlerts.forEach(config => {
        this.checkAlert(config, currentQuality)
      })

      this.lastQualityLevel = currentQuality.qualityLevel
    }
  }

  /**
   * Check if alert should be triggered (v1.12.2 new)
   */
  private checkAlert(
    config: QualityAlertConfig,
    quality: ConnectionQuality
  ): void {
    const now = Date.now()
    const alertKey = `${config.triggerLevel}_${config.singleAlert ? 'single' : 'multi'}`

    // Check if quality level matches or is worse than trigger level
    const levelOrder = ['excellent', 'good', 'fair', 'poor', 'critical'] as const
    const currentLevelIndex = levelOrder.indexOf(quality.qualityLevel)
    const triggerLevelIndex = levelOrder.indexOf(config.triggerLevel)

    const shouldAlert = currentLevelIndex >= triggerLevelIndex

    if (shouldAlert) {
      // Check cooldown
      const lastAlertTime = this.lastAlertTime.get(alertKey)
      const inCooldown = lastAlertTime && now - lastAlertTime < config.cooldownMs

      if (!inCooldown) {
        try {
          config.onAlert(quality, null)
          this.lastAlertTime.set(alertKey, now)

          // Track quality degradation
          monitor.trackCustomMetric(
            'websocket_quality_degraded',
            quality.overallScore,
            'score',
            {
              level: quality.qualityLevel,
              triggerLevel: config.triggerLevel,
              url: this.options.url,
            }
          )

          logger.warn('[WebSocketManager] Quality alert triggered:', {
            level: quality.qualityLevel,
            overallScore: quality.overallScore,
            triggerLevel: config.triggerLevel,
          })
        } catch (error) {
          logger.error('[WebSocketManager] Error in quality alert callback:', error)
        }
      }
    } else if (config.onRecovered) {
      // Quality recovered
      const previousLevel = this.lastQualityLevel
      const previousLevelIndex = levelOrder.indexOf(previousLevel || 'excellent')

      if (previousLevelIndex >= triggerLevelIndex && currentLevelIndex < triggerLevelIndex) {
        try {
          config.onRecovered(quality)
          logger.info('[WebSocketManager] Quality recovered:', {
            level: quality.qualityLevel,
            overallScore: quality.overallScore,
          })
        } catch (error) {
          logger.error('[WebSocketManager] Error in quality recovered callback:', error)
        }
      }
    }
  }

  /**
   * Record reconnection event (v1.12.2 new)
   */
  private recordReconnection(record: ReconnectionRecord): void {
    this.reconnectionHistory.push(record)

    // Keep only recent records
    if (this.reconnectionHistory.length > WebSocketManager.MAX_RECONNECTION_HISTORY) {
      this.reconnectionHistory.shift()
    }

    // Track reconnection metrics
    monitor.trackCustomMetric('websocket_reconnection_recorded', 1, 'count', {
      attempt: record.attempt,
      result: record.result,
      reason: record.reason,
    })

    logger.info('[WebSocketManager] Reconnection recorded:', {
      attempt: record.attempt,
      result: record.result,
      reason: record.reason,
      duration: record.duration,
    })

    // Persist state after recording reconnection
    this.persistState()
  }

  /**
   * Persist connection state to localStorage (v1.12.2 new)
   */
  private persistState(): void {
    if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
      return
    }

    try {
      const state: PersistedConnectionState = {
        url: this.options.url,
        lastActiveTime: this.stats.lastActiveTime,
        lastConnectedTime: this.lastConnectedTime,
        lastDisconnectedTime: this.lastDisconnectedTime,
        lastConnectionQuality: this.stats.connectionQuality || null,
        recentReconnections: this.reconnectionHistory.slice(-20),
        sessionId: this.sessionId,
        totalReconnections: this.totalReconnections,
        totalConnections: this.totalConnections,
      }

      window.localStorage.setItem(
        WebSocketManager.STORAGE_KEY,
        JSON.stringify(state)
      )
    } catch (error) {
      logger.error('[WebSocketManager] Failed to persist state:', error)
    }
  }

  /**
   * Load persisted connection state from localStorage (v1.12.2 new)
   */
  private loadPersistedState(): void {
    if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
      return
    }

    try {
      const stored = window.localStorage.getItem(WebSocketManager.STORAGE_KEY)
      if (!stored) {
        return
      }

      const state: PersistedConnectionState = JSON.parse(stored)

      // Restore reconnection history
      this.reconnectionHistory = state.recentReconnections || []
      this.totalReconnections = state.totalReconnections || 0
      this.totalConnections = state.totalConnections || 0
      this.lastConnectedTime = state.lastConnectedTime || 0
      this.lastDisconnectedTime = state.lastDisconnectedTime || 0

      logger.info('[WebSocketManager] Loaded persisted state:', {
        sessionId: state.sessionId,
        totalReconnections: this.totalReconnections,
        totalConnections: this.totalConnections,
        historyLength: this.reconnectionHistory.length,
      })

      // Track state restoration
      monitor.trackCustomMetric('websocket_state_restored', 1, 'count', {
        historyLength: this.reconnectionHistory.length,
        url: this.options.url,
      })
    } catch (error) {
      logger.error('[WebSocketManager] Failed to load persisted state:', error)
    }
  }
}
