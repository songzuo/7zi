/**
 * 审计日志系统 - 导出服务
 * @module lib/audit-log/export-service
 * @version 1.10.0
 */

import type {
  AuditEvent,
  AuditExportOptions,
  AuditImportResult,
  AuditLogLevel,
  AuditEventCategory,
  AuditActionType,
  AuditResultStatus,
  AuditSeverity,
  AuditLogStorage,
} from './types.js';
import fs from 'fs/promises';
import path from 'path';
import zlib from 'zlib';
import { promisify } from 'util';
import { logger } from '../logger/index.js';
import { AuditSignatureHandler } from './signature-handler.js';

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

/**
 * 审计日志导出服务
 */
export class AuditExportService {
  constructor(
    private storage: AuditLogStorage,
    /** 签名校验器 —— 导入时校验事件完整性用 */
    private signatureHandler?: AuditSignatureHandler
  ) {}

  /**
   * 导出审计日志
   */
  public async export(options: AuditExportOptions): Promise<string> {
    const startTime = Date.now();

    // 获取事件
    const result = await this.storage.query({
      filter: { ...options.filter, timeRange: options.timeRange },
      pagination: { page: 1, pageSize: options.maxRecords || 100000 },
    });

    let events = result.data;

    // 脱敏处理
    if (!options.includeSensitive) {
      events = this.sanitizeEvents(events);
    }

    // 生成输出路径
    const outputPath = options.outputPath || this.generateOutputPath(options.format);
    const dir = path.dirname(outputPath);
    await fs.mkdir(dir, { recursive: true });

    // 根据格式导出
    switch (options.format) {
      case 'json':
        await this.exportAsJson(events, outputPath, options.compress);
        break;
      case 'csv':
        await this.exportAsCsv(events, outputPath, options.compress);
        break;
      case 'xlsx':
        await this.exportAsXlsx(events, outputPath, options.compress);
        break;
    }

    console.info(
      `Exported ${events.length} events in ${Date.now() - startTime}ms to ${outputPath}`
    );

    return outputPath;
  }

  /**
   * 导入审计日志
   */
  public async import(
    inputPath: string,
    format: 'json' | 'csv',
    options?: {
      overwrite?: boolean;
      verifySignature?: boolean;
      skipInvalid?: boolean;
    }
  ): Promise<AuditImportResult> {
    const startTime = Date.now();
    const result: AuditImportResult = {
      imported: 0,
      skipped: 0,
      failed: 0,
      errors: [],
    };

    // 读取文件
    let content: string;
    try {
      if (inputPath.endsWith('.gz')) {
        const compressed = await fs.readFile(inputPath);
        content = (await gunzip(compressed)).toString('utf8');
      } else {
        content = await fs.readFile(inputPath, 'utf8');
      }
    } catch (error) {
      throw new Error(`Failed to read file ${inputPath}: ${error}`);
    }

    // 解析事件
    let events: AuditEvent[] = [];
    switch (format) {
      case 'json':
        events = await this.parseJson(content, result, options?.skipInvalid);
        break;
      case 'csv':
        events = await this.parseCsv(content, result, options?.skipInvalid);
        break;
    }

    // 验证签名
    //
    // 之前的实现是个空壳：filter 的回调**恒返回 true**，
    // 所以 verifySignature 这个选项完全无效 —— 无论事件签名对不对
    // 都会被导入。现在改成真正用 signatureHandler 校验。
    if (options?.verifySignature) {
      const handler = this.signatureHandler;

      if (!handler) {
        // 没有校验器就无法校验 —— 不能假装通过。
        result.failed += events.length;
        result.errors?.push({
          line: 0,
          error: 'Signature verification requested but no signature handler is configured',
        });
        return result;
      }

      const validEvents: AuditEvent[] = [];
      for (const event of events) {
        if (handler.verify(event)) {
          validEvents.push(event);
        } else {
          result.failed++;
          result.errors?.push({
            line: 0,
            error: `Signature verification failed for event ${event.id}`,
          });
        }
      }
      events = validEvents;
    }

    // 检查重复
    if (!options?.overwrite) {
      const existingIds = new Set<string>();
      for (const event of events) {
        const existing = await this.storage.getById(event.id);
        if (existing) {
          existingIds.add(event.id);
          result.skipped++;
        }
      }
      events = events.filter((e) => !existingIds.has(e.id));
    }

    // 写入存储
    if (events.length > 0) {
      await this.storage.writeBatch(events);
      result.imported = events.length;
    }

    console.info(
      `Import completed in ${Date.now() - startTime}ms: ` +
        `${result.imported} imported, ${result.skipped} skipped, ${result.failed} failed`
    );

    return result;
  }

