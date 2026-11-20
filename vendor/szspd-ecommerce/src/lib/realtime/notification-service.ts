/**
 * 实时通知服务
 *
 * 统一的通知服务，整合 WebSocket 和本地通知
 */

import { notificationServer } from './server'
import { readStatusStore } from './read-status'
import type {
  WebSocketMessage,
  RealtimeNotificationType,
  TaskStatusChangedPayload,
  TaskAssignedPayload,
  TaskCommentPayload,
  MemberOnlinePayload,
  MemberOfflinePayload,
  MemberStatusChangedPayload,
  ProjectUpdatedPayload,
  SystemAnnouncementPayload,
} from './types'

// ============================================================================
// 类型定义
// ============================================================================

export interface NotificationEvent {
  id: string
  type: RealtimeNotificationType
  title: string
  message: string
  timestamp: string
  priority: 'low' | 'normal' | 'high' | 'urgent'
  data?: Record<string, unknown>
  actionUrl?: string
  actionText?: string
  icon?: string
  avatar?: string
  sender?: {
    id: string
    name: string
    avatar?: string
  }
}

export interface NotificationSubscription {
  id: string
  userId: string
  channels: string[]
  callback: (notification: NotificationEvent) => void
}

export interface BroadcastOptions {
  channels?: string[]
  userIds?: string[]
  excludeUserIds?: string[]
  priority?: 'low' | 'normal' | 'high' | 'urgent'
  persistent?: boolean
  ttl?: number // Time to live in seconds
}

export interface OfflineQueueEntry {
  notification: NotificationEvent
  userId: string
  timestamp: number
  attempts: number
  lastAttempt: number
}

export interface NotificationError {
  code: string
  message: string
  notificationId?: string
  userId?: string
  timestamp: number
}

// ============================================================================
// 通知服务类
// ============================================================================

class NotificationService {
  private subscriptions: Map<string, NotificationSubscription> = new Map()
  private notificationHistory: Map<string, NotificationEvent[]> = new Map()
  private maxHistoryPerUser = 100

  // 离线队列
  private offlineQueue: Map<string, OfflineQueueEntry[]> = new Map()
  private maxOfflineQueuePerUser = 50
  private queueProcessingInterval?: NodeJS.Timeout
  private isProcessingQueue = false

  // 错误处理
  private errorLog: NotificationError[] = []
  private maxErrorLogSize = 100
  private errorCallbacks: Set<(error: NotificationError) => void> = new Set()

  constructor() {
    // 启动离线队列处理
    this.startQueueProcessing()
  }

  // ============================================================================
  // 离线队列管理
  // ============================================================================

  /**
   * 启动离线队列处理
   */
  private startQueueProcessing(): void {
    if (this.queueProcessingInterval) {
      clearInterval(this.queueProcessingInterval)
    }

    this.queueProcessingInterval = setInterval(() => {
      this.processOfflineQueue()
    }, 30000) // 每 30 秒处理一次离线队列
  }

  /**
   * 停止离线队列处理
   */
  private stopQueueProcessing(): void {
    if (this.queueProcessingInterval) {
      clearInterval(this.queueProcessingInterval)
      this.queueProcessingInterval = undefined
    }
  }

