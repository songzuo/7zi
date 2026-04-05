/**
 * React Hooks for Notification System
 *
 * 提供便捷的 React Hooks 来使用通知系统
 *
 * @package 7zi-frontend
 * @version v1.12.2
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import type {
  Notification,
  NotificationType,
  NotificationPriority,
  NotificationGroup,
  NotificationStats,
} from './notification-types'
import {
  clientNotificationManager,
  type NotificationEvent,
  type NotificationEventListener,
} from './client-notification-manager'

/**
 * 使用通知列表
 */
export function useNotifications(filters?: {
  userId?: string
  teamId?: string
  taskId?: string
  type?: NotificationType | NotificationType[]
  priority?: NotificationPriority | NotificationPriority[]
  read?: boolean
  since?: number
  limit?: number
  offset?: number
}) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const result = await clientNotificationManager.getNotifications(filters)
      setNotifications(result)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load notifications'))
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    loadNotifications()

    // 监听新通知
    const handleNotification: NotificationEventListener = async (event, data) => {
      if (event === 'notification:received') {
        await loadNotifications()
      }
    }

    clientNotificationManager.on('notification:received', handleNotification)

    return () => {
      clientNotificationManager.off('notification:received', handleNotification)
    }
  }, [loadNotifications])

  return {
    notifications,
    loading,
    error,
    refresh: loadNotifications,
  }
}

/**
 * 使用通知分组
 */
export function useNotificationGroups(filters?: {
  userId?: string
  teamId?: string
  taskId?: string
  type?: NotificationType | NotificationType[]
  priority?: NotificationPriority | NotificationPriority[]
  limit?: number
  offset?: number
}) {
  const [groups, setGroups] = useState<NotificationGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const loadGroups = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const result = await clientNotificationManager.getGroups(filters)
      setGroups(result)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load notification groups'))
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    loadGroups()

    // 监听新通知
    const handleNotification: NotificationEventListener = async (event, data) => {
      if (event === 'notification:received' || event === 'group:created' || event === 'group:updated') {
        await loadGroups()
      }
    }

    clientNotificationManager.on('notification:received', handleNotification)
    clientNotificationManager.on('group:created', handleNotification)
    clientNotificationManager.on('group:updated', handleNotification)

    return () => {
      clientNotificationManager.off('notification:received', handleNotification)
      clientNotificationManager.off('group:created', handleNotification)
      clientNotificationManager.off('group:updated', handleNotification)
    }
  }, [loadGroups])

  return {
    groups,
    loading,
    error,
    refresh: loadGroups,
  }
}

/**
 * 使用未读数量
 */
