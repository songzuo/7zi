/**
 * WebSocket Connection Manager with Reconnection Support
 * 
 * Features:
 * - Heartbeat detection mechanism (ping/pong)
 * - Automatic reconnection with exponential backoff + jitter
 * - Connection state management
 * - Message queue for offline message buffering
 * - Connection monitoring metrics
 * 
 * Technical Stack: Node.js + ws library
 * 
 * @author Executor Subagent
 * @date 2026-04-03
 */

import WebSocket from 'ws'
import EventEmitter from 'events'

/**
 * Connection states
 */
export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  ERROR = 'error'
}

/**
 * Connection configuration options
 */
export interface WebSocketManagerConfig {
  /** WebSocket server URL (ws:// or wss://) */
  url: string
  /** Automatically connect on instantiation */
  autoConnect?: boolean
  /** Heartbeat interval in milliseconds (default: 30000) */
  heartbeatInterval?: number
  /** Heartbeat timeout in milliseconds (default: 10000) */
  heartbeatTimeout?: number
  /** Initial reconnection delay in milliseconds (default: 1000) */
  reconnectionDelay?: number
  /** Maximum reconnection delay in milliseconds (default: 30000) */
  reconnectionDelayMax?: number
  /** Maximum reconnection attempts (default: Infinity) */
  maxReconnectionAttempts?: number
  /** Maximum messages in queue (default: 100) */
  maxQueueSize?: number
  /** Message expiry time in milliseconds (default: 300000 = 5 min) */
  messageExpiry?: number
  /** Enable debug logging */
  debug?: boolean
  /** WebSocket protocols */
  protocols?: string | string[]
  /** Custom headers */
  headers?: Record<string, string>
  /** Connection timeout in milliseconds (default: 10000) */
  connectionTimeout?: number
}

/**
 * Queued message structure
 */
interface QueuedMessage {
  id: string
  data: string | Buffer
  timestamp: number
  retryCount: number
}

/**
 * Connection metrics
 */
export interface ConnectionMetrics {
  /** Total messages sent */
  messagesSent: number
  /** Total messages received */
  messagesReceived: number
  /** Total reconnection attempts */
  totalReconnections: number
  /** Failed reconnection attempts */
  failedReconnections: number
  /** Current ping latency in milliseconds */
  currentLatency: number
  /** Average ping latency in milliseconds */
  averageLatency: number
  /** Last successful connection time */
  lastConnectedTime: number | null
  /** Last disconnect time */
  lastDisconnectedTime: number | null
  /** Total connection time in milliseconds */
  totalConnectionTime: number
  /** Missed heartbeats count */
  missedHeartbeats: number
  /** Queue size */
  queueSize: number
  /** Connection state */
  state: ConnectionState
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: Required<Omit<WebSocketManagerConfig, 'url' | 'protocols' | 'headers'>> = {
  autoConnect: true,
  heartbeatInterval: 30000,      // 30 seconds
  heartbeatTimeout: 10000,       // 10 seconds
  reconnectionDelay: 1000,       // 1 second initial delay
  reconnectionDelayMax: 30000,   // 30 seconds max delay
  maxReconnectionAttempts: Infinity,
  maxQueueSize: 100,
  messageExpiry: 300000,         // 5 minutes
  debug: false,
  connectionTimeout: 10000       // 10 seconds
}

/**
 * WebSocket Connection Manager Class
 * 
 * Provides robust WebSocket connection management with:
 * - Automatic heartbeat (ping/pong) detection
 * - Exponential backoff reconnection with jitter
 * - Connection state management
 * - Message queueing for offline periods
 * - Comprehensive metrics tracking
 */
export class WebSocketConnectionManager extends EventEmitter {
  private ws: WebSocket | null = null
  private config: Required<WebSocketManagerConfig> & Pick<WebSocketManagerConfig, 'protocols' | 'headers'>
  private state: ConnectionState = ConnectionState.DISCONNECTED
  
  // Heartbeat management
  private heartbeatTimer: NodeJS.Timeout | null = null
  private heartbeatTimeoutTimer: NodeJS.Timeout | null = null
  private lastPongTime: number = 0
  private missedHeartbeats: number = 0
  private pingStartTime: number = 0
  
  // Reconnection management
  private reconnectionAttempts: number = 0
  private reconnectionTimer: NodeJS.Timeout | null = null
  private connectionTimer: NodeJS.Timeout | null = null
  
  // Message queue
  private messageQueue: QueuedMessage[] = []
  
