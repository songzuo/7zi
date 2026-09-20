/**
 * 审计日志系统 - 文件存储
 * @module lib/audit-log/storage/file-storage
 * @version 1.10.0
 */

import type {
  AuditEvent,
  AuditQueryOptions,
  AuditQueryResult,
  AuditQueryFilter,
  AuditStorageStats,
  AuditLogLevel,
  AuditEventCategory,
} from '../types.js';
import type { AuditLogStorage } from '../types.js';
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { promisify } from 'util';

const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const mkdir = promisify(fs.mkdir);
const unlink = promisify(fs.unlink);

/**
 * 文件审计日志存储
 */
export class FileAuditStorage implements AuditLogStorage {
  private basePath: string;
  private maxFileSize: number;
  private compressionEnabled: boolean;
  private currentLogFile: string | null = null;
  private currentFileSize: number = 0;
  private writeBuffer: AuditEvent[] = [];
  private maxBufferSize: number = 100;
  private flushInterval: NodeJS.Timeout | null = null;

  constructor(options?: {
    basePath?: string;
    maxFileSize?: number;
    compressionEnabled?: boolean;
  }) {
    this.basePath = options?.basePath || './logs/audit';
    this.maxFileSize = options?.maxFileSize || 100 * 1024 * 1024; // 100MB
    this.compressionEnabled = options?.compressionEnabled ?? true;

    this.ensureDirectory();
    this.startFlushInterval();
  }

  /**
   * 写入事件
   */
  public async write(event: AuditEvent): Promise<void> {
    this.writeBuffer.push(event);

    if (this.writeBuffer.length >= this.maxBufferSize) {
      await this.flushBuffer();
    }
  }

  /**
   * 批量写入
   */
  public async writeBatch(events: AuditEvent[]): Promise<void> {
    this.writeBuffer.push(...events);

    if (this.writeBuffer.length >= this.maxBufferSize) {
      await this.flushBuffer();
    }
  }

  /**
   * 查询事件
   */
  public async query(options: AuditQueryOptions): Promise<AuditQueryResult> {
    const startTime = Date.now();

    // 获取所有匹配的日志文件
    const logFiles = await this.getLogFiles(options.filter?.timeRange);

    // 从文件中读取并过滤事件
    let events: AuditEvent[] = [];
    for (const file of logFiles) {
      const fileEvents = await this.readEventsFromFile(file);
      events = events.concat(fileEvents);
    }

    // 应用过滤
    events = this.applyFilter(events, options.filter || {});

    // 应用排序
    if (options.sort) {
      events = this.applySort(events, options.sort);
    } else {
      events.sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    }

    // 计算总数
    const total = events.length;

    // 应用分页
    const pagination = options.pagination || { page: 1, pageSize: 50 };
    const startIndex = (pagination.page - 1) * pagination.pageSize;
    const endIndex = startIndex + pagination.pageSize;
    const paginatedEvents = events.slice(startIndex, endIndex);

    return {
      data: paginatedEvents,
      total,
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalPages: Math.ceil(total / pagination.pageSize),
      duration: Date.now() - startTime,
    };
  }

  /**
   * 按ID获取
   */
  public async getById(id: string): Promise<AuditEvent | null> {
    const logFiles = await this.getLogFiles();

    for (const file of logFiles) {
      const events = await this.readEventsFromFile(file);
      const event = events.find((e) => e.id === id);
      if (event) {
        return event;
      }
    }

    return null;
  }

  /**
   * 删除事件
   */
  public async delete(id: string): Promise<boolean> {
    // 文件存储不支持单条删除，需要重写文件
    const logFiles = await this.getLogFiles();

    for (const file of logFiles) {
      const events = await this.readEventsFromFile(file);
      const index = events.findIndex((e) => e.id === id);

      if (index !== -1) {
        events.splice(index, 1);
        await this.writeEventsToFile(file, events);
        return true;
      }
    }

    return false;
  }

  /**
   * 按条件删除
   */
  public async deleteByFilter(filter: AuditQueryFilter): Promise<number> {
    const logFiles = await this.getLogFiles(filter.timeRange);
    let deletedCount = 0;

    for (const file of logFiles) {
      const events = await this.readEventsFromFile(file);
      const originalLength = events.length;

      const filteredEvents = events.filter(
        (event) => !this.matchesFilter(event, filter)
      );

      if (filteredEvents.length < originalLength) {
        deletedCount += originalLength - filteredEvents.length;
        await this.writeEventsToFile(file, filteredEvents);
      }
    }

    return deletedCount;
  }