  /**
   * 导出为 JSON 格式
   */
  private async exportAsJson(
    events: AuditEvent[],
    outputPath: string,
    compress?: boolean
  ): Promise<void> {
    const jsonContent = JSON.stringify(events, null, 2);

    if (compress || outputPath.endsWith('.gz')) {
      const compressed = await gzip(jsonContent);
      const finalPath = outputPath.endsWith('.gz') ? outputPath : `${outputPath}.gz`;
      await fs.writeFile(finalPath, compressed);
    } else {
      await fs.writeFile(outputPath, jsonContent, 'utf8');
    }
  }

  /**
   * 导出为 CSV 格式
   */
  private async exportAsCsv(
    events: AuditEvent[],
    outputPath: string,
    compress?: boolean
  ): Promise<void> {
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
      'Email',
      'Session ID',
      'Client IP',
      'Request Path',
      'Resource Type',
      'Resource ID',
      'Resource Name',
      'Correlation ID',
      'Tags',
    ];

    const rows = events.map((event) => [
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
      event.user?.email || '',
      event.user?.sessionId || '',
      event.request?.clientIp || '',
      event.request?.path || '',
      event.resource?.type || '',
      event.resource?.id || '',
      event.resource?.name || '',
      event.correlationId || '',
      event.tags ? `"${event.tags.join(',')}"` : '',
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    if (compress || outputPath.endsWith('.gz')) {
      const compressed = await gzip(csv);
      const finalPath = outputPath.endsWith('.gz') ? outputPath : `${outputPath}.gz`;
      await fs.writeFile(finalPath, compressed);
    } else {
      await fs.writeFile(outputPath, csv, 'utf8');
    }
  }

  /**
   * 导出为 Excel 格式
   */
  private async exportAsXlsx(
    events: AuditEvent[],
    outputPath: string,
    compress?: boolean
  ): Promise<void> {
    // 简单实现：使用 CSV 格式，但添加 .xlsx 扩展名的提示
    // 实际项目中应该使用 exceljs 或类似库
    console.warn('XLSX export not fully implemented, falling back to CSV format');

    const csvPath = outputPath.replace('.xlsx', '.csv');
    await this.exportAsCsv(events, csvPath, compress);

    // 重命名文件
    await fs.rename(csvPath, outputPath);
  }

  /**
   * 解析 JSON 格式
   */
  private async parseJson(
    content: string,
    result: AuditImportResult,
    skipInvalid?: boolean
  ): Promise<AuditEvent[]> {
    try {
      const data = JSON.parse(content);
      const events = Array.isArray(data) ? data : [data];

      return events.filter((event: unknown) => {
        if (this.validateEvent(event)) {
          // JSON 里的 timestamp 是 ISO 字符串 —— 转成 Date 实例，
          // 与内存中的事件保持一致（签名计算也依赖这一点）。
          this.normalizeTimestamp(event);
          return true;
        } else {
          result.failed++;
          if (!skipInvalid) {
            result.errors?.push({
              line: 0,
              error: 'Invalid event structure',
            });
          }
          return false;
        }
      });
    } catch (error) {
      logger.error('Failed to parse JSON', { error });
      return [];
    }
  }

  /**
   * 解析 CSV 格式
   */
  private async parseCsv(
    content: string,
    result: AuditImportResult,
    skipInvalid?: boolean
  ): Promise<AuditEvent[]> {
    const lines = content.trim().split('\n');
    if (lines.length < 2) {
      return [];
    }

    const headers = this.parseCsvLine(lines[0]);
    const events: AuditEvent[] = [];

    for (let i = 1; i < lines.length; i++) {
      try {
        const values = this.parseCsvLine(lines[i]);
        const event = this.csvRowToEvent(headers, values);

        if (this.validateEvent(event)) {
          events.push(event);
        } else {
          result.failed++;
          if (!skipInvalid) {
            result.errors?.push({
              line: i + 1,
              error: 'Invalid event structure',
            });
          }
        }
      } catch (error) {
        result.failed++;
        if (!skipInvalid) {
          result.errors?.push({
            line: i + 1,
            error: String(error),
          });
        }
      }
    }

    return events;
  }

  /**
   * 解析 CSV 行
   */
  private parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }

