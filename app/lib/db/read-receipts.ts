/**
 * @fileoverview 已读标记数据库操作
 * @description 使用 SQLite 实现已读标记的持久化存储
 */

import * as fs from 'fs';
import * as path from 'path';
import type {
  ReadReceipt,
  CreateReadReceiptParams,
  ReadReceiptQueryParams,
  ReadStats,
  MessageId,
  UserId,
} from './types';

/**
 * 简单的 SQLite 数据库实现
 * 注意：这是一个简化的实现，生产环境应使用 better-sqlite3 或类似库
 */
export class SimpleSQLite {
  private dbPath: string;
  private data: Map<string, ReadReceipt[]> = new Map();
  private initialized = false;

  constructor(dbPath: string) {
    this.dbPath = dbPath;
    this.loadFromFile();
  }

  /**
   * 从文件加载数据
   */
  private loadFromFile(): void {
    try {
      if (fs.existsSync(this.dbPath)) {
        const rawData = fs.readFileSync(this.dbPath, 'utf-8');
        const parsed = JSON.parse(rawData);
        
        if (parsed.readReceipts) {
          Object.entries(parsed.readReceipts).forEach(([key, value]) => {
            this.data.set(key, (value as ReadReceipt[]).map(r => ({
              ...r,
              readAt: new Date(r.readAt),
              createdAt: new Date(r.createdAt),
            })));
          });
        }
        this.initialized = true;
      }
    } catch (error) {
      console.error('Failed to load database:', error);
      this.data = new Map();
    }
  }

  /**
   * 保存数据到文件
   */
  private saveToFile(): void {
    try {
      const dir = path.dirname(this.dbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const dataObj: Record<string, ReadReceipt[]> = {};
      this.data.forEach((value, key) => {
        dataObj[key] = value;
      });

      fs.writeFileSync(
        this.dbPath,
        JSON.stringify({ readReceipts: dataObj }, null, 2),
        'utf-8'
      );
    } catch (error) {
      console.error('Failed to save database:', error);
      throw new Error('Database save failed');
    }
  }

  /**
   * 插入记录
   */
  insert(table: string, record: ReadReceipt): void {
    if (!this.data.has(table)) {
      this.data.set(table, []);
    }
    this.data.get(table)!.push(record);
    this.saveToFile();
  }

  /**
   * 查询记录
   */
  query(table: string, predicate: (record: ReadReceipt) => boolean): ReadReceipt[] {
    const records = this.data.get(table) || [];
    return records.filter(predicate);
  }

  /**
   * 查询单条记录
   */
  queryOne(table: string, predicate: (record: ReadReceipt) => boolean): ReadReceipt | null {
    const records = this.data.get(table) || [];
    return records.find(predicate) || null;
  }

  /**
   * 更新记录
   */
  update(table: string, predicate: (record: ReadReceipt) => boolean, updater: (record: ReadReceipt) => ReadReceipt): number {
    const records = this.data.get(table);
    if (!records) return 0;

    let count = 0;
    for (let i = 0; i < records.length; i++) {
      if (predicate(records[i])) {
        records[i] = updater(records[i]);
        count++;
      }
    }

    if (count > 0) {
      this.saveToFile();
    }
    return count;
  }

  /**
   * 删除记录
   */
  delete(table: string, predicate: (record: ReadReceipt) => boolean): number {
    const records = this.data.get(table);
    if (!records) return 0;

    const originalLength = records.length;
    const filtered = records.filter(r => !predicate(r));
    this.data.set(table, filtered);

    if (filtered.length < originalLength) {
      this.saveToFile();
    }
    return originalLength - filtered.length;
  }

  /**
   * 获取所有记录
   */
  getAll(table: string): ReadReceipt[] {
    return this.data.get(table) || [];
  }

  /**
   * 清空表
   */
  clear(table: string): void {
    this.data.delete(table);
    this.saveToFile();
  }

  /**
   * 关闭数据库
   */
  close(): void {
    this.saveToFile();
    this.data.clear();
  }
}

/**
 * 已读标记存储类
 */
export class ReadReceiptStore {
  private db: SimpleSQLite;
  private tableName = 'read_receipts';

