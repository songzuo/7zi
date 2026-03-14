/**
 * 测试 src/lib/api/errors.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  ErrorCode,
  ApiError,
  createErrorResponse,
  withErrorHandler,
  generateRequestId,
  ApiErrors,
} from './errors';
import type { NextRequest } from 'next/server';

// Mock NextResponse
vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((data, options) => ({
      json: data,
      status: options?.status || 200,
    })),
  },
}));

// Mock logger
vi.mock('@/lib/logger', () => ({
  apiLogger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('api/errors', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('ErrorCode enum', () => {
    it('should have all required error codes', () => {
      expect(ErrorCode.UNKNOWN_ERROR).toBe('UNKNOWN_ERROR');
      expect(ErrorCode.INVALID_REQUEST).toBe('INVALID_REQUEST');
      expect(ErrorCode.VALIDATION_ERROR).toBe('VALIDATION_ERROR');
      expect(ErrorCode.UNAUTHORIZED).toBe('UNAUTHORIZED');
      expect(ErrorCode.INVALID_TOKEN).toBe('INVALID_TOKEN');
      expect(ErrorCode.TOKEN_EXPIRED).toBe('TOKEN_EXPIRED');
      expect(ErrorCode.FORBIDDEN).toBe('FORBIDDEN');
      expect(ErrorCode.NOT_FOUND).toBe('NOT_FOUND');
      expect(ErrorCode.ALREADY_EXISTS).toBe('ALREADY_EXISTS');
      expect(ErrorCode.INVALID_STATUS).toBe('INVALID_STATUS');
      expect(ErrorCode.INVALID_OPERATION).toBe('INVALID_OPERATION');
      expect(ErrorCode.INTERNAL_ERROR).toBe('INTERNAL_ERROR');
      expect(ErrorCode.DATABASE_ERROR).toBe('DATABASE_ERROR');
      expect(ErrorCode.EXTERNAL_SERVICE_ERROR).toBe('EXTERNAL_SERVICE_ERROR');
    });
  });

  describe('ApiError class', () => {
    it('should create an ApiError with code and message', () => {
      const error = new ApiError(ErrorCode.NOT_FOUND, 'Resource not found');
      
      expect(error).toBeInstanceOf(Error);
      expect(error.code).toBe(ErrorCode.NOT_FOUND);
      expect(error.message).toBe('Resource not found');
      expect(error.name).toBe('ApiError');
    });

    it('should create an ApiError with details', () => {
      const details = { field: 'email', reason: 'invalid format' };
      const error = new ApiError(ErrorCode.VALIDATION_ERROR, 'Invalid input', details);
      
      expect(error.details).toEqual(details);
    });

    it('should create a response with correct structure', async () => {
      const error = new ApiError(ErrorCode.NOT_FOUND, 'Not found');
      const response = error.toResponse('req-123') as { json: Record<string, unknown>; status: number };
      
      expect(response.status).toBe(404);
      expect(response.json.error.code).toBe(ErrorCode.NOT_FOUND);
      expect(response.json.error.message).toBe('Not found');
      expect(response.json.error.requestId).toBe('req-123');
      expect(response.json.error.timestamp).toBeDefined();
    });
  });

  describe('createErrorResponse', () => {
    it('should create error response with correct status', async () => {
      const response = createErrorResponse(
        ErrorCode.UNAUTHORIZED,
        'Unauthorized access'
      ) as { json: Record<string, unknown>; status: number };
      
      expect(response.status).toBe(401);
      expect(response.json.error.code).toBe(ErrorCode.UNAUTHORIZED);
      expect(response.json.error.message).toBe('Unauthorized access');
    });

    it('should include details when provided', async () => {
      const details = { userId: 'user-123' };
      const response = createErrorResponse(
        ErrorCode.FORBIDDEN,
        'Access denied',
        details
      ) as { json: Record<string, unknown>; status: number };
      
      expect(response.json.error.details).toEqual(details);
    });

    it('should include requestId when provided', async () => {
      const response = createErrorResponse(
        ErrorCode.INTERNAL_ERROR,
        'Server error',
        undefined,
        'req-456'
      ) as { json: Record<string, unknown>; status: number };
      
      expect(response.json.error.requestId).toBe('req-456');
    });

    it('should map error codes to correct HTTP status', async () => {
      const testCases = [
        { code: ErrorCode.INVALID_REQUEST, expectedStatus: 400 },
        { code: ErrorCode.VALIDATION_ERROR, expectedStatus: 400 },
        { code: ErrorCode.UNAUTHORIZED, expectedStatus: 401 },
        { code: ErrorCode.INVALID_TOKEN, expectedStatus: 401 },
        { code: ErrorCode.TOKEN_EXPIRED, expectedStatus: 401 },
        { code: ErrorCode.FORBIDDEN, expectedStatus: 403 },
        { code: ErrorCode.NOT_FOUND, expectedStatus: 404 },
        { code: ErrorCode.ALREADY_EXISTS, expectedStatus: 409 },
        { code: ErrorCode.INTERNAL_ERROR, expectedStatus: 500 },
        { code: ErrorCode.DATABASE_ERROR, expectedStatus: 500 },
        { code: ErrorCode.EXTERNAL_SERVICE_ERROR, expectedStatus: 502 },
      ];

      for (const { code, expectedStatus } of testCases) {
        const response = createErrorResponse(code, 'Test') as { json: Record<string, unknown>; status: number };
        expect(response.status).toBe(expectedStatus);
      }
    });
  });

  describe('generateRequestId', () => {
    it('should generate unique request IDs', () => {
      const id1 = generateRequestId();
      const id2 = generateRequestId();
      
      expect(id1).not.toBe(id2);
    });

    it('should have correct format', () => {
      const id = generateRequestId();
      expect(id).toMatch(/^req_\d+_[a-z0-9]+$/);
    });
  });

  describe('ApiErrors factory', () => {
    it('should create unauthorized error', () => {
      const error = ApiErrors.unauthorized();
      expect(error.code).toBe(ErrorCode.UNAUTHORIZED);
      expect(error.message).toBe('Authentication required');
    });

    it('should create unauthorized error with custom message', () => {
      const error = ApiErrors.unauthorized('Please log in');
      expect(error.message).toBe('Please log in');
    });

    it('should create forbidden error', () => {
      const error = ApiErrors.forbidden();
      expect(error.code).toBe(ErrorCode.FORBIDDEN);
      expect(error.message).toBe('Access denied');
    });

    it('should create not found error', () => {
      const error = ApiErrors.notFound('User');
      expect(error.code).toBe(ErrorCode.NOT_FOUND);
      expect(error.message).toBe('User not found');
    });

    it('should create invalid token error', () => {
      const error = ApiErrors.invalidToken();
      expect(error.code).toBe(ErrorCode.INVALID_TOKEN);
    });

    it('should create validation error with details', () => {
      const details = { fields: ['email', 'password'] };
      const error = ApiErrors.validationError('Invalid fields', details);
      expect(error.code).toBe(ErrorCode.VALIDATION_ERROR);
      expect(error.details).toEqual(details);
    });

    it('should create invalid request error', () => {
      const error = ApiErrors.invalidRequest('Bad request');
      expect(error.code).toBe(ErrorCode.INVALID_REQUEST);
    });

    it('should create internal error', () => {
      const error = ApiErrors.internalError();
      expect(error.code).toBe(ErrorCode.INTERNAL_ERROR);
      expect(error.message).toBe('Internal server error');
    });

    it('should create internal error with custom message', () => {
      const error = ApiErrors.internalError('Something went wrong');
      expect(error.message).toBe('Something went wrong');
    });
  });

  describe('withErrorHandler', () => {
    it('should return handler result on success', async () => {
      const mockHandler = vi.fn().mockResolvedValue({ success: true } as unknown as Response);
      const result = await withErrorHandler(mockHandler);
      expect(result).toEqual({ success: true });
    });

    it('should handle ApiError', async () => {
      const mockHandler = vi.fn().mockRejectedValue(
        new ApiError(ErrorCode.NOT_FOUND, 'Not found')
      );
      
      const result = await withErrorHandler(mockHandler) as { json: Record<string, unknown>; status: number };
      expect(result.status).toBe(404);
      expect(result.json.error.code).toBe(ErrorCode.NOT_FOUND);
    });

    it('should handle generic Error', async () => {
      const mockHandler = vi.fn().mockRejectedValue(new Error('Something went wrong'));
      
      const result = await withErrorHandler(mockHandler) as { json: Record<string, unknown>; status: number };
      expect(result.status).toBe(500);
      expect(result.json.error.code).toBe(ErrorCode.INTERNAL_ERROR);
    });

    it('should handle non-Error throws', async () => {
      const mockHandler = vi.fn().mockRejectedValue('string error');
      
      const result = await withErrorHandler(mockHandler) as { json: Record<string, unknown>; status: number };
      expect(result.status).toBe(500);
      expect(result.json.error.message).toBe('An unexpected error occurred');
    });
  });
});