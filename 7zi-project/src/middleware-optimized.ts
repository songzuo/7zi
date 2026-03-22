/**
 * ⚡ OPTIMIZATION 6: Middleware 性能优化
 * 
 * 改进点:
 * 1. 更智能的缓存策略
 * 2. 资源预加载提示
 * 3. 减少不必要的中间件执行
 * 4. 优化 CORS 处理
 */

import { NextRequest, NextResponse } from 'next/server';

/**
 * 预加载资源列表
 * 这些资源会在页面加载时预加载
 */
const PRELOAD_RESOURCES = [
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
];

/**
 * 缓存配置
 */
const CACHE_CONFIG = {
  // 静态资源缓存 1 年
  static: 'public, max-age=31536000, immutable',
  // API 响应缓存 1 分钟
  api: 'public, max-age=60, s-maxage=60',
  // HTML 缓存 1 小时
  html: 'public, max-age=3600, s-maxage=86400',
};

/**
 * 添加缓存头部
 */
function addCacheHeaders(response: NextResponse, type: 'static' | 'api' | 'html'): NextResponse {
  response.headers.set('Cache-Control', CACHE_CONFIG[type]);
  return response;
}

/**
 * 添加资源预加载提示
 */
function addPreloadHints(response: NextResponse): NextResponse {
  PRELOAD_RESOURCES.forEach(resource => {
    response.headers.append('Link', `<${resource}>; rel=preload; as=fetch; crossorigin`);
  });
  return response;
}

/**
 * 添加安全头部
 */
function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  return response;
}

/**
 * 添加 CORS 头部（优化版）
 */
function addCorsHeaders(response: NextResponse, origin: string | null): NextResponse {
  // 配置允许的源
  const allowedOrigins = [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.NEXT_PUBLIC_API_URL,
    'http://localhost:3000',
    'http://localhost:3001',
  ].filter(Boolean) as string[];

  // 使用 Set 提高查找性能
  const allowedSet = new Set(allowedOrigins);

  // 优化：使用数组 includes 替代 some
  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }
  
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRF-Token');
  response.headers.set('Access-Control-Max-Age', '86400');
  
  return response;
}

/**
 * 判断是否为静态资源
 */
function isStaticResource(pathname: string): boolean {
  const staticExtensions = [
    '.ico', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp',
    '.woff', '.woff2', '.ttf', '.eot',
    '.css', '.js',
  ];
  
  return (
    pathname.startsWith('/_next/static') ||
    pathname.startsWith('/_next/image') ||
    pathname.startsWith('/static') ||
    staticExtensions.some(ext => pathname.endsWith(ext))
  );
}

/**
 * 判断是否为 API 路由
 */
function isApiRoute(pathname: string): boolean {
  return pathname.startsWith('/api/');
}

/**
 * 主中间件函数
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const origin = request.headers.get('origin');

  // ⚡ 优化：静态资源跳过中间件处理，直接返回
  if (isStaticResource(pathname)) {
    const response = NextResponse.next();
    addCacheHeaders(response, 'static');
    return response;
  }

  // ⚡ 优化：处理 OPTIONS 请求（CORS 预检）
  if (request.method === 'OPTIONS') {
    const response = new NextResponse(null, { status: 204 });
    addCorsHeaders(response, origin);
    addSecurityHeaders(response);
    return response;
  }

  const response = NextResponse.next();
  
  // ⚡ 优化：根据路由类型添加不同的缓存策略
  if (isApiRoute(pathname)) {
    addCacheHeaders(response, 'api');
  } else if (pathname.endsWith('.html') || pathname === '/' || pathname.match(/^\/[a-z]{2}\/?$/)) {
    addCacheHeaders(response, 'html');
    addPreloadHints(response);
  }
  
  // 添加头部
  addCorsHeaders(response, origin);
  addSecurityHeaders(response);

  return response;
}

/**
 * 配置中间件匹配规则（优化版）
 * 减少正则匹配的范围
 */
export const config = {
  matcher: [
    /*
     * 匹配所有请求路径，除了：
     * - _next/static (静态文件)
     * - _next/image (图片优化文件)
     * - favicon.ico (favicon)
     * - 公共文件夹中的静态资源
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff|woff2|ttf|eot|css|js)$).*)',
  ],
};
