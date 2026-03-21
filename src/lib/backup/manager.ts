/**
 * Backup Manager
 * Unified interface for backup operations
 */

import {
  createBackup,
  listBackups,
  getBackup,
  deleteBackup,
  restoreBackup,
  getBackupStatistics,
} from './backup-core';
import {
  scheduleBackup,
  getScheduledBackups,
  cancelScheduledBackup,
  updateBackupSchedule,
  runScheduledBackups,
  getBackupJobs,
  triggerBackup,
} from './scheduler';
import { exportData, exportToCSV, importData, importFromCSV, listExports, deleteExport } from './data-export';
import { compressBackup, decompressBackup } from './compression';
import { encryptBackup, decryptBackup, generateEncryptionKey } from './encryption';
import {
  BackupMetadata,
  BackupConfig,
  BackupJob,
  BackupStatistics,
  ExportOptions,
  ImportOptions,
  RestoreOptions,
  BackupEvent,
  BackupFrequency,
  CompressionAlgorithm,
  EncryptionAlgorithm,
  ExportFormat,
} from './types';

export class BackupManager {
  /**
   * Create a backup
   */
  static async createBackup(options: {
    compression?: CompressionAlgorithm;
    encryption?: { algorithm: EncryptionAlgorithm; key: string };
    tables?: string[];
    userId?: string;
  } = {}): Promise<BackupMetadata> {
    return createBackup(options);
  }

  /**
   * List all backups
   */
  static async listBackups(): Promise<BackupMetadata[]> {
    return listBackups();
  }

  /**
   * Get a specific backup
   */
  static async getBackup(backupId: string): Promise<{ metadata: BackupMetadata; data: Record<string, unknown[]> } | null> {
    return getBackup(backupId);
  }

  /**
   * Delete a backup
   */
  static async deleteBackup(backupId: string, userId?: string): Promise<boolean> {
    return deleteBackup(backupId, userId);
  }

  /**
   * Restore a backup
   */
  static async restoreBackup(options: RestoreOptions & { userId?: string }): Promise<{
    success: boolean;
    message: string;
    error?: string;
  }> {
    return restoreBackup(options);
  }

  /**
   * Get backup statistics
   */
  static async getStatistics(): Promise<BackupStatistics> {
    return getBackupStatistics();
  }

  /**
   * Create a backup schedule
   */
  static async createSchedule(config: Omit<BackupConfig, 'id'>): Promise<BackupConfig> {
    return scheduleBackup(config);
  }

  /**
   * List backup schedules
   */
  static async listSchedules(): Promise<BackupConfig[]> {
    return getScheduledBackups();
  }

  /**
   * Update a backup schedule
   */
  static async updateSchedule(
    scheduleId: string,
    updates: Partial<BackupConfig>
  ): Promise<BackupConfig | null> {
    return updateBackupSchedule(scheduleId, updates);
  }

  /**
   * Cancel a backup schedule
   */
  static async cancelSchedule(scheduleId: string): Promise<boolean> {
    return cancelScheduledBackup(scheduleId);
  }

  /**
   * Run scheduled backups
   */
  static async runScheduledBackups(): Promise<BackupJob[]> {
    return runScheduledBackups();
  }

  /**
   * Manually trigger a backup
   */
  static async triggerBackup(scheduleId: string): Promise<BackupJob | null> {
    return triggerBackup(scheduleId);
  }

  /**
   * Get backup job history
   */
  static async getJobs(limit?: number): Promise<BackupJob[]> {
    return getBackupJobs(limit || 50);
  }

  /**
   * Export data
   */
  static async exportData(options: ExportOptions): Promise<{
    filename: string;
    path: string;
    size: number;
  }> {
    if (options.format === ExportFormat.JSON) {
      return exportData(options);
    } else if (options.format === ExportFormat.CSV) {
      return exportToCSV(options);
    } else {
      throw new Error(`Unsupported export format: ${options.format}`);
    }
  }

