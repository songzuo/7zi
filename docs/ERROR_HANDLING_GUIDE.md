# Error Handling Guide

**Version:** 1.0.0  
**Last Updated:** 2026-03-21  
**Status:** ✅ Production Ready

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Error Handling Architecture](#error-handling-architecture)
3. [ErrorType Enum](#errortype-enum)
4. [API Error Handling](#api-error-handling)
5. [Component Error Boundaries](#component-error-boundaries)
6. [Global Error Handling](#global-error-handling)
7. [Error Monitoring with Sentry](#error-monitoring-with-sentry)
8. [Best Practices](#best-practices)
9. [Security Considerations](#security-considerations)
10. [Common Patterns](#common-patterns)

---

## Overview

The 7zi project implements a comprehensive error handling system that provides:

- **Consistent error responses** across all API routes
- **User-friendly error UI** with multiple display variants
- **Centralized error logging** with environment-aware sanitization
- **Sentry integration** for production error monitoring
- **Component-level error boundaries** for graceful degradation

### Key Principles

1. **Never expose sensitive data** in error messages
2. **Provide actionable feedback** to users
3. **Log errors centrally** for debugging
4. **Support internationalization** for all error messages
5. **Offer recovery options** when possible

---

## Error Handling Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Error Occurs                            │
└────────────────────┬────────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
        ▼                         ▼
┌───────────────┐         ┌───────────────┐
│  API Route    │         │  Component    │
│  Error        │         │  Error        │
└───────┬───────┘         └───────┬───────┘
        │                         │
        ▼                         ▼
┌───────────────┐         ┌───────────────┐
│ withError-    │         │ ErrorBoundary │
│ Handling      │         │ Wrapper       │
└───────┬───────┘         └───────┬───────┘
        │                         │
        ▼                         ▼
┌───────────────┐         ┌───────────────┐
│ createError-  │         │ ErrorDisplay  │
│ Response      │         │ Component     │
└───────┬───────┘         └───────┬───────┘
        │                         │
        └────────────┬────────────┘
                     ▼
          ┌──────────────────┐
          │  Logger + Sentry │
          └──────────────────┘
                     │
                     ▼
          ┌──────────────────┐
          │  User Feedback   │
          └──────────────────┘
```

---

## ErrorType Enum

The `ErrorType` enum categorizes all error types in the system. Use these values for consistent error classification.

### Location

`src/lib/api/error-handler.ts`

### Error Types

```typescript
export enum ErrorType {
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

### Error Type Mapping

| ErrorType             | HTTP Status | Use Case                           |
| --------------------- | ----------- | ---------------------------------- |
| `VALIDATION`          | 400         | Invalid input data                 |
| `NOT_FOUND`           | 404         | Resource doesn't exist             |
| `UNAUTHORIZED`        | 401         | Missing or invalid authentication  |
| `FORBIDDEN`           | 403         | Insufficient permissions           |
| `RATE_LIMIT`          | 429         | Too many requests                  |
| `INTERNAL`            | 500         | Unexpected server errors           |
| `BAD_REQUEST`         | 400         | Malformed request                  |
| `SERVICE_UNAVAILABLE` | 503         | Service is down                    |
| `REGISTRATION_FAILED` | 400         | User registration errors           |
| `WEAK_PASSWORD`       | 400         | Password doesn't meet requirements |
| `MISSING_TOKEN`       | 401         | Authentication token missing       |

---

## API Error Handling

### Standard Error Response Format

All API errors follow this standardized format:

```typescript
interface ErrorResponse {
  success: false
  error: {
    type: ErrorType
    message: string
    details?: Record<string, unknown>
    timestamp: string
  }
}
```

### Success Response Format

```typescript
interface SuccessResponse<T = unknown> {
  success: true
  data: T
  timestamp: string
}
```

### Core Functions

#### 1. `createSuccessResponse`

Creates a standardized success response.

```typescript
import { createSuccessResponse } from '@/lib/api/error-handler'

// Basic usage
export async function GET(request: NextRequest) {
  const data = { id: 1, name: 'Test' }
  return createSuccessResponse(data)
}

// With custom status code
return createSuccessResponse(data, 201) // Created
```

#### 2. `createErrorResponse`

Creates a standardized error response from an error object.

```typescript
import { createErrorResponse, ApiError, ErrorType } from '@/lib/api/error-handler'

// From ApiError
const error = new ApiError(ErrorType.VALIDATION, 'Invalid email format', 400)
return createErrorResponse(error)

// From generic Error
try {
  // some operation
} catch (error) {
  return createErrorResponse(error instanceof Error ? error : new Error(String(error)))
}
```

#### 3. `withErrorHandling`

Higher-order function that wraps API route handlers with automatic error handling.

```typescript
import { withErrorHandling, createSuccessResponse } from '@/lib/api/error-handler'

export const GET = withErrorHandling(async (request: Request) => {
  const data = await fetchData()
  return createSuccessResponse(data)
})

export const POST = withErrorHandling(async (request: Request) => {
  const body = await request.json()
  // Handler logic
  return createSuccessResponse(result)
})
```

### Helper Functions

Each error type has a dedicated helper function:

```typescript
import {
  createValidationError,
  createNotFoundError,
  createUnauthorizedError,
  createForbiddenError,
  createRateLimitError,
  createServiceUnavailableError,
  createRegistrationFailedError,
  createWeakPasswordError,
  createBadRequestError,
  createMissingTokenError,
} from '@/lib/api/error-handler'

// Validation error
return createValidationError('Email is required', { field: 'email' })

// Not found error
return createNotFoundError('User not found', { userId: '123' })

// Unauthorized error
return createUnauthorizedError('Please log in to continue')

// Forbidden error
return createForbiddenError('You do not have permission to access this resource')

// Rate limit error
return createRateLimitError('Too many requests, please try again later')

// Service unavailable error
return createServiceUnavailableError('Database maintenance in progress')

// Registration failed error
return createRegistrationFailedError('Email already registered', { email: 'test@example.com' })

// Weak password error
return createWeakPasswordError('Password must be at least 8 characters', {
  minLength: 8,
})

// Bad request error
return createBadRequestError('Invalid request format')

// Missing token error
return createMissingTokenError()
```

### Complete API Route Example

```typescript
import { NextRequest } from 'next/server'
import {
  withErrorHandling,
  createSuccessResponse,
  createValidationError,
  createNotFoundError,
} from '@/lib/api/error-handler'
import { logger } from '@/lib/logger'

interface CreateUserRequest {
  email: string
  password: string
  name: string
}

export const POST = withErrorHandling(async (request: NextRequest) => {
  const body: CreateUserRequest = await request.json()

  // Validate input
  if (!body.email || !body.password || !body.name) {
    return createValidationError('All fields are required', {
      missingFields: ['email', 'password', 'name'].filter(field => !body[field]),
    })
  }

  // Check password strength
  if (body.password.length < 8) {
    return createWeakPasswordError('Password must be at least 8 characters', {
      minLength: 8,
      actualLength: body.password.length,
    })
  }

  // Check if user exists
  const existingUser = await findUserByEmail(body.email)
  if (existingUser) {
    return createRegistrationFailedError('Email already registered', { email: body.email })
  }

  // Create user
  const user = await createUser(body)

  // Log success (non-sensitive)
  logger.info('User created successfully', { userId: user.id, email: body.email })

  return createSuccessResponse(user, 201)
})
```

---

## Component Error Boundaries

### ErrorBoundaryWrapper Component

The `ErrorBoundaryWrapper` is a class-based React error boundary that catches JavaScript errors in component trees.

#### Features

- Automatic error detection and type classification
- Sentry integration for error tracking
- Multiple display variants (default, compact, fullscreen)
- Recovery options (retry, go home, go back)
- Internationalization support

#### Basic Usage

```tsx
import { ErrorBoundaryWrapper } from '@/components/ErrorBoundaryWrapper'

function MyComponent() {
  return (
    <ErrorBoundaryWrapper title="加载失败" showReset variant="compact">
      <ChildComponent />
    </ErrorBoundaryWrapper>
  )
}
```

#### Props

```typescript
interface Props {
  children: ReactNode
  fallback?: ReactNode // Custom fallback UI
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
  title?: string // Error title
  showReset?: boolean // Show retry button
  variant?: 'default' | 'compact' | 'fullscreen'
  logError?: boolean // Log to Sentry (default: true)
  showReportLink?: boolean // Show report error link
}
```

#### Custom Fallback

```tsx
<ErrorBoundaryWrapper
  fallback={
    <div className="rounded bg-red-50 p-4">
      <p>Something went wrong</p>
      <button onClick={() => window.location.reload()}>Reload Page</button>
    </div>
  }
>
  <ChildComponent />
</ErrorBoundaryWrapper>
```

### withErrorBoundary HOC

Wrap components with error boundary for reuse:

```tsx
import { withErrorBoundary } from '@/components/ErrorBoundaryWrapper'

// Wrap component
const SafeComponent = withErrorBoundary(MyComponent, {
  title: '加载失败',
  showReset: true,
  variant: 'compact',
})

// Use wrapped component
function Parent() {
  return <SafeComponent />
}
```

### ErrorDisplay Component

Reusable error display UI with multiple variants.

#### Variants

- `default` - Full-featured error page
- `compact` - Inline error message
- `fullscreen` - Full-screen modal

#### Error Types

- `generic` - General error
- `network` - Network connection error
- `not-found` - 404 error
- `unauthorized` - 401 error
- `forbidden` - 403 error
- `server` - 500 error

#### Usage

```tsx
import { ErrorDisplay } from '@/components/ErrorDisplay'
;<ErrorDisplay
  title="Network Error"
  message="Unable to connect to the server"
  errorType="network"
  showReset
  onReset={() => retryFunction()}
  showHomeButton
/>
```

### Async Error Boundaries

For use with React.lazy and Suspense:

```tsx
import { AsyncErrorBoundary } from '@/components/ErrorBoundaryWrapper'
import { Suspense } from 'react'

const LazyComponent = lazy(() => import('./LazyComponent'))

function App() {
  return (
    <AsyncErrorBoundary title="组件加载失败">
      <Suspense fallback={<LoadingSpinner />}>
        <LazyComponent />
      </Suspense>
    </AsyncErrorBoundary>
  )
}
```

### Error Type Analysis

The error boundary automatically analyzes error types:

```typescript
function analyzeErrorType(error: Error): ErrorType {
  if (isNetworkError(error)) {
    return 'network'
  }

  const code = getErrorCode(error)

  switch (code) {
    case ErrorCodes.NOT_FOUND:
      return 'not-found'
    case ErrorCodes.UNAUTHORIZED:
      return 'unauthorized'
    case ErrorCodes.FORBIDDEN:
      return 'forbidden'
    case ErrorCodes.SERVER_ERROR:
      return 'server'
    case ErrorCodes.NETWORK_ERROR:
      return 'network'
    default:
      return 'generic'
  }
}
```

---

## Global Error Handling

### Root-Level Error Boundaries

#### global-error.tsx

Catches app-wide errors and displays a clean recovery UI.

```tsx
// src/app/global-error.tsx
'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body>
        <ErrorBoundaryWrapper
          error={error}
          reset={reset}
          title="Application Error"
          variant="fullscreen"
        />
      </body>
    </html>
  )
}
```

#### error.tsx

Route-level error handling.

```tsx
// src/app/[locale]/error.tsx
'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return <ErrorBoundaryWrapper error={error} reset={reset} />
}
```

### Error Page Factory

Create reusable page-level error boundaries:

```tsx
import { createPageErrorBoundary } from '@/components/errors'

// Create custom error boundary
const MyPageError = createPageErrorBoundary('My Page Error')

// Use in error.tsx
export default function Error({ error, reset }: ErrorProps) {
  return <MyPageError error={error} reset={reset} />
}
```

---

## Error Monitoring with Sentry

### Integration

The error handling system integrates with Sentry for production error monitoring.

### Automatic Logging

```typescript
// ErrorBoundaryWrapper automatically logs to Sentry
componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
  Sentry.withScope((scope) => {
    scope.setTag('source', 'ErrorBoundaryWrapper');
    scope.setTag('error_type', analyzeErrorType(error));
    scope.setExtra('componentStack', errorInfo.componentStack);
    Sentry.captureException(error);
  });
}
```

### Manual Logging

```typescript
import * as Sentry from '@sentry/nextjs'

try {
  // Operation
} catch (error) {
  Sentry.withScope(scope => {
    scope.setTag('category', 'api')
    scope.setContext('request', { userId, endpoint })
    Sentry.captureException(error)
  })
}
```

### Environment-Aware Logging

```typescript
// logger implementation
if (process.env.NODE_ENV === 'production') {
  // Sanitize error details
  // No stack traces
  // No file paths
} else {
  // Full error details in development
}
```

---

## Best Practices

### API Routes

✅ **DO:**

```typescript
export const POST = withErrorHandling(async (request: Request) => {
  const body = await request.json()

  if (!body.email) {
    return createValidationError('Email is required')
  }

  const result = await createUser(body)
  return createSuccessResponse(result, 201)
})
```

❌ **DON'T:**

```typescript
export const POST = async (request: Request) => {
  try {
    const body = await request.json()
    const result = await createUser(body)
    return NextResponse.json(result)
  } catch (error) {
    // ❌ Exposes error details
    console.error(error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
```

### Component Error Boundaries

✅ **DO:**

```tsx
<ErrorBoundaryWrapper title="组件加载失败" showReset variant="compact">
  <AsyncComponent />
</ErrorBoundaryWrapper>
```

❌ **DON'T:**

```tsx
// ❌ No error boundary - component crashes entire app
<AsyncComponent />
```

### Error Logging

✅ **DO:**

```typescript
import { logger } from '@/lib/logger'

logger.error('Failed to process request', error, {
  category: 'api',
  endpoint: '/api/users',
  sensitive: false,
})
```

❌ **DON'T:**

```typescript
// ❌ Logs sensitive data in production
console.error('Failed to encrypt backup:', error)
```

### Error Messages

✅ **DO:**

```typescript
// User-friendly, actionable message
return createUnauthorizedError('Please log in to continue')
```

❌ **DON'T:**

```typescript
// ❌ Technical details exposed to users
return createUnauthorizedError('JWT token missing in Authorization header')
```

---

## Security Considerations

### ⚠️ Critical Security Rules

1. **Never log sensitive data** in production:
   - Encryption keys
   - Passwords
   - Session tokens
   - Personal identifiable information (PII)
   - File paths

2. **Sanitize error messages** before exposing to users:
   - Remove stack traces
   - Remove internal file paths
   - Remove database queries
   - Remove API endpoints

3. **Use environment-aware logging**:
   ```typescript
   if (process.env.NODE_ENV === 'production') {
     logger.error('Operation failed', { action: 'encrypt_backup' })
   } else {
     logger.error('Operation failed', error)
   }
   ```

### Sensitive Module Handling

#### ❌ UNSAFE (Current implementation in some modules)

```typescript
// backup/encryption.ts
console.error('Failed to encrypt backup:', error) // ⚠️ Exposes encryption details
```

#### ✅ SAFE (Required change)

```typescript
// backup/encryption.ts
import { logger } from '@/lib/logger'

logger.error('Backup encryption failed', error, {
  category: 'backup',
  operation: 'encrypt',
  sensitive: true, // Mark as sensitive for sanitization
})
```

### Error Response Sanitization

The `createErrorResponse` function automatically sanitizes errors in production:

```typescript
// In production
{
  success: false,
  error: {
    type: 'INTERNAL_ERROR',
    message: 'An internal error occurred',
    timestamp: '2026-03-21T10:00:00Z'
  }
}

// In development
{
  success: false,
  error: {
    type: 'INTERNAL_ERROR',
    message: 'An internal error occurred',
    details: {
      originalMessage: 'Connection refused at database:5432'
    },
    timestamp: '2026-03-21T10:00:00Z'
  }
}
```

---

## Common Patterns

### Pattern 1: API Route with Validation

```typescript
import {
  withErrorHandling,
  createSuccessResponse,
  createValidationError,
} from '@/lib/api/error-handler'

export const POST = withErrorHandling(async (request: Request) => {
  const { email, password } = await request.json()

  // Validation
  if (!email || !password) {
    return createValidationError('Email and password are required')
  }

  if (!isValidEmail(email)) {
    return createValidationError('Invalid email format', { field: 'email' })
  }

  // Business logic
  const user = await authenticateUser(email, password)

  return createSuccessResponse({ token: user.token })
})
```

### Pattern 2: Async Component with Error Boundary

```tsx
import { ErrorBoundaryWrapper } from '@/components/ErrorBoundaryWrapper'
import { Suspense } from 'react'

function UserProfile() {
  return (
    <ErrorBoundaryWrapper title="用户资料加载失败" showReset variant="compact">
      <Suspense fallback={<LoadingSpinner />}>
        <UserData />
      </Suspense>
    </ErrorBoundaryWrapper>
  )
}
```

### Pattern 3: Form Submission with Error Handling

```tsx
function ContactForm() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('loading')
    setError(null)

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        body: JSON.stringify(formData),
      })

      const result = await response.json()

      if (!result.success) {
        setError(result.error.message)
        setStatus('error')
        return
      }

      setStatus('success')
    } catch (err) {
      setError('网络错误，请稍后重试')
      setStatus('error')
    }
  }

  if (status === 'error') {
    return <ErrorDisplay title="发送失败" message={error} />
  }

  // Render form...
}
```

### Pattern 4: Data Fetching with Retry

```tsx
import { ErrorDisplay } from '@/components/ErrorDisplay'

function DataLoader() {
  const { data, error, isLoading, refetch } = useQuery({
    queryKey: ['data'],
    queryFn: fetchData,
  })

  if (isLoading) return <LoadingSpinner />

  if (error) {
    return (
      <ErrorDisplay
        title="数据加载失败"
        message={error.message}
        errorType="network"
        showReset
        onReset={() => refetch()}
      />
    )
  }

  return <DataView data={data} />
}
```

### Pattern 5: Route-Specific Error Pages

```tsx
// app/dashboard/error.tsx
'use client'

import { ErrorBoundaryWrapper } from '@/components/ErrorBoundaryWrapper'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <ErrorBoundaryWrapper
      error={error}
      reset={reset}
      title="Dashboard 加载失败"
      variant="default"
    />
  )
}
```

---

## Migration Guide

### Migrating from Manual Error Handling

**Before:**

```typescript
export async function POST(request: Request) {
  try {
    const data = await request.json()
    const result = await processData(data)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
```

**After:**

```typescript
import { withErrorHandling, createSuccessResponse } from '@/lib/api/error-handler'

export const POST = withErrorHandling(async (request: Request) => {
  const data = await request.json()
  const result = await processData(data)
  return createSuccessResponse(result)
})
```

### Migrating 7zi-Frontend API Routes

The 7zi-frontend subproject needs to migrate to use the unified error handler:

**Before:**

```typescript
// 7zi-frontend/src/app/api/projects/route.ts
export async function GET() {
  if (!hasPermission) {
    return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
  }
  const projects = await getProjects()
  return NextResponse.json(projects)
}
```

**After:**

```typescript
import { createForbiddenError, createSuccessResponse } from '@/lib/api/error-handler'

export const GET = withErrorHandling(async () => {
  if (!hasPermission) {
    return createForbiddenError('You do not have permission to access projects')
  }
  const projects = await getProjects()
  return createSuccessResponse(projects)
})
```

---

## Troubleshooting

### Issue: Errors not appearing in Sentry

**Solution:**

1. Check if `SENTRY_DSN` is configured in environment variables
2. Verify `logError` prop is not set to `false`
3. Check browser console for network errors
4. Review Sentry configuration in `sentry.client.config.ts`

### Issue: Error boundary not catching errors

**Solution:**

1. Ensure error boundary is a class component
2. Check if error occurs during event handlers (use try-catch)
3. Verify error boundary is not the child throwing the error
4. Check for async state updates

### Issue: Console errors in production

**Solution:**

1. Replace all `console.error` with `logger.error`
2. Mark sensitive operations with `sensitive: true`
3. Verify `NODE_ENV` is set to `production`
4. Check for inline scripts with console statements

---

## References

- **Error Handler Implementation:** `/src/lib/api/error-handler.ts`
- **Error Boundary Component:** `/src/components/ErrorBoundaryWrapper.tsx`
- **Error Display Component:** `/src/components/ErrorDisplay.tsx`
- **Audit Report:** `/ERROR_HANDLING_AUDIT.md`
- **Existing Error Docs:** `/docs/ERROR-HANDLING.md`

---

## Changelog

### Version 1.0.0 (2026-03-21)

- ✅ Initial comprehensive error handling guide
- ✅ API error handling documentation
- ✅ Component error boundary guide
- ✅ Security considerations
- ✅ Common patterns and examples
- ✅ Migration guide for existing code

---

**Maintained by:** 7zi Development Team  
**Questions?** Contact the development team or create an issue in the repository.
