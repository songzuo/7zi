# API Documentation

## Overview

This document describes the API architecture, response formats, error handling patterns, and testing guidelines for the 7zi Project API.

## Performance & Caching

### Caching Strategy

API responses are cached using the in-memory `CacheManager` with the following TTL presets:

- **REALTIME**: 5 seconds - Real-time data
- **SHORT**: 30 seconds - Frequently changing data (health checks, performance reports)
- **MEDIUM**: 60 seconds - Semi-static data
- **LONG**: 5 minutes - Static data
- **VERY_LONG**: 30 minutes - Rarely changing data

### Cached Endpoints

| Endpoint | TTL | Description |
|----------|-----|-------------|
| `/api/health` | 30s | Basic health status (memory, node version) |
| `/api/health/detailed` | 30s | Detailed health with external dependency checks |
| `/api/performance/report` | 30s | Performance metrics and reports |
| `/api/database/health` | 30s | Database health status |

### Rate Limiting

All API endpoints have rate limiting configured:

| Endpoint | Requests/Window | Window | Notes |
|----------|----------------|--------|-------|
| `/api/health` | 100 | 60s | High allowance for probes |
| `/api/health/live` | 100 | 60s | Kubernetes liveness |
| `/api/health/ready` | 100 | 60s | Kubernetes readiness |
| `/api/health/detailed` | 50 | 60s | Detailed checks |
| `/api/performance/report` | 20 | 60s | Moderate limit |
| `/api/auth/login` | 10 | 60s | Moderate strict |
| `/api/auth/register` | 5 | 60s | Strict limit |
| `/api/database/optimize` | 5 | 60s | Very strict |

**Rate Limit Headers:**
- `X-RateLimit-Limit`: Maximum requests per window
- `X-RateLimit-Remaining`: Remaining requests in current window
- `X-RateLimit-Reset`: When the window resets (ISO timestamp)
- `Retry-After`: Seconds to wait when rate limited (429)

### Compression

API responses are automatically compressed using:
- **gzip** (fallback)
- **Brotli (br)** (preferred, if supported by client)

Compression is handled by Next.js and configured in `next.config.ts`.

### Response Headers

All API responses include:

**Security Headers:**
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `X-Response-Time: <ms>` (for performance tracking)

**Caching Headers:**
- Vary by request (no static `Cache-Control` for dynamic routes)
- TTL managed by in-memory cache

**Compression Headers:**
- `Accept-Encoding: gzip, deflate, br` (client capability)

## Response Format Standards

### Success Response

All successful API responses follow this standard format:

```typescript
{
  success: true,
  data: {
    // Response data varies by endpoint
    // Examples:
    // - { user: {...} }
    // - { token: "...", refreshToken: "..." }
    // - { items: [...], pagination: {...} }
  },
  timestamp: "2026-03-19T15:30:00.000Z"
}
```

#### Examples

