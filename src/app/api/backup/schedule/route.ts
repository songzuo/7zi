/**
 * Backup Schedule API
 * Manage automated backup schedules
 *
 * GET /api/backup/schedule - List all schedules
 * POST /api/backup/schedule - Create a new schedule
 */

import { NextRequest } from 'next/server';
import { logger } from '@/lib/logger';
import { withUserAuth, RBACUserContext } from '@/lib/auth/middleware-rbac';
import { BackupManager } from '@/lib/backup/manager';
import { BackupConfigSchema } from '@/lib/backup/types';
import { createSuccessResponse } from '@/lib/api/utils';
import { createBadRequestError, createErrorResponse } from '@/lib/api/error-handler';

/**
 * GET /api/backup/schedule
 * List all backup schedules
 */
async function GETHandler(request: NextRequest, context: RBACUserContext) {
  try {
    const schedules = await BackupManager.listSchedules();
    const summary = await BackupManager.getScheduleSummary();

    logger.info('Backup schedules listed', {
      category: 'backup',
      userId: context.userId,
      count: schedules.length,
    });

    return createSuccessResponse({
      schedules,
      summary,
      count: schedules.length,
    });
  } catch (error) {
    logger.error('Failed to list backup schedules', error);
    return createErrorResponse(new Error('Failed to list backup schedules'), 500);
  }
}

export async function GET(request: NextRequest) {
  return withUserAuth(request, (req: NextRequest, userContext: RBACUserContext) => {
    return GETHandler(req, userContext);
  });
}

/**
 * POST /api/backup/schedule
 * Create a new backup schedule
 */
async function POSTHandler(request: NextRequest, context: RBACUserContext) {
  try {
    const body = await request.json();

    // Validate request body
    const validationResult = BackupConfigSchema.safeParse(body);
    if (!validationResult.success) {
      return createBadRequestError('Invalid schedule configuration');
    }

    const config = await BackupManager.createSchedule(validationResult.data);

    logger.info('Backup schedule created', {
      category: 'backup',
      scheduleId: config.id,
      userId: context.userId,
      name: config.name,
      frequency: config.frequency,
    });

    return createSuccessResponse({
      schedule: config,
      message: 'Backup schedule created successfully',
    }, 201);
  } catch (error) {
    logger.error('Failed to create backup schedule', error);
    return createErrorResponse(new Error('Failed to create backup schedule'), 500);
  }
}

export async function POST(request: NextRequest) {
  return withUserAuth(request, (req: NextRequest, userContext: RBACUserContext) => {
    return POSTHandler(req, userContext);
  });
}
