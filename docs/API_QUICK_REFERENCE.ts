/**
 * API Refactoring - Quick Reference Guide
 *
 * @fileoverview Quick reference for developers using the refactored API
 */

// ============================================================================
// IMPORTS
// ============================================================================

// Error handling
import {
  createValidationError,
  createNotFoundError,
  createUnauthorizedError,
  createForbiddenError,
  createRateLimitError,
  createServiceUnavailableError,
  createErrorResponse,
  withErrorHandling,
  ApiError,
  ErrorType,
} from '@/lib/api/error-handler';

// Validation
import {
  validateQuery,
  validateBody,
  formatValidationErrors,
  paginationSchema,
  ownerRepoSchema,
  githubCommitsQuerySchema,
  githubIssuesQuerySchema,
  statusQuerySchema,
  jsonRpcRequestSchema,
  csrfTokenSchema,
} from '@/lib/api/validation';

// ============================================================================
// QUICK PATTERNS
// ============================================================================

// -----------------------------------------------------------------------------
// Pattern 1: Validating Query Parameters
// -----------------------------------------------------------------------------

export async function GET_Example(request: Request) {
  // 1. Parse URL
  const url = new URL(request.url);

  // 2. Validate query parameters
  const validation = validateQuery(url.searchParams, someSchema);

  // 3. Handle validation errors
  if (!validation.success) {
    const errors = formatValidationErrors(validation.errors);
    return createValidationError('Invalid query parameters', { fields: errors });
  }

  // 4. Use validated data
  const { param1, param2 } = validation.data;

  // 5. Return success response
  return NextResponse.json({
    success: true,
    data: { /* your data */ },
    timestamp: new Date().toISOString(),
  });
}

// -----------------------------------------------------------------------------
// Pattern 2: Validating Request Body
// -----------------------------------------------------------------------------

export async function POST_Example(request: Request) {
  // 1. Parse body
  const body = await request.json();

  // 2. Validate body
  const validation = validateBody(body, someBodySchema);

  // 3. Handle validation errors
  if (!validation.success) {
    return createValidationError('Invalid request body', {
      errors: formatValidationErrors(validation.errors),
    });
  }

  // 4. Use validated data
  const { field1, field2 } = validation.data;

  // 5. Return success response
  return NextResponse.json({
    success: true,
    data: { /* your data */ },
    timestamp: new Date().toISOString(),
  });
}

// -----------------------------------------------------------------------------
// Pattern 3: Error Handling with Try-Catch
// -----------------------------------------------------------------------------

export async function GET_WithErrorHandling(request: Request) {
  try {
    // Your logic here
    const result = await someOperation();

    return NextResponse.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    // Centralized error handling
    return createErrorResponse(error instanceof Error ? error : new Error(String(error)));
  }
}

// -----------------------------------------------------------------------------
// Pattern 4: Specific Error Responses
// -----------------------------------------------------------------------------

export async function GET_SpecificErrors(request: Request) {
  // Resource not found
  if (!resourceExists) {
    return createNotFoundError('Resource not found', { id: '123' });
  }

  // Unauthorized
  if (!isAuthenticated) {
    return createUnauthorizedError('Invalid or expired token');
  }

  // Forbidden
  if (!hasPermission) {
    return createForbiddenError('Insufficient permissions');
  }

  // Rate limited
  if (isRateLimited) {
    return createRateLimitError('Too many requests. Try again later.');
  }

  // Service unavailable
  if (serviceDown) {
    return createServiceUnavailableError('Service temporarily unavailable');
  }

  return NextResponse.json({
    success: true,
    data: { /* data */ },
    timestamp: new Date().toISOString(),
  });
}

// -----------------------------------------------------------------------------
// Pattern 5: Using withErrorHandling Wrapper
// -----------------------------------------------------------------------------

const safeHandler = withErrorHandling(async (request: Request) => {
  // This is automatically wrapped in try-catch
  const result = await someOperation();

  return NextResponse.json({
    success: true,
    data: result,
    timestamp: new Date().toISOString(),
  });
});

export { safeHandler as GET };

// ============================================================================
// CUSTOM SCHEMAS
// ============================================================================

// Create your own schema
import { z } from 'zod';

export const customSchema = z.object({
  stringField: z.string().min(1).max(100),
  numberField: z.coerce.number().int().min(0).max(1000),
  optionalField: z.string().optional(),
  enumField: z.enum(['option1', 'option2', 'option3']),
  booleanField: z.coerce.boolean().default(false),
});

// ============================================================================
// RESPONSE FORMATS
// ============================================================================