  constructor(dbPath: string) {
    this.db = new SimpleSQLite(dbPath);
  }

  /**
   * 创建已读标记
   */
  createReceipt(params: CreateReadReceiptParams): ReadReceipt {
    const existing = this.getReceipt(params.messageId, params.userId);
    if (existing) {
      return existing;
    }

    const receipt: ReadReceipt = {
      id: `receipt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      messageId: params.messageId,
      userId: params.userId,
      conversationId: params.conversationId,
      readAt: new Date(),
      createdAt: new Date(),
    };

    this.db.insert(this.tableName, receipt);
    return receipt;
  }

  /**
   * 获取已读标记
   */
  getReceipt(messageId: MessageId, userId: UserId): ReadReceipt | null {
    return this.db.queryOne(
      this.tableName,
      r => r.messageId === messageId && r.userId === userId
    );
  }

  /**
   * 查询已读标记列表
   */
  queryReceipts(params: ReadReceiptQueryParams): ReadReceipt[] {
    let results = this.db.getAll(this.tableName);

    if (params.userId) {
      results = results.filter(r => r.userId === params.userId);
    }
    if (params.messageId) {
      results = results.filter(r => r.messageId === params.messageId);
    }
    if (params.conversationId) {
      results = results.filter(r => r.conversationId === params.conversationId);
    }

    // 排序：最新的在前
    results.sort((a, b) => b.readAt.getTime() - a.readAt.getTime());

    // 分页
    if (params.offset !== undefined) {
      results = results.slice(params.offset);
    }
    if (params.limit !== undefined) {
      results = results.slice(0, params.limit);
    }

    return results;
  }

  /**
   * 获取消息的已读统计
   */
  getMessageReadStats(messageId: MessageId, totalRecipients: number): ReadStats {
    const receipts = this.db.query(this.tableName, r => r.messageId === messageId);
    const readBy = receipts.map(r => r.userId);

    return {
      messageId,
      totalRecipients,
      readCount: receipts.length,
      unreadCount: Math.max(0, totalRecipients - receipts.length),
      readBy,
    };
  }

  /**
   * 批量标记已读
   */
  markAsRead(params: CreateReadReceiptParams[]): ReadReceipt[] {
    return params.map(p => this.createReceipt(p));
  }

  /**
   * 删除已读标记
   */
  deleteReceipt(messageId: MessageId, userId: UserId): boolean {
    const count = this.db.delete(
      this.tableName,
      r => r.messageId === messageId && r.userId === userId
    );
    return count > 0;
  }

  /**
   * 清理过期的已读标记
   */
  cleanupExpiredReceipts(ttlMs: number): number {
    const cutoffTime = Date.now() - ttlMs;
    return this.db.delete(
      this.tableName,
      r => r.createdAt.getTime() < cutoffTime
    );
  }

  /**
   * 获取用户在会话中的未读消息数
   */
  getUnreadCount(userId: UserId, conversationId?: string): number {
    // 这个方法需要结合消息表实现
    // 这里返回已读标记数量作为示例
    const receipts = this.db.query(
      this.tableName,
      r => r.userId === userId && (!conversationId || r.conversationId === conversationId)
    );
    return receipts.length;
  }

  /**
   * 关闭存储
   */
  close(): void {
    this.db.close();
  }
}

// 默认实例
let defaultStore: ReadReceiptStore | null = null;

/**
 * 获取默认的已读标记存储实例
 */
export function getReadReceiptStore(dbPath?: string): ReadReceiptStore {
  if (!defaultStore) {
    const path = dbPath || process.env.DB_PATH || '/root/.openclaw/workspace/app/data/read-receipts.db';
    defaultStore = new ReadReceiptStore(path);
  }
  return defaultStore;
}

/**
 * 重置存储实例（用于测试）
 */
export function resetReadReceiptStore(): void {
  if (defaultStore) {
    defaultStore.close();
    defaultStore = null;
  }
}
