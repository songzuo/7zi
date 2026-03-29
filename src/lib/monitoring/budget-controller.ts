/**
 * Performance Budget Controller
 * 性能预算控制器
 * 
 * 功能：
 * - 定义性能预算阈值（LCP < 2.5s, FID < 100ms, CLS < 0.1）
 * - 预算超限告警
 * - 生成预算报告
 */

import { performanceAlertManager } from './performance.alerts';
import { AlertSystem, type AlertConfig, type AlertSeverity } from './alerts';

// ========================================
// Types
// ========================================

export interface BudgetRule {
  id: string;
  name: string;
  metric: string;
  threshold: number;
  unit: 'ms' | 'score' | 'bytes' | 'count' | '%';
  comparison: 'lt' | 'lte' | 'gt' | 'gte'; // Less than, Less than or equal, etc.
  enabled: boolean;
  priority: 'p0' | 'p1' | 'p2' | 'p3';
  windowMs?: number; // Time window for averaging
  samples?: number; // Number of samples to consider
  tags?: string[];
  description?: string;
}

export interface BudgetCheckResult {
  rule: BudgetRule;
  passed: boolean;
  actualValue: number;
  threshold: number;
  deviation: number; // Percentage deviation from threshold
  severity: 'pass' | 'warning' | 'critical';
  timestamp: Date;
  samples: number;
}

export interface BudgetReport {
  timestamp: Date;
  period: { start: Date; end: Date };
  totalChecks: number;
  passedChecks: number;
  failedChecks: number;
  warningChecks: number;
  criticalChecks: number;
  passRate: number;
  results: BudgetCheckResult[];
  summary: BudgetSummary;
  recommendations: string[];
}

export interface BudgetSummary {
  overallStatus: 'healthy' | 'warning' | 'critical';
  topViolations: Array<{
    rule: string;
    violationCount: number;
    worstDeviation: number;
  }>;
  trends: Record<string, 'improving' | 'stable' | 'degrading'>;
  score: number; // 0-100
}

export interface BudgetViolationAlert {
  ruleId: string;
  ruleName: string;
  metric: string;
  actualValue: number;
  threshold: number;
  deviation: number;
  timestamp: Date;
  suppressed: boolean;
  suppressionReason?: string;
}

// ========================================
// Default Budget Rules
// ========================================

