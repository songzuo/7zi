/**
 * CORS 配置模块
 * 处理跨域资源共享 (Cross-Origin Resource Sharing)
 */

import { NextRequest, NextResponse } from 'next/server';

export interface CorsConfig {
  allowedOrigins: string[] | '*';
  allowedMethods: string[];
  allowedHeaders: string[];
  exposedHeaders?: string[];
  credentials?: boolean;
  maxAge?: number;
}

// 默认 CORS 配置
const defaultConfig: CorsConfig = {
  allowedOrigins: [process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'],
  allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers',
  ],
  exposedHeaders: ['X-Total-Count', 'X-Page', 'X-Per-Page'],
  credentials: true,
  maxAge: 86400, // 24 小时
};

/**
 * 创建 CORS 中间件
 */
export function createCorsMiddleware(config: Partial<CorsConfig> = {}) {
  const finalConfig: CorsConfig = { ...defaultConfig, ...config };

  return (req: NextRequest): NextResponse | null => {
    const origin = req.headers.get('origin');

    // 检查是否允许该来源
    const isAllowed =
      finalConfig.allowedOrigins === '*' ||
      (origin && finalConfig.allowedOrigins.includes(origin));

    if (!isAllowed && origin) {
      return NextResponse.json(
        { error: 'Origin not allowed' },
        { status: 403 }
      );
    }

    // 处理预检请求
    if (req.method === 'OPTIONS') {
      const response = new NextResponse(null, { status: 204 });

      if (origin && isAllowed) {
        response.headers.set('Access-Control-Allow-Origin', origin);
        response.headers.set(
          'Access-Control-Allow-Methods',
          finalConfig.allowedMethods.join(', ')
        );
        response.headers.set(
          'Access-Control-Allow-Headers',
          finalConfig.allowedHeaders.join(', ')
        );
        response.headers.set(
          'Access-Control-Expose-Headers',
          finalConfig.exposedHeaders?.join(', ') || ''
        );
        response.headers.set(
          'Access-Control-Max-Age',
          String(finalConfig.maxAge)
        );

        if (finalConfig.credentials) {
          response.headers.set('Access-Control-Allow-Credentials', 'true');
        }
      }

      return response;
    }

    return null;
  };
}

/**
 * 添加 CORS 头到响应
 */
export function addCorsHeaders(
  req: NextRequest,
  response: NextResponse,
  config: Partial<CorsConfig> = {}
): NextResponse {
  const finalConfig: CorsConfig = { ...defaultConfig, ...config };
  const origin = req.headers.get('origin');

  const isAllowed =
    finalConfig.allowedOrigins === '*' ||
    (origin && finalConfig.allowedOrigins.includes(origin));

  if (origin && isAllowed) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set(
      'Access-Control-Allow-Methods',
      finalConfig.allowedMethods.join(', ')
    );
    response.headers.set(
      'Access-Control-Allow-Headers',
      finalConfig.allowedHeaders.join(', ')
    );

    if (finalConfig.exposedHeaders && finalConfig.exposedHeaders.length > 0) {
      response.headers.set(
        'Access-Control-Expose-Headers',
        finalConfig.exposedHeaders.join(', ')
      );
    }

    if (finalConfig.credentials) {
      response.headers.set('Access-Control-Allow-Credentials', 'true');
    }
  }

  return response;
}

/**
 * API 路由包装器 - 自动处理 CORS
 */
export function withCors(
  handler: (req: NextRequest, context?: unknown) => Promise<NextResponse>,
  config?: Partial<CorsConfig>
) {
  const corsMiddleware = createCorsMiddleware(config);

  return async (req: NextRequest, context?: unknown): Promise<NextResponse> => {
    // 处理预检请求
    const corsResult = corsMiddleware(req);
    if (corsResult) return corsResult;

    // 执行处理器
    const response = await handler(req, context);

    // 添加 CORS 头
    return addCorsHeaders(req, response, config);
  };
}

export { defaultConfig };