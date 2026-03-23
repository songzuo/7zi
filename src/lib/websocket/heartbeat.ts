/**
 * WebSocket Heartbeat Manager
 *
 * Manages heartbeat monitoring and connection health checks for WebSocket connections
 * Provides automatic detection and cleanup of stale connections
 */

import { logger } from '@/lib/logger';
import type { Socket } from 'socket.io';

// ============================================================================
// Configuration
// ============================================================================

export interface HeartbeatConfig {
  /** Interval for heartbeat checks (ms) - default: 10000 (10s) */
  checkInterval?: number;
  /** Timeout before considering connection stale (ms) - default: 60000 (60s) */
  staleTimeout?: number;
  /** Number of missed heartbeats before disconnect - default: 5 */
  maxMissedHeartbeats?: number;
  /** Enable detailed logging - default: false */
  debugLogging?: boolean;
}

export interface SocketHeartbeatData {
  socketId: string;
  userId?: string;
  lastHeartbeat: number;
  missedHeartbeats: number;
  lastActivity: number;
  isStale: boolean;
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CONFIG: Required<HeartbeatConfig> = {
  checkInterval: 10000,      // Check every 10 seconds
  staleTimeout: 60000,        // 60 seconds without heartbeat = stale
  maxMissedHeartbeats: 5,     // 5 missed heartbeats = disconnect
  debugLogging: false,
};

// ============================================================================
// Heartbeat Manager Class
// ============================================================================

export class HeartbeatManager {
  private config: Required<HeartbeatConfig>;
  private heartbeatData: Map<string, SocketHeartbeatData>;
  private checkInterval: NodeJS.Timeout | null = null;
  private isRunning = false;
  private disconnectCount = 0;
  private staleCount = 0;

  constructor(config: HeartbeatConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.heartbeatData = new Map();
  }

  /**
   * Start the heartbeat monitoring
   */
  start(): void {
    if (this.isRunning) {
      logger.warn('HeartbeatManager already running');
      return;
    }

    this.isRunning = true;
    this.disconnectCount = 0;
    this.staleCount = 0;

    logger.info('HeartbeatManager started', {
      checkInterval: this.config.checkInterval,
      staleTimeout: this.config.staleTimeout,
      maxMissedHeartbeats: this.config.maxMissedHeartbeats,
    });

    this.checkInterval = setInterval(() => {
      this.performHealthCheck();
    }, this.config.checkInterval);
  }

  /**
   * Stop the heartbeat monitoring
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    logger.info('HeartbeatManager stopped', {
      totalDisconnects: this.disconnectCount,
      totalStaleConnections: this.staleCount,
    });
  }

  /**
   * Register a socket for heartbeat monitoring
   */
  registerSocket(socket: Socket, userId?: string): void {
    const now = Date.now();

    const data: SocketHeartbeatData = {
      socketId: socket.id,
      userId,
      lastHeartbeat: now,
      missedHeartbeats: 0,
      lastActivity: now,
      isStale: false,
    };

    this.heartbeatData.set(socket.id, data);

    logger.debug('Socket registered for heartbeat', {
      socketId: socket.id,
      userId,
    });

    // Setup heartbeat listener
    socket.on('heartbeat', () => {
      this.handleHeartbeat(socket.id);
    });

    // Track last activity on any event using socket's listener for common events
    // Note: We wrap the original emit to track activity
    const originalEmit = socket.emit.bind(socket);
    socket.emit = (...args: unknown[]) => {
      this.updateActivity(socket.id);
      return (originalEmit as (...args: unknown[]) => boolean)(...args);
    };

    // Cleanup on disconnect
    socket.on('disconnect', (reason) => {
      this.unregisterSocket(socket.id, reason);
    });
  }

  /**
   * Unregister a socket from heartbeat monitoring
   */
  unregisterSocket(socketId: string, reason?: string): void {
    const data = this.heartbeatData.get(socketId);
    if (data) {
      this.heartbeatData.delete(socketId);

      logger.debug('Socket unregistered from heartbeat', {
        socketId,
        userId: data.userId,
        reason,
        duration: Date.now() - data.lastHeartbeat,
      });
    }
  }

  /**
   * Handle heartbeat from socket
   */
  private handleHeartbeat(socketId: string): void {
    const data = this.heartbeatData.get(socketId);
    if (!data) {
      return;
    }

    const now = Date.now();
    data.lastHeartbeat = now;
    data.lastActivity = now;
    data.missedHeartbeats = 0;
    data.isStale = false;

    if (this.config.debugLogging) {
      logger.debug('Heartbeat received', {
        socketId,
        userId: data.userId,
        latency: now - data.lastHeartbeat,
      });
    }
  }

  /**
   * Update socket activity timestamp
   */
  private updateActivity(socketId: string): void {
    const data = this.heartbeatData.get(socketId);
    if (data) {
      data.lastActivity = Date.now();
    }
  }

