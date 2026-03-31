/**
 * Example Protected API endpoint
 * GET /api/auth/me
 * Returns current user information
 */

import { NextRequest } from 'next/server';
import { withUserAuth } from '@/lib/auth/middleware';
import { getUserById } from '@/lib/auth/repository';
import { logger } from '@/lib/logger';
import { createNotFoundError, createErrorResponse } from '@/lib/api/error-handler';
import { createSuccessResponse } from '@/lib/api/utils';

export async function GET(request: NextRequest) {
  return withUserAuth(request, async (req, context) => {
    try {
      // Get user from database
      const user = await getUserById(context.userId);

      if (!user) {
        return await createNotFoundError('User not found');
      }

      // Check if user is deleted
      if (user.status === 'deleted') {
        return await createNotFoundError('User not found');
      }

      // Remove password from response
      const { password, ...userWithoutPassword } = user;

      return createSuccessResponse({ user: userWithoutPassword });
    } catch (error) {
      logger.error('Get user API error', error, { category: 'auth' });
      return createErrorResponse(error instanceof Error ? error : new Error(String(error)));
    }
  });
}
