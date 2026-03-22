/**
 * @fileoverview API Validation Schemas
 * @description Zod schemas for request parameter validation across all API routes
 */

import { z } from 'zod';
import { createValidationError } from './error-handler';
import type { NextResponse } from 'next/server';

/**
 * Common validation schemas
 */

/**
 * Email validation schema
 */
export const emailSchema = z
  .string()
  .min(1, 'Email is required')
  .max(255, 'Email is too long')
  .email('Invalid email format');

/**
 * Password validation schema
 * Requirements:
 * - At least 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 */
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password is too long')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

/**
 * Pagination schema
 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(30),
});

/**
 * Owner and repository schema (required fields, no defaults)
 */
export const ownerRepoSchema = z.object({
  owner: z.string().min(1).max(100),
  repo: z.string().min(1).max(100),
});

/**
 * GitHub API validation schemas
 */
export const githubCommitsQuerySchema = paginationSchema
  .merge(ownerRepoSchema)
  .extend({
    sha: z.string().optional(),
    path: z.string().optional(),
    since: z.string().optional(), // Accept both date and datetime formats
    until: z.string().optional(), // Accept both date and datetime formats
  });

export const githubIssuesQuerySchema = paginationSchema
  .merge(ownerRepoSchema)
  .extend({
    state: z.enum(['open', 'closed', 'all']).default('all'),
    labels: z.string().optional(),
    sort: z.enum(['created', 'updated', 'comments']).default('created'),
    direction: z.enum(['asc', 'desc']).default('desc'),
    since: z.string().optional(), // Accept both date and datetime formats
  });

/**
 * Status API validation schemas
 */
export const statusQuerySchema = z.object({
  format: z.enum(['json', 'compact']).default('json'),
  include_metrics: z.coerce.boolean().default(true),
});

/**
 * Health API validation schemas
 */
export const healthQuerySchema = z.object({
  detailed: z.coerce.boolean().default(false),
  checks: z.string().optional(), // Comma-separated list of checks to run
});

/**
 * Database API validation schemas
 */
export const databaseActionSchema = z.object({
  action: z.enum(['stats', 'health', 'optimize', 'backup']),
});

/**
 * A2A JSON-RPC validation schemas
 */
export const jsonRpcVersionSchema = z.literal('2.0');

export const jsonRpcRequestSchema = z.object({
  jsonrpc: jsonRpcVersionSchema,
  method: z.string().min(1),
  params: z.unknown().optional(),
  id: z.union([z.string(), z.number()]).optional(),
});

export const jsonRpcBatchRequestSchema = z.array(jsonRpcRequestSchema).min(1);

export const jsonRpcResponseSchema = z.object({
  jsonrpc: jsonRpcVersionSchema,
  result: z.unknown().optional(),
  error: z.object({
    code: z.number(),
    message: z.string(),
    data: z.unknown().optional(),
  }).optional(),
  id: z.union([z.string(), z.number(), z.null()]),
});

/**
 * CSRF validation schemas
 */
export const csrfTokenSchema = z.object({
  csrfToken: z.string().length(64), // 32 bytes = 64 hex chars
});

/**
 * Response validation schemas
 */
export const successResponseSchema = <T>(dataSchema: z.ZodType<T>) =>
  z.object({
    success: z.literal(true),
    data: dataSchema,
    timestamp: z.string().datetime(),
  });

export const paginatedResponseSchema = <T>(itemSchema: z.ZodType<T>) =>
  successResponseSchema(
    z.object({
      items: z.array(itemSchema),
      pagination: z.object({
        page: z.number(),
        per_page: z.number(),
        total: z.number(),
        total_pages: z.number(),
      }),
    })
  );

/**
 * Helper functions
 */

/**
 * Validate query parameters against a schema
 */
export function validateQuery<T>(
  searchParams: URLSearchParams,
  schema: z.ZodType<T>
): { success: true; data: T } | { success: false; errors: z.ZodError } {
  const params: Record<string, string | string[]> = {};

  searchParams.forEach((value, key) => {
    const existing = params[key];
    if (existing) {
      params[key] = Array.isArray(existing)
        ? [...existing, value]
        : [existing, value];
    } else {
      params[key] = value;
    }
  });

  const result = schema.safeParse(params);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return { success: false, errors: result.error };
}

/**
 * Validate request body against a schema
 */
export function validateBody<T>(
  body: unknown,
  schema: z.ZodType<T>
): { success: true; data: T } | { success: false; errors: z.ZodError } {
  const result = schema.safeParse(body);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return { success: false, errors: result.error };
}

/**
 * Format validation errors for response
 */
export function formatValidationErrors(error: z.ZodError<unknown>): Record<string, string> {
  const errors: Record<string, string> = {};

  error.issues.forEach((err: z.ZodIssue) => {
    const path = err.path.join('.');
    errors[path] = err.message;
  });

  return errors;
}

/**
 * Create a typed API handler with validation
 */
export function withQueryValidation<T>(
  schema: z.ZodType<T>,
  handler: (validated: T, request: Request) => Promise<NextResponse>
) {
  return async (request: Request): Promise<NextResponse> => {
    const url = new URL(request.url);
    const validation = validateQuery(url.searchParams, schema);

    if (!validation.success) {
      const errors = formatValidationErrors(validation.errors);
      return createValidationError(
        'Invalid query parameters',
        { fields: errors }
      );
    }

    return handler(validation.data, request);
  };
}