export const DEFAULT_BUDGET_RULES: BudgetRule[] = [
  // Core Web Vitals
  {
    id: 'lcp-warning',
    name: 'LCP Warning',
    metric: 'LCP',
    threshold: 2500,
    unit: 'ms',
    comparison: 'lte',
    enabled: true,
    priority: 'p2',
    description: 'Largest Contentful Paint should be ≤2.5s',
    tags: ['web-vitals', 'loading'],
  },
  {
    id: 'lcp-critical',
    name: 'LCP Critical',
    metric: 'LCP',
    threshold: 4000,
    unit: 'ms',
    comparison: 'lte',
    enabled: true,
    priority: 'p0',
    description: 'LCP critical threshold is 4s',
    tags: ['web-vitals', 'loading', 'critical'],
  },
  {
    id: 'fid-warning',
    name: 'FID Warning',
    metric: 'FID',
    threshold: 100,
    unit: 'ms',
    comparison: 'lte',
    enabled: true,
    priority: 'p2',
    description: 'First Input Delay should be ≤100ms',
    tags: ['web-vitals', 'interactivity'],
  },
  {
    id: 'fid-critical',
    name: 'FID Critical',
    metric: 'FID',
    threshold: 300,
    unit: 'ms',
    comparison: 'lte',
    enabled: true,
    priority: 'p0',
    description: 'FID critical threshold is 300ms',
    tags: ['web-vitals', 'interactivity', 'critical'],
  },
  {
    id: 'cls-warning',
    name: 'CLS Warning',
    metric: 'CLS',
    threshold: 0.1,
    unit: 'score',
    comparison: 'lte',
    enabled: true,
    priority: 'p2',
    description: 'Cumulative Layout Shift should be ≤0.1',
    tags: ['web-vitals', 'stability'],
  },
  {
    id: 'cls-critical',
    name: 'CLS Critical',
    metric: 'CLS',
    threshold: 0.25,
    unit: 'score',
    comparison: 'lte',
    enabled: true,
    priority: 'p0',
    description: 'CLS critical threshold is 0.25',
    tags: ['web-vitals', 'stability', 'critical'],
  },
  {
    id: 'ttfb-warning',
    name: 'TTFB Warning',
    metric: 'TTFB',
    threshold: 800,
    unit: 'ms',
    comparison: 'lte',
    enabled: true,
    priority: 'p2',
    description: 'Time to First Byte should be ≤800ms',
    tags: ['web-vitals', 'network'],
  },
  {
    id: 'ttfb-critical',
    name: 'TTFB Critical',
    metric: 'TTFB',
    threshold: 1800,
    unit: 'ms',
    comparison: 'lte',
    enabled: true,
    priority: 'p1',
    description: 'TTFB critical threshold is 1.8s',
    tags: ['web-vitals', 'network', 'critical'],
  },

  // Additional Performance Metrics
  {
    id: 'fcp-warning',
    name: 'FCP Warning',
    metric: 'FCP',
    threshold: 1800,
    unit: 'ms',
    comparison: 'lte',
    enabled: true,
    priority: 'p2',
    description: 'First Contentful Paint should be ≤1.8s',
    tags: ['loading', 'rendering'],
  },
  {
    id: 'fcp-critical',
    name: 'FCP Critical',
    metric: 'FCP',
    threshold: 3000,
    unit: 'ms',
    comparison: 'lte',
    enabled: true,
    priority: 'p1',
    description: 'FCP critical threshold is 3s',
    tags: ['loading', 'rendering', 'critical'],
  },
  {
    id: 'tti-warning',
    name: 'TTI Warning',
    metric: 'TTI',
    threshold: 3800,
    unit: 'ms',
    comparison: 'lte',
    enabled: true,
    priority: 'p2',
    description: 'Time to Interactive should be ≤3.8s',
    tags: ['interactivity', 'loading'],
  },
  {
    id: 'tti-critical',
    name: 'TTI Critical',
    metric: 'TTI',
    threshold: 7300,
    unit: 'ms',
    comparison: 'lte',
    enabled: true,
    priority: 'p1',
    description: 'TTI critical threshold is 7.3s',
    tags: ['interactivity', 'loading', 'critical'],
  },

  // Resource Budgets
  {
    id: 'transfer-size-warning',
    name: 'Transfer Size Warning',
    metric: 'totalTransferSize',
    threshold: 1024 * 1024,
    unit: 'bytes',
    comparison: 'lte',
    enabled: true,
    priority: 'p2',
    description: 'Total transfer size should be ≤1MB',
    tags: ['resources', 'network'],
  },
  {
    id: 'transfer-size-critical',
    name: 'Transfer Size Critical',
    metric: 'totalTransferSize',
    threshold: 2 * 1024 * 1024,
    unit: 'bytes',
    comparison: 'lte',
    enabled: true,
    priority: 'p1',
    description: 'Transfer size critical threshold is 2MB',
    tags: ['resources', 'network', 'critical'],
  },
  {
    id: 'request-count-warning',
    name: 'Request Count Warning',
    metric: 'requestCount',
    threshold: 50,
    unit: 'count',
    comparison: 'lte',
    enabled: true,
    priority: 'p2',
    description: 'Request count should be ≤50',
    tags: ['resources', 'network'],
  },
  {
    id: 'request-count-critical',
    name: 'Request Count Critical',
    metric: 'requestCount',
    threshold: 100,
    unit: 'count',
    comparison: 'lte',
    enabled: true,
    priority: 'p1',
    description: 'Request count critical threshold is 100',
    tags: ['resources', 'network', 'critical'],
  },
  {
    id: 'js-size-warning',
    name: 'JavaScript Size Warning',
    metric: 'jsSize',
    threshold: 250 * 1024,
    unit: 'bytes',
    comparison: 'lte',
    enabled: true,
    priority: 'p2',
    description: 'JavaScript size should be ≤250KB',
    tags: ['resources', 'bundle'],
  },
  {
    id: 'js-size-critical',
    name: 'JavaScript Size Critical',
    metric: 'jsSize',
    threshold: 500 * 1024,
    unit: 'bytes',
    comparison: 'lte',
    enabled: true,
    priority: 'p1',
    description: 'JavaScript size critical threshold is 500KB',
    tags: ['resources', 'bundle', 'critical'],
  },

  // Memory Budgets
  {
    id: 'memory-usage-warning',
    name: 'Memory Usage Warning',
    metric: 'memoryUsage',
    threshold: 70,
    unit: '%',
    comparison: 'lte',
    enabled: true,
    priority: 'p2',
    description: 'Memory usage should be ≤70%',
    tags: ['memory'],
  },
  {
    id: 'memory-usage-critical',
    name: 'Memory Usage Critical',
    metric: 'memoryUsage',
    threshold: 90,
    unit: '%',
    comparison: 'lte',
    enabled: true,
    priority: 'p0',
    description: 'Memory usage critical threshold is 90%',
    tags: ['memory', 'critical'],
  },
];

