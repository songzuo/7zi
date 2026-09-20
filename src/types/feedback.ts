/**
 * Types for feedback and rating system
 */

/**
 * Feedback type enum
 */
export enum FeedbackType {
  GENERAL = 'general',
  BUG = 'bug',
  FEATURE = 'feature',
  SUGGESTION = 'suggestion',
  COMPLAINT = 'complaint',
  COMPLIMENT = 'compliment',
  OTHER = 'other',
}

/**
 * Feedback status
 */
export enum FeedbackStatus {
  PENDING = 'pending',
  REVIEWED = 'reviewed',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  RESOLVED = 'resolved',
}

/**
 * Feedback priority
 */
export enum FeedbackPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

/**
 * Rating entity
 */
export interface Rating {
  id: string
  user_id: string
  target_type: 'agent' | 'task' | 'feature' | 'project' | 'overall'
  target_id: string
  rating: number // 1-5
  title?: string
  description?: string
  images?: string[] // Array of image URLs
  helpful_count: number
  not_helpful_count: number
  is_helpful?: boolean // Current user's vote
  status: FeedbackStatus
  created_at: string
  updated_at: string
  verified?: boolean // Whether the user has used the feature
  metadata?: Record<string, unknown>
}

/**
 * Feedback entity
 */
export interface Feedback {
  id: string
  user_id: string
  type: FeedbackType
  rating: number // 1-5
  title: string
  description: string
  email?: string
  status: FeedbackStatus
  priority: FeedbackPriority
  images?: string[] // Array of image URLs
  attachments?: Attachment[]
  helpful_count: number
  not_helpful_count: number
  admin_notes?: string
  admin_id?: string
  created_at: string
  updated_at: string
  reviewed_at?: string
  resolved_at?: string
  metadata?: Record<string, unknown>
}

/**
 * Attachment entity
 */
export interface Attachment {
  id: string
  feedback_id: string
  filename: string
  url: string
  size: number
  mimetype: string
  uploaded_at: string
}

/**
 * Feedback stats
 */
export interface FeedbackStats {
  total: number
  by_status: Record<FeedbackStatus, number>
  by_type: Record<FeedbackType, number>
  by_priority: Record<FeedbackPriority, number>
  average_rating: number
  rating_distribution: Record<number, number>
}

/**
 * Rating stats
 */
export interface RatingStats {
  total: number
  average_rating: number
  rating_distribution: Record<number, number>
  by_target_type: Record<string, number>
  helpful_ratio: number
}

/**
 * Create feedback DTO
 */
export interface CreateFeedbackDto {
  type: FeedbackType
  rating: number
  title: string
  description: string
  email?: string
  images?: File[]
  metadata?: Record<string, unknown>
}

/**
 * Create rating DTO
 */
export interface CreateRatingDto {
  target_type: 'agent' | 'task' | 'feature' | 'project' | 'overall'
  target_id: string
  rating: number
  title?: string
  description?: string
  images?: File[]
  verified?: boolean
  metadata?: Record<string, unknown>
}

/**
 * Update feedback DTO (admin only)
 */
export interface UpdateFeedbackDto {
  status?: FeedbackStatus
  priority?: FeedbackPriority
  admin_notes?: string
  metadata?: Record<string, unknown>
}

/**
 * Feedback filters
 */
export interface FeedbackFilters {
  user_id?: string
  type?: FeedbackType
  status?: FeedbackStatus
  priority?: FeedbackPriority
  rating_min?: number
  rating_max?: number
  start_date?: string
  end_date?: string
  search?: string
  sort_by?: 'created_at' | 'rating' | 'helpful_count' | 'updated_at'
  sort_order?: 'asc' | 'desc'
  page?: number
  per_page?: number
}

/**
 * Rating filters
 */
export interface RatingFilters {
  user_id?: string
  target_type?: string
  target_id?: string
  rating_min?: number
  rating_max?: number
  status?: FeedbackStatus
  start_date?: string
  end_date?: string
  sort_by?: 'created_at' | 'rating' | 'helpful_count'
  sort_order?: 'asc' | 'desc'
  page?: number
  per_page?: number
}

/**
 * Feedback list response
 */
export interface FeedbackListResponse {
  feedbacks: Feedback[]
  meta: {
    total: number
    page: number
    per_page: number
    total_pages: number
  }
  stats: FeedbackStats
}

/**
 * Rating list response
 */
export interface RatingListResponse {
  ratings: Rating[]
  meta: {
    total: number
    page: number
    per_page: number
    total_pages: number
  }
  stats: RatingStats
}

/**
 * Helpful vote
 */
export interface HelpfulVote {
  rating_id: string
  user_id: string
  is_helpful: boolean
  created_at: string
}

/**
 * Anti-spam rules
 */
export interface AntiSpamConfig {
  max_feedback_per_hour: number
  max_feedback_per_day: number
  min_time_between_feedback: number // seconds
  duplicate_threshold: number // similarity threshold 0-1
  require_email: boolean
  enable_content_filter: boolean
  blocked_words: string[]
}

/**
 * Spam detection result
 */
export interface SpamDetection {
  is_spam: boolean
  reason: string
  score: number
  metadata?: Record<string, unknown>
}
