# API Refactoring Documentation

## Overview

This document describes the API refactoring performed on the 7zi-project API routes. The refactoring focuses on:

1. **Improved parameter validation** using Zod schemas
2. **Centralized error handling** with consistent error responses
3. **Better code organization** and maintainability
4. **Enhanced security** through input validation
5. **Consistent response formats** across all endpoints

## New Files Added

### 1. `/src/lib/api/error-handler.ts`

Centralized error handling module providing:

- **Error Types**: Enum of standardized error categories (VALIDATION, NOT_FOUND, UNAUTHORIZED, etc.)
- **ApiError Class**: Custom error class for structured error responses
- **Helper Functions**: Quick creation of common error responses
- **Error Response Wrapper**: Consistent error response format

**Usage Example:**

```typescript
import { createValidationError, createNotFoundError } from '@/lib/api/error-handler'

// Return validation error
return createValidationError('Invalid parameter', {
  field: 'value',
  expected: 'number',
  received: 'string',
})

// Return not found error
return createNotFoundError('Repository not found', { owner, repo })
```

### 2. `/src/lib/api/validation.ts`

Request validation module using Zod schemas:

- **Schemas**: Pre-defined validation schemas for common patterns
- **Validators**: Helper functions for query and body validation
- **Error Formatting**: Convert Zod errors to user-friendly messages

**Available Schemas:**

- `paginationSchema` - Page and per_page parameters
- `ownerRepoSchema` - GitHub owner and repo parameters
- `githubCommitsQuerySchema` - GitHub commits query parameters
- `githubIssuesQuerySchema` - GitHub issues query parameters
- `statusQuerySchema` - Status API query parameters
- `jsonRpcRequestSchema` - JSON-RPC request validation
- And more...

**Usage Example:**

```typescript
import {
  githubCommitsQuerySchema,
  validateQuery,
  formatValidationErrors,
} from '@/lib/api/validation'

// Validate query parameters
const url = new URL(request.url)
const validation = validateQuery(url.searchParams, githubCommitsQuerySchema)

if (!validation.success) {
  const errors = formatValidationErrors(validation.errors)
  return createValidationError('Invalid query parameters', { fields: errors })
}

const { owner, repo, per_page, page } = validation.data
```

## Refactored Routes

### 1. `/api/github/commits`

**Changes:**

- Added Zod schema validation for query parameters
- Improved error handling with specific GitHub error responses
- Consistent success/error response format
- Better type safety with TypeScript interfaces

**New Features:**

- Validates `page`, `per_page`, `owner`, `repo` parameters
- Handles GitHub API rate limits with informative messages
- Filters pull requests automatically
- Returns pagination metadata

**Example Response:**

```json
{
  "success": true,
  "data": [
    {
      "sha": "abc123...",
      "commit": {
        "author": {
          "name": "John Doe",
          "email": "john@example.com",
          "date": "2026-03-18T10:00:00Z"
        },
        "message": "Fix bug"
      },
      "html_url": "https://github.com/..."
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 30,
    "total": 0
  },
  "timestamp": "2026-03-18T10:00:00Z"
}
```

### 2. `/api/github/issues`

**Changes:**

- Added Zod schema validation for query parameters
- Improved error handling for GitHub API responses
- Better filtering of pull requests
- Consistent response format

**New Features:**

- Validates `state`, `labels`, `sort`, `direction` parameters
- Handles rate limits with reset time information
- Automatically filters out pull requests
- Returns pagination metadata

### 3. `/api/status`

**Changes:**

- Added query parameter validation
- Support for `format` parameter (json/compact)
- Support for `include_metrics` parameter
- Improved type safety

**New Features:**

- `format=json` returns full status data
- `format=compact` returns minimal status data
- `include_metrics` controls whether to include performance metrics
- Consistent response structure

**Query Parameters:**

- `format` - Response format: `json` (default) or `compact`
- `include_metrics` - Include metrics: `true` (default) or `false`

### 4. `/api/csrf-token`

**Changes:**

- Added POST endpoint for token validation
- Better error handling
- Consistent response format
- Type-safe interfaces

**New Features:**

- GET: Generate new CSRF token
- POST: Validate existing CSRF token (double-submit pattern)
- Returns token expiration timestamp
- Better cookie handling

**Example Response:**

```json
{
  "success": true,
  "data": {
    "csrfToken": "a1b2c3d4...",
    "expiresAt": "2026-03-18T11:00:00Z"
  },
  "timestamp": "2026-03-18T10:00:00Z"
}
```

### 5. `/api/database/health`

**Changes:**

- Added body validation for POST requests
- Better error handling for database operations
- Consistent response format
- Improved error messages

