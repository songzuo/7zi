/**
 * Performance Budget Alerts Integration
 * 性能预算告警集成
 *
 * Integrates budget checking with the PerformanceAlerter to trigger alerts
 * when performance metrics exceed budget thresholds.
 */

import { PerformanceAlerter, performanceAlerter } from '../alerting/alerter';
import { BudgetChecker, budgetChecker } from './budget-checker';
import {
  BudgetCheckResult,
  BudgetViolation,
  PageBudget,
} from './types';

/**
 * Alert level based on violation severity
 */
const SEVERITY_TO_LEVEL: Record<BudgetViolation['severity'], 'info' | 'warning' | 'error' | 'critical'> = {
  minor: 'info',
  major: 'warning',
  critical: 'critical',
};

/**
 * Budget Alert Configuration
 */
export interface BudgetAlertConfig {
  enabled: boolean;
  autoAlert: boolean; // Automatically send alerts on budget violation
  customAlertRules?: {
    metric: string;
    level: 'info' | 'warning' | 'error' | 'critical';
    thresholdPercent: number; // Custom threshold as percentage of budget
  }[];
  includeContext: boolean; // Include detailed context in alerts
  cooldownSeconds: number; // Minimum time between alerts for same metric
}

export const DEFAULT_BUDGET_ALERT_CONFIG: BudgetAlertConfig = {
  enabled: true,
  autoAlert: true,
  includeContext: true,
  cooldownSeconds: 300, // 5 minutes
};

/**
 * Budget Alert Manager
 * Integrates budget checking with alerting system
 */
export class BudgetAlertManager {
  private config: BudgetAlertConfig;
  private alerter: PerformanceAlerter;
  private budgetChecker: BudgetChecker;
  private lastAlertTime: Map<string, number> = new Map();

  constructor(
    config: Partial<BudgetAlertConfig> = {},
    alerter?: PerformanceAlerter,
    budgetChecker?: BudgetChecker
  ) {
    this.config = { ...DEFAULT_BUDGET_ALERT_CONFIG, ...config };
    this.alerter = alerter || performanceAlerter;
    this.budgetChecker = budgetChecker || budgetChecker;
  }

  /**
   * Check budget and send alerts if violations detected
   * 检查预算并发送告警
   */
  async checkAndAlert(
    page: string,
    metrics: Parameters<BudgetChecker['checkBudget']>[1],
    resources?: Parameters<BudgetChecker['checkBudget']>[2]
  ): Promise<{
    checkResult: BudgetCheckResult;
    alertsSent: number;
  }> {
    // Check budget
    const checkResult = this.budgetChecker.checkBudget(page, metrics, resources);

    if (!checkResult.passed && this.config.autoAlert) {
      let alertsSent = 0;

      // Send alerts for each violation
      for (const violation of checkResult.violations) {
        if (await this.shouldSendAlert(page, violation)) {
          await this.sendViolationAlert(page, violation, checkResult);
          alertsSent++;
        }
      }

      return { checkResult, alertsSent };
    }

    return { checkResult, alertsSent: 0 };
  }

  /**
   * Check if alert should be sent (respecting cooldown)
   * 检查是否应该发送告警（考虑冷却时间）
   */
  private async shouldSendAlert(page: string, violation: BudgetViolation): Promise<boolean> {
    if (!this.config.enabled) {
      return false;
    }

    const key = `${page}:${violation.metric}`;
    const now = Date.now();
    const lastAlert = this.lastAlertTime.get(key);

    if (lastAlert) {
      const elapsed = (now - lastAlert) / 1000;
      if (elapsed < this.config.cooldownSeconds) {
        return false;
      }
    }

    return true;
  }

  /**
   * Send violation alert
   * 发送违规告警
   */
  private async sendViolationAlert(
    page: string,
    violation: BudgetViolation,
    checkResult: BudgetCheckResult
  ): Promise<void> {
    const level = this.determineAlertLevel(violation);

    const context = this.config.includeContext
      ? {
          page,
          budgetScore: checkResult.score,
          totalViolations: checkResult.violations.length,
          allViolations: checkResult.violations.map((v) => ({
            metric: v.metric,
            severity: v.severity,
            percentOver: v.percentOver,
          })),
        }
      : undefined;

    await this.alerter.createAlert({
      level,
      title: `Budget Violation: ${violation.metric} on ${page}`,
      message: `${violation.metric} exceeded budget: ${violation.actual} > ${violation.threshold} (${violation.percentOver.toFixed(1)}% over)`,
      metric: violation.metric,
      value: violation.actual,
      threshold: violation.threshold,
      context,
    });

    // Update last alert time
    const key = `${page}:${violation.metric}`;
    this.lastAlertTime.set(key, Date.now());
  }

