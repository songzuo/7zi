/**
 * Security Headers Middleware (Helmet.js equivalent)
 *
 * Provides security headers for Next.js API routes:
 * - Content Security Policy (CSP)
 * - HTTP Strict Transport Security (HSTS)
 * - X-Frame-Options
 * - X-Content-Type-Options
 * - X-XSS-Protection
 * - Referrer-Policy
 * - Permissions-Policy
 * - Cross-Origin-Opener-Policy
 * - Cross-Origin-Resource-Policy
 * - Cross-Origin-Embedder-Policy
 */

import { NextRequest, NextResponse } from 'next/server';

/**
 * Security headers configuration
 */
export interface SecurityHeadersConfig {
  // Content Security Policy
  contentSecurityPolicy?: {
    defaultSrc?: string[];
    scriptSrc?: string[];
    styleSrc?: string[];
    imgSrc?: string[];
    fontSrc?: string[];
    connectSrc?: string[];
    mediaSrc?: string[];
    objectSrc?: string[];
    frameSrc?: string[];
    baseUri?: string[];
    formAction?: string[];
    frameAncestors?: string[];
    reportUri?: string;
    reportOnly?: boolean;
    upgradeInsecureRequests?: boolean;
  };

  // HTTP Strict Transport Security
  hsts?: {
    maxAge?: number;
    includeSubDomains?: boolean;
    preload?: boolean;
  };

  // X-Frame-Options
  frameOptions?: 'DENY' | 'SAMEORIGIN' | 'ALLOW-FROM';

  // X-Content-Type-Options
  contentTypeOptions?: 'nosniff';

  // X-XSS-Protection
  xssProtection?: boolean | '1; mode=block';

  // Referrer-Policy
  referrerPolicy?:
    | 'no-referrer'
    | 'no-referrer-when-downgrade'
    | 'origin'
    | 'origin-when-cross-origin'
    | 'same-origin'
    | 'strict-origin'
    | 'strict-origin-when-cross-origin'
    | 'unsafe-url';

  // Permissions-Policy
  permissionsPolicy?: {
    camera?: string[];
    microphone?: string[];
    geolocation?: string[];
    interestCohort?: string[];
    payment?: string[];
    usb?: string[];
    magnetometer?: string[];
    accelerometer?: string[];
    gyroscope?: string[];
    fullscreen?: string[];
    screenWakeLock?: string[];
  };

  // Cross-Origin headers
  crossOriginOpenerPolicy?: 'unsafe-none' | 'same-origin' | 'same-origin-allow-popups';
  crossOriginResourcePolicy?: 'same-site' | 'same-origin' | 'cross-origin';
  crossOriginEmbedderPolicy?: 'unsafe-none' | 'require-corp';

  // Additional headers
  xPermittedCrossDomainPolicies?: 'none' | 'master-only' | 'by-content-type' | 'all';
  xDownloadOptions?: 'noopen';
}

/**
 * Default security headers configuration
 */
const DEFAULT_CONFIG: SecurityHeadersConfig = {
  contentSecurityPolicy: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'"], // Keep unsafe-inline for styles (can be replaced with hash/nonce)
    imgSrc: ["'self'", 'data:', 'https:'],
    fontSrc: ["'self'", 'data:', 'https:'],
    connectSrc: ["'self'"],
    mediaSrc: ["'self'"],
    objectSrc: ["'none'"],
    frameSrc: ["'self'"],
    baseUri: ["'self'"],
    formAction: ["'self'"],
    frameAncestors: ["'none'"],
    upgradeInsecureRequests: true,
  },
  hsts: {
    maxAge: 63072000, // 2 years
    includeSubDomains: true,
    preload: true,
  },
  frameOptions: 'SAMEORIGIN',
  contentTypeOptions: 'nosniff',
  xssProtection: '1; mode=block',
  referrerPolicy: 'strict-origin-when-cross-origin',
  permissionsPolicy: {
    camera: ["'none'"],
    microphone: ["'none'"],
    geolocation: ["'self'"],
    interestCohort: ["'none'"],
    payment: ["'self'"],
    usb: ["'none'"],
    magnetometer: ["'none'"],
    accelerometer: ["'none'"],
    gyroscope: ["'none'"],
    fullscreen: ["'self'"],
    screenWakeLock: ["'self'"],
  },
  crossOriginOpenerPolicy: 'same-origin',
  crossOriginResourcePolicy: 'same-site',
  xPermittedCrossDomainPolicies: 'none',
  xDownloadOptions: 'noopen',
};

/**
 * Build Content-Security-Policy header value
 */
