/**
 * WebSocket Security Module
 *
 * Provides security features for WebSocket connections:
 * - Rate limiting
 * - Message size validation
 * - Malicious user detection and auto-ban
 */

import { logger } from '@/lib/logger';

// ============================================================================
// Types
// ============================================================================

export interface WSSecurityConfig {
  // Rate limiting
  maxConnectionsPerIP?: number;
  maxMessagesPerMinute?: number;
  maxMessagesPerSecond?: number;
  rateLimitWindowMs?: number;

  // Message size
  maxMessageSize?: number; // bytes
  maxBinaryMessageSize?: number; // bytes

  // Malicious user detection
  enableMaliciousDetection?: boolean;
  suspiciousPatterns?: RegExp[];
  maxWarningsBeforeBan?: number;
  banDurationMs?: number;

  // Connection limits
  maxConcurrentConnections?: number;
  connectionTimeoutMs?: number;
}

export interface WSSecurityMetrics {
  ip: string;
  connectionCount: number;
  messageCount: number;
  lastMessageTime: number;
  warningCount: number;
  banned: boolean;
  bannedUntil?: number;
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CONFIG: Required<WSSecurityConfig> = {
  maxConnectionsPerIP: 5,
  maxMessagesPerMinute: 100,
  maxMessagesPerSecond: 10,
  rateLimitWindowMs: 60 * 1000,

  maxMessageSize: 1024 * 1024, // 1MB
  maxBinaryMessageSize: 10 * 1024 * 1024, // 10MB

  enableMaliciousDetection: true,
  suspiciousPatterns: [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, // XSS
    /javascript:/gi, // javascript: protocol
    /on\w+\s*=/gi, // on* event handlers
    /eval\s*\(/gi, // eval()
    /document\.(cookie|domain|location)/gi, // document access
    /<iframe/gi, // iframe tags
    /data:(?!image\/)/gi, // data: URIs (except images)
  ],
  maxWarningsBeforeBan: 3,
  banDurationMs: 15 * 60 * 1000, // 15 minutes

  maxConcurrentConnections: 1000,
  connectionTimeoutMs: 30 * 1000, // 30 seconds
};

// ============================================================================
// Security State
// ============================================================================

class WSSecurityManager {
  private config: Required<WSSecurityConfig>;
  private metrics: Map<string, WSSecurityMetrics> = new Map();
  private connectionCount: number = 0;
  private cleanupInterval: NodeJS.Timeout;

  constructor(config: WSSecurityConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.cleanupInterval = setInterval(() => this.cleanup(), 60 * 1000);
  }

  /**
   * Get security metrics for an IP
   */
  private getMetrics(ip: string): WSSecurityMetrics {
    let metrics = this.metrics.get(ip);

    if (!metrics) {
      metrics = {
        ip,
        connectionCount: 0,
        messageCount: 0,
        lastMessageTime: 0,
        warningCount: 0,
        banned: false,
      };
      this.metrics.set(ip, metrics);
    }

    return metrics;
  }

  /**
   * Check if IP is banned
   */
  isBanned(ip: string): boolean {
    const metrics = this.getMetrics(ip);

    if (!metrics.banned) {
      return false;
    }

    // Check if ban has expired
    if (metrics.bannedUntil && Date.now() > metrics.bannedUntil) {
      metrics.banned = false;
      metrics.bannedUntil = undefined;
      metrics.warningCount = 0;
      logger.info(`Ban expired for IP: ${ip}`);
      return false;
    }

    return true;
  }

  /**
   * Ban an IP address
   */
  ban(ip: string, reason: string, durationMs?: number): void {
    const metrics = this.getMetrics(ip);
    metrics.banned = true;
    metrics.bannedUntil = Date.now() + (durationMs || this.config.banDurationMs);

    logger.warn(`IP banned: ${ip}`, {
      reason,
      durationMs: durationMs || this.config.banDurationMs,
      warningCount: metrics.warningCount,
    });
  }

  /**
   * Check connection limit
   */
  canConnect(ip: string): { allowed: boolean; reason?: string } {
    const metrics = this.getMetrics(ip);

    // Check if banned
    if (this.isBanned(ip)) {
      return {
        allowed: false,
        reason: 'IP is banned',
      };
    }

    // Check connection count per IP
    if (metrics.connectionCount >= this.config.maxConnectionsPerIP) {
      logger.warn(`Connection limit exceeded for IP: ${ip}`, {
        count: metrics.connectionCount,
        limit: this.config.maxConnectionsPerIP,
      });
      return {
        allowed: false,
        reason: 'Too many connections from this IP',
      };
    }

    // Check total connection count
    if (this.connectionCount >= this.config.maxConcurrentConnections) {
      logger.warn('Max concurrent connections reached', {
        count: this.connectionCount,
        limit: this.config.maxConcurrentConnections,
      });
      return {
        allowed: false,
        reason: 'Server at capacity',
      };
    }

    return { allowed: true };
  }

  /**
   * Record a connection
   */
  recordConnection(ip: string): void {
    const metrics = this.getMetrics(ip);
    metrics.connectionCount++;
    this.connectionCount++;
  }

  /**
   * Record a disconnection
   */
  recordDisconnection(ip: string): void {
    const metrics = this.getMetrics(ip);
    metrics.connectionCount = Math.max(0, metrics.connectionCount - 1);
    this.connectionCount = Math.max(0, this.connectionCount - 1);
  }

  /**
   * Check if message can be sent (rate limiting)
   */
  canSendMessage(ip: string): { allowed: boolean; reason?: string; retryAfter?: number } {
    const metrics = this.getMetrics(ip);
    const now = Date.now();

    // Check if banned
    if (this.isBanned(ip)) {
      return {
        allowed: false,
        reason: 'IP is banned',
      };
    }

    // Reset message count if window has passed
    if (now - metrics.lastMessageTime > this.config.rateLimitWindowMs) {
      metrics.messageCount = 0;
      metrics.lastMessageTime = now;
    }

    // Check per-second limit
    if (metrics.lastMessageTime > 0 && now - metrics.lastMessageTime < 1000) {
      // In the same second, count rapid messages
      const timeSinceLast = now - metrics.lastMessageTime;
      if (timeSinceLast < 1000 / this.config.maxMessagesPerSecond) {
        logger.warn(`Message rate too high for IP: ${ip}`, {
          count: metrics.messageCount,
          limit: this.config.maxMessagesPerSecond,
        });
        return {
          allowed: false,
          reason: 'Message rate too high',
        };
      }
    }

    // Check per-minute limit
    if (metrics.messageCount >= this.config.maxMessagesPerMinute) {
      const retryAfter = Math.ceil(
        (metrics.lastMessageTime + this.config.rateLimitWindowMs - now) / 1000
      );

      logger.warn(`Message limit exceeded for IP: ${ip}`, {
        count: metrics.messageCount,
        limit: this.config.maxMessagesPerMinute,
        retryAfter,
      });

      return {
        allowed: false,
        reason: 'Message limit exceeded',
        retryAfter,
      };
    }

    return { allowed: true };
  }

  /**
   * Validate message size
   */
  validateMessageSize(data: unknown, isBinary: boolean = false): {
    valid: boolean;
    reason?: string;
  } {
    let size = 0;

    if (Buffer.isBuffer(data)) {
      size = data.length;
    } else if (typeof data === 'string') {
      size = Buffer.byteLength(data);
    } else if (typeof data === 'object') {
      size = Buffer.byteLength(JSON.stringify(data));
    }

    const maxSize = isBinary
      ? this.config.maxBinaryMessageSize
      : this.config.maxMessageSize;

    if (size > maxSize) {
      logger.warn(`Message too large`, { size, maxSize, isBinary });
      return {
        valid: false,
        reason: `Message too large (${size} > ${maxMaxSize})`,
      };
    }

    return { valid: true };
  }

  /**
   * Check for malicious patterns in message
   */
  checkMaliciousPatterns(message: string): { detected: boolean; pattern?: string } {
    if (!this.config.enableMaliciousDetection) {
      return { detected: false };
    }

    for (const pattern of this.config.suspiciousPatterns) {
      if (pattern.test(message)) {
        logger.warn(`Malicious pattern detected`, {
          pattern: pattern.source,
          message: message.substring(0, 100),
        });
        return { detected: true, pattern: pattern.source };
      }
    }

    return { detected: false };
  }

  /**
   * Record a sent message
   */
  recordMessage(ip: string, message: string): void {
    const metrics = this.getMetrics(ip);
    metrics.messageCount++;
    metrics.lastMessageTime = Date.now();

    // Check for malicious patterns
    const detection = this.checkMaliciousPatterns(message);
    if (detection.detected) {
      metrics.warningCount++;

      if (metrics.warningCount >= this.config.maxWarningsBeforeBan) {
        this.ban(ip, `Malicious pattern detected: ${detection.pattern}`);
      }
    }
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalConnections: number;
    activeConnections: number;
    totalIPs: number;
    bannedIPs: number;
  } {
    let bannedCount = 0;

    for (const [, metrics] of this.metrics) {
      if (metrics.banned) {
        bannedCount++;
      }
    }

    return {
      totalConnections: this.connectionCount,
      activeConnections: this.connectionCount,
      totalIPs: this.metrics.size,
      bannedIPs: bannedCount,
    };
  }

  /**
   * Cleanup expired bans
   */
  private cleanup(): void {
    const now = Date.now();
    const expired: string[] = [];

    for (const [ip, metrics] of this.metrics) {
      if (
        metrics.banned &&
        metrics.bannedUntil &&
        now > metrics.bannedUntil
      ) {
        expired.push(ip);
      }
    }

    for (const ip of expired) {
      this.metrics.delete(ip);
      logger.info(`Cleaned up expired ban for IP: ${ip}`);
    }
  }

  /**
   * Clear all metrics (for testing)
   */
  clear(): void {
    this.metrics.clear();
    this.connectionCount = 0;
  }

  /**
   * Destroy manager
   */
  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.clear();
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let instance: WSSecurityManager | null = null;

/**
 * Get WebSocket security manager instance
 */
export function getWSSecurityManager(config?: WSSecurityConfig): WSSecurityManager {
  if (!instance) {
    instance = new WSSecurityManager(config);
  } else if (config) {
    // Update config if provided
    (instance as any).config = { ...DEFAULT_CONFIG, ...config };
  }

  return instance;
}

/**
 * Destroy WebSocket security manager
 */
export function destroyWSSecurityManager(): void {
  if (instance) {
    instance.destroy();
    instance = null;
  }
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Get client IP from socket
 */
export function getClientIP(socket: any): string {
  return (
    socket.handshake?.address ||
    socket.handshake?.headers?.['x-forwarded-for']?.split(',')[0]?.trim() ||
    socket.request?.socket?.remoteAddress ||
    'unknown'
  );
}

/**
 * Create security error response
 */
export function createSecurityError(reason: string, retryAfter?: number): {
  success: false;
  error: { type: string; message: string; retryAfter?: number };
} {
  return {
    success: false,
    error: {
      type: 'SECURITY_ERROR',
      message: reason,
      ...(retryAfter !== undefined && { retryAfter }),
    },
  };
}

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  const size = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, size);
  return `${value.toFixed(2)} ${units[size]}`;
}
