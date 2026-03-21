/**
 * RBAC API - Role Permissions Management
 * 管理角色的权限分配
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAdmin } from '@/lib/auth/middleware-rbac';
import { Role, Permission } from '@/lib/permissions/types';
import {
  getRoleById,
  getPermissionsByRole,
  assignPermissionsToRole,
  removePermissionsFromRole,
} from '@/lib/permissions/repository';
import { logger } from '@/lib/logger';

interface RouteContext {
  params: Promise<{ roleId: string }>;
}

/**
 * GET /api/rbac/roles/[roleId]/permissions - 获取角色的所有权限
 */
export async function GET(
  request: NextRequest,
  { params }: RouteContext
) {
  return withAdmin(request, async (_req, context) => {
    try {
      const { roleId } = await params;

      // 检查角色是否存在
      const role = await getRoleById(roleId);
      if (!role) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'ROLE_NOT_FOUND',
              message: 'Role not found',
            },
          },
          { status: 404 }
        );
      }

      const permissions = await getPermissionsByRole(roleId as Role);

      return NextResponse.json({
        success: true,
        data: {
          roleId,
          permissions,
          count: permissions.length,
        },
      });
    } catch (error) {
      logger.error('Failed to fetch role permissions:', { error, userId: context.userId });
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: error instanceof Error ? error.message : 'Failed to fetch role permissions',
          },
        },
        { status: 500 }
      );
    }
  });
}

/**
 * POST /api/rbac/roles/[roleId]/permissions - 为角色添加权限
 */
export async function POST(
  request: NextRequest,
  { params }: RouteContext
) {
  return withAdmin(request, async (req, context) => {
    try {
      const { roleId } = await params;
      const body = await req.json();
      const { permissions } = body;

      // 验证权限数组
      if (!Array.isArray(permissions) || permissions.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Permissions array is required',
            },
          },
          { status: 400 }
        );
      }

      // 检查角色是否存在
      const role = await getRoleById(roleId);
      if (!role) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'ROLE_NOT_FOUND',
              message: 'Role not found',
            },
          },
          { status: 404 }
        );
      }

      // 系统角色不能修改权限
      if (role.isSystem) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'SYSTEM_ROLE_PROTECTED',
              message: 'Cannot modify permissions of system role',
            },
          },
          { status: 403 }
        );
      }

      // 过滤有效的权限
      const validPermissions = permissions.filter((p): p is Permission =>
        Object.values(Permission).includes(p)
      );

      if (validPermissions.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'No valid permissions provided',
            },
          },
          { status: 400 }
        );
      }

      // 分配权限
      await assignPermissionsToRole(roleId as Role, validPermissions, context.userId);

      logger.info('Permissions assigned to role', {
        roleId,
        permissions: validPermissions.length,
        assignedBy: context.userId,
      });

      return NextResponse.json({
        success: true,
        data: {
          roleId,
          addedPermissions: validPermissions,
          count: validPermissions.length,
        },
        message: 'Permissions assigned successfully',
      });
    } catch (error) {
      logger.error('Failed to assign permissions:', { error, userId: context.userId });
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: error instanceof Error ? error.message : 'Failed to assign permissions',
          },
        },
        { status: 500 }
      );
    }
  });
}

/**
 * DELETE /api/rbac/roles/[roleId]/permissions - 从角色移除权限
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteContext
) {
  return withAdmin(request, async (req, context) => {
    try {
      const { roleId } = await params;
      const body = await req.json();
      const { permissions } = body;

      // 验证权限数组
      if (!Array.isArray(permissions) || permissions.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Permissions array is required',
            },
          },
          { status: 400 }
        );
      }

      // 检查角色是否存在
      const role = await getRoleById(roleId);
      if (!role) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'ROLE_NOT_FOUND',
              message: 'Role not found',
            },
          },
          { status: 404 }
        );
      }

      // 系统角色不能修改权限
      if (role.isSystem) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'SYSTEM_ROLE_PROTECTED',
              message: 'Cannot modify permissions of system role',
            },
          },
          { status: 403 }
        );
      }

      // 过滤有效的权限
      const validPermissions = permissions.filter((p): p is Permission =>
        Object.values(Permission).includes(p)
      );

      if (validPermissions.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'No valid permissions provided',
            },
          },
          { status: 400 }
        );
      }

      // 移除权限
      await removePermissionsFromRole(roleId as Role, validPermissions);

      logger.info('Permissions removed from role', {
        roleId,
        permissions: validPermissions.length,
        removedBy: context.userId,
      });

      return NextResponse.json({
        success: true,
        data: {
          roleId,
          removedPermissions: validPermissions,
          count: validPermissions.length,
        },
        message: 'Permissions removed successfully',
      });
    } catch (error) {
      logger.error('Failed to remove permissions:', { error, userId: context.userId });
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: error instanceof Error ? error.message : 'Failed to remove permissions',
          },
        },
        { status: 500 }
      );
    }
  });
}