function buildCSP(config: SecurityHeadersConfig['contentSecurityPolicy']): string {
  if (!config) {
    return '';
  }

  const directives: string[] = [];

  // Standard directives
  if (config.defaultSrc) {
    directives.push(`default-src ${config.defaultSrc.join(' ')}`);
  }
  if (config.scriptSrc) {
    directives.push(`script-src ${config.scriptSrc.join(' ')}`);
  }
  if (config.styleSrc) {
    directives.push(`style-src ${config.styleSrc.join(' ')}`);
  }
  if (config.imgSrc) {
    directives.push(`img-src ${config.imgSrc.join(' ')}`);
  }
  if (config.fontSrc) {
    directives.push(`font-src ${config.fontSrc.join(' ')}`);
  }
  if (config.connectSrc) {
    directives.push(`connect-src ${config.connectSrc.join(' ')}`);
  }
  if (config.mediaSrc) {
    directives.push(`media-src ${config.mediaSrc.join(' ')}`);
  }
  if (config.objectSrc) {
    directives.push(`object-src ${config.objectSrc.join(' ')}`);
  }
  if (config.frameSrc) {
    directives.push(`frame-src ${config.frameSrc.join(' ')}`);
  }
  if (config.baseUri) {
    directives.push(`base-uri ${config.baseUri.join(' ')}`);
  }
  if (config.formAction) {
    directives.push(`form-action ${config.formAction.join(' ')}`);
  }
  if (config.frameAncestors) {
    directives.push(`frame-ancestors ${config.frameAncestors.join(' ')}`);
  }

  // Special directives
  if (config.upgradeInsecureRequests) {
    directives.push('upgrade-insecure-requests');
  }
  if (config.reportUri) {
    directives.push(`report-uri ${config.reportUri}`);
  }

  return directives.join('; ');
}

/**
 * Build Strict-Transport-Security header value
 */
function buildHSTS(
  config: SecurityHeadersConfig['hsts']
): string | null {
  if (!config) {
    return null;
  }

  const parts: string[] = [`max-age=${config.maxAge || 63072000}`];

  if (config.includeSubDomains) {
    parts.push('includeSubDomains');
  }

  if (config.preload) {
    parts.push('preload');
  }

  return parts.join('; ');
}

/**
 * Build Permissions-Policy header value
 */
function buildPermissionsPolicy(
  config: SecurityHeadersConfig['permissionsPolicy']
): string | null {
  if (!config) {
    return null;
  }

  const directives: string[] = [];

  if (config.camera) {
    directives.push(`camera=${config.camera.join(' ')}`);
  }
  if (config.microphone) {
    directives.push(`microphone=${config.microphone.join(' ')}`);
  }
  if (config.geolocation) {
    directives.push(`geolocation=${config.geolocation.join(' ')}`);
  }
  if (config.interestCohort) {
    directives.push(`interest-cohort=${config.interestCohort.join(' ')}`);
  }
  if (config.payment) {
    directives.push(`payment=${config.payment.join(' ')}`);
  }
  if (config.usb) {
    directives.push(`usb=${config.usb.join(' ')}`);
  }
  if (config.magnetometer) {
    directives.push(`magnetometer=${config.magnetometer.join(' ')}`);
  }
  if (config.accelerometer) {
    directives.push(`accelerometer=${config.accelerometer.join(' ')}`);
  }
  if (config.gyroscope) {
    directives.push(`gyroscope=${config.gyroscope.join(' ')}`);
  }
  if (config.fullscreen) {
    directives.push(`fullscreen=${config.fullscreen.join(' ')}`);
  }
  if (config.screenWakeLock) {
    directives.push(`screen-wake-lock=${config.screenWakeLock.join(' ')}`);
  }

  return directives.length > 0 ? directives.join(', ') : null;
}

/**
 * Apply security headers to response
 */
