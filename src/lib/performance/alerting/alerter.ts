/**
 * Performance Alerting System
 * Multi-level alerts with suppression, aggregation, and history tracking
 * 
 * Features:
 * - Multi-level alerts (info, warning, error, critical)
 * - Alert suppression (avoid duplicate alerts)
 * - Alert aggregation (merge similar alerts)
 * - Alert history tracking
 * - Dashboard channel support
 */

// ========================================
// Types
// ========================================

/**
 * Alert severity levels
 */
export type AlertLevel = 'info' | 'warning' | 'error' | 'critical';

/**
 * Alert status
 */
export type AlertStatus = 'active' | 'acknowledged' | 'resolved' | 'suppressed';

/**
 * Alert categories
 */
export type AlertCategory = 
  | 'performance'
  | 'availability'
  | 'error'
  | 'resource'
  | 'security'
  | 'custom';

/**
 * Performance alert data
 */
export interface PerformanceAlert {
  /** Unique alert ID */
  id: string;
  /** Alert title */
  title: string;
  /** Alert description */
  message: string;
  /** Severity level */
  level: AlertLevel;
  /** Alert category */
  category: AlertCategory;
  /** Current status */
  status: AlertStatus;
  /** Source component/module */
  source: string;
  /** Metric that triggered the alert */
  metric?: string;
  /** Current value */
  currentValue?: number;
  /** Threshold value */
  threshold?: number;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
  /** Timestamp when alert was created */
  createdAt: number;
  /** Timestamp when alert was last updated */
  updatedAt: number;
  /** Timestamp when alert was acknowledged */
  acknowledgedAt?: number;
  /** User who acknowledged the alert */
  acknowledgedBy?: string;
  /** Timestamp when alert was resolved */
  resolvedAt?: number;
  /** Number of times this alert has fired */
  occurrenceCount: number;
  /** IDs of aggregated alerts */
  aggregatedIds?: string[];
  /** Tags for filtering */
  tags?: string[];
}

/**
 * Alert configuration
 */
export interface AlertConfig {
  /** Minimum level to trigger alerts */
  minLevel: AlertLevel;
  /** Enable/disable alerting */
  enabled: boolean;
  /** Suppression window in milliseconds */
  suppressionWindow: number;
  /** Aggregation window in milliseconds */
  aggregationWindow: number;
  /** Maximum alerts to keep in history */
  maxHistorySize: number;
  /** Enable alert aggregation */
  enableAggregation: boolean;
  /** Custom deduplication key function */
  deduplicationKeyFn?: (alert: Omit<PerformanceAlert, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'occurrenceCount'>) => string;
}

/**
 * Suppression rule
 */
export interface SuppressionRule {
  /** Rule ID */
  id: string;
  /** Rule name */
  name: string;
  /** Alert filter criteria */
  filter: AlertFilter;
  /** Suppression duration in milliseconds */
  duration: number;
  /** Whether the rule is active */
  active: boolean;
  /** Reason for suppression */
  reason: string;
  /** Created timestamp */
  createdAt: number;
  /** Created by */
  createdBy?: string;
}

/**
 * Alert filter criteria
 */
export interface AlertFilter {
  /** Filter by level */
  level?: AlertLevel | AlertLevel[];
  /** Filter by category */
  category?: AlertCategory | AlertCategory[];
  /** Filter by source */
  source?: string | string[];
  /** Filter by metric */
  metric?: string | string[];
  /** Filter by tags (all must match) */
  tags?: string[];
  /** Custom filter function */
  customFn?: (alert: PerformanceAlert) => boolean;
}

/**
 * Aggregated alert group
 */
export interface AggregatedAlertGroup {
  /** Group key */
  key: string;
  /** Representative alert */
  representative: PerformanceAlert;
  /** All alerts in the group */
  alerts: PerformanceAlert[];
  /** Total occurrence count */
  totalOccurrences: number;
  /** Time range of alerts in group */
  timeRange: {
    start: number;
    end: number;
  };
}

/**
 * Alert history entry
 */
export interface AlertHistoryEntry {
  /** The alert */
  alert: PerformanceAlert;
  /** Actions taken */
  actions: AlertAction[];
}

/**
 * Alert action record
 */
