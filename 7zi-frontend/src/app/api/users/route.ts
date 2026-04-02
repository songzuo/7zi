/**
 * User Management API Route
 *
 * 演示如何使用权限装饰器和中间件
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  UserWithRoles,
  createUserWithRoles,
  RequirePermission,
  RequireAnyPermission,
  RequireAllPermissions,
  RequireRoleLevel,
  ResourceType,
  ActionType,
  PermissionDeniedError,
  Permissions,
} from '@/lib/permissions'
import { UserRole } from '@/lib/auth'
import {
  createSuccessResponse,
  createUnauthorizedError,
  createForbiddenError,
  createErrorResponse,
} from '@/lib/api/error-handler'

/**
 * 模拟的 API 上下文（实际应用中从 session 或 JWT 解析）
 */
interface ApiContext {
  user: UserWithRoles
  request: NextRequest
  params?: Record<string, string>
}

/**
 * 用户创建数据接口
 */
interface UserCreateData {
  username: string
  email: string
}

/**
 * 模拟的用户数据存储
 */
const users: Record<string, UserWithRoles> = {
  'user-1': createUserWithRoles(
    {
      id: 'user-1',
      username: 'admin',
      email: 'admin@example.com',
      role: UserRole.ADMIN,
      permissions: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    ['super_admin']
  ),
  'user-2': createUserWithRoles(
    {
      id: 'user-2',
      username: 'developer',
      email: 'developer@example.com',
      role: UserRole.USER,
      permissions: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    ['developer']
  ),
}

/**
 * GET /api/users - 列出所有用户
 * 需要权限: user:list
 */
export async function GET(request: NextRequest) {
  try {
    // 模拟：从请求中获取用户信息
    // 实际应用中应该从 session、JWT 或 cookie 中解析
    const userId = request.headers.get('x-user-id') || 'user-2' // 默认为开发者
    const user = users[userId]

    if (!user) {
      return createUnauthorizedError('User not found')
    }

    // 创建 API 上下文
    const ctx: ApiContext = { user, request }

    // 创建 API 处理器类
    const userController = new UserController()

    // 调用被装饰的方法
    return await userController.listUsers(ctx)
  } catch (error) {
    if (error instanceof PermissionDeniedError) {
      return createForbiddenError(error.message, {
        requiredPermissions: error.requiredPermissions,
        missingPermissions: error.missingPermissions,
      })
    }

    return createErrorResponse(error instanceof Error ? error : new Error(String(error)))
  }
}

/**
 * POST /api/users - 创建新用户
 * 需要权限: user:create
 */
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id') || 'user-2'
    const user = users[userId]

    if (!user) {
      return createUnauthorizedError('User not found')
    }

    const ctx: ApiContext = { user, request }
    const userController = new UserController()

    const body = await request.json()

    return await userController.createUser(ctx, body)
  } catch (error) {
    if (error instanceof PermissionDeniedError) {
      return createForbiddenError(error.message, {
        requiredPermissions: error.requiredPermissions,
        missingPermissions: error.missingPermissions,
      })
    }

    return createErrorResponse(error instanceof Error ? error : new Error(String(error)))
  }
}

/**
 * 用户控制器类
 * 使用装饰器进行权限控制
 */
class UserController {
  /**
   * 列出所有用户 - 需要 user:list 权限
   */
  @RequirePermission(ResourceType.USER, ActionType.LIST)
  async listUsers(ctx: ApiContext): Promise<NextResponse> {
    const { user } = ctx

    // 实际业务逻辑
    const userList = Object.values(users).map(u => ({
      id: u.id,
      username: u.username,
      email: u.email,
      roles: u.roles.map(r => r.name),
    }))

    return createSuccessResponse(userList)
  }

  /**
   * 创建新用户 - 需要 user:create 权限
   */
  @RequirePermission(ResourceType.USER, ActionType.CREATE)
  async createUser(ctx: ApiContext, userData: unknown): Promise<NextResponse> {
    const { user } = ctx

    const data = userData as UserCreateData

    // 实际业务逻辑
    const newUser = {
      id: `user-${Date.now()}`,
      username: data.username,
      email: data.email,
      createdAt: new Date(),
    }

    return createSuccessResponse(newUser, 201)
  }

  /**
   * 更新用户信息 - 需要满足任一权限：user:update 或 user:manage
   */
  @RequireAnyPermission([
    { resourceType: ResourceType.USER, action: ActionType.UPDATE },
    { resourceType: ResourceType.USER, action: ActionType.DELETE },
  ])
  async updateUser(ctx: ApiContext, userId: string, updates: unknown): Promise<NextResponse> {
    const { user } = ctx

    // Actual business logic
    const updateData = updates as Record<string, unknown>
    return createSuccessResponse({ id: userId, ...updateData })
  }

  /**
   * 删除用户 - 需要 user:delete 和 user:update 两个权限
   */
  @RequireAllPermissions([
    { resourceType: ResourceType.USER, action: ActionType.DELETE },
    { resourceType: ResourceType.USER, action: ActionType.UPDATE },
  ])
  async deleteUser(ctx: ApiContext, userId: string): Promise<NextResponse> {
    const { user } = ctx

    // 实际业务逻辑
    return createSuccessResponse({
      message: `User ${userId} deleted`,
    })
  }

  /**
   * 管理用户 - 需要角色等级 >= 80（管理员级别）
   */
  @RequireRoleLevel(80)
  async manageUser(ctx: ApiContext): Promise<NextResponse> {
    const { user } = ctx

    return createSuccessResponse({
      message: 'User management operations',
    })
  }

  /**
   * 导出用户数据 - 需要 data:export 权限
   */
  @RequirePermission(ResourceType.DATA, ActionType.EXPORT)
  async exportUsers(ctx: ApiContext): Promise<NextResponse> {
    const { user } = ctx

    // 实际业务逻辑
    const userData = Object.values(users).map(u => ({
      id: u.id,
      username: u.username,
      email: u.email,
    }))

    return createSuccessResponse(userData)
  }
}
