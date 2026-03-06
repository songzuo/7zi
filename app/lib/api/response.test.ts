/**
 * API 响应格式测试
 */

import { describe, it, expect } from 'vitest';
import { ApiResponse, ApiError, HttpStatus } from './response';

describe('ApiResponse', () => {
  describe('success responses', () => {
    it('should create success response', () => {
      const response = ApiResponse.success({ message: 'Hello' });

      expect(response.status).toBe(200);

      // 检查是否是 Response 对象
      expect(response).toBeInstanceOf(Response);
    });

    it('should create created response (201)', () => {
      const response = ApiResponse.created({ id: 1 });

      expect(response.status).toBe(201);
    });

    it('should create no content response (204)', () => {
      const response = ApiResponse.noContent();

      expect(response.status).toBe(204);
    });

    it('should create paginated response', () => {
      const items = [{ id: 1 }, { id: 2 }];
      const response = ApiResponse.paginated(items, 1, 10, 25);

      expect(response.status).toBe(200);
    });
  });

  describe('error responses', () => {
    it('should create generic error', () => {
      const response = ApiResponse.error('TEST_ERROR', 'Test error message', 500);

      expect(response.status).toBe(500);
    });

    it('should create bad request (400)', () => {
      const response = ApiResponse.badRequest('Invalid input');

      expect(response.status).toBe(400);
    });

    it('should create unauthorized (401)', () => {
      const response = ApiResponse.unauthorized();

      expect(response.status).toBe(401);
    });

    it('should create forbidden (403)', () => {
      const response = ApiResponse.forbidden();

      expect(response.status).toBe(403);
    });

    it('should create not found (404)', () => {
      const response = ApiResponse.notFound('User not found');

      expect(response.status).toBe(404);
    });

    it('should create conflict (409)', () => {
      const response = ApiResponse.conflict('Email already exists');

      expect(response.status).toBe(409);
    });

    it('should create validation error (422)', () => {
      const errors = {
        email: ['Invalid email format'],
        password: ['Too short'],
      };

      const response = ApiResponse.validationError(errors);

      expect(response.status).toBe(422);
    });

    it('should create rate limited (429)', () => {
      const response = ApiResponse.rateLimited(60);

      expect(response.status).toBe(429);
      expect(response.headers.get('Retry-After')).toBe('60');
    });

    it('should create internal error (500)', () => {
      const response = ApiResponse.internalError();

      expect(response.status).toBe(500);
    });
  });
});

describe('ApiError', () => {
  it('should create ApiError instance', () => {
    const error = new ApiError('TEST', 'Test error', 400);

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('ApiError');
    expect(error.code).toBe('TEST');
    expect(error.message).toBe('Test error');
    expect(error.status).toBe(400);
  });

  it('should create bad request error', () => {
    const error = ApiError.badRequest('Invalid data');

    expect(error.code).toBe('BAD_REQUEST');
    expect(error.status).toBe(400);
  });

  it('should create unauthorized error', () => {
    const error = ApiError.unauthorized();

    expect(error.code).toBe('UNAUTHORIZED');
    expect(error.status).toBe(401);
  });

  it('should create forbidden error', () => {
    const error = ApiError.forbidden();

    expect(error.code).toBe('FORBIDDEN');
    expect(error.status).toBe(403);
  });

  it('should create not found error', () => {
    const error = ApiError.notFound('Resource');

    expect(error.code).toBe('NOT_FOUND');
    expect(error.status).toBe(404);
  });

  it('should create conflict error', () => {
    const error = ApiError.conflict('Duplicate');

    expect(error.code).toBe('CONFLICT');
    expect(error.status).toBe(409);
  });

  it('should create validation error', () => {
    const error = ApiError.validationError({ field: ['error'] });

    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.status).toBe(422);
    expect(error.details).toEqual({ field: ['error'] });
  });
});

describe('HttpStatus', () => {
  it('should have correct status codes', () => {
    expect(HttpStatus.OK).toBe(200);
    expect(HttpStatus.CREATED).toBe(201);
    expect(HttpStatus.NO_CONTENT).toBe(204);
    expect(HttpStatus.BAD_REQUEST).toBe(400);
    expect(HttpStatus.UNAUTHORIZED).toBe(401);
    expect(HttpStatus.FORBIDDEN).toBe(403);
    expect(HttpStatus.NOT_FOUND).toBe(404);
    expect(HttpStatus.CONFLICT).toBe(409);
    expect(HttpStatus.UNPROCESSABLE_ENTITY).toBe(422);
    expect(HttpStatus.TOO_MANY_REQUESTS).toBe(429);
    expect(HttpStatus.INTERNAL_SERVER_ERROR).toBe(500);
    expect(HttpStatus.BAD_GATEWAY).toBe(502);
    expect(HttpStatus.SERVICE_UNAVAILABLE).toBe(503);
  });
});