/**
 * User Activity API Route
 * Endpoint: /api/users/[userId]/activity
 * Methods: GET (get user activity)
 *
 * Supports:
 * - Get user's recent activity/audit logs
 * - Filtering by action type
 * - Pagination
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUserById } from '@/lib/auth/repository';
import {
  queryAuditLogs,
  AuditAction,
  AuditStatus,
} from '@/lib/db/audit-log';
import { logger } from '@/lib/logger';

interface RouteContext {
  params: Promise<{ userId: string }>;
}

/**
 * GET /api/users/[userId]/activity - Get user's recent activity
 *
 * Query parameters:
 * - action: Filter by action type (e.g., login, user_created, etc.)
 * - limit: Number of items to return (default: 50, max: 100)
 * - offset: Offset for pagination (default: 0)
 * - status: Filter by status (success, failed, pending)
 */
export async function GET(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const { userId } = await params;
    const { searchParams } = new URL(request.url);

    // Check if user exists
    const user = await getUserById(userId);
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found',
          },
        },
        { status: 404 }
      );
    }

    // Parse query parameters
    const action = searchParams.get('action') as AuditAction | null;
    const limit = Math.min(
      parseInt(searchParams.get('limit') || '50', 10),
      100
    );
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const status = searchParams.get('status') as AuditStatus | null;

    // Validate action if provided
    if (action && !Object.values(AuditAction).includes(action)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_PARAMETER',
            message: `Invalid action. Must be one of: ${Object.values(AuditAction).join(', ')}`,
          },
        },
        { status: 400 }
      );
    }

    // Validate status if provided
    if (status && !Object.values(AuditStatus).includes(status)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_PARAMETER',
            message: `Invalid status. Must be one of: ${Object.values(AuditStatus).join(', ')}`,
          },
        },
        { status: 400 }
      );
    }

    // Get audit logs for user
    const { logs, total } = await queryAuditLogs({
      user_id: userId,
      action: action || undefined,
      status: status || undefined,
      limit,
      offset,
    });

    // Format activity items for easier consumption
    const activities = logs.map(log => ({
      id: log.id,
      action: log.action,
      description: getActionDescription(log.action, log.details),
      entityType: log.entity_type,
      entityId: log.entity_id,
      resourceType: log.resource_type,
      resourceId: log.resource_id,
      status: log.status,
      errorMessage: log.error_message,
      ipAddress: log.ip_address,
      userAgent: log.user_agent,
      timestamp: log.created_at,
      details: log.details,
    }));

    return NextResponse.json({
      success: true,
      data: {
        userId,
        activities,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total,
        },
      },
    });
  } catch (error) {
    logger.error('Failed to get user activity', { error });
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * Get human-readable description for audit actions
 */
function getActionDescription(
  action: AuditAction,
  details: Record<string, unknown>
): string {
  const descriptions: Record<AuditAction, string> = {
    [AuditAction.LOGIN]: 'User logged in',
    [AuditAction.LOGOUT]: 'User logged out',
    [AuditAction.LOGIN_FAILED]: 'Failed login attempt',
    [AuditAction.PASSWORD_CHANGE]: 'Changed password',
    [AuditAction.PASSWORD_RESET_REQUEST]: 'Requested password reset',
    [AuditAction.PASSWORD_RESET_COMPLETE]: 'Completed password reset',
    [AuditAction.USER_CREATED]: 'Created new user',
    [AuditAction.USER_UPDATED]: 'Updated user',
    [AuditAction.USER_DELETED]: 'Deleted user',
    [AuditAction.USER_ROLE_CHANGED]: 'Changed user role',
    [AuditAction.USER_PERMISSION_CHANGED]: 'Changed user permissions',
    [AuditAction.USER_STATUS_CHANGED]: 'Changed user status',
    [AuditAction.ROLE_CREATED]: 'Created role',
    [AuditAction.ROLE_UPDATED]: 'Updated role',
    [AuditAction.ROLE_DELETED]: 'Deleted role',
    [AuditAction.PERMISSION_GRANTED]: 'Granted permission',
    [AuditAction.PERMISSION_REVOKED]: 'Revoked permission',
    [AuditAction.DATA_READ]: 'Read data',
    [AuditAction.DATA_CREATED]: 'Created data',
    [AuditAction.DATA_UPDATED]: 'Updated data',
    [AuditAction.DATA_DELETED]: 'Deleted data',
    [AuditAction.DATA_EXPORTED]: 'Exported data',
    [AuditAction.SYSTEM_CONFIG_CHANGED]: 'Changed system configuration',
    [AuditAction.SYSTEM_MAINTENANCE]: 'Performed system maintenance',
    [AuditAction.SYSTEM_BACKUP]: 'Created system backup',
    [AuditAction.SYSTEM_RESTORE]: 'Restored from backup',
    [AuditAction.AGENT_CREATED]: 'Created agent',
    [AuditAction.AGENT_UPDATED]: 'Updated agent',
    [AuditAction.AGENT_DELETED]: 'Deleted agent',
    [AuditAction.AGENT_ACTIVATED]: 'Activated agent',
    [AuditAction.AGENT_DEACTIVATED]: 'Deactivated agent',
    [AuditAction.WALLET_CREATED]: 'Created wallet',
    [AuditAction.WALLET_TRANSACTION]: 'Wallet transaction',
    [AuditAction.WALLET_FUNDS_ADDED]: 'Added funds to wallet',
    [AuditAction.WALLET_FUNDS_WITHDRAWN]: 'Withdrew funds from wallet',
  };

  return descriptions[action] || action;
}
