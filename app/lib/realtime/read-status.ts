/**
 * 已读标记管理模块
 * Read Status Management Module
 * 
 * 支持内存存储和 SQLite 持久化存储
 */

import * as fs from 'fs';
import * as path from 'path';

/** 已读状态记录 */
export interface ReadStatus {
  notificationId: string;
  userId: string;
  readAt: Date;
}

/** 已读状态存储接口 */
export interface ReadStatusStore {
  /** 标记为已读 */
  markAsRead(notificationId: string, userId: string): Promise<void>;
  /** 批量标记为已读 */
  markMultipleAsRead(notificationIds: string[], userId: string): Promise<void>;
  /** 检查是否已读 */
  isRead(notificationId: string, userId: string): Promise<boolean>;
  /** 获取用户的所有已读通知 ID */
  getUserReadNotifications(userId: string): Promise<Set<string>>;
  /** 获取未读数量 */
  getUnreadCount(notificationIds: string[], userId: string): Promise<number>;
  /** 获取已读时间 */
  getReadAt(notificationId: string, userId: string): Promise<Date | null>;
  /** 清理过期记录 */
  cleanupExpired?(ttlMs: number): Promise<number>;
  /** 关闭存储 */
  close?(): void;
}

/** 内存存储实现 */
class InMemoryReadStatusStore implements ReadStatusStore {
  private store: Map<string, Map<string, ReadStatus>> = new Map();

  private getUserKey(userId: string): string {
    return userId;
  }

  private getNotificationKey(notificationId: string, userId: string): string {
    return `${userId}:${notificationId}`;
  }

  async markAsRead(notificationId: string, userId: string): Promise<void> {
    const userKey = this.getUserKey(userId);
    
    if (!this.store.has(userKey)) {
      this.store.set(userKey, new Map());
    }
    
    const userStore = this.store.get(userKey)!;
    userStore.set(notificationId, {
      notificationId,
      userId,
      readAt: new Date(),
    });
  }

  async markMultipleAsRead(notificationIds: string[], userId: string): Promise<void> {
    await Promise.all(
      notificationIds.map(id => this.markAsRead(id, userId))
    );
  }

  async isRead(notificationId: string, userId: string): Promise<boolean> {
    const userKey = this.getUserKey(userId);
    const userStore = this.store.get(userKey);
    
    if (!userStore) return false;
    
    return userStore.has(notificationId);
  }

  async getUserReadNotifications(userId: string): Promise<Set<string>> {
    const userKey = this.getUserKey(userId);
    const userStore = this.store.get(userKey);
    
    if (!userStore) return new Set();
    
    return new Set(userStore.keys());
  }

  async getUnreadCount(notificationIds: string[], userId: string): Promise<number> {
    const readNotifications = await this.getUserReadNotifications(userId);
    
    return notificationIds.filter(id => !readNotifications.has(id)).length;
  }

  async getReadAt(notificationId: string, userId: string): Promise<Date | null> {
    const userKey = this.getUserKey(userId);
    const userStore = this.store.get(userKey);
    
    if (!userStore) return null;
    
    const status = userStore.get(notificationId);
    return status ? status.readAt : null;
  }

  async cleanupExpired(ttlMs: number): Promise<number> {
    const cutoffTime = Date.now() - ttlMs;
    let count = 0;
    
    this.store.forEach((userStore) => {
      userStore.forEach((status, notificationId) => {
        if (status.readAt.getTime() < cutoffTime) {
          userStore.delete(notificationId);
          count++;
        }
      });
    });
    
    return count;
  }

  /** 清除所有数据（用于测试） */
  clear(): void {
    this.store.clear();
  }

  /** 获取统计信息 */
  getStats(): { totalUsers: number; totalReadStatuses: number } {
    let totalReadStatuses = 0;
    
    this.store.forEach(userStore => {
      totalReadStatuses += userStore.size;
    });
    
    return {
      totalUsers: this.store.size,
      totalReadStatuses,
    };
  }

  close(): void {
    this.clear();
  }
}

/**
 * SQLite 持久化存储实现
 * 使用 JSON 文件模拟 SQLite（生产环境应使用 better-sqlite3）
 */
class SQLiteReadStatusStore implements ReadStatusStore {
  private dbPath: string;
  private data: Map<string, Map<string, ReadStatus>> = new Map();
  private dirty = false;

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
        
