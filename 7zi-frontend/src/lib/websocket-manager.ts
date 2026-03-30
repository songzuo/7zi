/**
 * WebSocket Connection Manager
 *
 * Provides stable WebSocket connection with:
 * - Heartbeat monitoring (ping/pong)
 * - Exponential backoff reconnection
 * - Connection state management
 * - Message queue for offline messages
 */

import { io, Socket } from 'socket.io-client';
import { logger } from '@/lib/logger';

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
  id: string;
  event: string;
  data: unknown;
  timestamp: number;
  retryCount: number;
}

/**
 * Connection manager options
 */
export interface WebSocketManagerOptions {
  url: string;
  autoConnect?: boolean;
  transports?: ('websocket' | 'polling')[];
  heartbeatInterval?: number;
  heartbeatTimeout?: number;
  reconnectionDelay?: number;
  reconnectionDelayMax?: number;
  reconnectionAttempts?: number;
  maxQueueSize?: number;
  queueExpiry?: number;
  auth?: Record<string, unknown>;
}

/**
 * Connection statistics
 */
export interface ConnectionStats {
  messagesSent: number;
  messagesReceived: number;
  totalReconnections: number;
  lastActiveTime: number;
  lastPingTime: number;
  currentPingLatency: number;
  averagePingLatency: number;
}

/**
 * Connection state listener
 */
export type ConnectionStateListener = (state: ConnectionState, previousState: ConnectionState) => void;

/**
 * Message listener
 */
export type MessageListener = (event: string, data: unknown) => void;

/**
 * WebSocket Manager Class
 */
export class WebSocketManager {
  private socket: Socket | null = null;
  private state: ConnectionState = ConnectionState.DISCONNECTED;
  private stateListeners: Set<ConnectionStateListener> = new Set();
  private messageListeners: Map<string, Set<MessageListener>> = new Map();
  private queue: QueuedMessage[] = [];

  // Heartbeat
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private heartbeatTimeoutTimer: NodeJS.Timeout | null = null;
  private lastPongTime: number = 0;
  private missedHeartbeats: number = 0;

  // Reconnection
  private reconnectionAttempts: number = 0;
  private reconnectionTimer: NodeJS.Timeout | null = null;
  private totalReconnections: number = 0;

  // Statistics
  private stats: ConnectionStats = {
    messagesSent: 0,
    messagesReceived: 0,
    totalReconnections: 0,
    lastActiveTime: Date.now(),
    lastPingTime: 0,
    currentPingLatency: 0,
    averagePingLatency: 0,
  };

  // Ping latency history for average calculation
  private pingLatencies: number[] = [];

  // Network event handlers
  private _onlineHandler: (() => void) | null = null;
  private _offlineHandler: (() => void) | null = null;
  private _wasConnected: boolean = false;

