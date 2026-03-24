/**
 * Backup Restore API
 * Restore data from a backup
 *
 * POST /api/backup/restore - Restore from a backup
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { withUserAuth, RBACUserContext } from '@/lib/auth/middleware-rbac';
import { BackupManager } from '@/lib/backup/manager';
import { RestoreOptionsSchema, BackupStatus } from '@/lib/backup/types';
import { createSuccessResponse } from '@/lib/api/utils';
import { createBadRequestError, createErrorResponse } from '@/lib/api/error-handler';

/**
 * POST /api/backup/restore
 * Restore from a backup
 */
async function POSTHandler(request: NextRequest, context: RBACUserContext) {
  try {
    const body = await request.json();

    // Validate request body
    const validationResult = RestoreOptionsSchema.safeParse(body);
    if (!validationResult.success) {
      return createBadRequestError('Invalid restore options');
    }

    const result = await BackupManager.restoreBackup({
      ...validationResult.data,
      userId: context.userId,
    });

    logger.info('Backup restore ' + (result.success ? 'completed' : 'failed'), {
      category: 'backup',
      backupId: body.backupId,
      userId: context.userId,
      success: result.success,
    });

    if (result.success) {
      return createSuccessResponse({
        message: result.message,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: {
            type: result.error || 'RESTORE_FAILED',
            message: result.message,
            timestamp: new Date().toISOString(),
          },
        },
        { status: 400 }
      );
    }
  } catch (error) {
    logger.error('Failed to restore backup', error);
    return createErrorResponse(new Error('Failed to restore backup'), 500);
  }
}

export async function POST(request: NextRequest) {
  return withUserAuth(request, (req: NextRequest, userContext: RBACUserContext) => {
    return POSTHandler(req, userContext);
  });
}
