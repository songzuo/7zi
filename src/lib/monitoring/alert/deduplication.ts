/**
 * Alert Deduplication and Aggregation Module
 * 告警去重和聚合
 */

import type { AlertSeverity } from "./index";

// ========================================
// Types
// ========================================

export interface AlertContext {
  title: string;
  message: string;
  severity: AlertSeverity;
  metric?: string;
  source?: string;
  tags?: string[];
  fingerprint?: string; // 自定义指纹，用于更精确的去重
}

export interface DeduplicationKey {
  title: string;
  message: string;
  severity: AlertSeverity;
  fingerprint?: string;
}

export interface DeduplicationEntry {
  key: string;
  count: number;
  firstSeen: number;
  lastSeen: number;
  lastAlert: AlertContext;
  suppressed: boolean;
  suppressionReason?: string;
}

export interface AggregationWindow {
  alerts: AlertContext[];
  windowStart: number;
  windowEnd: number;
}

export interface AggregationGroup {
  key: string;
  alerts: AlertContext[];
  count: number;
  firstSeen: number;
  lastSeen: number;
  severity: AlertSeverity; // 使用最高严重级别
  commonTags: string[];
}

export interface AggregatedAlert {
  title: string;
  message: string;
  severity: AlertSeverity;
  count: number;
  firstSeen: number;
  lastSeen: number;
  alerts: AlertContext[];
  commonTags: string[];
  summary: string;
}

// ========================================
// Alert Deduplicator
// ========================================

export interface DeduplicatorConfig {
  ttl: number; // 时间窗口，默认1小时
  cooldown: number; // 冷却时间，默认5分钟
  maxCacheSize: number; // 最大缓存条目数
  generateFingerprint?: (context: AlertContext) => string | undefined;
}

export class AlertDeduplicator {
  private cache: Map<string, DeduplicationEntry>;
  private config: DeduplicatorConfig;

  constructor(config?: Partial<DeduplicatorConfig>) {
    this.config = {
      ttl: 3600000, // 1 hour
      cooldown: 300000, // 5 minutes
      maxCacheSize: 10000,
      ...config,
    };
    this.cache = new Map();
  }

  /**
   * 检查告警是否应该发送（未去重）
   */
  shouldSend(context: AlertContext): {
    shouldSend: boolean;
    reason?: string;
    entry?: DeduplicationEntry;
  } {
    const now = Date.now();
    const key = this.generateKey(context);
    const fingerprint = this.config.generateFingerprint
      ? this.config.generateFingerprint(context)
      : undefined;

    const dedupKey = fingerprint ? `${key}:${fingerprint}` : key;
    const existing = this.cache.get(dedupKey);

    // 清理过期条目
    this.cleanupExpired(now);

    // 检查缓存大小
    if (this.cache.size >= this.config.maxCacheSize) {
      this.cleanupOldest();
    }

    if (!existing) {
      // 首次出现，创建新条目
      const entry: DeduplicationEntry = {
        key: dedupKey,
        count: 1,
        firstSeen: now,
        lastSeen: now,
        lastAlert: context,
        suppressed: false,
      };
      this.cache.set(dedupKey, entry);
      return { shouldSend: true };
    }

    // 检查是否在冷却期
    const timeSinceLastSeen = now - existing.lastSeen;
    if (timeSinceLastSeen < this.config.cooldown) {
      existing.count++;
      existing.lastSeen = now;
      existing.lastAlert = context;
      existing.suppressed = true;
      existing.suppressionReason = `In cooldown: ${timeSinceLastSeen}ms < ${this.config.cooldown}ms`;
      return {
        shouldSend: false,
        reason: existing.suppressionReason,
        entry: existing,
      };
    }

    // 检查是否过期
    if (now - existing.firstSeen > this.config.ttl) {
      // 过期，重置
      const newEntry: DeduplicationEntry = {
        key: dedupKey,
        count: 1,
        firstSeen: now,
        lastSeen: now,
        lastAlert: context,
        suppressed: false,
      };
      this.cache.set(dedupKey, newEntry);
      return { shouldSend: true };
    }

    // 冷却期已过，允许发送
    existing.count++;
    existing.lastSeen = now;
    existing.lastAlert = context;
    existing.suppressed = false;

    return { shouldSend: true, entry: existing };
  }

