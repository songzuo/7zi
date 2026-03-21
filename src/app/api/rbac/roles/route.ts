/**
 * RBAC API - Roles Management
 * 管理系统角色及其权限
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAdmin } from '@/lib/auth/middleware-rbac';
import { Role, Permission } from '@/lib/permissions/types';
import {
  getAllRoles,
  getAllRolesWithCount,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
  assignPermissionsToRole,
  getPermissionsByRole,
} from '@/lib/permissions/repository';
import { getRoleDefinition } from '@/lib/permissions/rbac';
import { logger } from '@/lib/logger';

/**
 * GET /api/rbac/roles - 获取所有角色
 */
export async function GET(request: NextRequest) {
  return withAdmin(request, async (_req, context) => {
    try {
      const searchParams = request.nextUrl.searchParams;
      const includeCount = searchParams.get('includeCount') === 'true';

      const roles = includeCount ? await getAllRolesWithCount() : await getAllRoles();

      return NextResponse.json({
        success: true,
        data: roles,
        meta: {
          count: roles.length,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error('Failed to fetch roles:', { error, userId: context.userId });
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: error instanceof Error ? error.message : 'Failed to fetch roles',
          },
        },
        { status: 500 }
      );
    }
  });
}

/**
 * POST /api/rbac/roles - 创建自定义角色
 */
export async function POST(request: NextRequest) {
  return withAdmin(request, async (req, context) => {
    try {
      const body = await req.json();
      const { id, name, description, permissions } = body;

      // 验证必填字段
      if (!id || !name) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Role ID and name are required',
            },
          },
          { status: 400 }
        );
      }

      // 检查角色 ID 是否已存在（包括系统角色）
      if (Object.values(Role).includes(id as Role)) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'INVALID_ROLE_ID',
              message: 'Cannot use system role ID for custom role',
            },
          },
          { status: 400 }
        );
      }

      const existingRole = await getRoleById(id);
      if (existingRole) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'ROLE_EXISTS',
              message: 'Role with this ID already exists',
            },
          },
          { status: 409 }
        );
      }

      // 验证权限
      const validPermissions = Array.isArray(permissions)
        ? permissions.filter((p): p is Permission => Object.values(Permission).includes(p))
        : [];

      // 创建角色
      const newRole = await createRole({
        id,
        name,
        description,
        permissions: validPermissions,
        isSystem: false,
      });

      logger.info('Custom role created', {
        roleId: id,
        roleName: name,
        createdBy: context.userId,
        permissions: validPermissions.length,
      });

      return NextResponse.json(
        {
          success: true,
          data: newRole,
          message: 'Role created successfully',
        },
        { status: 201 }
      );
    } catch (error) {
      logger.error('Failed to create role:', { error, userId: context.userId });
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: error instanceof Error ? error.message : 'Failed to create role',
          },
        },
        { status: 500 }
      );
    }
  });
}
