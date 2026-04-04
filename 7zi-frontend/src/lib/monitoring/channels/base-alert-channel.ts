/**
 * Base Alert Channel
 * 基础告警通道
 *
 * Provides common functionality for all alert channels:
 * - Retry mechanism
 * - Alert deduplication
 * - Rate limiting
 *
 * @version 1.0.0
 */

import { Alert, AlertChannel, AlertSeverity, AlertPriority } from '../alert-engine'

// ============================================================================
// Types
// ============================================================================

/**
 * Error with optional code property
 */
export interface ErrorWithCode extends Error {
  code?: string
}

/**
 * Alert level (combines priority and severity)
 */
export type AlertLevel = 'info' | 'warning' | 'error' | 'critical'

/**
 * Channel retry configuration
 */
export interface RetryConfig {
  maxRetries: number
  initialDelayMs: number
  maxDelayMs: number
  backoffMultiplier: number
  retryableErrors?: string[]
}

/**
 * Deduplication config
 */
export interface DedupConfig {
  enabled: boolean
  windowMs: number
  keys: Array<'ruleId' | 'priority' | 'severity' | 'metric' | 'fingerprint'>
}

/**
 * Rate limit config
 */
export interface RateLimitConfig {
  maxAlertsPerMinute: number
  maxAlertsPerHour: number
}

/**
 * Base channel config
 */
export interface BaseChannelConfig {
  enabled: boolean
  retry?: RetryConfig
  dedup?: DedupConfig
  rateLimit?: RateLimitConfig
  severityFilter?: AlertSeverity[]
  priorityFilter?: AlertPriority[]
}

/**
 * Alert sending result
 */
export interface SendResult {
  success: boolean
  alertId: string
  channel: string
  error?: string
  attempts: number
  timestamp: number
}

/**
 * Channel metrics
 */
export interface ChannelMetrics {
  totalSent: number
  totalFailed: number
  totalRetried: number
  totalDeduped: number
  lastSentAt?: number
  lastFailedAt?: number
}

// ============================================================================
// Default Configuration
// ============================================================================

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  retryableErrors: ['ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND', 'EAI_AGAIN', 'ECONNRESET'],
}

export const DEFAULT_DEDUP_CONFIG: DedupConfig = {
  enabled: true,
  windowMs: 60000, // 1 minute
  keys: ['ruleId', 'priority'],
}

export const DEFAULT_RATE_LIMIT_CONFIG: RateLimitConfig = {
  maxAlertsPerMinute: 10,
  maxAlertsPerHour: 100,
}

// ============================================================================
// Deduplication Store
// ============================================================================

interface DedupEntry {
  alertId: string
  timestamp: number
  count: number
}

class DedupStore {
  private entries: Map<string, DedupEntry> = new Map()

  /**
   * Check if alert should be deduped
   */
  shouldDedup(key: string, windowMs: number): boolean {
    const entry = this.entries.get(key)
    if (!entry) return false

    const now = Date.now()
    if (now - entry.timestamp > windowMs) {
      // Expired, remove
      this.entries.delete(key)
      return false
    }

    return true
  }

  /**
   * Record alert for deduplication
   */
  record(key: string, alertId: string): void {
    const existing = this.entries.get(key)
    if (existing) {
      existing.count++
      existing.timestamp = Date.now()
    } else {
      this.entries.set(key, {
        alertId,
        timestamp: Date.now(),
        count: 1,
      })
    }
  }

  /**
   * Get dedup count
   */
  getCount(key: string): number {
    return this.entries.get(key)?.count || 0
  }

  /**
   * Clear expired entries
   */
  cleanExpired(windowMs: number): number {
    const now = Date.now()
    let cleaned = 0

    for (const [key, entry] of this.entries.entries()) {
      if (now - entry.timestamp > windowMs) {
        this.entries.delete(key)
        cleaned++
      }
    }

    return cleaned
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.entries.clear()
  }
}

// ============================================================================
// Rate Limiter
// ============================================================================

interface RateLimitEntry {
  count: number
  windowStart: number
}

class RateLimiter {
  private minuteEntries: Map<string, RateLimitEntry> = new Map()
  private hourEntries: Map<string, RateLimitEntry> = new Map()

