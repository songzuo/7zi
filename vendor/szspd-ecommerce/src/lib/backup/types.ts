/**
 * Backup System Types
 */

import { z } from 'zod'

/**
 * Backup frequency options
 */
export enum BackupFrequency {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  MANUAL = 'manual',
}

/**
 * Backup status
 */
export enum BackupStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

/**
 * Compression algorithm
 */
export enum CompressionAlgorithm {
  NONE = 'none',
  GZIP = 'gzip',
  BROTLI = 'brotli',
  DEFLATE = 'deflate',
}

/**
 * Encryption algorithm
 */
export enum EncryptionAlgorithm {
  NONE = 'none',
  AES256GCM = 'aes-256-gcm',
  AES256CBC = 'aes-256-cbc',
}

/**
 * Export format
 */
export enum ExportFormat {
  JSON = 'json',
  CSV = 'csv',
  SQL = 'sql',
}

/**
 * Backup metadata
 */
export interface BackupMetadata {
  id: string
  filename: string
  version: string
  createdAt: string
  updatedAt: string
  sizeInBytes: number
  sizeInMB: number
  compression: CompressionAlgorithm
  encryption: EncryptionAlgorithm
  checksum: string
  status: BackupStatus
  tables: string[]
  recordCounts: Record<string, number>
  error?: string
}

/**
 * Backup configuration
 */
export interface BackupConfig {
  id: string
  name: string
  frequency: BackupFrequency
  retentionDays: number
  compression: CompressionAlgorithm
  encryption: EncryptionAlgorithm
  encryptionKey?: string
  enabled: boolean
  tables?: string[]
  schedule?: string // Cron-like schedule
  lastRunAt?: string
  nextRunAt?: string
  notificationEnabled: boolean
}

/**
 * Backup schedule job
 */
export interface BackupJob {
  id: string
  configId: string
  scheduledAt: string
  status: BackupStatus
  startedAt?: string
  completedAt?: string
  error?: string
  backupId?: string
}

/**
 * Export options
 */
export interface ExportOptions {
  format: ExportFormat
  tables?: string[]
  includeMetadata?: boolean
  compress?: boolean
  encryption?: {
    algorithm: EncryptionAlgorithm
    key: string
  }
}

/**
 * Import options
 */
export interface ImportOptions {
  format: ExportFormat
  truncateTables?: boolean
  skipErrors?: boolean
  dryRun?: boolean
}

/**
 * Restore options
 */
export interface RestoreOptions {
  backupId: string
  encryptionKey?: string
  truncateTables?: boolean
  skipErrors?: boolean
  dryRun?: boolean
}

/**
 * Backup statistics
 */
export interface BackupStatistics {
  totalBackups: number
  totalSizeInBytes: number
  totalSizeInMB: number
  oldestBackup?: BackupMetadata
  newestBackup?: BackupMetadata
  totalRecords: number
  averageBackupSize: number
  compressionRatio?: number
}

/**
 * Backup notification
 */
export interface BackupNotification {
  jobId: string
  status: BackupStatus
  backupId?: string
  timestamp: string
  message: string
  error?: string
}

/**
 * Validation schemas
 */
export const BackupConfigSchema = z.object({
  name: z.string().min(1).max(100),
  frequency: z.nativeEnum(BackupFrequency),
  retentionDays: z.number().int().min(1).max(3650),
  compression: z.nativeEnum(CompressionAlgorithm),
  encryption: z.nativeEnum(EncryptionAlgorithm),
  encryptionKey: z.string().optional(),
  enabled: z.boolean(),
  tables: z.array(z.string()).optional(),
  schedule: z.string().optional(),
  notificationEnabled: z.boolean(),
})

export const RestoreOptionsSchema = z.object({
  backupId: z.string(),
  encryptionKey: z.string().optional(),
  truncateTables: z.boolean().default(false),
  skipErrors: z.boolean().default(false),
  dryRun: z.boolean().default(false),
})

export const ExportOptionsSchema = z.object({
  format: z.nativeEnum(ExportFormat),
  tables: z.array(z.string()).optional(),
  includeMetadata: z.boolean().default(true),
  compress: z.boolean().default(false),
  encryption: z
    .object({
      algorithm: z.nativeEnum(EncryptionAlgorithm),
      key: z.string(),
    })
    .optional(),
})

/**
 * Backup event types
 */
export enum BackupEventType {
  BACKUP_CREATED = 'backup_created',
  BACKUP_DELETED = 'backup_deleted',
  BACKUP_RESTORED = 'backup_restored',
  BACKUP_FAILED = 'backup_failed',
  SCHEDULE_CREATED = 'schedule_created',
  SCHEDULE_DELETED = 'schedule_deleted',
  EXPORT_COMPLETED = 'export_completed',
  IMPORT_COMPLETED = 'import_completed',
}

/**
 * Backup event
 */
export interface BackupEvent {
  type: BackupEventType
  timestamp: string
  data: {
    backupId?: string
    scheduleId?: string
    jobId?: string
    userId?: string
    metadata?: Record<string, unknown>
  }
}
