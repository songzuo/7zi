# Error Handling System

## Overview

The 7zi-project has a comprehensive error handling system that includes:

1. **API Error Handling** - Consistent error responses across all API routes
2. **Client-Side Error Boundaries** - Graceful UI error handling
3. **Global Error Handlers** - Capture unhandled errors and rejections
4. **Error Tracking** - Sentry integration for production error monitoring
5. **Error Utilities** - Helper functions for creating standardized errors

## Error Response Format

All API routes should return errors in this consistent format:

```typescript
{
  success: false,
  error: {
    type: ErrorType,           // Error type enum (e.g., VALIDATION_ERROR, NOT_FOUND)
    message: string,            // Human-readable error message
    details?: Record<string, unknown>,  // Additional error details (optional)
    timestamp: string           // ISO 8601 timestamp
  }
}
```

## Error Types

```typescript
enum ErrorType {
  VALIDATION = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  RATE_LIMIT = 'RATE_LIMIT_EXCEEDED',
  INTERNAL = 'INTERNAL_ERROR',
  BAD_REQUEST = 'BAD_REQUEST',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  REGISTRATION_FAILED = 'REGISTRATION_FAILED',
  WEAK_PASSWORD = 'WEAK_PASSWORD',
  MISSING_TOKEN = 'MISSING_TOKEN',
}
```

## API Error Handler Usage

### Creating Error Responses

```typescript
import {
  createErrorResponse,
  createValidationError,
  createNotFoundError,
  createUnauthorizedError,
  createForbiddenError,
  createRateLimitError,
  createServiceUnavailableError,
} from '@/lib/api/error-handler';

// Validation error (400)
return createValidationError('Email and password are required');

// Not found error (404)
return createNotFoundError('User not found');

// Unauthorized error (401)
return createUnauthorizedError('Invalid credentials');

// Forbidden error (403)
return createForbiddenError('Access denied');

// Rate limit error (429)
return createRateLimitError('Too many requests');

// Service unavailable error (503)
return createServiceUnavailableError('Maintenance in progress');

// Generic error response
return createErrorResponse(error);
```

### Using Error Middleware

```typescript
import { withApiErrorMiddleware } from '@/lib/api/error-middleware';

export const GET = withApiErrorMiddleware(async (request: NextRequest) => {
  // Your handler logic
  return createSuccessResponse(data);
}, {
  tags: { route: '/api/users' }
});
```

### Manual Error Handling Pattern

```typescript
export async function POST(request: NextRequest) {
  try {
    // Your logic here
    return createSuccessResponse(data);
  } catch (error) {
    logger.error('API error', error);
    return createErrorResponse(error instanceof Error ? error : new Error(String(error)));
  }
}
```

## Error Boundaries

The app uses Next.js error boundaries for route-level error handling:

```typescript
// src/app/[locale]/error.tsx
'use client';
export { LocaleError as default } from '@/components/errors';

// src/components/errors/index.tsx
export const HomeError = createPageErrorBoundary('首页加载失败');
export const DashboardError = createPageErrorBoundary('控制面板加载失败');
// ... more error boundaries
```

## Global Error Handlers

Global error handlers capture unhandled promise rejections and uncaught exceptions:

```typescript
// Setup global error handlers (call during app initialization)
import { setupGlobalErrorHandlers, setupBrowserErrorHandlers } from '@/lib/global-error-handlers';

// Server-side
setupGlobalErrorHandlers();

// Client-side (in a useEffect in your root layout or providers)
useEffect(() => {
  setupBrowserErrorHandlers();
}, []);
```

## Error Tracking with Sentry

### Server-Side Error Tracking

```typescript
import { captureError } from '@/lib/monitoring/errors';

captureError(error, {
  category: ErrorCategory.API,
  severity: ErrorSeverity.ERROR,
  tags: {
    route: '/api/users',
    method: 'POST',
  },
  extra: {
    userId: user.id,
    requestId: request.id,
  },
});
```

### Client-Side Error Tracking

Sentry is configured in `sentry.client.config.ts` and automatically captures:
- React errors
- Unhandled promise rejections
- Uncaught exceptions
- Browser errors

### Error Categories