**User Login:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-123",
      "email": "user@example.com",
      "name": "John Doe"
    },
    "token": "jwt-access-token",
    "refreshToken": "refresh-token-123",
    "expiresAt": "2026-03-19T16:30:00.000Z"
  },
  "timestamp": "2026-03-19T15:30:00.000Z"
}
```

**Paginated Response:**
```json
{
  "success": true,
  "data": {
    "items": [...],
    "pagination": {
      "page": 1,
      "per_page": 20,
      "total": 100,
      "total_pages": 5
    }
  },
  "timestamp": "2026-03-19T15:30:00.000Z"
}
```

**Simple Success (no data):**
```json
{
  "success": true,
  "timestamp": "2026-03-19T15:30:00.000Z"
}
```

### Error Response

All error responses follow this standard format:

```typescript
{
  success: false,
  error: {
    type: ErrorType,  // Use enum values, NOT 'code'
    message: string,  // Human-readable message
    details?: Record<string, unknown>,  // Additional context (optional)
    timestamp: "2026-03-19T15:30:00.000Z"
  }
}
```

#### Error Types

Use the `ErrorType` enum from `@/lib/api/error-handler`:

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

#### Examples

**Validation Error (400):**
```json
{
  "success": false,
  "error": {
    "type": "VALIDATION_ERROR",
    "message": "Email and password are required",
    "details": {
      "fields": {
        "email": "Email is required",
        "password": "Password is required"
      }
    },
    "timestamp": "2026-03-19T15:30:00.000Z"
  }
}
```

**Not Found Error (404):**
```json
{
  "success": false,
  "error": {
    "type": "NOT_FOUND",
    "message": "User not found",
    "timestamp": "2026-03-19T15:30:00.000Z"
  }
}
```

**Unauthorized Error (401):**
```json
{
  "success": false,
  "error": {
    "type": "UNAUTHORIZED",
    "message": "Invalid email or password",
    "timestamp": "2026-03-19T15:30:00.000Z"
  }
}
```

**Internal Error (500):**
```json
{
  "success": false,
  "error": {
    "type": "INTERNAL_ERROR",
    "message": "An internal error occurred",
    "details": {
      "originalMessage": "Detailed error message (development only)"
    },
    "timestamp": "2026-03-19T15:30:00.000Z"
  }
}
```

## Creating API Routes

### Basic Route Structure

```typescript
import { NextRequest } from 'next/server';
import { createSuccessResponse, createErrorResponse } from '@/lib/api/error-handler';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    // Your logic here
    const data = await doSomething();

    return createSuccessResponse(data);
  } catch (error) {
    logger.error('API error', error);
    return createErrorResponse(error instanceof Error ? error : new Error(String(error)));
  }
}
```

### Using Validation

```typescript
import { NextRequest } from 'next/server';
import { validateQuery, formatValidationErrors } from '@/lib/api/validation';
import { createValidationError, createSuccessResponse } from '@/lib/api/error-handler';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const validation = validateQuery(url.searchParams, myQuerySchema);

    if (!validation.success) {
      const errors = formatValidationErrors(validation.errors);
      return createValidationError('Invalid query parameters', { fields: errors });
    }

    const data = await getData(validation.data);
    return createSuccessResponse(data);
  } catch (error) {
    return createErrorResponse(error instanceof Error ? error : new Error(String(error)));
  }
}
```

### Using Auth Middleware

```typescript
import { NextRequest } from 'next/server';
import { withUserAuth } from '@/lib/auth/middleware';
import { createSuccessResponse, createErrorResponse } from '@/lib/api/error-handler';

export async function GET(request: NextRequest) {
  return withUserAuth(request, async (req, context) => {
    try {
      const data = await getUserData(context.userId);
      return createSuccessResponse(data);
    } catch (error) {
      return createErrorResponse(error instanceof Error ? error : new Error(String(error)));
    }
  });
}
```

## Error Handling

### Centralized Error Functions

Use the helper functions from `@/lib/api/error-handler`:

```typescript
import {
  createValidationError,
  createNotFoundError,
  createUnauthorizedError,
  createForbiddenError,
  createRateLimitError,
  createServiceUnavailableError,
  createBadRequestError,
} from '@/lib/api/error-handler';

// Usage examples
return createValidationError('Invalid input');
return createNotFoundError('Resource not found');
return createUnauthorizedError('Authentication required');
return createForbiddenError('Access denied');
return createRateLimitError('Too many requests');
return createServiceUnavailableError('Service temporarily unavailable');
return createBadRequestError('Invalid request');
```

### Custom Errors

For custom error types, use the `ApiError` class:

```typescript
import { ApiError, ErrorType } from '@/lib/api/error-handler';
import { createErrorResponse } from '@/lib/api/error-handler';

