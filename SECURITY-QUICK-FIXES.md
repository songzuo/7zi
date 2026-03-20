# Security Quick Fixes - 7zi Project

This file contains ready-to-use code snippets for the most critical security issues found in the audit.

---

## 1. Replace SheetJS (xlsx) with ExcelJS

### Installation
```bash
npm uninstall xlsx
npm install exceljs
npm install --save-dev @types/exceljs
```

### Migration Example

#### Before (xlsx):
```typescript
import XLSX from 'xlsx';

function parseExcelFile(buffer: Buffer) {
  const workbook = XLSX.read(buffer);
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(worksheet);
  return data;
}
```

#### After (exceljs):
```typescript
import ExcelJS from 'exceljs';

async function parseExcelFile(buffer: Buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const worksheet = workbook.worksheets[0];
  const data: any[] = [];

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // Skip header
    data.push(row.values);
  });

  return data;
}
```

---

## 2. Fix CSP Configuration

### Update `next.config.ts`

#### Current (Vulnerable):
```typescript
"script-src 'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel-scripts.com"
```

#### Fixed (Secure):
```typescript
// Add nonce-based CSP
import { randomBytes } from 'crypto';

function generateNonce(): string {
  return randomBytes(16).toString('base64');
}

// In headers config:
headers: async () => [
  {
    source: '/:path*',
    headers: [
      {
        key: 'Content-Security-Policy',
        value: [
          "default-src 'self'",
          "script-src 'self' https://va.vercel-scripts.com https://cdn.jsdelivr.net",
          "style-src 'self' https://fonts.googleapis.com",
          // ... rest of CSP
        ].join('; '),
      },
      {
        key: 'X-Content-Security-Policy-Nonce',
        value: generateNonce(),
      },
    ],
  },
]
```

### Create CSP Report Endpoint

Create `src/app/api/csp-report/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const report = await request.json();

  // Log CSP violations
  console.warn('CSP Violation:', {
    timestamp: new Date().toISOString(),
    'document-uri': report['csp-report']['document-uri'],
    'violated-directive': report['csp-report']['violated-directive'],
    'blocked-uri': report['csp-report']['blocked-uri'],
  });

  // TODO: Send to monitoring service (Sentry, LogRocket, etc.)

  return new NextResponse(null, { status: 204 });
}
```

---

## 3. Migrate to HttpOnly Cookie Token Storage

### Update Login API Route

Update `src/app/api/auth/login/route.ts`:
```typescript
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { loginUser } from '@/lib/auth/service';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Authenticate user
    const result = await loginUser(body);

    if (!result.success || !result.token) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 401 }
      );
    }

    // Store token in httpOnly cookie
    const cookieStore = await cookies();
    cookieStore.set('auth_token', result.token, {
      httpOnly: true,              // JavaScript cannot access
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 3600,                // 1 hour
    });

    // Store refresh token separately (if needed)
    if (result.refreshToken) {
      cookieStore.set('refresh_token', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 604800,            // 7 days
      });
    }

    // Return user data but NOT the token
    return NextResponse.json({
      success: true,
      user: result.user,
      expiresAt: result.expiresAt,
    });

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, error: 'Login failed' },
      { status: 500 }
    );
  }
}
```

### Update Logout API Route

Update `src/app/api/auth/logout/route.ts`:
```typescript
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();

    // Clear auth token cookie
    cookieStore.delete('auth_token');

    // Clear refresh token cookie
    cookieStore.delete('refresh_token');

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { success: false, error: 'Logout failed' },
      { status: 500 }
    );
  }
}
```

### Update Middleware to Read Token from Cookie

Create `src/lib/get-auth-token.ts`:
```typescript
import { cookies } from 'next/headers';

export async function getAuthToken(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token');
    return token?.value ?? null;
  } catch {
    return null;
  }
}

export async function getRefreshToken(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('refresh_token');
    return token?.value ?? null;
  } catch {
    return null;
  }
}
```

Update `src/lib/auth/middleware.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getAuthToken } from '@/lib/get-auth-token';
import { authenticateToken } from '@/lib/auth/service';

export async function withUserAuth(
  request: NextRequest,
  handler: (request: NextRequest, context: any) => Promise<NextResponse>
): Promise<NextResponse> {
  const requestId = generateRequestId();

  try {
    // Get token from cookie instead of Authorization header
    const token = await getAuthToken();

    if (!token) {
      return createErrorResponse('Missing authentication token', 'UNAUTHORIZED', 401, requestId);
    }

    // Verify token
    const authResult = await authenticateToken(token);
    if (!authResult) {
      return createErrorResponse('Invalid or expired token', 'INVALID_TOKEN', 401, requestId);
    }

    // Execute handler
    return handler(request, authResult.context);
  } catch (error) {
    console.error('User auth error:', error);
    return createErrorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      'INTERNAL_ERROR',
      500,
      requestId
    );
  }
}
```

### Update Frontend (No Longer Need to Store Token)

