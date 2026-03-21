# API Security Middleware - Documentation

## Overview

This module provides comprehensive API security middleware for the 7zi-project, including:

- **CORS (Cross-Origin Resource Sharing)** - Configurable access control for cross-origin requests
- **CSRF (Cross-Site Request Forgery) Protection** - Token-based validation for state-changing operations
- **Rate Limiting** - LRU cache-based request throttling to prevent abuse
- **Pre-configured Security Chains** - Ready-to-use middleware compositions

## Installation

The middleware is already included in the project. Import from the middleware module:

```typescript
import {
  withCors,
  withRateLimit,
  withCsrfProtection,
  withStandardApiSecurity,
} from '@/middleware';
```

## CORS Middleware

### Basic Usage

```typescript
import { withCors } from '@/middleware';
import { NextRequest, NextResponse } from 'next/server';

export const GET = withCors(async (req: NextRequest) => {
  return NextResponse.json({ message: 'Hello, World!' });
});
```

### Configuration

```typescript
import { withCors, getEnvironmentOrigins } from '@/middleware';

export const GET = withCors(
  handler,
  {
    origin: ['https://example.com', 'https://app.example.com'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
    exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining'],
    credentials: true,
    maxAge: 86400, // 24 hours
  }
);

// Use environment-based origins
const origins = getEnvironmentOrigins();
export const GET = withCors(handler, { origin: origins });
```

### Pre-configured Policies

```typescript
import { corsPolicies } from '@/middleware';

// Strict policy (production)
export const GET = corsPolicies.strict(['https://example.com']);

// Development policy (allows all origins)
export const GET = corsPolicies.development;

// API gateway policy
export const GET = corsPolicies.apiGateway(['https://app.example.com']);

// Public API policy (no credentials)
export const GET = corsPolicies.public;
```

## CSRF Protection

### Basic Usage

```typescript
import { withCsrfProtection } from '@/middleware';

export const POST = withCsrfProtection(async (req: NextRequest) => {
  // Your handler logic here
  return NextResponse.json({ success: true });
});
```

### Configuration

```typescript
import { withCsrfProtection } from '@/middleware';

export const POST = withCsrfProtection(
  handler,
  {
    enabled: true,
    protectedMethods: ['POST', 'PUT', 'PATCH', 'DELETE'],
    skipSameOrigin: true,
    tokenMaxAge: 60 * 60 * 1000, // 1 hour
    rotateTokens: false, // Set to true to rotate tokens after validation
    exemptPaths: ['/api/public/webhook'],
    useSignedTokens: true, // Use JWT signatures for tokens
  }
);
```

### Token Rotation

```typescript
// Enable token rotation for enhanced security
export const POST = withCsrfProtection(
  handler,
  {
    rotateTokens: true,
    useSignedTokens: true,
  }
);

// The response will include:
// - X-CSRF-Token: new token value
// - X-CSRF-Token-Rotated: true
// - A new cookie with the rotated token
```

### Server-Side Token Generation

```typescript
import { generateCsrfToken } from '@/middleware';

// Generate a new CSRF token
const token = await generateCsrfToken(true); // Use signed tokens

// Return to client
return NextResponse.json({ csrfToken: token });
```

## Rate Limiting

### Basic Usage

```typescript
import { withRateLimit } from '@/middleware';

export const GET = withRateLimit(
  async (req: NextRequest) => {
    return NextResponse.json({ message: 'Hello!' });
  },
  {
    windowMs: 60000, // 1 minute
    maxRequests: 60, // 60 requests per minute
  }
);
```

### LRU Cache Configuration

The rate limiter uses an LRU (Least Recently Used) cache with a default size of 10,000 entries. Old entries are automatically cleaned up.

### User-Based Rate Limiting

```typescript
import { withRateLimit } from '@/middleware';

// Rate limit by user ID instead of IP
export const GET = withRateLimit(
  handler,
  {
    windowMs: 60000,
    maxRequests: 100,
  },
  'user-123' // Unique identifier (user ID, API key, etc.)
);
```

### Skip Options

