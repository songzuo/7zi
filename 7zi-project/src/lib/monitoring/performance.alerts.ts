/**
 * Performance Alert Manager
 * 性能告警管理器
 * 
 * 功能：
 * - 告警聚合与去重
 * - 静默期管理
 * - 多渠道通知
 * - 告警历史记录
 */

import { ALERT_CONFIG, type AlertLevel } from './performance.config';
import type { PerformanceAlert } from './performance.monitor';

// ============================================
// 类型定义
// ============================================

interface AlertRecord {
  alert: PerformanceAlert;
  count: number;
  firstSeen: number;
  lastSeen: number;
  silenced: boolean;
}

interface AlertRule {
  name: string;
  condition: (alert: PerformanceAlert) => boolean;
  action: (alert: PerformanceAlert) => void;
}

// ============================================
// 告警管理器
// ============================================

class PerformanceAlertManager {
  private alertHistory: Map<string, AlertRecord> = new Map();
  private rules: AlertRule[] = [];
  private silencePeriods: Map<string, number> = new Map();
  private maxHistorySize = 1000;

  /**
   * 处理告警
   */
  processAlert(alert: PerformanceAlert): void {
    const key = this.getAlertKey(alert);
    const existing = this.alertHistory.get(key);
    const now = Date.now();

    if (existing) {
      // 更新现有记录
      existing.count++;
      existing.lastSeen = now;

      // 检查是否在静默期
      if (this.isSilenced(key)) {
        existing.silenced = true;
        return;
      }
    } else {
      // 创建新记录
      this.alertHistory.set(key, {
        alert,
        count: 1,
        firstSeen: now,
        lastSeen: now,
        silenced: false,
      });

      // 限制历史大小
      if (this.alertHistory.size > this.maxHistorySize) {
        this.cleanupOldRecords();
      }
    }

    // 应用告警规则
    this.applyRules(alert);

    // 设置静默期
    this.setSilencePeriod(key, alert.level);
  }

  /**
   * 获取告警键
   */
  private getAlertKey(alert: PerformanceAlert): string {
    return `${alert.level}:${alert.metricName}:${alert.route || 'global'}`;
  }

  /**
   * 检查是否在静默期
   */
  private isSilenced(key: string): boolean {
    const silencedUntil = this.silencePeriods.get(key);
    if (!silencedUntil) return false;

    if (Date.now() < silencedUntil) {
      return true;
    }

    // 静默期已过，清除
    this.silencePeriods.delete(key);
    return false;
  }

  /**
   * 设置静默期
   */
  private setSilencePeriod(key: string, level: AlertLevel): void {
    const silenceMs = ALERT_CONFIG.rules.coreWebVitals.sustainedIssue.windowMs;
    const levelSilence = ALERT_CONFIG.rules.silencePeriod[level as keyof typeof ALERT_CONFIG.rules.silencePeriod];
    
    this.silencePeriods.set(key, Date.now() + (levelSilence || silenceMs));
  }

  /**
   * 应用告警规则
   */
  private applyRules(alert: PerformanceAlert): void {
    this.rules.forEach((rule) => {
      if (rule.condition(alert)) {
        rule.action(alert);
      }
    });
  }

  /**
   * 清理旧记录
   */
  private cleanupOldRecords(): void {
    const cutoff = Date.now() - 3600000; // 1小时前
    const keysToDelete: string[] = [];

    this.alertHistory.forEach((record, key) => {
      if (record.lastSeen < cutoff) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach((key) => this.alertHistory.delete(key));
  }

  /**
   * 添加告警规则
   */
  addRule(rule: AlertRule): void {
    this.rules.push(rule);
  }

  /**
   * 获取告警历史
   */
  getHistory(options?: {
    level?: AlertLevel;
    metricName?: string;
    since?: number;
  }): AlertRecord[] {
    let records = Array.from(this.alertHistory.values());

    if (options?.level) {
      records = records.filter((r) => r.alert.level === options.level);
    }

    if (options?.metricName) {
      records = records.filter((r) => r.alert.metricName === options.metricName);
    }

    if (options?.since) {
      records = records.filter((r) => r.firstSeen >= (options.since ?? 0));
    }

    return records.sort((a, b) => b.lastSeen - a.lastSeen);
  }

  /**
   * 获取告警统计
   */
  getStats(since?: number): {
    total: number;
    byLevel: Record<AlertLevel, number>;
    byMetric: Record<string, number>;
    topRoutes: Array<{ route: string; count: number }>;
  } {
    const records = this.getHistory({ since });
    
    const stats = {
      total: records.length,
      byLevel: { info: 0, warning: 0, critical: 0 } as Record<AlertLevel, number>,
      byMetric: {} as Record<string, number>,
      topRoutes: [] as Array<{ route: string; count: number }>,
    };

    const routeCounts = new Map<string, number>();

    records.forEach((record) => {
      // 按级别统计
      stats.byLevel[record.alert.level] += record.count;

      // 按指标统计
      const metric = record.alert.metricName;
      stats.byMetric[metric] = (stats.byMetric[metric] || 0) + record.count;

      // 按路由统计
      const route = record.alert.route || 'global';
      routeCounts.set(route, (routeCounts.get(route) || 0) + record.count);
    });

    // 获取 top 10 路由
    stats.topRoutes = Array.from(routeCounts.entries())
      .map(([route, count]) => ({ route, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return stats;
  }

  /**
   * 清除历史
   */
  clearHistory(): void {
    this.alertHistory.clear();
    this.silencePeriods.clear();
  }

  /**
   * 手动触发静默
   */
  silence(metricName: string, durationMs: number, route?: string): void {
    const key = `warning:${metricName}:${route || 'global'}`;
    const criticalKey = `critical:${metricName}:${route || 'global'}`;
    
    const until = Date.now() + durationMs;
    this.silencePeriods.set(key, until);
    this.silencePeriods.set(criticalKey, until);
  }

  /**
   * 取消静默
   */
  unsilence(metricName: string, route?: string): void {
    const key = `warning:${metricName}:${route || 'global'}`;
    const criticalKey = `critical:${metricName}:${route || 'global'}`;
    
    this.silencePeriods.delete(key);
    this.silencePeriods.delete(criticalKey);
  }
}

// ============================================
// 预定义规则
// ============================================

export const defaultAlertRules: AlertRule[] = [
  // 连续告警规则
  {
    name: 'sustained-issue',
    condition: (alert) => {
      // 由 alertManager 内部的 count 判断
      return alert.level === 'critical';
    },
    action: (alert) => {
      console.warn(`[Alert] Sustained performance issue: ${alert.metricName}`);
    },
  },

  // 严重告警即时通知
  {
    name: 'critical-immediate',
    condition: (alert) => alert.level === 'critical',
    action: (alert) => {
      // 可以集成 Slack/Email 通知
      console.error(`[Alert] CRITICAL: ${alert.message}`);
    },
  },
];

// ============================================
// 导出
// ============================================

export const performanceAlertManager = new PerformanceAlertManager();

// 初始化默认规则
defaultAlertRules.forEach((rule) => performanceAlertManager.addRule(rule));

export type { AlertRecord, AlertRule };
