/**
 * 权限中间件
 * Permission Middleware for API Routes
 */

import { NextRequest, NextResponse } from 'next/server';
import { Permission, Role } from './types';
import { permissionChecker } from './permission-checker';
import { getRolePermissions, compareRoles, canManageRole } from './role-config';

/**
 * 认证用户信息（从请求中提取）
 */
export interface AuthenticatedUser {
  id: string;
  role: Role;
  permissions: Permission[];
}

/**
 * API 响应辅助函数
 */
function unauthorizedResponse(message: string = 'Unauthorized'): NextResponse {
  return NextResponse.json(
    { error: message, code: 'UNAUTHORIZED' },
    { status: 401 }
  );
}

function forbiddenResponse(message: string = 'Forbidden'): NextResponse {
  return NextResponse.json(
    { error: message, code: 'FORBIDDEN' },
    { status: 403 }
  );
}

/**
 * 从请求中提取用户信息
 * 这里需要根据实际的认证方案来实现
 */
export function extractUserFromRequest(request: NextRequest): AuthenticatedUser | null {
  // 从 header 中获取用户信息
  const userId = request.headers.get('x-user-id');
  const userRole = request.headers.get('x-user-role') as Role;
  
  if (!userId || !userRole) {
    return null;
  }
  
  // 获取角色对应的权限
  const permissions = getRolePermissions(userRole);
  
  return {
    id: userId,
    role: userRole,
    permissions,
  };
}

/**
 * 权限检查中间件工厂
 */
export function withPermission(permission: Permission) {
  return function (
    handler: (request: NextRequest, context: { user: AuthenticatedUser }) => Promise<NextResponse>
  ) {
    return async (request: NextRequest): Promise<NextResponse> => {
      const user = extractUserFromRequest(request);
      
      if (!user) {
        return unauthorizedResponse('Authentication required');
      }
      
      // 加载用户权限到检查器
      permissionChecker.loadUserPermissions({
        userId: user.id,
        role: user.role,
        permissions: user.permissions,
      });
      
      const result = permissionChecker.check(user.id, permission);
      
      if (!result.granted) {
        return forbiddenResponse(`Permission denied: ${permission}`);
      }
      
      return handler(request, { user });
    };
  };
}

/**
 * 多权限检查中间件（需要所有权限）
 */
export function withAllPermissions(permissions: Permission[]) {
  return function (
    handler: (request: NextRequest, context: { user: AuthenticatedUser }) => Promise<NextResponse>
  ) {
    return async (request: NextRequest): Promise<NextResponse> => {
      const user = extractUserFromRequest(request);
      
      if (!user) {
        return unauthorizedResponse('Authentication required');
      }
      
      permissionChecker.loadUserPermissions({
        userId: user.id,
        role: user.role,
        permissions: user.permissions,
      });
      
      const hasAll = permissionChecker.hasAll(user.id, permissions);
      
      if (!hasAll) {
        const missing = permissions.filter(
          (p) => !permissionChecker.check(user.id, p).granted
        );
        return forbiddenResponse(`Missing permissions: ${missing.join(', ')}`);
      }
      
      return handler(request, { user });
    };
  };
}

/**
 * 多权限检查中间件（需要任意一个权限）
 */
export function withAnyPermission(permissions: Permission[]) {
  return function (
    handler: (request: NextRequest, context: { user: AuthenticatedUser }) => Promise<NextResponse>
  ) {
    return async (request: NextRequest): Promise<NextResponse> => {
      const user = extractUserFromRequest(request);
      
      if (!user) {
        return unauthorizedResponse('Authentication required');
      }
      
      permissionChecker.loadUserPermissions({
        userId: user.id,
        role: user.role,
        permissions: user.permissions,
      });
      
      const hasAny = permissionChecker.hasAny(user.id, permissions);
      
      if (!hasAny) {
        return forbiddenResponse(`Requires one of: ${permissions.join(', ')}`);
      }
      
      return handler(request, { user });
    };
  };
}

/**
 * 角色检查中间件
 */
export function withRole(minRole: Role) {
  return function (
    handler: (request: NextRequest, context: { user: AuthenticatedUser }) => Promise<NextResponse>
  ) {
    return async (request: NextRequest): Promise<NextResponse> => {
      const user = extractUserFromRequest(request);
      
      if (!user) {
        return unauthorizedResponse('Authentication required');
      }
      
      const comparison = compareRoles(user.role, minRole);
      
      if (comparison < 0) {
        return forbiddenResponse(`Requires role: ${minRole} or higher`);
      }
      
      return handler(request, { user });
    };
  };
}

/**
 * 管理员专用中间件
 */
export function adminOnly(
  handler: (request: NextRequest, context: { user: AuthenticatedUser }) => Promise<NextResponse>
) {
  return withRole(Role.ADMIN)(handler);
}

/**
 * 经理及以上中间件
 */
export function managerOrAbove(
  handler: (request: NextRequest, context: { user: AuthenticatedUser }) => Promise<NextResponse>
) {
  return withRole(Role.MANAGER)(handler);
}

/**
 * 资源所有权检查中间件工厂
 */
export function withResourceOwnership(
  getResourceOwnerId: (request: NextRequest) => Promise<string | null>
) {
  return function (
    handler: (request: NextRequest, context: { user: AuthenticatedUser; isOwner: boolean }) => Promise<NextResponse>
  ) {
    return async (request: NextRequest): Promise<NextResponse> => {
      const user = extractUserFromRequest(request);
      
      if (!user) {
        return unauthorizedResponse('Authentication required');
      }
      
      const resourceOwnerId = await getResourceOwnerId(request);
      const isOwner = resourceOwnerId === user.id;
      
      // 管理员可以访问任何资源
      const isAdmin = user.role === Role.ADMIN;
      
      if (!isOwner && !isAdmin) {
        return forbiddenResponse('You do not have access to this resource');
      }
      
      return handler(request, { user, isOwner });
    };
  };
}

/**
 * 角色管理检查中间件
 */
export function canAssignRole(
  handler: (
    request: NextRequest,
    context: { user: AuthenticatedUser; targetRole: Role }
  ) => Promise<NextResponse>,
  getTargetRole: (request: NextRequest) => Role | null
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const user = extractUserFromRequest(request);
    
    if (!user) {
      return unauthorizedResponse('Authentication required');
    }
    
    const targetRole = getTargetRole(request);
    
    if (!targetRole) {
      return NextResponse.json(
        { error: 'Target role not specified', code: 'BAD_REQUEST' },
        { status: 400 }
      );
    }
    
    if (!canManageRole(user.role, targetRole)) {
      return forbiddenResponse(`Cannot assign role: ${targetRole}`);
    }
    
    return handler(request, { user, targetRole });
  };
}