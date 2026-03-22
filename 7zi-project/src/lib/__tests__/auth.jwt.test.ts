/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateToken,
  verifyToken,
  decodeToken,
  isTokenExpired,
  type JWTPayload,
} from '../auth/jwt';

describe('JWT Module', () => {
  const testSecret = 'test-secret-key';
  const validPayload: JWTPayload = {
    userId: 'user-123',
    email: 'test@example.com',
    role: 'admin',
  };

  describe('generateToken', () => {
    it('should generate a valid JWT token', () => {
      const token = generateToken(validPayload, testSecret);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token).toContain('.');
      expect(token.split('.')).toHaveLength(3);
    });

    it('should generate different tokens for same payload', () => {
      const token1 = generateToken(validPayload, testSecret);
      const token2 = generateToken(validPayload, testSecret);
      expect(token1).not.toBe(token2);
    });

    it('should use default expiration when not provided', () => {
      const token = generateToken(validPayload, testSecret);
      const decoded = decodeToken(token);
      expect(decoded).toBeDefined();
      expect(decoded?.exp).toBeDefined();
    });

    it('should generate token with custom expiration', () => {
      const token = generateToken(validPayload, testSecret, '2h');
      expect(token).toBeDefined();
    });
  });

  describe('verifyToken', () => {
    it('should verify a valid token with correct secret', () => {
      const token = generateToken(validPayload, testSecret);
      const decoded = verifyToken(token, testSecret);
      expect(decoded).toBeDefined();
      expect(decoded?.userId).toBe(validPayload.userId);
      expect(decoded?.email).toBe(validPayload.email);
      expect(decoded?.role).toBe(validPayload.role);
    });

    it('should return null for invalid token with wrong secret', () => {
      const token = generateToken(validPayload, testSecret);
      const decoded = verifyToken(token, 'wrong-secret');
      expect(decoded).toBeNull();
    });

    it('should return null for malformed token', () => {
      const decoded = verifyToken('invalid.token.string', testSecret);
      expect(decoded).toBeNull();
    });

    it('should return null for empty token', () => {
      const decoded = verifyToken('', testSecret);
      expect(decoded).toBeNull();
    });

    it('should return null for token without userId', () => {
      const malformedPayload = { email: 'test@example.com' } as JWTPayload;
      const token = generateToken(malformedPayload, testSecret);
      const decoded = verifyToken(token, testSecret);
      expect(decoded).toBeNull();
    });
  });

  describe('decodeToken', () => {
    it('should decode token without verification', () => {
      const token = generateToken(validPayload, testSecret);
      const decoded = decodeToken(token);
      expect(decoded).toBeDefined();
      expect(decoded?.userId).toBe(validPayload.userId);
      expect(decoded?.email).toBe(validPayload.email);
      expect(decoded?.role).toBe(validPayload.role);
    });

    it('should decode token even with wrong secret', () => {
      const token = generateToken(validPayload, testSecret);
      const decoded = decodeToken(token);
      expect(decoded).toBeDefined();
    });

    it('should return null for malformed token', () => {
      const decoded = decodeToken('invalid.token');
      expect(decoded).toBeNull();
    });

    it('should return null for empty token', () => {
      const decoded = decodeToken('');
      expect(decoded).toBeNull();
    });

    it('should return null for token without userId', () => {
      const malformedPayload = { email: 'test@example.com' } as JWTPayload;
      const token = generateToken(malformedPayload, testSecret);
      const decoded = decodeToken(token);
      expect(decoded).toBeNull();
    });

    it('should include standard JWT fields', () => {
      const token = generateToken(validPayload, testSecret);
      const decoded = decodeToken(token);
      expect(decoded).toHaveProperty('iat');
      expect(decoded).toHaveProperty('exp');
    });
  });

  describe('isTokenExpired', () => {
    it('should return false for newly generated token', () => {
      const token = generateToken(validPayload, testSecret);
      const expired = isTokenExpired(token);
      expect(expired).toBe(false);
    });

    it('should return true for malformed token', () => {
      const expired = isTokenExpired('invalid.token');
      expect(expired).toBe(true);
    });

    it('should return true for empty token', () => {
      const expired = isTokenExpired('');
      expect(expired).toBe(true);
    });

    it('should return true for token without exp field', () => {
      const malformedPayload = { userId: 'user-123' } as JWTPayload;
      const token = generateToken(malformedPayload, testSecret);
      const expired = isTokenExpired(token);
      expect(expired).toBe(true);
    });

    it('should handle tokens with different expiration times', () => {
      const token1 = generateToken(validPayload, testSecret, '1s');
      const token2 = generateToken(validPayload, testSecret, '100y');

      // Both should not be expired immediately
      expect(isTokenExpired(token1)).toBe(false);
      expect(isTokenExpired(token2)).toBe(false);
    });
  });

  describe('Integration Tests', () => {
    it('should complete full token lifecycle', () => {
      // Generate
      const token = generateToken(validPayload, testSecret);
      expect(token).toBeDefined();

      // Verify
      const verified = verifyToken(token, testSecret);
      expect(verified).toEqual(expect.objectContaining(validPayload));

      // Decode
      const decoded = decodeToken(token);
      expect(decoded).toEqual(expect.objectContaining(validPayload));

      // Check expiration
      const expired = isTokenExpired(token);
      expect(expired).toBe(false);
    });

    it('should handle multiple tokens with different payloads', () => {
      const payload1: JWTPayload = { userId: 'user-1', role: 'admin' };
      const payload2: JWTPayload = { userId: 'user-2', role: 'user' };
      const payload3: JWTPayload = { userId: 'user-3', email: 'test@example.com' };

      const token1 = generateToken(payload1, testSecret);
      const token2 = generateToken(payload2, testSecret);
      const token3 = generateToken(payload3, testSecret);

      expect(verifyToken(token1, testSecret)?.userId).toBe('user-1');
      expect(verifyToken(token2, testSecret)?.role).toBe('user');
      expect(verifyToken(token3, testSecret)?.email).toBe('test@example.com');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty payload', () => {
      const token = generateToken({ userId: '' }, testSecret);
      const decoded = verifyToken(token, testSecret);
      expect(decoded).toBeDefined();
      expect(decoded?.userId).toBe('');
    });

    it('should handle special characters in payload', () => {
      const specialPayload: JWTPayload = {
        userId: 'user-123',
        email: 'test+special@example.com',
      };
      const token = generateToken(specialPayload, testSecret);
      const decoded = verifyToken(token, testSecret);
      expect(decoded?.email).toBe('test+special@example.com');
    });

    it('should handle Unicode characters in payload', () => {
      const unicodePayload: JWTPayload = {
        userId: 'user-123',
        email: '测试@example.com',
      };
      const token = generateToken(unicodePayload, testSecret);
      const decoded = verifyToken(token, testSecret);
      expect(decoded?.email).toBe('测试@example.com');
    });

    it('should handle very long payload', () => {
      const longPayload: JWTPayload = {
        userId: 'user-123',
        email: 'x'.repeat(1000) + '@example.com',
      };
      const token = generateToken(longPayload, testSecret);
      const decoded = verifyToken(token, testSecret);
      expect(decoded?.email).toBe('x'.repeat(1000) + '@example.com');
    });
  });
});
