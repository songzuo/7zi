/**
 * 测试 src/lib/errors.ts
 */

import { describe, it, expect } from 'vitest';
import {
  createAppError,
  formatErrorMessage,
  isNetworkError,
  getErrorCode,
  getUserFriendlyMessage,
  ErrorCodes,
} from './errors';

describe('errors', () => {
  describe('createAppError', () => {
    it('should create an error with message only', () => {
      const error = createAppError('Test error');
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Test error');
    });

    it('should create an error with code and statusCode', () => {
      const error = createAppError('Not found', 'NOT_FOUND', 404);
      expect(error.message).toBe('Not found');
      expect(error.code).toBe('NOT_FOUND');
      expect(error.statusCode).toBe(404);
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
  });

  describe('isNetworkError', () => {
    it('should detect network errors', () => {
      expect(isNetworkError(new Error('network failed'))).toBe(true);
      expect(isNetworkError(new Error('fetch timeout'))).toBe(true);
      expect(isNetworkError(new Error('request timeout'))).toBe(true);
      expect(isNetworkError(new Error('request aborted'))).toBe(true);
    });

    it('should not detect non-network errors', () => {
      expect(isNetworkError(new Error('validation error'))).toBe(false);
      expect(isNetworkError(new Error('something went wrong'))).toBe(false);
    });

    it('should handle non-Error inputs', () => {
      expect(isNetworkError('string')).toBe(false);
      expect(isNetworkError(null)).toBe(false);
      expect(isNetworkError(undefined)).toBe(false);
    });
  });

  describe('getErrorCode', () => {
    it('should return code from AppError', () => {
      const error = createAppError('Test', 'VALIDATION_ERROR', 400);
      expect(getErrorCode(error)).toBe('VALIDATION_ERROR');
    });

    it('should detect network errors', () => {
      const error = new Error('network failed');
      expect(getErrorCode(error)).toBe(ErrorCodes.NETWORK_ERROR);
    });

    it('should map status codes to error codes', () => {
      const error401 = { ...new Error('Unauthorized'), statusCode: 401 } as Error & { statusCode: number };
      expect(getErrorCode(error401)).toBe(ErrorCodes.UNAUTHORIZED);

      const error403 = { ...new Error('Forbidden'), statusCode: 403 } as Error & { statusCode: number };
      expect(getErrorCode(error403)).toBe(ErrorCodes.FORBIDDEN);

      const error404 = { ...new Error('Not found'), statusCode: 404 } as Error & { statusCode: number };
      expect(getErrorCode(error404)).toBe(ErrorCodes.NOT_FOUND);

      const error500 = { ...new Error('Server error'), statusCode: 500 } as Error & { statusCode: number };
      expect(getErrorCode(error500)).toBe(ErrorCodes.SERVER_ERROR);
    });

    it('should return UNKNOWN for unrecognized errors', () => {
      expect(getErrorCode(new Error('random error'))).toBe(ErrorCodes.UNKNOWN);
      expect(getErrorCode('string')).toBe(ErrorCodes.UNKNOWN);
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
      expect(getUserFriendlyMessage('UNKNOWN_CODE')).toBe('发生未知错误，请稍后重试');
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
});