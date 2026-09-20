// Notification Types
export interface Notification {
  id: string
  userId: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  read: boolean
  createdAt: Date
}

export interface NotificationPreferences {
  userId: string
  email: boolean
  push: boolean
  inApp: boolean
}

export interface NotificationStats {
  total: number
  unread: number
  byType: Record<string, number>
}
