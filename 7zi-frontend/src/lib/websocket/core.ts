/**
 * WebSocket Client Core
 *
 * 核心 WebSocketClient 类实现
 *
 * 版本: 1.12.2
 * 更新日期: 2026-04-04
 */

import { io, Socket } from 'socket.io-client'
import { logger } from '@/lib/logger'
import { generateSecureId } from '@/lib/utils'
import { monitor } from '@/lib/monitoring'
import { MessageCompressor } from '../websocket-compression'
import {
  ConnectionState,
  WebSocketManagerOptions,
  ConnectionStats,
  ConnectionQuality,
  ReconnectionRecord,
  PersistedConnectionState,
  QualityAlertConfig,
  HealthCheckResult,
  ConnectionStateListener,
  MessageListener,
  QueuedMessage,
} from './types'
import {
  DEFAULT_RECONNECTION_CONFIG,
  DEFAULT_HEARTBEAT_CONFIG,
  DEFAULT_QUEUE_CONFIG,
  DEFAULT_TRANSPORTS,
  QUALITY_CHECK_INTERVAL,
  MAX_RECONNECTION_HISTORY,
  CONNECTION_STATE_STORAGE_KEY,
  QUALITY_LEVEL_ORDER,
} from './constants'

/**
 * WebSocket Client Class
 */
