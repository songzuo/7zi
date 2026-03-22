# Middleware Migration Guide

## Overview

This document explains the migration from global Next.js middleware to API route wrappers for request ID tracking and logging.

## Why Migrate?

- **Next.js 16+ Recommendation**: Per-request wrappers are more flexible and align with Next.js best practices
- **Better Performance**: Only applies logging where needed
- **Easier Testing**: Wrappers can be tested independently
- **More Control**: Each API route can choose to enable/disable logging

## What Was Changed?

### Before (Global Middleware)

`src/middleware.ts` added request IDs and logging to all requests:

```typescript
export function middleware(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-request-id', requestId);

  logger.info(`Incoming request: ${request.method} ${request.nextUrl.pathname}`, {
    requestId,
    method: request.method,
    path: request.nextUrl.pathname,
    userAgent: request.headers.get('user-agent'),
    ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
  });

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  response.headers.set('x-request-id', requestId);
  return response;
}

export const config = {
  matcher: ['/api/:path*', '/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

### After (API Route Wrappers)

`src/lib/middleware/with-request-id.ts` provides a wrapper for individual API routes:

```typescript
import { withRequestId } from '@/lib/middleware/with-request-id';

export const GET = withRequestId(async (request, context) => {
  const requestId = context.requestId;

  // Your API logic here
  return NextResponse.json({ requestId, data });
});
```

## How to Use

### Basic Usage

```typescript
import { NextResponse } from 'next/server';
import { withRequestId } from '@/lib/middleware/with-request-id';

export const GET = withRequestId(async (request, context) => {
  const { requestId } = context;

  return NextResponse.json({
    requestId,
    message: 'Hello, World!',
  });
});

export const POST = withRequestId(async (request, context) => {
  const body = await request.json();

  return NextResponse.json({
    requestId: context.requestId,
    received: body,
  });
});
```

### With Request Logging

The wrapper automatically logs:
- Request start (method, path, user agent, IP)
- Request completion (status code, duration)
- Slow requests (>500ms warning, >2000ms error)

### Skip Logging

If you want to disable automatic logging for a specific route:

```typescript
export const GET = withRequestId(
  async (request, context) => {
    return NextResponse.json({ data });
  },
  { skipLogging: true }
);
```

### Access Request ID

You can access the request ID in multiple ways:

1. From the context parameter:
   ```typescript
   export const GET = withRequestId(async (request, context) => {
     const requestId = context.requestId;
     // ...
   });
   ```

2. From request headers:
   ```typescript
   export const GET = withRequestId(async (request) => {
     const requestId = request.headers.get('x-request-id');
     // ...
   });
   ```

3. Using the helper function:
   ```typescript
   import { getRequestId } from '@/lib/middleware/with-request-id';

   export const GET = withRequestId(async (request) => {
     const requestId = getRequestId(request);
     // ...
   });
   ```

### Custom Request Logger

For detailed logging within your handler:

```typescript
import { createRequestLoggerForHandler } from '@/lib/middleware/with-request-id';

export const GET = withRequestId(async (request, context) => {
  const requestLogger = createRequestLoggerForHandler(context);

  requestLogger.info('Processing user data', { userId: '123' });

  // Your logic here

  requestLogger.info('User data processed successfully');

  return NextResponse.json({ data });
});
```

## Migration Steps for Existing API Routes

### Step 1: Import the wrapper

```typescript
import { withRequestId } from '@/lib/middleware/with-request-id';
```

### Step 2: Wrap your handler functions

**Before:**
```typescript
export async function GET(request: NextRequest) {
  // Your logic
  return NextResponse.json({ data });
}
```

**After:**
```typescript
export const GET = withRequestId(async (request, context) => {
  // Your logic
  return NextResponse.json({ data });
});
```

### Step 3: Update any request ID references

**Before:**
```typescript
const requestId = request.headers.get('x-request-id');
```

**After:**
```typescript
const requestId = context.requestId;
// or
const requestId = request.headers.get('x-request-id'); // Still works
```

## Benefits

1. **Granular Control**: Enable/disable logging per route
2. **Better Performance**: No overhead for routes that don't need it
3. **Type Safety**: Context object is strongly typed
4. **Easier Testing**: Wrappers can be tested independently
5. **More Flexible**: Can combine with other wrappers (auth, validation, etc.)

## Combining with Other Wrappers

You can combine `withRequestId` with other middleware wrappers:

```typescript
import { withRequestId } from '@/lib/middleware/with-request-id';
import { withAuth } from '@/lib/middleware/with-auth';
import { withValidation } from '@/lib/middleware/with-validation';

export const POST = withRequestId(
  withAuth(
    withValidation(async (request, context) => {
      // Your logic here
      return NextResponse.json({ data });
    }, schema)
  )
);
```

## Response Headers

All wrapped API routes will include the following response headers:

```
x-request-id: <unique-request-id>
```

## Log Levels

The wrapper automatically uses appropriate log levels:

- `info`: Successful requests
- `warn`: Client errors (4xx) and slow requests (>500ms)
- `error`: Server errors (5xx), critical slow requests (>2000ms), and exceptions

## Old Middleware

The old `src/middleware.ts` has been replaced with a minimal stub that can be safely deleted. The functionality has been moved to `src/lib/middleware/with-request-id.ts`.

To remove the old middleware completely:

1. Delete `src/middleware.ts`
2. Update all API routes to use `withRequestId` wrapper
3. Test your API routes to ensure request IDs are properly generated and logged

## Testing

You can test that the wrapper works correctly:

```bash
curl -i http://localhost:3000/api/your-route
```

Expected response headers:

```
HTTP/1.1 200 OK
x-request-id: 123e4567-e89b-12d3-a456-426614174000
Content-Type: application/json
```

## Troubleshooting

### Request ID Not Found

If you can't find the request ID, ensure:
1. You've wrapped your handler with `withRequestId`
2. You're accessing it from the correct parameter (`context.requestId` or `request.headers.get('x-request-id')`)

### Missing Logs

If logs aren't appearing:
1. Check that `skipLogging` is not set to `true`
2. Verify logger configuration in `src/lib/logger/index.ts`
3. Check log level settings

## Additional Resources

- Request ID wrapper: `src/lib/middleware/with-request-id.ts`
- API logger: `src/lib/api/api-logger.ts`
- Error logger: `src/lib/middleware/api-error-logging.ts`
- Main logger: `src/lib/logger/index.ts`
