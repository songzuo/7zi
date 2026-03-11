/**
 * 测试 src/lib/errors/index.ts
 */

import { describe, it, expect } from 'vitest';
import {
  AppError,
  ErrorCategory,
  ErrorSeverity,
  ErrorCodes,
  createNetworkError,
  createApiError,
  createValidationError,
  createAuthError,
  createNotFoundError,
  createDatabaseError,
  formatErrorMessage,
  getUserFriendlyMessage,
  isNetworkError,
  isRetryable,
  shouldReportError,
  toAppError,
  getErrorCodeFromStatus,
} from './index';

describe('errors/index', () => {
  describe('ErrorCategory enum', () => {
    it('should have all categories', () => {
      expect(ErrorCategory.APPLICATION).toBe('application');
      expect(ErrorCategory.API).toBe('api');
      expect(ErrorCategory.NETWORK).toBe('network');
      expect(ErrorCategory.VALIDATION).toBe('validation');
      expect(ErrorCategory.USER_INPUT).toBe('user_input');
      expect(ErrorCategory.PERMISSION).toBe('permission');
      expect(ErrorCategory.INFRASTRUCTURE).toBe('infrastructure');
      expect(ErrorCategory.EXTERNAL_SERVICE).toBe('external_service');
      expect(ErrorCategory.THIRD_PARTY).toBe('third_party');
      expect(ErrorCategory.DATABASE).toBe('database');
      expect(ErrorCategory.AUTH).toBe('auth');
    });
  });

  describe('ErrorSeverity enum', () => {
    it('should have all severity levels', () => {
      expect(ErrorSeverity.FATAL).toBe('fatal');
      expect(ErrorSeverity.ERROR).toBe('error');
      expect(ErrorSeverity.WARNING).toBe('warning');
      expect(ErrorSeverity.INFO).toBe('info');
      expect(ErrorSeverity.DEBUG).toBe('debug');
    });
  });

  describe('AppError class', () => {
    it('should create AppError with default values', () => {
      const error = new AppError('Test error');
      
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Test error');
      expect(error.code).toBe(ErrorCodes.UNKNOWN);
      expect(error.category).toBe(ErrorCategory.APPLICATION);
      expect(error.severity).toBe(ErrorSeverity.ERROR);
      expect(error.shouldReport).toBe(true);
    });

    it('should create AppError with custom options', () => {
      const error = new AppError('Custom error', {
        code: ErrorCodes.NOT_FOUND,
        category: ErrorCategory.API,
        severity: ErrorSeverity.WARNING,
        userMessage: 'Resource not found',
        shouldReport: false,
      });
      
      expect(error.code).toBe(ErrorCodes.NOT_FOUND);
      expect(error.category).toBe(ErrorCategory.API);
      expect(error.severity).toBe(ErrorSeverity.WARNING);
      expect(error.userMessage).toBe('Resource not found');
      expect(error.shouldReport).toBe(false);
    });

    it('should include context', () => {
      const context = { userId: 'user-123', action: 'delete' };
      const error = new AppError('Error with context', { context });
      
      expect(error.context).toEqual(context);
    });

    it('should include recovery strategy', () => {
      const recoveryStrategy = { type: 'retry' as const, maxRetries: 3 };
      const error = new AppError('Retryable error', { recoveryStrategy });
      
      expect(error.recoveryStrategy).toEqual(recoveryStrategy);
    });

    it('should include cause', () => {
      const cause = new Error('Original error');
      const error = new AppError('Wrapped error', { cause });
      
      expect(error.cause).toBe(cause);
    });

    it('should have timestamp', () => {
      const error = new AppError('Test');
      expect(error.timestamp).toBeDefined();
      expect(new Date(error.timestamp)).toBeInstanceOf(Date);
    });

    it('should convert to JSON', () => {
      const error = new AppError('Test error', {
        code: ErrorCodes.VALIDATION_ERROR,
        category: ErrorCategory.VALIDATION,
      });
      const json = error.toJSON();
      
      expect(json.name).toBe('AppError');
      expect(json.message).toBe('Test error');
      expect(json.code).toBe(ErrorCodes.VALIDATION_ERROR);
    });
  });

  describe('createNetworkError', () => {
    it('should create network error with defaults', () => {
      const error = createNetworkError();
      
      expect(error.code).toBe(ErrorCodes.NETWORK_ERROR);
      expect(error.category).toBe(ErrorCategory.NETWORK);
      expect(error.severity).toBe(ErrorSeverity.ERROR);
      expect(error.recoveryStrategy?.type).toBe('retry');
    });

    it('should accept custom message', () => {
      const error = createNetworkError('Connection failed');
      expect(error.message).toBe('Connection failed');
    });

    it('should accept cause', () => {
      const cause = new Error('fetch failed');
      const error = createNetworkError('Network error', { cause });
      expect(error.cause).toBe(cause);
    });
  });

  describe('createApiError', () => {
    it('should create API error with status code', () => {
      const error = createApiError('API failed', 500);
      
      expect(error.code).toBe(ErrorCodes.SERVER_ERROR);
      expect(error.category).toBe(ErrorCategory.API);
      expect(error.context?.statusCode).toBe(500);
    });

    it('should map 400 to validation error', () => {
      const error = createApiError('Bad request', 400);
      expect(error.code).toBe(ErrorCodes.VALIDATION_ERROR);
    });

    it('should map 401 to unauthorized', () => {
      const error = createApiError('Unauthorized', 401);
      expect(error.code).toBe(ErrorCodes.UNAUTHORIZED);
    });

    it('should map 404 to not found', () => {
      const error = createApiError('Not found', 404);
      expect(error.code).toBe(ErrorCodes.NOT_FOUND);
    });
  });

  describe('createValidationError', () => {
    it('should create validation error', () => {
      const error = createValidationError('Invalid field');
      
      expect(error.code).toBe(ErrorCodes.VALIDATION_ERROR);
      expect(error.category).toBe(ErrorCategory.VALIDATION);
      expect(error.severity).toBe(ErrorSeverity.WARNING);
      expect(error.shouldReport).toBe(false);
    });

    it('should include field in context', () => {
      const error = createValidationError('Invalid format', 'email');
      expect(error.context.field).toBe('email');
    });
  });

  describe('createAuthError', () => {
    it('should create auth error', () => {
      const error = createAuthError();
      
      expect(error.code).toBe(ErrorCodes.UNAUTHORIZED);
      expect(error.category).toBe(ErrorCategory.AUTH);
      expect(error.recoveryStrategy?.type).toBe('redirect');
    });
  });

  describe('createNotFoundError', () => {
    it('should create not found error', () => {
      const error = createNotFoundError('User');
      
      expect(error.code).toBe(ErrorCodes.NOT_FOUND);
      expect(error.message).toBe('User不存在');
      expect(error.userMessage).toBe('您请求的User不存在');
    });
  });

  describe('createDatabaseError', () => {
    it('should create database error', () => {
      const error = createDatabaseError('Query failed');
      
      expect(error.code).toBe(ErrorCodes.DATABASE_ERROR);
      expect(error.category).toBe(ErrorCategory.DATABASE);
      expect(error.recoveryStrategy?.type).toBe('retry');
    });
  });

  describe('getErrorCodeFromStatus', () => {
    it('should map status codes correctly', () => {
      expect(getErrorCodeFromStatus(400)).toBe(ErrorCodes.VALIDATION_ERROR);
      expect(getErrorCodeFromStatus(401)).toBe(ErrorCodes.UNAUTHORIZED);
      expect(getErrorCodeFromStatus(403)).toBe(ErrorCodes.FORBIDDEN);
      expect(getErrorCodeFromStatus(404)).toBe(ErrorCodes.NOT_FOUND);
      expect(getErrorCodeFromStatus(408)).toBe(ErrorCodes.TIMEOUT);
      expect(getErrorCodeFromStatus(409)).toBe(ErrorCodes.DUPLICATE_ENTRY);
      expect(getErrorCodeFromStatus(429)).toBe(ErrorCodes.RATE_LIMITED);
      expect(getErrorCodeFromStatus(500)).toBe(ErrorCodes.SERVER_ERROR);
      expect(getErrorCodeFromStatus(502)).toBe(ErrorCodes.SERVER_ERROR);
      expect(getErrorCodeFromStatus(503)).toBe(ErrorCodes.SERVER_ERROR);
    });

    it('should return UNKNOWN for unmapped status', () => {
      expect(getErrorCodeFromStatus(418)).toBe(ErrorCodes.UNKNOWN);
    });
  });

  describe('getUserFriendlyMessage', () => {
    it('should return messages for all error codes', () => {
      const codes = Object.values(ErrorCodes) as string[];
      codes.forEach((code) => {
        const message = getUserFriendlyMessage(code);
        expect(typeof message).toBe('string');
        expect(message.length).toBeGreaterThan(0);
      });
    });
  });

  describe('formatErrorMessage', () => {
    it('should format AppError', () => {
      const error = new AppError('Test', { userMessage: 'User friendly message' });
      expect(formatErrorMessage(error)).toBe('User friendly message');
    });

    it('should format Error', () => {
      expect(formatErrorMessage(new Error('Test error'))).toBe('Test error');
    });

    it('should format string', () => {
      expect(formatErrorMessage('String error')).toBe('String error');
    });

    it('should return default for unknown', () => {
      expect(formatErrorMessage(null)).toBe('发生未知错误');
    });
  });

  describe('isNetworkError', () => {
    it('should detect AppError network category', () => {
      const error = createNetworkError();
      expect(isNetworkError(error)).toBe(true);
    });

    it('should detect network errors by message', () => {
      expect(isNetworkError(new Error('network failed'))).toBe(true);
      expect(isNetworkError(new Error('fetch error'))).toBe(true);
      expect(isNetworkError(new Error('timeout occurred'))).toBe(true);
      expect(isNetworkError(new Error('connection refused'))).toBe(true);
    });

    it('should return false for non-network errors', () => {
      expect(isNetworkError(new Error('validation error'))).toBe(false);
      expect(isNetworkError(null)).toBe(false);
    });
  });

  describe('isRetryable', () => {
    it('should return true for errors with retry strategy', () => {
      const error = createNetworkError();
      expect(isRetryable(error)).toBe(true);
    });

    it('should return true for network errors', () => {
      expect(isRetryable(new Error('network failed'))).toBe(true);
    });

    it('should return false for non-retryable errors', () => {
      const error = createValidationError('Invalid');
      expect(isRetryable(error)).toBe(false);
    });
  });

  describe('shouldReportError', () => {
    it('should return false for validation errors', () => {
      const error = createValidationError('Invalid');
      expect(shouldReportError(error)).toBe(false);
    });

    it('should return true for server errors', () => {
      const error = createDatabaseError('Failed');
      expect(shouldReportError(error)).toBe(true);
    });

    it('should return true for unknown errors', () => {
      expect(shouldReportError(new Error('Unknown'))).toBe(true);
    });
  });

  describe('toAppError', () => {
    it('should return same AppError', () => {
      const error = createNotFoundError('Test');
      const converted = toAppError(error);
      expect(converted).toBe(error);
    });

    it('should convert Error to AppError', () => {
      const error = new Error('Test error');
      const converted = toAppError(error);
      
      expect(converted).toBeInstanceOf(AppError);
      expect(converted.message).toBe('Test error');
      expect(converted.cause).toBe(error);
    });

    it('should detect network errors', () => {
      const error = new Error('network timeout');
      const converted = toAppError(error);
      
      expect(converted.category).toBe(ErrorCategory.NETWORK);
    });

    it('should convert string to AppError', () => {
      const converted = toAppError('string error');
      expect(converted.message).toBe('string error');
    });

    it('should include context', () => {
      const context = { userId: 'user-123' };
      const converted = toAppError(new Error('Test'), context);
      expect(converted.context).toEqual(context);
    });
  });
});