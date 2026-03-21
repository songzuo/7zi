/**
 * User Management API Route
 *
 * 演示如何使用权限装饰器和中间件
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  UserWithRoles,
  createUserWithRoles,
  RequirePermission,
  RequireAnyPermission,
  RequireAllPermissions,
  RequireRoleLevel,
  ResourceType,
  PermissionDeniedError,
  Permissions,
} from '../../lib/permissions';

/**
 * 模拟的 API 上下文（实际应用中从 session 或 JWT 解析）
 */
interface ApiContext {
  user: UserWithRoles;
  request: NextRequest;
  params?: Record<string, string>;
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
      role: 'admin' as any,
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
      role: 'user' as any,
      permissions: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    ['developer']
  ),
};

/**
 * GET /api/users - 列出所有用户
 * 需要权限: user:list
 */
export async function GET(request: NextRequest) {
  try {
    // 模拟：从请求中获取用户信息
    // 实际应用中应该从 session、JWT 或 cookie 中解析
    const userId = request.headers.get('x-user-id') || 'user-2'; // 默认为开发者
    const user = users[userId];

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    // 创建 API 上下文
    const ctx: ApiContext = { user, request };

    // 创建 API 处理器类
    const userController = new UserController();

    // 调用被装饰的方法
    return await userController.listUsers(ctx);
  } catch (error) {
    if (error instanceof PermissionDeniedError) {
      return NextResponse.json(
        {
          error: 'Permission denied',
          message: error.message,
          requiredPermissions: error.requiredPermissions,
          missingPermissions: error.missingPermissions,
        },
        { status: 403 }
      );
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/users - 创建新用户
 * 需要权限: user:create
 */
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id') || 'user-2';
    const user = users[userId];

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    const ctx: ApiContext = { user, request };
    const userController = new UserController();

    const body = await request.json();

    return await userController.createUser(ctx, body);
  } catch (error) {
    if (error instanceof PermissionDeniedError) {
      return NextResponse.json(
        {
          error: 'Permission denied',
          message: error.message,
          requiredPermissions: error.requiredPermissions,
          missingPermissions: error.missingPermissions,
        },
        { status: 403 }
      );
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
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
  @RequirePermission(ResourceType.USER, 'list')
  async listUsers(ctx: ApiContext): Promise<NextResponse> {
    const { user } = ctx;

    // 实际业务逻辑
    const userList = Object.values(users).map(u => ({
      id: u.id,
      username: u.username,
      email: u.email,
      roles: u.roles.map(r => r.name),
    }));

    return NextResponse.json({
      success: true,
      data: userList,
    });
  }

  /**
   * 创建新用户 - 需要 user:create 权限
   */
  @RequirePermission(ResourceType.USER, 'create')
  async createUser(ctx: ApiContext, userData: unknown): Promise<NextResponse> {
    const { user } = ctx;

    // 实际业务逻辑
    const newUser = {
      id: `user-${Date.now()}`,
      username: (userData as any).username,
      email: (userData as any).email,
      createdAt: new Date(),
    };

    return NextResponse.json({
      success: true,
      data: newUser,
    });
  }

  /**
   * 更新用户信息 - 需要满足任一权限：user:update 或 user:manage
   */
  @RequireAnyPermission([
    { resourceType: ResourceType.USER, action: 'update' },
    { resourceType: ResourceType.USER, action: 'delete' },
  ])
  async updateUser(ctx: ApiContext, userId: string, updates: unknown): Promise<NextResponse> {
    const { user } = ctx;

    // 实际业务逻辑
    return NextResponse.json({
      success: true,
      data: { id: userId, ...updates },
    });
  }

  /**
   * 删除用户 - 需要 user:delete 和 user:update 两个权限
   */
  @RequireAllPermissions([
    { resourceType: ResourceType.USER, action: 'delete' },
    { resourceType: ResourceType.USER, action: 'update' },
  ])
  async deleteUser(ctx: ApiContext, userId: string): Promise<NextResponse> {
    const { user } = ctx;

    // 实际业务逻辑
    return NextResponse.json({
      success: true,
      message: `User ${userId} deleted`,
    });
  }

  /**
   * 管理用户 - 需要角色等级 >= 80（管理员级别）
   */
  @RequireRoleLevel(80)
  async manageUser(ctx: ApiContext): Promise<NextResponse> {
    const { user } = ctx;

    return NextResponse.json({
      success: true,
      message: 'User management operations',
    });
  }

  /**
   * 导出用户数据 - 需要 data:export 权限
   */
  @RequirePermission(ResourceType.DATA, 'export')
  async exportUsers(ctx: ApiContext): Promise<NextResponse> {
    const { user } = ctx;

    // 实际业务逻辑
    const userData = Object.values(users).map(u => ({
      id: u.id,
      username: u.username,
      email: u.email,
    }));

    return NextResponse.json({
      success: true,
      data: userData,
    });
  }
}