```typescript
enum ErrorCategory {
  APPLICATION = 'application',
  API = 'api',
  NETWORK = 'network',
  VALIDATION = 'validation',
  USER_INPUT = 'user_input',
  PERMISSION = 'permission',
  INFRASTRUCTURE = 'infrastructure',
  EXTERNAL_SERVICE = 'external_service',
  THIRD_PARTY = 'third_party',
}
```

## HTTP Status Codes

| Status Code | Error Type | Description |
|-------------|-----------|-------------|
| 200 | - | Success |
| 201 | - | Created |
| 400 | VALIDATION_ERROR, BAD_REQUEST, REGISTRATION_FAILED, WEAK_PASSWORD | Client error |
| 401 | UNAUTHORIZED, MISSING_TOKEN | Authentication required |
| 403 | FORBIDDEN | Access denied |
| 404 | NOT_FOUND | Resource not found |
| 429 | RATE_LIMIT_EXCEEDED | Too many requests |
| 500 | INTERNAL_ERROR | Server error |
| 503 | SERVICE_UNAVAILABLE | Service unavailable |

## Best Practices

### 1. Always Use Consistent Error Format

✅ **Good:**
```typescript
return createValidationError('Invalid email format');
```

❌ **Bad:**
```typescript
return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
```

### 2. Wrap Handlers in Error Middleware

✅ **Good:**
```typescript
export const GET = withApiErrorMiddleware(async (request) => {
  return createSuccessResponse(data);
});
```

❌ **Bad:**
```typescript
export async function GET(request) {
  try {
    return createSuccessResponse(data);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

### 3. Log Errors with Context

✅ **Good:**
```typescript
logger.error('User login failed', error, {
  category: 'auth',
  userId: user.id,
  email: user.email,
});
```

❌ **Bad:**
```typescript
console.error(error);
```

### 4. Capture Errors to Sentry

✅ **Good:**
```typescript
captureError(error, {
  category: ErrorCategory.API,
  severity: ErrorSeverity.ERROR,
  tags: { route: '/api/users' },
});
```

❌ **Bad:**
```typescript
throw error; // Only Sentry will catch if it's unhandled
```

### 5. Provide User-Friendly Messages

✅ **Good:**
```typescript
return createUnauthorizedError('您需要登录才能访问此资源');
```

❌ **Bad:**
```typescript
return createUnauthorizedError('Unauthorized access denied');
```

## Error Flow

```
Request → API Route → Error Occurs
                    ↓
            Error Handler
                    ↓
        ┌───────────┴───────────┐
        ↓                       ↓
    Logger              Sentry Capture
        ↓                       ↓
    Log File              Sentry Dashboard
        ↓
  Error Response
        ↓
    Client
```

## Migration Guide

### Migrating Inconsistent Error Handlers

If you find API routes not using the standard error handler:

**Before:**
```typescript
export async function GET(request) {
  try {
    const data = await getData();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch data' },
      { status: 500 }
    );
  }
}
```

**After:**
```typescript
export const GET = withApiErrorMiddleware(async (request) => {
  const data = await getData();
  return createSuccessResponse(data);
}, {
  tags: { route: '/api/data' }
});
```

Or with manual handling:
```typescript
export async function GET(request) {
  try {
    const data = await getData();
    return createSuccessResponse(data);
  } catch (error) {
    logger.error('Failed to fetch data', error);
    return createErrorResponse(error instanceof Error ? error : new Error(String(error)));
  }
}
```

## Testing Error Handlers

```typescript
// Example test
it('should return validation error for invalid input', async () => {
  const response = await POST(request);
  expect(response.status).toBe(400);
  const data = await response.json();
  expect(data.success).toBe(false);
  expect(data.error.type).toBe(ErrorType.VALIDATION_ERROR);
});
```

## Files

- `src/lib/api/error-handler.ts` - API error handler utilities
- `src/lib/api/error-middleware.ts` - API error middleware
- `src/lib/errors.ts` - General error utilities
- `src/lib/monitoring/errors.ts` - Error tracking and Sentry integration
- `src/lib/global-error-handlers.ts` - Global error handlers
- `src/components/errors/index.tsx` - Error boundary components
- `src/components/ErrorBoundary.tsx` - Main error boundary component

## Related Documentation

- [API Quick Reference](./API_QUICK_REFERENCE.ts)
- [API Structure](./API_STRUCTURE_DIAGRAM.ts)
- [API Logger](../src/lib/api/api-logger.ts)