  /**
   * 强制重置某个key的冷却时间
   */
  resetCooldown(context: AlertContext): void {
    const key = this.generateKey(context);
    const fingerprint = this.config.generateFingerprint
      ? this.config.generateFingerprint(context)
      : undefined;
    const dedupKey = fingerprint ? `${key}:${fingerprint}` : key;

    const existing = this.cache.get(dedupKey);
    if (existing) {
      existing.lastSeen = Date.now();
    }
  }

  /**
   * 获取去重统计
   */
  getStats(): {
    totalEntries: number;
    totalSuppressions: number;
    bySeverity: Record<AlertSeverity, number>;
    topAlerts: Array<{ key: string; count: number; title: string }>;
  } {
    const bySeverity: Record<AlertSeverity, number> = {
      p0: 0,
      p1: 0,
      p2: 0,
      p3: 0,
    };

    const allAlerts: Array<{ key: string; count: number; title: string; severity: AlertSeverity }> = [];

    for (const entry of this.cache.values()) {
      bySeverity[entry.lastAlert.severity] += entry.count;
      allAlerts.push({
        key: entry.key,
        count: entry.count,
        title: entry.lastAlert.title,
        severity: entry.lastAlert.severity,
      });
    }

    // 获取触发最多的告警
    const topAlerts = allAlerts
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalEntries: this.cache.size,
      totalSuppressions: Array.from(this.cache.values())
        .filter((e) => e.suppressed)
        .reduce((sum, e) => sum + (e.count - 1), 0),
      bySeverity,
      topAlerts,
    };
  }

  /**
   * 获取所有条目
   */
  getAllEntries(): DeduplicationEntry[] {
    return Array.from(this.cache.values());
  }

  /**
   * 获取特定条目
   */
  getEntry(context: AlertContext): DeduplicationEntry | undefined {
    const key = this.generateKey(context);
    const fingerprint = this.config.generateFingerprint
      ? this.config.generateFingerprint(context)
      : undefined;
    const dedupKey = fingerprint ? `${key}:${fingerprint}` : key;

    return this.cache.get(dedupKey);
  }

  /**
   * 清除过期条目
   */
  cleanupExpired(now?: number): number {
    const currentTime = now || Date.now();
    const cutoff = currentTime - this.config.ttl;
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.firstSeen < cutoff) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * 清除所有条目
   */
  clearAll(): void {
    this.cache.clear();
  }

  /**
   * 清除最旧的条目（LRU）
   */
  private cleanupOldest(): void {
    const entries = Array.from(this.cache.entries());
    entries.sort((a, b) => a[1].firstSeen - b[1].firstSeen);

    const toRemove = entries.slice(0, Math.ceil(this.config.maxCacheSize * 0.1));
    for (const [key] of toRemove) {
      this.cache.delete(key);
    }
  }

  /**
   * 生成去重key
   */
  private generateKey(context: AlertContext): string {
    // 使用 title、message、severity 生成key
    // 可以根据需要添加更多字段
    const normalizedTitle = context.title.trim().toLowerCase();
    const normalizedMessage = context.message.trim().toLowerCase();

    // 如果有指纹，优先使用
    if (context.fingerprint) {
      return `${context.fingerprint}:${context.severity}`;
    }

    // 基于标题、消息、严重级别生成key
    return `${normalizedTitle}:${normalizedMessage}:${context.severity}`;
  }
}

// ========================================
// Alert Aggregator
// ========================================

export interface AggregatorConfig {
  windowMs: number; // 聚合窗口时间
  maxAlertsInWindow: number; // 窗口内最大告警数
  groupByTags: boolean; // 是否按标签分组
  groupBySeverity: boolean; // 是否按严重级别分组
  groupBySource: boolean; // 是否按来源分组
}

export class AlertAggregator {
  private alerts: AlertContext[] = [];
  private config: AggregatorConfig;

  constructor(config?: Partial<AggregatorConfig>) {
    this.config = {
      windowMs: 60000, // 1 minute
      maxAlertsInWindow: 1000,
      groupByTags: true,
      groupBySeverity: false,
      groupBySource: true,
      ...config,
    };
  }

  /**
   * 添加告警到聚合器
   */
  addAlert(context: AlertContext): void {
    this.alerts.push(context);
    this.trimAlerts();
  }

