import { NextRequest, NextResponse } from 'next/server'
/**
 * RBAC API - Single Role Management
 * 管理单个角色的详细信息
 */

import { withAdmin } from '@/lib/auth/middleware-rbac'
import { Role, Permission } from '@/lib/permissions/types'
import {
  getRoleById,
  updateRole,
  deleteRole,
  assignPermissionsToRole,
  removePermissionsFromRole,
  getPermissionsByRole,
} from '@/lib/permissions/repository'
import { getRoleDefinition } from '@/lib/permissions/rbac'
import { logger } from '@/lib/logger'

interface RouteContext {
  params: Promise<{ roleId: string }>
}

/**
 * GET /api/rbac/roles/[roleId] - 获取角色详情
 */
export async function GET(request: NextRequest, { params }: RouteContext) {
  return withAdmin(request, async (_req, context) => {
    try {
      const { roleId } = await params
      const searchParams = request.nextUrl.searchParams
      const includePermissions = searchParams.get('includePermissions') === 'true'

      let role = await getRoleById(roleId)

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
        )
      }

      // 如果需要包含权限
      if (includePermissions) {
        const permissions = await getPermissionsByRole(role.id as Role)
        role = { ...role, permissions }
      }

      return NextResponse.json({
        success: true,
        data: role,
      })
    } catch (error) {
      logger.error('Failed to fetch role:', { error, userId: context.userId })
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: error instanceof Error ? error.message : 'Failed to fetch role',
          },
        },
        { status: 500 }
      )
    }
  })
}

/**
 * PUT /api/rbac/roles/[roleId] - 更新角色
 */
export async function PUT(request: NextRequest, { params }: RouteContext) {
  return withAdmin(request, async (req, context) => {
    try {
      const { roleId } = await params
      const body = await req.json()
      const { name, description, permissions } = body

      // 检查角色是否存在
      const existingRole = await getRoleById(roleId)
      if (!existingRole) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'ROLE_NOT_FOUND',
              message: 'Role not found',
            },
          },
          { status: 404 }
        )
      }

      // 系统角色不能修改 ID
      if (Object.values(Role).includes(roleId as Role) && existingRole.isSystem) {
        // 系统角色只能修改名称和描述，不能修改权限
        if (permissions !== undefined) {
          return NextResponse.json(
            {
              success: false,
              error: {
                code: 'SYSTEM_ROLE_PROTECTED',
                message: 'Cannot modify permissions of system role',
              },
            },
            { status: 403 }
          )
        }

        if (name !== undefined || description !== undefined) {
          await updateRole(roleId, {
            name: name || existingRole.name,
            description: description !== undefined ? description : existingRole.description,
          })

          logger.info('System role updated', {
            roleId,
            updatedBy: context.userId,
          })

          const updatedRole = await getRoleById(roleId)
          return NextResponse.json({
            success: true,
            data: updatedRole,
            message: 'Role updated successfully',
          })
        }

        return NextResponse.json({
          success: true,
          data: existingRole,
        })
      }

      // 自定义角色可以完全修改
      const updateData: { name?: string; description?: string; permissions?: Permission[] } = {}

      if (name !== undefined) updateData.name = name
      if (description !== undefined) updateData.description = description

      if (permissions !== undefined) {
        const validPermissions = Array.isArray(permissions)
          ? permissions.filter((p): p is Permission => Object.values(Permission).includes(p))
          : []
        updateData.permissions = validPermissions

        // 更新权限映射
        if (validPermissions.length > 0) {
          await assignPermissionsToRole(roleId as Role, validPermissions, context.userId)
        }
      }

      const updatedRole = await updateRole(roleId, updateData)

      logger.info('Custom role updated', {
        roleId,
        updatedBy: context.userId,
      })

      return NextResponse.json({
        success: true,
        data: updatedRole,
        message: 'Role updated successfully',
      })
    } catch (error) {
      logger.error('Failed to update role:', { error, userId: context.userId })
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: error instanceof Error ? error.message : 'Failed to update role',
          },
        },
        { status: 500 }
      )
    }
  })
}

/**
 * DELETE /api/rbac/roles/[roleId] - 删除角色
 */
export async function DELETE(request: NextRequest, { params }: RouteContext) {
  return withAdmin(request, async (_req, context) => {
    try {
      const { roleId } = await params

      // 检查角色是否存在
      const existingRole = await getRoleById(roleId)
      if (!existingRole) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'ROLE_NOT_FOUND',
              message: 'Role not found',
            },
          },
          { status: 404 }
        )
      }

      // 系统角色不能删除
      if (existingRole.isSystem) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'SYSTEM_ROLE_PROTECTED',
              message: 'Cannot delete system role',
            },
          },
          { status: 403 }
        )
      }

      await deleteRole(roleId)

      logger.info('Custom role deleted', {
        roleId,
        deletedBy: context.userId,
      })

      return NextResponse.json({
        success: true,
        message: 'Role deleted successfully',
      })
    } catch (error) {
      logger.error('Failed to delete role:', { error, userId: context.userId })
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: error instanceof Error ? error.message : 'Failed to delete role',
          },
        },
        { status: 500 }
      )
    }
  })
}
