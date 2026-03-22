# API Security Quick Reference

This guide helps developers use the security middleware in their API routes.

## Quick Start

### Protected Routes (Require Authentication)

```typescript
import { withProtectedSecurity } from '@/lib/middleware/security';
import { NextRequest, NextResponse } from 'next/server';

const handler = withProtectedSecurity(
  async (request: NextRequest): Promise<NextResponse> => {
    // Get sanitized input
    const body = getSanitizedBody<MyType>(request);
    const query = getSanitizedQuery<MyQueryType>(request);

    // Your logic here
    return NextResponse.json({ success: true });
  },
  // Optional: Define schemas for validation
  {
    bodySchema: {
      name: { minLength: 1, maxLength: 100 },
      email: { isEmail: true },
    },
    querySchema: {
      page: { isNumber: true, min: 1 },
    },
  }
);

export { GET as GET, POST as POST } = { GET: handler, POST: handler };
```

### Public Routes (No Authentication Required)

```typescript
import { withPublicSecurity } from '@/lib/middleware/security';

const handler = withPublicSecurity(
  async (request: NextRequest): Promise<NextResponse> => {
    // Your logic here
    return NextResponse.json({ success: true });
  }
);

export const GET = handler;
```

### Auth Routes (Login, Register, etc.)

```typescript
import { withAuthSecurity } from '@/lib/middleware/security';

// Extract identifier for brute force protection tracking
async function extractEmail(request: NextRequest): Promise<string | undefined> {
  try {
    const body = await request.json();
    return body.email;
  } catch {
    return undefined;
  }
}

const handler = withAuthSecurity(
  async (request: NextRequest): Promise<NextResponse> => {
    const body = getSanitizedBody<LoginRequest>(request);
    // Your auth logic here
    return NextResponse.json({ success: true });
  },
  extractEmail, // Track by email for brute force protection
  {
    bodySchema: {
      email: { isEmail: true, required: true },
      password: { minLength: 8, required: true },
    },
  }
);

export const POST = handler;
```

### Admin Routes (High Security)

```typescript
import { withAdminSecurity } from '@/lib/middleware/security';

const handler = withAdminSecurity(
  async (request: NextRequest): Promise<NextResponse> => {
    // Your admin logic here
    return NextResponse.json({ success: true });
  }
);

export const GET = handler;
```

## Security Features Applied Automatically

### Rate Limiting
- Sliding window algorithm
- Per-endpoint limits
- Headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

### Input Sanitization
- XSS prevention
- SQL/NoSQL injection prevention
- Path traversal prevention
- Command injection prevention
- Type validation

### CORS
- Configurable origins
- Credentials support
- Preflight handling

### Security Headers
- Content-Security-Policy
- Strict-Transport-Security
- X-Frame-Options
- X-Content-Type-Options
- X-XSS-Protection
- Referrer-Policy
- Permissions-Policy

### Brute Force Protection (Auth Routes)
- Failed attempt tracking
- Exponential backoff
- CAPTCHA threshold
- Account lockout

## Sanitization Options

### String Options

```typescript
{
  minLength: 1,           // Minimum length
  maxLength: 100,         // Maximum length
  trim: true,             // Trim whitespace (default: true)
  isEmail: true,          // Validate as email
  isURL: true,            // Validate as URL
  isUUID: true,           // Validate as UUID
  allowHTML: true,         // Allow sanitized HTML
  stripTags: true,         // Strip all HTML tags
  allowPattern: /^[a-z]+$/, // Custom allow pattern
  blockPattern: /bad/,      // Custom block pattern
}
```

### Number Options

```typescript
{
  isNumber: true,         // Validate as number
  isInteger: true,        // Must be integer
  min: 0,                // Minimum value
  max: 100,              // Maximum value
}
```

### Boolean Options

```typescript
{
  isBoolean: true,         // Validate as boolean
}
```

## Advanced Usage

### Custom Security Configuration

```typescript
import { withSecurity, SecurityConfigs } from '@/lib/middleware/security';

const handler = withSecurity(
  async (request) => {
    return NextResponse.json({ success: true });
  },
  {
    // Override defaults
    enableRateLimit: true,
    enableBruteForceProtection: false,
    enableCORS: true,
    enableSecurityHeaders: true,
    enableInputSanitization: true,

    // Custom rate limit
    rateLimitConfig: {
      windowMs: 60 * 1000,  // 1 minute
      maxRequests: 30,       // 30 requests per minute
    },

    // Custom CORS
    corsConfig: {
      allowedOrigins: ['https://yourdomain.com'],
      credentials: true,
    },

    // Custom security headers
    securityHeadersConfig: {
      contentSecurityPolicy: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'nonce-{CSP_NONCE}'"],
      },
    },
  }
);
```

### Manual Input Sanitization

```typescript
import {
  sanitizeString,
  sanitizeNumber,
  sanitizeRequestBody,
  detectSQLInjection,
  detectXSS,
} from '@/lib/middleware/input-sanitization';

// Sanitize a string
const result = sanitizeString(userInput, {
  maxLength: 100,
  isEmail: true,
});

if (!result.valid) {
  return NextResponse.json({ error: result.error }, { status: 400 });
}

// Detect injection attempts
if (detectSQLInjection(userInput)) {
  return NextResponse.json({ error: 'SQL injection detected' }, { status: 400 });
}

// Sanitize request body
const body = await request.json();
const sanitized = sanitizeRequestBody(body, {
  name: { minLength: 1, maxLength: 100 },
  email: { isEmail: true },
});

if (!sanitized.valid) {
  return NextResponse.json(
    { errors: sanitized.errors },
    { status: 400 }
  );
}
```