Remove token storage from frontend:
```typescript
// Before (remove this):
// localStorage.setItem('auth_token', token);

// After (just let the cookie be set automatically):
const response = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password }),
});

const data = await response.json();
// Token is already in httpOnly cookie - nothing to store
```

---

## 4. Add Rate Limiting

### Installation
```bash
npm install lru-cache
```

### Create Rate Limiter

Create `src/lib/rate-limiter.ts`:
```typescript
import LRUCache from 'lru-cache';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitCache = new LRUCache<string, RateLimitEntry>({
  max: 1000,
  ttl: 60000, // 1 minute
});

export async function checkRateLimit(
  identifier: string,
  limit: number = 100,
  windowMs: number = 60000
): Promise<{ allowed: boolean; remaining: number; resetTime: Date }> {
  const now = Date.now();
  const entry = rateLimitCache.get(identifier);

  if (!entry || now > entry.resetTime) {
    // New window
    rateLimitCache.set(identifier, {
      count: 1,
      resetTime: now + windowMs,
    });

    return {
      allowed: true,
      remaining: limit - 1,
      resetTime: new Date(now + windowMs),
    };
  }

  if (entry.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: new Date(entry.resetTime),
    };
  }

  entry.count++;
  rateLimitCache.set(identifier, entry);

  return {
    allowed: true,
    remaining: limit - entry.count,
    resetTime: new Date(entry.resetTime),
  };
}

// Different limits for different endpoints
export const RATE_LIMITS = {
  login: { limit: 5, windowMs: 60000 }, // 5 attempts per minute
  register: { limit: 3, windowMs: 3600000 }, // 3 attempts per hour
  api: { limit: 100, windowMs: 60000 }, // 100 requests per minute
  upload: { limit: 10, windowMs: 3600000 }, // 10 uploads per hour
} as const;
```

### Use Rate Limiting in API Routes

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limiter';

export async function POST(request: NextRequest) {
  // Get client identifier (IP address or user ID)
  const ip = request.headers.get('x-forwarded-for') ?? 'unknown';
  const userId = request.headers.get('x-user-id');

  const identifier = userId ?? ip;

  // Check rate limit
  const { allowed, remaining, resetTime } = await checkRateLimit(
    identifier,
    RATE_LIMITS.login.limit,
    RATE_LIMITS.login.windowMs
  );

  // Add rate limit headers
  const response = NextResponse.json({ success: true });
  response.headers.set('X-RateLimit-Limit', RATE_LIMITS.login.limit.toString());
  response.headers.set('X-RateLimit-Remaining', remaining.toString());
  response.headers.set('X-RateLimit-Reset', resetTime.toISOString());

  if (!allowed) {
    return NextResponse.json(
      {
        success: false,
        error: 'Too many attempts. Please try again later.',
        retryAfter: Math.ceil((resetTime.getTime() - Date.now()) / 1000),
      },
      {
        status: 429,
        headers: response.headers,
      }
    );
  }

  // ... rest of your handler
}
```

---

## 5. Add Security Headers

### Update `next.config.ts`

```typescript
const nextConfig: NextConfig = {
  // ... existing config ...

  headers: async () => [
    {
      source: '/:path*',
      headers: [
        {
          key: 'Content-Security-Policy',
          value: [
            "default-src 'self'",
            "script-src 'self' https://va.vercel-scripts.com https://cdn.jsdelivr.net",
            "style-src 'self' https://fonts.googleapis.com",
            "font-src 'self' https://fonts.gstatic.com data:",
            "img-src 'self' data: blob: https: http:",
            "connect-src 'self' https://api.github.com https://o1.ingest.sentry.io",
            "frame-ancestors 'self'",
            "base-uri 'self'",
            "form-action 'self'",
            "object-src 'none'",
            "report-uri /api/csp-report",
          ].join('; '),
        },
        {
          key: 'X-Frame-Options',
          value: 'SAMEORIGIN',
        },
        {
          key: 'X-Content-Type-Options',
          value: 'nosniff',
        },
        {
          key: 'X-XSS-Protection',
          value: '1; mode=block',
        },
        {
          key: 'Strict-Transport-Security',
          value: 'max-age=63072000; includeSubDomains; preload',
        },
        {
          key: 'Referrer-Policy',
          value: 'strict-origin-when-cross-origin',
        },
        {
          key: 'Permissions-Policy',
          value: 'camera=(), microphone=(), geolocation=(), payment=()',
        },
        {
          key: 'Cross-Origin-Embedder-Policy',
          value: 'require-corp',
        },
        {
          key: 'Cross-Origin-Opener-Policy',
          value: 'same-origin',
        },
        {
          key: 'Cross-Origin-Resource-Policy',
          value: 'same-origin',
        },
        {
          key: 'X-DNS-Prefetch-Control',
          value: 'off', // Turn off for sensitive apps
        },
      ],
    },
    // Strict caching for sensitive routes
    {
      source: '/api/auth/:path*',
      headers: [
        {
          key: 'Cache-Control',
          value: 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        },
        {
          key: 'Pragma',
          value: 'no-cache',
        },
        {
          key: 'Expires',
          value: '0',
        },
      ],
    },
  ],
};
```

---

## 6. Add Token Rotation

### Update `src/lib/auth/service.ts`

```typescript
/**
 * Rotate authentication token
 * Called on sensitive actions (password change, email change, etc.)
 */