  /**
   * Perform health check on all monitored sockets
   */
  private performHealthCheck(): void {
    const now = Date.now();
    const socketsToDisconnect: string[] = [];

    for (const [socketId, data] of this.heartbeatData.entries()) {
      const timeSinceLastHeartbeat = now - data.lastHeartbeat;
      const timeSinceLastActivity = now - data.lastActivity;

      // Check for stale connections
      if (timeSinceLastHeartbeat > this.config.staleTimeout) {
        data.missedHeartbeats++;

        if (this.config.debugLogging) {
          logger.warn('Stale heartbeat detected', {
            socketId,
            userId: data.userId,
            missedHeartbeats: data.missedHeartbeats,
            timeSinceLastHeartbeat,
          });
        }

        // Mark as stale if first time
        if (!data.isStale) {
          data.isStale = true;
          this.staleCount++;

          logger.warn('Connection marked as stale', {
            socketId,
            userId: data.userId,
            timeSinceLastHeartbeat,
          });
        }

        // Disconnect if too many missed heartbeats
        if (data.missedHeartbeats >= this.config.maxMissedHeartbeats) {
          socketsToDisconnect.push(socketId);
          this.disconnectCount++;

          logger.error('Disconnecting stale connection', {
            socketId,
            userId: data.userId,
            missedHeartbeats: data.missedHeartbeats,
            timeSinceLastHeartbeat,
            timeSinceLastActivity,
          });
        }
      }

      // Also check for completely inactive sockets (no activity at all)
      if (timeSinceLastActivity > this.config.staleTimeout * 2) {
        if (!socketsToDisconnect.includes(socketId)) {
          socketsToDisconnect.push(socketId);
          this.disconnectCount++;

          logger.error('Disconnecting inactive connection', {
            socketId,
            userId: data.userId,
            timeSinceLastActivity,
          });
        }
      }
    }

    // Disconnect stale sockets
    socketsToDisconnect.forEach(socketId => {
      this.heartbeatData.delete(socketId);
      // Note: The socket should be disconnected by the caller
      // We just remove it from monitoring here
    });

    // Log health check summary
    if (this.config.debugLogging || socketsToDisconnect.length > 0) {
      logger.debug('Health check completed', {
        monitoredSockets: this.heartbeatData.size,
        staleConnections: Array.from(this.heartbeatData.values()).filter(d => d.isStale).length,
        disconnectedCount: socketsToDisconnect.length,
      });
    }
  }

  /**
   * Get heartbeat data for a specific socket
   */
  getHeartbeatData(socketId: string): SocketHeartbeatData | undefined {
    return this.heartbeatData.get(socketId);
  }

  /**
   * Get all heartbeat data
   */
  getAllHeartbeatData(): SocketHeartbeatData[] {
    return Array.from(this.heartbeatData.values());
  }

  /**
   * Get statistics
   */
  getStats(): {
    monitoredSockets: number;
    staleConnections: number;
    totalDisconnects: number;
    totalStaleConnections: number;
    isRunning: boolean;
  } {
    return {
      monitoredSockets: this.heartbeatData.size,
      staleConnections: Array.from(this.heartbeatData.values()).filter(d => d.isStale).length,
      totalDisconnects: this.disconnectCount,
      totalStaleConnections: this.staleCount,
      isRunning: this.isRunning,
    };
  }

  /**
   * Force disconnect a socket
   */
  forceDisconnect(socketId: string): boolean {
    const data = this.heartbeatData.get(socketId);
    if (!data) {
      return false;
    }

    this.heartbeatData.delete(socketId);
    this.disconnectCount++;

    logger.warn('Force disconnected socket', {
      socketId,
      userId: data.userId,
      reason: 'manual_disconnect',
    });

    return true;
  }

  /**
   * Update configuration at runtime
   */
  updateConfig(config: Partial<HeartbeatConfig>): void {
    this.config = { ...this.config, ...config };

    logger.info('HeartbeatManager config updated', {
      config: this.config,
    });

    // Restart if interval changed
    if (this.isRunning && config.checkInterval !== undefined) {
      this.stop();
      this.start();
    }
  }
}

// ============================================================================
// Global Instance
// ============================================================================

let globalHeartbeatManager: HeartbeatManager | null = null;

/**
 * Get or create the global heartbeat manager
 */
export function getHeartbeatManager(config?: HeartbeatConfig): HeartbeatManager {
  if (!globalHeartbeatManager) {
    globalHeartbeatManager = new HeartbeatManager(config);
  } else if (config) {
    globalHeartbeatManager.updateConfig(config);
  }

  return globalHeartbeatManager;
}

/**
 * Stop the global heartbeat manager
 */
export function stopHeartbeatManager(): void {
  if (globalHeartbeatManager) {
    globalHeartbeatManager.stop();
    globalHeartbeatManager = null;
  }
}

export default HeartbeatManager;