const error = new ApiError(
  ErrorType.VALIDATION,
  'Custom validation message',
  400,
  { field: 'email' }
);
return createErrorResponse(error);
```

### Error Handling Wrapper

For automatic error handling, use the `withErrorHandling` wrapper:

```typescript
import { withErrorHandling } from '@/lib/api/error-handler';
import { createSuccessResponse } from '@/lib/api/utils';

export const GET = withErrorHandling(async (request: Request) => {
  const data = await getData();
  return createSuccessResponse(data);
});
```

## Validation

### Using Zod Schemas

Define validation schemas in `@/lib/api/validation.ts`:

```typescript
import { z } from 'zod';

export const myQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(20),
  filter: z.string().optional(),
});
```

### Common Validation Schemas

Use existing schemas from `@/lib/api/validation.ts`:

```typescript
import {
  emailSchema,
  passwordSchema,
  paginationSchema,
} from '@/lib/api/validation';
```

### Using Validation Helpers

```typescript
import { validateQuery, validateBody, formatValidationErrors } from '@/lib/api/validation';

// Query parameters
const validation = validateQuery(url.searchParams, mySchema);

// Request body
const validation = validateBody(body, mySchema);

// Format errors for response
const errors = formatValidationErrors(validation.errors);
// { "field1": "error message", "field2": "error message" }
```

## Utilities

### Cookie Management

```typescript
import { setAuthCookies, clearAuthCookies } from '@/lib/api/utils';

// Set auth cookies
const response = createSuccessResponse({ token, refreshToken });
setAuthCookies(response, token, refreshToken, rememberMe);

// Clear auth cookies
const response = createSimpleSuccessResponse();
clearAuthCookies(response);
```

### Response Creation

```typescript
import {
  createSuccessResponse,
  createPaginatedSuccessResponse,
  createSimpleSuccessResponse,
} from '@/lib/api/utils';

// Standard success
return createSuccessResponse({ user, token });

// Paginated success
return createPaginatedSuccessResponse(items, { page, per_page, total });

// Simple success (no data)
return createSimpleSuccessResponse();
```

### Common Validation

```typescript
import { validateEmail, validatePasswordStrength } from '@/lib/api/utils';

// Email validation
if (!validateEmail(email)) {
  return createValidationError('Invalid email format');
}

// Password validation
const passwordCheck = validatePasswordStrength(password);
if (!passwordCheck.isValid) {
  return createWeakPasswordError(passwordCheck.errors[0]);
}
```

## Testing

### Test Structure

Create test files in `src/app/api/__tests__/` or `src/app/api/{route}/__tests__/`.

### Using Mock Helpers

```typescript
import { createMockRequest } from '@/test/mocks/api-mocks';

// Create mock request
const request = createMockRequest('http://localhost:3000/api/endpoint', {
  method: 'POST',
  body: { email: 'test@example.com' },
  headers: { authorization: 'Bearer token' },
});
```

### Example Test

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';
import { createMockRequest } from '@/test/mocks/api-mocks';

describe('/api/endpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST request', () => {
    it('should return success response', async () => {
      const request = createMockRequest('http://localhost:3000/api/endpoint', {
        method: 'POST',
        body: { email: 'test@example.com' },
      });

      const response = await POST(request as Request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      expect(data.timestamp).toBeDefined();
    });

    it('should return validation error for invalid input', async () => {
      const request = createMockRequest('http://localhost:3000/api/endpoint', {
        method: 'POST',
        body: { email: 'invalid' },
      });

      const response = await POST(request as Request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.type).toBe('VALIDATION_ERROR');
      expect(data.error.message).toContain('invalid');
      expect(data.error.timestamp).toBeDefined();
    });
  });
});
```

### Test Best Practices

1. **Always test for standard response format:**
   ```typescript
   expect(data.success).toBe(true);
   expect(data.data).toBeDefined();
   expect(data.timestamp).toBeDefined();
   ```

2. **Test error responses:**
   ```typescript
   expect(data.success).toBe(false);
   expect(data.error.type).toBe('EXPECTED_ERROR_TYPE');
   expect(data.error.message).toContain('expected message');
   expect(data.error.timestamp).toBeDefined();
   ```