export interface AlertAction {
  /** Action type */
  type: 'created' | 'updated' | 'acknowledged' | 'resolved' | 'suppressed' | 'aggregated';
  /** Timestamp */
  timestamp: number;
  /** User who performed the action */
  user?: string;
  /** Additional details */
  details?: Record<string, unknown>;
}

/**
 * Alert statistics
 */
export interface AlertStats {
  /** Total alerts by level */
  byLevel: Record<AlertLevel, number>;
  /** Total alerts by category */
  byCategory: Record<AlertCategory, number>;
  /** Total alerts by status */
  byStatus: Record<AlertStatus, number>;
  /** Total alerts in last 24 hours */
  last24Hours: number;
  /** Total alerts in last 7 days */
  last7Days: number;
  /** Average resolution time in milliseconds */
  avgResolutionTime: number;
  /** Active suppression rules count */
  activeSuppressions: number;
}

/**
 * Alert channel interface
 */
export interface AlertChannel {
  /** Channel name */
  name: string;
  /** Send alert to this channel */
  send(alert: PerformanceAlert): Promise<void>;
  /** Test channel connectivity */
  test?(): Promise<boolean>;
}

/**
 * Dashboard alert message format
 */
export interface DashboardAlertMessage {
  /** Alert ID */
  id: string;
  /** Display title */
  title: string;
  /** Display message */
  message: string;
  /** Severity level */
  level: AlertLevel;
  /** Icon name */
  icon: string;
  /** Color for display */
  color: string;
  /** Timestamp */
  timestamp: number;
  /** Whether it requires acknowledgment */
  requiresAcknowledgment: boolean;
  /** Actions available */
  actions: {
    acknowledge: boolean;
    resolve: boolean;
    suppress: boolean;
  };
  /** Additional data */
  data?: Record<string, unknown>;
}

// ========================================
// Alert Level Utilities
// ========================================

const LEVEL_PRIORITY: Record<AlertLevel, number> = {
  info: 0,
  warning: 1,
  error: 2,
  critical: 3,
};

/**
 * Get the priority of an alert level
 */
export function getLevelPriority(level: AlertLevel): number {
  return LEVEL_PRIORITY[level];
}

/**
 * Compare two alert levels
 * Returns: negative if a < b, 0 if equal, positive if a > b
 */
export function compareLevels(a: AlertLevel, b: AlertLevel): number {
  return LEVEL_PRIORITY[a] - LEVEL_PRIORITY[b];
}

/**
 * Check if a level meets the minimum threshold
 */
export function meetsMinLevel(level: AlertLevel, minLevel: AlertLevel): boolean {
  return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[minLevel];
}

/**
 * Get display properties for an alert level
 */
export function getLevelDisplay(level: AlertLevel): {
  icon: string;
  color: string;
  bgColor: string;
} {
  const displays: Record<AlertLevel, { icon: string; color: string; bgColor: string }> = {
    info: {
      icon: 'ℹ️',
      color: '#3b82f6',
      bgColor: '#eff6ff',
    },
    warning: {
      icon: '⚠️',
      color: '#f59e0b',
      bgColor: '#fffbeb',
    },
    error: {
      icon: '❌',
      color: '#ef4444',
      bgColor: '#fef2f2',
    },
    critical: {
      icon: '🚨',
      color: '#dc2626',
      bgColor: '#fee2e2',
    },
  };
  return displays[level];
}

// ========================================
// Alert ID Generator
// ========================================

let alertCounter = 0;

/**
 * Generate a unique alert ID
 */
export function generateAlertId(): string {
  const timestamp = Date.now().toString(36);
  const counter = (alertCounter++).toString(36).padStart(4, '0');
  const random = Math.random().toString(36).substring(2, 6);
  return `alert-${timestamp}-${counter}-${random}`;
}

// ========================================
// Deduplication Key Generator
// ========================================

/**
 * Default deduplication key generator
 * Creates a key based on title, level, category, source, and metric
 */
export function defaultDeduplicationKey(
  alert: Omit<PerformanceAlert, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'occurrenceCount'>
): string {
  const parts = [
    alert.title,
    alert.level,
    alert.category,
    alert.source,
    alert.metric || 'none',
  ];
  return parts.join('::').toLowerCase();
}