  /**
   * 获取聚合结果
   */
  getAggregatedAlerts(): AggregatedAlert[] {
    const groups = this.groupAlerts();
    return this.generateAggregatedAlerts(groups);
  }

  /**
   * 按条件分组告警
   */
  private groupAlerts(): Map<string, AggregationGroup> {
    const groups = new Map<string, AggregationGroup>();
    const now = Date.now();
    const cutoff = now - this.config.windowMs;

    // 过滤窗口内的告警
    const recentAlerts = this.alerts.filter((a) => {
      // 使用当前时间作为近似值，实际应用中需要从context获取timestamp
      return true;
    });

    for (const alert of recentAlerts) {
      const key = this.generateGroupKey(alert);
      const existing = groups.get(key);

      if (existing) {
        existing.alerts.push(alert);
        existing.count++;
        existing.lastSeen = now;

        // 更新最高严重级别
        if (this.compareSeverity(alert.severity, existing.severity) > 0) {
          existing.severity = alert.severity;
        }

        // 合并标签
        for (const tag of alert.tags || []) {
          if (!existing.commonTags.includes(tag)) {
            existing.commonTags.push(tag);
          }
        }
      } else {
        groups.set(key, {
          key,
          alerts: [alert],
          count: 1,
          firstSeen: now,
          lastSeen: now,
          severity: alert.severity,
          commonTags: alert.tags || [],
        });
      }
    }

    return groups;
  }

  /**
   * 生成分组key
   */
  private generateGroupKey(alert: AlertContext): string {
    const parts: string[] = [];

    if (this.config.groupBySeverity) {
      parts.push(alert.severity);
    }

    if (this.config.groupBySource && alert.source) {
      parts.push(alert.source);
    }

    if (this.config.groupByTags && alert.tags && alert.tags.length > 0) {
      parts.push(alert.tags.sort().join(","));
    }

    // 默认按标题分组
    if (parts.length === 0) {
      parts.push(alert.title);
    }

    return parts.join("::");
  }

  /**
   * 比较严重级别
   */
  private compareSeverity(
    a: AlertSeverity,
    b: AlertSeverity,
  ): number {
    const severityOrder: Record<AlertSeverity, number> = {
      p0: 0,
      p1: 1,
      p2: 2,
      p3: 3,
    };
    return severityOrder[b] - severityOrder[a];
  }

  /**
   * 生成聚合告警
   */
  private generateAggregatedAlerts(
    groups: Map<string, AggregationGroup>,
  ): AggregatedAlert[] {
    const aggregatedAlerts: AggregatedAlert[] = [];

    for (const group of groups.values()) {
      // 只聚合数量大于1的告警
      if (group.count <= 1) {
        continue;
      }

      const alert = group.alerts[group.alerts.length - 1];

      aggregatedAlerts.push({
        title: `${alert.title} (${group.count} alerts)`,
        message: `Aggregated ${group.count} similar alerts`,
        severity: group.severity,
        count: group.count,
        firstSeen: group.firstSeen,
        lastSeen: group.lastSeen,
        alerts: group.alerts,
        commonTags: group.commonTags,
        summary: this.generateSummary(group),
      });
    }

    // 按严重级别和数量排序
    return aggregatedAlerts.sort((a, b) => {
      const severityDiff = this.compareSeverity(a.severity, b.severity);
      if (severityDiff !== 0) {
        return severityDiff;
      }
      return b.count - a.count;
    });
  }

  /**
   * 生成聚合摘要
   */
  private generateSummary(group: AggregationGroup): string {
    const lines: string[] = [];

    lines.push(`Total alerts: ${group.count}`);
    lines.push(`Severity: ${group.severity}`);
    lines.push(`Window: ${this.config.windowMs}ms`);

    if (group.commonTags.length > 0) {
      lines.push(`Tags: ${group.commonTags.join(", ")}`);
    }

    // 显示一些示例
    const sampleAlerts = group.alerts.slice(0, 3);
    if (sampleAlerts.length > 1) {
      lines.push("\nSample alerts:");
      for (const alert of sampleAlerts) {
        lines.push(`- ${alert.title}`);
      }
      if (group.alerts.length > 3) {
        lines.push(`... and ${group.alerts.length - 3} more`);
      }
    }

    return lines.join("\n");
  }

