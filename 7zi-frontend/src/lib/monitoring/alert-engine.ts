/**
 * Alert Engine - Performance Monitoring Alerting System
 * 告警规则引擎
 *
 * Features:
 * - Threshold-based alerts (阈值告警)
 * - Trend-based alerts (趋势告警)
 * - Alert suppression (告警抑制)
 * - Escalation policies (升级策略)
 * - Multi-channel notifications
 *
 * @version 1.8.0
 */

import { v4 as uuidv4 } from "uuid";

// ============================================================================
// Types
// ============================================================================

export type AlertPriority = "P0" | "P1" | "P2" | "P3";
export type AlertSeverity = "info" | "warning" | "error" | "critical";
export type AlertStatus = "firing" | "resolved" | "acknowledged" | "suppressed";

export interface AlertCondition {
  type:
    | "threshold"
    | "trend"
    | "rate_change"
    | "anomaly"
    | "uptime_check"
    | "ssl_expiry"
    | "web_vital"
    | "api_latency"
    | "error_rate"
    | "bundle_size";
  operator?: ">" | ">=" | "<" | "<=" | "==" | "!=";
  value?: number;
  threshold?: number;
  time_window?: string; // e.g., "5m", "1h", "1d"
  duration?: number; // seconds
  percentile?: number; // for percentiles, e.g., 75, 95, 99
  baseline_window?: string; // for trend alerts
  multiplier?: number; // for rate change alerts
  metric?: string; // for web_vital type
  consecutive_failures?: number; // for uptime checks
  days_remaining?: number; // for ssl_expiry
  endpoint?: string; // for api errors
  status_codes?: number[]; // for api errors
  change_percent?: number; // for bundle size
}

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  priority: AlertPriority;
  condition: AlertCondition;
  severity: AlertSeverity;
  channels: string[];
  cooldown: number; // seconds
  response_time: string; // expected response time
  runbook?: string;
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
}

export interface EscalationStep {
  after: string; // e.g., "5m", "15m", "1h"
  notify: string[];
  escalate_to?: string[];
  repeat?: boolean;
  interval?: string;
}

export interface EscalationPolicy {
  priority: AlertPriority;
  steps: EscalationStep[];
}

export interface Alert {
  id: string;
  ruleId: string;
  ruleName: string;
  priority: AlertPriority;
  severity: AlertSeverity;
  status: AlertStatus;
  metric: string;
  message: string;
  value: number;
  threshold: number;
  timestamp: number;
  startedAt: number;
  endedAt?: number;
  acknowledgedAt?: number;
  acknowledgedBy?: string;
  context?: Record<string, unknown>;
  labels?: Record<string, string>;
  fingerprint: string; // for deduplication
  silencedBy?: string;
}

export interface AlertSummary {
  firing: number;
  resolved: number;
  acknowledged: number;
  suppressed: number;
  byPriority: Record<AlertPriority, number>;
  bySeverity: Record<AlertSeverity, number>;
}

export interface TrendData {
  metric: string;
  values: Array<{ timestamp: number; value: number }>;
  baseline?: {
    mean: number;
    stdDev: number;
    min: number;
    max: number;
  };
}

export interface AlertEngineConfig {
  enabled: boolean;
  defaultChannels: string[];
  rules: AlertRule[];
  escalationPolicies: EscalationPolicy[];
  suppression: {
    windowMs: number;
    maxAlerts: number;
    deduplicateBy: string[];
    maintenanceWindows?: Array<{
      start: string;
      duration: string;
      description?: string;
    }>;
    ignorePatterns?: string[];
    deploymentGracePeriod?: string;
  };
  aggregation: {
    enabled: boolean;
    windowMs: number;
    groupBy: string[];
  };
}

// ============================================================================
// Default Configuration
// ============================================================================