        if (parsed && typeof parsed === 'object') {
          Object.entries(parsed).forEach(([userId, notifications]) => {
            const userMap = new Map<string, ReadStatus>();
            Object.entries(notifications as Record<string, { notificationId: string; userId: string; readAt: string }>).forEach(([notificationId, data]) => {
              userMap.set(notificationId, {
                notificationId: data.notificationId,
                userId: data.userId,
                readAt: new Date(data.readAt),
              });
            });
            this.data.set(userId, userMap);
          });
        }
        console.log(`[SQLiteReadStatusStore] Loaded ${this.getTotalCount()} records from ${this.dbPath}`);
      }
    } catch (error) {
      console.error('[SQLiteReadStatusStore] Failed to load data:', error);
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

      const dataObj: Record<string, Record<string, ReadStatus>> = {};
      this.data.forEach((userStore, userId) => {
        dataObj[userId] = {};
        userStore.forEach((status, notificationId) => {
          dataObj[userId][notificationId] = status;
        });
      });

      fs.writeFileSync(this.dbPath, JSON.stringify(dataObj, null, 2), 'utf-8');
      this.dirty = false;
    } catch (error) {
      console.error('[SQLiteReadStatusStore] Failed to save data:', error);
      throw new Error('Failed to save read status data');
    }
  }

  /**
   * 获取总记录数
   */
  private getTotalCount(): number {
    let count = 0;
    this.data.forEach(store => count += store.size);
    return count;
  }

  async markAsRead(notificationId: string, userId: string): Promise<void> {
    if (!this.data.has(userId)) {
      this.data.set(userId, new Map());
    }
    
    const userStore = this.data.get(userId)!;
    userStore.set(notificationId, {
      notificationId,
      userId,
      readAt: new Date(),
    });
    
    this.dirty = true;
    this.saveToFile();
  }

  async markMultipleAsRead(notificationIds: string[], userId: string): Promise<void> {
    const now = new Date();
    
    if (!this.data.has(userId)) {
      this.data.set(userId, new Map());
    }
    
    const userStore = this.data.get(userId)!;
    notificationIds.forEach(id => {
      userStore.set(id, {
        notificationId: id,
        userId,
        readAt: now,
      });
    });
    
    this.dirty = true;
    this.saveToFile();
  }

  async isRead(notificationId: string, userId: string): Promise<boolean> {
    const userStore = this.data.get(userId);
    return userStore?.has(notificationId) ?? false;
  }

  async getUserReadNotifications(userId: string): Promise<Set<string>> {
    const userStore = this.data.get(userId);
    return userStore ? new Set(userStore.keys()) : new Set();
  }

  async getUnreadCount(notificationIds: string[], userId: string): Promise<number> {
    const readNotifications = await this.getUserReadNotifications(userId);
    return notificationIds.filter(id => !readNotifications.has(id)).length;
  }

  async getReadAt(notificationId: string, userId: string): Promise<Date | null> {
    const userStore = this.data.get(userId);
    const status = userStore?.get(notificationId);
    return status?.readAt ?? null;
  }

  async cleanupExpired(ttlMs: number): Promise<number> {
    const cutoffTime = Date.now() - ttlMs;
    let count = 0;
    
    this.data.forEach((userStore, userId) => {
      userStore.forEach((status, notificationId) => {
        if (status.readAt.getTime() < cutoffTime) {
          userStore.delete(notificationId);
          count++;
        }
      });
      
      // 清理空的用户存储
      if (userStore.size === 0) {
        this.data.delete(userId);
      }
    });
    
    if (count > 0) {
      this.dirty = true;
      this.saveToFile();
    }
    
    return count;
  }

  close(): void {
    if (this.dirty) {
      this.saveToFile();
    }
    this.data.clear();
  }

  /**
   * 获取统计信息
   */
  getStats(): { totalUsers: number; totalReadStatuses: number; dbPath: string } {
    return {
      totalUsers: this.data.size,
      totalReadStatuses: this.getTotalCount(),
      dbPath: this.dbPath,
    };
  }
}

/** 存储类型 */
export type ReadStatusStoreType = 'memory' | 'sqlite';

/** 存储配置 */
export interface ReadStatusStoreConfig {
  type: ReadStatusStoreType;
  dbPath?: string;
}

// 默认使用内存存储
let storeInstance: ReadStatusStore = new InMemoryReadStatusStore();
let currentConfig: ReadStatusStoreConfig = { type: 'memory' };

/**
 * 初始化已读状态存储
 * @param config 存储配置
 */
export function initializeReadStatusStore(config: ReadStatusStoreConfig): ReadStatusStore {
  // 关闭现有存储
  if (storeInstance.close) {
    storeInstance.close();
  }
  
  currentConfig = config;
  
  if (config.type === 'sqlite') {
    const dbPath = config.dbPath || process.env.READ_STATUS_DB_PATH || '/root/.openclaw/workspace/app/data/read-status.db';
    storeInstance = new SQLiteReadStatusStore(dbPath);
    console.log(`[ReadStatusStore] Initialized SQLite storage at ${dbPath}`);
  } else {
    storeInstance = new InMemoryReadStatusStore();
    console.log('[ReadStatusStore] Initialized in-memory storage');
  }
  
  return storeInstance;
}

/**
 * 获取已读状态存储实例
 */
export function getReadStatusStore(): ReadStatusStore {
  return storeInstance;
}

/**
 * 获取当前存储配置
 */
export function getReadStatusStoreConfig(): ReadStatusStoreConfig {
  return { ...currentConfig };
}

/**
 * 重置存储（用于测试）
 */
export function resetReadStatusStore(): void {
  if (storeInstance.close) {
    storeInstance.close();
  }
  storeInstance = new InMemoryReadStatusStore();
  currentConfig = { type: 'memory' };
}

// 默认导出内存存储实例（向后兼容）
export const readStatusStore: ReadStatusStore = {
  markAsRead: async (notificationId, userId) => storeInstance.markAsRead(notificationId, userId),
  markMultipleAsRead: async (notificationIds, userId) => storeInstance.markMultipleAsRead(notificationIds, userId),
  isRead: async (notificationId, userId) => storeInstance.isRead(notificationId, userId),
  getUserReadNotifications: async (userId) => storeInstance.getUserReadNotifications(userId),
  getUnreadCount: async (notificationIds, userId) => storeInstance.getUnreadCount(notificationIds, userId),
  getReadAt: async (notificationId, userId) => storeInstance.getReadAt(notificationId, userId),
  cleanupExpired: async (ttlMs) => storeInstance.cleanupExpired?.(ttlMs) ?? 0,
  close: () => storeInstance.close?.(),
};

// 导出类以供扩展
export { InMemoryReadStatusStore, SQLiteReadStatusStore };