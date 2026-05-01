/**
 * useNotificationsStable Hook
 *
 * Stable React hook for real-time notification management using WebSocketManager
 * Provides:
 * - Automatic reconnection with exponential backoff
 * - Heartbeat monitoring
 * - Message queuing during disconnection
 * - Connection state tracking
 */

'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import type {
  Notification,
  NotificationType,
  NotificationPriority,
  NotificationFilter,
} from '@/lib/services/notification'
import { WebSocketManager, ConnectionState } from '@/lib/websocket-manager'

/**
 * useNotifications hook options
 */
export interface UseNotificationsStableOptions {
  autoConnect?: boolean
  userId?: string
  teamId?: string
  channels?: string[]
  socketUrl?: string
  auth?: Record<string, unknown>
}

/**
 * Hook return value
 */
export interface UseNotificationsStableReturn {
  notifications: Notification[]
  unreadCount: number
  connectionState: ConnectionState
  isConnected: boolean
  isReconnecting: boolean
  queueSize: number
  connect: () => void
  disconnect: () => void
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  deleteNotification: (id: string) => void
  refreshNotifications: (filter?: NotificationFilter) => Promise<void>
}

export function useNotificationsStable(
  options: UseNotificationsStableOptions = {}
): UseNotificationsStableReturn {
  const {
    autoConnect = true,
    userId,
    teamId,
    channels = [],
    socketUrl = process.env.NEXT_PUBLIC_NOTIFICATION_SOCKET_URL || 'http://localhost:3001',
    auth = {},
  } = options

  // State
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [connectionState, setConnectionState] = useState<ConnectionState>(
    ConnectionState.DISCONNECTED
  )
  const [queueSize, setQueueSize] = useState(0)

  // Refs
  const wsManagerRef = useRef<WebSocketManager | null>(null)
  const isMounted = useRef(true)

  /**
   * Initialize WebSocket manager
   */
  useEffect(() => {
    if (!wsManagerRef.current) {
      wsManagerRef.current = new WebSocketManager({
        url: socketUrl,
        autoConnect,
        transports: ['websocket', 'polling'],
        heartbeatInterval: 25000,
        heartbeatTimeout: 10000,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 30000,
        reconnectionAttempts: Infinity,
        maxQueueSize: 100,
        queueExpiry: 300000,
        auth,
      })

      // Subscribe to connection state changes
      wsManagerRef.current.onStateChange(newState => {
        if (isMounted.current) {
          setConnectionState(newState)
        }
      })

      // Set up message listeners
      wsManagerRef.current.on('initial_notifications', (event, data) => {
        if (isMounted.current && Array.isArray(data)) {
          setNotifications(data)
          setUnreadCount(data.filter((n: Notification) => !n.read).length)
          logger.debug(`[useNotificationsStable] Received ${data.length} initial notifications`)
        }
      })

      wsManagerRef.current.on('notification', (event, data) => {
        if (isMounted.current) {
          const notification = data as Notification
          setNotifications(prev => [notification, ...prev])
          if (!notification.read) {
            setUnreadCount(prev => prev + 1)
          }

          // Show browser notification if permitted
          if (typeof window !== 'undefined' && 'Notification' in window) {
            if (Notification.permission === 'granted') {
              new Notification(notification.title, {
                body: notification.message,
                icon: '/favicon.ico',
              })
            }
          }
        }
      })

      wsManagerRef.current.on('notification_read', (event, notificationId) => {
        if (isMounted.current) {
          setNotifications(prev =>
            prev.map(n => (n.id === notificationId ? { ...n, read: true } : n))
          )
          setUnreadCount(prev => Math.max(0, prev - 1))
        }
      })

      wsManagerRef.current.on('notifications_cleared', (event, filter) => {
        if (isMounted.current) {
          setNotifications(prev => prev.map(n => ({ ...n, read: true })))
          setUnreadCount(0)
        }
      })

      wsManagerRef.current.on('notification_deleted', (event, notificationId) => {
        if (isMounted.current) {
          setNotifications(prev => {
            const notif = prev.find(n => n.id === notificationId)
            const filtered = prev.filter(n => n.id !== notificationId)
            if (notif && !notif.read) {
              setUnreadCount(filtered.filter(n => !n.read).length)
            }
            return filtered
          })
        }
      })

      wsManagerRef.current.on('unread_count', (event, count) => {
        if (isMounted.current) {
          setUnreadCount(count as number)
        }
      })

      wsManagerRef.current.on('subscribed', (event, data) => {
        if (isMounted.current) {
          logger.debug('[useNotificationsStable] Subscribed:', data)
        }
      })

      // Update queue size periodically
      const queueInterval = setInterval(() => {
        if (wsManagerRef.current && isMounted.current) {
          setQueueSize(wsManagerRef.current.getQueueSize())
        }
      }, 1000)
    }

    return () => {
      isMounted.current = false
      if (wsManagerRef.current) {
        wsManagerRef.current.disconnect()
        wsManagerRef.current = null
      }
    }
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /**
   * Subscribe to channels when connected
   */
  useEffect(() => {
    if (connectionState === ConnectionState.CONNECTED && wsManagerRef.current) {
      const subscriptionChannels = [
        ...channels,
        ...(userId ? [`user:${userId}`] : []),
        ...(teamId ? [`team:${teamId}`] : []),
      ]

      wsManagerRef.current.emit(
        'subscribe',
        {
          userId,
          teamId,
          channels: subscriptionChannels,
        },
        false
      ) // Don't queue if offline, will auto-subscribe on reconnect
    }
  }, [connectionState, userId, teamId, channels])

  /**
   * Connect to WebSocket server
   */
  const connect = useCallback(() => {
    wsManagerRef.current?.connect()
  }, [])

  /**
   * Disconnect from WebSocket server
   */
  const disconnect = useCallback(() => {
    wsManagerRef.current?.disconnect()
  }, [])

  /**
   * Mark notification as read
   */
  const markAsRead = useCallback((id: string) => {
    wsManagerRef.current?.emit('mark_read', id)

    // Optimistic update
    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)))
    setUnreadCount(prev => Math.max(0, prev - 1))
  }, [])

  /**
   * Mark all notifications as read
   */
  const markAllAsRead = useCallback(() => {
    const filter: NotificationFilter = {
      userId,
      teamId,
    }
    wsManagerRef.current?.emit('mark_all_read', filter)

    // Optimistic update
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    setUnreadCount(0)
  }, [userId, teamId])

  /**
   * Delete notification
   */
  const deleteNotification = useCallback((id: string) => {
    // Optimistic update
    setNotifications(prev => {
      const notif = prev.find(n => n.id === id)
      if (notif && !notif.read) {
        setUnreadCount(c => Math.max(0, c - 1))
      }
      return prev.filter(n => n.id !== id)
    })
  }, [])

  /**
   * Refresh notifications via REST API
   */
  const refreshNotifications = useCallback(
    async (filter?: NotificationFilter) => {
      try {
        const params = new URLSearchParams()

        if (userId) params.append('userId', userId)
        if (teamId) params.append('teamId', teamId)
        if (filter?.type) params.append('type', filter.type as string)
        if (filter?.priority) params.append('priority', filter.priority as string)
        if (filter?.read !== undefined) params.append('read', String(filter.read))

        const response = await fetch(`/api/notifications?${params}`)
        const result = await response.json()

        if (result.success && result.data) {
          setNotifications(result.data)
          setUnreadCount(result.meta?.unreadCount || 0)
        }
      } catch (error) {
        logger.error('[useNotificationsStable] Failed to refresh notifications:', error)
      }
    },
    [userId, teamId]
  )

  // Request notification permission on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission()
      }
    }
  }, [])

  return {
    notifications,
    unreadCount,
    connectionState,
    isConnected: connectionState === ConnectionState.CONNECTED,
    isReconnecting: connectionState === ConnectionState.RECONNECTING,
    queueSize,
    connect,
    disconnect,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refreshNotifications,
  }
}
