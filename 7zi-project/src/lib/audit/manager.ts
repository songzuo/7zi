/**
 * Audit Log Manager
 * Main entry point for audit log operations
 */
import { randomUUID } from 'crypto';
import { AuditLogEntry, AuditSearchFilters, AuditSearchOptions, AuditSearchResult, ExportOptions, ExportJob } from './types';
import { AuditLogStorage } from './storage';
import { AuditLogExporter } from './exporter';

export class AuditLogManager {
  private storage: AuditLogStorage;
  private exporter: AuditLogExporter;

  constructor() {
    this.storage = new AuditLogStorage();
    this.exporter = new AuditLogExporter(this.storage);
  }

  /**
   * Log an audit entry
   */
  log(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): AuditLogEntry {
    const auditEntry: AuditLogEntry = {
      ...entry,
      id: randomUUID(),
      timestamp: new Date()
    };

    this.storage.add(auditEntry);
    return auditEntry;
  }

  /**
   * Search audit logs
   */
  search(filters: AuditSearchFilters, options?: AuditSearchOptions): AuditSearchResult {
    return this.storage.search(filters, options);
  }

  /**
   * Get a single audit entry by ID
   */
  get(id: string): AuditLogEntry | undefined {
    return this.storage.get(id);
  }

  /**
   * Create an export job
   */
  createExport(options: ExportOptions): Promise<ExportJob> {
    return this.exporter.createExportJob(options);
  }

  /**
   * Get export job status
   */
  getExportStatus(jobId: string): ExportJob | undefined {
    return this.exporter.getJobStatus(jobId);
  }

  /**
   * Get export content
   */
  getExportContent(jobId: string): string | Buffer | undefined {
    return this.exporter.getExportContent(jobId);
  }

  /**
   * Get storage instance (for advanced use)
   */
  getStorage(): AuditLogStorage {
    return this.storage;
  }

  /**
   * Get exporter instance (for advanced use)
   */
  getExporter(): AuditLogExporter {
    return this.exporter;
  }

  /**
   * Get statistics
   */
  getStats(filters?: AuditSearchFilters): {
    total: number;
    byStatus: Record<string, number>;
    byAction: Record<string, number>;
    byResourceType: Record<string, number>;
  } {
    const entries = filters
      ? this.storage.getAll(filters)
      : this.storage.getAll();

    const byStatus: Record<string, number> = {};
    const byAction: Record<string, number> = {};
    const byResourceType: Record<string, number> = {};

    for (const entry of entries) {
      byStatus[entry.status] = (byStatus[entry.status] || 0) + 1;
      byAction[entry.action] = (byAction[entry.action] || 0) + 1;
      byResourceType[entry.resourceType] = (byResourceType[entry.resourceType] || 0) + 1;
    }

    return {
      total: entries.length,
      byStatus,
      byAction,
      byResourceType
    };
  }
}