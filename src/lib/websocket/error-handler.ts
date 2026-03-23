/**
 * WebSocket Error Handler
 *
 * Centralized error handling and recovery for WebSocket connections
 * Provides error classification, recovery strategies, and detailed logging
 */

import { logger } from '@/lib/logger';

// ============================================================================
// Error Classification
// ============================================================================

export enum WebSocketErrorType {
  /** Connection failed - network issues, server down */
  CONNECTION_FAILED = 'CONNECTION_FAILED',
  /** Authentication failed - invalid token, user not found */
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
  /** Timeout - connection or operation timed out */
  TIMEOUT = 'TIMEOUT',
  /** Network error - unstable connection, packet loss */
  NETWORK_ERROR = 'NETWORK_ERROR',
  /** Server error - internal server error */
  SERVER_ERROR = 'SERVER_ERROR',
  /** Protocol error - malformed messages */
  PROTOCOL_ERROR = 'PROTOCOL_ERROR',
  /** Room error - room not found, access denied */
  ROOM_ERROR = 'ROOM_ERROR',
  /** Document error - document sync failure */
  DOCUMENT_ERROR = 'DOCUMENT_ERROR',
  /** Rate limit - too many requests */
  RATE_LIMITED = 'RATE_LIMITED',
  /** Unknown error */
  UNKNOWN = 'UNKNOWN',
}

export enum WebSocketErrorSeverity {
  /** Low - minor issues, can recover automatically */
  LOW = 'LOW',
  /** Medium - requires attention but can recover */
  MEDIUM = 'MEDIUM',
  /** High - critical issues, may need manual intervention */
  HIGH = 'HIGH',
  /** Critical - immediate action required */
  CRITICAL = 'CRITICAL',
}

// ============================================================================
// Error Data Structure
// ============================================================================

export interface WebSocketError {
  type: WebSocketErrorType;
  severity: WebSocketErrorSeverity;
  message: string;
  code?: string;
  timestamp: Date;
  socketId?: string;
  userId?: string;
  roomId?: string;
  details?: Record<string, unknown>;
  originalError?: Error;
  recoverable: boolean;
  recoveryStrategy?: RecoveryStrategy;
}

// ============================================================================
// Recovery Strategies
// ============================================================================

export enum RecoveryStrategy {
  /** No recovery needed */
  NONE = 'NONE',
  /** Automatic reconnection */
  RECONNECT = 'RECONNECT',
  /** Re-authenticate and reconnect */
  REAUTHENTICATE = 'REAUTHENTICATE',
  /** Rejoin room */
  REJOIN_ROOM = 'REJOIN_ROOM',
  /** Sync document */
  SYNC_DOCUMENT = 'SYNC_DOCUMENT',
  /** Manual intervention required */
  MANUAL = 'MANUAL',
  /** Give up and notify user */
  GIVE_UP = 'GIVE_UP',
}

// ============================================================================
// Error Handler Configuration
// ============================================================================

export interface ErrorHandlerConfig {
  /** Enable detailed error logging - default: true */
  detailedLogging?: boolean;
  /** Enable error tracking - default: true */
  errorTracking?: boolean;
  /** Maximum errors to track - default: 100 */
  maxTrackedErrors?: number;
  /** Enable automatic recovery - default: true */
  autoRecovery?: boolean;
  /** Notify user on high severity errors - default: true */
  notifyOnHighSeverity?: boolean;
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CONFIG: Required<ErrorHandlerConfig> = {
  detailedLogging: true,
  errorTracking: true,
  maxTrackedErrors: 100,
  autoRecovery: true,
  notifyOnHighSeverity: true,
};

// ============================================================================
// Error Handler Class
// ============================================================================

export class WebSocketErrorHandler {
  private config: Required<ErrorHandlerConfig>;
  private errorHistory: WebSocketError[];
  private errorCounts: Map<WebSocketErrorType, number>;
  private onHighSeverityErrorCallback?: (error: WebSocketError) => void;

  constructor(config: ErrorHandlerConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.errorHistory = [];
    this.errorCounts = new Map();
  }

  /**
   * Set callback for high severity errors
   */
  onHighSeverityError(callback: (error: WebSocketError) => void): void {
    this.onHighSeverityErrorCallback = callback;
  }

  /**
   * Handle a WebSocket error
   */
  handleError(error: unknown, context?: {
    socketId?: string;
    userId?: string;
    roomId?: string;
  }): WebSocketError {
    const wsError = this.classifyError(error, context);

    // Log error
    this.logError(wsError);

    // Track error
    if (this.config.errorTracking) {
      this.trackError(wsError);
    }

    // Notify on high severity
    if (
      this.config.notifyOnHighSeverity &&
      (wsError.severity === WebSocketErrorSeverity.HIGH ||
       wsError.severity === WebSocketErrorSeverity.CRITICAL)
    ) {
      this.onHighSeverityErrorCallback?.(wsError);
    }

    return wsError;
  }

