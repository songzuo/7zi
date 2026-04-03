/**
 * Cache Monitoring and Metrics
 * 
 * Provides real-time monitoring, metrics collection, and health checks.
 * 
 * @module lib/cache/Monitoring
 */

import type {
  CacheStats,
  LevelStats,
  DistributedCacheMetrics,
  CacheLevel,
  CacheEventListener,
  CacheEvent,
} from './types'
import { logger } from '../logger'

/**
 * Cache health status
 */
export type CacheHealthStatus = 'healthy' | 'degraded' | 'critical' | 'unknown'

/**
 * Health check result
 */
export interface HealthCheckResult {
  status: CacheHealthStatus
  level: CacheLevel
  checks: {
    connectivity: boolean
    memory: boolean
    performance: boolean
    errors: boolean
  }
  details: Record<string, unknown>
  timestamp: number
}

/**
 * Cache alert
 */
export interface CacheAlert {
  id: string
  severity: 'info' | 'warning' | 'error' | 'critical'
  type: string
  message: string
  level?: CacheLevel
  data?: Record<string, unknown>
  timestamp: number
  resolved: boolean
}

/**
 * Alert rule
 */
export interface AlertRule {
  id: string
  name: string
  condition: (metrics: CacheStats) => boolean
  severity: 'info' | 'warning' | 'error' | 'critical'
  message: string
  enabled: boolean
  cooldown: number // ms
  lastTriggered?: number
}

/**
 * Cache Monitor
 * Monitors cache performance and health
 */
export class CacheMonitor {
  private statsHistory: Map<CacheLevel, CacheStats[]> = new Map()
  private maxHistorySize: number = 100
  private alertRules: AlertRule[] = []
  private alerts: CacheAlert[] = []
  private listeners: Set<CacheEventListener> = new Set()
  private monitoringInterval: NodeJS.Timeout | null = null
  private monitoringIntervalMs: number = 5000 // 5 seconds
  
  constructor() {
    this.initializeDefaultAlertRules()
  }
  
  /**
   * Start monitoring
   */
  startMonitoring(intervalMs: number = 5000): void {
    this.monitoringIntervalMs = intervalMs
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
    }
    
    this.monitoringInterval = setInterval(() => {
      this.collectMetrics()
    }, this.monitoringIntervalMs)
    
