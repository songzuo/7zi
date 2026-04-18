/**
 * Audit Log Exporter
 * Supports CSV, JSON, and Excel export formats
 */
import { AuditLogEntry, ExportFormat, ExportJob, ExportOptions, AuditSearchFilters } from './types'
import { AuditLogStorage } from './storage'
import { randomUUID } from 'crypto'

export class AuditLogExporter {
  private jobs: Map<string, ExportJob> = new Map()
  private storage: AuditLogStorage

  constructor(storage: AuditLogStorage) {
    this.storage = storage
  }

  /**
   * Create an export job
   */
  async createExportJob(options: ExportOptions): Promise<ExportJob> {
    const jobId = randomUUID()
    const job: ExportJob = {
      id: jobId,
      format: options.format,
      filters: options.filters,
      status: 'pending',
      progress: 0,
      createdAt: new Date(),
    }

    this.jobs.set(jobId, job)

    // Start async processing
    this.processExportJob(job, options).catch(error => {
      job.status = 'failed'
      job.errorMessage = error.message
    })

    return job
  }

  /**
   * Get export job status
   */
  getJobStatus(jobId: string): ExportJob | undefined {
    return this.jobs.get(jobId)
  }

  /**
   * Get export file content
   */
  getExportContent(jobId: string): string | Buffer | undefined {
    const job = this.jobs.get(jobId)
    if (!job || job.status !== 'completed' || !job.filePath) {
      return undefined
    }
    return job.filePath // In production, this would be the actual file content
  }

  /**
   * Process export job asynchronously
   */
  private async processExportJob(job: ExportJob, options: ExportOptions): Promise<void> {
    job.status = 'processing'
    job.progress = 10

    try {
      // Get entries from storage
      const maxRecords = options.maxRecords || 100000
      const entries = this.storage.getAll(options.filters).slice(0, maxRecords)

      job.progress = 50

      // Generate export content
      let content: string
      switch (options.format) {
        case 'csv':
          content = this.generateCSV(entries, options.includeHeaders !== false)
          break
        case 'json':
          content = this.generateJSON(entries)
          break
        case 'excel':
          content = this.generateExcel(entries, options.includeHeaders !== false)
          break
        default:
          throw new Error(`Unsupported format: ${options.format}`)
      }

      job.progress = 90
      job.filePath = content // Store content directly for demo
      job.fileSize = Buffer.byteLength(content, 'utf-8')
      job.status = 'completed'
      job.completedAt = new Date()
      job.progress = 100
    } catch (error) {
      job.status = 'failed'
      job.errorMessage = error instanceof Error ? error.message : 'Unknown error'
      throw error
    }
  }

  /**
   * Generate CSV content
   */
  private generateCSV(entries: AuditLogEntry[], includeHeaders: boolean): string {
    const columns: (keyof AuditLogEntry)[] = [
      'id',
      'timestamp',
      'userId',
      'username',
      'action',
      'resourceType',
      'resourceId',
      'tenantId',
      'ipAddress',
      'status',
      'errorMessage',
    ]

    const rows: string[] = []

    if (includeHeaders) {
      rows.push(columns.join(','))
    }

    for (const entry of entries) {
      const row = columns.map(col => {
        const value = entry[col]
        if (value === undefined || value === null) return ''

        // Handle timestamp
        if (col === 'timestamp' && value instanceof Date) {
          return value.toISOString()
        }

        // Escape quotes and wrap in quotes if contains comma or quote
        const str = String(value)
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`
        }

        return str
      })

      rows.push(row.join(','))
    }

    return rows.join('\n')
  }

  /**
   * Generate JSON content
   */
  private generateJSON(entries: AuditLogEntry[]): string {
    return JSON.stringify(entries, null, 2)
  }

  /**
   * Generate Excel-compatible content (TSV format)
   * Note: Full Excel (xlsx) support would require additional libraries
   */
  private generateExcel(entries: AuditLogEntry[], includeHeaders: boolean): string {
    const columns: (keyof AuditLogEntry)[] = [
      'id',
      'timestamp',
      'userId',
      'username',
      'action',
      'resourceType',
      'resourceId',
      'tenantId',
      'ipAddress',
      'status',
      'errorMessage',
    ]

    const rows: string[] = []

    if (includeHeaders) {
      rows.push(columns.join('\t'))
    }

    for (const entry of entries) {
      const row = columns.map(col => {
        const value = entry[col]
        if (value === undefined || value === null) return ''

        if (col === 'timestamp' && value instanceof Date) {
          return value.toISOString()
        }

        // Escape tabs and newlines
        const str = String(value)
        return str.replace(/\t/g, '\\t').replace(/\n/g, '\\n')
      })

      rows.push(row.join('\t'))
    }

    return rows.join('\n')
  }

  /**
   * Clean up old jobs
   */
  cleanupOldJobs(maxAgeMs: number = 24 * 60 * 60 * 1000): number {
    const cutoff = new Date(Date.now() - maxAgeMs)
    let cleaned = 0

    for (const [id, job] of this.jobs) {
      if (job.createdAt < cutoff) {
        this.jobs.delete(id)
        cleaned++
      }
    }

    return cleaned
  }
}