  /**
   * 获取存储统计
   */
  public async getStats(): Promise<AuditStorageStats> {
    const logFiles = await this.getLogFiles();
    let totalSize = 0;
    let totalEvents = 0;
    let earliestEvent: Date | undefined;
    let latestEvent: Date | undefined;
    const byCategory: Record<AuditEventCategory, number> = {} as Record<AuditEventCategory, number>;
    const byLevel: Record<AuditLogLevel, number> = {} as Record<AuditLogLevel, number>;

    for (const file of logFiles) {
      const fileStat = await stat(file);
      totalSize += fileStat.size;

      const events = await this.readEventsFromFile(file);
      totalEvents += events.length;

      for (const event of events) {
        const timestamp = new Date(event.timestamp);
        if (!earliestEvent || timestamp < earliestEvent) {
          earliestEvent = timestamp;
        }
        if (!latestEvent || timestamp > latestEvent) {
          latestEvent = timestamp;
        }

        byCategory[event.category] = (byCategory[event.category] || 0) + 1;
        byLevel[event.level] = (byLevel[event.level] || 0) + 1;
      }
    }

    return {
      totalEvents,
      storageSize: totalSize,
      earliestEvent,
      latestEvent,
      byCategory,
      byLevel,
    };
  }

  /**
   * 清理过期数据
   */
  public async cleanup(): Promise<number> {
    const config = (await import('../config.js')).getConfigManager().getConfig();
    const retentionDays = config.retention.retentionDays;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const logFiles = await this.getLogFiles();
    let deletedCount = 0;

    for (const file of logFiles) {
      const events = await this.readEventsFromFile(file);
      const originalLength = events.length;

      const filteredEvents = events.filter(
        (event) => new Date(event.timestamp) >= cutoffDate
      );

      if (filteredEvents.length < originalLength) {
        deletedCount += originalLength - filteredEvents.length;

        if (filteredEvents.length === 0) {
          await unlink(file);
        } else {
          await this.writeEventsToFile(file, filteredEvents);
        }
      }
    }

    return deletedCount;
  }

  /**
   * 关闭连接
   */
  public async close(): Promise<void> {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }

