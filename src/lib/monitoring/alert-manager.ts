/**
 * Alert Manager Module
 * 告警管理器
 * 
 * 功能：
 * - 告警级别（P0/P1/P2/P3）
 * - 告警通道（日志、邮件、webhook）
 * - 告警聚合（避免告警风暴）
 * - 告警抑制和静默规则
 */

import { AlertSystem, type AlertConfig, type AlertSeverity, type AlertChannel, type AggregatedAlert } from './alerts';
import { performanceAlertManager } from './performance.alerts';

// ========================================
// Types
// ========================================

export interface AlertLevel {
  priority: number;
  name: string;
  color: string;
  emoji: string;
  autoEscalateAfter?: number; // ms
}

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  condition: (metrics: Record<string, unknown>) => boolean;
  level: AlertLevelKey;
  channels: AlertChannel[];
  enabled: boolean;
  throttleMs?: number;
  aggregateMs?: number;
  suppressUntil?: Date;
  tags?: string[];
}

export type AlertLevelKey = 'p0' | 'p1' | 'p2' | 'p3';

export interface AlertRecord {
  id: string;
  ruleId: string;
  level: AlertLevelKey;
  message: string;
  details: Record<string, unknown>;
  timestamp: Date;
  resolvedAt?: Date;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  count: number; // Times this alert fired
  suppressed: boolean;
  suppressionReason?: string;
  channels: AlertChannel[];
  sendResults: Record<AlertChannel, boolean>;
}

export interface AlertStats {
  totalAlerts: number;
  activeAlerts: number;
  resolvedAlerts: number;
  suppressedAlerts: number;
  byLevel: Record<AlertLevelKey, number>;
  byChannel: Record<AlertChannel, number>;
  avgResponseTime: number; // ms
  topAlerts: Array<{ rule: string; count: number }>;
}

export interface SilenceRule {
  id: string;
  name: string;
  description: string;
  match: AlertMatcher;
  duration: number; // ms
  createdAt: Date;
  createdBy?: string;
  reason?: string;
}

export interface AlertMatcher {
  level?: AlertLevelKey[];
  ruleId?: string[];
  tags?: string[];
  message?: string; // regex
  details?: Record<string, string>; // key-value match
}

export interface EscalationPolicy {
  id: string;
  name: string;
  levels: EscalationLevel[];
}

export interface EscalationLevel {
  level: AlertLevelKey;
  delayMs: number;
  channels: AlertChannel[];
  notifyUsers?: string[];
  notifyTeams?: string[];
}

// ========================================
// Alert Levels Configuration
// ========================================

export const ALERT_LEVELS: Record<AlertLevelKey, AlertLevel> = {
  p0: {
    priority: 0,
    name: 'Critical',
    color: '#FF0000',
    emoji: '🚨',
    autoEscalateAfter: 0, // No auto-escalation, already highest
  },
  p1: {
    priority: 1,
    name: 'High',
    color: '#FFA500',
    emoji: '🔴',
    autoEscalateAfter: 300000, // 5 minutes
  },
  p2: {
    priority: 2,
    name: 'Warning',
    color: '#FFFF00',
    emoji: '🟡',
    autoEscalateAfter: 600000, // 10 minutes
  },
  p3: {
    priority: 3,
    name: 'Info',
    color: '#00FF00',
    emoji: '🟢',
    autoEscalateAfter: undefined, // Never auto-escalate
  },
};

// ========================================
// Default Alert Rules
// ========================================