// ========================================
// Budget Controller Class
// ========================================

export class BudgetController {
  private rules: Map<string, BudgetRule>;
  private violationHistory: BudgetViolationAlert[] = [];
  private maxHistorySize = 1000;
  private suppressionRules: Map<string, SuppressionRule> = new Map();
  private alertSystem?: AlertSystem;

  constructor(config?: { alertSystem?: AlertSystem }) {
    this.rules = new Map();
    DEFAULT_BUDGET_RULES.forEach(rule => this.addRule(rule));
    
    if (config?.alertSystem) {
      this.alertSystem = config.alertSystem;
    }
  }

  /**
   * Add a budget rule
   */
  addRule(rule: BudgetRule): void {
    this.rules.set(rule.id, rule);
  }

  /**
   * Remove a budget rule
   */
  removeRule(ruleId: string): boolean {
    return this.rules.delete(ruleId);
  }

  /**
   * Get a rule
   */
  getRule(ruleId: string): BudgetRule | undefined {
    return this.rules.get(ruleId);
  }

  /**
   * Get all rules
   */
  getAllRules(): BudgetRule[] {
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
   * Check a single metric against all applicable rules
   */
  checkMetric(metricName: string, value: number): BudgetCheckResult[] {
    const results: BudgetCheckResult[] = [];

    for (const rule of this.rules.values()) {
      if (!rule.enabled || rule.metric !== metricName) continue;

      const result = this.evaluateRule(rule, value);
      results.push(result);

      // If rule failed, consider alerting
      if (!result.passed && result.severity !== 'pass') {
        this.handleViolation(result);
      }
    }

    return results;
  }

  /**
   * Check multiple metrics at once
   */
  checkMetrics(metrics: Record<string, number>): BudgetCheckResult[] {
    const results: BudgetCheckResult[] = [];

    for (const [metricName, value] of Object.entries(metrics)) {
      const metricResults = this.checkMetric(metricName, value);
      results.push(...metricResults);
    }

    return results;
  }

  /**
   * Generate a budget report for a period
   */
  generateReport(metrics?: Record<string, number>, period?: { start: Date; end: Date }): BudgetReport {
    const start = period?.start ?? new Date(Date.now() - 3600000); // Default: last hour
    const end = period?.end ?? new Date();
    
    const results = metrics ? this.checkMetrics(metrics) : [];
    
    const passedChecks = results.filter(r => r.passed).length;
    const warningChecks = results.filter(r => r.severity === 'warning').length;
    const criticalChecks = results.filter(r => r.severity === 'critical').length;
    const failedChecks = warningChecks + criticalChecks;

    const passRate = results.length > 0 
      ? (passedChecks / results.length) * 100 
      : 100;

    const summary = this.generateSummary(results);
    const recommendations = this.generateRecommendations(results, summary);

    return {
      timestamp: new Date(),
      period: { start, end },
      totalChecks: results.length,
      passedChecks,
      failedChecks,
      warningChecks,
      criticalChecks,
      passRate: Math.round(passRate),
      results,
      summary,
      recommendations,
    };
  }

  /**
   * Add a suppression rule
   */
  addSuppressionRule(rule: SuppressionRule): void {
    this.suppressionRules.set(rule.ruleId, rule);
  }

  /**
   * Remove a suppression rule
   */
  removeSuppressionRule(ruleId: string): boolean {
    return this.suppressionRules.delete(ruleId);
  }

  /**
   * Get violation history
   */
  getViolationHistory(limit = 100): BudgetViolationAlert[] {
    return this.violationHistory.slice(-limit);
  }

  /**
   * Clear violation history
   */
  clearViolationHistory(): void {
    this.violationHistory = [];
  }

  /**
   * Get violation statistics
   */
  getViolationStats(): Record<string, { count: number; lastSeen: Date; avgDeviation: number }> {
    const stats: Record<string, { count: number; lastSeen: Date; avgDeviation: number }> = {};

    for (const violation of this.violationHistory) {
      const key = violation.ruleId;
      if (!stats[key]) {
        stats[key] = {
          count: 0,
          lastSeen: new Date(0),
          avgDeviation: 0,
        };
      }

      stats[key].count++;
      stats[key].lastSeen = new Date(Math.max(stats[key].lastSeen.getTime(), violation.timestamp.getTime()));
      stats[key].avgDeviation = (stats[key].avgDeviation * (stats[key].count - 1) + violation.deviation) / stats[key].count;
    }

    return stats;
  }

  /**
   * Set alert system for sending budget violation alerts
   */
  setAlertSystem(alertSystem: AlertSystem): void {
    this.alertSystem = alertSystem;
  }

  // ========================================
  // Private Methods
  // ========================================

  private evaluateRule(rule: BudgetRule, value: number): BudgetCheckResult {
    let passed = false;

    switch (rule.comparison) {
      case 'lt':
        passed = value < rule.threshold;
        break;
      case 'lte':
        passed = value <= rule.threshold;
        break;
      case 'gt':
        passed = value > rule.threshold;
        break;
      case 'gte':
        passed = value >= rule.threshold;
        break;
    }

    const deviation = passed 
      ? 0 
      : Math.abs((value - rule.threshold) / rule.threshold) * 100;

    let severity: 'pass' | 'warning' | 'critical';
    if (passed) {
      severity = 'pass';
    } else if (rule.priority === 'p0' || rule.priority === 'p1') {
      severity = 'critical';
    } else {
      severity = 'warning';
    }

    return {
      rule,
      passed,
      actualValue: value,
      threshold: rule.threshold,
      deviation,
      severity,
      timestamp: new Date(),
      samples: 1,
    };
  }

  private handleViolation(result: BudgetCheckResult): void {
    const suppression = this.suppressionRules.get(result.rule.id);
    
    // Check if violation is suppressed
    if (suppression && this.isSuppressed(suppression, result)) {
      return;
    }

    const violation: BudgetViolationAlert = {
      ruleId: result.rule.id,
      ruleName: result.rule.name,
      metric: result.rule.metric,
      actualValue: result.actualValue,
      threshold: result.threshold,
      deviation: result.deviation,
      timestamp: result.timestamp,
      suppressed: false,
    };

    this.violationHistory.push(violation);
    this.trimHistory();

    // Send alert if configured
    if (this.alertSystem) {
      this.sendViolationAlert(violation, result);
    }
  }

  private isSuppressed(suppression: SuppressionRule, result: BudgetCheckResult): boolean {
    const now = Date.now();
    
    // Check if within suppression window
    if (now - suppression.since.getTime() < suppression.durationMs) {
      return true;
    }

    // Check max violations
    const recentViolations = this.violationHistory.filter(
      v => v.ruleId === suppression.ruleId && 
           now - v.timestamp.getTime() < suppression.durationMs
    );
    
    return recentViolations.length < suppression.maxViolations;
  }

  private async sendViolationAlert(
    violation: BudgetViolationAlert,
    result: BudgetCheckResult
  ): Promise<void> {
    const severity: AlertSeverity = result.severity === 'critical' ? 'p1' : 'p2';
    
    const alertConfig: AlertConfig = {
      severity,
      title: `Budget Violation: ${violation.ruleName}`,
      message: `${violation.metric} exceeded threshold by ${violation.deviation.toFixed(1)}%`,
      details: {
        Metric: violation.metric,
        'Actual Value': `${violation.actualValue} ${result.rule.unit}`,
        Threshold: `${violation.threshold} ${result.rule.unit}`,
        Deviation: `${violation.deviation.toFixed(1)}%`,
        Priority: result.rule.priority,
      },
      tags: result.rule.tags,
      timestamp: result.timestamp,
      deduplicationKey: `budget:${violation.ruleId}:${Math.floor(result.timestamp.getTime() / 300000)}`, // 5 min window
    };

    try {
      await this.alertSystem!.sendAlert(alertConfig);
    } catch (error) {
      console.error('Failed to send budget violation alert:', error);
    }
  }

  private trimHistory(): void {
    if (this.violationHistory.length > this.maxHistorySize) {
      this.violationHistory = this.violationHistory.slice(-this.maxHistorySize);
    }
  }

  private generateSummary(results: BudgetCheckResult[]): BudgetSummary {
    if (results.length === 0) {
      return {
        overallStatus: 'healthy',
        topViolations: [],
        trends: {},
        score: 100,
      };
    }

    const criticalCount = results.filter(r => r.severity === 'critical').length;
    const warningCount = results.filter(r => r.severity === 'warning').length;

    const overallStatus: 'healthy' | 'warning' | 'critical' = 
      criticalCount > 0 ? 'critical' : warningCount > 2 ? 'warning' : 'healthy';

    // Calculate top violations
    const violationsByRule = new Map<string, { count: number; worstDeviation: number }>();
    
    for (const result of results) {
      if (result.passed) continue;
      
      const existing = violationsByRule.get(result.rule.id);
      if (existing) {
        existing.count++;
        existing.worstDeviation = Math.max(existing.worstDeviation, result.deviation);
      } else {
        violationsByRule.set(result.rule.id, {
          count: 1,
          worstDeviation: result.deviation,
        });
      }
    }

    const topViolations = Array.from(violationsByRule.entries())
      .map(([ruleId, data]) => ({
        rule: this.rules.get(ruleId)?.name ?? ruleId,
        violationCount: data.count,
        worstDeviation: data.worstDeviation,
      }))
      .sort((a, b) => b.violationCount - a.violationCount)
      .slice(0, 5);

    // Calculate score
    const passRate = results.filter(r => r.passed).length / results.length;
    const penalty = (criticalCount * 20 + warningCount * 10);
    const score = Math.max(0, Math.round(passRate * 100 - penalty));

    return {
      overallStatus,
      topViolations,
      trends: this.calculateTrends(results),
      score,
    };
  }

  private calculateTrends(results: BudgetCheckResult[]): Record<string, 'improving' | 'stable' | 'degrading'> {
    const trends: Record<string, 'improving' | 'stable' | 'degrading'> = {};

    // Group by metric
    const byMetric = new Map<string, BudgetCheckResult[]>();
    for (const result of results) {
      const metric = result.rule.metric;
      if (!byMetric.has(metric)) {
        byMetric.set(metric, []);
      }
      byMetric.get(metric)!.push(result);
    }

    // Calculate trends for each metric
    for (const [metric, metricResults] of byMetric) {
      if (metricResults.length < 2) {
        trends[metric] = 'stable';
        continue;
      }

      // Simple trend calculation: compare average of first half vs second half
      const mid = Math.floor(metricResults.length / 2);
      const firstHalfAvg = metricResults.slice(0, mid)
        .reduce((sum, r) => sum + r.deviation, 0) / mid;
      const secondHalfAvg = metricResults.slice(mid)
        .reduce((sum, r) => sum + r.deviation, 0) / (metricResults.length - mid);

      const change = (secondHalfAvg - firstHalfAvg) / firstHalfAvg;

      if (change < -0.1) {
        trends[metric] = 'improving';
      } else if (change > 0.1) {
        trends[metric] = 'degrading';
      } else {
        trends[metric] = 'stable';
      }
    }

    return trends;
  }

  private generateRecommendations(
    results: BudgetCheckResult[],
    summary: BudgetSummary
  ): string[] {
    const recommendations: string[] = [];

    if (summary.overallStatus === 'critical') {
      recommendations.push('🚨 CRITICAL: Address violations immediately to prevent user impact');
    }

    if (summary.overallStatus === 'warning') {
      recommendations.push('⚠️ WARNING: Consider optimizing to improve user experience');
    }

    for (const violation of summary.topViolations) {
      const rule = Array.from(this.rules.values()).find(r => r.name === violation.rule);
      if (rule?.description) {
        recommendations.push(`• ${rule.description}`);
      }

      // Add specific recommendations based on metric
      switch (rule?.metric) {
        case 'LCP':
          recommendations.push('  → Optimize images, use CDN, reduce server response time');
          break;
        case 'FID':
          recommendations.push('  → Reduce JavaScript execution time, code split long tasks');
          break;
        case 'CLS':
          recommendations.push('  → Reserve space for dynamic content, use CSS transforms');
          break;
        case 'totalTransferSize':
          recommendations.push('  → Compress images, minify assets, enable text compression');
          break;
        case 'requestCount':
          recommendations.push('  → Bundle resources, use HTTP/2, combine CSS/JS');
          break;
        case 'jsSize':
          recommendations.push('  → Code split, tree shake, remove unused dependencies');
          break;
      }
    }

    return recommendations;
  }
}

// ========================================
// Types for Suppression
// ========================================

export interface SuppressionRule {
  ruleId: string;
  durationMs: number;
  maxViolations: number;
  since: Date;
  reason?: string;
}

// ========================================
// Export singleton instance
// ========================================

export const budgetController = new BudgetController();

export default BudgetController;

// ========================================
// Helper Functions
// ========================================

/**
 * Create a default budget controller with alert system
 */
export function createBudgetControllerWithAlerts(alertSystem: AlertSystem): BudgetController {
  return new BudgetController({ alertSystem });
}

/**
 * Convert budget results to format for UI display
 */
export function formatBudgetResultsForDisplay(results: BudgetCheckResult[]): Array<{
  rule: string;
  metric: string;
  status: 'pass' | 'warning' | 'critical';
  value: string;
  threshold: string;
  deviation: string;
  ariaLabel: string;
}> {
  return results.map(result => ({
    rule: result.rule.name,
    metric: result.rule.metric,
    status: result.severity,
    value: `${result.actualValue} ${result.rule.unit}`,
    threshold: `${result.threshold} ${result.rule.unit}`,
    deviation: result.deviation > 0 ? `${result.deviation.toFixed(1)}%` : 'N/A',
    ariaLabel: `${result.rule.name}: ${result.passed ? 'Passed' : 'Failed'}. Actual: ${result.actualValue} ${result.rule.unit}, Threshold: ${result.threshold} ${result.rule.unit}`,
  }));
}
