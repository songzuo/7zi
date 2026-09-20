/**
 * Notification Store using Zustand
 * Manages notification state across the application
 */

import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

import {
  Notification,
  NotificationType,
  NotificationPriority,
  NotificationStatus,
  NotificationPreferences,
} from '@/types/notifications'

// ============================================================================
// Types
// ============================================================================

export interface NotificationState {
  // Notifications
  notifications: Notification[]
  unreadCount: number

  // Preferences
  preferences: NotificationPreferences

  // Loading states
  isLoading: boolean
  error: string | null

  // Actions
  setNotifications: (notifications: Notification[]) => void
  addNotification: (notification: Notification) => void
  updateNotification: (id: string, updates: Partial<Notification>) => void
  removeNotification: (id: string) => void
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  clearAll: () => void

  // Preferences actions
  updatePreferences: (preferences: Partial<NotificationPreferences>) => void
  resetPreferences: () => void

  // Loading state
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void

  // Utility actions
  filterByType: (type: NotificationType) => Notification[]
  filterByPriority: (priority: NotificationPriority) => Notification[]
  getUnreadNotifications: () => Notification[]
}

// ============================================================================
// Default Preferences
// ============================================================================

const defaultPreferences: NotificationPreferences = {
  user_id: '', // Will be set when user logs in
  enabled_types: [
    NotificationType.TASK_ASSIGNED,
    NotificationType.TASK_OVERDUE,
    NotificationType.MEETING_REMINDER,
    NotificationType.USER_MENTION,
  ],
  enabled: true,
  email_enabled: true,
  sound_enabled: true,
}

// ============================================================================
// Store
// ============================================================================

export const useNotificationStore = create<NotificationState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        notifications: [],
        unreadCount: 0,
        preferences: defaultPreferences,
        isLoading: false,
        error: null,

        // Set notifications
        setNotifications: notifications => {
          const unreadCount = notifications.filter(
            n => n.status === NotificationStatus.UNREAD
          ).length

          set({ notifications, unreadCount })
        },

        // Add notification
        addNotification: notification => {
          const notifications = [notification, ...get().notifications]
          // Limit total notifications to 100
          const limited = notifications.slice(0, 100)
          const unreadCount = limited.filter(n => n.status === NotificationStatus.UNREAD).length

          set({ notifications: limited, unreadCount })
        },

        // Update notification
        updateNotification: (id, updates) => {
          const notifications = get().notifications.map(n =>
            n.id === id ? { ...n, ...updates } : n
          )

          const unreadCount = notifications.filter(
            n => n.status === NotificationStatus.UNREAD
          ).length

          set({ notifications, unreadCount })
        },

        // Remove notification
        removeNotification: id => {
          const notifications = get().notifications.filter(n => n.id !== id)
          const unreadCount = notifications.filter(
            n => n.status === NotificationStatus.UNREAD
          ).length

          set({ notifications, unreadCount })
        },

        // Mark as read
        markAsRead: id => {
          get().updateNotification(id, {
            status: NotificationStatus.READ,
            read_at: new Date().toISOString(),
          })
        },

        // Mark all as read
        markAllAsRead: () => {
          const notifications = get().notifications.map(n => ({
            ...n,
            status: NotificationStatus.READ as NotificationStatus,
            read_at: new Date().toISOString(),
          }))

          set({ notifications, unreadCount: 0 })
        },

        // Clear all notifications
        clearAll: () => {
          set({ notifications: [], unreadCount: 0 })
        },

        // Update preferences
        updatePreferences: updates => {
          set({
            preferences: { ...get().preferences, ...updates },
          })
        },

        // Reset preferences
        resetPreferences: () => {
          set({ preferences: defaultPreferences })
        },

        // Set loading state
        setLoading: isLoading => {
          set({ isLoading })
        },

        // Set error
        setError: error => {
          set({ error })
        },

        // Filter by type
        filterByType: type => {
          return get().notifications.filter(n => n.type === type)
        },

        // Filter by priority
        filterByPriority: priority => {
          return get().notifications.filter(n => n.priority === priority)
        },

        // Get unread notifications
        getUnreadNotifications: () => {
          return get().notifications.filter(n => n.status === NotificationStatus.UNREAD)
        },
      }),
      {
        name: 'notification-store',
        partialize: state => ({
          preferences: state.preferences,
          // Only persist notifications up to 100 to avoid quota issues
          notifications: state.notifications.slice(0, 100),
        }),
      }
    )
  )
)

// ============================================================================
// Selectors
// ============================================================================

export const selectUnreadCount = (state: NotificationState) => state.unreadCount
export const selectNotifications = (state: NotificationState) => state.notifications
export const selectPreferences = (state: NotificationState) => state.preferences
export const selectIsLoading = (state: NotificationState) => state.isLoading

// ============================================================================
// Helper hooks
// ============================================================================

/**
 * Hook to fetch notifications from API
 */
export const useFetchNotifications = () => {
  const setNotifications = useNotificationStore(state => state.setNotifications)
  const setLoading = useNotificationStore(state => state.setLoading)
  const setError = useNotificationStore(state => state.setError)

  const fetchNotifications = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/notifications?per_page=50')

      if (!response.ok) {
        throw new Error('Failed to fetch notifications')
      }

      const data = await response.json()
      setNotifications(data.notifications || [])
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  return { fetch: fetchNotifications, isLoading: useNotificationStore(state => state.isLoading) }
}

/**
 * Hook to create a notification via API
 */
export const useCreateNotification = () => {
  const addNotification = useNotificationStore(state => state.addNotification)
  const setLoading = useNotificationStore(state => state.setLoading)
  const setError = useNotificationStore(state => state.setError)

  const create = async (data: {
    type: NotificationType
    title: string
    content: string
    priority?: NotificationPriority
    group_id?: string
    related_id?: string
    related_type?: string
    metadata?: Record<string, unknown>
  }) => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: 'current', // Will be set by server from session
          ...data,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create notification')
      }

      const notification = await response.json()
      addNotification(notification)

      return notification
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unknown error')
      throw error
    } finally {
      setLoading(false)
    }
  }

  return { create, isLoading: useNotificationStore(state => state.isLoading) }
}

export default useNotificationStore
