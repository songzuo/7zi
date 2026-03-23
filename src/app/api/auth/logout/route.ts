/**
 * Logout API endpoint
 * POST /api/auth/logout
 */

import { NextRequest } from 'next/server';
import { withUserAuth } from '@/lib/auth/middleware';
import { logoutUser } from '@/lib/auth/service';
import { logger } from '@/lib/logger';
import { createValidationError, createErrorResponse } from '@/lib/api/error-handler';
import { clearAuthCookies, createSimpleSuccessResponse } from '@/lib/api/utils';

export async function POST(request: NextRequest) {
  return withUserAuth(request, async (req, context) => {
    try {
      // Get token from Authorization header
      const authHeader = request.headers.get('authorization');
      const token = authHeader?.substring(7);

      if (!token) {
        return createValidationError('No token provided');
      }

      // Revoke token
      await logoutUser(token);

      // Create response and clear cookies
      const response = createSimpleSuccessResponse();

      // Clear auth cookies
      clearAuthCookies(response);

      return response;
    } catch (error) {
      // Never log actual token values - security risk
      logger.error('Logout API error', error, { category: 'auth' });
      return createErrorResponse(error instanceof Error ? error : new Error(String(error)));
    }
  });
}
