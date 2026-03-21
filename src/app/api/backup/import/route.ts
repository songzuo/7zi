/**
 * Data Import API
 * Import data from exported files
 *
 * POST /api/backup/import - Import data from a file
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { withUserAuth, RBACUserContext } from '@/lib/auth/middleware-rbac';
import { BackupManager } from '@/lib/backup/manager';
import { ExportFormat } from '@/lib/backup/types';
import { createSuccessResponse } from '@/lib/api/utils';
import { createBadRequestError, createErrorResponse } from '@/lib/api/error-handler';

/**
 * POST /api/backup/import
 * Import data from a file
 */
async function POSTHandler(request: NextRequest, context: RBACUserContext) {
  try {
    const body = await request.json();

    const result = await BackupManager.importData(body.filename, body);

    logger.info('Data import ' + (result.success ? 'completed' : 'failed'), {
      category: 'import',
      filename: body.filename,
      userId: context.userId,
      success: result.success,
      importedRecords: result.importedRecords,
    });

    if (result.success) {
      return createSuccessResponse({
        message: result.message,
        importedRecords: result.importedRecords,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: {
            type: result.error || 'IMPORT_FAILED',
            message: result.message,
            timestamp: new Date().toISOString(),
          },
        },
        { status: 400 }
      );
    }
  } catch (error) {
    logger.error('Failed to import data', error);
    return createErrorResponse(new Error('Failed to import data'), 500);
  }
}

export async function POST(request: NextRequest) {
  return withUserAuth(request, (req: NextRequest, userContext: RBACUserContext) => {
    return POSTHandler(req, userContext);
  });
}
