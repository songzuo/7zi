/**
 * 受保护的 API 示例
 * 演示如何使用认证中间件保护 API 路由
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  withAuth, 
  requireAuth, 
  requireAdmin,
  getCurrentUser,
  validationError,
  successResponse 
} from '@/lib/middleware';

/**
 * 示例: 需要登录的路由
 * 
 * @example
 * GET /api/examples/protected
 * Headers: Authorization: Bearer <token>
 */
export const GET = requireAuth(async (request: NextRequest, { user }) => {
  // 获取当前用户
  const currentUser = getCurrentUser(request);
  
  return successResponse({
    message: 'This is a protected route',
    user: {
      id: user.sub,
      email: user.email,
      role: user.role,
    },
    timestamp: new Date().toISOString(),
  });
});

/**
 * 示例: 需要管理员角色的路由
 * 
 * @example
 * DELETE /api/examples/admin-only
 * Headers: Authorization: Bearer <token>
 */
export const DELETE = requireAdmin(async (request: NextRequest, { user }) => {
  // 获取请求体
  const body = await request.json();
  const { targetId } = body;

  if (!targetId) {
    return validationError('Target ID is required', 'targetId', request);
  }

  return successResponse({
    message: 'Admin action completed',
    admin: user.email,
    targetId,
  });
});

/**
 * 示例: 自定义认证选项
 * 
 * @example
 * POST /api/examples/custom-auth
 * Headers: 
 *   Authorization: Bearer <token>
 *   X-CSRF-Token: <csrf-token>
 */
export const POST = withAuth({
  roles: ['admin', 'user'],
  permissions: ['write'],
  csrf: true,
  rateLimit: {
    windowMs: 60 * 1000,
    maxRequests: 20,
  },
})(async (request: NextRequest, { user }) => {
  const body = await request.json();
  
  return successResponse({
    message: 'Custom auth completed',
    user: user.email,
    data: body,
  });
});

/**
 * 示例: 可选认证 (用户可能未登录)
 * 
 * @example
 * GET /api/examples/optional-auth
 */
export const PUT = withAuth({ optional: true })(async (request: NextRequest, { user }) => {
  const currentUser = getCurrentUser(request);
  
  // 用户可能未登录
  if (!currentUser) {
    return successResponse({
      message: 'Anonymous access',
      user: null,
    });
  }
  
  return successResponse({
    message: 'Authenticated access',
    user: {
      id: currentUser.sub,
      email: currentUser.email,
    },
  });
});
