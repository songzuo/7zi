/**
 * Backup Jobs API
 * Get backup job history
 *
 * GET /api/backup/jobs - List backup jobs
 */

import { NextRequest } from 'next/server';
import { logger } from '@/lib/logger';
import { withUserAuth, RBACUserContext } from '@/lib/auth/middleware-rbac';
import { BackupManager } from '@/lib/backup/manager';
import { createSuccessResponse } from '@/lib/api/utils';
import { createErrorResponse } from '@/lib/api/error-handler';

/**
 * GET /api/backup/jobs
 * List backup jobs
 */
async function GETHandler(request: NextRequest, context: RBACUserContext) {
  try {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '50');

    const jobs = await BackupManager.getJobs(limit);

    logger.info('Backup jobs listed', {
      category: 'backup',
      userId: context.userId,
      count: jobs.length,
    });

    return createSuccessResponse({
      jobs,
      count: jobs.length,
    });
  } catch (error) {
    logger.error('Failed to list backup jobs', error);
    return createErrorResponse(new Error('Failed to list backup jobs'), 500);
  }
}

export async function GET(request: NextRequest) {
  return withUserAuth(request, (req: NextRequest, userContext: RBACUserContext) => {
    return GETHandler(req, userContext);
  });
}