**New Features:**

- GET: Returns database health report
- POST: Supports multiple actions (`stats`, `health`, `optimize`, `backup`)
- Handles database connection errors gracefully
- Provides informative error messages for permission issues

**POST Body Format:**

```json
{
  "action": "optimize"
}
```

### 6. `/api/a2a/jsonrpc`

**Changes:**

- Added JSON-RPC request validation
- Improved batch request handling
- Better error messages for validation failures
- Consistent error response format

**New Features:**

- Validates JSON-RPC 2.0 request structure
- Handles batch requests with proper validation
- Returns appropriate HTTP status codes based on JSON-RPC errors
- Improved CORS headers

## Response Format

All refactored APIs follow a consistent response format:

### Success Response

```typescript
{
  success: true;
  data: T; // API-specific data
  message?: string; // Optional success message
  timestamp: string; // ISO 8601 timestamp
}
```

### Error Response

```typescript
{
  success: false;
  error: {
    type: ErrorType; // Error category
    message: string; // Human-readable error message
    details?: Record<string, unknown>; // Additional error details
    timestamp: string; // ISO 8601 timestamp
  };
}
```

## Error Types

The following error types are defined:

- `VALIDATION_ERROR` - Invalid input parameters
- `NOT_FOUND` - Resource not found
- `UNAUTHORIZED` - Authentication required or failed
- `FORBIDDEN` - Insufficient permissions
- `RATE_LIMIT_EXCEEDED` - Rate limit reached
- `INTERNAL_ERROR` - Server-side error
- `BAD_REQUEST` - Malformed request
- `SERVICE_UNAVAILABLE` - Service temporarily unavailable

## HTTP Status Codes

- `200 OK` - Successful request
- `204 No Content` - Successful request with no content
- `400 Bad Request` - Invalid request parameters
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error
- `503 Service Unavailable` - Service temporarily unavailable

## Testing

The refactored routes maintain backward compatibility with existing tests. Update tests to:

1. Expect new response format with `success` field
2. Update error assertions to match new error structure
3. Add tests for validation errors
4. Add tests for new query parameters

Example test update:

```typescript
// Old
expect(response.status).toBe(200)
const data = await response.json()
expect(data).toHaveProperty('services')

// New
expect(response.status).toBe(200)
const data = await response.json()
expect(data.success).toBe(true)
expect(data.data).toHaveProperty('services')
expect(data.timestamp).toBeDefined()
```

## Migration Guide

### For API Consumers

1. **Update response parsing** - Check for `success` field first
2. **Handle error responses** - Use new error structure
3. **Add query parameters** - Take advantage of new filtering options
4. **Handle rate limits** - New informative rate limit messages

### Example Migration

**Old Code:**

```typescript
const response = await fetch('/api/github/commits?per_page=50')
const commits = await response.json()
```

**New Code:**

```typescript
const response = await fetch('/api/github/commits?per_page=50&page=1')
const result = await response.json()

if (result.success) {
  const { data, pagination, timestamp } = result
  console.log(`Fetched ${data.length} commits at ${timestamp}`)
} else {
  const { error } = result
  console.error(`Error (${error.type}): ${error.message}`)
}
```

## Benefits

1. **Type Safety**: Strong TypeScript typing throughout
2. **Validation**: Runtime validation prevents invalid data
3. **Consistency**: Uniform response format across all endpoints
4. **Error Handling**: Better error messages and categorization
5. **Maintainability**: Centralized error handling and validation
6. **Security**: Input validation prevents injection attacks
7. **Documentation**: Clear schemas serve as API documentation

## Future Enhancements

1. **OpenAPI/Swagger Generation**: Auto-generate API docs from Zod schemas
2. **Request Logging**: Add structured logging for all API requests
3. **Rate Limiting**: Implement per-IP rate limiting
4. **Caching**: Add response caching for frequently accessed endpoints
5. **Metrics**: Add Prometheus metrics for monitoring

## Dependencies

- **zod**: Schema validation library
- **next/server**: Next.js server utilities
- **crypto**: CSRF token generation (Node.js built-in)

## Contributing

When adding new API routes:

1. Define Zod schema in `/src/lib/api/validation.ts`
2. Use error handlers from `/src/lib/api/error-handler.ts`
3. Follow the consistent response format
4. Add TypeScript interfaces for request/response
5. Include validation for all inputs
6. Handle errors appropriately
7. Update this documentation

## Questions?

For questions or issues with the refactored APIs, please refer to:

- This documentation file
- The individual route files in `/src/app/api/`
- The error handler documentation in `/src/lib/api/error-handler.ts`
- The validation schema documentation in `/src/lib/api/validation.ts`
