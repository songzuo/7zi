/**
 * Feedback Types - 纯类型定义（不含实现）
 *
 * 这些类型可以在客户端组件中安全导入
 */

/**
 * Feedback types
 */
export type FeedbackType = 'bug' | 'feature' | 'improvement' | 'complaint' | 'praise' | 'other'

/**
 * Feedback priority levels
 */
export type FeedbackPriority = 'low' | 'medium' | 'high' | 'urgent'

/**
 * Feedback status
 */
export type FeedbackStatus = 'pending' | 'in_progress' | 'resolved' | 'closed' | 'rejected'

/**
 * Feedback rating
 */
export type FeedbackRating = 1 | 2 | 3 | 4 | 5

/**
 * Feedback interface
 */
export interface Feedback {
  id: string
  userId: string
  userName: string
  userEmail: string
  type: FeedbackType
  priority: FeedbackPriority
  status: FeedbackStatus
  title: string
  description: string
  rating?: FeedbackRating
  url?: string
  attachments: string[]
  tags: string[]
  adminResponse?: string
  adminId?: string
  adminName?: string
  resolvedAt?: number
  closedAt?: number
  createdAt: number
  updatedAt: number
}

/**
 * Feedback filter options
 */
export interface FeedbackFilter {
  type?: FeedbackType
  priority?: FeedbackPriority
  status?: FeedbackStatus
  userId?: string
  search?: string
  searchQuery?: string
  startDate?: number
  endDate?: number
  dateFrom?: number
  dateTo?: number
  rating?: FeedbackRating
  tags?: string[]
}

/**
 * Feedback sort options
 */
export interface FeedbackSort {
  field: 'createdAt' | 'updatedAt' | 'priority' | 'rating'
  order: 'asc' | 'desc'
}

/**
 * Paginated feedback result
 */
export interface PaginatedFeedbacks {
  feedbacks: Feedback[]
  total: number
  page: number
  limit: number
}

/**
 * Feedback statistics
 */
export interface FeedbackStats {
  total: number
  byType: Record<FeedbackType, number>
  byPriority: Record<FeedbackPriority, number>
  byStatus: Record<FeedbackStatus, number>
  averageRating: number
  resolvedPercentage: number
  pendingCount?: number
  inProgressCount?: number
}