  /**
   * 处理离线队列
   */
  private async processOfflineQueue(): Promise<void> {
    if (this.isProcessingQueue) {
      return
    }

    this.isProcessingQueue = true

    try {
      for (const [userId, entries] of this.offlineQueue.entries()) {
        // 检查用户是否在线
        if (notificationServer.isUserOnline(userId)) {
          const processed: string[] = []

          for (const entry of entries) {
            try {
              // 重试发送通知
              await this.sendNotificationToUser(entry.notification, userId)
              processed.push(entry.notification.id)
            } catch (error) {
              // 记录错误并增加重试次数
              entry.attempts++
              entry.lastAttempt = Date.now()

              // 如果超过最大重试次数，从队列中移除
              if (entry.attempts >= 3) {
                processed.push(entry.notification.id)
                this.logError({
                  code: 'OFFLINE_QUEUE_MAX_ATTEMPTS',
                  message: `Failed to deliver notification after ${entry.attempts} attempts`,
                  notificationId: entry.notification.id,
                  userId,
                  timestamp: Date.now(),
                })
              }
            }
          }

          // 从队列中移除已处理的通知
          if (processed.length > 0) {
            this.offlineQueue.set(
              userId,
              entries.filter(e => !processed.includes(e.notification.id))
            )
          }

          // 如果队列为空，删除用户条目
          if (this.offlineQueue.get(userId)!.length === 0) {
            this.offlineQueue.delete(userId)
          }
        }
      }
    } catch (error) {
      console.error('[NotificationService] Error processing offline queue:', error)
    } finally {
      this.isProcessingQueue = false
    }
  }

  /**
   * 添加到离线队列
   */
  private addToOfflineQueue(userId: string, notification: NotificationEvent): void {
    if (!this.offlineQueue.has(userId)) {
      this.offlineQueue.set(userId, [])
    }

    const queue = this.offlineQueue.get(userId)!
    const entry: OfflineQueueEntry = {
      notification,
      userId,
      timestamp: Date.now(),
      attempts: 0,
      lastAttempt: 0,
    }

    queue.push(entry)

    // 限制队列大小
    if (queue.length > this.maxOfflineQueuePerUser) {
      this.offlineQueue.set(userId, queue.slice(-this.maxOfflineQueuePerUser))
    }
  }

  /**
   * 获取用户的离线队列
   */
  getOfflineQueue(userId: string): OfflineQueueEntry[] {
    return this.offlineQueue.get(userId) || []
  }

  /**
   * 清空用户的离线队列
   */
  clearOfflineQueue(userId: string): void {
    this.offlineQueue.delete(userId)
  }

  /**
   * 手动触发队列处理
   */
  async processQueueNow(): Promise<void> {
    await this.processOfflineQueue()
  }

  // ============================================================================
  // 错误处理
  // ============================================================================

  /**
   * 记录错误
   */
  private logError(error: NotificationError): void {
    this.errorLog.push(error)

    // 限制错误日志大小
    if (this.errorLog.length > this.maxErrorLogSize) {
      this.errorLog = this.errorLog.slice(-this.maxErrorLogSize)
    }

    // 触发错误回调
    this.errorCallbacks.forEach(callback => {
      try {
        callback(error)
      } catch (err) {
        console.error('[NotificationService] Error in error callback:', err)
      }
    })
  }

  /**
   * 获取错误日志
   */
  getErrorLog(limit = 50): NotificationError[] {
    return this.errorLog.slice(-limit)
  }

  /**
   * 清空错误日志
   */
  clearErrorLog(): void {
    this.errorLog = []
  }

  /**
   * 添加错误回调
   */
  onError(callback: (error: NotificationError) => void): () => void {
    this.errorCallbacks.add(callback)
    return () => {
      this.errorCallbacks.delete(callback)
    }
  }

  /**
   * 安全发送通知到用户
   */
  private async sendNotificationToUser(
    notification: NotificationEvent,
    userId: string
  ): Promise<void> {
    try {
      const message: WebSocketMessage = {
        type: this.mapNotificationTypeToMessageType(notification.type),
        id: notification.id,
        timestamp: notification.timestamp,
        payload: {
          title: notification.title,
          message: notification.message,
          priority: notification.priority,
          data: notification.data,
          actionUrl: notification.actionUrl,
          actionText: notification.actionText,
          icon: notification.icon,
          avatar: notification.avatar,
          sender: notification.sender,
        },
      }

      notificationServer.sendToUser(userId, message)
    } catch (error) {
      this.logError({
        code: 'SEND_NOTIFICATION_FAILED',
        message: error instanceof Error ? error.message : String(error),
        notificationId: notification.id,
        userId,
        timestamp: Date.now(),
      })
      throw error
    }
  }