// Success response
{
  success: true;
  data: {
    // Your data here
  };
  message?: string;
  timestamp: '2026-03-18T10:00:00.000Z';
}

// Error response
{
  success: false;
  error: {
    type: 'VALIDATION_ERROR' | 'NOT_FOUND' | 'UNAUTHORIZED' | 'FORBIDDEN' |
           'RATE_LIMIT_EXCEEDED' | 'INTERNAL_ERROR' | 'BAD_REQUEST' |
           'SERVICE_UNAVAILABLE';
    message: 'Human-readable error message';
    details?: {
      // Additional error context
    };
    timestamp: '2026-03-18T10:00:00.000Z';
  };
}

// ============================================================================
// HTTP STATUS CODES
// ============================================================================

// 200 OK - Successful GET/PUT/PATCH/DELETE
// 204 No Content - Successful DELETE with no body
// 400 Bad Request - Validation errors
// 401 Unauthorized - Authentication required
// 403 Forbidden - Insufficient permissions
// 404 Not Found - Resource not found
// 429 Too Many Requests - Rate limit exceeded
// 500 Internal Server Error - Server error
// 503 Service Unavailable - Service down

// ============================================================================
// ERROR TYPES REFERENCE
// ============================================================================

// VALIDATION_ERROR (400)
// Use when: Input validation fails
// Example: createValidationError('Invalid email format')

// NOT_FOUND (404)
// Use when: Resource doesn't exist
// Example: createNotFoundError('User not found', { userId: '123' })

// UNAUTHORIZED (401)
// Use when: Authentication failed
// Example: createUnauthorizedError('Invalid token')

// FORBIDDEN (403)
// Use when: Permission denied
// Example: createForbiddenError('Admin access required')

// RATE_LIMIT_EXCEEDED (429)
// Use when: Too many requests
// Example: createRateLimitError('Rate limit: 100 req/min')

// INTERNAL_ERROR (500)
// Use when: Unexpected server error
// Example: createErrorResponse(error) // automatic

// BAD_REQUEST (400)
// Use when: Malformed request
// Example: createErrorResponse(new ApiError(ErrorType.BAD_REQUEST, '...'))

// SERVICE_UNAVAILABLE (503)
// Use when: Service temporarily down
// Example: createServiceUnavailableError('Database maintenance')

// ============================================================================
// VALIDATION EXAMPLES
// ============================================================================

// Pagination
const pagination = paginationSchema.parse({
  page: '1',        // coerced to number
  per_page: '20',   // coerced to number
});

// GitHub API
const githubParams = githubCommitsQuerySchema.parse({
  owner: 'songzhuo',
  repo: 'openclaw-workspace',
  page: 1,
  per_page: 30,
});

// Status API
const statusParams = statusQuerySchema.parse({
  format: 'json',
  include_metrics: 'true',  // coerced to boolean
});

// ============================================================================
// TESTING EXAMPLES
// ============================================================================

import { describe, it, expect } from 'vitest';

describe('API Route', () => {
  it('should return success response', async () => {
    const response = await GET(new Request('http://localhost/api/endpoint'));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toBeDefined();
    expect(data.timestamp).toBeDefined();
  });

  it('should return validation error', async () => {
    const response = await GET(new Request('http://localhost/api/endpoint?invalid=123'));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error.type).toBe('VALIDATION_ERROR');
    expect(data.error.message).toBeDefined();
  });

  it('should return not found error', async () => {
    const response = await GET(new Request('http://localhost/api/endpoint?id=999'));
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.success).toBe(false);
    expect(data.error.type).toBe('NOT_FOUND');
  });
});

// ============================================================================
// MIGRATION CHECKLIST
// ============================================================================

// Client-Side Migration:
// ☐ Update response parsing to check 'success' field
// ☐ Handle new error format with 'error.type' and 'error.message'
// ☐ Add error type switch for different error scenarios
// ☐ Update pagination to use new 'pagination' object
// ☐ Add timestamp handling for response freshness
// ☐ Update error UI to display user-friendly messages
// ☐ Add retry logic for rate limit errors (429)
// ☐ Update authentication flow for 401 errors

// Server-Side Migration:
// ☐ Import error handlers from '@/lib/api/error-handler'
// ☐ Import validation schemas from '@/lib/api/validation'
// ☐ Add validation for all query parameters
// ☐ Add validation for request bodies
// ☐ Update error returns to use error handlers
// ☐ Update success responses to include 'success: true'
// ☐ Add timestamp to all responses
// ☐ Update type definitions
// ☐ Add tests for validation errors
// ☐ Add tests for error scenarios

export default {}; // This file is for documentation only
