/**
 * Data Export API
 * Export data in various formats (JSON, CSV)
 *
 * GET /api/backup/export - List available exports
 * POST /api/backup/export - Create a new export
 */

import { NextRequest } from 'next/server';
import { logger } from '@/lib/logger';
import { withUserAuth, RBACUserContext } from '@/lib/auth/middleware-rbac';
import { BackupManager } from '@/lib/backup/manager';
import { ExportOptionsSchema } from '@/lib/backup/types';
import { createSuccessResponse } from '@/lib/api/utils';
import { createBadRequestError, createErrorResponse } from '@/lib/api/error-handler';

/**
 * GET /api/backup/export
 * List available exports
 */
async function GETHandler(request: NextRequest, context: RBACUserContext) {
  try {
    const exports = await BackupManager.listExports();

    logger.info('Exports listed', {
      category: 'export',
      userId: context.userId,
      count: exports.length,
    });

    return createSuccessResponse({
      exports,
      count: exports.length,
    });
  } catch (error) {
    logger.error('Failed to list exports', error);
    return createErrorResponse(new Error('Failed to list exports'), 500);
  }
}

export async function GET(request: NextRequest) {
  return withUserAuth(request, (req: NextRequest, userContext: RBACUserContext) => {
    return GETHandler(req, userContext);
  });
}

/**
 * POST /api/backup/export
 * Create a new export
 */
async function POSTHandler(request: NextRequest, context: RBACUserContext) {
  try {
    const body = await request.json();

    // Validate request body
    const validationResult = ExportOptionsSchema.safeParse(body);
    if (!validationResult.success) {
      return createBadRequestError('Invalid export options');
    }

    const exportResult = await BackupManager.exportData(validationResult.data);

    logger.info('Data exported', {
      category: 'export',
      userId: context.userId,
      format: validationResult.data.format,
      filename: exportResult.filename,
      size: exportResult.size,
    });

    return createSuccessResponse({
      export: exportResult,
      message: 'Data exported successfully',
      downloadUrl: `/api/backup/export/download/${exportResult.filename}`,
    }, 201);
  } catch (error) {
    logger.error('Failed to export data', error);
    return createErrorResponse(new Error('Failed to export data'), 500);
  }
}

export async function POST(request: NextRequest) {
  return withUserAuth(request, (req: NextRequest, userContext: RBACUserContext) => {
    return POSTHandler(req, userContext);
  });
}
