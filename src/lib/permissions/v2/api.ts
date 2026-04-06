// @ts-nocheck
// @ts-nocheck
/**
 * v1.12.0 Permission Management API
 * 权限管理 API 路由
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  withFineGrainedPermission,
  ResourceType,
  ActionType,
} from '../v2'
import {
  getEnhancedRoles,
  createEnhancedRole,
  updateEnhancedRole,
  deleteEnhancedRole,
  getEnhancedRoleById,
  assignRoleToUser,
  removeRoleFromUser,
  getPermissions,
  createPermission,
  updatePermission,
  deletePermission,
  getUserPermissionContextV2,
} from '../v2/repository-v2'
import { PermissionChangeType } from '../v2/types'

/**
 * GET /api/v2/permissions/roles
 * 获取所有角色
 */
export async function GET_roles(request: NextRequest): Promise<NextResponse> {
  return withFineGrainedPermission(
    ResourceType.SYSTEM,
    ActionType.READ,
    {
      detailedErrors: true,
      enableProfiling: true,
    }
  )(request, async (req, userContext) => {
    try {
      const roles = await getEnhancedRoles()
      return NextResponse.json({
        success: true,
        data: roles,
        meta: {
          timestamp: new Date().toISOString(),
          count: roles.length,
        },
      })
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'FETCH_ROLES_ERROR',
            message: 'Failed to fetch roles',
          },
        },
        { status: 500 }
      )
    }
  })
}

/**
 * POST /api/v2/permissions/roles
 * 创建角色
 */
export async function POST_roles(request: NextRequest): Promise<NextResponse> {
  return withFineGrainedPermission(
    ResourceType.SYSTEM,
    ActionType.MANAGE,
    {
      detailedErrors: true,
    }
  )(request, async (req, userContext) => {
    try {
      const body = await request.json()
      const { name, description, permissions, inheritsFrom, level } = body

      if (!name) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Role name is required',
            },
          },
          { status: 400 }
        )
      }

      const role = await createEnhancedRole(
        {
          name,
          description,
          permissions: permissions || [],
          inheritsFrom: inheritsFrom || [],
          level: level || 0,
          isSystem: false,
          inheritanceDepth: 0,
        },
        userContext.userId,
        userContext.roles[0] || 'admin'
      )

      return NextResponse.json({
        success: true,
        data: role,
        meta: {
          timestamp: new Date().toISOString(),
        },
      })
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'CREATE_ROLE_ERROR',
            message: error instanceof Error ? error.message : 'Failed to create role',
          },
        },
        { status: 500 }
      )
    }
  })
}

/**
 * GET /api/v2/permissions/roles/[id]
 * 获取单个角色
 */
export async function GET_role_by_id(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  return withFineGrainedPermission(
    ResourceType.SYSTEM,
    ActionType.READ,
    { detailedErrors: true }
  )(request, async (req, userContext) => {
    try {
      const role = await getEnhancedRoleById(params.id)

      if (!role) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: 'Role not found',
            },
          },
          { status: 404 }
        )
      }

      return NextResponse.json({
        success: true,
        data: role,
        meta: {
          timestamp: new Date().toISOString(),
        },
      })
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'FETCH_ROLE_ERROR',
            message: 'Failed to fetch role',
          },
        },
        { status: 500 }
      )
    }
  })
}

/**
 * PUT /api/v2/permissions/roles/[id]
 * 更新角色
 */
export async function PUT_role_by_id(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  return withFineGrainedPermission(
    ResourceType.SYSTEM,
    ActionType.MANAGE,
    { detailedErrors: true }
  )(request, async (req, userContext) => {
    try {
      const body = await request.json()
      const { name, description, permissions, inheritsFrom, level } = body

      const role = await updateEnhancedRole(
        params.id,
        {
          name,
          description,
          permissions,
          inheritsFrom,
          level,
        },
        userContext.userId,
        userContext.roles[0] || 'admin'
      )

      if (!role) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: 'Role not found',
            },
          },
          { status: 404 }
        )
      }

      return NextResponse.json({
        success: true,
        data: role,
        meta: {
          timestamp: new Date().toISOString(),
        },
      })
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'UPDATE_ROLE_ERROR',
            message: error instanceof Error ? error.message : 'Failed to update role',
          },
        },
        { status: 500 }
      )
    }
  })
}

/**
 * DELETE /api/v2/permissions/roles/[id]
 * 删除角色
 */
export async function DELETE_role_by_id(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  return withFineGrainedPermission(
    ResourceType.SYSTEM,
    ActionType.MANAGE,
    { detailedErrors: true }
  )(request, async (req, userContext) => {
    try {
      const success = await deleteEnhancedRole(
        params.id,
        userContext.userId,
        userContext.roles[0] || 'admin'
      )

      if (!success) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'DELETE_FAILED',
              message: 'Cannot delete system role or role not found',
            },
          },
          { status: 400 }
        )
      }

      return NextResponse.json({
        success: true,
        meta: {
          timestamp: new Date().toISOString(),
        },
      })
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'DELETE_ROLE_ERROR',
            message: 'Failed to delete role',
          },
        },
        { status: 500 }
      )
    }
  })
}

