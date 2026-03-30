/**
 * API Error Handler Unit Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextResponse } from 'next/server';
import {
  ApiError,
  ErrorType,
  createSuccessResponse,
  createErrorResponse,
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
  withErrorHandling,
  type ErrorResponse,
  type SuccessResponse,
} from '../error-handler';
import { logger } from '../../logger';

// Mock logger
vi.mock('../../logger', () => ({
  logger: {
    error: vi.fn(),
  },
}));

describe('API Error Handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('ApiError', () => {
    it('should create ApiError with correct properties', () => {
      const error = new ApiError(
        ErrorType.VALIDATION,
        'Invalid input',
        400,
        { field: 'email' }
      );

      expect(error.name).toBe('ApiError');
      expect(error.type).toBe(ErrorType.VALIDATION);
      expect(error.message).toBe('Invalid input');
      expect(error.statusCode).toBe(400);
      expect(error.details).toEqual({ field: 'email' });
    });
  });

  describe('createSuccessResponse', () => {
    it('should create success response with data', () => {
      const data = { id: '123', name: 'Test' };
      const response = createSuccessResponse(data);

      expect(response).toBeInstanceOf(NextResponse);

      const json = response.json() as Promise<SuccessResponse<typeof data>>;
      return expect(json).resolves.toEqual({
        success: true,
        data,
        timestamp: expect.any(String),
      });
    });

    it('should create success response with custom status', () => {
      const response = createSuccessResponse({ created: true }, 201);

      expect(response.status).toBe(201);
    });

    it('should include timestamp', async () => {
      const response = createSuccessResponse({ test: true });
      const json = await response.json() as SuccessResponse;

      expect(json.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });

  describe('createErrorResponse', () => {
    it('should create error response from ApiError', () => {
      const error = new ApiError(ErrorType.VALIDATION, 'Invalid', 400);
      const response = createErrorResponse(error);

      expect(response.status).toBe(400);
    });

    it('should create error response with all fields from ApiError', async () => {
      const error = new ApiError(
        ErrorType.VALIDATION,
        'Invalid input',
        400,
        { field: 'email' }
      );
      const response = createErrorResponse(error);
      const json = await response.json() as ErrorResponse;

      expect(json).toEqual({
        success: false,
        error: {
          type: ErrorType.VALIDATION,
          message: 'Invalid input',
          details: { field: 'email' },
          timestamp: expect.any(String),
        },
      });
    });

    it('should handle generic errors', async () => {
      const error = new Error('Something went wrong');
      const response = createErrorResponse(error);
      const json = await response.json() as ErrorResponse;

      expect(response.status).toBe(500);
      expect(json.error.type).toBe(ErrorType.INTERNAL);
      expect(json.error.message).toBe('An internal error occurred');

      expect(logger.error).toHaveBeenCalledWith(
        'API Error',
        error,
        { category: 'api' }
      );
    });

    it('should include original message in development', async () => {
      const originalNodeEnv = process.env.NODE_ENV;
      (process.env as any).NODE_ENV = 'development';

      try {
        const error = new Error('Detailed error message');
        const response = createErrorResponse(error);
        const json = await response.json() as ErrorResponse;

        expect(json.error.details).toEqual({
          originalMessage: 'Detailed error message',
        });
      } finally {
        (process.env as any).NODE_ENV = originalNodeEnv;
      }
    });

    it('should not include details in production', async () => {
      const originalNodeEnv = process.env.NODE_ENV;
      (process.env as any).NODE_ENV = 'production';

      try {
        const error = new Error('Detailed error message');
        const response = createErrorResponse(error);
        const json = await response.json() as ErrorResponse;

        expect(json.error.details).toBeUndefined();
      } finally {
        (process.env as any).NODE_ENV = originalNodeEnv;
      }
    });

    it('should use custom status code when provided', () => {
      const error = new Error('Not found');
      const response = createErrorResponse(error, 404);

      expect(response.status).toBe(404);
    });

    it('should handle non-Error objects', async () => {
      const error = new Error('String error');
      const response = createErrorResponse(error);
      const json = await response.json() as ErrorResponse;

      expect(json.error.type).toBe(ErrorType.INTERNAL);
      expect(json.error.message).toBe('An internal error occurred');
    });
  });

  describe('Validation Error', () => {
    it('should create validation error (400)', () => {
      const response = createValidationError('Invalid email format');

      expect(response.status).toBe(400);

      return expect(response.json()).resolves.toEqual({
        success: false,
        error: {
          type: ErrorType.VALIDATION,
          message: 'Invalid email format',
          timestamp: expect.any(String),
        },
      });
    });

    it('should include details in validation error', async () => {
      const response = createValidationError('Invalid', { field: 'email' });
      const json = await response.json() as ErrorResponse;

      expect(json.error.details).toEqual({ field: 'email' });
    });
  });

  describe('Not Found Error', () => {
    it('should create not found error (404)', () => {
      const response = createNotFoundError('User not found');

      expect(response.status).toBe(404);

      return expect(response.json()).resolves.toEqual({
        success: false,
        error: {
          type: ErrorType.NOT_FOUND,
          message: 'User not found',
          timestamp: expect.any(String),
        },
      });
    });
  });

  describe('Unauthorized Error', () => {
    it('should create unauthorized error (401) with default message', () => {
      const response = createUnauthorizedError();

      expect(response.status).toBe(401);

      return expect(response.json()).resolves.toEqual({
        success: false,
        error: {
          type: ErrorType.UNAUTHORIZED,
          message: 'Unauthorized access',
          timestamp: expect.any(String),
        },
      });
    });

    it('should create unauthorized error with custom message', () => {
      const response = createUnauthorizedError('Invalid token');

      return expect(response.json()).resolves.toEqual(
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'Invalid token',
          }),
        })
      );
    });
  });

  describe('Forbidden Error', () => {
    it('should create forbidden error (403) with default message', () => {
      const response = createForbiddenError();

      expect(response.status).toBe(403);
    });

    it('should create forbidden error with custom message', () => {
      const response = createForbiddenError('Access denied');
      const json = response.json() as Promise<ErrorResponse>;

      return expect(json).resolves.toEqual(
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'Access denied',
          }),
        })
      );
    });
  });

  describe('Rate Limit Error', () => {
    it('should create rate limit error (429) with default message', () => {
      const response = createRateLimitError();

      expect(response.status).toBe(429);
    });
  });

  describe('Service Unavailable Error', () => {
    it('should create service unavailable error (503) with default message', () => {
      const response = createServiceUnavailableError();

      expect(response.status).toBe(503);
    });
  });

  describe('Registration Failed Error', () => {
    it('should create registration failed error (400) with default message', () => {
      const response = createRegistrationFailedError();

      expect(response.status).toBe(400);

      return expect(response.json()).resolves.toEqual(
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'Registration failed',
          }),
        })
      );
    });

    it('should include details', async () => {
      const response = createRegistrationFailedError('Email already exists', {
        field: 'email',
      });
      const json = await response.json() as ErrorResponse;

      expect(json.error.details).toEqual({ field: 'email' });
    });
  });

  describe('Weak Password Error', () => {
    it('should create weak password error (400) with default message', () => {
      const response = createWeakPasswordError();

      expect(response.status).toBe(400);
    });
  });

  describe('Bad Request Error', () => {
    it('should create bad request error (400) with default message', () => {
      const response = createBadRequestError();

      expect(response.status).toBe(400);
    });
  });

  describe('Missing Token Error', () => {
    it('should create missing token error (401) with default message', () => {
      const response = createMissingTokenError();

      expect(response.status).toBe(401);

      return expect(response.json()).resolves.toEqual(
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'Authentication token is missing',
          }),
        })
      );
    });
  });

  describe('withErrorHandling', () => {
    it('should handle successful requests', async () => {
      const handler = withErrorHandling(async () => {
        return createSuccessResponse({ success: true });
      });

      const result = await handler();

      expect(result).toBeInstanceOf(NextResponse);
      expect(result.status).toBe(200);
    });

    it('should catch and handle errors', async () => {
      const handler = withErrorHandling(async () => {
        throw new Error('Handler error');
      });

      const result = await handler();

      expect((result as any).status).toBe(500);

      const json = await (result as NextResponse).json() as ErrorResponse;
      expect(json.success).toBe(false);
      expect(json.error.message).toBe('An internal error occurred');
    });

    it('should handle ApiError with correct status', async () => {
      const handler = withErrorHandling(async () => {
        throw new ApiError(ErrorType.NOT_FOUND, 'Resource not found', 404);
      });

      const result = await handler();

      expect((result as any).status).toBe(404);

      const json = await (result as NextResponse).json() as ErrorResponse;
      expect(json.error.type).toBe(ErrorType.NOT_FOUND);
      expect(json.error.message).toBe('Resource not found');
    });

    it('should handle non-Error throwables', async () => {
      const handler = withErrorHandling(async () => {
        throw 'String error';
      });

      const result = await handler();

      expect((result as any).status).toBe(500);

      const json = await (result as NextResponse).json() as ErrorResponse;
      expect(json.error.type).toBe(ErrorType.INTERNAL);
    });

    it('should pass through arguments', async () => {
      const handler = withErrorHandling(
        (async (arg1: string, arg2: number) => {
          return createSuccessResponse({ arg1, arg2 });
        }) as any
      ) as (arg1: string, arg2: number) => Promise<NextResponse<SuccessResponse<{ arg1: string; arg2: number }>>>;

      const result = await handler('test', 42);

      const json = await result.json() as SuccessResponse<{ arg1: string; arg2: number }>;
      expect(json.data).toEqual({ arg1: 'test', arg2: 42 });
    });
  });
});
