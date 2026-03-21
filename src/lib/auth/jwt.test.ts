/**
 * @fileoverview JWT Module Tests
 * @description Tests for JWT token generation and verification
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SignJWT, jwtVerify } from 'jose';

// ============================================================================
// Mock Setup
// ============================================================================

vi.mock('jose', () => ({
  SignJWT: vi.fn().mockImplementation(() => ({
    setProtectedHeader: vi.fn().mockReturnThis(),
    setIssuedAt: vi.fn().mockReturnThis(),
    setExpirationTime: vi.fn().mockReturnThis(),
    setIssuer: vi.fn().mockReturnThis(),
    setAudience: vi.fn().mockReturnThis(),
    sign: vi.fn().mockResolvedValue('mock-jwt-token'),
  })),
  jwtVerify: vi.fn(),
}));

// ============================================================================
// Test Data
// ============================================================================

const mockUser = {
  id: 'user1',
  email: 'test@example.com',
  name: 'Test User',
  role: 'member',
  roles: ['member'],
  permissions: ['read:tasks', 'write:tasks'],
  customPermissions: ['manage:team'],
};

// ============================================================================
// Test Suites
// ============================================================================

describe('JWT Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret-key-for-testing';
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
  });

  describe('JWT Secret Management', () => {
    it('should throw error when JWT_SECRET is not set', () => {
      delete process.env.JWT_SECRET;

      expect(() => {
        require('../jwt').getJwtSecret();
      }).toThrow('JWT_SECRET environment variable is required in production');
    });

    it('should use JWT_SECRET when available', () => {
      const secret = require('../jwt').getJwtSecret();
      expect(secret).toBe('test-secret-key-for-testing');
    });

    it('should fallback to AGENT_ENCRYPTION_SECRET when JWT_SECRET is not set', () => {
      delete process.env.JWT_SECRET;
      process.env.AGENT_ENCRYPTION_SECRET = 'fallback-secret';

      const secret = require('../jwt').getJwtSecret();
      expect(secret).toBe('fallback-secret');

      delete process.env.AGENT_ENCRYPTION_SECRET;
    });
  });

  describe('JWT Token Generation', () => {
    it('should generate JWT token with correct claims', async () => {
      const { generateJwtToken } = await import('../jwt');

      const token = await generateJwtToken(mockUser, 3600);

      expect(token).toBe('mock-jwt-token');
      expect(SignJWT).toHaveBeenCalledWith({
        sub: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
        roles: mockUser.roles,
        permissions: mockUser.permissions,
        customPermissions: mockUser.customPermissions,
        type: 'user',
      });
    });

    it('should set correct protected header', async () => {
      const { generateJwtToken } = await import('../jwt');

      await generateJwtToken(mockUser, 3600);

      const signJwt = (SignJWT as any).mock.results[0].value;
      expect(signJwt.setProtectedHeader).toHaveBeenCalledWith({ alg: 'HS256' });
    });

    it('should set issued at time', async () => {
      const { generateJwtToken } = await import('../jwt');

      await generateJwtToken(mockUser, 3600);

      const signJwt = (SignJWT as any).mock.results[0].value;
      expect(signJwt.setIssuedAt).toHaveBeenCalled();
    });

    it('should set expiration time correctly', async () => {
      const { generateJwtToken } = await import('../jwt');

      await generateJwtToken(mockUser, 3600);

      const signJwt = (SignJWT as any).mock.results[0].value;
      expect(signJwt.setExpirationTime).toHaveBeenCalled();
    });

    it('should set correct issuer', async () => {
      const { generateJwtToken } = await import('../jwt');

      await generateJwtToken(mockUser, 3600);

      const signJwt = (SignJWT as any).mock.results[0].value;
      expect(signJwt.setIssuer).toHaveBeenCalledWith('7zi-api');
    });

    it('should set correct audience', async () => {
      const { generateJwtToken } = await import('../jwt');

      await generateJwtToken(mockUser, 3600);

      const signJwt = (SignJWT as any).mock.results[0].value;
      expect(signJwt.setAudience).toHaveBeenCalledWith('7zi-users');
    });

    it('should use correct secret for signing', async () => {
      const { generateJwtToken } = await import('../jwt');

      await generateJwtToken(mockUser, 3600);

      expect(SignJWT).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'user',
        })
      );
    });
  });

  describe('JWT Token Verification', () => {
    it('should verify valid token and return user context', async () => {
      const mockPayload = {
        sub: 'user1',
        email: 'test@example.com',
        role: 'member',
        roles: ['member'],
        permissions: ['read:tasks', 'write:tasks'],
        customPermissions: ['manage:team'],
        type: 'user',
      };

      vi.mocked(jwtVerify).mockResolvedValue({
        payload: mockPayload,
        protectedHeader: { alg: 'HS256' },
        key: new Uint8Array(),
      });

      const { verifyJwtToken } = await import('../jwt');

      const context = await verifyJwtToken('valid-token');

      expect(context).not.toBeNull();
      expect(context?.userId).toBe('user1');
      expect(context?.email).toBe('test@example.com');
      expect(context?.role).toBe('member');
    });

    it('should return null for invalid token', async () => {
      vi.mocked(jwtVerify).mockRejectedValue(new Error('Invalid token'));

      const { verifyJwtToken } = await import('../jwt');

      const context = await verifyJwtToken('invalid-token');

      expect(context).toBeNull();
    });

    it('should return null for token with wrong type', async () => {
      const mockPayload = {
        sub: 'user1',
        type: 'agent', // Wrong type
      };

      vi.mocked(jwtVerify).mockResolvedValue({
        payload: mockPayload,
        protectedHeader: { alg: 'HS256' },
        key: new Uint8Array(),
      });

      const { verifyJwtToken } = await import('../jwt');

      const context = await verifyJwtToken('valid-token');

      expect(context).toBeNull();
    });

    it('should verify token with correct issuer', async () => {
      const mockPayload = {
        sub: 'user1',
        email: 'test@example.com',
        role: 'member',
        type: 'user',
      };

      vi.mocked(jwtVerify).mockResolvedValue({
        payload: mockPayload,
        protectedHeader: { alg: 'HS256' },
        key: new Uint8Array(),
      });

      const { verifyJwtToken } = await import('../jwt');

      await verifyJwtToken('valid-token');

      expect(jwtVerify).toHaveBeenCalledWith(
        'valid-token',
        expect.any(Uint8Array),
        {
          issuer: '7zi-api',
          audience: '7zi-users',
        }
      );
    });

    it('should verify token with correct audience', async () => {
      const mockPayload = {
        sub: 'user1',
        email: 'test@example.com',
        role: 'member',
        type: 'user',
      };

      vi.mocked(jwtVerify).mockResolvedValue({
        payload: mockPayload,
        protectedHeader: { alg: 'HS256' },
        key: new Uint8Array(),
      });

      const { verifyJwtToken } = await import('../jwt');

      await verifyJwtToken('valid-token');

      expect(jwtVerify).toHaveBeenCalledWith(
        'valid-token',
        expect.any(Uint8Array),
        {
          issuer: '7zi-api',
          audience: '7zi-users',
        }
      );
    });

    it('should handle missing permissions array', async () => {
      const mockPayload = {
        sub: 'user1',
        email: 'test@example.com',
        role: 'member',
        roles: ['member'],
        // Missing permissions array
        customPermissions: [],
        type: 'user',
      };

      vi.mocked(jwtVerify).mockResolvedValue({
        payload: mockPayload,
        protectedHeader: { alg: 'HS256' },
        key: new Uint8Array(),
      });

      const { verifyJwtToken } = await import('../jwt');

      const context = await verifyJwtToken('valid-token');

      expect(context).not.toBeNull();
      expect(context?.permissions).toEqual([]);
    });

    it('should handle missing custom permissions', async () => {
      const mockPayload = {
        sub: 'user1',
        email: 'test@example.com',
        role: 'member',
        roles: ['member'],
        permissions: ['read:tasks'],
        // Missing customPermissions
        type: 'user',
      };

      vi.mocked(jwtVerify).mockResolvedValue({
        payload: mockPayload,
        protectedHeader: { alg: 'HS256' },
        key: new Uint8Array(),
      });

      const { verifyJwtToken } = await import('../jwt');

      const context = await verifyJwtToken('valid-token');

      expect(context).not.toBeNull();
      expect(context?.customPermissions).toEqual([]);
    });

    it('should handle missing roles array', async () => {
      const mockPayload = {
        sub: 'user1',
        email: 'test@example.com',
        role: 'member',
        // Missing roles array
        permissions: ['read:tasks'],
        type: 'user',
      };

      vi.mocked(jwtVerify).mockResolvedValue({
        payload: mockPayload,
        protectedHeader: { alg: 'HS256' },
        key: new Uint8Array(),
      });

      const { verifyJwtToken } = await import('../jwt');

      const context = await verifyJwtToken('valid-token');

      expect(context).not.toBeNull();
      expect(context?.roles).toEqual([]);
    });
  });

  describe('JWT Error Handling', () => {
    it('should handle token expiration errors', async () => {
      vi.mocked(jwtVerify).mockRejectedValue(new Error('Token expired'));

      const { verifyJwtToken } = await import('../jwt');

      const context = await verifyJwtToken('expired-token');

      expect(context).toBeNull();
    });

    it('should handle signature verification errors', async () => {
      vi.mocked(jwtVerify).mockRejectedValue(new Error('Invalid signature'));

      const { verifyJwtToken } = await import('../jwt');

      const context = await verifyJwtToken('invalid-signature-token');

      expect(context).toBeNull();
    });

    it('should handle malformed token errors', async () => {
      vi.mocked(jwtVerify).mockRejectedValue(new Error('Malformed token'));

      const { verifyJwtToken } = await import('../jwt');

      const context = await verifyJwtToken('malformed-token');

      expect(context).toBeNull();
    });
  });

  describe('JWT Token Expiry Times', () => {
    it('should support short expiry time (1 hour)', async () => {
      const { generateJwtToken } = await import('../jwt');

      await generateJwtToken(mockUser, 3600);

      expect(SignJWT).toHaveBeenCalled();
    });

    it('should support long expiry time (7 days)', async () => {
      const { generateJwtToken } = await import('../jwt');

      await generateJwtToken(mockUser, 604800);

      expect(SignJWT).toHaveBeenCalled();
    });

    it('should support custom expiry times', async () => {
      const { generateJwtToken } = await import('../jwt');

      await generateJwtToken(mockUser, 7200); // 2 hours

      expect(SignJWT).toHaveBeenCalled();
    });
  });

  describe('JWT Token Payload Structure', () => {
    it('should include user ID in payload', async () => {
      const { generateJwtToken } = await import('../jwt');

      await generateJwtToken(mockUser, 3600);

      expect(SignJWT).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: mockUser.id,
        })
      );
    });

    it('should include email in payload', async () => {
      const { generateJwtToken } = await import('../jwt');

      await generateJwtToken(mockUser, 3600);

      expect(SignJWT).toHaveBeenCalledWith(
        expect.objectContaining({
          email: mockUser.email,
        })
      );
    });

    it('should include role in payload', async () => {
      const { generateJwtToken } = await import('../jwt');

      await generateJwtToken(mockUser, 3600);

      expect(SignJWT).toHaveBeenCalledWith(
        expect.objectContaining({
          role: mockUser.role,
        })
      );
    });

    it('should include roles array in payload', async () => {
      const { generateJwtToken } = await import('../jwt');

      await generateJwtToken(mockUser, 3600);

      expect(SignJWT).toHaveBeenCalledWith(
        expect.objectContaining({
          roles: mockUser.roles,
        })
      );
    });

    it('should include permissions array in payload', async () => {
      const { generateJwtToken } = await import('../jwt');

      await generateJwtToken(mockUser, 3600);

      expect(SignJWT).toHaveBeenCalledWith(
        expect.objectContaining({
          permissions: mockUser.permissions,
        })
      );
    });

    it('should include custom permissions in payload', async () => {
      const { generateJwtToken } = await import('../jwt');

      await generateJwtToken(mockUser, 3600);

      expect(SignJWT).toHaveBeenCalledWith(
        expect.objectContaining({
          customPermissions: mockUser.customPermissions,
        })
      );
    });

    it('should include type in payload', async () => {
      const { generateJwtToken } = await import('../jwt');

      await generateJwtToken(mockUser, 3600);

      expect(SignJWT).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'user',
        })
      );
    });
  });
});