  // Metrics
  private metrics: ConnectionMetrics = {
    messagesSent: 0,
    messagesReceived: 0,
    totalReconnections: 0,
    failedReconnections: 0,
    currentLatency: 0,
    averageLatency: 0,
    lastConnectedTime: null,
    lastDisconnectedTime: null,
    totalConnectionTime: 0,
    missedHeartbeats: 0,
    queueSize: 0,
    state: ConnectionState.DISCONNECTED
  }
  
  // Latency history for averaging
  private latencyHistory: number[] = []
  private connectionStartTime: number = 0

  constructor(config: WebSocketManagerConfig) {
    super()
    
    this.config = {
      ...DEFAULT_CONFIG,
      ...config
    } as Required<WebSocketManagerConfig> & Pick<WebSocketManagerConfig, 'protocols' | 'headers'>
    
    if (this.config.autoConnect) {
      this.connect()
    }
  }

  /**
   * Connect to WebSocket server
   */
  public connect(): void {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      this.log('Already connected or connecting')
      return
    }

    if (this.state === ConnectionState.CONNECTING || this.state === ConnectionState.RECONNECTING) {
      this.log('Connection already in progress')
      return
    }

    const previousState = this.state
    this.setState(
      previousState === ConnectionState.DISCONNECTED || previousState === ConnectionState.ERROR
        ? ConnectionState.CONNECTING
        : ConnectionState.RECONNECTING
    )

    this.connectionStartTime = Date.now()
    
    try {
      const options: WebSocket.ClientOptions = {
        handshakeTimeout: this.config.connectionTimeout,
        headers: this.config.headers
      }
      
      this.ws = this.config.protocols
        ? new WebSocket(this.config.url, this.config.protocols, options)
        : new WebSocket(this.config.url, options)

      this.setupEventHandlers()
      
      // Set connection timeout
      this.connectionTimer = setTimeout(() => {
        if (this.ws && this.ws.readyState !== WebSocket.OPEN) {
          this.log('Connection timeout')
          this.ws.terminate()
        }
      }, this.config.connectionTimeout)
      
    } catch (error) {
      this.logError('Failed to create WebSocket connection', error)
      this.setState(ConnectionState.ERROR)
      this.scheduleReconnection()
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  public disconnect(): void {
    this.log('Disconnecting...')
    
    // Clear all timers
    this.clearTimers()
    
    // Reset reconnection attempts
    this.reconnectionAttempts = 0
    
    // Close WebSocket if exists
    if (this.ws) {
      // Don't reconnect on manual disconnect
      this.ws.removeAllListeners()
      
      if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
        this.ws.close(1000, 'Client disconnect')
      }
      
      this.ws = null
    }
    
    this.setState(ConnectionState.DISCONNECTED)
    this.emit('disconnected')
  }

  /**
   * Send message to server
   * If disconnected, queues the message for later sending
   */
  public send(data: string | Buffer, queueIfOffline: boolean = true): boolean {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(data)
        this.metrics.messagesSent++
        this.emit('message-sent', data)
        return true
      } catch (error) {
        this.logError('Failed to send message', error)
        if (queueIfOffline) {
          this.queueMessage(data)
        }
        return false
      }
    }
    
    if (queueIfOffline) {
      this.queueMessage(data)
    }
    
