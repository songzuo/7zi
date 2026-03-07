/**
 * 已读标记管理模块
 * Read Status Management Module
 */

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
}

// 导出单例实例
export const readStatusStore = new InMemoryReadStatusStore();

// 导出类以供扩展（如数据库存储）
export { InMemoryReadStatusStore };