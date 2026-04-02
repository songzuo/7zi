/**
 * 已读状态存储
 *
 * 管理通知的已读/未读状态
 */

// ============================================================================
// 类型定义
// ============================================================================

interface ReadStatus {
  notificationId: string
  userId: string
  readAt: Date
}

// ============================================================================
// 已读状态存储类
// ============================================================================

class ReadStatusStore {
  private readStatuses: Map<string, Map<string, ReadStatus>> = new Map()
  // Map<userId, Map<notificationId, ReadStatus>>

  /**
   * 标记多个通知为已读
   */
  async markMultipleAsRead(notificationIds: string[], userId: string): Promise<void> {
    if (!this.readStatuses.has(userId)) {
      this.readStatuses.set(userId, new Map())
    }

    const userStatuses = this.readStatuses.get(userId)!
    const now = new Date()

    notificationIds.forEach(id => {
      userStatuses.set(id, {
        notificationId: id,
        userId,
        readAt: now,
      })
    })
  }

  /**
   * 标记单个通知为已读
   */
  async markAsRead(notificationId: string, userId: string): Promise<void> {
    await this.markMultipleAsRead([notificationId], userId)
  }

  /**
   * 获取未读通知数量
   */
  async getUnreadCount(userId: string): Promise<number> {
    // Mock implementation - 返回 0 表示所有通知都已读
    // 在实际实现中，这会查询数据库或状态管理器
    return 0
  }

  /**
   * 检查通知是否已读
   */
  isRead(notificationId: string, userId: string): boolean {
    return this.readStatuses.get(userId)?.has(notificationId) || false
  }

  /**
   * 获取用户的所有已读通知ID
   */
  getReadNotificationIds(userId: string): string[] {
    const userStatuses = this.readStatuses.get(userId)
    return userStatuses ? Array.from(userStatuses.keys()) : []
  }

  /**
   * 清除用户的已读状态（用于测试）
   */
  clearUserReadStatus(userId: string): void {
    this.readStatuses.delete(userId)
  }

  /**
   * 清除所有已读状态（用于测试）
   */
  clearAll(): void {
    this.readStatuses.clear()
  }
}

// 单例导出
export const readStatusStore = new ReadStatusStore()

export default ReadStatusStore
