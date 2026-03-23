/**
 * WebSocket Reconnection Manager
 *
 * Handles automatic reconnection with exponential backoff and jitter
 * Provides resilience against network failures and server restarts
 */

'use server';

import { logger } from '@/lib/logger';

// ============================================================================
// Configuration
// ============================================================================

export interface ReconnectionConfig {
  /** Enable automatic reconnection - default: true */
  enabled?: boolean;
  /** Initial delay before first reconnect (ms) - default: 1000 (1s) */
  initialDelay?: number;
  /** Maximum delay between reconnect attempts (ms) - default: 30000 (30s) */
  maxDelay?: number;
  /** Backoff multiplier - default: 1.5 */
  backoffMultiplier?: number;
  /** Maximum number of reconnect attempts - default: 10 */
  maxAttempts?: number;
  /** Enable random jitter to avoid thundering herd - default: true */
  jitterEnabled?: boolean;
  /** Jitter amount (0-1) - default: 0.2 (20%) */
  jitterAmount?: number;
  /** Enable detailed logging - default: false */
  debugLogging?: boolean;
}

export interface ReconnectionState {
  attemptNumber: number;
  currentDelay: number;
  nextAttemptTime?: number;
  isConnected: boolean;
  shouldReconnect: boolean;
  lastError?: Error;
  totalAttempts: number;
  successfulReconnections: number;
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CONFIG: Required<ReconnectionConfig> = {
  enabled: true,
  initialDelay: 1000,        // Start with 1 second
  maxDelay: 30000,           // Max 30 seconds between attempts
  backoffMultiplier: 1.5,    // Exponential backoff
  maxAttempts: 10,           // Give up after 10 attempts
  jitterEnabled: true,       // Add randomness
  jitterAmount: 0.2,         // 20% jitter
  debugLogging: false,
};

// ============================================================================
// Reconnection Manager Class
// ============================================================================

export class ReconnectionManager {
  private config: Required<ReconnectionConfig>;
  private state: ReconnectionState;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private onReconnectCallback?: () => void;
  private onDisconnectCallback?: (reason: string) => void;
  private onErrorCallback?: (error: Error) => void;

  constructor(config: ReconnectionConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.state = {
      attemptNumber: 0,
      currentDelay: this.config.initialDelay,
      isConnected: true,
      shouldReconnect: this.config.enabled,
      totalAttempts: 0,
      successfulReconnections: 0,
    };
  }

  /**
   * Set callback for successful reconnection
   */
  onReconnect(callback: () => void): void {
    this.onReconnectCallback = callback;
  }

  /**
   * Set callback for disconnection
   */
  onDisconnect(callback: (reason: string) => void): void {
    this.onDisconnectCallback = callback;
  }

  /**
   * Set callback for errors
   */
  onError(callback: (error: Error) => void): void {
    this.onErrorCallback = callback;
  }

  /**
   * Handle connection established
   */
  handleConnected(): void {
    this.state.isConnected = true;
    this.state.shouldReconnect = true;
    this.state.lastError = undefined;

    // Clear any pending reconnection timer
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    // Track successful reconnections
    if (this.state.attemptNumber > 0) {
      this.state.successfulReconnections++;

      logger.info('WebSocket reconnected successfully', {
        attemptNumber: this.state.attemptNumber,
        totalAttempts: this.state.totalAttempts,
        successfulReconnections: this.state.successfulReconnections,
        delay: this.state.currentDelay,
      });

      // Reset attempt counter
      this.state.attemptNumber = 0;
      this.state.currentDelay = this.config.initialDelay;

      // Call reconnection callback
      this.onReconnectCallback?.();
    }
  }

  /**
   * Handle disconnection
   */
  handleDisconnect(reason: string): void {
    this.state.isConnected = false;

    logger.info('WebSocket disconnected', {
      reason,
      shouldReconnect: this.state.shouldReconnect,
      isConnected: this.state.isConnected,
    });

    // Call disconnect callback
    this.onDisconnectCallback?.(reason);

    // Schedule reconnection if enabled
    if (this.state.shouldReconnect) {
      this.scheduleReconnect();
    }
  }

  /**
   * Handle connection error
   */
  handleError(error: Error): void {
    this.state.lastError = error;

    logger.error('WebSocket connection error', {
      error: error.message,
      attemptNumber: this.state.attemptNumber,
      shouldReconnect: this.state.shouldReconnect,
    });

    // Call error callback
    this.onErrorCallback?.(error);

    // Schedule reconnection if enabled and not connected
    if (this.state.shouldReconnect && !this.state.isConnected) {
      this.scheduleReconnect();
    }
  }

