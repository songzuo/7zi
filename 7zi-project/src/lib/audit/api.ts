/**
 * Audit Log API Handlers
 * HTTP request handlers for audit log endpoints
 */
import { AuditLogManager } from './manager';
import { AuditLogEntry, AuditSearchFilters, AuditSearchOptions, ExportFormat } from './types';

export interface APIRequest {
  query?: Record<string, string | string[] | undefined>;
  body?: unknown;
  params?: Record<string, string>;
}

export interface APIResponse {
  status: number;
  body: unknown;
  headers?: Record<string, string>;
}

/**
 * Create API handlers
 */
export function createAuditAPIHandlers(manager: AuditLogManager) {
  return {
    /**
     * GET /api/audit/search
     * Search audit logs
     */
    async search(req: APIRequest): Promise<APIResponse> {
      try {
        const query = req.query || {};

        // Parse filters
        const filters: AuditSearchFilters = {};
        if (query.startDate) filters.startDate = new Date(query.startDate as string);
        if (query.endDate) filters.endDate = new Date(query.endDate as string);
        if (query.userId) filters.userId = query.userId as string;
        if (query.username) filters.username = query.username as string;
        if (query.action) filters.action = query.action as string;
        if (query.resourceType) filters.resourceType = query.resourceType as string;
        if (query.resourceId) filters.resourceId = query.resourceId as string;
        if (query.tenantId) filters.tenantId = query.tenantId as string;
        if (query.status) filters.status = query.status as 'success' | 'failure' | 'pending';
        if (query.searchText) filters.searchText = query.searchText as string;
        if (query.ipAddress) filters.ipAddress = query.ipAddress as string;

        // Parse options
        const options: AuditSearchOptions = {
          page: query.page ? parseInt(query.page as string, 10) : 1,
          pageSize: query.pageSize ? parseInt(query.pageSize as string, 10) : 50,
          sortBy: (query.sortBy as string) as keyof AuditLogEntry,
          sortOrder: query.sortOrder as 'asc' | 'desc'
        };

        const result = manager.search(filters, options);

        return {
          status: 200,
          body: {
            success: true,
            data: result
          }
        };
      } catch (error) {
        return {
          status: 400,
          body: {
            success: false,
            error: error instanceof Error ? error.message : 'Search failed'
          }
        };
      }
    },

    /**
     * POST /api/audit/export
     * Create an export job
     */
    async createExport(req: APIRequest): Promise<APIResponse> {
      try {
        const body = req.body as {
          format?: string;
          filters?: Record<string, unknown>;
          includeHeaders?: boolean;
          maxRecords?: number;
        } || {};
        const { format, filters, includeHeaders, maxRecords } = body;

        if (!format || !['csv', 'json', 'excel'].includes(format)) {
          return {
            status: 400,
            body: {
              success: false,
              error: 'Invalid format. Must be csv, json, or excel'
            }
          };
        }

        const job = await manager.createExport({
          format: format as ExportFormat,
          filters: filters || {},
          includeHeaders: includeHeaders !== false,
          maxRecords: maxRecords || 100000
        });

        return {
          status: 202,
          body: {
            success: true,
            data: {
              jobId: job.id,
              status: job.status
            }
          }
        };
      } catch (error) {
        return {
          status: 500,
          body: {
            success: false,
            error: error instanceof Error ? error.message : 'Export creation failed'
          }
        };
      }
    },

    /**
     * GET /api/audit/export/:jobId
     * Get export job status
     */
    async getExportStatus(req: APIRequest): Promise<APIResponse> {
      try {
        const { jobId } = req.params || {};

        if (!jobId) {
          return {
            status: 400,
            body: {
              success: false,
              error: 'Job ID is required'
            }
          };
        }

        const job = manager.getExportStatus(jobId);

        if (!job) {
          return {
            status: 404,
            body: {
              success: false,
              error: 'Export job not found'
            }
          };
        }

        return {
          status: 200,
          body: {
            success: true,
            data: {
              id: job.id,
              format: job.format,
              status: job.status,
              progress: job.progress,
              fileSize: job.fileSize,
              createdAt: job.createdAt,
              completedAt: job.completedAt,
              errorMessage: job.errorMessage
            }
          }
        };
      } catch (error) {
        return {
          status: 500,
          body: {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get export status'
          }
        };
      }
    },

    /**
     * GET /api/audit/export/:jobId/download
     * Download export file
     */
    async downloadExport(req: APIRequest): Promise<APIResponse> {
      try {
        const { jobId } = req.params || {};

        if (!jobId) {
          return {
            status: 400,
            body: {
              success: false,
              error: 'Job ID is required'
            }
          };
        }

        const job = manager.getExportStatus(jobId);

        if (!job) {
          return {
            status: 404,
            body: {
              success: false,
              error: 'Export job not found'
            }
          };
        }

        if (job.status !== 'completed') {
          return {
            status: 400,
            body: {
              success: false,
              error: `Export is not ready. Current status: ${job.status}`,
              progress: job.progress
            }
          };
        }

        const content = manager.getExportContent(jobId);
        const contentType = getContentType(job.format);

        return {
          status: 200,
          body: content,
          headers: {
            'Content-Type': contentType,
            'Content-Disposition': `attachment; filename="audit-export-${jobId}.${job.format}"`
          }
        };
      } catch (error) {
        return {
          status: 500,
          body: {
            success: false,
            error: error instanceof Error ? error.message : 'Download failed'
          }
        };
      }
    },

    /**
     * GET /api/audit/stats
     * Get audit statistics
     */
    async getStats(req: APIRequest): Promise<APIResponse> {
      try {
        const query = req.query || {};
        const filters: AuditSearchFilters = {};

        if (query.startDate) filters.startDate = new Date(query.startDate as string);
        if (query.endDate) filters.endDate = new Date(query.endDate as string);
        if (query.tenantId) filters.tenantId = query.tenantId as string;

        const stats = manager.getStats(Object.keys(filters).length > 0 ? filters : undefined);

        return {
          status: 200,
          body: {
            success: true,
            data: stats
          }
        };
      } catch (error) {
        return {
          status: 500,
          body: {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get stats'
          }
        };
      }
    }
  };

  function getContentType(format: ExportFormat): string {
    switch (format) {
      case 'csv':
        return 'text/csv';
      case 'json':
        return 'application/json';
      case 'excel':
        return 'application/vnd.ms-excel';
      default:
        return 'application/octet-stream';
    }
  }
}