  /**
   * Check if under rate limit
   */
  check(key: string, config: RateLimitConfig): { allowed: boolean; remaining: number } {
    const now = Date.now()
    const minuteKey = `${key}:minute`
    const hourKey = `${key}:hour`

    // Check minute limit
    let minuteEntry = this.minuteEntries.get(minuteKey)
    if (!minuteEntry || now - minuteEntry.windowStart > 60000) {
      minuteEntry = { count: 0, windowStart: now }
      this.minuteEntries.set(minuteKey, minuteEntry)
    }

    if (minuteEntry.count >= config.maxAlertsPerMinute) {
      return { allowed: false, remaining: 0 }
    }

    // Check hour limit
    let hourEntry = this.hourEntries.get(hourKey)
    if (!hourEntry || now - hourEntry.windowStart > 3600000) {
      hourEntry = { count: 0, windowStart: now }
      this.hourEntries.set(hourKey, hourEntry)
    }

    if (hourEntry.count >= config.maxAlertsPerHour) {
      return { allowed: false, remaining: 0 }
    }

    // Increment counts
    minuteEntry.count++
    hourEntry.count++

    const remaining = Math.min(
      config.maxAlertsPerMinute - minuteEntry.count,
      config.maxAlertsPerHour - hourEntry.count
    )

    return { allowed: true, remaining }
  }

  /**
   * Clean expired entries
   */
  clean(): void {
    const now = Date.now()

    for (const [key, entry] of this.minuteEntries.entries()) {
      if (now - entry.windowStart > 120000) {
        this.minuteEntries.delete(key)
      }
    }

    for (const [key, entry] of this.hourEntries.entries()) {
      if (now - entry.windowStart > 7200000) {
        this.hourEntries.delete(key)
      }
    }
  }
}

// ============================================================================
// Base Alert Channel
// ============================================================================

/**
 * Base class for alert channels with common functionality
 */
export abstract class BaseAlertChannel implements AlertChannel {
  protected config: BaseChannelConfig
  protected retryConfig: RetryConfig
  protected dedupConfig: DedupConfig
  protected rateLimitConfig: RateLimitConfig

  private dedupStore: DedupStore
  private rateLimiter: RateLimiter
  private metrics: ChannelMetrics

  constructor(config: BaseChannelConfig) {
    this.config = {
      enabled: true,
      ...config,
    }

    this.retryConfig = {
      ...DEFAULT_RETRY_CONFIG,
      ...config.retry,
    }

    this.dedupConfig = {
      ...DEFAULT_DEDUP_CONFIG,
      ...config.dedup,
    }

    this.rateLimitConfig = {
      ...DEFAULT_RATE_LIMIT_CONFIG,
      ...config.rateLimit,
    }

    this.dedupStore = new DedupStore()
    this.rateLimiter = new RateLimiter()
    this.metrics = {
      totalSent: 0,
      totalFailed: 0,
      totalRetried: 0,
      totalDeduped: 0,
    }
  }

  /**
   * Send alert (with retry, dedup, rate limiting)
   */
  async send(alert: Alert): Promise<void> {
    // Check if enabled
    if (!this.config.enabled) {
      console.log(`[BaseAlertChannel] Channel disabled, skipping alert: ${alert.id}`)
      return
    }

    // Check severity filter
    if (this.config.severityFilter?.length && !this.config.severityFilter.includes(alert.severity)) {
      console.log(`[BaseAlertChannel] Severity ${alert.severity} not in filter, skipping`)
      return
    }

    // Check priority filter
    if (this.config.priorityFilter?.length && !this.config.priorityFilter.includes(alert.priority)) {
      console.log(`[BaseAlertChannel] Priority ${alert.priority} not in filter, skipping`)
      return
    }

    // Check rate limit
    const rateCheck = this.rateLimiter.check(this.getChannelKey(), this.rateLimitConfig)
    if (!rateCheck.allowed) {
      console.warn(`[BaseAlertChannel] Rate limit exceeded for ${this.getChannelKey()}`)
      throw new Error('Rate limit exceeded')
    }

    // Check deduplication
    if (this.dedupConfig.enabled) {
      const dedupKey = this.generateDedupKey(alert)
      if (this.dedupStore.shouldDedup(dedupKey, this.dedupConfig.windowMs)) {
        this.metrics.totalDeduped++
        console.log(`[BaseAlertChannel] Deduplicated alert: ${alert.id}`)
        return
      }
      this.dedupStore.record(dedupKey, alert.id)
    }

    // Send with retry
    await this.sendWithRetry(alert)
  }

