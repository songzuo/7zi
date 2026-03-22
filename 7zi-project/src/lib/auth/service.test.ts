/**
 * @fileoverview Auth Service Tests
 * @description Tests for authentication service functions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  loginUser,
  registerUser,
  logoutUser,
  refreshToken,
  authenticateToken,
  changePassword,
  initiatePasswordReset,
  resetPassword,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
} from './service';
import {
  getUserByEmail,
  getUserById,
  createUser,
  updateUser,
  createUserToken,
  validateUserToken,
  refreshUserToken,
  revokeUserToken,
  revokeAllUserTokens,
  updateLastLogin,
  createPasswordResetToken,
  validatePasswordResetToken,
  deletePasswordResetToken,
} from './repository';
import { UserRole, UserStatus } from './types';
import { logger } from '@/lib/logger';

// ============================================================================
// Mock Setup
// ============================================================================

vi.mock('../repository', () => ({
  getUserByEmail: vi.fn(),
  getUserById: vi.fn(),
  createUser: vi.fn(),
  updateUser: vi.fn(),
  createUserToken: vi.fn(),
  validateUserToken: vi.fn(),
  refreshUserToken: vi.fn(),
  revokeUserToken: vi.fn(),
  revokeAllUserTokens: vi.fn(),
  updateLastLogin: vi.fn(),
  createPasswordResetToken: vi.fn(),
  validatePasswordResetToken: vi.fn(),
  deletePasswordResetToken: vi.fn(),
  verifyPassword: vi.fn((password: string, hash: string) => {
    return password === 'correctPassword';
  }),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
  },
}));

// ============================================================================
// Test Data
// ============================================================================

const mockUser: import('./types').User = {
  id: 'user1',
  email: 'test@example.com',
  password: 'hashedPassword',
  name: 'Test User',
  role: UserRole.MEMBER,
  roles: [],
  status: UserStatus.ACTIVE,
  permissions: [],
  metadata: {},
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockToken = {
  id: 'token1',
  userId: 'user1',
  token: 'jwt-token',
  refreshToken: 'refresh-token',
  expiresAt: new Date(Date.now() + 3600000),
  refreshExpiresAt: new Date(Date.now() + 604800000),
  createdAt: new Date(),
};

// ============================================================================
// Test Suites
// ============================================================================

describe('Auth Service - Login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret-key-for-testing';
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
  });

  it('should login successfully with valid credentials', async () => {
    vi.mocked(getUserByEmail).mockResolvedValue(mockUser);
    vi.mocked(createUserToken).mockResolvedValue(mockToken);
    vi.mocked(updateLastLogin).mockResolvedValue(undefined);

    const result = await loginUser({
      email: 'test@example.com',
      password: 'correctPassword',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.user).toBeDefined();
      expect(result.user?.email).toBe('test@example.com');
      expect(result.token).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    }
    expect(getUserByEmail).toHaveBeenCalledWith('test@example.com');
    expect(updateLastLogin).toHaveBeenCalledWith('user1');
  });

  it('should fail with invalid email', async () => {
    vi.mocked(getUserByEmail).mockResolvedValue(null);

    const result = await loginUser({
      email: 'nonexistent@example.com',
      password: 'anypassword',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('Invalid email or password');
    }
  });

  it('should fail with invalid password', async () => {
    vi.mocked(getUserByEmail).mockResolvedValue(mockUser);

    const result = await loginUser({
      email: 'test@example.com',
      password: 'wrongPassword',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('Invalid email or password');
    }
  });

  it('should fail with inactive user', async () => {
    const inactiveUser = { ...mockUser, status: UserStatus.INACTIVE };
    vi.mocked(getUserByEmail).mockResolvedValue(inactiveUser);

    const result = await loginUser({
      email: 'test@example.com',
      password: 'correctPassword',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('Account is not active');
    }
  });

  it('should handle login errors', async () => {
    vi.mocked(getUserByEmail).mockRejectedValue(new Error('Database error'));

    const result = await loginUser({
      email: 'test@example.com',
      password: 'correctPassword',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('Login failed');
    }
    expect(logger.error).toHaveBeenCalledWith(
      'Login failed',
      expect.any(Error),
      { category: 'auth' }
    );
  });

  it('should support remember me option', async () => {
    vi.mocked(getUserByEmail).mockResolvedValue(mockUser);
    vi.mocked(createUserToken).mockResolvedValue(mockToken);
    vi.mocked(updateLastLogin).mockResolvedValue(undefined);

    await loginUser({
      email: 'test@example.com',
      password: 'correctPassword',
      rememberMe: true,
    });

    expect(createUserToken).toHaveBeenCalledWith('user1', 168); // 7 days in hours
  });

  it('should use default token expiry without remember me', async () => {
    vi.mocked(getUserByEmail).mockResolvedValue(mockUser);
    vi.mocked(createUserToken).mockResolvedValue(mockToken);
    vi.mocked(updateLastLogin).mockResolvedValue(undefined);

    await loginUser({
      email: 'test@example.com',
      password: 'correctPassword',
    });

    expect(createUserToken).toHaveBeenCalledWith('user1', 1); // 1 hour
  });
});

describe('Auth Service - Registration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret-key-for-testing';
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
  });

  it('should register a new user successfully', async () => {
    vi.mocked(getUserByEmail).mockResolvedValue(null);
    vi.mocked(createUser).mockResolvedValue(mockUser);

    const result = await registerUser({
      email: 'newuser@example.com',
      password: 'StrongP@ss1',
      name: 'New User',
      role: UserRole.MEMBER,
    });

    expect(result.success).toBe(true);
    expect(result.user).toBeDefined();
    expect(result.user?.email).toBe('newuser@example.com');
    expect(result.user).not.toHaveProperty('password');
    expect(createUser).toHaveBeenCalledWith({
      email: 'newuser@example.com',
      password: 'StrongP@ss1',
      name: 'New User',
      role: UserRole.MEMBER,
    });
  });

  it('should fail if email already exists', async () => {
    vi.mocked(getUserByEmail).mockResolvedValue(mockUser);

    const result = await registerUser({
      email: 'test@example.com',
      password: 'StrongP@ss1',
      name: 'New User',
      role: UserRole.MEMBER,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Email already registered');
  });

  it('should fail with weak password - too short', async () => {
    vi.mocked(getUserByEmail).mockResolvedValue(null);

    const result = await registerUser({
      email: 'newuser@example.com',
      password: 'short',
      name: 'New User',
      role: UserRole.MEMBER,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Password is too weak');
  });

  it('should fail with weak password - missing uppercase', async () => {
    vi.mocked(getUserByEmail).mockResolvedValue(null);

    const result = await registerUser({
      email: 'newuser@example.com',
      password: 'nouppercase1',
      name: 'New User',
      role: UserRole.MEMBER,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Password is too weak');
  });

  it('should fail with weak password - missing lowercase', async () => {
    vi.mocked(getUserByEmail).mockResolvedValue(null);

    const result = await registerUser({
      email: 'newuser@example.com',
      password: 'NOLOWER1',
      name: 'New User',
      role: UserRole.MEMBER,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Password is too weak');
  });

  it('should fail with weak password - missing number', async () => {
    vi.mocked(getUserByEmail).mockResolvedValue(null);

    const result = await registerUser({
      email: 'newuser@example.com',
      password: 'NoNumbers',
      name: 'New User',
      role: UserRole.MEMBER,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Password is too weak');
  });

  it('should handle registration errors', async () => {
    vi.mocked(getUserByEmail).mockRejectedValue(new Error('Database error'));

    const result = await registerUser({
      email: 'newuser@example.com',
      password: 'StrongP@ss1',
      name: 'New User',
      role: UserRole.MEMBER,
    });

    expect(result.success).toBe(false);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('Registration failed');
    }
    expect(logger.error).toHaveBeenCalledWith(
      'Registration failed',
      expect.any(Error),
      { category: 'auth' }
    );
  });
});

describe('Auth Service - Logout', () => {
  it('should logout successfully', async () => {
    vi.mocked(revokeUserToken).mockResolvedValue(true);

    const result = await logoutUser('valid-token');

    expect(result.success).toBe(true);
    expect(revokeUserToken).toHaveBeenCalledWith('valid-token');
  });

  it('should handle logout errors', async () => {
    vi.mocked(revokeUserToken).mockRejectedValue(new Error('Database error'));

    const result = await logoutUser('valid-token');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('Logout failed');
    }
    expect(logger.error).toHaveBeenCalledWith(
      'Logout failed',
      expect.any(Error),
      { category: 'auth' }
    );
  });
});

describe('Auth Service - Refresh Token', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret-key-for-testing';
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
  });

  it('should refresh token successfully', async () => {
    const tempResult = {
      user: mockUser,
      token: { refreshToken: 'old-refresh-token', refreshExpiresAt: new Date(Date.now() + 604800000) },
    };

    vi.mocked(require('../repository').getUserByRefreshToken).mockResolvedValue(tempResult);
    vi.mocked(refreshUserToken).mockResolvedValue(mockToken);

    const result = await refreshToken({
      refreshToken: 'old-refresh-token',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.token).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    }
  });

  it('should fail with missing refresh token', async () => {
    const result = await refreshToken({ refreshToken: '' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('REFRESH_TOKEN_REQUIRED');
    }
  });

  it('should fail with invalid refresh token', async () => {
    vi.mocked(require('../repository').getUserByRefreshToken).mockResolvedValue(null);

    const result = await refreshToken({
      refreshToken: 'invalid-token',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('INVALID_REFRESH_TOKEN');
    }
  });

  it('should fail with inactive user', async () => {
    const tempResult = {
      user: { ...mockUser, status: UserStatus.INACTIVE },
      token: { refreshToken: 'valid-token', refreshExpiresAt: new Date(Date.now() + 604800000) },
    };

    vi.mocked(require('../repository').getUserByRefreshToken).mockResolvedValue(tempResult);

    const result = await refreshToken({
      refreshToken: 'valid-token',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('USER_INACTIVE');
    }
  });

  it('should fail with expired refresh token', async () => {
    const tempResult = {
      user: mockUser,
      token: { refreshToken: 'valid-token', refreshExpiresAt: new Date(Date.now() - 1000) },
    };

    vi.mocked(require('../repository').getUserByRefreshToken).mockResolvedValue(tempResult);

    const result = await refreshToken({
      refreshToken: 'valid-token',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('REFRESH_TOKEN_EXPIRED');
    }
  });
});

describe('Auth Service - Password Change', () => {
  it('should change password successfully', async () => {
    vi.mocked(getUserById).mockResolvedValue(mockUser);
    vi.mocked(updateUser).mockResolvedValue(mockUser);
    vi.mocked(revokeAllUserTokens).mockResolvedValue(undefined);

    const result = await changePassword('user1', 'correctPassword', 'NewP@ss1');

    expect(result.success).toBe(true);
    expect(updateUser).toHaveBeenCalledWith('user1', { password: 'NewP@ss1' });
    expect(revokeAllUserTokens).toHaveBeenCalledWith('user1');
  });

  it('should fail with incorrect current password', async () => {
    vi.mocked(getUserById).mockResolvedValue(mockUser);

    const result = await changePassword('user1', 'wrongPassword', 'NewP@ss1');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Current password is incorrect');
  });

  it('should fail with weak new password', async () => {
    vi.mocked(getUserById).mockResolvedValue(mockUser);

    const result = await changePassword('user1', 'correctPassword', 'weak');

    expect(result.success).toBe(false);
    expect(result.error).toBe('New password is too weak');
  });

  it('should handle user not found', async () => {
    vi.mocked(getUserById).mockResolvedValue(null);

    const result = await changePassword('nonexistent', 'password', 'NewP@ss1');

    expect(result.success).toBe(false);
    expect(result.error).toBe('User not found');
  });
});

describe('Auth Service - Password Reset', () => {
  it('should initiate password reset successfully', async () => {
    vi.mocked(getUserByEmail).mockResolvedValue(mockUser);
    vi.mocked(createPasswordResetToken).mockResolvedValue('reset-token');

    const result = await initiatePasswordReset('test@example.com');

    expect(result.success).toBe(true);
    expect(result.token).toBe('reset-token');
  });

  it('should not reveal if user exists on reset initiation', async () => {
    vi.mocked(getUserByEmail).mockResolvedValue(null);

    const result = await initiatePasswordReset('nonexistent@example.com');

    // Should return success even if user doesn't exist (security measure)
    expect(result.success).toBe(true);
  });

  it('should reset password successfully with valid token', async () => {
    vi.mocked(validatePasswordResetToken).mockResolvedValue(mockUser);
    vi.mocked(updateUser).mockResolvedValue(mockUser);
    vi.mocked(deletePasswordResetToken).mockResolvedValue(undefined);
    vi.mocked(revokeAllUserTokens).mockResolvedValue(undefined);

    const result = await resetPassword('valid-token', 'NewP@ss1');

    expect(result.success).toBe(true);
    expect(updateUser).toHaveBeenCalledWith('user1', { password: 'NewP@ss1' });
    expect(deletePasswordResetToken).toHaveBeenCalledWith('valid-token');
    expect(revokeAllUserTokens).toHaveBeenCalledWith('user1');
  });

  it('should fail with invalid reset token', async () => {
    vi.mocked(validatePasswordResetToken).mockResolvedValue(null);

    const result = await resetPassword('invalid-token', 'NewP@ss1');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid or expired reset token');
  });

  it('should fail with weak new password on reset', async () => {
    vi.mocked(validatePasswordResetToken).mockResolvedValue(mockUser);

    const result = await resetPassword('valid-token', 'weak');

    expect(result.success).toBe(false);
    expect(result.error).toBe('New password is too weak');
  });
});

describe('Auth Service - Permission Helpers', () => {
  it('should check if user has permission with exact match', () => {
    const permissions = ['read:tasks', 'write:tasks', 'delete:tasks'];

    expect(hasPermission(permissions, 'read:tasks')).toBe(true);
    expect(hasPermission(permissions, 'admin:users')).toBe(false);
  });

  it('should check wildcard action permissions', () => {
    const permissions = ['read:*', 'write:tasks'];

    expect(hasPermission(permissions, 'read:tasks')).toBe(true);
    expect(hasPermission(permissions, 'read:users')).toBe(true);
    expect(hasPermission(permissions, 'write:tasks')).toBe(true);
  });

  it('should check wildcard resource permissions', () => {
    const permissions = ['*:tasks', 'read:users'];

    expect(hasPermission(permissions, 'read:tasks')).toBe(true);
    expect(hasPermission(permissions, 'write:tasks')).toBe(true);
    expect(hasPermission(permissions, 'read:users')).toBe(true);
  });

  it('should check global wildcard permissions', () => {
    const permissions = ['*:*'];

    expect(hasPermission(permissions, 'read:tasks')).toBe(true);
    expect(hasPermission(permissions, 'admin:users')).toBe(true);
  });

  it('should check if user has any of multiple permissions', () => {
    const permissions = ['read:tasks', 'write:tasks'];

    expect(hasAnyPermission(permissions, ['read:tasks', 'admin:users'])).toBe(true);
    expect(hasAnyPermission(permissions, ['admin:users', 'manage:team'])).toBe(false);
  });

  it('should check if user has all required permissions', () => {
    const permissions = ['read:tasks', 'write:tasks', 'delete:tasks'];

    expect(hasAllPermissions(permissions, ['read:tasks', 'write:tasks'])).toBe(true);
    expect(hasAllPermissions(permissions, ['read:tasks', 'admin:users'])).toBe(false);
  });

  it('should handle empty permissions array', () => {
    const permissions: string[] = [];

    expect(hasPermission(permissions, 'read:tasks')).toBe(false);
    expect(hasAnyPermission(permissions, ['read:tasks'])).toBe(false);
    expect(hasAllPermissions(permissions, [])).toBe(true);
  });
});
