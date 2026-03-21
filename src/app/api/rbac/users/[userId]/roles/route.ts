/**
 * RBAC API - User Roles Management
 * 管理用户的角色分配
 */

import { NextRequest, NextResponse } from 'next/server';
import { withManagerOrAdmin } from '@/lib/auth/middleware-rbac';
import { Role } from '@/lib/permissions/types';
import {
  getUserRoles,
  addRolesToUser,
  removeRolesFromUser,
  getAllRolesWithCount,
} from '@/lib/permissions/repository';
import { getPermissionsForRoles } from '@/lib/permissions/rbac';
import { logger } from '@/lib/logger';

interface RouteContext {
  params: Promise<{ userId: string }>;
}

/**
 * GET /api/rbac/users/[userId]/roles - 获取用户的所有角色
 */
export async function GET(
  request: NextRequest,
  { params }: RouteContext
) {
  return withManagerOrAdmin(request, async (_req, context) => {
    try {
      const { userId } = await params;
      const searchParams = request.nextUrl.searchParams;
      const includePermissions = searchParams.get('includePermissions') === 'true';

      const roles = await getUserRoles(userId);

      let response: {
        userId: string;
        roles: Role[];
        permissions?: string[];
        count: number;
      } = {
        userId,
        roles,
        count: roles.length,
      };

      // 如果需要包含权限
      if (includePermissions && roles.length > 0) {
        const permissions = getPermissionsForRoles(roles);
        response.permissions = permissions;
      }

      return NextResponse.json({
        success: true,
        data: response,
      });
    } catch (error) {
      logger.error('Failed to fetch user roles:', { error, userId: context.userId });
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: error instanceof Error ? error.message : 'Failed to fetch user roles',
          },
        },
        { status: 500 }
      );
    }
  });
}

/**
 * POST /api/rbac/users/[userId]/roles - 为用户添加角色
 */
export async function POST(
  request: NextRequest,
  { params }: RouteContext
) {
  return withManagerOrAdmin(request, async (req, context) => {
    try {
      const { userId } = await params;
      const body = await req.json();
      const { roles } = body;

      // 验证角色数组
      if (!Array.isArray(roles) || roles.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Roles array is required',
            },
          },
          { status: 400 }
        );
      }

      // 过滤有效的角色
      const validRoles = roles.filter((r): r is Role => Object.values(Role).includes(r));

      if (validRoles.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'No valid roles provided',
            },
          },
          { status: 400 }
        );
      }

      // 添加角色
      await addRolesToUser(userId, validRoles, context.userId);

      logger.info('Roles added to user', {
        userId,
        roles: validRoles,
        assignedBy: context.userId,
      });

      return NextResponse.json(
        {
          success: true,
          data: {
            userId,
            addedRoles: validRoles,
            count: validRoles.length,
          },
          message: 'Roles added successfully',
        },
        { status: 201 }
      );
    } catch (error) {
      logger.error('Failed to add roles to user:', { error, userId: context.userId });
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: error instanceof Error ? error.message : 'Failed to add roles to user',
          },
        },
        { status: 500 }
      );
    }
  });
}

/**
 * DELETE /api/rbac/users/[userId]/roles - 从用户移除角色
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteContext
) {
  return withManagerOrAdmin(request, async (req, context) => {
    try {
      const { userId } = await params;
      const body = await req.json();
      const { roles } = body;

      // 验证角色数组
      if (!Array.isArray(roles) || roles.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Roles array is required',
            },
          },
          { status: 400 }
        );
      }

      // 过滤有效的角色
      const validRoles = roles.filter((r): r is Role => Object.values(Role).includes(r));

      if (validRoles.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'No valid roles provided',
            },
          },
          { status: 400 }
        );
      }

      // 移除角色
      await removeRolesFromUser(userId, validRoles);

      logger.info('Roles removed from user', {
        userId,
        roles: validRoles,
        removedBy: context.userId,
      });

      return NextResponse.json({
        success: true,
        data: {
          userId,
          removedRoles: validRoles,
          count: validRoles.length,
        },
        message: 'Roles removed successfully',
      });
    } catch (error) {
      logger.error('Failed to remove roles from user:', { error, userId: context.userId });
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: error instanceof Error ? error.message : 'Failed to remove roles from user',
          },
        },
        { status: 500 }
      );
    }
  });
}