export const DEFAULT_ALERT_RULES: AlertRule[] = [
  {
    id: 'lcp-critical',
    name: 'LCP Critical',
    description: 'Alert when LCP exceeds 4s',
    condition: (m) => {
      const lcp = m['LCP'] as number;
      return typeof lcp === 'number' && lcp > 4000;
    },
    level: 'p0',
    channels: ['email', 'webhook'],
    enabled: true,
    throttleMs: 300000, // 5 minutes
    tags: ['web-vitals', 'loading'],
  },
  {
    id: 'lcp-warning',
    name: 'LCP Warning',
    description: 'Alert when LCP exceeds 2.5s',
    condition: (m) => {
      const lcp = m['LCP'] as number;
      return typeof lcp === 'number' && lcp > 2500 && lcp <= 4000;
    },
    level: 'p2',
    channels: ['webhook'],
    enabled: true,
    throttleMs: 600000, // 10 minutes
    tags: ['web-vitals', 'loading'],
  },
  {
    id: 'fid-critical',
    name: 'FID Critical',
    description: 'Alert when FID exceeds 300ms',
    condition: (m) => {
      const fid = m['FID'] as number;
      return typeof fid === 'number' && fid > 300;
    },
    level: 'p0',
    channels: ['email', 'webhook'],
    enabled: true,
    throttleMs: 300000,
    tags: ['web-vitals', 'interactivity'],
  },
  {
    id: 'fid-warning',
    name: 'FID Warning',
    description: 'Alert when FID exceeds 100ms',
    condition: (m) => {
      const fid = m['FID'] as number;
      return typeof fid === 'number' && fid > 100 && fid <= 300;
    },
    level: 'p2',
    channels: ['webhook'],
    enabled: true,
    throttleMs: 600000,
    tags: ['web-vitals', 'interactivity'],
  },
  {
    id: 'cls-critical',
    name: 'CLS Critical',
    description: 'Alert when CLS exceeds 0.25',
    condition: (m) => {
      const cls = m['CLS'] as number;
      return typeof cls === 'number' && cls > 0.25;
    },
    level: 'p0',
    channels: ['email', 'webhook'],
    enabled: true,
    throttleMs: 300000,
    tags: ['web-vitals', 'stability'],
  },
  {
    id: 'cls-warning',
    name: 'CLS Warning',
    description: 'Alert when CLS exceeds 0.1',
    condition: (m) => {
      const cls = m['CLS'] as number;
      return typeof cls === 'number' && cls > 0.1 && cls <= 0.25;
    },
    level: 'p2',
    channels: ['webhook'],
    enabled: true,
    throttleMs: 600000,
    tags: ['web-vitals', 'stability'],
  },
  {
    id: 'memory-leak',
    name: 'Memory Leak',
    description: 'Alert when memory usage increases steadily',
    condition: (m) => {
      const memoryUsage = m['memoryUsage'] as number;
      const memoryTrend = m['memoryTrend'] as string;
      return typeof memoryUsage === 'number' && memoryTrend === 'increasing';
    },
    level: 'p0',
    channels: ['email', 'webhook'],
    enabled: true,
    throttleMs: 600000,
    tags: ['memory', 'critical'],
  },
  {
    id: 'error-spike',
    name: 'Error Rate Spike',
    description: 'Alert when error rate spikes',
    condition: (m) => {
      const errorRate = m['errorRate'] as number;
      const baselineErrorRate = m['baselineErrorRate'] as number;
      return typeof errorRate === 'number' && 
             typeof baselineErrorRate === 'number' && 
             errorRate > baselineErrorRate * 2;
    },
    level: 'p1',
    channels: ['email', 'webhook'],
    enabled: true,
    throttleMs: 300000,
    tags: ['errors', 'spike'],
  },
  {
    id: 'slow-query',
    name: 'Slow Query',
    description: 'Alert when slow query count exceeds threshold',
    condition: (m) => {
      const slowQueryCount = m['slowQueryCount'] as number;
      return typeof slowQueryCount === 'number' && slowQueryCount > 5;
    },
    level: 'p1',
    channels: ['webhook'],
    enabled: true,
    throttleMs: 600000,
    tags: ['database', 'performance'],
  },
  {
    id: 'cache-miss',
    name: 'Cache Miss',
    description: 'Alert when cache hit rate is low',
    condition: (m) => {
      const cacheHitRate = m['cacheHitRate'] as number;
      return typeof cacheHitRate === 'number' && cacheHitRate < 0.7;
    },
    level: 'p2',
    channels: ['webhook'],
    enabled: true,
    throttleMs: 900000, // 15 minutes
    tags: ['cache', 'performance'],
  },
];

// ========================================
// Alert Manager Class
// ========================================

