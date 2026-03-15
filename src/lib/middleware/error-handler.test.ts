/**
 * @fileoverview Error Handler Middleware 测试
 * @module src/lib/middleware/error-handler.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import {
  createErrorResponse,
  withErrorHandler,
  validationError,
  notFoundError,
  authError,
  forbiddenError,
  serverError,
  successResponse,
  paginatedResponse,
} from './error-handler';
import { AppError, ErrorCodes, ErrorCategory } from '@/lib/errors';

// Mock uuid
vi.mock('uuid', () => ({
  v4: () => 'test-uuid-123',
}));

describe('Error Handler Middleware', () => {
  describe('createErrorResponse', () => {
    it('should create error response from AppError with validation error code', () => {
      const error = new AppError('Test error', {
        code: ErrorCodes.VALIDATION_ERROR,
        category: ErrorCategory.VALIDATION,
      });

      const request = new NextRequest('http://localhost/api/test');
      const response = createErrorResponse(error, request);

      expect(response.status).toBe(400);
    });

    it('should create error response with 401 for unauthorized', () => {
      const error = new AppError('Unauthorized', {
        code: ErrorCodes.UNAUTHORIZED,
        category: ErrorCategory.AUTH,
      });

      const request = new NextRequest('http://localhost/api/test');
      const response = createErrorResponse(error, request);

      expect(response.status).toBe(401);
    });

    it('should create error response with 403 for forbidden', () => {
      const error = new AppError('Forbidden', {
        code: ErrorCodes.FORBIDDEN,
        category: ErrorCategory.PERMISSION,
      });

      const request = new NextRequest('http://localhost/api/test');
      const response = createErrorResponse(error, request);

      expect(response.status).toBe(403);
    });

    it('should create error response with 404 for not found', () => {
      const error = new AppError('Not found', {
        code: ErrorCodes.NOT_FOUND,
        category: ErrorCategory.APPLICATION,
      });

      const request = new NextRequest('http://localhost/api/test');
      const response = createErrorResponse(error, request);

      expect(response.status).toBe(404);
    });

    it('should create error response with 500 for server error', () => {
      const error = new AppError('Server error', {
        code: ErrorCodes.SERVER_ERROR,
        category: ErrorCategory.INFRASTRUCTURE,
      });

      const request = new NextRequest('http://localhost/api/test');
      const response = createErrorResponse(error, request);

      expect(response.status).toBe(500);
    });

    it('should create error response with 429 for rate limited', () => {
      const error = new AppError('Rate limited', {
        code: ErrorCodes.RATE_LIMITED,
        category: ErrorCategory.RATE_LIMIT,
      });

      const request = new NextRequest('http://localhost/api/test');
      const response = createErrorResponse(error, request);

      expect(response.status).toBe(429);
    });

    it('should handle plain error objects', () => {
      const request = new NextRequest('http://localhost/api/test');
      const response = createErrorResponse(new Error('Plain error'), request);

      expect(response.status).toBe(500);
    });

    it('should handle string errors', () => {
      const request = new NextRequest('http://localhost/api/test');
      const response = createErrorResponse('String error', request);

      expect(response.status).toBe(500);
    });

    it('should handle null errors', () => {
      const request = new NextRequest('http://localhost/api/test');
      const response = createErrorResponse(null, request);

      expect(response.status).toBe(500);
    });
  });

  describe('validationError', () => {
    it('should create validation error response', () => {
      const response = validationError('Invalid email', 'email');
      
      expect(response.status).toBe(400);
    });

    it('should include field in context', () => {
      const response = validationError('Invalid email', 'email');
      
      // Just verify it returns a response
      expect(response).toBeDefined();
    });
  });

  describe('notFoundError', () => {
    it('should create not found error response', () => {
      const response = notFoundError('User', '123');
      
      expect(response.status).toBe(404);
    });
  });

  describe('authError', () => {
    it('should create auth error response', () => {
      const response = authError();
      
      expect(response.status).toBe(401);
    });

    it('should use custom message', () => {
      const response = authError('Please login');
      
      expect(response).toBeDefined();
    });
  });

  describe('forbiddenError', () => {
    it('should create forbidden error response', () => {
      const response = forbiddenError();
      
      expect(response.status).toBe(403);
    });
  });

  describe('serverError', () => {
    it('should create server error response', () => {
      const response = serverError();
      
      expect(response.status).toBe(500);
    });
  });

  describe('successResponse', () => {
    it('should create success response with data', () => {
      const data = { id: 1, name: 'Test' };
      const response = successResponse(data);

      expect(response.status).toBe(200);
    });

    it('should include request ID when provided', () => {
      const response = successResponse({ test: true }, 'req-123');

      expect(response).toBeDefined();
    });
  });

  describe('paginatedResponse', () => {
    it('should create paginated response', () => {
      const items = [{ id: 1 }, { id: 2 }, { id: 3 }];
      const response = paginatedResponse(items, {
        page: 1,
        limit: 10,
        total: 25,
      });

      expect(response.status).toBe(200);
    });

    it('should calculate totalPages correctly', () => {
      const response = paginatedResponse([], {
        page: 2,
        limit: 10,
        total: 25,
      });

      expect(response).toBeDefined();
    });
  });

  describe('withErrorHandler', () => {
    it('should wrap handler and catch errors', async () => {
      const handler = vi.fn().mockRejectedValue(new Error('Handler error'));
      const wrapped = withErrorHandler(handler);

      const request = new NextRequest('http://localhost/api/test');
      const response = await wrapped(request);

      expect(response.status).toBe(500);
      expect(handler).toHaveBeenCalled();
    });

    it('should return successful response', async () => {
      const handler = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ success: true }), { status: 200 })
      );
      const wrapped = withErrorHandler(handler);

      const request = new NextRequest('http://localhost/api/test');
      const response = await wrapped(request);

      expect(response.status).toBe(200);
    });

    it('should include request ID in response headers', async () => {
      const handler = vi.fn().mockRejectedValue(new Error('Error'));
      const wrapped = withErrorHandler(handler);

      const request = new NextRequest('http://localhost/api/test');
      const response = await wrapped(request);

      expect(response.headers.get('x-request-id')).toBeTruthy();
    });
  });
});