// ========================================
// Performance Alerter Class
// ========================================

export class PerformanceAlerter {
  private config: AlertConfig;
  private channels: AlertChannel[] = [];
  private activeAlerts: Map<string, PerformanceAlert> = new Map();
  private alertHistory: AlertHistoryEntry[] = [];
  private suppressionRules: Map<string, SuppressionRule> = new Map();
  private suppressionCache: Map<string, number> = new Map();
  private aggregationGroups: Map<string, AggregatedAlertGroup> = new Map();
  private metricsCallback?: (stats: AlertStats) => void;

  constructor(config: Partial<AlertConfig> = {}) {
    this.config = {
      minLevel: 'warning',
      enabled: true,
      suppressionWindow: 300000, // 5 minutes
      aggregationWindow: 60000, // 1 minute
      maxHistorySize: 1000,
      enableAggregation: true,
      ...config,
    };
  }

  // ========================================
  // Configuration
  // ========================================

  /**
   * Update alerter configuration
   */
  updateConfig(config: Partial<AlertConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): AlertConfig {
    return { ...this.config };
  }

  /**
   * Enable/disable alerting
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
  }

  /**
   * Check if alerting is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  // ========================================
  // Channel Management
  // ========================================

  /**
   * Register an alert channel
   */
  registerChannel(channel: AlertChannel): void {
    if (!this.channels.find((c) => c.name === channel.name)) {
      this.channels.push(channel);
    }
  }

  /**
   * Unregister an alert channel
   */
  unregisterChannel(channelName: string): void {
    this.channels = this.channels.filter((c) => c.name !== channelName);
  }

  /**
   * Get all registered channels
   */
  getChannels(): AlertChannel[] {
    return [...this.channels];
  }

  // ========================================
  // Alert Creation
  // ========================================

  /**
   * Create and send a new alert
   */
  async createAlert(
    data: Omit<
      PerformanceAlert,
      'id' | 'createdAt' | 'updatedAt' | 'status' | 'occurrenceCount'
    >
  ): Promise<PerformanceAlert> {
    // Check if alerting is enabled
    if (!this.config.enabled) {
      throw new Error('Alerting is disabled');
    }

    // Check minimum level
    if (!meetsMinLevel(data.level, this.config.minLevel)) {
      throw new Error(
        `Alert level ${data.level} is below minimum level ${this.config.minLevel}`
      );
    }

    const now = Date.now();
    const deduplicationKey = this.config.deduplicationKeyFn
      ? this.config.deduplicationKeyFn(data)
      : defaultDeduplicationKey(data);

    // Check suppression
    if (await this.shouldSuppress(deduplicationKey, data)) {
      const suppressedAlert: PerformanceAlert = {
        ...data,
        id: generateAlertId(),
        status: 'suppressed',
        createdAt: now,
        updatedAt: now,
        occurrenceCount: 1,
      };
      this.addToHistory(suppressedAlert, 'suppressed');
      return suppressedAlert;
    }

    // Check for existing active alert (deduplication)
    const existingAlert = this.findExistingAlert(deduplicationKey);
    if (existingAlert) {
      // Update occurrence count
      existingAlert.occurrenceCount++;
      existingAlert.updatedAt = now;
      if (data.currentValue !== undefined) {
        existingAlert.currentValue = data.currentValue;
      }
      this.addToHistory(existingAlert, 'updated');
      return existingAlert;
    }

    // Create new alert
    const alert: PerformanceAlert = {
      ...data,
      id: generateAlertId(),
      status: 'active',
      createdAt: now,
      updatedAt: now,
      occurrenceCount: 1,
    };

    // Check aggregation
    if (this.config.enableAggregation) {
      const aggregatedAlert = this.tryAggregate(alert, deduplicationKey);
      if (aggregatedAlert) {
        this.addToHistory(aggregatedAlert, 'aggregated');
        return aggregatedAlert;
      }
    }

    // Store as active alert
    this.activeAlerts.set(alert.id, alert);
    this.suppressionCache.set(deduplicationKey, now);

    // Add to history
    this.addToHistory(alert, 'created');

    // Send to channels
    await this.sendToChannels(alert);

    return alert;
  }

