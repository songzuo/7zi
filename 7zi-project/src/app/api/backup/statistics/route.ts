/**
 * Backup Statistics API
 * Get backup statistics and health status
 *
 * GET /api/backup/statistics - Get backup statistics
 */

import { NextRequest } from 'next/server';
import { logger } from '@/lib/logger';
import { withUserAuth, RBACUserContext } from '@/lib/auth/middleware-rbac';
import { BackupManager } from '@/lib/backup/manager';
import { createSuccessResponse } from '@/lib/api/utils';
import { createErrorResponse } from '@/lib/api/error-handler';

/**
 * GET /api/backup/statistics
 * Get backup statistics and health status
 */
async function GETHandler(request: NextRequest, context: RBACUserContext) {
  try {
    const statistics = await BackupManager.getStatistics();
    const healthStatus = await BackupManager.getHealthStatus();

    logger.info('Backup statistics retrieved', {
      category: 'backup',
      userId: context.userId,
    });

    return createSuccessResponse({
      statistics,
      health: healthStatus,
    });
  } catch (error) {
    logger.error('Failed to get backup statistics', error);
    return createErrorResponse(new Error('Failed to get backup statistics'), 500);
  }
}

export async function GET(request: NextRequest) {
  return withUserAuth(request, (req: NextRequest, userContext: RBACUserContext) => {
    return GETHandler(req, userContext);
  });
}