  /**
   * Schedule next reconnection attempt
   */
  private scheduleReconnect(): void {
    // Clear any existing timer
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    // Check if we've exceeded max attempts
    if (this.state.attemptNumber >= this.config.maxAttempts) {
      this.state.shouldReconnect = false;

      const error = new Error(
        `Maximum reconnection attempts (${this.config.maxAttempts}) reached`
      );
      this.state.lastError = error;

      logger.error('Max reconnection attempts reached', {
        attemptNumber: this.state.attemptNumber,
        totalAttempts: this.state.totalAttempts,
        successfulReconnections: this.state.successfulReconnections,
      });

      this.onErrorCallback?.(error);
      return;
    }

    // Calculate next delay with exponential backoff
    this.state.attemptNumber++;
    this.state.totalAttempts++;

    let delay = this.state.currentDelay;
    delay = delay * this.config.backoffMultiplier;
    delay = Math.min(delay, this.config.maxDelay);
    this.state.currentDelay = delay;

    // Add jitter if enabled
    if (this.config.jitterEnabled) {
      const jitterRange = delay * this.config.jitterAmount;
      const jitter = (Math.random() - 0.5) * 2 * jitterRange;
      delay = delay + jitter;
      delay = Math.max(delay, this.config.initialDelay);
    }

    // Round to nearest millisecond
    delay = Math.round(delay);

    this.state.nextAttemptTime = Date.now() + delay;

    logger.info(`Scheduling reconnection attempt ${this.state.attemptNumber}`, {
      delay: delay,
      attemptNumber: this.state.attemptNumber,
      totalAttempts: this.state.totalAttempts,
      maxAttempts: this.config.maxAttempts,
    });

    // Schedule reconnection
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.state.nextAttemptTime = undefined;

      logger.info(`Attempting reconnection ${this.state.attemptNumber}`, {
        attemptNumber: this.state.attemptNumber,
        totalAttempts: this.state.totalAttempts,
        delay: this.state.currentDelay,
      });

      // Trigger reconnection (should be handled by caller)
      this.onReconnectCallback?.();
    }, delay);
  }

  /**
   * Manual reconnection request
   */
  reconnect(): void {
    logger.info('Manual reconnection requested');

    // Cancel any pending reconnection
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    // Reset counters
    this.state.attemptNumber = 0;
    this.state.currentDelay = this.config.initialDelay;
    this.state.shouldReconnect = true;

    // Trigger immediate reconnection
    this.onReconnectCallback?.();
  }

  /**
   * Disable automatic reconnection
   */
  disableReconnection(): void {
    this.state.shouldReconnect = false;

    logger.info('Automatic reconnection disabled');

    // Cancel any pending reconnection
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  /**
   * Enable automatic reconnection
   */
  enableReconnection(): void {
    this.state.shouldReconnect = true;
    this.state.attemptNumber = 0;
    this.state.currentDelay = this.config.initialDelay;

    logger.info('Automatic reconnection enabled');

    // If not connected, schedule reconnection
    if (!this.state.isConnected) {
      this.scheduleReconnect();
    }
  }

  /**
   * Reset reconnection state
   */
  reset(): void {
    // Cancel any pending reconnection
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.state = {
      attemptNumber: 0,
      currentDelay: this.config.initialDelay,
      isConnected: false,
      shouldReconnect: this.config.enabled,
      totalAttempts: 0,
      successfulReconnections: 0,
    };

    logger.debug('Reconnection state reset');
  }

  /**
   * Get current reconnection state
   */
  getState(): Readonly<ReconnectionState> {
    return { ...this.state };
  }

  /**
   * Get next attempt countdown (in seconds)
   */
  getNextAttemptCountdown(): number {
    if (!this.state.nextAttemptTime) {
      return 0;
    }
    const remaining = this.state.nextAttemptTime - Date.now();
    return Math.max(0, Math.round(remaining / 1000));
  }

  /**
   * Update configuration at runtime
   */
  updateConfig(config: Partial<ReconnectionConfig>): void {
    this.config = { ...this.config, ...config };

    logger.info('ReconnectionManager config updated', {
      config: this.config,
    });

    // If auto-reconnect was enabled and we're not connected
    if (config.enabled !== undefined && config.enabled && !this.state.isConnected) {
      this.enableReconnection();
    }
  }
}

// ============================================================================
// Client-side Reconnection Hook
// ============================================================================

export interface UseReconnectionOptions extends ReconnectionConfig {
  /** Function to call for reconnection */
  reconnectFn: () => void;
  /** Callback when reconnection succeeds */
  onReconnect?: () => void;
  /** Callback on disconnect */
  onDisconnect?: (reason: string) => void;
  /** Callback on error */
  onError?: (error: Error) => void;
}

/**
 * Create a reconnection manager instance for client-side use
 */
export function createReconnectionManager(options: UseReconnectionOptions): ReconnectionManager {
  const manager = new ReconnectionManager(options);

  // Setup callbacks
  if (options.onReconnect) {
    manager.onReconnect(options.onReconnect);
  }

  if (options.onDisconnect) {
    manager.onDisconnect(options.onDisconnect);
  }

  if (options.onError) {
    manager.onError(options.onError);
  }

  // Setup reconnection function
  manager.onReconnect(() => {
    options.reconnectFn();
  });

  return manager;
}

export default ReconnectionManager;
