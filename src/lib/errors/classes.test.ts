import { describe, it, expect } from 'vitest';
import { ValidationError, AuthError, ForbiddenError, NotFoundError, ServerError } from './classes';

describe('ValidationError', () => {
  it('should create validation error', () => {
    const error = new ValidationError('Invalid input', 'email', 'invalid@');
    expect(error.message).toContain('Invalid input');
    expect(error.name).toBe('ValidationError');
  });
});

describe('AuthError', () => {
  it('should create auth error', () => {
    const error = new AuthError('Unauthorized');
    expect(error.message).toContain('Unauthorized');
    expect(error.name).toBe('AuthError');
  });
});

describe('ForbiddenError', () => {
  it('should create forbidden error', () => {
    const error = new ForbiddenError('Access denied');
    expect(error.message).toContain('Access denied');
    expect(error.name).toBe('ForbiddenError');
  });
});

describe('NotFoundError', () => {
  it('should create not found error', () => {
    const error = new NotFoundError('Resource not found');
    expect(error.message).toContain('Resource not found');
    expect(error.name).toBe('NotFoundError');
  });
});

describe('ServerError', () => {
  it('should create server error', () => {
    const error = new ServerError('Internal error');
    expect(error.message).toContain('Internal error');
    expect(error.name).toBe('ServerError');
  });
});
