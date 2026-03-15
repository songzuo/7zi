/**
 * 受保护的 API 示例
 * 演示如何使用认证中间件保护 API 路由
 */

import { NextRequest } from 'next/server';
import { 
  requireAuth, 
  requireAdmin,
  extractToken,
  verifyToken,
} from '@/lib/middleware';
import {
  badRequest,
  unauthorized,
  forbidden,
  success,
  handleApiRequest,
} from '@/lib/api-error';

/**
 * 示例: 需要登录的路由
 * 
 * @example
 * GET /api/examples/protected
 * Headers: Authorization: Bearer <token>
 */
export const GET = handleApiRequest(async (request: NextRequest): Promise<Response> => {
  // 手动认证检查
  const token = extractToken(request);
  if (!token) {
    return unauthorized('需要登录才能访问', request);
  }
  
  const payload = await verifyToken(token);
  if (!payload) {
    return unauthorized('登录已过期，请重新登录', request);
  }
  
  return success({
    message: 'This is a protected route',
    user: {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    },
    timestamp: new Date().toISOString(),
  }, request);
});

/**
 * 示例: 需要管理员角色的路由
 * 
 * @example
 * DELETE /api/examples/admin-only
 * Headers: Authorization: Bearer <token>
 */
export const DELETE = handleApiRequest(async (request: NextRequest): Promise<Response> => {
  // 手动认证 + 角色检查
  const token = extractToken(request);
  if (!token) {
    return unauthorized('需要登录才能访问', request);
  }
  
  const payload = await verifyToken(token);
  if (!payload) {
    return unauthorized('登录已过期，请重新登录', request);
  }
  
  if (payload.role !== 'admin') {
    return forbidden('需要管理员权限', request);
  }
  
  // 获取请求体
  const body = await request.json();
  const { targetId } = body;

  if (!targetId) {
    return badRequest('目标 ID 是必填字段', { field: 'targetId' }, request);
  }

  return success({
    message: 'Admin action completed',
    admin: payload.email,
    targetId,
  }, request);
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
export const POST = handleApiRequest(async (request: NextRequest): Promise<Response> => {
  // 速率限制 + 认证 + CSRF 检查
  const token = extractToken(request);
  if (!token) {
    return unauthorized('需要登录才能访问', request);
  }
  
  const payload = await verifyToken(token);
  if (!payload) {
    return unauthorized('登录已过期，请重新登录', request);
  }
  
  // 角色检查
  if (!['admin', 'user'].includes(payload.role || '')) {
    return forbidden('权限不足', request);
  }
  
  // 权限检查 (需要 'write' 权限)
  const hasWritePermission = payload.permissions?.includes('write');
  if (!hasWritePermission) {
    return forbidden('需要写入权限', request);
  }
  
  const body = await request.json();
  
  return success({
    message: 'Custom auth completed',
    user: payload.email,
    data: body,
  }, request);
});

/**
 * 示例: 可选认证 (用户可能未登录)
 * 
 * @example
 * GET /api/examples/optional-auth
 */
export const PUT = handleApiRequest(async (request: NextRequest): Promise<Response> => {
  // 可选认证 - token 可能不存在
  const token = extractToken(request);
  
  if (token) {
    const payload = await verifyToken(token);
    if (payload) {
      return success({
        message: 'Authenticated access',
        user: {
          id: payload.sub,
          email: payload.email,
        },
      }, request);
    }
  }
  
  // 未登录
  return success({
    message: 'Anonymous access',
    user: null,
  }, request);
});