export class AlertManager {
  private rules: Map<string, AlertRule>;
  private alertHistory: AlertRecord[] = [];
  private activeAlerts: Map<string, AlertRecord> = new Map();
  private silenceRules: Map<string, SilenceRule> = new Map();
  private escalationPolicies: Map<string, EscalationPolicy> = new Map();
  private alertSystem: AlertSystem;
  private maxHistorySize = 10000;

  private escalationInterval: ReturnType<typeof setInterval> | null = null;

  constructor(alertSystem: AlertSystem) {
    this.alertSystem = alertSystem;
    this.rules = new Map();
    DEFAULT_ALERT_RULES.forEach(rule => this.addRule(rule));
    
    // Start escalation check interval
    this.startEscalationCheck();
  }

  /**
   * Cleanup resources - call when disposing the manager
   */
  destroy(): void {
    if (this.escalationInterval !== null) {
      clearInterval(this.escalationInterval);
      this.escalationInterval = null;
    }
  }

  /**
   * Add an alert rule
   */
  addRule(rule: AlertRule): void {
    this.rules.set(rule.id, rule);
  }

  /**
   * Remove an alert rule
   */
  removeRule(ruleId: string): boolean {
    return this.rules.delete(ruleId);
  }

  /**
   * Get a rule
   */
  getRule(ruleId: string): AlertRule | undefined {
    return this.rules.get(ruleId);
  }

  /**
   * Get all rules
   */
  getAllRules(): AlertRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * Enable/disable a rule
   */
  setRuleEnabled(ruleId: string, enabled: boolean): boolean {
    const rule = this.rules.get(ruleId);
    if (!rule) return false;
    rule.enabled = enabled;
    return true;
  }

  /**
   * Evaluate metrics against all rules
   */
  evaluate(metrics: Record<string, unknown>): AlertRecord[] {
    const triggeredAlerts: AlertRecord[] = [];

    for (const rule of this.rules.values()) {
      if (!rule.enabled) continue;

      // Check if rule is suppressed
      const suppressUntil = rule.suppressUntil;
      if (suppressUntil && new Date() < suppressUntil) {
        continue;
      }

      // Check if silenced
      if (this.isAlertSilenced(rule)) {
        continue;
      }

      // Evaluate condition
      if (rule.condition(metrics)) {
        const alert = this.createAlert(rule, metrics);
        triggeredAlerts.push(alert);
        
        // Fire and forget - alert sending is async, doesn't block evaluation
        this.sendAlert(alert).catch(err => {
          console.error('Failed to send alert:', err);
        });
      }
    }

    return triggeredAlerts;
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string, acknowledgedBy: string): boolean {
    const alert = this.alertHistory.find(a => a.id === alertId);
    if (!alert) return false;

    alert.acknowledgedAt = new Date();
    alert.acknowledgedBy = acknowledgedBy;
    return true;
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.alertHistory.find(a => a.id === alertId);
    if (!alert) return false;

    alert.resolvedAt = new Date();
    this.activeAlerts.delete(alert.ruleId);
    return true;
  }

  /**
   * Add a silence rule
   */
  addSilenceRule(rule: SilenceRule): void {
    this.silenceRules.set(rule.id, rule);
  }

  /**
   * Remove a silence rule
   */
  removeSilenceRule(ruleId: string): boolean {
    return this.silenceRules.delete(ruleId);
  }

  /**
   * Get all silence rules
   */
  getSilenceRules(): SilenceRule[] {
    return Array.from(this.silenceRules.values()).filter(
      r => r.createdAt.getTime() + r.duration > Date.now()
    );
  }

  /**
   * Suppress a rule for a duration
   */
  suppressRule(ruleId: string, durationMs: number, reason?: string): boolean {
    const rule = this.rules.get(ruleId);
    if (!rule) return false;

    rule.suppressUntil = new Date(Date.now() + durationMs);
    return true;
  }

  /**
   * Get alert history
   */
  getAlertHistory(limit = 100): AlertRecord[] {
    return this.alertHistory.slice(-limit);
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): AlertRecord[] {
    return Array.from(this.activeAlerts.values());
  }

