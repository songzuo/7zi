/**
 * 测试 src/lib/errors/index.ts
 */

import { describe, it, expect } from 'vitest';
import {
  toAppError,
  formatErrorMessage,
  isNetworkError,
  getUserFriendlyMessage,
  ErrorCodes,
  ErrorCategory,
  AppError,
  createValidationError,
  createNotFoundError,
  createAuthError,
  createNetworkError,
  createApiError,
} from './errors';

describe('errors', () => {
  describe('toAppError', () => {
    it('should convert Error instance to AppError', () => {
      const error = toAppError(new Error('Test error'));
      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe('Test error');
    });

    it('should convert string to AppError', () => {
      const error = toAppError('String error');
      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe('String error');
    });

    it('should preserve AppError instance', () => {
      const original = new AppError('Original', { code: ErrorCodes.VALIDATION_ERROR });
      const converted = toAppError(original);
      expect(converted).toBe(original);
    });

    it('should merge context when provided', () => {
      const error = toAppError(new Error('Test'), { userId: '123' });
      expect(error.context.userId).toBe('123');
    });
  });

  describe('formatErrorMessage', () => {
    it('should format Error instance', () => {
      const error = new Error('Test error');
      expect(formatErrorMessage(error)).toBe('Test error');
    });

    it('should format string error', () => {
      expect(formatErrorMessage('String error')).toBe('String error');
    });

    it('should return default message for unknown error types', () => {
      expect(formatErrorMessage(null)).toBe('发生未知错误');
      expect(formatErrorMessage(undefined)).toBe('发生未知错误');
      expect(formatErrorMessage({})).toBe('发生未知错误');
    });

    it('should format AppError', () => {
      const error = new AppError('Test error', {
        userMessage: 'User friendly message'
      });
      expect(formatErrorMessage(error)).toBe('User friendly message');
    });
  });

  describe('isNetworkError', () => {
    it('should detect network errors', () => {
      expect(isNetworkError(new Error('network failed'))).toBe(true);
      expect(isNetworkError(new Error('fetch timeout'))).toBe(true);
      expect(isNetworkError(new Error('request timeout'))).toBe(true);
      expect(isNetworkError(new Error('request aborted'))).toBe(true);
      expect(isNetworkError(new Error('connection refused'))).toBe(true);
    });

    it('should not detect non-network errors', () => {
      expect(isNetworkError(new Error('validation error'))).toBe(false);
      expect(isNetworkError(new Error('something went wrong'))).toBe(false);
    });

    it('should detect AppError with NETWORK category', () => {
      const error = new AppError('Network error', {
        category: ErrorCategory.NETWORK
      });
      expect(isNetworkError(error)).toBe(true);
    });

    it('should handle non-Error inputs', () => {
      expect(isNetworkError('string')).toBe(false);
      expect(isNetworkError(null)).toBe(false);
      expect(isNetworkError(undefined)).toBe(false);
    });
  });

  describe('getUserFriendlyMessage', () => {
    it('should return friendly messages for known codes', () => {
      expect(getUserFriendlyMessage(ErrorCodes.NOT_FOUND)).toBe('您请求的资源不存在');
      expect(getUserFriendlyMessage(ErrorCodes.UNAUTHORIZED)).toBe('您需要登录才能访问此资源');
      expect(getUserFriendlyMessage(ErrorCodes.FORBIDDEN)).toBe('您没有权限访问此资源');
      expect(getUserFriendlyMessage(ErrorCodes.VALIDATION_ERROR)).toBe('您提交的数据格式不正确');
      expect(getUserFriendlyMessage(ErrorCodes.NETWORK_ERROR)).toBe('网络连接失败，请检查您的网络设置');
      expect(getUserFriendlyMessage(ErrorCodes.SERVER_ERROR)).toBe('服务器暂时无法处理您的请求，请稍后重试');
    });

    it('should return default message for unknown code', () => {
      expect(getUserFriendlyMessage('UNKNOWN_CODE' as any)).toBe('发生未知错误，请稍后重试');
    });
  });

  describe('ErrorCodes', () => {
    it('should have all required error codes', () => {
      expect(ErrorCodes.NOT_FOUND).toBe('NOT_FOUND');
      expect(ErrorCodes.UNAUTHORIZED).toBe('UNAUTHORIZED');
      expect(ErrorCodes.FORBIDDEN).toBe('FORBIDDEN');
      expect(ErrorCodes.VALIDATION_ERROR).toBe('VALIDATION_ERROR');
      expect(ErrorCodes.NETWORK_ERROR).toBe('NETWORK_ERROR');
      expect(ErrorCodes.SERVER_ERROR).toBe('SERVER_ERROR');
      expect(ErrorCodes.UNKNOWN).toBe('UNKNOWN');
    });
  });

  describe('createValidationError', () => {
    it('should create validation error with field', () => {
      const error = createValidationError('Invalid email', 'email');
      expect(error.code).toBe(ErrorCodes.VALIDATION_ERROR);
      expect(error.context.field).toBe('email');
      expect(error.userMessage).toContain('email');
    });
  });

  describe('createNotFoundError', () => {
    it('should create not found error', () => {
      const error = createNotFoundError('User');
      expect(error.code).toBe(ErrorCodes.NOT_FOUND);
      expect(error.message).toContain('User');
    });
  });

  describe('createAuthError', () => {
    it('should create auth error', () => {
      const error = createAuthError();
      expect(error.code).toBe(ErrorCodes.UNAUTHORIZED);
    });
  });

  describe('createNetworkError', () => {
    it('should create network error', () => {
      const error = createNetworkError('Connection failed');
      expect(error.code).toBe(ErrorCodes.NETWORK_ERROR);
      expect(error.category).toBe('network');
    });
  });

  describe('createApiError', () => {
    it('should create API error with status code', () => {
      const error = createApiError('Bad request', 400);
      expect(error.code).toBe(ErrorCodes.VALIDATION_ERROR);
    });

    it('should create server error for 5xx', () => {
      const error = createApiError('Server error', 500);
      expect(error.code).toBe(ErrorCodes.SERVER_ERROR);
    });
  });
});