  /**
   * Import data
   */
  static async importData(
    filename: string,
    options: ImportOptions
  ): Promise<{
    success: boolean;
    message: string;
    error?: string;
    importedRecords?: number;
  }> {
    if (options.format === ExportFormat.JSON) {
      return importData(filename, options);
    } else if (options.format === ExportFormat.CSV) {
      return importFromCSV(filename, options);
    } else {
      return {
        success: false,
        message: `Unsupported import format: ${options.format}`,
        error: 'UNSUPPORTED_FORMAT',
      };
    }
  }

  /**
   * List exports
   */
  static async listExports(): Promise<Array<{
    filename: string;
    path: string;
    size: number;
    format: string;
  }>> {
    return listExports();
  }

  /**
   * Delete an export
   */
  static async deleteExport(filename: string): Promise<boolean> {
    return deleteExport(filename);
  }

  /**
   * Compress data
   */
  static async compress(data: string, algorithm: CompressionAlgorithm): Promise<string> {
    return compressBackup(data, algorithm);
  }

  /**
   * Decompress data
   */
  static async decompress(data: string, algorithm: CompressionAlgorithm): Promise<string> {
    return decompressBackup(data, algorithm);
  }

  /**
   * Encrypt data
   */
  static async encrypt(data: string, algorithm: EncryptionAlgorithm, key: string): Promise<string> {
    return encryptBackup(data, algorithm, key);
  }

  /**
   * Decrypt data
   */
  static async decrypt(data: string, algorithm: EncryptionAlgorithm, key: string): Promise<string> {
    return decryptBackup(data, algorithm, key);
  }

  /**
   * Generate an encryption key
   */
  static generateKey(): string {
    return generateEncryptionKey();
  }

  /**
   * Get system health status
   */
  static async getHealthStatus(): Promise<{
    status: 'healthy' | 'warning' | 'error';
    backups: BackupStatistics;
    schedules: {
      total: number;
      enabled: number;
      disabled: number;
    };
    lastScheduledRun?: string;
  }> {
    const backups = await this.getStatistics();
    const schedules = await this.listSchedules();
    const jobs = await this.getJobs(10);

    const enabledSchedules = schedules.filter((s) => s.enabled).length;
    const disabledSchedules = schedules.length - enabledSchedules;

    let status: 'healthy' | 'warning' | 'error' = 'healthy';

    // Check for errors in recent jobs
    const recentFailedJobs = jobs.filter((j) => j.status === 'failed');
    if (recentFailedJobs.length > 0) {
      status = 'error';
    } else if (backups.totalBackups === 0 && enabledSchedules > 0) {
      status = 'warning';
    }

    return {
      status,
      backups,
      schedules: {
        total: schedules.length,
        enabled: enabledSchedules,
        disabled: disabledSchedules,
      },
      lastScheduledRun: jobs[0]?.scheduledAt,
    };
  }

  /**
   * Quick backup (simple interface)
   */
  static async quickBackup(userId?: string): Promise<BackupMetadata> {
    return this.createBackup({
      compression: CompressionAlgorithm.GZIP,
      userId,
    });
  }

  /**
   * Quick restore (simple interface)
   */
  static async quickRestore(backupId: string, userId?: string): Promise<{
    success: boolean;
    message: string;
    error?: string;
  }> {
    return this.restoreBackup({
      backupId,
      truncateTables: true,
      userId,
    });
  }

  /**
   * Get backup schedule summary
   */
  static async getScheduleSummary(): Promise<{
    daily: number;
    weekly: number;
    monthly: number;
    manual: number;
  }> {
    const schedules = await this.listSchedules();

    return {
      daily: schedules.filter((s) => s.frequency === BackupFrequency.DAILY).length,
      weekly: schedules.filter((s) => s.frequency === BackupFrequency.WEEKLY).length,
      monthly: schedules.filter((s) => s.frequency === BackupFrequency.MONTHLY).length,
      manual: schedules.filter((s) => s.frequency === BackupFrequency.MANUAL).length,
    };
  }
}
