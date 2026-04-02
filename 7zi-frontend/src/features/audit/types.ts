/**
 * Audit Feature Types
 */

export enum AuditAction {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  READ = 'read',
  LOGIN = 'login',
  LOGOUT = 'logout',
}

export interface AuditLog {
  id: string
  userId?: string
  action: AuditAction
  resource: string
  resourceId?: string
  changes?: Record<string, { old: unknown; new: unknown }>
  ip?: string
  userAgent?: string
  timestamp: Date
}

export interface AuditQuery {
  userId?: string
  action?: AuditAction
  resource?: string
  startDate?: Date
  endDate?: Date
  page?: number
  limit?: number
}
