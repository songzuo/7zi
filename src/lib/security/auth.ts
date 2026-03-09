/**
 * API 认证系统
 * 提供 JWT Token 认证和会话管理
 */

import { NextRequest, NextResponse } from 'next/server';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { authLogger, securityLogger } from '@/lib/logger';

// ============================================
// 配置
// ============================================

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-to-a-secure-random-string-min-32-chars';
const TOKEN_EXPIRY = '24h';
const REFRESH_TOKEN_EXPIRY = '7d';
const COOKIE_NAME = 'auth_token';
const REFRESH_COOKIE_NAME = 'refresh_token';

// 确保 JWT_SECRET 足够安全
if (JWT_SECRET.length < 32 || JWT_SECRET === 'change-me-to-a-secure-random-string-min-32-chars') {
  securityLogger.warn('JWT_SECRET is weak or default. Please set a strong secret in .env file!');
}

// ============================================
// 用户类型
// ============================================

export interface User {
  id: string;
  email: string;
  name?: string;
  role: 'admin' | 'user' | 'service';
  permissions?: string[];
}

export interface TokenPayload {
  sub: string;
  email: string;
  name?: string;
  role: User['role'];
  permissions?: string[];
  iat?: number;
  exp?: number;
}

// ============================================
// JWT Token 管理
// ============================================

/**
 * 生成访问令牌
 */
export async function generateAccessToken(user: User): Promise<string> {
  const secret = new TextEncoder().encode(JWT_SECRET);
  
  const token = await new SignJWT({
    email: user.email,
    name: user.name,
    role: user.role,
    permissions: user.permissions,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRY)
    .sign(secret);

  return token;
}

/**
 * 生成刷新令牌
 */
export async function generateRefreshToken(user: User): Promise<string> {
  const secret = new TextEncoder().encode(JWT_SECRET);
  
  const token = await new SignJWT({
    email: user.email,
    role: user.role,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(REFRESH_TOKEN_EXPIRY)
    .sign(secret);

  return token;
}

/**
 * 验证并解码令牌
 */
export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    
    return {
      sub: payload.sub || '',
      email: payload.email as string,
      name: payload.name as string | undefined,
      role: payload.role as User['role'],
      permissions: payload.permissions as string[] | undefined,
      iat: payload.iat,
      exp: payload.exp,
    };
  } catch (error) {
    authLogger.error('Token verification failed', error);
    return null;
  }
}

/**
 * 从请求中提取令牌
 */
export function extractToken(request: NextRequest): string | null {
  // 1. 从 Authorization header 获取
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // 2. 从 Cookie 获取
  const cookie = request.cookies.get(COOKIE_NAME)?.value;
  if (cookie) {
    return cookie;
  }

  return null;
}

// ============================================
// 认证中间件
// ============================================

export interface AuthMiddlewareOptions {
  /** 需要的角色 */
  roles?: User['role'][];
  /** 需要的权限 */
  permissions?: string[];
  /** 是否可选认证 */
  optional?: boolean;
}

/**
 * 创建认证中间件
 */
export function createAuthMiddleware(options: AuthMiddlewareOptions = {}) {
  return async (request: NextRequest): Promise<NextResponse | null> => {
    const token = extractToken(request);

    if (!token) {
      if (options.optional) {
        return null;
      }
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

    // 检查角色
    if (options.roles && !options.roles.includes(payload.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions', code: 'AUTH_FORBIDDEN' },
        { status: 403 }
      );
    }

    // 检查权限
    if (options.permissions) {
      const userPermissions = payload.permissions || [];
      const hasPermission = options.permissions.some(p => userPermissions.includes(p));
      
      if (!hasPermission) {
        return NextResponse.json(
          { error: 'Insufficient permissions', code: 'AUTH_FORBIDDEN' },
          { status: 403 }
        );
      }
    }

    // 将用户信息添加到请求头，供下游使用
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', payload.sub);
    requestHeaders.set('x-user-email', payload.email);
    requestHeaders.set('x-user-role', payload.role);

    // 创建新的请求对象
    const modifiedRequest = new NextRequest(request, {
      headers: requestHeaders,
    });

    // 存储用户信息到 request 对象 (通过 Symbol)
    (modifiedRequest as unknown as Record<symbol, unknown>)[Symbol.for('user')] = payload;

    return null;
  };
}

// ============================================
// Cookie 管理
// ============================================

/**
 * 设置认证 Cookie
 */
export function setAuthCookies(accessToken: string, refreshToken: string): Headers {
  const headers = new Headers();
  
  // 访问令牌 Cookie
  headers.append(
    'Set-Cookie',
    `${COOKIE_NAME}=${accessToken}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${60 * 60 * 24}`
  );
  
  // 刷新令牌 Cookie
  headers.append(
    'Set-Cookie',
    `${REFRESH_COOKIE_NAME}=${refreshToken}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${60 * 60 * 24 * 7}`
  );

  return headers;
}

/**
 * 清除认证 Cookie
 */
export function clearAuthCookies(): Headers {
  const headers = new Headers();
  
  headers.append(
    'Set-Cookie',
    `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`
  );
  
  headers.append(
    'Set-Cookie',
    `${REFRESH_COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`
  );

  return headers;
}

// ============================================
// 工具函数
// ============================================

/**
 * 检查用户是否为管理员
 */
export function isAdmin(user: User | TokenPayload): boolean {
  return user.role === 'admin';
}

/**
 * 检查用户是否有特定权限
 */
export function hasPermission(user: User | TokenPayload, permission: string): boolean {
  if (!user.permissions) return false;
  return user.permissions.includes(permission) || user.role === 'admin';
}

/**
 * 生成安全的随机密钥
 */
export function generateSecureSecret(length: number = 64): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * 验证 JWT_SECRET 强度
 */
export function validateJwtSecret(secret: string): { valid: boolean; issues: string[] } {
  const issues: string[] = [];

  if (secret.length < 32) {
    issues.push('JWT_SECRET must be at least 32 characters long');
  }

  if (secret === 'change-me-to-a-secure-random-string-min-32-chars' || 
      secret === 'your-secret-key' ||
      secret === 'secret' ||
      secret === 'password') {
    issues.push('JWT_SECRET is using a default or weak value');
  }

  const hasUpperCase = /[A-Z]/.test(secret);
  const hasLowerCase = /[a-z]/.test(secret);
  const hasNumbers = /\d/.test(secret);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(secret);

  const complexityScore = [hasUpperCase, hasLowerCase, hasNumbers, hasSpecial].filter(Boolean).length;

  if (complexityScore < 3) {
    issues.push('JWT_SECRET should include uppercase, lowercase, numbers, and special characters');
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}
