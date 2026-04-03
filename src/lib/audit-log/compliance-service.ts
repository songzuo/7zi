/**
 * 审计日志系统 - 合规服务
 * @module lib/audit-log/compliance-service
 * @version 1.10.0
 */

import type {
  AuditEvent,
  ComplianceReport,
  ComplianceReportConfig,
  ComplianceReportSummary,
  ComplianceReportType,
  AuditQueryFilter,
  AuditAggregationResult,
  AuditTrendResult,
} from './types.js';
import type { AuditLogStorage } from './types.js';
import { AuditAnalyticsService } from './analytics-service.js';

/**
 * 审计日志合规服务
 */
export class AuditComplianceService {
  private analyticsService: AuditAnalyticsService;

  constructor(private storage: AuditLogStorage) {
    this.analyticsService = new AuditAnalyticsService(storage);
  }

  /**
   * 生成合规报告
   */
  public async generateReport(config: ComplianceReportConfig): Promise<ComplianceReport> {
    const startTime = Date.now();

    // 获取事件
    const events = await this.getEventsForReport(config);

    // 生成摘要
    const summary = this.generateSummary(events, config);

    // 生成统计数据 (如果需要)
    let statistics: AuditAggregationResult[] | undefined;
    if (config.includeSummary) {
      statistics = await this.generateStatistics(config);
    }

    // 生成趋势数据 (如果需要)
    let trends: AuditTrendResult | undefined;
    if (config.includeCharts) {
      trends = await this.analyticsService.getTrends(config.timeRange, 'day');
    }

    const report: ComplianceReport = {
      id: this.generateReportId(),
      generatedAt: new Date(),
      config,
      summary,
      statistics,
      trends,
      events: config.includeDetails ? events : undefined,
    };

    console.info(`Compliance report generated in ${Date.now() - startTime}ms`);

    return report;
  }

  /**
   * 获取报告所需事件
   */
  private async getEventsForReport(
    config: ComplianceReportConfig
  ): Promise<AuditEvent[]> {
    const filter = this.buildFilterForReportType(config);

    const result = await this.storage.query({
      filter: { ...filter, ...config.filter, timeRange: config.timeRange },
      pagination: { page: 1, pageSize: 10000 },
    });

    return result.data;
  }

  /**
   * 根据报告类型构建过滤条件
   */
  private buildFilterForReportType(
    config: ComplianceReportConfig
  ): AuditQueryFilter {
    switch (config.type) {
      case 'user_access':
        return {
          categories: ['user'],
        };

      case 'permission_changes':
        return {
          categories: ['security'],
          actions: ['permission_grant', 'permission_revoke', 'role_assign', 'role_remove'],
        };

      case 'data_access':
        return {
          categories: ['data'],
        };

      case 'security_events':
        return {
          categories: ['security'],
          severities: ['high', 'critical'],
        };

      case 'admin_actions':
        return {
          categories: ['admin'],
        };

      case 'failed_operations':
        return {
          statuses: ['failure'],
        };

      case 'custom':
      default:
        return {};
    }
  }

  /**
   * 生成报告摘要
   */
  private generateSummary(
    events: AuditEvent[],
    config: ComplianceReportConfig
  ): ComplianceReportSummary {
    const uniqueUsers = new Set<string>();
    let successCount = 0;
    let failureCount = 0;
    const keyFindings: string[] = [];
    const riskFactors: string[] = [];

    // 统计
    for (const event of events) {
      if (event.user?.userId) {
        uniqueUsers.add(event.user.userId);
      }

      if (event.status === 'success') successCount++;
      else if (event.status === 'failure') failureCount++;
    }

    // 识别关键发现
    if (failureCount > successCount * 0.1) {
      keyFindings.push(`High failure rate: ${(failureCount / events.length * 100).toFixed(1)}%`);
      riskFactors.push('High failure rate detected');
    }

    // 检查安全事件
    const securityEvents = events.filter((e) => e.category === 'security');
    if (securityEvents.length > 0) {
      keyFindings.push(`${securityEvents.length} security events recorded`);
    }

    // 检查高严重程度事件
    const criticalEvents = events.filter((e) => e.severity === 'critical');
    if (criticalEvents.length > 0) {
      keyFindings.push(`${criticalEvents.length} critical severity events`);
      riskFactors.push('Critical severity events detected');
    }

    // 检查权限变更
    const permissionChanges = events.filter((e) =>
      ['permission_grant', 'permission_revoke', 'role_assign', 'role_remove'].includes(e.action)
    );
    if (permissionChanges.length > 10) {
      keyFindings.push(`${permissionChanges.length} permission changes`);
      riskFactors.push('Unusual number of permission changes');
    }

    // 风险评估
    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    if (riskFactors.length >= 2) {
      riskLevel = 'high';
    } else if (riskFactors.length === 1) {
      riskLevel = 'medium';
    }

    return {
      totalEvents: events.length,
      uniqueUsers: uniqueUsers.size,
      successCount,
      failureCount,
      keyFindings,
      riskAssessment: riskFactors.length > 0 ? {
        level: riskLevel,
        factors: riskFactors,
      } : undefined,
    };
  }

