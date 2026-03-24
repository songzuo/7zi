/**
 * RBAC API - Roles Management
 * 管理系统角色及其权限
 */

import { NextRequest } from 'next/server';
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
import { createSuccessResponse, createErrorResponse, createValidationError } from '@/lib/api/error-handler';

/**
 * GET /api/rbac/roles - 获取所有角色
 */
export async function GET(request: NextRequest) {
  return withAdmin(request, async (_req, context) => {
    try {
      const searchParams = request.nextUrl.searchParams;
      const includeCount = searchParams.get('includeCount') === 'true';

      const roles = includeCount ? await getAllRolesWithCount() : await getAllRoles();

      return createSuccessResponse({
        roles,
        count: roles.length,
      });
    } catch (error) {
      logger.error('Failed to fetch roles:', error instanceof Error ? error : new Error(String(error)), { userId: context.userId, category: 'rbac' });
      return createErrorResponse(new Error('Failed to fetch roles'));
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
        return createValidationError('Role ID and name are required');
      }

      // 检查角色 ID 是否已存在（包括系统角色）
      if (Object.values(Role).includes(id as Role)) {
        return createValidationError('Cannot use system role ID for custom role');
      }

      const existingRole = await getRoleById(id);
      if (existingRole) {
        const error = new Error('Role with this ID already exists');
        (error as any).statusCode = 409;
        return createErrorResponse(error);
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
        category: 'rbac'
      });

      return createSuccessResponse(newRole, 201);
    } catch (error) {
      logger.error('Failed to create role:', error instanceof Error ? error : new Error(String(error)), { userId: context.userId, category: 'rbac' });
      return createErrorResponse(new Error('Failed to create role'));
    }
  });
}