```typescript
import { withSmartRateLimit } from '@/middleware';

// Don't count successful requests
export const GET = withSmartRateLimit(
  handler,
  {
    windowMs: 60000,
    maxRequests: 60,
    skipSuccessfulRequests: true,
  }
);

// Don't count failed requests
export const POST = withSmartRateLimit(
  handler,
  {
    windowMs: 60000,
    maxRequests: 10,
    skipFailedRequests: true,
  }
);
```

### Periodic Cleanup

```typescript
import { startPeriodicCleanup, stopPeriodicCleanup } from '@/middleware';

// Start periodic cleanup (runs every 5 minutes by default)
startPeriodicCleanup();

// Start with custom interval (e.g., every 2 minutes)
startPeriodicCleanup(2 * 60 * 1000);

// Stop periodic cleanup
stopPeriodicCleanup();
```

### Rate Limit Headers

Rate-limited responses include these headers:

- `X-RateLimit-Limit` - Maximum requests per window
- `X-RateLimit-Remaining` - Remaining requests in current window
- `X-RateLimit-Reset` - Unix timestamp when the window resets
- `Retry-After` - Seconds until retry is allowed (only when rate limited)

## Pre-configured Security Chains

### Standard API Security

Applies CORS, rate limiting, and CSRF protection:

```typescript
import { withStandardApiSecurity } from '@/middleware';

export const POST = withStandardApiSecurity(
  handler,
  {
    cors: {
      origin: ['https://example.com'],
    },
    rateLimit: {
      windowMs: 60000,
      maxRequests: 10,
    },
    csrf: {
      useSignedTokens: true,
    },
  }
);
```

### Public API Security

Applies CORS and rate limiting only (no CSRF):

```typescript
import { withPublicApiSecurity } from '@/middleware';

export const GET = withPublicApiSecurity(
  handler,
  {
    cors: {
      origin: '*',
      credentials: false,
    },
    rateLimit: {
      windowMs: 60000,
      maxRequests: 100,
    },
  }
);
```

### Internal API Security

Applies rate limiting and CSRF protection only (no CORS):

```typescript
import { withInternalApiSecurity } from '@/middleware';

export const POST = withInternalApiSecurity(
  handler,
  {
    rateLimit: {
      windowMs: 60000,
      maxRequests: 50,
    },
    csrf: {
      useSignedTokens: true,
    },
  }
);
```

## Composing Middleware

You can compose middleware in any order:

```typescript
import { withCors, withRateLimit, withCsrfProtection } from '@/middleware';

// Apply middleware in order: CORS → Rate Limit → CSRF
export const POST = withCsrfProtection(
  withRateLimit(
    withCors(handler, corsConfig),
    rateLimitConfig
  ),
  csrfConfig
);

// Different order: CSRF → Rate Limit → CORS
export const POST = withCors(
  withRateLimit(
    withCsrfProtection(handler, csrfConfig),
    rateLimitConfig
  ),
  corsConfig
);
```

## Environment Variables

### CORS

```env
# CORS_ALLOWED_ORIGINS (comma-separated list)
CORS_ALLOWED_ORIGINS=https://example.com,https://app.example.com
```

### CSRF

```env
# CSRF_SECRET_KEY (JWT signing key for CSRF tokens)
# IMPORTANT: Change this in production!
CSRF_SECRET_KEY=your-secret-key-here-change-in-production
```

### Node Environment

```env
# NODE_ENV (affects default behaviors)
NODE_ENV=production # or development, test
```

## Best Practices

### 1. Always Use HTTPS in Production

```typescript
// The middleware automatically sets secure flags in production
process.env.NODE_ENV === 'production'; // true
```

### 2. Configure Appropriate Rate Limits

```typescript
// Health checks - high allowance
export const GET = withRateLimit(handler, {
  windowMs: 60000,
  maxRequests: 100,
});

// Auth endpoints - strict limits
export const POST = withRateLimit(handler, {
  windowMs: 60000,
  maxRequests: 5,
});

// Public APIs - moderate limits
export const GET = withRateLimit(handler, {
  windowMs: 60000,
  maxRequests: 60,
});
```

### 3. Use Signed Tokens for CSRF

```typescript
// Always use signed tokens in production
export const POST = withCsrfProtection(handler, {
  useSignedTokens: true,
});
```