  /**
   * 生成统计数据
   */
  private async generateStatistics(
    config: ComplianceReportConfig
  ): Promise<AuditAggregationResult[]> {
    const statistics: AuditAggregationResult[] = [];

    // 按操作类型统计
    statistics.push(
      await this.analyticsService.aggregate({
        field: 'action',
        timeRange: config.timeRange,
        filter: config.filter,
        limit: 10,
      })
    );

    // 按用户统计
    statistics.push(
      await this.analyticsService.aggregate({
        field: 'user',
        timeRange: config.timeRange,
        filter: config.filter,
        limit: 10,
      })
    );

    // 按类别统计
    statistics.push(
      await this.analyticsService.aggregate({
        field: 'category',
        timeRange: config.timeRange,
        filter: config.filter,
      })
    );

    // 按状态统计
    statistics.push(
      await this.analyticsService.aggregate({
        field: 'status',
        timeRange: config.timeRange,
        filter: config.filter,
      })
    );

    return statistics;
  }

  /**
   * 生成报告ID
   */
  private generateReportId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 9);
    return `report_${timestamp}_${random}`;
  }

  /**
   * 导出报告为 JSON
   */
  public async exportAsJson(
    report: ComplianceReport,
    outputPath: string
  ): Promise<string> {
    const fs = await import('fs/promises');
    const path = await import('path');

    // 确保目录存在
    const dir = path.dirname(outputPath);
    await fs.mkdir(dir, { recursive: true });

    // 如果不包含敏感数据，进行脱敏
    const reportToExport = this.sanitizeReport(report);

    await fs.writeFile(outputPath, JSON.stringify(reportToExport, null, 2), 'utf8');
    return outputPath;
  }

  /**
   * 导出报告为 CSV
   */
  public async exportAsCsv(
    report: ComplianceReport,
    outputPath: string
  ): Promise<string> {
    const fs = await import('fs/promises');
    const path = await import('path');

    // 确保目录存在
    const dir = path.dirname(outputPath);
    await fs.mkdir(dir, { recursive: true });

    // 只导出事件列表
    if (!report.events || report.events.length === 0) {
      await fs.writeFile(outputPath, 'No events to export', 'utf8');
      return outputPath;
    }

    // 构建 CSV 内容
    const headers = [
      'ID',
      'Timestamp',
      'Level',
      'Category',
      'Action',
      'Status',
      'Severity',
      'Message',
      'User ID',
      'Username',
      'Resource Type',
      'Resource ID',
    ];

    const rows = report.events.map((event) => [
      event.id,
      new Date(event.timestamp).toISOString(),
      event.level,
      event.category,
      event.action,
      event.status,
      event.severity,
      `"${(event.message || '').replace(/"/g, '""')}"`,
      event.user?.userId || '',
      event.user?.username || '',
      event.resource?.type || '',
      event.resource?.id || '',
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    await fs.writeFile(outputPath, csv, 'utf8');

    return outputPath;
  }

  /**
   * 脱敏报告
   */
  private sanitizeReport(report: ComplianceReport): ComplianceReport {
    if (report.config.includeSensitive) {
      return report;
    }

    // 脱敏事件中的敏感数据
    if (report.events) {
      report.events = report.events.map((event) => ({
        ...event,
        user: event.user ? {
          ...event.user,
          email: event.user.email ? this.maskEmail(event.user.email) : undefined,
        } : undefined,
        details: event.details ? this.maskSensitiveFields(event.details) : undefined,
      }));
    }

    return report;
  }

  /**
   * 脱敏邮箱
   */
  private maskEmail(email: string): string {
    const parts = email.split('@');
    if (parts.length !== 2) return '***@***';

    const local = parts[0];
    const domain = parts[1];

    const maskedLocal = local.length > 2
      ? local[0] + '*'.repeat(local.length - 2) + local[local.length - 1]
      : '***';

    return `${maskedLocal}@${domain}`;
  }

  /**
   * 脱敏敏感字段
   */
  private maskSensitiveFields(obj: Record<string, unknown>): Record<string, unknown> {
    const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'privateKey'];
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      if (sensitiveFields.some((f) => key.toLowerCase().includes(f.toLowerCase()))) {
        result[key] = '***';
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        result[key] = this.maskSensitiveFields(value as Record<string, unknown>);
      } else {
        result[key] = value;
      }
    }

    return result;
  }

  /**
   * 生成预定义报告
   */
  public async generatePredefinedReport(
    type: ComplianceReportType,
    days: number = 30
  ): Promise<ComplianceReport> {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);

    const config: ComplianceReportConfig = {
      type,
      name: this.getReportName(type),
      timeRange: { start, end },
      includeSummary: true,
      includeDetails: true,
      includeCharts: true,
      format: 'json',
    };

    return this.generateReport(config);
  }

  /**
   * 获取报告名称
   */
  private getReportName(type: ComplianceReportType): string {
    const names: Record<ComplianceReportType, string> = {
      user_access: '用户访问审计报告',
      permission_changes: '权限变更审计报告',
      data_access: '数据访问审计报告',
      security_events: '安全事件审计报告',
      admin_actions: '管理操作审计报告',
      failed_operations: '失败操作审计报告',
      custom: '自定义审计报告',
    };

    return names[type];
  }
}