  /**
   * Determine alert level based on violation severity and custom rules
   * 根据违规严重程度和自定义规则确定告警级别
   */
  private determineAlertLevel(violation: BudgetViolation): 'info' | 'warning' | 'error' | 'critical' {
    // Check custom rules first
    if (this.config.customAlertRules) {
      const customRule = this.config.customAlertRules.find(
        (rule) => rule.metric === violation.metric
      );
      if (customRule) {
        const threshold = violation.budget * (1 + customRule.thresholdPercent);
        if (violation.actual > threshold) {
          return customRule.level;
        }
      }
    }

    // Use severity mapping
    return SEVERITY_TO_LEVEL[violation.severity];
  }

  /**
   * Check multiple pages and alert on violations
   * 检查多个页面并在违规时告警
   */
  async checkMultiplePagesAndAlert(
    pages: Array<{
      path: string;
      metrics: Parameters<BudgetChecker['checkBudget']>[1];
      resources?: Parameters<BudgetChecker['checkBudget']>[2];
    }>
  ): Promise<{
    results: Map<string, { checkResult: BudgetCheckResult; alertsSent: number }>;
    totalAlertsSent: number;
  }> {
    const results = new Map();
    let totalAlertsSent = 0;

    for (const page of pages) {
      const result = await this.checkAndAlert(page.path, page.metrics, page.resources);
      results.set(page.path, result);
      totalAlertsSent += result.alertsSent;
    }

    return { results, totalAlertsSent };
  }

  /**
   * Create a summary alert for multiple budget violations
   * 为多个预算违规创建摘要告警
   */
  async createSummaryAlert(
    violations: Array<{ page: string; violation: BudgetViolation }>
  ): Promise<void> {
    if (violations.length === 0) return;

    const severityCounts = violations.reduce((acc, v) => {
      acc[v.violation.severity] = (acc[v.violation.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const worstSeverity =
      violations.some((v) => v.violation.severity === 'critical')
        ? 'critical'
        : violations.some((v) => v.violation.severity === 'major')
          ? 'error'
          : 'warning';

    const message = [
      `Performance budget violations detected across ${violations.length} metrics:`,
      `Critical: ${severityCounts.critical || 0}`,
      `Major: ${severityCounts.major || 0}`,
      `Minor: ${severityCounts.minor || 0}`,
    ].join('\n');

    await this.alerter.createAlert({
      level: worstSeverity,
      title: `Budget Violation Summary: ${violations.length} metrics`,
      message,
      metric: 'budget-summary',
      value: violations.length,
      threshold: 0,
      context: {
        violations: violations.map((v) => ({
          page: v.page,
          metric: v.violation.metric,
          actual: v.violation.actual,
          budget: v.violation.budget,
          percentOver: v.violation.percentOver,
        })),
      },
    });
  }

  /**
   * Register budget-based alert rules
   * 注册基于预算的告警规则
   */
  registerBudgetAlertRules(): void {
    // Register rules for all metrics in budgets
    const summary = this.budgetChecker.getBudgetSummary();

    for (const budget of summary.budgets) {
      for (const timing of budget.timings) {
        // Add rule for metric threshold
        const threshold = timing.budget * (1 + timing.tolerance);

        this.alerter.addRule({
          id: `budget-${budget.path}-${timing.metric}`,
          name: `Budget Alert: ${timing.metric} on ${budget.path}`,
          description: `Alert when ${timing.metric} exceeds budget of ${timing.budget}${timing.unit}`,
          enabled: true,
          metric: timing.metric,
          condition: {
            operator: '>',
            value: threshold,
          },
          level: 'warning',
          channels: ['dashboard'],
          cooldown: this.config.cooldownSeconds,
          aggregation: {
            enabled: true,
            window: 300,
            maxAlerts: 5,
          },
        });
      }
    }
  }

  /**
   * Get last alert time for a page and metric
   * 获取页面和指标的最后告警时间
   */
  getLastAlertTime(page: string, metric: string): number | undefined {
    return this.lastAlertTime.get(`${page}:${metric}`);
  }

  /**
   * Clear alert cooldown for a page and metric
   * 清除页面和指标的告警冷却时间
   */
  clearCooldown(page: string, metric: string): void {
    this.lastAlertTime.delete(`${page}:${metric}`);
  }

  /**
   * Clear all alert cooldowns
   * 清除所有告警冷却时间
   */
  clearAllCooldowns(): void {
    this.lastAlertTime.clear();
  }

  /**
   * Update configuration
   * 更新配置
   */
  updateConfig(partialConfig: Partial<BudgetAlertConfig>): void {
    this.config = { ...this.config, ...partialConfig };
  }

  /**
   * Get current configuration
   * 获取当前配置
   */
  getConfig(): BudgetAlertConfig {
    return { ...this.config };
  }

  /**
   * Reset state
   * 重置状态
   */
  reset(): void {
    this.lastAlertTime.clear();
  }
}

// Export singleton instance
export const budgetAlertManager = new BudgetAlertManager();
