/**
 * CSRF (跨站请求伪造) 保护模块
 * 提供 CSRF Token 生成和验证
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createHash, timingSafeEqual } from 'crypto';

// ============================================
// 配置
// ============================================

const CSRF_COOKIE_NAME = 'csrf_token';
const CSRF_HEADER_NAME = 'x-csrf-token';
const TOKEN_LENGTH = 32;

// 安全的方法，需要 CSRF 保护
const STATE_CHANGING_METHODS = ['POST', 'PUT', 'DELETE', 'PATCH'];

// 豁免 CSRF 检查的路径
const CSRF_EXEMPT_PATHS = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/refresh',
  '/api/health',
  '/api/status',
];

// ============================================
// CSRF Token 管理
// ============================================

/**
 * 生成安全的 CSRF Token
 */
export function generateCsrfToken(): string {
  const bytes = new Uint8Array(TOKEN_LENGTH);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * 生成带签名的 CSRF Token
 * 使用 HMAC 防止 token 被篡改
 */
export function generateSignedCsrfToken(secret: string): string {
  const token = generateCsrfToken();
  const hmac = createHash('sha256')
    .update(token + secret)
    .digest('hex');
  
  return `${token}.${hmac}`;
}

/**
 * 验证签名的 CSRF Token
 */
export function verifySignedCsrfToken(token: string, secret: string): boolean {
  if (!token || !token.includes('.')) {
    return false;
  }

  const [tokenValue, signature] = token.split('.');
  
  if (!tokenValue || !signature) {
    return false;
  }

  const expectedSignature = createHash('sha256')
    .update(tokenValue + secret)
    .digest('hex');

  // 使用常量时间比较防止时序攻击
  try {
    return timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  } catch {
    return false;
  }
}

/**
 * 从 Cookie 获取 CSRF Token
 */
export function getCsrfTokenFromCookie(request: NextRequest): string | null {
  return request.cookies.get(CSRF_COOKIE_NAME)?.value || null;
}

/**
 * 从请求头获取 CSRF Token
 */
export function getCsrfTokenFromHeader(request: NextRequest): string | null {
  return request.headers.get(CSRF_HEADER_NAME) || null;
}

// ============================================
// CSRF 中间件
// ============================================

export interface CsrfMiddlewareOptions {
  /** 豁免的路径 */
  exemptPaths?: string[];
  /** 需要 CSRF 保护的 HTTP 方法 */
  protectedMethods?: string[];
  /** 自定义验证逻辑 */
  customValidate?: (token: string, request: NextRequest) => boolean | Promise<boolean>;
}

/**
 * 创建 CSRF 保护中间件
 */
export function createCsrfMiddleware(options: CsrfMiddlewareOptions = {}) {
  const {
    exemptPaths = CSRF_EXEMPT_PATHS,
    protectedMethods = STATE_CHANGING_METHODS,
  } = options;

  return async (request: NextRequest): Promise<NextResponse | null> => {
    const { pathname } = request.nextUrl;

    // 检查是否在豁免路径中
    if (exemptPaths.some(path => pathname.startsWith(path))) {
      return null;
    }

    // 检查是否需要 CSRF 保护
    if (!protectedMethods.includes(request.method)) {
      return null;
    }

    // 获取 CSRF Token
    const headerToken = getCsrfTokenFromHeader(request);
    const cookieToken = getCsrfTokenFromCookie(request);

    // 验证 Token
    if (!headerToken || !cookieToken) {
      return NextResponse.json(
        { 
          error: 'CSRF token missing', 
          code: 'CSRF_MISSING',
          message: 'Please include CSRF token in both cookie and header'
        },
        { status: 403 }
      );
    }

    // 验证 Token 是否匹配
    if (headerToken !== cookieToken) {
      return NextResponse.json(
        { 
          error: 'CSRF token mismatch', 
          code: 'CSRF_MISMATCH',
          message: 'The CSRF token in the header does not match the cookie'
        },
        { status: 403 }
      );
    }

    // 自定义验证 (如果有)
    if (options.customValidate) {
      const isValid = await options.customValidate(headerToken, request);
      if (!isValid) {
        return NextResponse.json(
          { error: 'CSRF token validation failed', code: 'CSRF_INVALID' },
          { status: 403 }
        );
      }
    }

    return null;
  };
}

// ============================================
// API 路由助手
// ============================================

/**
 * 包装 API 处理器，自动添加 CSRF 保护
 */
export function withCsrfProtection<T extends NextResponse>(
  handler: (request: NextRequest) => Promise<T>,
  options?: CsrfMiddlewareOptions
) {
  const middleware = createCsrfMiddleware(options);

  return async (request: NextRequest): Promise<T | NextResponse> => {
    // 运行 CSRF 检查
    const csrfResult = await middleware(request);
    if (csrfResult) {
      return csrfResult as T;
    }

    // 执行处理器
    return handler(request);
  };
}

// ============================================
// 前端集成助手
// ============================================

/**
 * 获取 CSRF Token (供客户端使用)
 * 这个函数应该在服务器组件中调用
 */
export async function getCsrfToken(): Promise<string> {
  const cookieStore = await cookies();
  let token = cookieStore.get(CSRF_COOKIE_NAME)?.value;

  if (!token) {
    // 生成新 token
    token = generateCsrfToken();
    
    // 设置 cookie (在服务器端)
    // 注意：这需要在 Route Handler 或 Server Action 中使用
  }

  return token || '';
}

/**
 * 设置 CSRF Token Cookie
 */
export function setCsrfTokenCookie(token: string): Headers {
  const headers = new Headers();
  
  headers.append(
    'Set-Cookie',
    `${CSRF_COOKIE_NAME}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${60 * 60 * 24}`
  );

  return headers;
}

/**
 * 清除 CSRF Token Cookie
 */
export function clearCsrfTokenCookie(): Headers {
  const headers = new Headers();
  
  headers.append(
    'Set-Cookie',
    `${CSRF_COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`
  );

  return headers;
}

// ============================================
// 安全响应头
// ============================================

/**
 * 添加 CSRF 相关的响应头
 */
export function addCsrfHeaders(response: NextResponse): NextResponse {
  // 指示客户端需要 CSRF token
  response.headers.set('X-CSRF-Header', CSRF_HEADER_NAME);
  response.headers.set('X-CSRF-Cookie', CSRF_COOKIE_NAME);
  
  return response;
}

// ============================================
// 双重提交 Cookie 模式
// ============================================

/**
 * 双重提交 Cookie 模式验证
 * 客户端需要同时发送 cookie 和 header，两者必须匹配
 */
export function validateDoubleSubmitCookie(request: NextRequest): boolean {
  const cookieToken = request.cookies.get(CSRF_COOKIE_NAME)?.value;
  const headerToken = request.headers.get(CSRF_HEADER_NAME);

  if (!cookieToken || !headerToken) {
    return false;
  }

  return cookieToken === headerToken;
}

// ============================================
// 工具函数
// ============================================

/**
 * 检查请求方法是否需要 CSRF 保护
 */
export function requiresCsrfProtection(method: string): boolean {
  return STATE_CHANGING_METHODS.includes(method);
}

/**
 * 检查路径是否豁免 CSRF 检查
 */
export function isCsrfExempt(path: string, exemptPaths: string[] = CSRF_EXEMPT_PATHS): boolean {
  return exemptPaths.some(exemptPath => path.startsWith(exemptPath));
}
