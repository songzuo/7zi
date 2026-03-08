import { describe, it, expect, vi, beforeEach } from 'vitest';
import { captureError, AppError, ErrorCategory, ErrorSeverity } from './errors';

describe('Error Monitoring', () => {
  beforeEach(() => {
    console.error = vi.fn();
  });

  it('should capture basic error with metadata', () => {
    const testError = new Error('Test error');
    
    const result = captureError(testError, {
      category: ErrorCategory.APPLICATION,
      severity: ErrorSeverity.ERROR,
      tags: { test: 'true' },
      extra: { testData: 'value' }
    });
    
    expect(result).toBeDefined();
    expect(result.category).toBe(ErrorCategory.APPLICATION);
    expect(result.severity).toBe(ErrorSeverity.ERROR);
  });

  it('should capture AppError with custom properties', () => {
    const appError = new AppError({
      message: 'Custom app error',
      category: ErrorCategory.API,
      severity: ErrorSeverity.WARNING,
      metadata: { requestId: '12345' },
      userMessage: 'Something went wrong with the API'
    });
    
    const result = captureError(appError);
    
    expect(result).toBeDefined();
    expect(result.category).toBe(ErrorCategory.API);
    expect(result.severity).toBe(ErrorSeverity.WARNING);
  });

  it('should handle unknown error string', () => {
    const result = captureError('Unknown error string', {
      category: ErrorCategory.NETWORK,
      severity: ErrorSeverity.FATAL
    });
    
    expect(result).toBeDefined();
    expect(result.category).toBe(ErrorCategory.NETWORK);
    expect(result.severity).toBe(ErrorSeverity.FATAL);
  });

  it('should use default category and severity when not provided', () => {
    const testError = new Error('Simple error');
    
    const result = captureError(testError);
    
    expect(result).toBeDefined();
    expect(result.category).toBe(ErrorCategory.APPLICATION);
    expect(result.severity).toBe(ErrorSeverity.ERROR);
  });

  it('should include timestamp in captured error', () => {
    const testError = new Error('Timestamp test');
    
    const result = captureError(testError);
    
    expect(result.timestamp).toBeDefined();
    expect(new Date(result.timestamp as string).getTime()).toBeLessThanOrEqual(Date.now());
  });

  it('should generate fingerprint for error grouping', () => {
    const appError = new AppError({
      message: 'Fingerprint test',
      category: ErrorCategory.API
    });
    
    const result = captureError(appError);
    
    expect(result.fingerprint).toBeDefined();
    expect(Array.isArray(result.fingerprint)).toBe(true);
  });
});