### Rate Limiting Middleware

```typescript
import { withRateLimit, clearRateLimit } from '@/lib/middleware/rate-limit';

const handler = withRateLimit(
  async (request) => {
    return NextResponse.json({ success: true });
  },
  {
    windowMs: 60 * 1000,     // 1 minute window
    maxRequests: 100,         // 100 requests per window
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
  }
);
```

### CORS Middleware

```typescript
import { withCORS, createCORSConfig } from '@/lib/middleware/cors';

const handler = withCORS(
  async (request) => {
    return NextResponse.json({ success: true });
  },
  {
    allowedOrigins: ['https://yourdomain.com'],
    allowedMethods: ['GET', 'POST', 'PUT'],
    credentials: true,
  }
);
```

### Security Headers Middleware

```typescript
import { withSecurityHeaders } from '@/lib/middleware/security-headers';

const handler = withSecurityHeaders(
  async (request) => {
    return NextResponse.json({ success: true });
  },
  {
    contentSecurityPolicy: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'nonce-{CSP_NONCE}'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
    },
    hsts: {
      maxAge: 63072000,           // 2 years
      includeSubDomains: true,
      preload: true,
    },
  }
);
```

## Security Best Practices

### 1. Always Use Sanitized Input

```typescript
// ❌ BAD: Use raw input
const email = request.body.email;

// ✅ GOOD: Use sanitized input
const body = getSanitizedBody<{ email: string }>(request);
const email = body.email;
```

### 2. Define Schemas for All Endpoints

```typescript
// Define clear validation rules
{
  bodySchema: {
    email: { isEmail: true, required: true },
    password: { minLength: 8, required: true },
    name: { minLength: 1, maxLength: 100 },
  },
}
```

### 3. Use Appropriate Route Types

- **Public routes**: `withPublicSecurity` (health checks, status)
- **Auth routes**: `withAuthSecurity` (login, register)
- **Protected routes**: `withProtectedSecurity` (user data, operations)
- **Admin routes**: `withAdminSecurity` (admin operations)

### 4. Extract Identifiers for Auth Routes

```typescript
// Track by email for login attempts
async function extractEmail(request: NextRequest) {
  const body = await request.json();
  return body.email;
}

const handler = withAuthSecurity(
  async (request) => { /* ... */ },
  extractEmail  // Enable brute force protection tracking
);
```

### 5. Handle Sanitization Errors

```typescript
const handler = withProtectedSecurity(
  async (request) => {
    const body = getSanitizedBody<MyType>(request);

    if (!body) {
      return NextResponse.json(
        { error: 'Invalid input' },
        { status: 400 }
      );
    }

    // Process validated input
  },
  { bodySchema: schema }
);
```

## Testing Security

### Test Rate Limiting

```typescript
import { withRateLimit } from '@/lib/middleware/rate-limit';

const handler = withRateLimit(
  async () => ({ status: 200 }),
  { windowMs: 1000, maxRequests: 3 }
);

// Make 4 requests
// First 3: 200 OK
// 4th: 429 Too Many Requests
```

### Test Input Sanitization

```typescript
import { sanitizeString, detectSQLInjection } from '@/lib/middleware/input-sanitization';

// Test XSS
const xssResult = sanitizeString('<script>alert(1)</script>');
console.log(xssResult.sanitized); // "alert(1)"

// Test SQL injection
const sqlResult = detectSQLInjection("'; DROP TABLE users; --");
console.log(sqlResult); // true

// Test path traversal
const pathResult = sanitizeString('../../../etc/passwd');
console.log(pathResult.sanitized); // "etc/passwd"
```

### Test Brute Force Protection

```typescript
import { withBruteForceProtection } from '@/lib/middleware/brute-force-protection';

const handler = withBruteForceProtection(
  async (req, context) => {
    console.log('CAPTCHA required:', context.requireCaptcha);
    return { status: 200 };
  },
  { maxAttempts: 3, trackByAccount: true }
);
```

## Troubleshooting

### Issue: Rate limiting too strict

**Solution:** Adjust limits in `SecurityConfigs` or provide custom config.

```typescript
{
  rateLimitConfig: {
    windowMs: 60 * 1000,
    maxRequests: 100, // Increase from default 60
  },
}
```

### Issue: Input validation fails unexpectedly

**Solution:** Check sanitization options and error details.

```typescript
const body = getSanitizedBody<MyType>(request);
if (!body) {
  // Get detailed error from request middleware
  console.log('Validation failed');
}
```

### Issue: CORS blocked

**Solution:** Check `ALLOWED_ORIGINS` environment variable.

```bash
# .env
ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com
```

### Issue: Security headers not appearing

**Solution:** Ensure `enableSecurityHeaders: true` in config (default: true).

## Environment Variables

```bash
# CORS origins (production)
ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com

# Enable HSTS (production)
NODE_ENV=production
ENABLE_HSTS=true

# CSP nonce (auto-generated by Next.js)
CSP_NONCE=auto
```

## Further Reading

- **Full Implementation:** `SECURITY_IMPLEMENTATION_REPORT.md`
- **Security Tests:** `src/lib/middleware/__tests__/security.test.ts`
- **API Documentation:** See inline JSDoc comments in route files

## Support

For security issues or questions:
1. Check the implementation report
2. Review test cases
3. Consult inline documentation
4. Contact security team for critical issues