/**
 * GET /api/v2/permissions
 * 获取所有权限
 */
export async function GET_permissions(request: NextRequest): Promise<NextResponse> {
  return withFineGrainedPermission(
    ResourceType.SYSTEM,
    ActionType.READ,
    { detailedErrors: true }
  )(request, async (req, userContext) => {
    try {
      const permissions = await getPermissions()

      return NextResponse.json({
        success: true,
        data: permissions,
        meta: {
          timestamp: new Date().toISOString(),
          count: permissions.length,
        },
      })
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'FETCH_PERMISSIONS_ERROR',
            message: 'Failed to fetch permissions',
          },
        },
        { status: 500 }
      )
    }
  })
}

/**
 * POST /api/v2/permissions
 * 创建权限
 */
export async function POST_permissions(request: NextRequest): Promise<NextResponse> {
  return withFineGrainedPermission(
    ResourceType.SYSTEM,
    ActionType.MANAGE,
    { detailedErrors: true }
  )(request, async (req, userContext) => {
    try {
      const body = await request.json()
      const { name, description, resourceType, action, conditions, scope, priority, isDeny } = body

      if (!name || !resourceType || !action) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'name, resourceType, and action are required',
            },
          },
          { status: 400 }
        )
      }

      const permission = await createPermission(
        {
          name,
          description,
          resourceType,
          action,
          conditions,
          scope,
          priority: priority || 0,
          isDeny: isDeny || false,
        },
        userContext.userId,
        userContext.roles[0] || 'admin'
      )

      return NextResponse.json({
        success: true,
        data: permission,
        meta: {
          timestamp: new Date().toISOString(),
        },
      })
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'CREATE_PERMISSION_ERROR',
            message: error instanceof Error ? error.message : 'Failed to create permission',
          },
        },
        { status: 500 }
      )
    }
  })
}

/**
 * POST /api/v2/permissions/assign-role
 * 为用户分配角色
 */
export async function POST_assign_role(request: NextRequest): Promise<NextResponse> {
  return withFineGrainedPermission(
    ResourceType.USER,
    ActionType.MANAGE,
    { detailedErrors: true }
  )(request, async (req, userContext) => {
    try {
      const body = await request.json()
      const { userId, roleId, tenantId, expiresAt } = body

      if (!userId || !roleId) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'userId and roleId are required',
            },
          },
          { status: 400 }
        )
      }

      await assignRoleToUser(
        userId,
        roleId,
        userContext.userId,
        tenantId,
        expiresAt ? new Date(expiresAt) : undefined
      )

      return NextResponse.json({
        success: true,
        meta: {
          timestamp: new Date().toISOString(),
        },
      })
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'ASSIGN_ROLE_ERROR',
            message: error instanceof Error ? error.message : 'Failed to assign role',
          },
        },
        { status: 500 }
      )
    }
  })
}

/**
 * POST /api/v2/permissions/remove-role
 * 移除用户角色
 */
export async function POST_remove_role(request: NextRequest): Promise<NextResponse> {
  return withFineGrainedPermission(
    ResourceType.USER,
    ActionType.MANAGE,
    { detailedErrors: true }
  )(request, async (req, userContext) => {
    try {
      const body = await request.json()
      const { userId, roleId } = body

      if (!userId || !roleId) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'userId and roleId are required',
            },
          },
          { status: 400 }
        )
      }

      await removeRoleFromUser(userId, roleId, userContext.userId)

      return NextResponse.json({
        success: true,
        meta: {
          timestamp: new Date().toISOString(),
        },
      })
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'REMOVE_ROLE_ERROR',
            message: error instanceof Error ? error.message : 'Failed to remove role',
          },
        },
        { status: 500 }
      )
    }
  })
}

/**
 * GET /api/v2/permissions/user/[id]
 * 获取用户权限上下文
 */
export async function GET_user_permissions(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  return withFineGrainedPermission(
    ResourceType.USER,
    ActionType.READ,
    { detailedErrors: true }
  )(request, async (req, userContext) => {
    try {
      const context = await getUserPermissionContextV2(params.id)

      if (!context) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: 'User permissions not found',
            },
          },
          { status: 404 }
        )
      }

      return NextResponse.json({
        success: true,
        data: context,
        meta: {
          timestamp: new Date().toISOString(),
        },
      })
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'FETCH_USER_PERMISSIONS_ERROR',
            message: 'Failed to fetch user permissions',
          },
        },
        { status: 500 }
      )
    }
  })
}