export function setSecurityHeaders(
  response: NextResponse,
  config?: Partial<SecurityHeadersConfig>
): NextResponse {
  const finalConfig: SecurityHeadersConfig = {
    ...DEFAULT_CONFIG,
    ...config,
  };

  // Content Security Policy
  if (finalConfig.contentSecurityPolicy) {
    const cspValue = buildCSP(finalConfig.contentSecurityPolicy);
    if (cspValue) {
      if (finalConfig.contentSecurityPolicy.reportOnly) {
        response.headers.set('Content-Security-Policy-Report-Only', cspValue);
      } else {
        response.headers.set('Content-Security-Policy', cspValue);
      }
    }
  }

  // HTTP Strict Transport Security (only in HTTPS)
  if (process.env.NODE_ENV === 'production' || process.env.ENABLE_HSTS === 'true') {
    const hstsValue = buildHSTS(finalConfig.hsts);
    if (hstsValue) {
      response.headers.set('Strict-Transport-Security', hstsValue);
    }
  }

  // X-Frame-Options
  if (finalConfig.frameOptions) {
    response.headers.set('X-Frame-Options', finalConfig.frameOptions);
  }

  // X-Content-Type-Options
  if (finalConfig.contentTypeOptions) {
    response.headers.set('X-Content-Type-Options', finalConfig.contentTypeOptions);
  }

  // X-XSS-Protection
  if (finalConfig.xssProtection) {
    const value =
      typeof finalConfig.xssProtection === 'boolean'
        ? finalConfig.xssProtection
          ? '1; mode=block'
          : '0'
        : finalConfig.xssProtection;
    response.headers.set('X-XSS-Protection', value);
  }

  // Referrer-Policy
  if (finalConfig.referrerPolicy) {
    response.headers.set('Referrer-Policy', finalConfig.referrerPolicy);
  }

  // Permissions-Policy
  const permissionsValue = buildPermissionsPolicy(finalConfig.permissionsPolicy);
  if (permissionsValue) {
    response.headers.set('Permissions-Policy', permissionsValue);
  }

  // Cross-Origin headers
  if (finalConfig.crossOriginOpenerPolicy) {
    response.headers.set('Cross-Origin-Opener-Policy', finalConfig.crossOriginOpenerPolicy);
  }
  if (finalConfig.crossOriginResourcePolicy) {
    response.headers.set('Cross-Origin-Resource-Policy', finalConfig.crossOriginResourcePolicy);
  }
  if (finalConfig.crossOriginEmbedderPolicy) {
    response.headers.set('Cross-Origin-Embedder-Policy', finalConfig.crossOriginEmbedderPolicy);
  }

  // Additional headers
  if (finalConfig.xPermittedCrossDomainPolicies) {
    response.headers.set(
      'X-Permitted-Cross-Domain-Policies',
      finalConfig.xPermittedCrossDomainPolicies
    );
  }
  if (finalConfig.xDownloadOptions) {
    response.headers.set('X-Download-Options', finalConfig.xDownloadOptions);
  }

  return response;
}

/**
 * Security headers middleware wrapper
 */
export function withSecurityHeaders(
  handler: (req: NextRequest) => Promise<NextResponse>,
  config?: Partial<SecurityHeadersConfig>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    let response: NextResponse;

    try {
      response = await handler(request);
    } catch (error) {
      response = NextResponse.json(
        {
          success: false,
          error: {
            type: 'INTERNAL_ERROR',
            message: 'Internal server error',
          },
        },
        { status: 500 }
      );
    }

    // Apply security headers
    return setSecurityHeaders(response, config);
  };
}

/**
 * Create custom security headers config
 */
export function createSecurityConfig(
  overrides: Partial<SecurityHeadersConfig>
): SecurityHeadersConfig {
  return {
    ...DEFAULT_CONFIG,
    ...overrides,
    contentSecurityPolicy: {
      ...DEFAULT_CONFIG.contentSecurityPolicy,
      ...overrides.contentSecurityPolicy,
    },
    hsts: {
      ...DEFAULT_CONFIG.hsts,
      ...overrides.hsts,
    },
    permissionsPolicy: {
      ...DEFAULT_CONFIG.permissionsPolicy,
      ...overrides.permissionsPolicy,
    },
  };
}

/**
 * Get CSP nonce for inline scripts
 * Note: Next.js should generate this automatically
 */
export function getCSPNonce(): string {
  // In Next.js, this should be generated by the framework
  // This is a placeholder for custom implementations
  const existingNonce = process.env.CSP_NONCE;
  if (existingNonce && existingNonce !== '{GENERATED_NONCE}') {
    return existingNonce;
  }

  // Generate a random nonce (for non-Next.js environments)
  return Buffer.from(crypto.randomUUID()).toString('base64').slice(0, 16);
}

/**
 * Validate CSP configuration
 */
export function validateCSPConfig(
  config: SecurityHeadersConfig['contentSecurityPolicy']
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!config) {
    return { valid: true, errors: [] };
  }

  // Check if at least defaultSrc is defined
  if (!config.defaultSrc || config.defaultSrc.length === 0) {
    errors.push('defaultSrc must be defined');
  }

  // Check for unsafe-inline in scriptSrc (should use nonce)
  if (config.scriptSrc && config.scriptSrc.includes("'unsafe-inline'")) {
    errors.push('scriptSrc should not include unsafe-inline, use nonce instead');
  }

  // Check for unsafe-eval
  if (config.scriptSrc && config.scriptSrc.includes("'unsafe-eval'")) {
    errors.push('scriptSrc should not include unsafe-eval for security');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get recommended CSP for API routes
 */
export function getAPIRouteCSP(): string {
  return [
    "default-src 'self'",
    "script-src 'none'",
    "style-src 'none'",
    "img-src 'self' data:",
    "font-src 'none'",
    "connect-src 'self'",
    "media-src 'none'",
    "object-src 'none'",
    "frame-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');
}