  /**
   * Send with retry logic
   */
  protected async sendWithRetry(alert: Alert): Promise<void> {
    let lastError: Error | undefined
    let attempts = 0

    for (let i = 0; i <= this.retryConfig.maxRetries; i++) {
      attempts++

      try {
        await this.sendInternal(alert)
        this.metrics.totalSent++
        this.metrics.lastSentAt = Date.now()
        return
      } catch (error) {
        lastError = error as Error

        // Check if error is retryable
        if (!this.isRetryable(error as Error)) {
          break
        }

        // Don't retry on last attempt
        if (i < this.retryConfig.maxRetries) {
          this.metrics.totalRetried++
          const delay = this.calculateDelay(i)
          console.log(`[BaseAlertChannel] Retry ${i + 1}/${this.retryConfig.maxRetries} after ${delay}ms`)
          await this.sleep(delay)
        }
      }
    }

    this.metrics.totalFailed++
    this.metrics.lastFailedAt = Date.now()
    throw lastError
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  protected calculateDelay(attempt: number): number {
    const delay = this.retryConfig.initialDelayMs * Math.pow(this.retryConfig.backoffMultiplier, attempt)
    return Math.min(delay, this.retryConfig.maxDelayMs)
  }

  /**
   * Check if error is retryable
   */
  protected isRetryable(error: Error): boolean {
    if (!this.retryConfig.retryableErrors) return true

    const errorCode = (error as ErrorWithCode).code
    const errorMessage = error.message

    return (
      this.retryConfig.retryableErrors.some(
        code => errorCode === code || errorMessage.includes(code)
      ) || errorMessage.includes('ECONNREFUSED')
    )
  }

  /**
   * Generate deduplication key
   */
  protected generateDedupKey(alert: Alert): string {
    const parts: string[] = []

    for (const key of this.dedupConfig.keys) {
      switch (key) {
        case 'ruleId':
          parts.push(alert.ruleId)
          break
        case 'priority':
          parts.push(alert.priority)
          break
        case 'severity':
          parts.push(alert.severity)
          break
        case 'metric':
          parts.push(alert.metric)
          break
        case 'fingerprint':
          parts.push(alert.fingerprint)
          break
      }
    }

    return parts.join(':')
  }

  /**
   * Get channel identifier
   */
  protected abstract getChannelKey(): string

  /**
   * Internal send method - implement in subclasses
   */
  protected abstract sendInternal(alert: Alert): Promise<void>

  /**
   * Sleep helper
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Get channel metrics
   */
  getMetrics(): ChannelMetrics {
    return { ...this.metrics }
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      totalSent: 0,
      totalFailed: 0,
      totalRetried: 0,
      totalDeduped: 0,
    }
  }

  /**
   * Clean up expired entries
   */
  cleanup(): void {
    this.dedupStore.cleanExpired(this.dedupConfig.windowMs)
    this.rateLimiter.clean()
  }

  /**
   * Enable/disable channel
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled
  }

  /**
   * Check if channel is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<BaseChannelConfig>): void {
    this.config = { ...this.config, ...config }

    if (config.retry) {
      this.retryConfig = { ...this.retryConfig, ...config.retry }
    }
    if (config.dedup) {
      this.dedupConfig = { ...this.dedupConfig, ...config.dedup }
    }
    if (config.rateLimit) {
      this.rateLimitConfig = { ...this.rateLimitConfig, ...config.rateLimit }
    }
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Convert priority to alert level
 */
export function priorityToLevel(priority: AlertPriority): AlertLevel {
  switch (priority) {
    case 'P0':
      return 'critical'
    case 'P1':
      return 'error'
    case 'P2':
      return 'warning'
    case 'P3':
      return 'info'
    default:
      return 'info'
  }
}

/**
 * Convert severity to alert level
 */
export function severityToLevel(severity: AlertSeverity): AlertLevel {
  return severity
}

/**
 * Get level priority (higher = more urgent)
 */
export function getLevelPriority(level: AlertLevel): number {
  switch (level) {
    case 'critical':
      return 4
    case 'error':
      return 3
    case 'warning':
      return 2
    case 'info':
      return 1
    default:
      return 0
  }
}

export default BaseAlertChannel