  /**
   * Get alert statistics
   */
  getStats(): AlertStats {
    const totalAlerts = this.alertHistory.length;
    const activeAlerts = this.activeAlerts.size;
    const resolvedAlerts = this.alertHistory.filter(a => a.resolvedAt).length;
    const suppressedAlerts = this.alertHistory.filter(a => a.suppressed).length;

    const byLevel: Record<AlertLevelKey, number> = {
      p0: 0,
      p1: 0,
      p2: 0,
      p3: 0,
    };

    const byChannel: Record<AlertChannel, number> = {
      slack: 0,
      email: 0,
      webhook: 0,
      discord: 0,
      telegram: 0,
    };

    for (const alert of this.alertHistory) {
      byLevel[alert.level]++;
      for (const [channel, sent] of Object.entries(alert.sendResults)) {
        if (sent) {
          byChannel[channel as AlertChannel]++;
        }
      }
    }

    // Calculate average response time
    const resolvedWithTime = this.alertHistory.filter(a => a.resolvedAt);
    const avgResponseTime = resolvedWithTime.length > 0
      ? resolvedWithTime.reduce((sum, a) => sum + (a.resolvedAt!.getTime() - a.timestamp.getTime()), 0) / resolvedWithTime.length
      : 0;

    // Calculate top alerts
    const alertCounts = new Map<string, number>();
    for (const alert of this.alertHistory) {
      const ruleName = this.rules.get(alert.ruleId)?.name ?? alert.ruleId;
      alertCounts.set(ruleName, (alertCounts.get(ruleName) ?? 0) + 1);
    }

    const topAlerts = Array.from(alertCounts.entries())
      .map(([rule, count]) => ({ rule, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalAlerts,
      activeAlerts,
      resolvedAlerts,
      suppressedAlerts,
      byLevel,
      byChannel,
      avgResponseTime,
      topAlerts,
    };
  }

  /**
   * Add an escalation policy
   */
  addEscalationPolicy(policy: EscalationPolicy): void {
    this.escalationPolicies.set(policy.id, policy);
  }

  /**
   * Get escalation policy
   */
  getEscalationPolicy(policyId: string): EscalationPolicy | undefined {
    return this.escalationPolicies.get(policyId);
  }

  // ========================================
  // Private Methods
  // ========================================

  private createAlert(rule: AlertRule, metrics: Record<string, unknown>): AlertRecord {
    const existing = this.activeAlerts.get(rule.id);
    const count = existing ? existing.count + 1 : 1;

    const alert: AlertRecord = {
      id: `${rule.id}-${Date.now()}`,
      ruleId: rule.id,
      level: rule.level,
      message: `${rule.name}: ${rule.description}`,
      details: metrics,
      timestamp: new Date(),
      count,
      suppressed: false,
      channels: rule.channels,
      sendResults: {
        slack: false,
        email: false,
        webhook: false,
        discord: false,
        telegram: false,
      },
    };

    // Update active alerts
    this.activeAlerts.set(rule.id, alert);
    
    // Add to history
    this.alertHistory.push(alert);
    this.trimHistory();

    return alert;
  }

  private async sendAlert(alert: AlertRecord): Promise<void> {
    const rule = this.rules.get(alert.ruleId);
    if (!rule) return;

    // Check throttle
    const lastAlert = this.alertHistory.slice(-1).find(a => a.ruleId === alert.ruleId);
    if (lastAlert && rule.throttleMs) {
      const timeSinceLastAlert = Date.now() - lastAlert.timestamp.getTime();
      if (timeSinceLastAlert < rule.throttleMs) {
        alert.suppressed = true;
        alert.suppressionReason = `Throttled: only ${timeSinceLastAlert}ms since last alert`;
        return;
      }
    }

    const severity: AlertSeverity = alert.level as AlertSeverity;
    
    const alertConfig: AlertConfig = {
      severity,
      title: `${ALERT_LEVELS[alert.level].emoji} ${rule.name}`,
      message: rule.description,
      details: alert.details as Record<string, string | number>,
      tags: rule.tags,
      timestamp: alert.timestamp,
      channels: rule.channels,
      deduplicationKey: `${alert.ruleId}:${Math.floor(alert.timestamp.getTime() / (rule.aggregateMs || 60000))}`,
    };

    try {
      const results = await this.alertSystem.sendAlert(alertConfig);
      alert.sendResults = results;
    } catch (error) {
      console.error('Failed to send alert:', error);
    }
  }

  private isAlertSilenced(rule: AlertRule): boolean {
    for (const silenceRule of this.silenceRules.values()) {
      if (!this.matchesAlert(rule, silenceRule.match)) {
        continue;
      }

      // Check if silence rule is still active
      const expiry = silenceRule.createdAt.getTime() + silenceRule.duration;
      if (Date.now() > expiry) {
        continue;
      }

      return true;
    }
    return false;
  }

  private matchesAlert(rule: AlertRule, matcher: AlertMatcher): boolean {
    // Check level
    if (matcher.level && !matcher.level.includes(rule.level)) {
      return false;
    }

    // Check rule ID
    if (matcher.ruleId && !matcher.ruleId.includes(rule.id)) {
      return false;
    }

    // Check tags
    if (matcher.tags && matcher.tags.length > 0) {
      const hasAllTags = matcher.tags.every(tag => rule.tags?.includes(tag));
      if (!hasAllTags) return false;
    }

    // Check message (regex match would be implemented here)
    // For now, just check if the message contains the pattern
    if (matcher.message && !rule.description.includes(matcher.message)) {
      return false;
    }

    return true;
  }

  private trimHistory(): void {
    if (this.alertHistory.length > this.maxHistorySize) {
      this.alertHistory = this.alertHistory.slice(-this.maxHistorySize);
    }
  }

  private startEscalationCheck(): void {
    // Check for escalation every minute
    this.escalationInterval = setInterval(() => {
      this.checkEscalation();
    }, 60000);
  }

  private checkEscalation(): void {
    const now = Date.now();

    for (const alert of this.activeAlerts.values()) {
      if (alert.acknowledgedAt || alert.resolvedAt) {
        continue;
      }

      const levelConfig = ALERT_LEVELS[alert.level];
      if (!levelConfig.autoEscalateAfter) {
        continue;
      }

      const timeSinceAlert = now - alert.timestamp.getTime();
      if (timeSinceAlert < levelConfig.autoEscalateAfter) {
        continue;
      }

      // Escalate alert
      this.escalateAlert(alert);
    }
  }

  private async escalateAlert(alert: AlertRecord): Promise<void> {
    const currentLevel = alert.level;
    const nextLevel = this.getNextLevel(currentLevel);
    
    if (!nextLevel) return;

    const rule = this.rules.get(alert.ruleId);
    if (!rule) return;

    // Create escalated alert
    const escalatedAlert: AlertRecord = {
      ...alert,
      id: `${alert.ruleId}-escalated-${Date.now()}`,
      level: nextLevel,
      message: `[ESCALATED] ${alert.message}`,
      count: alert.count + 1,
      channels: ['email', 'webhook'], // Escalate to more channels
    };

    try {
      const severity: AlertSeverity = nextLevel as AlertSeverity;
      const alertConfig: AlertConfig = {
        severity,
        title: `${ALERT_LEVELS[nextLevel].emoji} ${ALERT_LEVELS[nextLevel].name}: ${rule.name}`,
        message: `Alert escalated from ${ALERT_LEVELS[currentLevel].name} to ${ALERT_LEVELS[nextLevel].name}`,
        details: alert.details as Record<string, string | number>,
        tags: [...(rule.tags ?? []), 'escalated'],
        timestamp: new Date(),
        channels: escalatedAlert.channels,
      };

      await this.alertSystem.sendAlert(alertConfig);
      
      // Update alert
      alert.level = nextLevel;
      alert.sendResults = await this.alertSystem.sendAlert(alertConfig);
      
      this.alertHistory.push(escalatedAlert);
      this.trimHistory();
    } catch (error) {
      console.error('Failed to escalate alert:', error);
    }
  }

  private getNextLevel(currentLevel: AlertLevelKey): AlertLevelKey | null {
    const levels: AlertLevelKey[] = ['p3', 'p2', 'p1', 'p0'];
    const currentIndex = levels.indexOf(currentLevel);
    if (currentIndex <= 0) return null;
    return levels[currentIndex - 1];
  }
}

// ========================================
// Export singleton instance
// ========================================

let alertManagerInstance: AlertManager | null = null;

export function getAlertManager(alertSystem?: AlertSystem): AlertManager {
  if (!alertManagerInstance) {
    if (!alertSystem) {
      throw new Error('AlertSystem is required for first initialization');
    }
    alertManagerInstance = new AlertManager(alertSystem);
  }
  return alertManagerInstance;
}

export function createAlertManager(alertSystem: AlertSystem): AlertManager {
  alertManagerInstance = new AlertManager(alertSystem);
  return alertManagerInstance;
}

export default AlertManager;

// ========================================
// Helper Functions
// ========================================

/**
 * Create a silence rule
 */
export function createSilenceRule(
  id: string,
  name: string,
  match: AlertMatcher,
  duration: number,
  reason?: string
): SilenceRule {
  return {
    id,
    name,
    description: `Silence alerts matching criteria for ${duration}ms`,
    match,
    duration,
    createdAt: new Date(),
    reason,
  };
}

/**
 * Format alert for UI display with ARIA labels
 */
export function formatAlertForDisplay(alert: AlertRecord): {
  id: string;
  level: AlertLevelKey;
  levelLabel: string;
  levelEmoji: string;
  levelColor: string;
  message: string;
  timestamp: Date;
  acknowledged: boolean;
  acknowledgedBy?: string;
  resolved: boolean;
  resolvedAt?: Date;
  count: number;
  suppressed: boolean;
  channels: AlertChannel[];
  sendResults: Record<AlertChannel, boolean>;
  ariaLabel: string;
  ariaLive: 'polite' | 'assertive' | 'off';
} {
  const levelConfig = ALERT_LEVELS[alert.level];
  
  return {
    id: alert.id,
    level: alert.level,
    levelLabel: levelConfig.name,
    levelEmoji: levelConfig.emoji,
    levelColor: levelConfig.color,
    message: alert.message,
    timestamp: alert.timestamp,
    acknowledged: !!alert.acknowledgedAt,
    acknowledgedBy: alert.acknowledgedBy,
    resolved: !!alert.resolvedAt,
    resolvedAt: alert.resolvedAt,
    count: alert.count,
    suppressed: alert.suppressed,
    channels: alert.channels,
    sendResults: alert.sendResults,
    ariaLabel: `${levelConfig.emoji} ${levelConfig.name} alert: ${alert.message} at ${alert.timestamp.toISOString()}`,
    ariaLive: alert.level === 'p0' || alert.level === 'p1' ? 'assertive' : 'polite',
  };
}

/**
 * Format alert statistics for display
 */
export function formatAlertStatsForDisplay(stats: AlertStats): {
  totalAlerts: number;
  activeAlerts: number;
  resolvedAlerts: number;
  suppressedAlerts: number;
  passRate: number;
  avgResolutionTime: string;
  byLevel: Array<{ level: AlertLevelKey; label: string; emoji: string; count: number }>;
  byChannel: Array<{ channel: AlertChannel; count: number }>;
  topAlerts: Array<{ rule: string; count: number }>;
} {
  const passRate = stats.totalAlerts > 0 
    ? Math.round(((stats.totalAlerts - stats.activeAlerts) / stats.totalAlerts * 100) * 10) / 10
    : 100;

  const avgResolutionTime = stats.avgResponseTime > 0
    ? `${(stats.avgResponseTime / 1000 / 60).toFixed(1)} min`
    : 'N/A';

  const byLevel = Object.entries(stats.byLevel).map(([level, count]) => ({
    level: level as AlertLevelKey,
    label: ALERT_LEVELS[level as AlertLevelKey].name,
    emoji: ALERT_LEVELS[level as AlertLevelKey].emoji,
    count,
  }));

  const byChannel = Object.entries(stats.byChannel).map(([channel, count]) => ({
    channel: channel as AlertChannel,
    count,
  }));

  return {
    totalAlerts: stats.totalAlerts,
    activeAlerts: stats.activeAlerts,
    resolvedAlerts: stats.resolvedAlerts,
    suppressedAlerts: stats.suppressedAlerts,
    passRate,
    avgResolutionTime,
    byLevel,
    byChannel,
    topAlerts: stats.topAlerts,
  };
}