3. **Mock external dependencies:**
   ```typescript
   vi.mock('@/lib/service', () => ({
     myService: vi.fn(),
   }));
   ```

4. **Clean up mocks between tests:**
   ```typescript
   beforeEach(() => {
     vi.clearAllMocks();
   });
   ```

## Common Patterns

### Pagination

```typescript
import { parsePaginationParams } from '@/lib/api/utils';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const { page, per_page } = parsePaginationParams(url);

  const { items, total } = await getItems({ page, per_page });

  return createPaginatedSuccessResponse(items, { page, per_page, total });
}
```

### Authentication Required

```typescript
import { withUserAuth } from '@/lib/auth/middleware';

export async function GET(request: NextRequest) {
  return withUserAuth(request, async (req, context) => {
    const data = await getData(context.userId);
    return createSuccessResponse(data);
  });
}
```

### File Upload (if needed)

```typescript
import { createValidationError, createSuccessResponse } from '@/lib/api/error-handler';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return createValidationError('File is required');
    }

    const result = await uploadFile(file);
    return createSuccessResponse(result);
  } catch (error) {
    return createErrorResponse(error instanceof Error ? error : new Error(String(error)));
  }
}
```

## API Routes

### Authentication

| Route | Method | Description | Auth Required |
|-------|--------|-------------|---------------|
| `/api/auth/register` | POST | Register new user | No |
| `/api/auth/login` | POST | Login user | No |
| `/api/auth/logout` | POST | Logout user | Yes |
| `/api/auth/me` | GET | Get current user | Yes |
| `/api/auth/refresh` | POST | Refresh access token | No |

### Health & Status

| Route | Method | Description | Auth Required |
|-------|--------|-------------|---------------|
| `/api/status` | GET | System status | No |
| `/api/health` | GET | Basic health check | No |
| `/api/health/live` | GET | Liveness probe | No |
| `/api/health/ready` | GET | Readiness probe | No |
| `/api/health/detailed` | GET | Detailed health | No |

### Database

| Route | Method | Description | Auth Required |
|-------|--------|-------------|---------------|
| `/api/database/health` | GET | Database health status | No |
| `/api/database/optimize` | GET | Get optimization report | No |
| `/api/database/optimize` | POST | Run optimization | No |

### Performance

| Route | Method | Description | Auth Required |
|-------|--------|-------------|---------------|
| `/api/performance/report` | GET | Performance metrics | No |

### GitHub

| Route | Method | Description | Auth Required |
|-------|--------|-------------|---------------|
| `/api/github/commits` | GET | Get repository commits | No |
| `/api/github/issues` | GET | Get repository issues | No |

### A2A

| Route | Method | Description | Auth Required |
|-------|--------|-------------|---------------|
| `/api/a2a/jsonrpc` | POST | JSON-RPC 2.0 endpoint | No |

### CSRF

| Route | Method | Description | Auth Required |
|-------|--------|-------------|---------------|
| `/api/csrf-token` | GET | Generate CSRF token | No |
| `/api/csrf-token` | POST | Validate CSRF token | No |

## Running Tests

```bash
# Run all API tests
npm test src/app/api

# Run specific test file
npm test src/app/api/auth/__tests__/auth.routes.test.ts

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage
```

## Contributing

When adding new API routes:

1. Follow the response format standards
2. Use centralized error handling
3. Add validation for all inputs
4. Include comprehensive tests
5. Document the endpoint here
6. Use TypeScript types for request/response

## Changelog

- 2026-03-19: Standardized error responses (use `error.type` instead of `error.code`)
- 2026-03-19: Added `timestamp` to all success responses
- 2026-03-19: Created shared utilities for email/password validation
- 2026-03-19: Centralized cookie management
- 2026-03-19: Added comprehensive API documentation