export const DEFAULT_ALERT_RULES: AlertRule[] = [
  // P0 - Critical
  {
    id: "p0-service-down",
    name: "Service Down",
    description: "Main service is not responding",
    enabled: true,
    priority: "P0",
    condition: {
      type: "uptime_check",
      consecutive_failures: 3,
    },
    severity: "critical",
    channels: ["slack", "email"],
    cooldown: 300,
    response_time: "5 minutes",
    runbook: "docs/runbooks/service-down.md",
  },
  {
    id: "p0-complete-failure",
    name: "Complete Service Failure",
    description: "All requests are failing",
    enabled: true,
    priority: "P0",
    condition: {
      type: "error_rate",
      threshold: 100,
      time_window: "5m",
    },
    severity: "critical",
    channels: ["slack", "email"],
    cooldown: 300,
    response_time: "5 minutes",
  },
  {
    id: "p0-ssl-expired",
    name: "SSL Certificate Expired",
    description: "SSL certificate has expired",
    enabled: true,
    priority: "P0",
    condition: {
      type: "ssl_expiry",
      days_remaining: 0,
    },
    severity: "critical",
    channels: ["slack", "email"],
    cooldown: 86400,
    response_time: "5 minutes",
  },
  // P1 - High Priority
  {
    id: "p1-high-error-rate",
    name: "High Error Rate",
    description: "Error rate above 5%",
    enabled: true,
    priority: "P1",
    condition: {
      type: "error_rate",
      threshold: 5,
      time_window: "15m",
    },
    severity: "error",
    channels: ["slack", "email"],
    cooldown: 900,
    response_time: "15 minutes",
  },
  {
    id: "p1-error-rate-spike",
    name: "Error Rate Spike",
    description: "Error rate increased significantly from baseline",
    enabled: true,
    priority: "P1",
    condition: {
      type: "rate_change",
      baseline_window: "1w",
      multiplier: 3,
    },
    severity: "error",
    channels: ["slack", "email"],
    cooldown: 900,
    response_time: "15 minutes",
  },
  {
    id: "p1-api-endpoint-failure",
    name: "API Endpoint Failure",
    description: "Critical API endpoint returning errors",
    enabled: true,
    priority: "P1",
    condition: {
      type: "api_latency",
      threshold: 10,
      time_window: "5m",
      endpoint: "/api/*",
      status_codes: [500, 502, 503, 504],
    },
    severity: "error",
    channels: ["slack", "email"],
    cooldown: 900,
    response_time: "15 minutes",
  },
  // P2 - Warning
  {
    id: "p2-slow-lcp",
    name: "Slow LCP",
    description: "Largest Contentful Paint above 4 seconds",
    enabled: true,
    priority: "P2",
    condition: {
      type: "web_vital",
      metric: "LCP",
      threshold: 4000,
      percentile: 75,
      time_window: "1h",
    },
    severity: "warning",
    channels: ["slack"],
    cooldown: 3600,
    response_time: "1 hour",
  },
  {
    id: "p2-slow-fid",
    name: "Slow FID",
    description: "First Input Delay above 300ms",
    enabled: true,
    priority: "P2",
    condition: {
      type: "web_vital",
      metric: "FID",
      threshold: 300,
      percentile: 75,
      time_window: "1h",
    },
    severity: "warning",
    channels: ["slack"],
    cooldown: 3600,
    response_time: "1 hour",
  },
  {
    id: "p2-slow-api",
    name: "Slow API Response",
    description: "API response time above 2 seconds",
    enabled: true,
    priority: "P2",
    condition: {
      type: "api_latency",
      threshold: 2000,
      percentile: 95,
      time_window: "15m",
    },
    severity: "warning",
    channels: ["slack"],
    cooldown: 3600,
    response_time: "1 hour",
  },
  // P3 - Informational
  {
    id: "p3-error-rate-above-normal",
    name: "Error Rate Above Normal",
    description: "Error rate between 1-5%",
    enabled: true,
    priority: "P3",
    condition: {
      type: "error_rate",
      threshold: 1,
      time_window: "1h",
    },
    severity: "info",
    channels: ["slack"],
    cooldown: 14400,
    response_time: "24 hours",
  },
];

