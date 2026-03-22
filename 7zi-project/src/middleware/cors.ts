/**
 * CORS Middleware
 * 跨域资源共享中间件
 */

import { NextRequest, NextResponse } from 'next/server';

// ============================================================================
// Types
// ============================================================================

export interface CorsOptions {
  origin?: string | string[] | ((origin: string) => boolean);
  methods?: string[];
  allowedHeaders?: string[];
  exposedHeaders?: string[];
  credentials?: boolean;
  maxAge?: number;
}

// ============================================================================
// Default Options
// ============================================================================

const DEFAULT_CORS_OPTIONS: CorsOptions = {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: [],
  credentials: false,
  maxAge: 86400, // 24 hours
};

// ============================================================================
// CORS Middleware
// ============================================================================

/**
 * Create CORS middleware wrapper
 */
export function withCors<T extends any[]>(
  handler: (...args: T) => Promise<NextResponse>,
  options: CorsOptions = {}
): (...args: T) => Promise<NextResponse> {
  const config: Required<CorsOptions> = {
    origin: options.origin ?? ('*' as const),
    methods: options.methods ?? ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: options.allowedHeaders ?? ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: options.exposedHeaders ?? [],
    credentials: options.credentials ?? false,
    maxAge: options.maxAge ?? 86400,
  };

  return async (...args: T): Promise<NextResponse> => {
    const request = args[0] as NextRequest;

    // Handle preflight request
    if (request.method === 'OPTIONS') {
      return handlePreflight(request, config);
    }

    // Get response from handler
    const response = await handler(...args);

    // Add CORS headers
    addCorsHeaders(request, response, config);

    return response;
  };
}

/**
 * Handle OPTIONS preflight request
 */
function handlePreflight(
  request: NextRequest,
  config: Required<CorsOptions>
): NextResponse {
  const response = new NextResponse(null, { status: 204 });

  addCorsHeaders(request, response, config);

  // Add preflight-specific headers
  response.headers.set('Access-Control-Max-Age', config.maxAge.toString());

  return response;
}

/**
 * Add CORS headers to response
 */
function addCorsHeaders(
  request: NextRequest,
  response: NextResponse,
  config: Required<CorsOptions>
): void {
  const origin = request.headers.get('Origin') || '';

  // Determine allowed origin
  let allowedOrigin: string | null = null;

  if (typeof config.origin === 'string') {
    if (config.origin === '*') {
      allowedOrigin = '*';
    } else {
      allowedOrigin = config.origin;
    }
  } else if (Array.isArray(config.origin)) {
    if (config.origin.includes(origin)) {
      allowedOrigin = origin;
    }
  } else if (typeof config.origin === 'function') {
    if (config.origin(origin)) {
      allowedOrigin = origin;
    }
  }

  // Set Access-Control-Allow-Origin
  if (allowedOrigin) {
    response.headers.set('Access-Control-Allow-Origin', allowedOrigin);
  }

  // Set credentials
  if (config.credentials && allowedOrigin !== '*') {
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }

  // Set allowed methods
  response.headers.set('Access-Control-Allow-Methods', config.methods.join(', '));

  // Set allowed headers
  const requestHeaders = request.headers.get('Access-Control-Request-Headers');
  if (requestHeaders) {
    response.headers.set('Access-Control-Allow-Headers', requestHeaders);
  } else {
    response.headers.set('Access-Control-Allow-Headers', config.allowedHeaders.join(', '));
  }

  // Set exposed headers
  if (config.exposedHeaders.length > 0) {
    response.headers.set('Access-Control-Expose-Headers', config.exposedHeaders.join(', '));
  }

  // Add Vary header for proper caching
  response.headers.set('Vary', 'Origin');
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if origin is allowed
 */
export function isOriginAllowed(
  origin: string,
  options: CorsOptions
): boolean {
  const originConfig = options.origin ?? '*';

  if (originConfig === '*') {
    return true;
  }

  if (typeof originConfig === 'string') {
    return origin === originConfig;
  }

  if (Array.isArray(originConfig)) {
    return originConfig.includes(origin);
  }

  if (typeof originConfig === 'function') {
    return originConfig(origin);
  }

  return false;
}

/**
 * Get allowed origin for request
 */
export function getAllowedOrigin(
  origin: string,
  options: CorsOptions
): string | null {
  const originConfig = options.origin ?? '*';

  if (originConfig === '*') {
    return '*';
  }

  if (typeof originConfig === 'string') {
    return originConfig === origin ? originConfig : null;
  }

  if (Array.isArray(originConfig)) {
    return originConfig.includes(origin) ? origin : null;
  }

  if (typeof originConfig === 'function') {
    return originConfig(origin) ? origin : null;
  }

  return null;
}
