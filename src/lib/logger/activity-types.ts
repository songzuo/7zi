/**
 * Audit Log Types and Interfaces
 * Defines the structure for tracking user activities and audit logs
 */

// ============================================
// Activity Types
// ============================================

export enum ActivityType {
  // Authentication activities
  AUTH_LOGIN = 'auth_login',
  AUTH_LOGOUT = 'auth_logout',
  AUTH_REGISTER = 'auth_register',
  AUTH_PASSWORD_CHANGE = 'auth_password_change',
  AUTH_PASSWORD_RESET = 'auth_password_reset',
  AUTH_TOKEN_REFRESH = 'auth_token_refresh',

  // Task operations
  TASK_CREATE = 'task_create',
  TASK_UPDATE = 'task_update',
  TASK_DELETE = 'task_delete',
  TASK_COMPLETE = 'task_complete',
  TASK_REOPEN = 'task_reopen',
  TASK_ASSIGN = 'task_assign',
  TASK_UNASSIGN = 'task_unassign',
  TASK_COMMENT = 'task_comment',
  TASK_ATTACHMENT = 'task_attachment',

  // Project operations
  PROJECT_CREATE = 'project_create',
  PROJECT_UPDATE = 'project_update',
  PROJECT_DELETE = 'project_delete',
  PROJECT_MEMBER_ADD = 'project_member_add',
  PROJECT_MEMBER_REMOVE = 'project_member_remove',
  PROJECT_MEMBER_ROLE_CHANGE = 'project_member_role_change',
  PROJECT_ARCHIVE = 'project_archive',
  PROJECT_RESTORE = 'project_restore',

  // User management
  USER_CREATE = 'user_create',
  USER_UPDATE = 'user_update',
  USER_DELETE = 'user_delete',
  USER_ROLE_CHANGE = 'user_role_change',
  USER_PERMISSION_CHANGE = 'user_permission_change',
  USER_DEACTIVATE = 'user_deactivate',
  USER_REACTIVATE = 'user_reactivate',

  // File operations
  FILE_UPLOAD = 'file_upload',
  FILE_DOWNLOAD = 'file_download',
  FILE_DELETE = 'file_delete',
  FILE_SHARE = 'file_share',
  FILE_UNSHARE = 'file_unshare',

  // Data access
  DATA_EXPORT = 'data_export',
  DATA_IMPORT = 'data_import',
  DATA_VIEW = 'data_view',
  DATA_BULK_DELETE = 'data_bulk_delete',

  // System events
  SYSTEM_SETTINGS_CHANGE = 'system_settings_change',
  SYSTEM_BACKUP = 'system_backup',
  SYSTEM_RESTORE = 'system_restore',
  SYSTEM_UPGRADE = 'system_upgrade',

  // Security events
  SECURITY_LOGIN_FAILED = 'security_login_failed',
  SECURITY_SUSPICIOUS_ACTIVITY = 'security_suspicious_activity',
  SECURITY_RATE_LIMIT_EXCEEDED = 'security_rate_limit_exceeded',
  SECURITY_UNAUTHORIZED_ACCESS = 'security_unauthorized_access',

  // API activities
  API_REQUEST = 'api_request',
  API_ERROR = 'api_error',
  API_RATE_LIMIT = 'api_rate_limit',

  // Other
  OTHER = 'other',
}

// ============================================
// Activity Categories
// ============================================

export enum ActivityCategory {
  AUTHENTICATION = 'authentication',
  TASKS = 'tasks',
  PROJECTS = 'projects',
  USERS = 'users',
  FILES = 'files',
  DATA = 'data',
  SYSTEM = 'system',
  SECURITY = 'security',
  API = 'api',
}

// ============================================
// Activity Log Entry
// ============================================

export interface ActivityLogEntry {
  id: string
  type: ActivityType
  category: ActivityCategory
  userId: string
  userEmail?: string
  userName?: string
  action: string
  description: string
  metadata?: Record<string, unknown>
  ipAddress?: string
  userAgent?: string
  requestId?: string
  timestamp: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  status: 'success' | 'failure' | 'partial'
}

// ============================================
// Activity Filters
// ============================================

export interface ActivityFilters {
  userId?: string
  type?: ActivityType
  category?: ActivityCategory
  startDate?: string
  endDate?: string
  severity?: 'low' | 'medium' | 'high' | 'critical'
  status?: 'success' | 'failure' | 'partial'
  limit?: number
  offset?: number
}

// ============================================
// Activity Statistics
// ============================================

export interface ActivityStatistics {
  period: 'day' | 'week' | 'month' | 'year'
  startDate: string
  endDate: string
  totalActivities: number
  activitiesByType: Record<ActivityType, number>
  activitiesByCategory: Record<ActivityCategory, number>
  activitiesByUser: Array<{ userId: string; userName?: string; count: number }>
  activitiesByDay: Array<{ date: string; count: number }>
  successRate: number
  failureCount: number
  criticalActivities: number
}

// ============================================
// Batch Write Options
// ============================================

export interface BatchWriteOptions {
  batchSize?: number
  flushInterval?: number
  maxRetries?: number
}

// ============================================
// Activity Tracking Options
// ============================================

export interface ActivityTrackingOptions {
  trackApiRequests?: boolean
  trackAuthentication?: boolean
  trackTaskOperations?: boolean
  trackProjectOperations?: boolean
  trackUserManagement?: boolean
  trackFileOperations?: boolean
  trackDataAccess?: boolean
  trackSecurityEvents?: boolean
  batchWrite?: boolean
  batchWriteOptions?: BatchWriteOptions
  excludePaths?: string[]
  excludeUsers?: string[]
}