export const DEFAULT_ESCALATION_POLICIES: EscalationPolicy[] = [
  {
    priority: "P0",
    steps: [
      { after: "0m", notify: ["slack", "email"] },
      { after: "5m", notify: ["slack", "email"], escalate_to: ["manager"] },
      { after: "15m", notify: ["slack", "email"], escalate_to: ["director"] },
    ],
  },
  {
    priority: "P1",
    steps: [
      { after: "0m", notify: ["slack", "email"] },
      { after: "15m", notify: ["slack", "email"], repeat: true, interval: "15m" },
    ],
  },
  {
    priority: "P2",
    steps: [
      { after: "0m", notify: ["slack"] },
      { after: "1h", notify: ["slack", "email"] },
    ],
  },
  {
    priority: "P3",
    steps: [
      { after: "0m", notify: ["slack"] },
      { after: "4h", notify: ["email"] },
    ],
  },
];

export const DEFAULT_ALERT_ENGINE_CONFIG: AlertEngineConfig = {
  enabled: true,
  defaultChannels: ["slack"],
  rules: DEFAULT_ALERT_RULES,
  escalationPolicies: DEFAULT_ESCALATION_POLICIES,
  suppression: {
    windowMs: 60000,
    maxAlerts: 50,
    deduplicateBy: ["ruleId", "priority"],
    maintenanceWindows: [
      {
        start: "Sunday 02:00 UTC",
        duration: "2h",
        description: "Weekly maintenance",
      },
    ],
    ignorePatterns: [
      "ResizeObserver loop limit exceeded",
      "Network request failed",
      "Script error",
    ],
    deploymentGracePeriod: "5m",
  },
  aggregation: {
    enabled: true,
    windowMs: 300000,
    groupBy: ["priority", "severity"],
  },
};

// ============================================================================
// Alert Engine
// ============================================================================

export class AlertEngine {
  private config: AlertEngineConfig;
  private alerts: Map<string, Alert> = new Map();
  private alertHistory: Alert[] = [];
  private lastTriggerTime: Map<string, number> = new Map();
  private trendData: Map<string, TrendData> = new Map();
  private channels: Map<string, AlertChannel> = new Map();

  constructor(config: Partial<AlertEngineConfig> = {}) {
    this.config = { ...DEFAULT_ALERT_ENGINE_CONFIG, ...config };
  }

  /**
   * Register an alert channel
   */
  registerChannel(name: string, channel: AlertChannel): void {
    this.channels.set(name, channel);
  }

  /**
   * Add an alert rule
   */
  addRule(rule: AlertRule): void {
    this.config.rules.push(rule);
  }