export function useUnreadCount(userId?: string) {
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const loadCount = useCallback(async () => {
    try {
      setLoading(true)
      const result = await clientNotificationManager.getUnreadCount(userId)
      setCount(result)
    } catch (err) {
      console.error('Failed to load unread count:', err)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    loadCount()

    // 监听通知变化
    const handleNotification: NotificationEventListener = async (event, data) => {
      if (event === 'notification:received' || event === 'notification:read' || event === 'stats:changed') {
        await loadCount()
      }
    }

    clientNotificationManager.on('notification:received', handleNotification)
    clientNotificationManager.on('notification:read', handleNotification)
    clientNotificationManager.on('stats:changed', handleNotification)

    return () => {
      clientNotificationManager.off('notification:received', handleNotification)
      clientNotificationManager.off('notification:read', handleNotification)
      clientNotificationManager.off('stats:changed', handleNotification)
    }
  }, [loadCount])

  return {
    count,
    loading,
    refresh: loadCount,
  }
}

/**
 * 使用通知统计
 */
export function useNotificationStats() {
  const [stats, setStats] = useState<NotificationStats | null>(null)
  const [loading, setLoading] = useState(true)

  const loadStats = useCallback(async () => {
    try {
      setLoading(true)
      const result = await clientNotificationManager.getStats()
      setStats(result)
    } catch (err) {
      console.error('Failed to load notification stats:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadStats()

    // 监听统计变化
    const handleStats: NotificationEventListener = async (event, data) => {
      if (event === 'stats:changed') {
        setStats(data as NotificationStats)
      }
    }

    clientNotificationManager.on('stats:changed', handleStats)

    return () => {
      clientNotificationManager.off('stats:changed', handleStats)
    }
  }, [loadStats])

  return {
    stats,
    loading,
    refresh: loadStats,
  }
}

/**
 * 使用通知操作
 */
export function useNotificationActions() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const markAsRead = useCallback(async (id: string) => {
    try {
      setLoading(true)
      setError(null)
      await clientNotificationManager.markAsRead(id)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to mark as read'))
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const markAllAsRead = useCallback(async (userId?: string) => {
    try {
      setLoading(true)
      setError(null)
      return await clientNotificationManager.markAllAsRead(userId)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to mark all as read'))
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const deleteNotification = useCallback(async (id: string) => {
    try {
      setLoading(true)
      setError(null)
      await clientNotificationManager.deleteNotification(id)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to delete notification'))
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const deleteNotifications = useCallback(async (ids: string[]) => {
    try {
      setLoading(true)
      setError(null)
      return await clientNotificationManager.deleteNotifications(ids)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to delete notifications'))
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const cleanupExpired = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      return await clientNotificationManager.cleanupExpired()
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to cleanup expired notifications'))
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteNotifications,
    cleanupExpired,
    loading,
    error,
  }
}

/**
 * 使用用户通知偏好设置
 */
export function useNotificationPreferences(userId: string) {
  const [preferences, setPreferences] = useState<Awaited<
    ReturnType<typeof clientNotificationManager.getUserPreferences>
  > | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const loadPreferences = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await clientNotificationManager.getUserPreferences(userId)
      setPreferences(result)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load preferences'))
    } finally {
      setLoading(false)
    }
  }, [userId])

  const savePreferences = useCallback(
    async (prefs: {
      emailEnabled?: boolean
      emailThreshold?: NotificationPriority
      pushEnabled?: boolean
      pushThreshold?: NotificationPriority
      digestEnabled?: boolean
      digestFrequency?: 'hourly' | 'daily' | 'weekly'
      quietHoursStart?: string
      quietHoursEnd?: string
      timezone?: string
    }) => {
      try {
        setLoading(true)
        setError(null)
        await clientNotificationManager.saveUserPreferences(userId, prefs)
        await loadPreferences()
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to save preferences'))
        throw err
      } finally {
        setLoading(false)
      }
    },
    [userId, loadPreferences]
  )

  useEffect(() => {
    loadPreferences()
  }, [loadPreferences])

  return {
    preferences,
    loading,
    error,
    savePreferences,
    refresh: loadPreferences,
  }
}

/**
 * 使用免打扰状态
 */
export function useQuietHours(userId: string) {
  const [isActive, setIsActive] = useState(false)
  const [loading, setLoading] = useState(true)

  const checkStatus = useCallback(async () => {
    try {
      setLoading(true)
      const result = await clientNotificationManager.isQuietHoursActive(userId)
      setIsActive(result)
    } catch (err) {
      console.error('Failed to check quiet hours:', err)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    checkStatus()

    // 每分钟检查一次
    const interval = setInterval(checkStatus, 60 * 1000)

    return () => clearInterval(interval)
  }, [checkStatus])

  return {
    isActive,
    loading,
    refresh: checkStatus,
  }
}

/**
 * 使用实时通知监听
 */
export function useNotificationListener(
  event: NotificationEvent,
  listener: NotificationEventListener,
  deps: unknown[] = []
) {
  const listenerRef = useRef(listener)

  // 更新 listener 引用
  useEffect(() => {
    listenerRef.current = listener
  }, [listener])

  useEffect(() => {
    const wrappedListener: NotificationEventListener = (event, data) => {
      listenerRef.current(event, data)
    }

    clientNotificationManager.on(event, wrappedListener)

    return () => {
      clientNotificationManager.off(event, wrappedListener)
    }
  }, [event, ...deps])
}

/**
 * 使用通知中心（组合 Hook）
 */
export function useNotificationCenter(userId?: string) {
  const notifications = useNotifications({ userId })
  const groups = useNotificationGroups({ userId })
  const unreadCount = useUnreadCount(userId)
  const stats = useNotificationStats()
  const actions = useNotificationActions()
  const preferences = useNotificationPreferences(userId || 'default')
  const quietHours = useQuietHours(userId || 'default')

  return {
    // 数据
    notifications: notifications.notifications,
    groups: groups.groups,
    unreadCount: unreadCount.count,
    stats: stats.stats,
    preferences: preferences.preferences,

    // 状态
    loading: notifications.loading || groups.loading || stats.loading,
    error: notifications.error || groups.error || stats.error || preferences.error,
    quietHoursActive: quietHours.isActive,

    // 操作
    refresh: () => {
      notifications.refresh()
      groups.refresh()
      unreadCount.refresh()
      stats.refresh()
    },
    markAsRead: actions.markAsRead,
    markAllAsRead: actions.markAllAsRead,
    deleteNotification: actions.deleteNotification,
    deleteNotifications: actions.deleteNotifications,
    cleanupExpired: actions.cleanupExpired,
    savePreferences: preferences.savePreferences,
  }
}