  /**
   * 聚合到指定渠道
   */
  getAggregationForChannels(): Map<
    AlertSeverity,
    AggregatedAlert[]
  > {
    const aggregatedAlerts = this.getAggregatedAlerts();
    const bySeverity = new Map<AlertSeverity, AggregatedAlert[]>();

    for (const alert of aggregatedAlerts) {
      const existing = bySeverity.get(alert.severity) || [];
      existing.push(alert);
      bySeverity.set(alert.severity, existing);
    }

    return bySeverity;
  }

  /**
   * 获取窗口内告警数
   */
  getCount(): number {
    return this.alerts.length;
  }

  /**
   * 按严重级别统计
   */
  getCountBySeverity(): Record<AlertSeverity, number> {
    const counts: Record<AlertSeverity, number> = {
      p0: 0,
      p1: 0,
      p2: 0,
      p3: 0,
    };

    for (const alert of this.alerts) {
      counts[alert.severity]++;
    }

    return counts;
  }

  /**
   * 清除旧告警
   */
  private trimAlerts(): void {
    const cutoff = Date.now() - this.config.windowMs;

    // 移除窗口外的告警
    // 注意：这里假设alert有timestamp字段，实际应用中需要从context获取
    this.alerts = this.alerts.slice(-this.config.maxAlertsInWindow);
  }

  /**
   * 清除所有告警
   */
  clearAll(): void {
    this.alerts = [];
  }
}

// ========================================
// Alert Manager Integration
// ========================================

export interface AlertDeduplicationManagerConfig {
  deduplicator?: Partial<DeduplicatorConfig>;
  aggregator?: Partial<AggregatorConfig>;
}

export class AlertDeduplicationManager {
  private deduplicator: AlertDeduplicator;
  private aggregator: AlertAggregator;

  constructor(config?: AlertDeduplicationManagerConfig) {
    this.deduplicator = new AlertDeduplicator(config?.deduplicator);
    this.aggregator = new AlertAggregator(config?.aggregator);
  }

  /**
   * 处理告警（去重 + 聚合）
   */
  processAlert(context: AlertContext): {
    shouldSend: boolean;
    reason?: string;
    deduplicationEntry?: DeduplicationEntry;
  } {
    // 添加到聚合器
    this.aggregator.addAlert(context);

    // 检查去重
    return this.deduplicator.shouldSend(context);
  }

  /**
   * 获取聚合告警
   */
  getAggregatedAlerts(): AggregatedAlert[] {
    return this.aggregator.getAggregatedAlerts();
  }

  /**
   * 获取聚合告警（按严重级别分组）
   */
  getAggregationForChannels(): Map<
    AlertSeverity,
    AggregatedAlert[]
  > {
    return this.aggregator.getAggregationForChannels();
  }

  /**
   * 获取去重统计
   */
  getDeduplicationStats() {
    return this.deduplicator.getStats();
  }

  /**
   * 获取聚合统计
   */
  getAggregationStats(): {
    totalAlerts: number;
    bySeverity: Record<AlertSeverity, number>;
    aggregationCount: number;
  } {
    return {
      totalAlerts: this.aggregator.getCount(),
      bySeverity: this.aggregator.getCountBySeverity(),
      aggregationCount: this.aggregator.getAggregatedAlerts().length,
    };
  }

  /**
   * 获取完整统计
   */
  getFullStats(): {
    deduplication: ReturnType<AlertDeduplicator["getStats"]>;
    aggregation: ReturnType<AlertDeduplicationManager["getAggregationStats"]>;
  } {
    return {
      deduplication: this.getDeduplicationStats(),
      aggregation: this.getAggregationStats(),
    };
  }

  /**
   * 重置冷却时间
   */
  resetCooldown(context: AlertContext): void {
    this.deduplicator.resetCooldown(context);
  }

  /**
   * 清除过期数据
   */
  cleanup(): void {
    this.deduplicator.cleanupExpired();
  }

  /**
   * 清除所有数据
   */
  clearAll(): void {
    this.deduplicator.clearAll();
    this.aggregator.clearAll();
  }
}

// ========================================
// Export
// ========================================

export default AlertDeduplicationManager;