  /**
   * Remove an alert rule
   */
  removeRule(ruleId: string): boolean {
    const index = this.config.rules.findIndex((r) => r.id === ruleId);
    if (index !== -1) {
      this.config.rules.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Evaluate a metric against all rules
   */
  async evaluate(
    metric: string,
    value: number,
    context?: Record<string, unknown>,
  ): Promise<Alert[]> {
    if (!this.config.enabled) return [];

    const triggeredAlerts: Alert[] = [];

    for (const rule of this.config.rules) {
      if (!rule.enabled) continue;

      const shouldTrigger = await this.evaluateRule(rule, metric, value, context);

      if (shouldTrigger) {
        const alert = await this.createAlert(rule, metric, value, context);
        if (alert) {
          triggeredAlerts.push(alert);
        }
      }
    }

    return triggeredAlerts;
  }

  /**
   * Evaluate a single rule against a metric
   */
  private async evaluateRule(
    rule: AlertRule,
    metric: string,
    value: number,
    context?: Record<string, unknown>,
  ): Promise<boolean> {
    const { condition } = rule;

    switch (condition.type) {
      case "threshold":
        return this.evaluateThreshold(condition, value);

      case "trend":
        return this.evaluateTrend(condition, metric, value);

      case "rate_change":
        return this.evaluateRateChange(condition, metric, value);

      case "web_vital":
        return this.evaluateWebVital(condition, metric, value);

      case "error_rate":
        return this.evaluateErrorRate(condition, metric, value);

      case "api_latency":
        return this.evaluateApiLatency(condition, metric, value);

      default:
        return this.evaluateThreshold(condition, value);
    }
  }

  /**
   * Evaluate threshold condition
   */
  private evaluateThreshold(condition: AlertCondition, value: number): boolean {
    const threshold = condition.threshold ?? condition.value ?? 0;
    const operator = condition.operator ?? ">";

    switch (operator) {
      case ">":
        return value > threshold;
      case ">=":
        return value >= threshold;
      case "<":
        return value < threshold;
      case "<=":
        return value <= threshold;
      case "==":
        return value === threshold;
      case "!=":
        return value !== threshold;
      default:
        return false;
    }
  }

  /**
   * Evaluate trend condition (deviation from baseline)
   */
  private evaluateTrend(
    condition: AlertCondition,
    metric: string,
    value: number,
  ): boolean {
    const trend = this.trendData.get(metric);
    if (!trend?.baseline) return false;

    const threshold = condition.threshold ?? 2; // z-score threshold
    const zScore = (value - trend.baseline.mean) / (trend.baseline.stdDev || 1);

    return Math.abs(zScore) > threshold;
  }

  /**
   * Evaluate rate change condition
   */
  private evaluateRateChange(
    condition: AlertCondition,
    metric: string,
    value: number,
  ): boolean {
    const trend = this.trendData.get(metric);
    if (!trend?.baseline) return false;

    const multiplier = condition.multiplier ?? 3;
    const baselineValue = trend.baseline.mean;

    return value > baselineValue * multiplier;
  }

  /**
   * Evaluate web vital condition
   */
  private evaluateWebVital(
    condition: AlertCondition,
    metric: string,
    value: number,
  ): boolean {
    if (condition.metric && condition.metric !== metric) return false;

    const threshold = condition.threshold ?? 0;
    return value > threshold;
  }

  /**
   * Evaluate error rate condition
   */
  private evaluateErrorRate(
    condition: AlertCondition,
    metric: string,
    value: number,
  ): boolean {
    const threshold = condition.threshold ?? 0;
    return value > threshold;
  }

  /**
   * Evaluate API latency condition
   */
  private evaluateApiLatency(
    condition: AlertCondition,
    metric: string,
    value: number,
  ): boolean {
    const threshold = condition.threshold ?? 0;
    return value > threshold;
  }

  /**
   * Create an alert
   */
  private async createAlert(
    rule: AlertRule,
    metric: string,
    value: number,
    context?: Record<string, unknown>,
  ): Promise<Alert | null> {
    const now = Date.now();

    // Check cooldown
    const lastTrigger = this.lastTriggerTime.get(rule.id) || 0;
    if (now - lastTrigger < rule.cooldown * 1000) {
      return null;
    }

    // Check suppression
    if (await this.shouldSuppress(rule, metric, value)) {
      return null;
    }

    // Check maintenance window
    if (this.isInMaintenanceWindow()) {
      return null;
    }

    const fingerprint = this.generateFingerprint(rule, metric, context);

    // Check for existing alert with same fingerprint
    const existingAlert = Array.from(this.alerts.values()).find(
      (a) => a.fingerprint === fingerprint && a.status === "firing",
    );

    if (existingAlert) {
      // Update existing alert
      existingAlert.value = value;
      existingAlert.context = context;
      return null;
    }

    const alert: Alert = {
      id: uuidv4(),
      ruleId: rule.id,
      ruleName: rule.name,
      priority: rule.priority,
      severity: rule.severity,
      status: "firing",
      metric,
      message: `${rule.name}: ${metric}=${value} (threshold: ${rule.condition.threshold})`,
      value,
      threshold: rule.condition.threshold ?? 0,
      timestamp: now,
      startedAt: now,
      context,
      labels: rule.labels,
      fingerprint,
    };

    // Store alert
    this.alerts.set(alert.id, alert);
    this.alertHistory.push(alert);
    this.lastTriggerTime.set(rule.id, now);

    // Send notifications
    await this.sendAlert(alert, rule);

    // Start escalation
    this.startEscalation(alert, rule);

    return alert;
  }

  /**
   * Check if alert should be suppressed
   */
  private async shouldSuppress(
    rule: AlertRule,
    metric: string,
    value: number,
  ): Promise<boolean> {
    const { suppression } = this.config;
    const now = Date.now();

    // Check max alerts in window
    const recentAlerts = this.alertHistory.filter(
      (a) => now - a.timestamp < suppression.windowMs,
    );

    if (recentAlerts.length >= suppression.maxAlerts) {
      return true;
    }

    // Check ignore patterns
    if (suppression.ignorePatterns) {
      for (const pattern of suppression.ignorePatterns) {
        if (metric.includes(pattern) || rule.name.includes(pattern)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Check if currently in maintenance window
   */
  private isInMaintenanceWindow(): boolean {
    const { maintenanceWindows } = this.config.suppression;
    if (!maintenanceWindows || maintenanceWindows.length === 0) return false;

    const now = new Date();

    for (const window of maintenanceWindows) {
      // Simple check: parse "Sunday 02:00 UTC" format
      // In production, use proper cron parser
      const parts = window.start.split(" ");
      const dayOfWeek = parts[0];
      const time = parts[1];

      const currentDay = now.toLocaleDateString("en-US", { weekday: "long" });
      const currentHour = now.getUTCHours();
      const windowHour = parseInt(time.split(":")[0]);

      if (currentDay === dayOfWeek && currentHour === windowHour) {
        return true;
      }
    }

    return false;
  }

  /**
   * Generate fingerprint for deduplication
   */
  private generateFingerprint(
    rule: AlertRule,
    metric: string,
    context?: Record<string, unknown>,
  ): string {
    const parts = [rule.id, metric];

    if (context?.endpoint) {
      parts.push(String(context.endpoint));
    }

    return parts.join(":");
  }

  /**
   * Send alert to configured channels
   */
  private async sendAlert(alert: Alert, rule: AlertRule): Promise<void> {
    const channelNames = rule.channels.length > 0
      ? rule.channels
      : this.config.defaultChannels;

    const results = await Promise.allSettled(
      channelNames.map(async (channelName) => {
        const channel = this.channels.get(channelName);
        if (channel) {
          return channel.send(alert);
        }
        console.warn(`[AlertEngine] Channel not found: ${channelName}`);
      }),
    );

    // Log failures
    results.forEach((result, index) => {
      if (result.status === "rejected") {
        console.error(
          `[AlertEngine] Failed to send to ${channelNames[index]}:`,
          result.reason,
        );
      }
    });
  }

  /**
   * Start escalation for an alert
   */
  private startEscalation(alert: Alert, rule: AlertRule): void {
    const policy = this.config.escalationPolicies.find(
      (p) => p.priority === rule.priority,
    );

    if (!policy) return;

    for (const step of policy.steps) {
      const delayMs = this.parseDuration(step.after);

      setTimeout(async () => {
        // Check if alert is still firing
        const currentAlert = this.alerts.get(alert.id);
        if (currentAlert?.status === "firing") {
          // Send escalation notification
          await this.sendEscalation(alert, step);
        }
      }, delayMs);
    }
  }

  /**
   * Send escalation notification
   */
  private async sendEscalation(
    alert: Alert,
    step: EscalationStep,
  ): Promise<void> {
    const escalationMessage = {
      ...alert,
      message: `[ESCALATION] ${alert.message}`,
      escalation_level: step.after,
    };

    for (const channelName of step.notify) {
      const channel = this.channels.get(channelName);
      if (channel) {
        await channel.send(escalationMessage as Alert);
      }
    }
  }

  /**
   * Parse duration string to milliseconds
   */
  private parseDuration(duration: string): number {
    const match = duration.match(/^(\d+)(m|h|s)$/);
    if (!match) return 0;

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case "s":
        return value * 1000;
      case "m":
        return value * 60 * 1000;
      case "h":
        return value * 60 * 60 * 1000;
      default:
        return 0;
    }
  }

  /**
   * Update trend data for a metric
   */
  updateTrendData(
    metric: string,
    value: number,
    timestamp: number = Date.now(),
  ): void {
    let trend = this.trendData.get(metric);

    if (!trend) {
      trend = { metric, values: [] };
      this.trendData.set(metric, trend);
    }

    trend.values.push({ timestamp, value });

    // Keep last 1000 values
    if (trend.values.length > 1000) {
      trend.values = trend.values.slice(-1000);
    }

    // Update baseline
    this.updateBaseline(metric);
  }

  /**
   * Update baseline statistics for a metric
   */
  private updateBaseline(metric: string): void {
    const trend = this.trendData.get(metric);
    if (!trend || trend.values.length < 10) return;

    const values = trend.values.map((v) => v.value);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    trend.baseline = {
      mean,
      stdDev,
      min: Math.min(...values),
      max: Math.max(...values),
    };
  }

  /**
   * Acknowledge an alert
   */
  acknowledge(alertId: string, acknowledgedBy: string): boolean {
    const alert = this.alerts.get(alertId);
    if (!alert) return false;

    alert.status = "acknowledged";
    alert.acknowledgedAt = Date.now();
    alert.acknowledgedBy = acknowledgedBy;

    return true;
  }

  /**
   * Resolve an alert
   */
  resolve(alertId: string): boolean {
    const alert = this.alerts.get(alertId);
    if (!alert) return false;

    alert.status = "resolved";
    alert.endedAt = Date.now();

    // Remove from active alerts
    this.alerts.delete(alertId);

    return true;
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(filter?: {
    priority?: AlertPriority;
    severity?: AlertSeverity;
    metric?: string;
  }): Alert[] {
    let alerts = Array.from(this.alerts.values()).filter((a) => a.status === "firing");

    if (filter) {
      if (filter.priority) {
        alerts = alerts.filter((a) => a.priority === filter.priority);
      }
      if (filter.severity) {
        alerts = alerts.filter((a) => a.severity === filter.severity);
      }
      if (filter.metric) {
        alerts = alerts.filter((a) => a.metric === filter.metric);
      }
    }

    return alerts.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Get alert by ID
   */
  getAlert(alertId: string): Alert | undefined {
    return this.alerts.get(alertId);
  }

  /**
   * Get alert history
   */
  getAlertHistory(timeWindowMs: number = 24 * 60 * 60 * 1000): Alert[] {
    const cutoff = Date.now() - timeWindowMs;
    return this.alertHistory
      .filter((a) => a.timestamp >= cutoff)
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Get alert summary
   */
  getSummary(): AlertSummary {
    const alerts = Array.from(this.alerts.values());

    const summary: AlertSummary = {
      firing: 0,
      resolved: 0,
      acknowledged: 0,
      suppressed: 0,
      byPriority: { P0: 0, P1: 0, P2: 0, P3: 0 },
      bySeverity: { info: 0, warning: 0, error: 0, critical: 0 },
    };

    for (const alert of alerts) {
      summary[alert.status as keyof typeof summary]++;
      summary.byPriority[alert.priority]++;
      summary.bySeverity[alert.severity]++;
    }

    return summary;
  }

  /**
   * Clear resolved alerts
   */
  clearResolved(maxAgeMs: number = 7 * 24 * 60 * 60 * 1000): number {
    const cutoff = Date.now() - maxAgeMs;
    const originalLength = this.alertHistory.length;

    this.alertHistory = this.alertHistory.filter(
      (a) => a.status !== "resolved" || a.timestamp >= cutoff,
    );

    return originalLength - this.alertHistory.length;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<AlertEngineConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get configuration
   */
  getConfig(): AlertEngineConfig {
    return { ...this.config };
  }

  /**
   * Reset engine state
   */
  reset(): void {
    this.alerts.clear();
    this.alertHistory = [];
    this.lastTriggerTime.clear();
    this.trendData.clear();
  }
}

// ============================================================================
// Alert Channel Interface
// ============================================================================

export interface AlertChannel {
  send(alert: Alert): Promise<void>;
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const alertEngine = new AlertEngine();
