/**
 * RBAC API - Permissions Management
 * 管理系统所有权限
 */

import { NextRequest } from 'next/server';
import { withAdmin } from '@/lib/auth/middleware-rbac';
import { Permission } from '@/lib/permissions/types';
import { getAllPermissions } from '@/lib/permissions/repository';
import { logger } from '@/lib/logger';
import { createSuccessResponse, createErrorResponse } from '@/lib/api/error-handler';

/**
 * GET /api/rbac/permissions - 获取所有权限
 */
export async function GET(request: NextRequest) {
  return withAdmin(request, async (_req, context) => {
    try {
      const searchParams = request.nextUrl.searchParams;
      const groupBy = searchParams.get('groupBy'); // 'resource' or 'action'

      const permissions = await getAllPermissions();

      let data: Permission[] | Record<string, Permission[]> = permissions;

      // 按资源类型分组
      if (groupBy === 'resource') {
        const grouped = permissions.reduce((acc, permission) => {
          const [resource] = permission.split(':');
          if (!acc[resource]) {
            acc[resource] = [];
          }
          acc[resource].push(permission);
          return acc;
        }, {} as Record<string, Permission[]>);

        data = grouped;
      }
      // 按操作类型分组
      else if (groupBy === 'action') {
        const grouped = permissions.reduce((acc, permission) => {
          const [, action] = permission.split(':');
          if (!acc[action]) {
            acc[action] = [];
          }
          acc[action].push(permission);
          return acc;
        }, {} as Record<string, Permission[]>);

        data = grouped;
      }

      return createSuccessResponse({
        data,
        count: Array.isArray(permissions) ? permissions.length : 0,
      });
    } catch (_error) {
      logger.error('Failed to fetch permissions:', error instanceof Error ? error : new Error(String(error)), { userId: context.userId, category: 'rbac' });
      return createErrorResponse(new Error('Failed to fetch permissions'));
    }
  });
}
