/**
 * Bulk User Operations API Route
 * Endpoint: /api/users/batch/bulk
 * Methods: POST (bulk enable/disable/delete)
 *
 * Supports:
 * - Bulk enable users
 * - Bulk disable users
 * - Bulk delete users
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getUserById,
  updateUser,
  deleteUser,
} from '@/lib/auth/repository';
import { UserStatus } from '@/lib/auth/types';
import { createAuditLog, AuditAction, AuditStatus } from '@/lib/db/audit-log';
import { logger } from '@/lib/logger';

/**
 * Bulk operation request body
 */
interface BulkOperationRequest {
  userIds: string[];
  operation: 'enable' | 'disable' | 'delete';
}

/**
 * Bulk operation response
 */
interface BulkOperationResponse {
  success: boolean;
  data?: {
    successful: string[];
    failed: Array<{ userId: string; error: string }>;
  };
  error?: {
    code: string;
    message: string;
  };
}

/**
 * POST /api/users/batch/bulk - Perform bulk operations on users
 *
 * Request body:
 * {
 *   userIds: string[],
 *   operation: 'enable' | 'disable' | 'delete'
 * }
 *
 * Note: Maximum 100 users per bulk operation
 */
export async function POST(request: NextRequest) {
  try {
    const body: BulkOperationRequest = await request.json();
    const { userIds, operation } = body;

    // Validate user IDs
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json<BulkOperationResponse>(
        {
          success: false,
          error: {
            code: 'INVALID_PARAMETER',
            message: 'userIds must be a non-empty array',
          },
        },
        { status: 400 }
      );
    }

    // Limit bulk operations to 100 users
    if (userIds.length > 100) {
      return NextResponse.json<BulkOperationResponse>(
        {
          success: false,
          error: {
            code: 'TOO_MANY_ITEMS',
            message: 'Maximum 100 users per bulk operation',
          },
        },
        { status: 400 }
      );
    }

    // Validate operation
    if (!['enable', 'disable', 'delete'].includes(operation)) {
      return NextResponse.json<BulkOperationResponse>(
        {
          success: false,
          error: {
            code: 'INVALID_OPERATION',
            message: 'Operation must be one of: enable, disable, delete',
          },
        },
        { status: 400 }
      );
    }

    // Remove duplicates
    const uniqueUserIds = Array.from(new Set(userIds));

    // Check if users exist
    const userChecks = await Promise.all(
      uniqueUserIds.map(async (userId) => {
        const user = await getUserById(userId);
        return { userId, exists: !!user, user };
      })
    );

    const existingUsers = userChecks.filter(check => check.exists);
    const notFoundIds = userChecks.filter(check => !check.exists).map(check => check.userId);

    if (existingUsers.length === 0) {
      return NextResponse.json<BulkOperationResponse>(
        {
          success: false,
          error: {
            code: 'NO_USERS_FOUND',
            message: 'None of the provided user IDs exist',
          },
        },
        { status: 404 }
      );
    }

    // Perform bulk operation
    const results = await Promise.all(
      existingUsers.map(async ({ userId, user }) => {
        try {
          let success = false;
          let error: string | null = null;

          switch (operation) {
            case 'enable':
              const enabledUser = await updateUser(userId, { status: UserStatus.ACTIVE });
              success = !!enabledUser;
              error = success ? null : 'Failed to enable user';
              break;

            case 'disable':
              const disabledUser = await updateUser(userId, { status: UserStatus.INACTIVE });
              success = !!disabledUser;
              error = success ? null : 'Failed to disable user';
              break;

            case 'delete':
              const deleted = await deleteUser(userId);
              success = deleted;
              error = success ? null : 'Failed to delete user';
              break;
          }

          // Audit log for successful operations
          if (success) {
            try {
              await createAuditLog({
                user_id: userId,
                action: operation === 'delete'
                  ? AuditAction.USER_DELETED
                  : AuditAction.USER_STATUS_CHANGED,
                entity_type: 'user',
                entity_id: userId,
                resource_type: 'user',
                resource_id: userId,
                details: {
                  operation,
                  email: user?.email,
                  name: user?.name,
                },
                ip_address: null,
                user_agent: null,
                status: AuditStatus.SUCCESS,
                error_message: null,
              });
            } catch (auditError) {
              logger.error('Failed to create audit log', { error: auditError });
              // Don't fail the operation if audit logging fails
            }
          }

          return { userId, success, error };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          logger.error(`Failed to ${operation} user ${userId}`, { error });

          // Audit log for failed operations
          try {
            await createAuditLog({
              user_id: userId,
              action: operation === 'delete'
                ? AuditAction.USER_DELETED
                : AuditAction.USER_STATUS_CHANGED,
              entity_type: 'user',
              entity_id: userId,
              resource_type: 'user',
              resource_id: userId,
              details: {
                operation,
                error: errorMessage,
              },
              ip_address: null,
              user_agent: null,
              status: AuditStatus.FAILED,
              error_message: errorMessage,
            });
          } catch (auditError) {
            logger.error('Failed to create audit log', { error: auditError });
          }

          return { userId, success: false, error: errorMessage };
        }
      })
    );

    // Compile results
    const successful = results
      .filter(r => r.success)
      .map(r => r.userId);

    const failed = results
      .filter(r => !r.success)
      .map(r => ({ userId: r.userId, error: r.error || 'Unknown error' }));

    // Add not found IDs to failed list
    notFoundIds.forEach(userId => {
      failed.push({ userId, error: 'User not found' });
    });

    return NextResponse.json<BulkOperationResponse>({
      success: true,
      data: {
        successful,
        failed,
      },
    });
  } catch (error) {
    logger.error('Failed to perform bulk operation', { error });
    return NextResponse.json<BulkOperationResponse>(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Internal server error',
        },
      },
      { status: 500 }
    );
  }
}