  /**
   * Classify an error
   */
  private classifyError(error: unknown, context?: {
    socketId?: string;
    userId?: string;
    roomId?: string;
  }): WebSocketError {
    const now = new Date();

    // Handle Error objects
    if (error instanceof Error) {
      const message = error.message.toLowerCase();

      let type: WebSocketErrorType;
      let severity: WebSocketErrorSeverity;
      let recoverable: boolean;
      let recoveryStrategy: RecoveryStrategy = RecoveryStrategy.NONE;

      // Classify based on message content
      if (message.includes('token') || message.includes('auth') || message.includes('unauthorized')) {
        type = WebSocketErrorType.AUTHENTICATION_FAILED;
        severity = WebSocketErrorSeverity.HIGH;
        recoverable = true;
        recoveryStrategy = RecoveryStrategy.REAUTHENTICATE;
      } else if (message.includes('timeout') || message.includes('timed out')) {
        type = WebSocketErrorType.TIMEOUT;
        severity = WebSocketErrorSeverity.MEDIUM;
        recoverable = true;
        recoveryStrategy = RecoveryStrategy.RECONNECT;
      } else if (message.includes('network') || message.includes('econnrefused') || message.includes('enetunreachable')) {
        type = WebSocketErrorType.NETWORK_ERROR;
        severity = WebSocketErrorSeverity.MEDIUM;
        recoverable = true;
        recoveryStrategy = RecoveryStrategy.RECONNECT;
      } else if (message.includes('room') || message.includes('not found')) {
        type = WebSocketErrorType.ROOM_ERROR;
        severity = WebSocketErrorSeverity.MEDIUM;
        recoverable = true;
        recoveryStrategy = RecoveryStrategy.REJOIN_ROOM;
      } else if (message.includes('document') || message.includes('sync')) {
        type = WebSocketErrorType.DOCUMENT_ERROR;
        severity = WebSocketErrorSeverity.MEDIUM;
        recoverable = true;
        recoveryStrategy = RecoveryStrategy.SYNC_DOCUMENT;
      } else if (message.includes('rate limit') || message.includes('too many')) {
        type = WebSocketErrorType.RATE_LIMITED;
        severity = WebSocketErrorSeverity.LOW;
        recoverable = true;
        recoveryStrategy = RecoveryStrategy.NONE;
      } else {
        type = WebSocketErrorType.UNKNOWN;
        severity = WebSocketErrorSeverity.MEDIUM;
        recoverable = false;
        recoveryStrategy = RecoveryStrategy.MANUAL;
      }

      return {
        type,
        severity,
        message: error.message,
        timestamp: now,
        socketId: context?.socketId,
        userId: context?.userId,
        roomId: context?.roomId,
        originalError: error,
        recoverable,
        recoveryStrategy,
      };
    }

    // Handle string errors
    if (typeof error === 'string') {
      const message = error.toLowerCase();

      let type: WebSocketErrorType;
      let severity: WebSocketErrorSeverity;
      let recoverable: boolean;
      let recoveryStrategy: RecoveryStrategy = RecoveryStrategy.NONE;

      if (message.includes('connection failed') || message.includes('connect error')) {
        type = WebSocketErrorType.CONNECTION_FAILED;
        severity = WebSocketErrorSeverity.HIGH;
        recoverable = true;
        recoveryStrategy = RecoveryStrategy.RECONNECT;
      } else {
        type = WebSocketErrorType.UNKNOWN;
        severity = WebSocketErrorSeverity.MEDIUM;
        recoverable = false;
        recoveryStrategy = RecoveryStrategy.MANUAL;
      }

      return {
        type,
        severity,
        message: error,
        timestamp: now,
        socketId: context?.socketId,
        userId: context?.userId,
        roomId: context?.roomId,
        recoverable,
        recoveryStrategy,
      };
    }

    // Unknown error type
    return {
      type: WebSocketErrorType.UNKNOWN,
      severity: WebSocketErrorSeverity.HIGH,
      message: String(error),
      timestamp: now,
      socketId: context?.socketId,
      userId: context?.userId,
      roomId: context?.roomId,
      recoverable: false,
      recoveryStrategy: RecoveryStrategy.MANUAL,
    };
  }

  /**
   * Log an error
   */
  private logError(error: WebSocketError): void {
    if (!this.config.detailedLogging) {
      return;
    }

    const logMethod = this.getLogMethod(error.severity);

    logMethod('WebSocket error', {
      type: error.type,
      severity: error.severity,
      message: error.message,
      socketId: error.socketId,
      userId: error.userId,
      roomId: error.roomId,
      recoverable: error.recoverable,
      recoveryStrategy: error.recoveryStrategy,
      details: error.details,
    });

    if (error.originalError && this.config.detailedLogging) {
      logger.debug('Original error stack', {
        stack: error.originalError.stack,
      });
    }
  }

