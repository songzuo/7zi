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
  successResponse,
  extractToken,
  verifyToken,
} from '@/lib/middleware';

/**
 * 示例: 需要登录的路由
 * 
 * @example
 * GET /api/examples/protected
 * Headers: Authorization: Bearer <token>
 */
export async function GET(request: NextRequest): Promise<Response> {
  // 手动认证检查
  const token = extractToken(request);
  if (!token) {
    return NextResponse.json(
      { error: 'Authentication required', code: 'AUTH_REQUIRED' },
      { status: 401 }
    );
  }
  
  const payload = await verifyToken(token);
  if (!payload) {
    return NextResponse.json(
      { error: 'Invalid or expired token', code: 'AUTH_INVALID' },
      { status: 401 }
    );
  }
  
  return successResponse({
    message: 'This is a protected route',
    user: {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    },
    timestamp: new Date().toISOString(),
  });
}

/**
 * 示例: 需要管理员角色的路由
 * 
 * @example
 * DELETE /api/examples/admin-only
 * Headers: Authorization: Bearer <token>
 */
export async function DELETE(request: NextRequest): Promise<Response> {
  // 手动认证 + 角色检查
  const token = extractToken(request);
  if (!token) {
    return NextResponse.json(
      { error: 'Authentication required', code: 'AUTH_REQUIRED' },
      { status: 401 }
    );
  }
  
  const payload = await verifyToken(token);
  if (!payload) {
    return NextResponse.json(
      { error: 'Invalid or expired token', code: 'AUTH_INVALID' },
      { status: 401 }
    );
  }
  
  if (payload.role !== 'admin') {
    return NextResponse.json(
      { error: 'Admin access required', code: 'FORBIDDEN' },
      { status: 403 }
    );
  }
  
  // 获取请求体
  const body = await request.json();
  const { targetId } = body;

  if (!targetId) {
    return validationError('Target ID is required', 'targetId', request);
  }

  return successResponse({
    message: 'Admin action completed',
    admin: payload.email,
    targetId,
  });
}

/**
 * 示例: 自定义认证选项
 * 
 * @example
 * POST /api/examples/custom-auth
 * Headers: 
 *   Authorization: Bearer <token>
 *   X-CSRF-Token: <csrf-token>
 */
export async function POST(request: NextRequest): Promise<Response> {
  // 速率限制 + 认证 + CSRF 检查
  const token = extractToken(request);
  if (!token) {
    return NextResponse.json(
      { error: 'Authentication required', code: 'AUTH_REQUIRED' },
      { status: 401 }
    );
  }
  
  const payload = await verifyToken(token);
  if (!payload) {
    return NextResponse.json(
      { error: 'Invalid or expired token', code: 'AUTH_INVALID' },
      { status: 401 }
    );
  }
  
  // 角色检查
  if (!['admin', 'user'].includes(payload.role || '')) {
    return NextResponse.json(
      { error: 'Insufficient permissions', code: 'FORBIDDEN' },
      { status: 403 }
    );
  }
  
  // 权限检查 (需要 'write' 权限)
  const hasWritePermission = payload.permissions?.includes('write');
  if (!hasWritePermission) {
    return NextResponse.json(
      { error: 'Write permission required', code: 'FORBIDDEN' },
      { status: 403 }
    );
  }
  
  const body = await request.json();
  
  return successResponse({
    message: 'Custom auth completed',
    user: payload.email,
    data: body,
  });
}

/**
 * 示例: 可选认证 (用户可能未登录)
 * 
 * @example
 * GET /api/examples/optional-auth
 */
export async function PUT(request: NextRequest): Promise<Response> {
  // 可选认证 - token 可能不存在
  const token = extractToken(request);
  
  if (token) {
    const payload = await verifyToken(token);
    if (payload) {
      return successResponse({
        message: 'Authenticated access',
        user: {
          id: payload.sub,
          email: payload.email,
        },
      });
    }
  }
  
  // 未登录
  return successResponse({
    message: 'Anonymous access',
    user: null,
  });
}