export async function rotateToken(oldToken: string): Promise<string | null> {
  try {
    // Verify old token
    const authResult = await authenticateToken(oldToken);
    if (!authResult) {
      throw new Error('Invalid token');
    }

    const { user } = authResult;

    // Revoke old token
    await revokeUserToken(oldToken);

    // Generate new token
    const newToken = await generateJwtToken(user, 3600);

    // Create new database record
    await createUserToken(user.id, 1);

    return newToken;
  } catch (error) {
    console.error('Token rotation error:', error);
    return null;
  }
}
```

### Use in Sensitive Operations

```typescript
// src/app/api/auth/change-password/route.ts
import { rotateToken } from '@/lib/auth/service';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  const body = await request.json();

  // ... change password logic ...

  // Rotate token for security
  const oldToken = await getAuthToken();
  const newToken = await rotateToken(oldToken);

  if (newToken) {
    // Update cookie with new token
    const cookieStore = await cookies();
    cookieStore.set('auth_token', newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 3600,
    });
  }

  return NextResponse.json({ success: true });
}
```

---

## 7. Add Security Event Logging

### Create `src/lib/security-logger.ts`

```typescript
import { captureMessage } from '@sentry/nextjs';

export enum SecurityEvent {
  LOGIN_FAILED = 'LOGIN_FAILED',
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGOUT = 'LOGOUT',
  TOKEN_STOLEN = 'TOKEN_STOLEN',
  CSRF_FAILURE = 'CSRF_FAILURE',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  PRIVILEGE_ESCALATION_ATTEMPT = 'PRIVILEGE_ESCALATION_ATTEMPT',
  PASSWORD_CHANGE = 'PASSWORD_CHANGE',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
}

export interface SecurityLogContext {
  userId?: string;
  email?: string;
  ip?: string;
  userAgent?: string;
  details?: Record<string, any>;
}

export function logSecurityEvent(
  event: SecurityEvent,
  context: SecurityLogContext = {}
): void {
  const logEntry = {
    timestamp: new Date().toISOString(),
    event,
    severity: getEventSeverity(event),
    ...context,
  };

  // Console log (for development)
  console.warn('[Security]', JSON.stringify(logEntry, null, 2));

  // Send to Sentry (production)
  if (process.env.NODE_ENV === 'production') {
    captureMessage(`Security Event: ${event}`, {
      level: getEventSeverity(event),
      extra: logEntry,
    });
  }
}

function getEventSeverity(event: SecurityEvent): 'info' | 'warning' | 'error' | 'fatal' {
  const severityMap: Record<SecurityEvent, string> = {
    [SecurityEvent.LOGIN_SUCCESS]: 'info',
    [SecurityEvent.LOGOUT]: 'info',
    [SecurityEvent.PASSWORD_CHANGE]: 'info',
    [SecurityEvent.LOGIN_FAILED]: 'warning',
    [SecurityEvent.RATE_LIMIT_EXCEEDED]: 'warning',
    [SecurityEvent.CSRF_FAILURE]: 'error',
    [SecurityEvent.PRIVILEGE_ESCALATION_ATTEMPT]: 'error',
    [SecurityEvent.TOKEN_STOLEN]: 'fatal',
    [SecurityEvent.ACCOUNT_LOCKED]: 'fatal',
  };

  return severityMap[event] as any;
}
```

### Use in API Routes

```typescript
import { logSecurityEvent, SecurityEvent } from '@/lib/security-logger';

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for');
  const userAgent = request.headers.get('user-agent');

  // ... your logic ...

  // Log successful login
  logSecurityEvent(SecurityEvent.LOGIN_SUCCESS, {
    userId: user.id,
    email: user.email,
    ip,
    userAgent,
  });

  // ... or failed login
  logSecurityEvent(SecurityEvent.LOGIN_FAILED, {
    email: body.email,
    ip,
    userAgent,
  });
}
```

---

## Implementation Checklist

Use this checklist to track your progress:

- [ ] Replace SheetJS with ExcelJS
- [ ] Update CSP configuration (remove unsafe-inline)
- [ ] Create CSP report endpoint
- [ ] Migrate token storage to httpOnly cookies
- [ ] Update login API route
- [ ] Update logout API route
- [ ] Update auth middleware
- [ ] Remove localStorage token storage from frontend
- [ ] Implement rate limiting
- [ ] Add additional security headers
- [ ] Implement token rotation
- [ ] Add security event logging
- [ ] Run security audit again to verify fixes

---

**Remember**: After implementing these fixes, run another security audit to ensure all vulnerabilities are resolved.