  /**
   * Get appropriate log method based on severity
   */
  private getLogMethod(severity: WebSocketErrorSeverity): (msg: string, meta?: Record<string, unknown>) => void {
    switch (severity) {
      case WebSocketErrorSeverity.CRITICAL:
      case WebSocketErrorSeverity.HIGH:
        return logger.error.bind(logger);
      case WebSocketErrorSeverity.MEDIUM:
        return logger.warn.bind(logger);
      case WebSocketErrorSeverity.LOW:
      default:
        return logger.debug.bind(logger);
    }
  }

  /**
   * Track an error
   */
  private trackError(error: WebSocketError): void {
    // Add to history
    this.errorHistory.push(error);

    // Trim history if too large
    if (this.errorHistory.length > this.config.maxTrackedErrors) {
      this.errorHistory = this.errorHistory.slice(-this.config.maxTrackedErrors);
    }

    // Update error counts
    const count = this.errorCounts.get(error.type) || 0;
    this.errorCounts.set(error.type, count + 1);
  }

  /**
   * Get error statistics
   */
  getStats(): {
    totalErrors: number;
    errorCounts: Record<WebSocketErrorType, number>;
    recentErrors: WebSocketError[];
    criticalErrorCount: number;
    highSeverityErrorCount: number;
  } {
    const recentErrors = this.errorHistory.slice(-10);
    const criticalErrorCount = this.errorHistory.filter(
      e => e.severity === WebSocketErrorSeverity.CRITICAL
    ).length;
    const highSeverityErrorCount = this.errorHistory.filter(
      e => e.severity === WebSocketErrorSeverity.HIGH
    ).length;

    return {
      totalErrors: this.errorHistory.length,
      errorCounts: Object.fromEntries(this.errorCounts) as Record<WebSocketErrorType, number>,
      recentErrors,
      criticalErrorCount,
      highSeverityErrorCount,
    };
  }

  /**
   * Clear error history
   */
  clearHistory(): void {
    this.errorHistory = [];
    this.errorCounts.clear();
    logger.debug('Error history cleared');
  }

  /**
   * Get recovery action for an error
   */
  getRecoveryAction(error: WebSocketError): {
    strategy: RecoveryStrategy;
    action?: () => void;
    message: string;
  } {
    const messages: Record<RecoveryStrategy, string> = {
      [RecoveryStrategy.NONE]: 'No recovery needed',
      [RecoveryStrategy.RECONNECT]: 'Attempting to reconnect...',
      [RecoveryStrategy.REAUTHENTICATE]: 'Please re-authenticate to continue',
      [RecoveryStrategy.REJOIN_ROOM]: 'Rejoining the room...',
      [RecoveryStrategy.SYNC_DOCUMENT]: 'Syncing document...',
      [RecoveryStrategy.MANUAL]: 'Manual intervention required',
      [RecoveryStrategy.GIVE_UP]: 'Unable to recover. Please try again later',
    };

    return {
      strategy: error.recoveryStrategy || RecoveryStrategy.NONE,
      message: messages[error.recoveryStrategy || RecoveryStrategy.NONE],
    };
  }

  /**
   * Check if error recovery should be attempted
   */
  shouldAttemptRecovery(error: WebSocketError): boolean {
    return (
      this.config.autoRecovery &&
      error.recoverable &&
      error.recoveryStrategy !== RecoveryStrategy.NONE &&
      error.recoveryStrategy !== RecoveryStrategy.MANUAL &&
      error.recoveryStrategy !== RecoveryStrategy.GIVE_UP
    );
  }

  /**
   * Update configuration at runtime
   */
  updateConfig(config: Partial<ErrorHandlerConfig>): void {
    this.config = { ...this.config, ...config };
    logger.info('ErrorHandler config updated', { config: this.config });
  }
}

// ============================================================================
// Global Instance
// ============================================================================

let globalErrorHandler: WebSocketErrorHandler | null = null;

/**
 * Get or create the global error handler
 */
export function getErrorHandler(config?: ErrorHandlerConfig): WebSocketErrorHandler {
  if (!globalErrorHandler) {
    globalErrorHandler = new WebSocketErrorHandler(config);
  } else if (config) {
    globalErrorHandler.updateConfig(config);
  }

  return globalErrorHandler;
}

/**
 * Reset the global error handler
 */
export function resetErrorHandler(): void {
  globalErrorHandler = null;
}

export default WebSocketErrorHandler;