    logger.info('[CacheMonitor] Started monitoring', { category: 'cache' })
  }
  
  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = null
    }
    
    logger.info('[CacheMonitor] Stopped monitoring', { category: 'cache' })
  }
  
  /**
   * Record cache statistics
   */
  recordStats(level: CacheLevel, stats: CacheStats): void {
    const history = this.statsHistory.get(level) || []
    history.push({ ...stats })
    
    // Keep only recent history
    if (history.length > this.maxHistorySize) {
      history.shift()
    }
    
    this.statsHistory.set(level, history)
    
    // Check alert rules
    this.checkAlertRules(stats, level)
  }
  
  /**
   * Get statistics history for a level
   */
  getStatsHistory(level: CacheLevel, limit?: number): CacheStats[] {
    const history = this.statsHistory.get(level) || []
    return limit ? history.slice(-limit) : [...history]
  }
  
  /**
   * Get aggregated statistics
   */
  getAggregatedStats(level: CacheLevel, windowMs: number = 60000): CacheStats {
    const history = this.statsHistory.get(level) || []
    const now = Date.now()
    
    // Filter stats within time window
    const recentStats = history.filter(s => now - s.lastReset <= windowMs)
    
    if (recentStats.length === 0) {
      return this.createEmptyStats()
    }
    
    // Aggregate stats
    const aggregated: CacheStats = {
      hits: recentStats.reduce((sum, s) => sum + s.hits, 0),
      misses: recentStats.reduce((sum, s) => sum + s.misses, 0),
      hitRate: 0,
      entries: recentStats[recentStats.length - 1].entries,
      memoryUsage: recentStats[recentStats.length - 1].memoryUsage,
      avgAccessTime: recentStats.reduce((sum, s) => sum + s.avgAccessTime, 0) / recentStats.length,
      evictions: recentStats.reduce((sum, s) => sum + s.evictions, 0),
      expired: recentStats.reduce((sum, s) => sum + s.expired, 0),
      errors: recentStats.reduce((sum, s) => sum + s.errors, 0),
      lastReset: now,
    }
    
    const total = aggregated.hits + aggregated.misses
    aggregated.hitRate = total > 0 ? aggregated.hits / total : 0
    
    return aggregated
  }
  
  /**
   * Perform health check
   */
  async performHealthCheck(level: CacheLevel, stats: CacheStats): Promise<HealthCheckResult> {
    const checks = {
      connectivity: true,
      memory: true,
      performance: true,
      errors: true,
    }
    
    const details: Record<string, unknown> = {}
    
    // Check memory usage
    const memoryUsageRatio = stats.memoryUsage / (100 * 1024 * 1024) // Assume 100MB limit
    details.memoryUsageRatio = memoryUsageRatio
    if (memoryUsageRatio > 0.9) {
      checks.memory = false
    }
    
    // Check performance
    details.avgAccessTime = stats.avgAccessTime
    if (stats.avgAccessTime > 100) {
      checks.performance = false
    }
    
    // Check errors
    details.errorRate = stats.errors / (stats.hits + stats.misses)
    if (stats.errors > 100) {
      checks.errors = false
    }
    
    // Determine overall status
    const failedChecks = Object.values(checks).filter(v => !v).length
    let status: CacheHealthStatus
    
    if (failedChecks === 0) {
      status = 'healthy'
    } else if (failedChecks === 1) {
      status = 'degraded'
    } else {
      status = 'critical'
    }
    
    return {
      status,
      level,
      checks,
      details,
      timestamp: Date.now(),
    }
  }
  
  /**
   * Get active alerts
   */
  getActiveAlerts(): CacheAlert[] {
    return this.alerts.filter(a => !a.resolved)
  }
  
  /**
   * Get all alerts
   */
  getAllAlerts(): CacheAlert[] {
    return [...this.alerts]
  }
  
  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string): void {
    const alert = this.alerts.find(a => a.id === alertId)
    if (alert) {
      alert.resolved = true
      logger.info(`[CacheMonitor] Resolved alert ${alertId}`, { category: 'cache' })
    }
  }
  
  /**
   * Add alert rule
   */
  addAlertRule(rule: AlertRule): void {
    this.alertRules.push(rule)
    logger.info(`[CacheMonitor] Added alert rule ${rule.id}`, { category: 'cache' })
  }
  
  /**
   * Remove alert rule
   */
  removeAlertRule(ruleId: string): void {
    this.alertRules = this.alertRules.filter(r => r.id !== ruleId)
  }
  
  /**
   * Get alert rules
   */
  getAlertRules(): AlertRule[] {
    return [...this.alertRules]
  }
  
  /**
   * Subscribe to cache events
   */
  subscribe(listener: CacheEventListener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }
  
  /**
   * Get monitoring summary
   */
  getSummary(): {
    levels: CacheLevel[]
    totalAlerts: number
    activeAlerts: number
    healthStatus: Record<CacheLevel, CacheHealthStatus>
  } {
    const levels: CacheLevel[] = ['L1', 'L2', 'L3']
    const healthStatus: Record<CacheLevel, CacheHealthStatus> = {} as any
    
    for (const level of levels) {
      const stats = this.getAggregatedStats(level)
      // Synchronous health check determination
      const memoryUsageRatio = stats.memoryUsage / (100 * 1024 * 1024)
      const failedChecks = [
        memoryUsageRatio > 0.9,
        stats.avgAccessTime > 100,
        stats.errors > 100,
      ].filter(Boolean).length
      
      if (failedChecks === 0) {
        healthStatus[level] = 'healthy'
      } else if (failedChecks === 1) {
        healthStatus[level] = 'degraded'
      } else {
        healthStatus[level] = 'critical'
      }
    }
    
    return {
      levels,
      totalAlerts: this.alerts.length,
      activeAlerts: this.getActiveAlerts().length,
      healthStatus,
    }
  }
  
  // ============================================
  // Private Methods
  // ============================================
  
  private initializeDefaultAlertRules(): void {
    this.alertRules = [
      {
        id: 'high-error-rate',
        name: 'High Error Rate',
        condition: (stats) => stats.errors > 50,
        severity: 'error',
        message: 'Cache error rate is high',
        enabled: true,
        cooldown: 60000,
      },
      {
        id: 'low-hit-rate',
        name: 'Low Hit Rate',
        condition: (stats) => stats.hitRate < 0.5 && (stats.hits + stats.misses) > 100,
        severity: 'warning',
        message: 'Cache hit rate is below 50%',
        enabled: true,
        cooldown: 300000,
      },
      {
        id: 'high-memory-usage',
        name: 'High Memory Usage',
        condition: (stats) => stats.memoryUsage > 80 * 1024 * 1024,
        severity: 'warning',
        message: 'Cache memory usage is above 80MB',
        enabled: true,
        cooldown: 120000,
      },
      {
        id: 'slow-access',
        name: 'Slow Access Time',
        condition: (stats) => stats.avgAccessTime > 50,
        severity: 'warning',
        message: 'Cache access time is above 50ms',
        enabled: true,
        cooldown: 120000,
      },
    ]
  }
  
  private collectMetrics(): void {
    // This would be called by the cache manager to push stats
    // For now, it's a placeholder
  }
  
  private checkAlertRules(stats: CacheStats, level: CacheLevel): void {
    const now = Date.now()
    
    for (const rule of this.alertRules) {
      if (!rule.enabled) continue
      
      // Check cooldown
      if (rule.lastTriggered && now - rule.lastTriggered < rule.cooldown) {
        continue
      }
      
      // Check condition
      if (rule.condition(stats)) {
        this.triggerAlert(rule, level, stats)
        rule.lastTriggered = now
      }
    }
  }
  
  private triggerAlert(rule: AlertRule, level: CacheLevel, stats: CacheStats): void {
    const alert: CacheAlert = {
      id: `${rule.id}-${Date.now()}`,
      severity: rule.severity,
      type: rule.name,
      message: rule.message,
      level,
      data: { stats },
      timestamp: Date.now(),
      resolved: false,
    }
    
    this.alerts.push(alert)
    
    // Emit event
    this.emit({
      type: 'error',
      level,
      timestamp: Date.now(),
      data: { alert },
    })
    
    logger.warn(`[CacheMonitor] Alert triggered: ${rule.message}`, { 
      category: 'cache', 
      data: { level, stats } 
    })
  }
  
  private emit(event: CacheEvent): void {
    for (const listener of Array.from(this.listeners)) {
      try {
        listener(event)
      } catch (error) {
        logger.error('[CacheMonitor] Event listener error', { 
          category: 'cache', 
          data: { error: String(error) } 
        })
      }
    }
  }
  
  private createEmptyStats(): CacheStats {
    return {
      hits: 0,
      misses: 0,
      hitRate: 0,
      entries: 0,
      memoryUsage: 0,
      avgAccessTime: 0,
      evictions: 0,
      expired: 0,
      errors: 0,
      lastReset: Date.now(),
    }
  }
}

// Singleton instance
let cacheMonitorInstance: CacheMonitor | null = null

export function getCacheMonitor(): CacheMonitor {
  if (!cacheMonitorInstance) {
    cacheMonitorInstance = new CacheMonitor()
  }
  return cacheMonitorInstance
}

// Re-export types
export type { CacheStats, LevelStats, DistributedCacheMetrics, CacheLevel }