### 4. Rotate CSRF Tokens for Sensitive Operations

```typescript
// Rotate tokens for banking, admin, etc.
export const POST = withCsrfProtection(handler, {
  rotateTokens: true,
});
```

### 5. Define Exempt Paths Carefully

```typescript
// Only exempt truly public endpoints
export const POST = withCsrfProtection(handler, {
  exemptPaths: [
    '/api/public/webhook',
    '/api/public/callback',
  ],
});
```

### 6. Monitor Rate Limit Hits

```typescript
import { getRateLimitStats } from '@/middleware';

// Get rate limit statistics
const stats = getRateLimitStats();
console.log({
  totalEntries: stats.totalEntries,
  trackedPaths: stats.trackedPaths,
  totalRequests: stats.totalRequests,
});
```

## Testing

Run the middleware tests:

```bash
# Run all middleware tests
npm test -- middleware

# Run integration tests
npm test -- middleware/__tests__/integration.test.ts
```

## Troubleshooting

### CORS Errors

**Problem**: Requests are blocked with CORS errors

**Solution**:
1. Check if the origin is in the allowed list
2. Verify `Access-Control-Allow-Origin` header in response
3. Ensure credentials are configured correctly

```typescript
// Log CORS errors
const handler = withCors(asyncHandler, {
  onError: (error) => {
    console.error('CORS error:', error);
    return NextResponse.json({ error: 'CORS failed' }, { status: 403 });
  },
});
```

### CSRF Validation Failures

**Problem**: CSRF token validation always fails

**Solution**:
1. Check if token is being sent in `X-CSRF-Token` header
2. Verify cookie is set with `httpOnly: true`
3. Ensure tokens are signed with the same secret key

```typescript
// Debug CSRF validation
const handler = withCsrfProtection(asyncHandler, {
  onError: (error) => {
    console.error('CSRF error:', error);
    return NextResponse.json({ error: 'CSRF failed' }, { status: 403 });
  },
});
```

### Rate Limit Issues

**Problem**: Requests are rate limited too quickly

**Solution**:
1. Check rate limit configuration
2. Verify `X-RateLimit-Remaining` header
3. Consider increasing limits or using user-based limiting

```typescript
// Check rate limit status
import { getRateLimitStatus } from '@/middleware';

const status = getRateLimitStatus('/api/test:192.168.1.1');
console.log(status);
// { count: 10, remaining: 50, resetTime: 1711234567890 }
```

## Performance Considerations

### LRU Cache

The rate limiter uses an LRU cache to automatically evict old entries:

- Default size: 10,000 entries
- Automatic cleanup of expired entries
- O(1) time complexity for get/set operations

### Memory Usage

```typescript
// Monitor memory usage
import { getRateLimitStats } from '@/middleware';

const stats = getRateLimitStats();
console.log(`Tracking ${stats.totalEntries} rate limit entries`);
```

### Periodic Cleanup

In production, periodic cleanup runs automatically every 5 minutes:

```typescript
// This is auto-started in production
if (process.env.NODE_ENV === 'production') {
  startPeriodicCleanup();
}
```

## Migration Guide

### From Next.js Built-in CORS

```typescript
// Before (Next.js built-in)
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  return NextResponse.json({ data: '...' }, {
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
  });
}

// After (with middleware)
import { withCors } from '@/middleware';

export const GET = withCors(async (req) => {
  return NextResponse.json({ data: '...' });
}, { origin: '*' });
```

### From Custom Rate Limiting

```typescript
// Before (custom rate limiting)
export async function GET(request: Request) {
  const ip = getClientIP(request);
  if (checkRateLimit(ip)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }
  // ...
}

// After (with middleware)
import { withRateLimit } from '@/middleware';

export const GET = withRateLimit(
  async (req) => {
    return NextResponse.json({ data: '...' });
  },
  { windowMs: 60000, maxRequests: 60 }
);
```

## Additional Resources

- [OWASP CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [MDN Web Docs - CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [OWASP Rate Limiting Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Rate_Limiting_Cheat_Sheet.html)

## Support

For issues or questions about the middleware:

1. Check the troubleshooting section above
2. Review the test files in `src/middleware/__tests__/`
3. Open an issue in the project repository
