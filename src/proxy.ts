import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

// Allowed origins for CORS
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  process.env.NEXT_PUBLIC_APP_URL,
  process.env.NEXT_PUBLIC_API_URL,
].filter(Boolean) as string[];

// Sensitive endpoints that require additional security checks
const SENSITIVE_ENDPOINTS = [
  '/api/backup',
  '/api/database/optimize',
  '/api/database/restore',
  '/api/a2a',
  '/api/multimodal',
  '/api/auth',
  '/api/admin',
  '/api/settings',
];

/**
 * 安全功能：生成 CSP nonce
 */
function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * 检查是否是静态资源
 */
function isStaticAsset(pathname: string): boolean {
  return (
    pathname.startsWith('/_next/static/') ||
    pathname.startsWith('/_next/image/') ||
    pathname.startsWith('/images/') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.jpg') ||
    pathname.endsWith('.jpeg') ||
    pathname.endsWith('.webp') ||
    pathname.endsWith('.svg') ||
    pathname.endsWith('.ico') ||
    pathname.endsWith('.css') ||
    pathname.endsWith('.js')
  );
}

/**
 * Check if origin is allowed
 */
function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return true; // Allow requests with no origin (e.g., mobile apps, curl)
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  
  // Allow same origin
  if (process.env.NEXT_PUBLIC_APP_URL && origin === new URL(process.env.NEXT_PUBLIC_APP_URL).origin) {
    return true;
  }

  return false;
}

/**
 * Check if path is sensitive
 */
function isSensitivePath(pathname: string): boolean {
  return SENSITIVE_ENDPOINTS.some(endpoint => pathname.startsWith(endpoint));
}

/**
 * Add CORS headers to response
 */
function addCorsHeaders(response: NextResponse, origin?: string | null): NextResponse {
  if (origin && isOriginAllowed(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
  }
  
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRF-Token, X-Requested-With');
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set('Access-Control-Max-Age', '86400'); // 24 hours
  
  return response;
}

/**
 * Handle OPTIONS requests (CORS preflight)
 */
function handleOptionsRequest(request: NextRequest): NextResponse {
  const response = new NextResponse(null, { status: 204 });
  return addCorsHeaders(response, request.headers.get('origin'));
}

/**
 * 组合中间件
 * 1. next-intl 国际化中间件
 * 2. CORS 处理
 * 3. 安全头注入
 * 4. 请求日志
 */
export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const origin = request.headers.get('origin');
  const method = request.method;

  // 跳过静态资源
  if (isStaticAsset(pathname)) {
    return createMiddleware(routing)(request);
  }

  // Handle CORS preflight requests
  if (method === 'OPTIONS') {
    return handleOptionsRequest(request);
  }

  // 生成 CSP nonce
  const nonce = generateNonce();

  // 先执行 next-intl 中间件
  const response = createMiddleware(routing)(request);

  // 添加 CORS headers
  if (response instanceof NextResponse) {
    addCorsHeaders(response, origin);
    // 将 nonce 注入到响应头中
    response.headers.set('x-csp-nonce', nonce);
  }

  // Log requests to sensitive endpoints
  if (isSensitivePath(pathname) && response instanceof NextResponse) {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
              request.headers.get('x-real-ip') ||
              'unknown';

    logger.info('Sensitive endpoint accessed', {
      path: pathname,
      method,
      ip,
      origin,
      userAgent: request.headers.get('user-agent'),
    });
  }

  return response;
}

export const config = {
  // Match only internationalized pathnames
  // - Root path '/' for locale detection
  // - Locale-prefixed paths '/zh/*' and '/en/*'
  // - Unprefixed paths that should be redirected to locale versions
  // - API routes for CORS
  matcher: [
    // Root path
    '/',
    // Locale-prefixed paths
    '/(zh|en)/:path*',
    // All paths except static files, _next
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)).*)'
  ]
};