  /**
   * Find existing alert by deduplication key
   */
  private findExistingAlert(deduplicationKey: string): PerformanceAlert | undefined {
    for (const alert of this.activeAlerts.values()) {
      const existingKey = this.config.deduplicationKeyFn
        ? this.config.deduplicationKeyFn(alert)
        : defaultDeduplicationKey(alert);
      if (existingKey === deduplicationKey) {
        return alert;
      }
    }
    return undefined;
  }

  // ========================================
  // Suppression
  // ========================================

  /**
   * Add a suppression rule
   */
  addSuppressionRule(rule: Omit<SuppressionRule, 'id' | 'createdAt'>): SuppressionRule {
    const newRule: SuppressionRule = {
      ...rule,
      id: `suppression-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: Date.now(),
    };
    this.suppressionRules.set(newRule.id, newRule);
    return newRule;
  }

  /**
   * Remove a suppression rule
   */
  removeSuppressionRule(ruleId: string): boolean {
    return this.suppressionRules.delete(ruleId);
  }

  /**
   * Get all suppression rules
   */
  getSuppressionRules(): SuppressionRule[] {
    return Array.from(this.suppressionRules.values());
  }

  /**
   * Check if an alert should be suppressed
   */
  private async shouldSuppress(
    deduplicationKey: string,
    alert: Omit<PerformanceAlert, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'occurrenceCount'>
  ): Promise<boolean> {
    const now = Date.now();

    // Check suppression cache (time-based suppression)
    const lastSuppression = this.suppressionCache.get(deduplicationKey);
    if (lastSuppression && (now - lastSuppression) < this.config.suppressionWindow) {
      return true;
    }

    // Check active suppression rules
    for (const rule of this.suppressionRules.values()) {
      if (!rule.active) continue;

      // Check if rule matches this alert
      if (this.matchesFilter(alert, rule.filter)) {
        // Check if rule is still valid
        if ((now - rule.createdAt) < rule.duration) {
          return true;
        } else {
          // Rule has expired, deactivate it
          rule.active = false;
        }
      }
    }

    return false;
  }

  /**
   * Check if an alert matches a filter
   */
  private matchesFilter(
    alert: PerformanceAlert | Omit<PerformanceAlert, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'occurrenceCount'>,
    filter: AlertFilter
  ): boolean {
    // Check level filter
    if (filter.level) {
      const levels = Array.isArray(filter.level) ? filter.level : [filter.level];
      if (!levels.includes(alert.level)) {
        return false;
      }
    }

    // Check category filter
    if (filter.category) {
      const categories = Array.isArray(filter.category) ? filter.category : [filter.category];
      if (!categories.includes(alert.category)) {
        return false;
      }
    }

    // Check source filter
    if (filter.source) {
      const sources = Array.isArray(filter.source) ? filter.source : [filter.source];
      if (!sources.includes(alert.source)) {
        return false;
      }
    }

    // Check metric filter
    if (filter.metric) {
      const metrics = Array.isArray(filter.metric) ? filter.metric : [filter.metric];
      if (!alert.metric || !metrics.includes(alert.metric)) {
        return false;
      }
    }

    // Check tags filter
    if (filter.tags && filter.tags.length > 0) {
      if (!alert.tags) {
        return false;
      }
      if (!filter.tags.every((tag) => alert.tags!.includes(tag))) {
        return false;
      }
    }

    // Check custom filter function
    if (filter.customFn) {
      if (!filter.customFn(alert as PerformanceAlert)) {
        return false;
      }
    }

    return true;
  }

  // ========================================
  // Aggregation
  // ========================================

  /**
   * Try to aggregate an alert with existing alerts
   */
  private tryAggregate(
    alert: PerformanceAlert,
    deduplicationKey: string
  ): PerformanceAlert | null {
    const now = Date.now();

    // Find or create aggregation group
    const group = this.aggregationGroups.get(deduplicationKey);

    if (group) {
      // Check if group is still within aggregation window
      if ((now - group.timeRange.start) <= this.config.aggregationWindow) {
        // Add to existing group
        group.alerts.push(alert);
        group.totalOccurrences += alert.occurrenceCount;
        group.timeRange.end = now;

        // Update representative alert
        group.representative.occurrenceCount = group.totalOccurrences;
        group.representative.updatedAt = now;
        group.representative.aggregatedIds = group.alerts.map((a) => a.id);

        return group.representative;
      } else {
        // Group has expired, start a new one
        this.aggregationGroups.delete(deduplicationKey);
      }
    }

    // Create new aggregation group
    this.aggregationGroups.set(deduplicationKey, {
      key: deduplicationKey,
      representative: alert,
      alerts: [alert],
      totalOccurrences: alert.occurrenceCount,
      timeRange: {
        start: now,
        end: now,
      },
    });

    return null;
  }

  /**
   * Get all aggregation groups
   */
  getAggregationGroups(): AggregatedAlertGroup[] {
    return Array.from(this.aggregationGroups.values());
  }

  /**
   * Clear expired aggregation groups
   */
  clearExpiredAggregationGroups(): number {
    const now = Date.now();
    let cleared = 0;

    for (const [key, group] of this.aggregationGroups.entries()) {
      if ((now - group.timeRange.start) > this.config.aggregationWindow) {
        this.aggregationGroups.delete(key);
        cleared++;
      }
    }

    return cleared;
  }

  // ========================================
  // Alert Management
  // ========================================

  /**
   * Get all active alerts
   */
  getActiveAlerts(): PerformanceAlert[] {
    return Array.from(this.activeAlerts.values());
  }

  /**
   * Get an alert by ID
   */
  getAlert(alertId: string): PerformanceAlert | undefined {
    return this.activeAlerts.get(alertId);
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string, acknowledgedBy?: string): PerformanceAlert | null {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) {
      return null;
    }

    alert.status = 'acknowledged';
    alert.acknowledgedAt = Date.now();
    alert.acknowledgedBy = acknowledgedBy;
    alert.updatedAt = Date.now();

    this.addToHistory(alert, 'acknowledged', { user: acknowledgedBy });

    return alert;
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string): PerformanceAlert | null {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) {
      return null;
    }

    alert.status = 'resolved';
    alert.resolvedAt = Date.now();
    alert.updatedAt = Date.now();

    this.activeAlerts.delete(alertId);
    this.addToHistory(alert, 'resolved');

    return alert;
  }

  /**
   * Clear all active alerts
   */
  clearAllAlerts(): number {
    const count = this.activeAlerts.size;
    this.activeAlerts.clear();
    return count;
  }

  // ========================================
  // History
  // ========================================

  /**
   * Add an alert to history
   */
  private addToHistory(
    alert: PerformanceAlert,
    actionType: AlertAction['type'],
    details?: Record<string, unknown>
  ): void {
    const action: AlertAction = {
      type: actionType,
      timestamp: Date.now(),
      details,
    };

    // Find existing history entry or create new one
    let entry = this.alertHistory.find((e) => e.alert.id === alert.id);
    if (!entry) {
      entry = { alert, actions: [] };
      this.alertHistory.push(entry);
    }

    entry.actions.push(action);

    // Trim history if needed
    if (this.alertHistory.length > this.config.maxHistorySize) {
      this.alertHistory.shift();
    }
  }

  /**
   * Get alert history
   */
  getHistory(options?: {
    limit?: number;
    level?: AlertLevel;
    category?: AlertCategory;
    since?: number;
  }): AlertHistoryEntry[] {
    let history = [...this.alertHistory];

    // Apply filters
    if (options?.level) {
      history = history.filter((e) => e.alert.level === options.level);
    }
    if (options?.category) {
      history = history.filter((e) => e.alert.category === options.category);
    }
    if (options?.since) {
      const since = options.since;
      history = history.filter((e) => e.alert.createdAt >= since);
    }

    // Sort by timestamp (newest first)
    history.sort((a, b) => b.alert.createdAt - a.alert.createdAt);

    // Apply limit
    if (options?.limit) {
      history = history.slice(0, options.limit);
    }

    return history;
  }

  /**
   * Clear alert history
   */
  clearHistory(): void {
    this.alertHistory = [];
  }

  // ========================================
  // Statistics
  // ========================================

  /**
   * Get alert statistics
   */
  getStats(): AlertStats {
    const now = Date.now();
    const dayAgo = now - 86400000;
    const weekAgo = now - 604800000;

    const stats: AlertStats = {
      byLevel: { info: 0, warning: 0, error: 0, critical: 0 },
      byCategory: {
        performance: 0,
        availability: 0,
        error: 0,
        resource: 0,
        security: 0,
        custom: 0,
      },
      byStatus: { active: 0, acknowledged: 0, resolved: 0, suppressed: 0 },
      last24Hours: 0,
      last7Days: 0,
      avgResolutionTime: 0,
      activeSuppressions: 0,
    };

    // Calculate from history
    let totalResolutionTime = 0;
    let resolvedCount = 0;

    for (const entry of this.alertHistory) {
      const alert = entry.alert;

      // By level
      stats.byLevel[alert.level]++;

      // By category
      stats.byCategory[alert.category]++;

      // By status
      stats.byStatus[alert.status]++;

      // Time-based counts
      if (alert.createdAt >= dayAgo) {
        stats.last24Hours++;
      }
      if (alert.createdAt >= weekAgo) {
        stats.last7Days++;
      }

      // Resolution time
      if (alert.resolvedAt && alert.createdAt) {
        totalResolutionTime += alert.resolvedAt - alert.createdAt;
        resolvedCount++;
      }
    }

    // Calculate average resolution time
    stats.avgResolutionTime = resolvedCount > 0 ? totalResolutionTime / resolvedCount : 0;

    // Count active suppressions
    for (const rule of this.suppressionRules.values()) {
      if (rule.active && (now - rule.createdAt) < rule.duration) {
        stats.activeSuppressions++;
      }
    }

    return stats;
  }

  /**
   * Set metrics callback for external monitoring
   */
  setMetricsCallback(callback: (stats: AlertStats) => void): void {
    this.metricsCallback = callback;
  }

  // ========================================
  // Channel Communication
  // ========================================

  /**
   * Send alert to all registered channels
   */
  private async sendToChannels(alert: PerformanceAlert): Promise<void> {
    const sendPromises = this.channels.map(async (channel) => {
      try {
        await channel.send(alert);
      } catch (error) {
        console.error(`[PerformanceAlerter] Failed to send to channel ${channel.name}:`, error);
      }
    });

    await Promise.allSettled(sendPromises);

    // Trigger metrics callback if set
    if (this.metricsCallback) {
      this.metricsCallback(this.getStats());
    }
  }

  /**
   * Convert alert to dashboard message format
   */
  toDashboardMessage(alert: PerformanceAlert): DashboardAlertMessage {
    const display = getLevelDisplay(alert.level);

    return {
      id: alert.id,
      title: alert.title,
      message: alert.message,
      level: alert.level,
      icon: display.icon,
      color: display.color,
      timestamp: alert.createdAt,
      requiresAcknowledgment: alert.level === 'error' || alert.level === 'critical',
      actions: {
        acknowledge: alert.status === 'active',
        resolve: alert.status === 'active' || alert.status === 'acknowledged',
        suppress: alert.status === 'active',
      },
      data: {
        category: alert.category,
        source: alert.source,
        metric: alert.metric,
        currentValue: alert.currentValue,
        threshold: alert.threshold,
        occurrenceCount: alert.occurrenceCount,
        metadata: alert.metadata,
      },
    };
  }
}

// ========================================
// Dashboard Channel Implementation
// ========================================

/**
 * Dashboard channel for sending alerts to the UI
 */
export class DashboardChannel implements AlertChannel {
  name = 'dashboard';
  private callbacks: Set<(message: DashboardAlertMessage) => void> = new Set();
  private messageHistory: DashboardAlertMessage[] = [];
  private maxHistorySize: number;

  constructor(options?: { maxHistorySize?: number }) {
    this.maxHistorySize = options?.maxHistorySize || 100;
  }

  /**
   * Send alert to dashboard
   */
  async send(alert: PerformanceAlert): Promise<void> {
    // Convert to dashboard message format
    const message: DashboardAlertMessage = {
      id: alert.id,
      title: alert.title,
      message: alert.message,
      level: alert.level,
      icon: getLevelDisplay(alert.level).icon,
      color: getLevelDisplay(alert.level).color,
      timestamp: alert.createdAt,
      requiresAcknowledgment: alert.level === 'error' || alert.level === 'critical',
      actions: {
        acknowledge: alert.status === 'active',
        resolve: alert.status === 'active' || alert.status === 'acknowledged',
        suppress: alert.status === 'active',
      },
      data: {
        category: alert.category,
        source: alert.source,
        metric: alert.metric,
        currentValue: alert.currentValue,
        threshold: alert.threshold,
        occurrenceCount: alert.occurrenceCount,
        metadata: alert.metadata,
      },
    };

    // Add to history
    this.messageHistory.unshift(message);
    if (this.messageHistory.length > this.maxHistorySize) {
      this.messageHistory.pop();
    }

    // Notify all subscribers
    for (const callback of this.callbacks) {
      try {
        callback(message);
      } catch (error) {
        console.error('[DashboardChannel] Callback error:', error);
      }
    }
  }

  /**
   * Subscribe to dashboard alerts
   */
  subscribe(callback: (message: DashboardAlertMessage) => void): () => void {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  /**
   * Get message history
   */
  getHistory(options?: { limit?: number; level?: AlertLevel }): DashboardAlertMessage[] {
    let messages = [...this.messageHistory];

    if (options?.level) {
      messages = messages.filter((m) => m.level === options.level);
    }

    if (options?.limit) {
      messages = messages.slice(0, options.limit);
    }

    return messages;
  }

  /**
   * Clear message history
   */
  clearHistory(): void {
    this.messageHistory = [];
  }

  /**
   * Test channel connectivity
   */
  async test(): Promise<boolean> {
    return true;
  }
}

// ========================================
// Utility Functions
// ========================================

/**
 * Create a performance alert helper
 */
export function createPerformanceAlert(
  title: string,
  message: string,
  level: AlertLevel,
  options?: {
    category?: AlertCategory;
    source?: string;
    metric?: string;
    currentValue?: number;
    threshold?: number;
    metadata?: Record<string, unknown>;
    tags?: string[];
  }
): Omit<PerformanceAlert, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'occurrenceCount'> {
  return {
    title,
    message,
    level,
    category: options?.category || 'performance',
    source: options?.source || 'system',
    metric: options?.metric,
    currentValue: options?.currentValue,
    threshold: options?.threshold,
    metadata: options?.metadata,
    tags: options?.tags,
  };
}

/**
 * Format alert for logging
 */
export function formatAlertForLog(alert: PerformanceAlert): string {
  const display = getLevelDisplay(alert.level);
  const timestamp = new Date(alert.createdAt).toISOString();
  return `[${timestamp}] ${display.icon} [${alert.level.toUpperCase()}] ${alert.title}: ${alert.message}`;
}

/**
 * Filter alerts by criteria
 */
export function filterAlerts(
  alerts: PerformanceAlert[],
  filter: AlertFilter
): PerformanceAlert[] {
  return alerts.filter((alert) => {
    // Check level filter
    if (filter.level) {
      const levels = Array.isArray(filter.level) ? filter.level : [filter.level];
      if (!levels.includes(alert.level)) {
        return false;
      }
    }

    // Check category filter
    if (filter.category) {
      const categories = Array.isArray(filter.category) ? filter.category : [filter.category];
      if (!categories.includes(alert.category)) {
        return false;
      }
    }

    // Check source filter
    if (filter.source) {
      const sources = Array.isArray(filter.source) ? filter.source : [filter.source];
      if (!sources.includes(alert.source)) {
        return false;
      }
    }

    // Check metric filter
    if (filter.metric) {
      const metrics = Array.isArray(filter.metric) ? filter.metric : [filter.metric];
      if (!alert.metric || !metrics.includes(alert.metric)) {
        return false;
      }
    }

    // Check tags filter
    if (filter.tags && filter.tags.length > 0) {
      if (!alert.tags) {
        return false;
      }
      if (!filter.tags.every((tag) => alert.tags!.includes(tag))) {
        return false;
      }
    }

    // Check custom filter function
    if (filter.customFn && !filter.customFn(alert)) {
      return false;
    }

    return true;
  });
}

// ========================================
// Export Singleton Instance
// ========================================

export const performanceAlerter = new PerformanceAlerter();

// ========================================
// Default Export
// ========================================

export default performanceAlerter;