    result.push(current);
    return result;
  }

  /**
   * CSV 行转事件
   */
  private csvRowToEvent(headers: string[], values: string[]): AuditEvent {
    const event: Partial<AuditEvent> = {};

    headers.forEach((header, index) => {
      const value = values[index] || '';
      const key = header.toLowerCase().replace(/ /g, '_');

      switch (key) {
        case 'id':
          event.id = value;
          break;
        case 'timestamp':
          event.timestamp = new Date(value);
          break;
        case 'level':
          event.level = String(value) as AuditLogLevel;
          break;
        case 'category':
          event.category = String(value) as AuditEventCategory;
          break;
        case 'action':
          event.action = String(value) as AuditActionType;
          break;
        case 'status':
          event.status = String(value) as AuditResultStatus;
          break;
        case 'severity':
          event.severity = String(value) as AuditSeverity;
          break;
        case 'message':
          event.message = String(value);
          break;
        case 'user_id':
          if (!event.user) event.user = { userId: '', username: '', email: '', sessionId: '' };
          event.user!.userId = String(value);
          break;
        case 'username':
          if (!event.user) event.user = { userId: '', username: '', email: '', sessionId: '' };
          event.user!.username = String(value);
          break;
        case 'email':
          if (!event.user) event.user = { userId: '', username: '', email: '', sessionId: '' };
          event.user!.email = String(value);
          break;
        case 'session_id':
          if (!event.user) event.user = { userId: '', username: '', email: '', sessionId: '' };
          event.user!.sessionId = String(value);
          break;
        case 'client_ip':
          if (!event.request) event.request = { clientIp: '', path: '' };
          event.request!.clientIp = String(value);
          break;
        case 'request_path':
          if (!event.request) event.request = { clientIp: '', path: '' };
          event.request!.path = String(value);
          break;
        case 'resource_type':
          if (!event.resource) event.resource = { type: '', id: '', name: '' };
          event.resource!.type = String(value);
          break;
        case 'resource_id':
          if (!event.resource) event.resource = { type: '', id: '', name: '' };
          event.resource!.id = String(value);
          break;
        case 'resource_name':
          if (!event.resource) event.resource = { type: '', id: '', name: '' };
          event.resource!.name = String(value);
          break;
        case 'correlation_id':
          event.correlationId = value;
          break;
        case 'tags':
          event.tags = value ? value.split(',') : [];
          break;
      }
    });

    return event as AuditEvent;
  }

  /**
   * 验证事件结构
   */
  private validateEvent(event: unknown): event is AuditEvent {
    if (!event || typeof event !== 'object') {
      return false;
    }
    const e = event as Record<string, unknown>;
    return (
      typeof e.id === 'string' &&
      this.isValidTimestamp(e.timestamp) &&
      typeof e.level === 'string' &&
      typeof e.category === 'string' &&
      typeof e.action === 'string' &&
      typeof e.status === 'string' &&
      typeof e.severity === 'string' &&
      typeof e.message === 'string'
    );
  }

  /**
   * 时间戳校验
   *
   * JSON 里存的时间戳是 ISO **字符串**，JSON.parse 之后不是 Date 实例。
   * 原来这里只认 `instanceof Date`，导致**从 JSON 导入的事件永远通不过
   * 结构校验** —— JSON 导入功能实际上完全不可用。
   * 现在字符串形式也接受，并在解析阶段转成 Date。
   */
  private isValidTimestamp(value: unknown): boolean {
    if (value instanceof Date) {
      return !Number.isNaN(value.getTime());
    }
    if (typeof value === 'string' || typeof value === 'number') {
      return !Number.isNaN(new Date(value).getTime());
    }
    return false;
  }

  /**
   * 把 timestamp 规范成 Date 实例
   */
  private normalizeTimestamp(event: AuditEvent): void {
    if (!(event.timestamp instanceof Date)) {
      event.timestamp = new Date(event.timestamp);
    }
  }

  /**
   * 脱敏事件
   */
  private sanitizeEvents(events: AuditEvent[]): AuditEvent[] {
    return events.map((event) => ({
      ...event,
      user: event.user
        ? {
            ...event.user,
            email: event.user.email ? this.maskEmail(event.user.email) : undefined,
          }
        : undefined,
      details: event.details ? this.maskSensitiveFields(event.details) : undefined,
    }));
  }

  /**
   * 脱敏邮箱
   */
  private maskEmail(email: string): string {
    const parts = email.split('@');
    if (parts.length !== 2) return '***@***';

    const local = parts[0];
    const domain = parts[1];

    const maskedLocal =
      local.length > 2
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
   * 生成输出路径
   */
  private generateOutputPath(format: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const extension = format === 'xlsx' ? 'xlsx' : format;
    return path.join('./logs/audit/exports', `audit-export-${timestamp}.${extension}`);
  }
}