  // Options
  private options: Required<WebSocketManagerOptions>;

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
  };

  constructor(options: WebSocketManagerOptions) {
    this.options = { ...WebSocketManager.DEFAULT_OPTIONS, ...options };
    this.lastPongTime = Date.now();

    // Set up network event listeners
    this.setupNetworkListeners();

    if (this.options.autoConnect) {
      this.connect();
    }
  }

  /**
   * Connect to WebSocket server
   */
  connect(): void {
    if (this.socket?.connected) {
      logger.info('[WebSocketManager] Already connected');
      return;
    }

    if (this.state === ConnectionState.CONNECTING || this.state === ConnectionState.RECONNECTING) {
      logger.info('[WebSocketManager] Connection already in progress');
      return;
    }

    const previousState = this.state;
    this.setState(previousState === ConnectionState.DISCONNECTED ? ConnectionState.CONNECTING : ConnectionState.RECONNECTING);

    try {
      this.socket = io(this.options.url, {
        transports: this.options.transports,
        reconnection: false, // We handle reconnection ourselves
        auth: this.options.auth,
      });

      this.setupSocketListeners();
    } catch (error) {
      logger.error('[WebSocketManager] Failed to create socket:', error instanceof Error ? error : undefined);
      this.setState(ConnectionState.ERROR);
      this.scheduleReconnection();
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    if (this.reconnectionTimer) {
      clearTimeout(this.reconnectionTimer);
      this.reconnectionTimer = null;
    }

    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    if (this.heartbeatTimeoutTimer) {
      clearTimeout(this.heartbeatTimeoutTimer);
      this.heartbeatTimeoutTimer = null;
    }

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.removeNetworkListeners();

    this.setState(ConnectionState.DISCONNECTED);
    this.reconnectionAttempts = 0;
    this.stats.currentPingLatency = 0;
  }

  /**
   * Emit message to server
   * If disconnected, queues the message for later sending
   */
  emit(event: string, data: unknown, queueIfOffline = true): boolean {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
      this.stats.messagesSent++;
      this.stats.lastActiveTime = Date.now();
      return true;
    }

    if (queueIfOffline) {
      this.queueMessage(event, data);
    }

    return false;
  }

  /**
   * Add message listener
   */
  on(event: string, listener: MessageListener): void {
    if (!this.messageListeners.has(event)) {
      this.messageListeners.set(event, new Set());
    }
    this.messageListeners.get(event)!.add(listener);
  }

  /**
   * Remove message listener
   */
  off(event: string, listener: MessageListener): void {
    const listeners = this.messageListeners.get(event);
    if (listeners) {
      listeners.delete(listener);
      if (listeners.size === 0) {
        this.messageListeners.delete(event);
      }
    }
  }

  /**
   * Add connection state listener
   */
  onStateChange(listener: ConnectionStateListener): void {
    this.stateListeners.add(listener);
  }

  /**
   * Remove connection state listener
   */
  offStateChange(listener: ConnectionStateListener): void {
    this.stateListeners.delete(listener);
  }

  /**
   * Get current connection state
   */
  getState(): ConnectionState {
    return this.state;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.state === ConnectionState.CONNECTED;
  }

  /**
   * Get queue size
   */
  getQueueSize(): number {
    return this.queue.length;
  }

  /**
   * Clear message queue
   */
  clearQueue(): void {
    this.queue = [];
    logger.info('[WebSocketManager] Message queue cleared');
  }

  /**
   * Get connection statistics
   */
  getStats(): ConnectionStats {
    return { ...this.stats };
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
    };
    this.pingLatencies = [];
    logger.info('[WebSocketManager] Statistics reset');
  }

  /**
   * Set up socket event listeners
   */
  private setupSocketListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      logger.info('[WebSocketManager] Connected to server');

      // Track reconnections
      if (this.reconnectionAttempts > 0 || this.state === ConnectionState.RECONNECTING) {
        this.stats.totalReconnections++;
      }

      this.setState(ConnectionState.CONNECTED);
      this.reconnectionAttempts = 0;
      this.missedHeartbeats = 0;
      this.startHeartbeat();
      this.sendQueuedMessages();
    });

    this.socket.on('disconnect', (reason) => {
      logger.info('[WebSocketManager] Disconnected:', { reason });

      const strategy = this.getReconnectStrategy(reason);

      if (!strategy.shouldReconnect) {
        // User initiated disconnect or server explicitly disconnected us
        logger.info('[WebSocketManager] Not reconnecting:', { reason: strategy.reason });
        this.setState(ConnectionState.DISCONNECTED);
        this.stopHeartbeat();
      } else {
        // Try to reconnect with strategy-based delay
        this.setState(ConnectionState.RECONNECTING);
        this.stopHeartbeat();
        this.scheduleReconnection(strategy.initialDelay);
      }
    });

    this.socket.on('connect_error', (error) => {
      logger.error('[WebSocketManager] Connection error:', error);
      this.setState(ConnectionState.ERROR);
      this.scheduleReconnection();
    });

    this.socket.on('error', (error) => {
      logger.error('[WebSocketManager] Socket error:', error);
    });

    // Handle pong response
    this.socket.on('pong', () => {
      this.lastPongTime = Date.now();
      this.missedHeartbeats = 0;

      // Calculate ping latency
      if (this.stats.lastPingTime > 0) {
        const latency = this.lastPongTime - this.stats.lastPingTime;
        this.stats.currentPingLatency = latency;

        // Update average (keep last 100 pings)
        this.pingLatencies.push(latency);
        if (this.pingLatencies.length > 100) {
          this.pingLatencies.shift();
        }
        this.stats.averagePingLatency =
          this.pingLatencies.reduce((a, b) => a + b, 0) / this.pingLatencies.length;
      }

      if (this.heartbeatTimeoutTimer) {
        clearTimeout(this.heartbeatTimeoutTimer);
        this.heartbeatTimeoutTimer = null;
      }
    });

    // Set up message forwarding
    this.socket.onAny((event: string, ...args: unknown[]) => {
      const data = args.length > 1 ? args : args[0];
      this.stats.messagesReceived++;
      this.stats.lastActiveTime = Date.now();
      this.notifyMessageListeners(event, data);
    });
  }

  /**
   * Start heartbeat monitoring
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();

    this.heartbeatTimer = setInterval(() => {
      if (this.socket?.connected) {
        this.stats.lastPingTime = Date.now();
        this.socket.emit('ping');

        // Set timeout for pong response
        this.heartbeatTimeoutTimer = setTimeout(() => {
          this.missedHeartbeats++;
          logger.warn(
            `[WebSocketManager] Missed heartbeat ${this.missedHeartbeats}/${3}`
          );

          // If we miss 3 heartbeats, consider connection dead and reconnect
          if (this.missedHeartbeats >= 3) {
            logger.error('[WebSocketManager] Too many missed heartbeats, reconnecting...');
            this.socket?.disconnect();
          }
        }, this.options.heartbeatTimeout);
      }
    }, this.options.heartbeatInterval);
  }

  /**
   * Stop heartbeat monitoring
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    if (this.heartbeatTimeoutTimer) {
      clearTimeout(this.heartbeatTimeoutTimer);
      this.heartbeatTimeoutTimer = null;
    }
  }

  /**
   * Schedule reconnection with exponential backoff + jitter
   */
  private scheduleReconnection(initialDelay?: number): void {
    if (this.reconnectionAttempts >= this.options.reconnectionAttempts) {
      logger.error('[WebSocketManager] Max reconnection attempts reached');
      this.setState(ConnectionState.ERROR);
      return;
    }

    if (this.state === ConnectionState.CONNECTED) {
      return;
    }

    // Calculate base delay with exponential backoff
    const baseDelay = this.options.reconnectionDelay * Math.pow(2, this.reconnectionAttempts);

    // Add jitter (0-50% of base delay) to avoid thundering herd
    const jitter = Math.random() * baseDelay * 0.5;

    // Cap at max delay
    const delay = Math.min(baseDelay + jitter, this.options.reconnectionDelayMax);

    // Use provided initial delay if this is first attempt with custom strategy
    const finalDelay = initialDelay && this.reconnectionAttempts === 0 ? initialDelay : delay;

    this.reconnectionAttempts++;

    logger.info(
      `[WebSocketManager] Scheduling reconnection attempt ${this.reconnectionAttempts} in ${Math.round(finalDelay)}ms (base: ${Math.round(baseDelay)}ms, jitter: +${Math.round(jitter)}ms)`
    );

    this.reconnectionTimer = setTimeout(() => {
      this.reconnectionTimer = null;
      this.connect();
    }, finalDelay);
  }

  /**
   * Queue message for later sending
   */
  private queueMessage(event: string, data: unknown): void {
    // Remove expired messages first
    this.cleanExpiredMessages();

    // Check queue size limit
    if (this.queue.length >= this.options.maxQueueSize) {
      // Remove oldest message
      this.queue.shift();
      logger.warn('[WebSocketManager] Queue full, removed oldest message');
    }

    const message: QueuedMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      event,
      data,
      timestamp: Date.now(),
      retryCount: 0,
    };

    this.queue.push(message);
    logger.info(`[WebSocketManager] Message queued: ${event} (queue size: ${this.queue.length})`);
  }

  /**
   * Send all queued messages
   */
  private sendQueuedMessages(): void {
    if (this.queue.length === 0) {
      return;
    }

    logger.info(`[WebSocketManager] Sending ${this.queue.length} queued messages`);

    const messages = [...this.queue];
    this.queue = [];

    messages.forEach(message => {
      try {
        this.socket?.emit(message.event, message.data);
      } catch (error) {
        logger.error(`[WebSocketManager] Failed to send queued message ${message.id}:`, error instanceof Error ? error : undefined);
        // Re-queue failed message
        message.retryCount++;
        if (message.retryCount < 3) {
          this.queue.push(message);
        }
      }
    });
  }

  /**
   * Remove expired messages from queue
   */
  private cleanExpiredMessages(): void {
    const now = Date.now();
    const originalSize = this.queue.length;

    this.queue = this.queue.filter(
      msg => now - msg.timestamp < this.options.queueExpiry
    );

    if (this.queue.length !== originalSize) {
      logger.info(
        `[WebSocketManager] Removed ${originalSize - this.queue.length} expired messages from queue`
      );
    }
  }

  /**
   * Set connection state and notify listeners
   */
  private setState(newState: ConnectionState): void {
    if (this.state === newState) return;

    const previousState = this.state;
    this.state = newState;

    logger.info(`[WebSocketManager] State changed: ${previousState} -> ${newState}`);

    // Notify listeners
    this.stateListeners.forEach(listener => {
      try {
        listener(newState, previousState);
      } catch (error) {
        logger.error('[WebSocketManager] Error in state listener:', error instanceof Error ? error : undefined);
      }
    });
  }

  /**
   * Notify message listeners
   */
  private notifyMessageListeners(event: string, data: unknown): void {
    const listeners = this.messageListeners.get(event);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(event, data);
        } catch (error) {
          logger.error(`[WebSocketManager] Error in message listener for ${event}:`, error instanceof Error ? error : undefined);
        }
      });
    }
  }

  /**
   * Set up network status listeners
   */
  private setupNetworkListeners(): void {
    this._onlineHandler = () => {
      logger.info('[WebSocketManager] Network online, attempting fast reconnect');
      // Immediately try to reconnect if not already connected
      if (this.state !== ConnectionState.CONNECTED && this.state !== ConnectionState.CONNECTING) {
        this.fastReconnect();
      }
    };

    this._offlineHandler = () => {
      logger.info('[WebSocketManager] Network offline');
      // Remember if we were connected before going offline
      this._wasConnected = this.state === ConnectionState.CONNECTED;
    };

    window.addEventListener('online', this._onlineHandler);
    window.addEventListener('offline', this._offlineHandler);
  }

  /**
   * Remove network status listeners
   */
  private removeNetworkListeners(): void {
    if (this._onlineHandler) {
      window.removeEventListener('online', this._onlineHandler);
      this._onlineHandler = null;
    }

    if (this._offlineHandler) {
      window.removeEventListener('offline', this._offlineHandler);
      this._offlineHandler = null;
    }
  }

  /**
   * Fast reconnect with minimal delay
   */
  private fastReconnect(): void {
    logger.info('[WebSocketManager] Fast reconnect initiated');
    this.reconnectionAttempts = 0;
    this.connect();
  }

  /**
   * Get reconnection strategy based on disconnect reason
   */
  private getReconnectStrategy(reason: string): {
    shouldReconnect: boolean;
    initialDelay: number;
    maxAttempts: number;
    reason: string;
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
    };

    return strategies[reason] || {
      shouldReconnect: true,
      initialDelay: this.options.reconnectionDelay,
      maxAttempts: this.options.reconnectionAttempts,
      reason: 'Unknown reason, using default strategy',
    };
  }
}