  private mapNotificationTypeToMessageType(type: RealtimeNotificationType): string {
    const map: Record<RealtimeNotificationType, string> = {
      task_status_changed: 'task:status_changed',
      task_assigned: 'task:assigned',
      task_comment: 'task:comment',
      member_online: 'member:online',
      member_offline: 'member:offline',
      member_status_changed: 'member:status_changed',
      system_announcement: 'system:announcement',
      project_updated: 'project:updated',
    }
    return map[type] || 'notification'
  }

  // ============================================================================
  // 通知发送方法
  // ============================================================================

  /**
   * 发送任务状态变更通知
   */
  async notifyTaskStatusChange(options: {
    taskId: string
    taskTitle: string
    oldStatus: string
    newStatus: string
    changedBy: { id: string; name: string; avatar?: string }
    projectId?: string
    projectName?: string
    assigneeId?: string
  }): Promise<void> {
    try {
      const event = this.createEventFromMessage({
        type: 'task:status_changed',
        id: `task-status-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        payload: {
          taskId: options.taskId,
          taskTitle: options.taskTitle,
          oldStatus: options.oldStatus,
          newStatus: options.newStatus,
          changedBy: options.changedBy,
          projectId: options.projectId,
          projectName: options.projectName,
        },
      })

      // 发送到项目频道
      if (options.projectId) {
        notificationServer.broadcastToChannel(`project:${options.projectId}`, {
          type: 'task:status_changed',
          id: event.id,
          timestamp: event.timestamp,
          payload: {
            title: event.title,
            message: event.message,
            priority: event.priority,
            data: event.data,
            actionUrl: event.actionUrl,
            actionText: event.actionText,
            icon: event.icon,
          },
        })
      }

      // 如果有分配者，单独发送
      if (options.assigneeId) {
        if (notificationServer.isUserOnline(options.assigneeId)) {
          await this.sendNotificationToUser(event, options.assigneeId)
        } else {
          this.addToOfflineQueue(options.assigneeId, event)
        }
      }

      // 广播到任务频道
      notificationServer.broadcastToChannel(`task:${options.taskId}`, {
        type: 'task:status_changed',
        id: event.id,
        timestamp: event.timestamp,
        payload: {
          title: event.title,
          message: event.message,
          priority: event.priority,
          data: event.data,
          actionUrl: event.actionUrl,
          actionText: event.actionText,
          icon: event.icon,
        },
      })

      // 记录历史
      this.addToHistory('task_status_changed', event)
    } catch (error) {
      this.logError({
        code: 'NOTIFY_TASK_STATUS_FAILED',
        message: error instanceof Error ? error.message : String(error),
        timestamp: Date.now(),
      })
      throw error
    }
  }

  /**
   * 发送任务分配通知
   */
  async notifyTaskAssignment(options: {
    taskId: string
    taskTitle: string
    assignedTo: { id: string; name: string }
    assignedBy: { id: string; name: string; avatar?: string }
    projectId?: string
    projectName?: string
    priority?: 'low' | 'normal' | 'high' | 'urgent'
    dueDate?: string
  }): Promise<void> {
    try {
      const event = this.createEventFromMessage({
        type: 'task:assigned',
        id: `task-assign-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        payload: {
          taskId: options.taskId,
          taskTitle: options.taskTitle,
          assignedTo: options.assignedTo,
          assignedBy: options.assignedBy,
          projectId: options.projectId,
          projectName: options.projectName,
          priority: options.priority,
          dueDate: options.dueDate,
        },
      })

      // 发送给被分配的用户
      if (notificationServer.isUserOnline(options.assignedTo.id)) {
        await this.sendNotificationToUser(event, options.assignedTo.id)
      } else {
        this.addToOfflineQueue(options.assignedTo.id, event)
      }

      // 如果有项目，发送到项目频道
      if (options.projectId) {
        notificationServer.broadcastToChannel(`project:${options.projectId}`, {
          type: 'task:assigned',
          id: event.id,
          timestamp: event.timestamp,
          payload: {
            title: event.title,
            message: event.message,
            priority: options.priority || 'high',
            data: event.data,
            actionUrl: event.actionUrl,
            actionText: event.actionText,
            icon: event.icon,
          },
        })
      }

      this.addToHistory('task_assigned', event)
    } catch (error) {
      this.logError({
        code: 'NOTIFY_TASK_ASSIGNMENT_FAILED',
        message: error instanceof Error ? error.message : String(error),
        timestamp: Date.now(),
      })
      throw error
    }
  }

