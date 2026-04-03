/**
 * Audit Log Entry
 * Represents a single audit log record
 */
export interface AuditLogEntry {
  id: string;
  timestamp: Date;
  userId?: string;
  username?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  tenantId?: string;
  ipAddress?: string;
  userAgent?: string;
  details?: Record<string, unknown>;
  status: 'success' | 'failure' | 'pending';
  errorMessage?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Search Filters
 */
export interface AuditSearchFilters {
  startDate?: Date;
  endDate?: Date;
  userId?: string;
  username?: string;
  action?: string;
  resourceType?: string;
  resourceId?: string;
  tenantId?: string;
  status?: 'success' | 'failure' | 'pending';
  searchText?: string;
  ipAddress?: string;
}

/**
 * Search Options
 */
export interface AuditSearchOptions {
  page?: number;
  pageSize?: number;
  sortBy?: keyof AuditLogEntry;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Search Result
 */
export interface AuditSearchResult {
  entries: AuditLogEntry[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Export Format
 */
export type ExportFormat = 'csv' | 'json' | 'excel';

/**
 * Export Job Status
 */
export type ExportJobStatus = 'pending' | 'processing' | 'completed' | 'failed';

/**
 * Export Job
 */
export interface ExportJob {
  id: string;
  format: ExportFormat;
  filters: AuditSearchFilters;
  status: ExportJobStatus;
  progress: number;
  filePath?: string;
  fileSize?: number;
  createdAt: Date;
  completedAt?: Date;
  errorMessage?: string;
}

/**
 * Export Options
 */
export interface ExportOptions {
  format: ExportFormat;
  filters: AuditSearchFilters;
  includeHeaders?: boolean;
  maxRecords?: number;
}