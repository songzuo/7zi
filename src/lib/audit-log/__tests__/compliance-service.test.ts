/**
 * 审计日志 - 合规服务单元测试
 * @module lib/audit-log/__tests__/compliance-service.test
 *
 * 覆盖报告生成、各报告类型的过滤语义、统计口径一致性、风险评估与导出脱敏。
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { AuditComplianceService } from '../compliance-service.js';
import { AuditEventBuilder } from '../event-builder.js';
import { MemoryAuditStorage } from '../storage/memory-storage.js';
import type { AuditEvent, ComplianceReportConfig } from '../types.js';

const RANGE = {
  start: new Date('2025-01-01T00:00:00.000Z'),
  end: new Date('2027-01-01T00:00:00.000Z'),
};

function makeEvent(overrides: Partial<AuditEvent> = {}): AuditEvent {
  const builder = new AuditEventBuilder()
    .withId(overrides.id ?? `evt-${Math.random().toString(36).slice(2)}`)
    .withTimestamp(overrides.timestamp ?? new Date('2026-01-01T00:00:00.000Z'))
    .withLevel(overrides.level ?? 'info')
    .withCategory(overrides.category ?? 'user')
    .withAction(overrides.action ?? 'create')
    .withStatus(overrides.status ?? 'success')
    .withSeverity(overrides.severity ?? 'low')
    .withMessage(overrides.message ?? 'Test event');

  if (overrides.user) builder.withUser(overrides.user);
  if (overrides.resource) builder.withResource(overrides.resource);
  if (overrides.details) builder.withDetails(overrides.details);

  return builder.build();
}

function baseConfig(overrides: Partial<ComplianceReportConfig> = {}): ComplianceReportConfig {
  return {
    type: 'custom',
    name: 'test-report',
    timeRange: RANGE,
    includeSummary: true,
    includeDetails: true,
    includeCharts: false,
    format: 'json',
    ...overrides,
  };
}

describe('AuditComplianceService', () => {
  let storage: MemoryAuditStorage;
  let service: AuditComplianceService;
  let tmpDir: string;

  beforeEach(async () => {
    storage = new MemoryAuditStorage();
    service = new AuditComplianceService(storage);
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'audit-compliance-'));

    // 用户访问事件
    await storage.write(
      makeEvent({
        id: 'u1',
        category: 'user',
        action: 'create',
        status: 'success',
        user: { userId: 'u1', username: 'john', email: 'john@example.com' },
      })
    );
    // 安全事件（high）
    await storage.write(
      makeEvent({
        id: 's1',
        category: 'security',
        action: 'login_failed',
        status: 'failure',
        level: 'warn',
        severity: 'high',
        user: { userId: 'u2', username: 'jane', email: 'jane@example.com' },
      })
    );
    // 安全事件（critical）
    await storage.write(
      makeEvent({
        id: 's2',
        category: 'security',
        action: 'permission_grant',
        status: 'success',
        severity: 'critical',
        level: 'critical',
        user: { userId: 'u3', username: 'bob' },
      })
    );
    // 管理操作
    await storage.write(
      makeEvent({
        id: 'a1',
        category: 'admin',
        action: 'config_change',
        status: 'success',
        user: { userId: 'u1', username: 'john' },
      })
    );
    // 数据访问
    await storage.write(
      makeEvent({
        id: 'd1',
        category: 'data',
        action: 'read',
        status: 'success',
        user: { userId: 'u1', username: 'john' },
      })
    );
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  describe('generateReport()', () => {
    it('应生成带 ID 与生成时间的报告', async () => {
      const report = await service.generateReport(baseConfig());

      expect(report.id).toMatch(/^report_/);
      expect(report.generatedAt).toBeInstanceOf(Date);
      expect(report.config.name).toBe('test-report');
    });

    it('includeDetails 为 true 时应带上事件列表', async () => {
      const report = await service.generateReport(
        baseConfig({ includeDetails: true })
      );

      expect(report.events).toBeDefined();
      expect(report.events?.length).toBe(5);
    });

    it('includeDetails 为 false 时不应带事件列表', async () => {
      const report = await service.generateReport(
        baseConfig({ includeDetails: false })
      );

      expect(report.events).toBeUndefined();
    });

    it('includeSummary 为 true 时应生成统计数组', async () => {
      const report = await service.generateReport(
        baseConfig({ includeSummary: true })
      );

      expect(report.statistics).toBeDefined();
      expect(report.statistics?.length).toBe(4);
      expect(report.statistics?.map((s) => s.field)).toEqual([
        'action',
        'user',
        'category',
        'status',
      ]);
    });

    it('includeSummary 为 false 时不应生成统计数组', async () => {
      const report = await service.generateReport(
        baseConfig({ includeSummary: false })
      );

      expect(report.statistics).toBeUndefined();
    });

    it('includeCharts 为 true 时应生成趋势数据', async () => {
      const report = await service.generateReport(
        baseConfig({ includeCharts: true })
      );

      expect(report.trends).toBeDefined();
      expect(report.trends?.interval).toBe('day');
      expect(report.trends?.points.length).toBeGreaterThan(0);
    });
  });

  describe('摘要统计', () => {
    it('应统计总数、唯一用户数与成功/失败数', async () => {
      const report = await service.generateReport(baseConfig());

      expect(report.summary.totalEvents).toBe(5);
      expect(report.summary.uniqueUsers).toBe(3);
      expect(report.summary.successCount).toBe(4);
      expect(report.summary.failureCount).toBe(1);
    });

    it('应识别安全事件数量', async () => {
      const report = await service.generateReport(baseConfig());

      expect(
        report.summary.keyFindings.some((f) =>
          f.includes('2 security events recorded')
        )
      ).toBe(true);
    });

    it('应识别 critical 严重程度事件', async () => {
      const report = await service.generateReport(baseConfig());

      expect(
        report.summary.keyFindings.some((f) =>
          f.includes('1 critical severity events')
        )
      ).toBe(true);
    });

    it('失败率过高时应给出高风险评估', async () => {
      const failStorage = new MemoryAuditStorage();
      for (let i = 0; i < 5; i++) {
        await failStorage.write(
          makeEvent({
            id: `f${i}`,
            status: 'failure',
            level: 'error',
            severity: 'critical',
            category: 'security',
            action: 'login_failed',
          })
        );
      }
      const failService = new AuditComplianceService(failStorage);

      const report = await failService.generateReport(baseConfig());

      expect(report.summary.riskAssessment).toBeDefined();
      expect(report.summary.riskAssessment?.level).toBe('high');
      expect(report.summary.riskAssessment?.factors).toContain(
        'High failure rate detected'
      );
    });

    it('没有风险因素时不应输出 riskAssessment', async () => {
      const cleanStorage = new MemoryAuditStorage();
      await cleanStorage.write(
        makeEvent({ id: 'ok', status: 'success', severity: 'low' })
      );
      const cleanService = new AuditComplianceService(cleanStorage);

      const report = await cleanService.generateReport(baseConfig());

      expect(report.summary.riskAssessment).toBeUndefined();
    });
  });

  describe('报告类型过滤', () => {
    it('user_access 报告只应包含 user 类别', async () => {
      const report = await service.generateReport(
        baseConfig({ type: 'user_access' })
      );

      expect(report.events?.every((e) => e.category === 'user')).toBe(true);
      expect(report.summary.totalEvents).toBe(1);
    });

    it('security_events 报告只应包含 high/critical 的 security 事件', async () => {
      const report = await service.generateReport(
        baseConfig({ type: 'security_events' })
      );

      expect(report.events?.every((e) => e.category === 'security')).toBe(true);
      expect(
        report.events?.every(
          (e) => e.severity === 'high' || e.severity === 'critical'
        )
      ).toBe(true);
      expect(report.summary.totalEvents).toBe(2);
    });

    it('admin_actions 报告只应包含 admin 类别', async () => {
      const report = await service.generateReport(
        baseConfig({ type: 'admin_actions' })
      );

      expect(report.summary.totalEvents).toBe(1);
      expect(report.events?.[0].category).toBe('admin');
    });

    it('data_access 报告只应包含 data 类别', async () => {
      const report = await service.generateReport(
        baseConfig({ type: 'data_access' })
      );

      expect(report.summary.totalEvents).toBe(1);
    });

    it('failed_operations 报告只应包含失败事件', async () => {
      const report = await service.generateReport(
        baseConfig({ type: 'failed_operations' })
      );

      expect(report.summary.totalEvents).toBe(1);
      expect(report.events?.[0].status).toBe('failure');
    });

    it('permission_changes 报告只应包含权限相关操作', async () => {
      const report = await service.generateReport(
        baseConfig({ type: 'permission_changes' })
      );

      expect(report.summary.totalEvents).toBe(1);
      expect(report.events?.[0].action).toBe('permission_grant');
    });

    it('custom 报告应包含全部事件', async () => {
      const report = await service.generateReport(baseConfig({ type: 'custom' }));

      expect(report.summary.totalEvents).toBe(5);
    });

    it('时间范围应生效', async () => {
      const report = await service.generateReport(
        baseConfig({
          type: 'custom',
          timeRange: {
            start: new Date('2020-01-01T00:00:00.000Z'),
            end: new Date('2021-01-01T00:00:00.000Z'),
          },
        })
      );

      expect(report.summary.totalEvents).toBe(0);
    });
  });

  describe('统计口径一致性', () => {
    it('统计数组的分类统计应与报告正文一致', async () => {
      // 回归：原实现 generateStatistics 只用 config.filter，
      // 丢掉了报告类型自带的过滤条件，
      // 「安全事件报告」的统计图表里混进了全部类别的数据。
      const report = await service.generateReport(
        baseConfig({ type: 'security_events', includeSummary: true })
      );

      const categoryStat = report.statistics?.find((s) => s.field === 'category');
      expect(categoryStat?.total).toBe(report.summary.totalEvents);
      expect(categoryStat?.items.every((i) => i.key === 'security')).toBe(true);
    });

    it('统计数组的操作统计应与报告正文一致', async () => {
      const report = await service.generateReport(
        baseConfig({ type: 'admin_actions', includeSummary: true })
      );

      const actionStat = report.statistics?.find((s) => s.field === 'action');
      expect(actionStat?.total).toBe(report.summary.totalEvents);
      expect(actionStat?.items[0].key).toBe('config_change');
    });

    it('用户统计应与报告正文一致', async () => {
      const report = await service.generateReport(
        baseConfig({ type: 'security_events', includeSummary: true })
      );

      const userStat = report.statistics?.find((s) => s.field === 'user');
      expect(userStat?.total).toBe(report.summary.totalEvents);
    });
  });

  describe('generatePredefinedReport()', () => {
    it('应生成带默认名称的报告', async () => {
      const report = await service.generatePredefinedReport('security_events', 30);

      expect(report.config.name).toBe('安全事件审计报告');
      expect(report.config.includeCharts).toBe(true);
      expect(report.events).toBeDefined();
    });

    it('各预定义类型都有对应名称', async () => {
      const names: Record<string, string> = {
        user_access: '用户访问审计报告',
        permission_changes: '权限变更审计报告',
        data_access: '数据访问审计报告',
        security_events: '安全事件审计报告',
        admin_actions: '管理操作审计报告',
        failed_operations: '失败操作审计报告',
        custom: '自定义审计报告',
      };

      for (const [type, name] of Object.entries(names)) {
        const report = await service.generatePredefinedReport(
          type as ComplianceReportConfig['type']
        );
        expect(report.config.name).toBe(name);
      }
    });
  });

  describe('exportAsJson()', () => {
    it('应写出 JSON 文件', async () => {
      const report = await service.generateReport(baseConfig());
      const outputPath = path.join(tmpDir, 'report.json');

      const result = await service.exportAsJson(report, outputPath);

      expect(result).toBe(outputPath);
      const parsed = JSON.parse(await fs.readFile(outputPath, 'utf8'));
      expect(parsed.id).toBe(report.id);
    });

    it('默认应脱敏邮箱与敏感字段', async () => {
      const sensitiveStorage = new MemoryAuditStorage();
      await sensitiveStorage.write(
        makeEvent({
          id: 'sec',
          user: { userId: 'u1', username: 'john', email: 'john@example.com' },
          details: { password: 'plain-secret', apiKey: 'k-123', note: 'fine' },
        })
      );
      const sensitiveService = new AuditComplianceService(sensitiveStorage);

      const report = await sensitiveService.generateReport(baseConfig());
      const outputPath = path.join(tmpDir, 'sanitized.json');
      await sensitiveService.exportAsJson(report, outputPath);

      const parsed = JSON.parse(await fs.readFile(outputPath, 'utf8'));
      // compliance-service.maskEmail 的规则：保留首尾各 1 位，
      // 中间补 length-2 个星号（与 sensitive-data-handler 的规则不同）
      expect(parsed.events[0].user.email).toBe('j**n@example.com');
      expect(parsed.events[0].details.password).toBe('***');
      expect(parsed.events[0].details.apiKey).toBe('***');
      expect(parsed.events[0].details.note).toBe('fine');
    });

    it('includeSensitive 为 true 时不应脱敏', async () => {
      const sensitiveStorage = new MemoryAuditStorage();
      await sensitiveStorage.write(
        makeEvent({
          id: 'sec',
          user: { userId: 'u1', username: 'john', email: 'john@example.com' },
          details: { password: 'plain-secret' },
        })
      );
      const sensitiveService = new AuditComplianceService(sensitiveStorage);

      const report = await sensitiveService.generateReport(
        baseConfig({ includeSensitive: true })
      );
      const outputPath = path.join(tmpDir, 'raw.json');
      await sensitiveService.exportAsJson(report, outputPath);

      const parsed = JSON.parse(await fs.readFile(outputPath, 'utf8'));
      expect(parsed.events[0].user.email).toBe('john@example.com');
      expect(parsed.events[0].details.password).toBe('plain-secret');
    });

    it('导出不应就地改写调用方的 report 对象', async () => {
      // 回归：原实现 sanitizeReport 直接改写 report.events，
      // 导出一次之后内存里那份报告的邮箱也变成掩码了。
      const report = await service.generateReport(baseConfig());
      const before = report.events?.[0]?.user?.email;

      await service.exportAsJson(report, path.join(tmpDir, 'r1.json'));

      expect(report.events?.[0]?.user?.email).toBe(before);
    });
  });

  describe('exportAsCsv()', () => {
    it('应写出 CSV 文件并包含表头', async () => {
      const report = await service.generateReport(baseConfig());
      const outputPath = path.join(tmpDir, 'report.csv');

      const result = await service.exportAsCsv(report, outputPath);

      expect(result).toBe(outputPath);
      const content = await fs.readFile(outputPath, 'utf8');
      expect(content).toContain('ID,Timestamp,Level,Category,Action');
      expect(content.split('\n').length).toBe(6); // 表头 + 5 行
    });

    it('没有事件时应写出提示文本', async () => {
      const report = await service.generateReport(
        baseConfig({ includeDetails: false })
      );
      const outputPath = path.join(tmpDir, 'empty.csv');

      await service.exportAsCsv(report, outputPath);

      expect(await fs.readFile(outputPath, 'utf8')).toBe('No events to export');
    });

    it('消息中的引号应被正确转义', async () => {
      const quoteStorage = new MemoryAuditStorage();
      await quoteStorage.write(makeEvent({ id: 'q', message: 'He said "hi"' }));
      const quoteService = new AuditComplianceService(quoteStorage);

      const report = await quoteService.generateReport(baseConfig());
      const outputPath = path.join(tmpDir, 'quote.csv');
      await quoteService.exportAsCsv(report, outputPath);

      expect(await fs.readFile(outputPath, 'utf8')).toContain('""hi""');
    });
  });
});