    await this.flushBuffer();
  }

  /**
   * 归档日志
   */
  public async archive(): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const archiveDir = path.join(this.basePath, 'archive');
    await this.ensureDirectoryExists(archiveDir);

    const archivePath = path.join(archiveDir, `audit-${timestamp}.jsonl.gz`);
    const logFiles = await this.getLogFiles();

    const allEvents: AuditEvent[] = [];
    for (const file of logFiles) {
      const events = await this.readEventsFromFile(file);
      allEvents.push(...events);
    }

    const jsonlData = allEvents.map((e) => JSON.stringify(e)).join('\n');
    const compressed = await promisify(zlib.gzip)(jsonlData);
    await writeFile(archivePath, compressed);

    // 删除原始文件
    for (const file of logFiles) {
      if (!file.includes('archive')) {
        await unlink(file);
      }
    }

    return archivePath;
  }

  // ========== 私有方法 ==========

  /**
   * 确保目录存在
   */
  private ensureDirectory(): void {
    if (!fs.existsSync(this.basePath)) {
      fs.mkdirSync(this.basePath, { recursive: true });
    }
  }

  /**
   * 确保指定目录存在
   */
  private async ensureDirectoryExists(dir: string): Promise<void> {
    if (!fs.existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }
  }

  /**
   * 获取日志文件列表
   */
  private async getLogFiles(timeRange?: { start: Date; end: Date }): Promise<string[]> {
    const files = await readdir(this.basePath);
    let logFiles = files
      .filter((f) => f.endsWith('.jsonl') || f.endsWith('.jsonl.gz'))
      .map((f) => path.join(this.basePath, f));

    // 如果有时间范围，按文件修改时间过滤
    if (timeRange) {
      logFiles = logFiles.filter(async (file) => {
        const fileStat = await stat(file);
        return fileStat.mtime >= timeRange.start && fileStat.mtime <= timeRange.end;
      });
    }

    return logFiles;
  }

  /**
   * 从文件读取事件
   */
  private async readEventsFromFile(filePath: string): Promise<AuditEvent[]> {
    try {
      let content: string;

      if (filePath.endsWith('.gz')) {
        const compressed = await readFile(filePath);
        content = await promisify(zlib.gunzip)(compressed).then((b) => b.toString());
      } else {
        content = await readFile(filePath, 'utf8');
      }

      return content
        .trim()
        .split('\n')
        .filter((line) => line.length > 0)
        .map((line) => JSON.parse(line));
    } catch (error) {
      console.error(`Error reading audit log file ${filePath}:`, error);
      return [];
    }
  }

  /**
   * 写入事件到文件
   */
  private async writeEventsToFile(
    filePath: string,
    events: AuditEvent[]
  ): Promise<void> {
    const jsonlData = events.map((e) => JSON.stringify(e)).join('\n') + '\n';

    if (filePath.endsWith('.gz') || this.compressionEnabled) {
      const compressed = await promisify(zlib.gzip)(jsonlData);
      const gzPath = filePath.endsWith('.gz') ? filePath : `${filePath}.gz`;
      await writeFile(gzPath, compressed);
    } else {
      await writeFile(filePath, jsonlData, 'utf8');
    }
  }

  /**
   * 获取当前日志文件路径
   */
  private getCurrentLogFile(): string {
    const today = new Date().toISOString().split('T')[0];
    return path.join(this.basePath, `audit-${today}.jsonl`);
  }

  /**
   * 刷新缓冲区
   */
  private async flushBuffer(): Promise<void> {
    if (this.writeBuffer.length === 0) {
      return;
    }

    const events = [...this.writeBuffer];
    this.writeBuffer = [];

    const logFile = this.getCurrentLogFile();
    const jsonlData = events.map((e) => JSON.stringify(e)).join('\n') + '\n';

    await writeFile(logFile, jsonlData, { encoding: 'utf8', flag: 'a' });
  }

  /**
   * 启动定时刷新
   */
  private startFlushInterval(): void {
    this.flushInterval = setInterval(() => {
      this.flushBuffer().catch((error) => {
        console.error('Error flushing audit log buffer:', error);
      });
    }, 5000);
  }

  /**
   * 应用过滤器
   */
  private applyFilter(events: AuditEvent[], filter: AuditQueryFilter): AuditEvent[] {
    return events.filter((event) => this.matchesFilter(event, filter));
  }

  /**
   * 检查事件是否匹配过滤条件
   */
  private matchesFilter(event: AuditEvent, filter: AuditQueryFilter): boolean {
    // 时间范围
    if (filter.timeRange) {
      const timestamp = new Date(event.timestamp).getTime();
      if (
        timestamp < new Date(filter.timeRange.start).getTime() ||
        timestamp > new Date(filter.timeRange.end).getTime()
      ) {
        return false;
      }
    }

    // 用户ID
    if (filter.userIds && filter.userIds.length > 0) {
      if (!event.user || !filter.userIds.includes(event.user.userId)) {
        return false;
      }
    }

    // 事件级别
    if (filter.levels && filter.levels.length > 0) {
      if (!filter.levels.includes(event.level)) {
        return false;
      }
    }

    // 事件类别
    if (filter.categories && filter.categories.length > 0) {
      if (!filter.categories.includes(event.category)) {
        return false;
      }
    }

    // 操作类型
    if (filter.actions && filter.actions.length > 0) {
      if (!filter.actions.includes(event.action)) {
        return false;
      }
    }

    // 结果状态
    if (filter.statuses && filter.statuses.length > 0) {
      if (!filter.statuses.includes(event.status)) {
        return false;
      }
    }

    // 严重程度
    if (filter.severities && filter.severities.length > 0) {
      if (!filter.severities.includes(event.severity)) {
        return false;
      }
    }

    // 资源类型
    if (filter.resourceTypes && filter.resourceTypes.length > 0) {
      if (!event.resource || !filter.resourceTypes.includes(event.resource.type)) {
        return false;
      }
    }

    // 全文搜索
    if (filter.searchQuery) {
      const query = filter.searchQuery.toLowerCase();
      const searchableText = [
        event.message,
        event.user?.username || '',
        JSON.stringify(event.details || {}),
      ]
        .join(' ')
        .toLowerCase();

      if (!searchableText.includes(query)) {
        return false;
      }
    }

    return true;
  }

  /**
   * 应用排序
   */
  private applySort(
    events: AuditEvent[],
    sort: { field: string; order: 'asc' | 'desc' }
  ): AuditEvent[] {
    return [...events].sort((a, b) => {
      let comparison = 0;

      switch (sort.field) {
        case 'timestamp':
          comparison =
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
          break;
        case 'level':
          const levels = ['debug', 'info', 'warn', 'error', 'critical'];
          comparison = levels.indexOf(a.level) - levels.indexOf(b.level);
          break;
        case 'severity':
          const severities = ['low', 'medium', 'high', 'critical'];
          comparison = severities.indexOf(a.severity) - severities.indexOf(b.severity);
          break;
        case 'category':
          comparison = a.category.localeCompare(b.category);
          break;
      }

      return sort.order === 'asc' ? comparison : -comparison;
    });
  }
}