  /**
   * 发送任务评论通知
   */
  async notifyTaskComment(options: {
    taskId: string
    taskTitle: string
    commentId: string
    content: string
    author: { id: string; name: string; avatar?: string }
    mentions?: Array<{ id: string; name: string }>
    projectId?: string
  }): Promise<void> {
    try {
      const event = this.createEventFromMessage({
        type: 'task:comment',
        id: `task-comment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        payload: {
          taskId: options.taskId,
          taskTitle: options.taskTitle,
          commentId: options.commentId,
          content: options.content,
          author: options.author,
          mentions: options.mentions,
          projectId: options.projectId,
        },
      })

      // 发送给所有被提及的用户
      if (options.mentions && options.mentions.length > 0) {
        for (const user of options.mentions) {
          if (notificationServer.isUserOnline(user.id)) {
            await this.sendNotificationToUser(event, user.id)
          } else {
            this.addToOfflineQueue(user.id, event)
          }
        }
      }

      // 发送到任务频道
      notificationServer.broadcastToChannel(`task:${options.taskId}`, {
        type: 'task:comment',
        id: event.id,
        timestamp: event.timestamp,
        payload: {
          title: event.title,
          message: event.message,
          priority: event.priority,
          data: event.data,
          actionUrl: event.actionUrl,
          actionText: event.actionText,
          icon: event.icon,
        },
      })

      // 发送到项目频道
      if (options.projectId) {
        notificationServer.broadcastToChannel(`project:${options.projectId}`, {
          type: 'task:comment',
          id: event.id,
          timestamp: event.timestamp,
          payload: {
            title: event.title,
            message: event.message,
            priority: event.priority,
            data: event.data,
            actionUrl: event.actionUrl,
            actionText: event.actionText,
            icon: event.icon,
          },
        })
      }

      this.addToHistory('task_comment', event)
    } catch (error) {
      this.logError({
        code: 'NOTIFY_TASK_COMMENT_FAILED',
        message: error instanceof Error ? error.message : String(error),
        timestamp: Date.now(),
      })
      throw error
    }
  }

  /**
   * 发送成员状态通知
   */
  notifyMemberStatus(options: {
    userId: string
    userName: string
    avatar?: string
    status: 'online' | 'offline' | 'away' | 'busy'
    previousStatus?: string
  }): void {
    try {
      const isOnline = options.status === 'online'
      const isOffline = options.status === 'offline'

      const message: WebSocketMessage = {
        type: isOnline ? 'member:online' : isOffline ? 'member:offline' : 'member:status_changed',
        id: `member-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        payload: {
          userId: options.userId,
          userName: options.userName,
          avatar: options.avatar,
          ...(isOffline ? { lastOnline: new Date().toISOString() } : {}),
          ...(!isOnline && !isOffline
            ? {
                oldStatus: options.previousStatus || 'offline',
                newStatus: options.status,
              }
            : {}),
        },
      }

      // 广播到团队频道
      notificationServer.broadcastToChannel('team', message)
      notificationServer.broadcast(message)

      const eventType = isOnline
        ? 'member_online'
        : isOffline
          ? 'member_offline'
          : 'member_status_changed'
      this.addToHistory(eventType, this.createEventFromMessage(message))
    } catch (error) {
      this.logError({
        code: 'NOTIFY_MEMBER_STATUS_FAILED',
        message: error instanceof Error ? error.message : String(error),
        timestamp: Date.now(),
      })
    }
  }

  /**
   * 发送系统公告
   */
  async broadcastSystemAnnouncement(options: {
    title: string
    content: string
    level: 'info' | 'warning' | 'critical' | 'maintenance'
    actionUrl?: string
    actionText?: string
    sender?: { id: string; name: string; role: string }
    targetUsers?: string[]
    expiresAt?: string
  }): Promise<void> {
    try {
      const event = this.createEventFromMessage({
        type: 'system:announcement',
        id: `sys-announce-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        payload: {
          title: options.title,
          content: options.content,
          level: options.level,
          actionUrl: options.actionUrl,
          actionText: options.actionText,
          sender: options.sender,
          expiresAt: options.expiresAt,
        },
      })

      if (options.targetUsers && options.targetUsers.length > 0) {
        // 发送给指定用户
        for (const userId of options.targetUsers) {
          if (notificationServer.isUserOnline(userId)) {
            await this.sendNotificationToUser(event, userId)
          } else {
            this.addToOfflineQueue(userId, event)
          }
        }
      } else {
        // 广播给所有用户
        notificationServer.broadcast({
          type: 'system:announcement',
          id: event.id,
          timestamp: event.timestamp,
          payload: {
            title: event.title,
            message: event.message,
            priority: 'high',
            data: event.data,
            actionUrl: event.actionUrl,
            actionText: event.actionText,
            icon: event.icon,
          },
        })
      }

      this.addToHistory('system_announcement', event)
    } catch (error) {
      this.logError({
        code: 'BROADCAST_ANNOUNCEMENT_FAILED',
        message: error instanceof Error ? error.message : String(error),
        timestamp: Date.now(),
      })
      throw error
    }
  }

  /**
   * 发送项目更新通知
   */
  async notifyProjectUpdate(options: {
    projectId: string
    projectName: string
    changeType: 'created' | 'updated' | 'deleted' | 'archived' | 'restored'
    changedBy: { id: string; name: string; avatar?: string }
    details?: string
    memberIds?: string[]
  }): Promise<void> {
    try {
      const event = this.createEventFromMessage({
        type: 'project:updated',
        id: `project-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        payload: {
          projectId: options.projectId,
          projectName: options.projectName,
          changeType: options.changeType,
          changedBy: options.changedBy,
          details: options.details,
        },
      })

      // 发送到项目频道
      notificationServer.broadcastToChannel(`project:${options.projectId}`, {
        type: 'project:updated',
        id: event.id,
        timestamp: event.timestamp,
        payload: {
          title: event.title,
          message: event.message,
          priority: event.priority,
          data: event.data,
          actionUrl: event.actionUrl,
          actionText: event.actionText,
          icon: event.icon,
        },
      })

      // 发送给项目成员
      if (options.memberIds && options.memberIds.length > 0) {
        for (const userId of options.memberIds) {
          if (notificationServer.isUserOnline(userId)) {
            await this.sendNotificationToUser(event, userId)
          } else {
            this.addToOfflineQueue(userId, event)
          }
        }
      }

      this.addToHistory('project_updated', event)
    } catch (error) {
      this.logError({
        code: 'NOTIFY_PROJECT_UPDATE_FAILED',
        message: error instanceof Error ? error.message : String(error),
        timestamp: Date.now(),
      })
      throw error
    }
  }

  /**
   * 发送自定义通知
   */
  async sendCustomNotification(options: {
    type: string
    title: string
    message: string
    data?: Record<string, unknown>
    priority?: 'low' | 'normal' | 'high' | 'urgent'
    actionUrl?: string
    actionText?: string
    icon?: string
    target?: BroadcastOptions
  }): Promise<void> {
    try {
      const event: NotificationEvent = {
        id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'system_announcement' as RealtimeNotificationType,
        title: options.title,
        message: options.message,
        timestamp: new Date().toISOString(),
        priority: options.priority || 'normal',
        data: options.data,
        actionUrl: options.actionUrl,
        actionText: options.actionText,
        icon: options.icon,
      }

      const wsMessage: WebSocketMessage = {
        type: options.type,
        id: event.id,
        timestamp: event.timestamp,
        payload: {
          title: event.title,
          message: event.message,
          priority: event.priority,
          data: event.data,
          actionUrl: event.actionUrl,
          actionText: event.actionText,
          icon: event.icon,
        },
      }

      if (options.target) {
        // 发送到指定频道
        if (options.target.channels) {
          options.target.channels.forEach(channel => {
            notificationServer.broadcastToChannel(channel, wsMessage)
          })
        }

        // 发送给指定用户
        if (options.target.userIds) {
          for (const userId of options.target.userIds) {
            if (!options.target.excludeUserIds?.includes(userId)) {
              if (notificationServer.isUserOnline(userId)) {
                await this.sendNotificationToUser(event, userId)
              } else {
                this.addToOfflineQueue(userId, event)
              }
            }
          }
        }
      } else {
        // 广播给所有人
        notificationServer.broadcast(wsMessage)
      }
    } catch (error) {
      this.logError({
        code: 'SEND_CUSTOM_NOTIFICATION_FAILED',
        message: error instanceof Error ? error.message : String(error),
        timestamp: Date.now(),
      })
      throw error
    }
  }

  /**
   * 获取用户的通知历史
   */
  getNotificationHistory(userId: string, limit = 50): NotificationEvent[] {
    const history = this.notificationHistory.get(userId) || []
    return history.slice(0, limit)
  }

  /**
   * 标记通知为已读
   */
  async markAsRead(notificationIds: string[], userId: string): Promise<void> {
    await readStatusStore.markMultipleAsRead(notificationIds, userId)
  }

  /**
   * 获取未读通知数量
   */
  async getUnreadCount(userId: string): Promise<number> {
    return readStatusStore.getUnreadCount(userId)
  }

  /**
   * 检查用户是否在线
   */
  isUserOnline(userId: string): boolean {
    return notificationServer.isUserOnline(userId)
  }

  /**
   * 获取在线用户列表
   */
  getOnlineUsers(): string[] {
    return notificationServer.getOnlineUsers()
  }

  // ============================================================================
  // 私有方法
  // ============================================================================

  private createEventFromMessage(message: WebSocketMessage): NotificationEvent {
    const payload = message.payload as Record<string, unknown>

    return {
      id: message.id,
      type: this.mapMessageType(message.type),
      title: this.getTitleForType(message.type, payload),
      message: this.getMessageForType(message.type, payload),
      timestamp: message.timestamp,
      priority: this.getPriorityForType(message.type),
      data: payload,
      actionUrl: this.getActionUrl(message.type, payload),
      actionText: this.getActionText(message.type),
      icon: this.getIconForType(message.type),
    }
  }

  private mapMessageType(type: string): RealtimeNotificationType {
    const map: Record<string, RealtimeNotificationType> = {
      'task:status_changed': 'task_status_changed',
      'task:assigned': 'task_assigned',
      'task:comment': 'task_comment',
      'member:online': 'member_online',
      'member:offline': 'member_offline',
      'member:status_changed': 'member_status_changed',
      'system:announcement': 'system_announcement',
      'project:updated': 'project_updated',
    }
    return map[type] || 'system_announcement'
  }

  private getTitleForType(type: string, payload: Record<string, unknown>): string {
    switch (type) {
      case 'task:status_changed':
        return '任务状态更新'
      case 'task:assigned':
        return '新任务分配'
      case 'task:comment':
        return '任务新评论'
      case 'member:online':
        return '成员上线'
      case 'member:offline':
        return '成员离线'
      case 'member:status_changed':
        return '成员状态变更'
      case 'system:announcement':
        return (payload.title as string) || '系统公告'
      case 'project:updated':
        return '项目更新'
      default:
        return '新通知'
    }
  }

  private getMessageForType(type: string, payload: Record<string, unknown>): string {
    switch (type) {
      case 'task:status_changed': {
        const p = payload as unknown as TaskStatusChangedPayload
        return `${p.taskTitle} 从 ${p.oldStatus} 变更为 ${p.newStatus}`
      }
      case 'task:assigned': {
        const p = payload as unknown as TaskAssignedPayload
        return `${p.assignedBy.name} 将 "${p.taskTitle}" 分配给了 ${p.assignedTo.name}`
      }
      case 'task:comment': {
        const p = payload as unknown as TaskCommentPayload
        return `${p.author.name}: ${p.content?.slice(0, 50)}${p.content?.length > 50 ? '...' : ''}`
      }
      case 'member:online': {
        const p = payload as unknown as MemberOnlinePayload
        return `${p.userName} 已上线`
      }
      case 'member:offline': {
        const p = payload as unknown as MemberOfflinePayload
        return `${p.userName} 已离线`
      }
      case 'member:status_changed': {
        const p = payload as unknown as MemberStatusChangedPayload
        return `${p.userName} 状态变更为 ${p.newStatus}`
      }
      case 'system:announcement':
        return (payload.content as string) || ''
      case 'project:updated': {
        const p = payload as unknown as ProjectUpdatedPayload
        const action = {
          created: '创建',
          updated: '更新',
          deleted: '删除',
          archived: '归档',
          restored: '恢复',
        }
        return `${p.changedBy.name} ${action[p.changeType] || '更新'}了项目 "${p.projectName}"`
      }
      default:
        return ''
    }
  }

  private getPriorityForType(type: string): 'low' | 'normal' | 'high' | 'urgent' {
    switch (type) {
      case 'system:announcement':
        return 'high'
      case 'task:assigned':
        return 'high'
      case 'task:comment':
      case 'task:status_changed':
        return 'normal'
      case 'member:online':
      case 'member:offline':
      case 'member:status_changed':
        return 'low'
      default:
        return 'normal'
    }
  }

  private getActionUrl(type: string, payload: Record<string, unknown>): string | undefined {
    switch (type) {
      case 'task:status_changed':
      case 'task:assigned':
      case 'task:comment':
        return `/tasks/${(payload as unknown as TaskStatusChangedPayload).taskId}`
      case 'project:updated':
        return `/projects/${(payload as unknown as ProjectUpdatedPayload).projectId}`
      case 'system:announcement':
        return (payload as unknown as SystemAnnouncementPayload).actionUrl
      default:
        return undefined
    }
  }

  private getActionText(type: string): string | undefined {
    switch (type) {
      case 'task:status_changed':
      case 'task:assigned':
        return '查看任务'
      case 'task:comment':
        return '查看评论'
      case 'project:updated':
        return '查看项目'
      case 'system:announcement':
        return '查看详情'
      default:
        return undefined
    }
  }

  private getIconForType(type: string): string {
    switch (type) {
      case 'task:status_changed':
        return '📋'
      case 'task:assigned':
        return '📌'
      case 'task:comment':
        return '💬'
      case 'member:online':
        return '🟢'
      case 'member:offline':
        return '⚫'
      case 'member:status_changed':
        return '🔄'
      case 'system:announcement':
        return '📢'
      case 'project:updated':
        return '📁'
      default:
        return '🔔'
    }
  }

  private addToHistory(_type: RealtimeNotificationType, _event: NotificationEvent): void {
    // 这里可以添加到数据库或持久化存储
    // 目前只在内存中保存
  }

  /**
   * 清理服务（用于测试或关闭时）
   */
  destroy(): void {
    this.stopQueueProcessing()
    this.offlineQueue.clear()
    this.errorLog = []
    this.subscriptions.clear()
    this.notificationHistory.clear()
    this.errorCallbacks.clear()
  }
}

// 单例导出
export const notificationService = new NotificationService()

export default NotificationService
