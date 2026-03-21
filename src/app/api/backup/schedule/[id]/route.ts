/**
 * Backup Schedule Management API
 * Update or cancel a specific backup schedule
 *
 * PATCH /api/backup/schedule/[id] - Update a schedule
 * DELETE /api/backup/schedule/[id] - Cancel a schedule
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { withUserAuth, RBACUserContext } from '@/lib/auth/middleware-rbac';
import { BackupManager } from '@/lib/backup/manager';
import { createSuccessResponse } from '@/lib/api/utils';
import { createBadRequestError, createNotFoundError, createErrorResponse } from '@/lib/api/error-handler';

/**
 * PATCH /api/backup/schedule/[id]
 * Update a backup schedule
 */
async function PATCHHandler(request: NextRequest, context: RBACUserContext, scheduleId: string) {
  try {
    const body = await request.json();

    // Prevent changing the id
    delete body.id;

    const schedule = await BackupManager.updateSchedule(scheduleId, body);

    if (!schedule) {
      return createNotFoundError('Backup schedule not found');
    }

    logger.info('Backup schedule updated', {
      category: 'backup',
      scheduleId,
      userId: context.userId,
    });

    return createSuccessResponse({
      schedule,
      message: 'Backup schedule updated successfully',
    });
  } catch (error) {
    logger.error('Failed to update backup schedule', error);
    return createErrorResponse(new Error('Failed to update backup schedule'), 500);
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  return withUserAuth(request, (req: NextRequest, userContext: RBACUserContext) => {
    return PATCHHandler(req, userContext, params.id);
  });
}

/**
 * DELETE /api/backup/schedule/[id]
 * Cancel a backup schedule
 */
async function DELETEHandler(request: NextRequest, context: RBACUserContext, scheduleId: string) {
  try {
    const success = await BackupManager.cancelSchedule(scheduleId);

    if (!success) {
      return createNotFoundError('Backup schedule not found');
    }

    logger.info('Backup schedule cancelled', {
      category: 'backup',
      scheduleId,
      userId: context.userId,
    });

    return createSuccessResponse({
      message: 'Backup schedule cancelled successfully',
    });
  } catch (error) {
    logger.error('Failed to cancel backup schedule', error);
    return createErrorResponse(new Error('Failed to cancel backup schedule'), 500);
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  return withUserAuth(request, (req: NextRequest, userContext: RBACUserContext) => {
    return DELETEHandler(req, userContext, params.id);
  });
}