export class WebSocketClient {
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
      overallScore: 100,
      lastUpdated: Date.now(),
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
    transports: DEFAULT_TRANSPORTS,
    heartbeatInterval: DEFAULT_HEARTBEAT_CONFIG.interval,
    heartbeatTimeout: DEFAULT_HEARTBEAT_CONFIG.timeout,
    reconnectionDelay: DEFAULT_RECONNECTION_CONFIG.delay,
    reconnectionDelayMax: DEFAULT_RECONNECTION_CONFIG.delayMax,
    reconnectionAttempts: DEFAULT_RECONNECTION_CONFIG.attempts,
    maxQueueSize: DEFAULT_QUEUE_CONFIG.maxSize,
    queueExpiry: DEFAULT_QUEUE_CONFIG.expiry,
    auth: {},
    compression: { shortenFields: true, enableBatching: true, batchSize: 10, batchDelay: 16, minCompressSize: 200 },
  }

  // Connection state persistence
  private sessionId: string
  private lastConnectedTime: number = 0
  private lastDisconnectedTime: number = 0
  private totalConnections: number = 0

  // Reconnection history tracking
  private reconnectionHistory: ReconnectionRecord[] = []
  private currentReconnectionStartTime: number = 0

  // Quality alerting
  private qualityAlerts: QualityAlertConfig[] = []
  private lastAlertTime: Map<string, number> = new Map()
  private lastQualityLevel: ConnectionQuality['qualityLevel'] | null = null
  private qualityCheckTimer: NodeJS.Timeout | null = null
  private readonly QUALITY_CHECK_INTERVAL = QUALITY_CHECK_INTERVAL

  constructor(options: WebSocketManagerOptions) {
    this.options = { ...WebSocketClient.DEFAULT_OPTIONS, ...options }
    this.lastPongTime = Date.now()

    // Generate session ID and load persisted state
    this.sessionId = generateSecureId('ws')
    this.loadPersistedState()

    // Initialize compressor with config
    this.compressor = new MessageCompressor(this.options.compression)

    // Set up network event listeners
    this.setupNetworkListeners()

    // Start quality monitoring
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
      logger.info('[WebSocketClient] Already connected')
      return
    }

    if (this.state === ConnectionState.CONNECTING || this.state === ConnectionState.RECONNECTING) {
      logger.info('[WebSocketClient] Connection already in progress')
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

        logger.info(`[WebSocketClient] Connected in ${connectTime}ms`)
      })

      this.setupSocketListeners()
    } catch (error) {
      // This catch is for any synchronous errors during import setup
      logger.error(
        '[WebSocketClient] Failed to setup connection:',
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

    // Stop quality monitoring
    this.stopQualityMonitoring()

    // Record disconnect time
    this.lastDisconnectedTime = Date.now()

    // 清理压缩器
    this.compressor.destroy()

    // Save state before disconnect
    this.persistState()

    this.setState(ConnectionState.DISCONNECTED)
    this.reconnectionAttempts = 0
    this.stats.currentPingLatency = 0
  }

  /**
   * Emit message to server
   */
  emit(event: string, data: unknown, queueIfOffline = true): boolean {
    if (this.socket?.connected) {
      const compressed = this.compressor.compressForSend(event, data)
      this.socket.emit('__compressed', compressed)

      this.stats.messagesSent++
      this.stats.lastActiveTime = Date.now()
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
    logger.info('[WebSocketClient] Message queue cleared')
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
  getCompressionStats(): ReturnType<MessageCompressor['getStats']> {
    return this.compressor.getStats()
  }

  // ==================== v1.12.2 新增功能 ====================

  /**
   * Get reconnection history
   */
  getReconnectionHistory(): ReconnectionRecord[] {
    return [...this.reconnectionHistory]
  }

  /**
   * Get persisted connection state
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
   * Register quality alert
   */
  registerQualityAlert(config: QualityAlertConfig): void {
    this.qualityAlerts.push(config)
    logger.info('[WebSocketClient] Quality alert registered:', {
      triggerLevel: config.triggerLevel,
      singleAlert: config.singleAlert,
    })
  }

  /**
   * Unregister quality alert
   */
  unregisterQualityAlert(config: QualityAlertConfig): void {
    const index = this.qualityAlerts.indexOf(config)
    if (index > -1) {
      this.qualityAlerts.splice(index, 1)
    }
  }

  /**
   * Perform health check
   */
  healthCheck(): HealthCheckResult {
    const issues: string[] = []
    const quality = this.calculateConnectionQuality()
    const now = Date.now()

    if (this.stats.currentPingLatency > 500) {
      issues.push(`High latency: ${this.stats.currentPingLatency}ms`)
    }

    if (this.stats.lastPingTime > 0) {
      const timeSinceLastPing = now - this.stats.lastPingTime
      if (timeSinceLastPing > this.options.heartbeatInterval + this.options.heartbeatTimeout) {
        issues.push('No ping response received within expected time')
      }
    }

    if (this.missedHeartbeats > 0) {
      issues.push(`Missed heartbeats: ${this.missedHeartbeats}`)
    }

    if (this.state !== ConnectionState.CONNECTED) {
      issues.push(`Not connected, current state: ${this.state}`)
    }

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
   * Get current session ID
   */
  getSessionId(): string {
    return this.sessionId
  }

  /**
   * Clear reconnection history
   */
  clearReconnectionHistory(): void {
    this.reconnectionHistory = []
    logger.info('[WebSocketClient] Reconnection history cleared')
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
    logger.info('[WebSocketClient] Statistics reset')
  }

  // ==================== 私有方法 ====================

  /**
   * Set up socket event listeners
   */
  private setupSocketListeners(): void {
    if (!this.socket) return

    this.socket.on('connect', () => {
      logger.info('[WebSocketClient] Connected to server')

      this.lastConnectedTime = Date.now()
      this.totalConnections++

      if (this.reconnectionAttempts > 0 || this.state === ConnectionState.RECONNECTING) {
        this.stats.totalReconnections++

        const duration = this.currentReconnectionStartTime > 0
          ? Date.now() - this.currentReconnectionStartTime
          : undefined

        this.recordReconnection({
          id: generateSecureId('reconn'),
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

      this.persistState()
    })

    this.socket.on('disconnect', reason => {
      logger.info('[WebSocketClient] Disconnected:', { reason })

      const strategy = this.getReconnectStrategy(reason)

      if (this.reconnectionAttempts > 0 || this.state === ConnectionState.RECONNECTING) {
        this.recordReconnection({
          id: generateSecureId('reconn'),
          timestamp: Date.now(),
          attempt: this.reconnectionAttempts,
          reason: reason,
          previousState: this.state,
          result: strategy.shouldReconnect ? 'aborted' : 'failed',
        })
      }

      if (!strategy.shouldReconnect) {
        logger.info('[WebSocketClient] Not reconnecting:', { reason: strategy.reason })
        this.setState(ConnectionState.DISCONNECTED)
        this.stopHeartbeat()
      } else {
        this.setState(ConnectionState.RECONNECTING)
        this.stopHeartbeat()
        this.scheduleReconnection(strategy.initialDelay)
      }

      this.lastDisconnectedTime = Date.now()
    })

    this.socket.on('connect_error', error => {
      logger.error('[WebSocketClient] Connection error:', error as Error)
      this.setState(ConnectionState.ERROR)
      this.scheduleReconnection()
    })

    this.socket.on('error', error => {
      logger.error('[WebSocketClient] Socket error:', error as Error)
    })

    this.socket.on('pong', () => {
      this.lastPongTime = Date.now()
      this.missedHeartbeats = 0
      this.consecutiveSuccessfulHeartbeats++

      if (this.stats.lastPingTime > 0) {
        const latency = this.lastPongTime - this.stats.lastPingTime
        this.stats.currentPingLatency = latency

        monitor.trackCustomMetric('websocket_latency', latency, 'ms', {
          url: this.options.url,
        })

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

    this.socket.onAny((event: string, ...args: unknown[]) => {
      let data = args.length > 1 ? args : args[0]

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

        this.heartbeatTimeoutTimer = setTimeout(() => {
          this.missedHeartbeats++
          this.failedHeartbeatAttempts++
          this.consecutiveSuccessfulHeartbeats = 0

          logger.warn(`[WebSocketClient] Missed heartbeat ${this.missedHeartbeats}/${3}`)

          monitor.trackCustomMetric('websocket_heartbeat_missed', 1, 'count', {
            totalMissed: this.missedHeartbeats,
            url: this.options.url,
          })

          if (this.missedHeartbeats >= 3) {
            logger.error('[WebSocketClient] Too many missed heartbeats, reconnecting...')

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
   */
  private scheduleReconnection(initialDelay?: number): void {
    if (this.reconnectionAttempts >= this.options.reconnectionAttempts) {
      logger.error('[WebSocketClient] Max reconnection attempts reached')

      this.recordReconnection({
        id: generateSecureId('reconn'),
        timestamp: Date.now(),
        attempt: this.reconnectionAttempts,
        reason: 'max_attempts_reached',
        previousState: this.state,
        result: 'failed',
        error: 'Max reconnection attempts reached',
      })

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

    if (this.currentReconnectionStartTime === 0) {
      this.currentReconnectionStartTime = Date.now()
    }

    const baseDelay = this.options.reconnectionDelay * Math.pow(2, this.reconnectionAttempts)
    const jitter = Math.random() * baseDelay * 0.5
    const delay = Math.min(baseDelay + jitter, this.options.reconnectionDelayMax)
    const finalDelay = initialDelay && this.reconnectionAttempts === 0 ? initialDelay : delay

    this.reconnectionAttempts++

    monitor.trackCustomMetric('websocket_reconnect_attempt', 1, 'count', {
      attempt: this.reconnectionAttempts,
      delayMs: Math.round(finalDelay),
      url: this.options.url,
    })

    logger.info(
      `[WebSocketClient] Scheduling reconnection attempt ${this.reconnectionAttempts} in ${Math.round(finalDelay)}ms (base: ${Math.round(baseDelay)}ms, jitter: +${Math.round(jitter)}ms)`
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
    this.cleanExpiredMessages()

    if (this.queue.length >= this.options.maxQueueSize) {
      this.queue.shift()
      logger.warn('[WebSocketClient] Queue full, removed oldest message')
    }

    const message: QueuedMessage = {
      id: generateSecureId('msg'),
      event,
      data,
      timestamp: Date.now(),
      retryCount: 0,
    }

    this.queue.push(message)
    logger.info(`[WebSocketClient] Message queued: ${event} (queue size: ${this.queue.length})`)
  }

  /**
   * Send all queued messages
   */
  private sendQueuedMessages(): void {
    if (this.queue.length === 0) {
      return
    }

    logger.info(`[WebSocketClient] Sending ${this.queue.length} queued messages`)

    const messages = [...this.queue]
    this.queue = []

    messages.forEach(message => {
      try {
        this.socket?.emit(message.event, message.data)
      } catch (error) {
        logger.error(
          `[WebSocketClient] Failed to send queued message ${message.id}:`,
          error instanceof Error ? error : undefined
        )
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
        `[WebSocketClient] Removed ${originalSize - this.queue.length} expired messages from queue`
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

    logger.info(`[WebSocketClient] State changed: ${previousState} -> ${newState}`)

    this.stateListeners.forEach(listener => {
      try {
        listener(newState, previousState)
      } catch (error) {
        logger.error(
          '[WebSocketClient] Error in state listener:',
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
            `[WebSocketClient] Error in message listener for ${event}:`,
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
      logger.info('[WebSocketClient] Network online, attempting fast reconnect')
      if (this.state !== ConnectionState.CONNECTED && this.state !== ConnectionState.CONNECTING) {
        this.fastReconnect()
      }
    }

    this._offlineHandler = () => {
      logger.info('[WebSocketClient] Network offline')
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
    logger.info('[WebSocketClient] Fast reconnect initiated')
    this.reconnectionAttempts = 0
    this.connect()
  }

  /**
   * Calculate connection quality metrics
   */
  private calculateConnectionQuality(): ConnectionQuality {
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

    const totalHeartbeats = this.consecutiveSuccessfulHeartbeats + this.failedHeartbeatAttempts
    const successRate = totalHeartbeats > 0
      ? this.consecutiveSuccessfulHeartbeats / totalHeartbeats
      : 1

    const timeSinceReset = Date.now() - this.lastResetTime
    const timeFactor = Math.min(timeSinceReset / 60000, 1)

    const stabilityScore = Math.round(successRate * 100 * (0.5 + 0.5 * timeFactor))

    const heartbeatInterval = this.options.heartbeatInterval
    const expectedHeartbeats = Math.max(1, Math.floor(timeSinceReset / heartbeatInterval))
    const packetLossEstimate = expectedHeartbeats > 0
      ? Math.min(this.failedHeartbeatAttempts / expectedHeartbeats, 1)
      : 0

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
        initialDelay: 500,
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
        initialDelay: 2000,
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

  /**
   * Start quality monitoring
   */
  private startQualityMonitoring(): void {
    this.stopQualityMonitoring()

    this.qualityCheckTimer = setInterval(() => {
      this.checkConnectionQuality()
    }, this.QUALITY_CHECK_INTERVAL)

    logger.info('[WebSocketClient] Quality monitoring started')
  }

  /**
   * Stop quality monitoring
   */
  private stopQualityMonitoring(): void {
    if (this.qualityCheckTimer) {
      clearInterval(this.qualityCheckTimer)
      this.qualityCheckTimer = null
      logger.info('[WebSocketClient] Quality monitoring stopped')
    }
  }

  /**
   * Check connection quality and trigger alerts if needed
   */
  private checkConnectionQuality(): void {
    if (this.state !== ConnectionState.CONNECTED) {
      return
    }

    const currentQuality = this.calculateConnectionQuality()
    this.stats.connectionQuality = currentQuality

    if (currentQuality.qualityLevel !== this.lastQualityLevel) {
      logger.info(
        `[WebSocketClient] Quality level changed: ${this.lastQualityLevel} -> ${currentQuality.qualityLevel}`,
        {
          overallScore: currentQuality.overallScore,
          latencyScore: currentQuality.latencyScore,
          stabilityScore: currentQuality.stabilityScore,
        }
      )

      this.qualityAlerts.forEach(config => {
        this.checkAlert(config, currentQuality)
      })

      this.lastQualityLevel = currentQuality.qualityLevel
    }
  }

  /**
   * Check if alert should be triggered
   */
  private checkAlert(
    config: QualityAlertConfig,
    quality: ConnectionQuality
  ): void {
    const now = Date.now()
    const alertKey = `${config.triggerLevel}_${config.singleAlert ? 'single' : 'multi'}`

    const currentLevelIndex = QUALITY_LEVEL_ORDER.indexOf(quality.qualityLevel)
    const triggerLevelIndex = QUALITY_LEVEL_ORDER.indexOf(config.triggerLevel)

    const shouldAlert = currentLevelIndex >= triggerLevelIndex

    if (shouldAlert) {
      const lastAlertTime = this.lastAlertTime.get(alertKey)
      const inCooldown = lastAlertTime && now - lastAlertTime < config.cooldownMs

      if (!inCooldown) {
        try {
          config.onAlert(quality, null)
          this.lastAlertTime.set(alertKey, now)

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

          logger.warn('[WebSocketClient] Quality alert triggered:', {
            level: quality.qualityLevel,
            overallScore: quality.overallScore,
            triggerLevel: config.triggerLevel,
          })
        } catch (error) {
          logger.error('[WebSocketClient] Error in quality alert callback:', error as Error)
        }
      }
    } else if (config.onRecovered) {
      const previousLevel = this.lastQualityLevel
      const previousLevelIndex = QUALITY_LEVEL_ORDER.indexOf(previousLevel || 'excellent')

      if (previousLevelIndex >= triggerLevelIndex && currentLevelIndex < triggerLevelIndex) {
        try {
          config.onRecovered(quality)
          logger.info('[WebSocketClient] Quality recovered:', {
            level: quality.qualityLevel,
            overallScore: quality.overallScore,
          })
        } catch (error) {
          logger.error('[WebSocketClient] Error in quality recovered callback:', error as Error)
        }
      }
    }
  }

  /**
   * Record reconnection event
   */
  private recordReconnection(record: ReconnectionRecord): void {
    this.reconnectionHistory.push(record)

    if (this.reconnectionHistory.length > MAX_RECONNECTION_HISTORY) {
      this.reconnectionHistory.shift()
    }

    monitor.trackCustomMetric('websocket_reconnection_recorded', 1, 'count', {
      attempt: record.attempt,
      result: record.result,
      reason: record.reason,
    })

    logger.info('[WebSocketClient] Reconnection recorded:', {
      attempt: record.attempt,
      result: record.result,
      reason: record.reason,
      duration: record.duration,
    })

    this.persistState()
  }

  /**
   * Persist connection state to localStorage
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
        CONNECTION_STATE_STORAGE_KEY,
        JSON.stringify(state)
      )
    } catch (error) {
      logger.error('[WebSocketClient] Failed to persist state:', error as Error)
    }
  }

  /**
   * Load persisted connection state from localStorage
   */
  private loadPersistedState(): void {
    if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
      return
    }

    try {
      const stored = window.localStorage.getItem(CONNECTION_STATE_STORAGE_KEY)
      if (!stored) {
        return
      }

      const state: PersistedConnectionState = JSON.parse(stored)

      this.reconnectionHistory = state.recentReconnections || []
      this.totalReconnections = state.totalReconnections || 0
      this.totalConnections = state.totalConnections || 0
      this.lastConnectedTime = state.lastConnectedTime || 0
      this.lastDisconnectedTime = state.lastDisconnectedTime || 0

      logger.info('[WebSocketClient] Loaded persisted state:', {
        sessionId: state.sessionId,
        totalReconnections: this.totalReconnections,
        totalConnections: this.totalConnections,
        historyLength: this.reconnectionHistory.length,
      })

      monitor.trackCustomMetric('websocket_state_restored', 1, 'count', {
        historyLength: this.reconnectionHistory.length,
        url: this.options.url,
      })
    } catch (error) {
      logger.error('[WebSocketClient] Failed to load persisted state:', error as Error)
    }
  }
}