    return false
  }

  /**
   * Get current connection state
   */
  public getState(): ConnectionState {
    return this.state
  }

  /**
   * Check if connected
   */
  public isConnected(): boolean {
    return this.state === ConnectionState.CONNECTED
  }

  /**
   * Get connection metrics
   */
  public getMetrics(): ConnectionMetrics {
    return {
      ...this.metrics,
      queueSize: this.messageQueue.length,
      state: this.state
    }
  }

  /**
   * Get message queue size
   */
  public getQueueSize(): number {
    return this.messageQueue.length
  }

  /**
   * Clear message queue
   */
  public clearQueue(): void {
    this.messageQueue = []
    this.log('Message queue cleared')
  }

  /**
   * Force reconnection
   */
  public reconnect(): void {
    this.log('Force reconnection requested')
    this.reconnectionAttempts = 0
    
    if (this.ws) {
      this.ws.close(1000, 'Force reconnect')
    }
    
    this.setState(ConnectionState.RECONNECTING)
    this.scheduleReconnection(0)
  }

  /**
   * Update configuration
   */
  public updateConfig(config: Partial<WebSocketManagerConfig>): void {
    this.config = { ...this.config, ...config } as Required<WebSocketManagerConfig> & Pick<WebSocketManagerConfig, 'protocols' | 'headers'>
    this.log('Configuration updated')
  }

  /**
   * Set up WebSocket event handlers
   */
  private setupEventHandlers(): void {
    if (!this.ws) return

    this.ws.on('open', () => {
      this.handleOpen()
    })

    this.ws.on('message', (data: WebSocket.Data) => {
      this.handleMessage(data)
    })

    this.ws.on('pong', (data: Buffer) => {
      this.handlePong(data)
    })

    this.ws.on('close', (code: number, reason: Buffer) => {
      this.handleClose(code, reason)
    })

    this.ws.on('error', (error: Error) => {
      this.handleError(error)
    })

    this.ws.on('ping', (data: Buffer) => {
      // Respond to server pings automatically
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.pong(data)
      }
    })
  }

  /**
   * Handle connection open
   */
  private handleOpen(): void {
    this.log('Connected to server')
    
    // Clear connection timer
    if (this.connectionTimer) {
      clearTimeout(this.connectionTimer)
      this.connectionTimer = null
    }
    
    // Update state and metrics
    const previousState = this.state
    this.setState(ConnectionState.CONNECTED)
    
    if (previousState === ConnectionState.RECONNECTING) {
      this.metrics.totalReconnections++
      this.emit('reconnected')
    }
    
    this.metrics.lastConnectedTime = Date.now()
    this.reconnectionAttempts = 0
    this.missedHeartbeats = 0
    
    // Start heartbeat
    this.startHeartbeat()
    
    // Send queued messages
    this.sendQueuedMessages()
    
    this.emit('connected')
  }

  /**
   * Handle incoming message
   */
  private handleMessage(data: WebSocket.Data): void {
    this.metrics.messagesReceived++
    this.metrics.totalConnectionTime = this.metrics.lastConnectedTime 
      ? Date.now() - this.metrics.lastConnectedTime 
      : 0
    
    this.emit('message', data)
  }

  /**
   * Handle pong response
   */
  private handlePong(data: Buffer): void {
    const now = Date.now()
    this.lastPongTime = now
    this.missedHeartbeats = 0
    
    // Calculate latency
    if (this.pingStartTime > 0) {
      const latency = now - this.pingStartTime
      this.metrics.currentLatency = latency
      
      // Update average latency
      this.latencyHistory.push(latency)
      if (this.latencyHistory.length > 100) {
        this.latencyHistory.shift()
      }
      this.metrics.averageLatency = this.latencyHistory.reduce((a, b) => a + b, 0) / this.latencyHistory.length
      
      this.emit('latency', latency)
      this.pingStartTime = 0
    }
    
    // Clear heartbeat timeout
    if (this.heartbeatTimeoutTimer) {
      clearTimeout(this.heartbeatTimeoutTimer)
      this.heartbeatTimeoutTimer = null
    }
    
    this.log(`Pong received, latency: ${this.metrics.currentLatency}ms`)
  }

  /**
   * Handle connection close
   */
  private handleClose(code: number, reason: Buffer): void {
    this.log(`Connection closed: code=${code}, reason=${reason.toString()}`)
    
    this.metrics.lastDisconnectedTime = Date.now()
    
    // Stop heartbeat
    this.stopHeartbeat()
    
    // Clear connection timer
    if (this.connectionTimer) {
      clearTimeout(this.connectionTimer)
      this.connectionTimer = null
    }
    
    // Determine if should reconnect
    const shouldReconnect = this.shouldReconnect(code)
    
    if (shouldReconnect && this.reconnectionAttempts < this.config.maxReconnectionAttempts) {
      this.setState(ConnectionState.RECONNECTING)
      this.scheduleReconnection()
    } else if (!shouldReconnect) {
      this.setState(ConnectionState.DISCONNECTED)
      this.emit('disconnected', code, reason.toString())
    } else {
      this.setState(ConnectionState.ERROR)
      this.emit('error', new Error('Max reconnection attempts reached'))
    }
  }

  /**
   * Handle WebSocket error
   */
  private handleError(error: Error): void {
    this.logError('WebSocket error', error)
    this.metrics.failedReconnections++
    this.setState(ConnectionState.ERROR)
    this.emit('error', error)
  }

  /**
   * Start heartbeat mechanism
   */
  private startHeartbeat(): void {
    this.stopHeartbeat()
    
    this.heartbeatTimer = setInterval(() => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        return
      }
      
      // Send ping
      this.pingStartTime = Date.now()
      this.ws.ping()
      
      // Set timeout for pong
      this.heartbeatTimeoutTimer = setTimeout(() => {
        this.missedHeartbeats++
        this.metrics.missedHeartbeats++
        
        this.log(`Heartbeat timeout, missed: ${this.missedHeartbeats}`)
        this.emit('heartbeat-missed', this.missedHeartbeats)
        
        // If too many missed heartbeats, reconnect
        if (this.missedHeartbeats >= 3) {
          this.log('Too many missed heartbeats, reconnecting...')
          this.ws?.terminate()
        }
      }, this.config.heartbeatTimeout)
      
    }, this.config.heartbeatInterval)
    
    this.log('Heartbeat started')
  }

  /**
   * Stop heartbeat mechanism
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
    
    this.log('Heartbeat stopped')
  }

  /**
   * Schedule reconnection with exponential backoff + jitter
   */
  private scheduleReconnection(initialDelay?: number): void {
    // Clear existing timer
    if (this.reconnectionTimer) {
      clearTimeout(this.reconnectionTimer)
      this.reconnectionTimer = null
    }
    
    // Check max attempts
    if (this.reconnectionAttempts >= this.config.maxReconnectionAttempts) {
      this.log('Max reconnection attempts reached')
      this.setState(ConnectionState.ERROR)
      this.emit('error', new Error('Max reconnection attempts reached'))
      return
    }
    
    // Calculate delay with exponential backoff
    const baseDelay = this.config.reconnectionDelay * Math.pow(2, this.reconnectionAttempts)
    
    // Add jitter (0-50% of base delay)
    const jitter = Math.random() * baseDelay * 0.5
    
    // Cap at max delay
    const delay = initialDelay !== undefined 
      ? initialDelay 
      : Math.min(baseDelay + jitter, this.config.reconnectionDelayMax)
    
    this.reconnectionAttempts++
    
    this.log(`Reconnecting in ${Math.round(delay)}ms (attempt ${this.reconnectionAttempts})`)
    this.emit('reconnecting', this.reconnectionAttempts, delay)
    
    this.reconnectionTimer = setTimeout(() => {
      this.reconnectionTimer = null
      this.connect()
    }, delay)
  }

  /**
   * Determine if should reconnect based on close code
   */
  private shouldReconnect(code: number): boolean {
    // Don't reconnect for normal closure or going away
    if (code === 1000 || code === 1001) {
      return false
    }
    
    // Reconnect for abnormal closures
    return true
  }

  /**
   * Queue message for later sending
   */
  private queueMessage(data: string | Buffer): void {
    // Remove expired messages
    this.cleanExpiredMessages()
    
    // Check queue size
    if (this.messageQueue.length >= this.config.maxQueueSize) {
      this.messageQueue.shift()
      this.log('Queue full, removed oldest message')
    }
    
    const message: QueuedMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      data,
      timestamp: Date.now(),
      retryCount: 0
    }
    
    this.messageQueue.push(message)
    this.log(`Message queued (queue size: ${this.messageQueue.length})`)
    this.emit('message-queued', message)
  }

  /**
   * Send all queued messages
   */
  private sendQueuedMessages(): void {
    if (this.messageQueue.length === 0) {
      return
    }
    
    this.log(`Sending ${this.messageQueue.length} queued messages`)
    
    const messages = [...this.messageQueue]
    this.messageQueue = []
    
    for (const message of messages) {
      try {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(message.data)
          this.metrics.messagesSent++
          message.retryCount++
        }
      } catch (error) {
        this.logError(`Failed to send queued message ${message.id}`, error)
        
        // Re-queue failed message (up to 3 times)
        message.retryCount++
        if (message.retryCount < 3) {
          this.messageQueue.push(message)
        }
      }
    }
  }

  /**
   * Remove expired messages from queue
   */
  private cleanExpiredMessages(): void {
    const now = Date.now()
    const originalSize = this.messageQueue.length
    
    this.messageQueue = this.messageQueue.filter(
      msg => now - msg.timestamp < this.config.messageExpiry
    )
    
    if (this.messageQueue.length !== originalSize) {
      this.log(`Removed ${originalSize - this.messageQueue.length} expired messages`)
    }
  }

  /**
   * Set connection state
   */
  private setState(newState: ConnectionState): void {
    if (this.state === newState) return
    
    const previousState = this.state
    this.state = newState
    this.metrics.state = newState
    
    this.log(`State changed: ${previousState} -> ${newState}`)
    this.emit('state-change', newState, previousState)
  }

  /**
   * Clear all timers
   */
  private clearTimers(): void {
    this.stopHeartbeat()
    
    if (this.reconnectionTimer) {
      clearTimeout(this.reconnectionTimer)
      this.reconnectionTimer = null
    }
    
    if (this.connectionTimer) {
      clearTimeout(this.connectionTimer)
      this.connectionTimer = null
    }
  }

  /**
   * Debug log
   */
  private log(message: string): void {
    if (this.config.debug) {
      console.log(`[WebSocketManager] ${message}`)
    }
  }

  /**
   * Error log
   */
  private logError(message: string, error: unknown): void {
    console.error(`[WebSocketManager] ${message}`, error)
  }
}

// Export types
export type { WebSocketManagerConfig, ConnectionMetrics }
