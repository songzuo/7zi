/**
 * Backup Schedule Trigger API
 * Manually trigger a scheduled backup
 *
 * POST /api/backup/schedule/[id]/trigger - Trigger a backup
 */

import { NextRequest } from 'next/server';
import { logger } from '@/lib/logger';
import { withUserAuth, RBACUserContext } from '@/lib/auth/middleware-rbac';
import { BackupManager } from '@/lib/backup/manager';
import { createSuccessResponse } from '@/lib/api/utils';
import { createNotFoundError, createErrorResponse } from '@/lib/api/error-handler';

/**
 * POST /api/backup/schedule/[id]/trigger
 * Trigger a scheduled backup
 */
async function POSTHandler(request: NextRequest, context: RBACUserContext, scheduleId: string) {
  try {
    const job = await BackupManager.triggerBackup(scheduleId);

    if (!job) {
      return createNotFoundError('Backup schedule not found');
    }

    logger.info('Backup schedule triggered', {
      category: 'backup',
      scheduleId,
      userId: context.userId,
      jobId: job.id,
    });

    return createSuccessResponse({
      job,
      message: 'Backup triggered successfully',
    }, 201);
  } catch (error) {
    logger.error('Failed to trigger backup schedule', error);
    return createErrorResponse(new Error('Failed to trigger backup schedule'), 500);
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  return withUserAuth(request, (req: NextRequest, userContext: RBACUserContext) => {
    return POSTHandler(req, userContext, params.id);
  });
}
