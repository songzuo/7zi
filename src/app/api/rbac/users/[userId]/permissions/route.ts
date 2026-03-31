/**
 * RBAC API - User Permissions Check
 * 检查用户的权限
 */

import { withUserAuth } from '@/lib/auth/middleware-rbac';
import { Permission, Role } from '@/lib/permissions/types';
import { getUserRoles } from '@/lib/permissions/repository';
import {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  hasRole,
  hasAnyRole,
  hasAllRoles,
  getPermissionsForRoles,
} from '@/lib/permissions/rbac';
import { logger } from '@/lib/logger';

interface RouteContext {
  params: Promise<{ userId: string }>;
}

/**
 * GET /api/rbac/users/[userId]/permissions - 获取用户的所有权限
 */
export async function GET(
  request: NextRequest,
  { params }: RouteContext
) {
  return withUserAuth(request, async (_req, context) => {
    try {
      const { userId } = await params;

      // 用户只能查看自己的权限，除非是管理员
      if (context.userId !== userId && !context.permissionContext?.roles.includes(Role.ADMIN)) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'You can only view your own permissions',
            },
          },
          { status: 403 }
        );
      }

      const roles = await getUserRoles(userId);
      const permissions = getPermissionsForRoles(roles);

      return NextResponse.json({
        success: true,
        data: {
          userId,
          roles,
          permissions,
          roleCount: roles.length,
          permissionCount: permissions.length,
        },
      });
    } catch (_error) {
      logger.error('Failed to fetch user permissions:', { error, userId: context.userId });
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: error instanceof Error ? error.message : 'Failed to fetch user permissions',
          },
        },
        { status: 500 }
      );
    }
  });
}

/**
 * POST /api/rbac/users/[userId]/permissions/check - 检查用户是否有特定权限
 */
export async function POST(
  request: NextRequest,
  { params }: RouteContext
) {
  return withUserAuth(request, async (req, context) => {
    try {
      const { userId } = await params;
      const body = await req.json();
      const { permissions, checkType = 'all', roles: roleChecks } = body;

      // 用户只能检查自己的权限，除非是管理员
      if (context.userId !== userId && !context.permissionContext?.roles.includes(Role.ADMIN)) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'You can only check your own permissions',
            },
          },
          { status: 403 }
        );
      }

      const roles = await getUserRoles(userId);
      const permissionContext = {
        userId,
        roles,
        permissions: getPermissionsForRoles(roles),
      };

      const result: Record<string, unknown> = {
        userId,
        roles,
      };

      // 检查权限
      if (permissions && Array.isArray(permissions)) {
        const validPermissions = permissions.filter((p): p is Permission =>
          Object.values(Permission).includes(p)
        );

        if (validPermissions.length > 0) {
          if (checkType === 'any') {
            result.hasAnyPermission = hasAnyPermission(permissionContext, validPermissions);
            result.hasAllPermissions = hasAllPermissions(permissionContext, validPermissions);
          } else {
            result.hasAllPermissions = hasAllPermissions(permissionContext, validPermissions);
            result.hasAnyPermission = hasAnyPermission(permissionContext, validPermissions);
          }
          result.permissions = validPermissions;
        }
      }

      // 检查角色
      if (roleChecks && Array.isArray(roleChecks)) {
        const validRoles = roleChecks.filter((r): r is Role => Object.values(Role).includes(r));

        if (validRoles.length > 0) {
          result.hasAnyRole = hasAnyRole(permissionContext, validRoles);
          result.hasAllRoles = hasAllRoles(permissionContext, validRoles);
          result.roleChecks = validRoles;
        }
      }

      return NextResponse.json({
        success: true,
        data: result,
      });
    } catch (_error) {
      logger.error('Failed to check user permissions:', { error, userId: context.userId });
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: error instanceof Error ? error.message : 'Failed to check user permissions',
          },
        },
        { status: 500 }
      );
    }
  });
}
