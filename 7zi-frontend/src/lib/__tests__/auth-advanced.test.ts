/**
 * Authentication Utility Functions Unit Tests (Additional Tests)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  validateCredentials,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  isSessionExpired,
  isSessionExpiringSoon,
  isValidToken,
  generateToken,
  createSession,
  refreshSession,
  getPasswordStrength,
  canAccessResource,
  getDefaultPermissions,
  createMockUser,
  validateRegistration,
  generateSecurePassword,
  User,
  UserRole,
  Permission,
} from '../auth';

describe('Auth Utils - Advanced Tests', () => {
  describe('validateCredentials', () => {
    it('should validate credentials with email', () => {
      const result = validateCredentials({
        username: 'test@example.com',
        password: 'password123',
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate credentials with username', () => {
      const result = validateCredentials({
        username: 'testuser',
        password: 'password123',
      });

      expect(result.valid).toBe(true);
    });

    it('should reject invalid username/email', () => {
      const result = validateCredentials({
        username: 'invalid@email',
        password: 'password123',
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('用户名或邮箱格式无效');
    });

    it('should reject empty password', () => {
      const result = validateCredentials({
        username: 'test@example.com',
        password: '',
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('密码不能为空');
    });

    it('should reject short password', () => {
      const result = validateCredentials({
        username: 'test@example.com',
        password: '123',
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('密码长度至少为6位');
    });

    it('should accumulate multiple errors', () => {
      const result = validateCredentials({
        username: 'invalid',
        password: '123',
      });

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });

  describe('hasPermission', () => {
    it('should return true for admin with any permission', () => {
      const user: User = {
        id: 'admin-1',
        username: 'admin',
        email: 'admin@example.com',
        role: UserRole.ADMIN,
        permissions: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(hasPermission(user, Permission.DELETE)).toBe(true);
      expect(hasPermission(user, Permission.READ)).toBe(true);
    });

    it('should check user permissions', () => {
      const user: User = {
        id: 'user-1',
        username: 'user',
        email: 'user@example.com',
        role: UserRole.USER,
        permissions: [Permission.READ, Permission.WRITE],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(hasPermission(user, Permission.READ)).toBe(true);
      expect(hasPermission(user, Permission.WRITE)).toBe(true);
      expect(hasPermission(user, Permission.DELETE)).toBe(false);
    });
  });

  describe('hasAnyPermission', () => {
    it('should return true if user has any of the permissions', () => {
      const user: User = {
        id: 'user-1',
        username: 'user',
        email: 'user@example.com',
        role: UserRole.USER,
        permissions: [Permission.READ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = hasAnyPermission(user, [Permission.WRITE, Permission.READ]);

      expect(result).toBe(true);
    });

    it('should return false if user has none of the permissions', () => {
      const user: User = {
        id: 'user-1',
        username: 'user',
        email: 'user@example.com',
        role: UserRole.USER,
        permissions: [Permission.READ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = hasAnyPermission(user, [Permission.WRITE, Permission.DELETE]);

      expect(result).toBe(false);
    });

    it('should return true for admin regardless of permissions', () => {
      const user: User = {
        id: 'admin-1',
        username: 'admin',
        email: 'admin@example.com',
        role: UserRole.ADMIN,
        permissions: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = hasAnyPermission(user, [Permission.WRITE, Permission.DELETE]);

      expect(result).toBe(true);
    });
  });

  describe('hasAllPermissions', () => {
    it('should return true if user has all permissions', () => {
      const user: User = {
        id: 'user-1',
        username: 'user',
        email: 'user@example.com',
        role: UserRole.USER,
        permissions: [Permission.READ, Permission.WRITE],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = hasAllPermissions(user, [Permission.READ, Permission.WRITE]);

      expect(result).toBe(true);
    });

    it('should return false if user is missing some permissions', () => {
      const user: User = {
        id: 'user-1',
        username: 'user',
        email: 'user@example.com',
        role: UserRole.USER,
        permissions: [Permission.READ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = hasAllPermissions(user, [Permission.READ, Permission.WRITE]);

      expect(result).toBe(false);
    });
  });

  describe('isSessionExpired', () => {
    it('should return true for expired session', () => {
      const now = new Date();
      const past = new Date(now.getTime() - 3600000); // 1 hour ago

      const session = {
        token: 'test-token',
        userId: 'user-1',
        expiresAt: past,
        createdAt: new Date(past.getTime() - 3600000),
      };

      expect(isSessionExpired(session)).toBe(true);
    });

    it('should return false for valid session', () => {
      const future = new Date(Date.now() + 3600000); // 1 hour from now

      const session = {
        token: 'test-token',
        userId: 'user-1',
        expiresAt: future,
        createdAt: new Date(),
      };

      expect(isSessionExpired(session)).toBe(false);
    });
  });

  describe('isSessionExpiringSoon', () => {
    it('should return true for session expiring soon', () => {
      const future = new Date(Date.now() + 120000); // 2 minutes from now

      const session = {
        token: 'test-token',
        userId: 'user-1',
        expiresAt: future,
        createdAt: new Date(),
      };

      expect(isSessionExpiringSoon(session, 5)).toBe(true);
    });

    it('should return false for session not expiring soon', () => {
      const future = new Date(Date.now() + 3600000); // 1 hour from now

      const session = {
        token: 'test-token',
        userId: 'user-1',
        expiresAt: future,
        createdAt: new Date(),
      };

      expect(isSessionExpiringSoon(session, 5)).toBe(false);
    });

    it('should handle custom warning time', () => {
      const future = new Date(Date.now() + 60000); // 1 minute from now

      const session = {
        token: 'test-token',
        userId: 'user-1',
        expiresAt: future,
        createdAt: new Date(),
      };

      expect(isSessionExpiringSoon(session, 2)).toBe(true);
      expect(isSessionExpiringSoon(session, 0)).toBe(false);
    });
  });

  describe('isValidToken', () => {
    it('should return true for valid token', () => {
      const token = generateToken();
      expect(isValidToken(token)).toBe(true);
    });

    it('should return false for empty token', () => {
      expect(isValidToken('')).toBe(false);
    });

    it('should return false for token with invalid characters', () => {
      expect(isValidToken('token with spaces')).toBe(false);
      expect(isValidToken('token@special!')).toBe(false);
    });

    it('should return true for token with valid characters', () => {
      expect(isValidToken('abc123-_.')).toBe(true);
      expect(isValidToken('ABC.abc_123')).toBe(true);
    });
  });

  describe('generateToken', () => {
    it('should generate token with default length', () => {
      const token = generateToken();
      expect(token).toHaveLength(32);
      expect(/^[a-zA-Z0-9]+$/.test(token)).toBe(true);
    });

    it('should generate token with custom length', () => {
      const token = generateToken(16);
      expect(token).toHaveLength(16);
    });

    it('should generate different tokens', () => {
      const token1 = generateToken();
      const token2 = generateToken();
      expect(token1).not.toBe(token2);
    });

    it('should only contain valid characters', () => {
      const token = generateToken(100);
      expect(/^[a-zA-Z0-9]+$/.test(token)).toBe(true);
    });
  });

  describe('createSession', () => {
    it('should create session with default expiry', () => {
      const session = createSession('user-123');

      expect(session.userId).toBe('user-123');
      expect(session.token).toBeTruthy();
      expect(session.expiresAt.getTime()).toBeGreaterThan(Date.now());
      expect(session.createdAt).toBeInstanceOf(Date);
    });

    it('should create session with custom expiry', () => {
      const session = createSession('user-123', 120); // 2 hours

      const now = Date.now();
      const expectedExpiry = now + 120 * 60 * 1000;
      const diff = Math.abs(session.expiresAt.getTime() - expectedExpiry);

      expect(diff).toBeLessThan(1000); // Allow 1 second variance
    });

    it('should generate unique tokens', () => {
      const session1 = createSession('user-1');
      const session2 = createSession('user-1');

      expect(session1.token).not.toBe(session2.token);
    });
  });

  describe('refreshSession', () => {
    it('should refresh session with new token', () => {
      const oldSession = createSession('user-123');
      const newSession = refreshSession(oldSession);

      expect(newSession.userId).toBe(oldSession.userId);
      expect(newSession.token).not.toBe(oldSession.token);
      expect(newSession.expiresAt.getTime()).toBeGreaterThan(
        oldSession.expiresAt.getTime()
      );
    });

    it('should refresh session with custom expiry', () => {
      const oldSession = createSession('user-123');
      const newSession = refreshSession(oldSession, 120);

      const diff = newSession.expiresAt.getTime() - newSession.createdAt.getTime();
      const expectedMs = 120 * 60 * 1000;

      expect(Math.abs(diff - expectedMs)).toBeLessThan(1000);
    });
  });

  describe('getPasswordStrength', () => {
    it('should return weak for short passwords', () => {
      const result = getPasswordStrength('short');

      expect(result.strength).toBe('weak');
      expect(result.feedback).toContain('密码长度至少为8位');
    });

    it('should return weak for passwords without complexity', () => {
      const result = getPasswordStrength('password');

      expect(result.strength).toBe('weak');
      expect(result.feedback.length).toBeGreaterThan(0);
    });

    it('should return medium for decent passwords', () => {
      const result = getPasswordStrength('Password123');

      expect(result.strength).toBe('medium');
      // Medium passwords may still have feedback about missing complexity
      // The password 'Password123' is missing special characters
      expect(result.feedback).toContain('密码应包含特殊字符');
    });

    it('should return strong for complex passwords', () => {
      const result = getPasswordStrength('Password123!@#');

      expect(result.strength).toBe('strong');
      expect(result.feedback).toHaveLength(0);
    });

    it('should give higher score for longer passwords', () => {
      const short = getPasswordStrength('Password123');
      const long = getPasswordStrength('Password123456789!@#');

      expect(long.score).toBeGreaterThan(short.score);
    });

    it('should provide specific feedback', () => {
      const result = getPasswordStrength('pass');

      const feedback = result.feedback;
      expect(feedback.length).toBeGreaterThan(0);
      expect(feedback.some(f => f.includes('长度'))).toBe(true);
    });
  });

  describe('canAccessResource', () => {
    it('should allow admin to access any resource', () => {
      const admin: User = {
        id: 'admin-1',
        username: 'admin',
        email: 'admin@example.com',
        role: UserRole.ADMIN,
        permissions: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = canAccessResource(admin, 'other-user-id', Permission.DELETE);

      expect(result).toBe(true);
    });

    it('should allow user to access own resource', () => {
      const user: User = {
        id: 'user-1',
        username: 'user',
        email: 'user@example.com',
        role: UserRole.USER,
        permissions: [Permission.READ, Permission.WRITE],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = canAccessResource(user, 'user-1', Permission.READ);

      expect(result).toBe(true);
    });

    it('should deny user to access others resource without permission', () => {
      const user: User = {
        id: 'user-1',
        username: 'user',
        email: 'user@example.com',
        role: UserRole.USER,
        permissions: [Permission.READ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = canAccessResource(user, 'user-2', Permission.WRITE);

      expect(result).toBe(false);
    });
  });

  describe('getDefaultPermissions', () => {
    it('should return all permissions for admin', () => {
      const permissions = getDefaultPermissions(UserRole.ADMIN);

      expect(permissions).toContain(Permission.READ);
      expect(permissions).toContain(Permission.WRITE);
      expect(permissions).toContain(Permission.DELETE);
      expect(permissions).toContain(Permission.ADMIN);
    });

    it('should return read and write for user', () => {
      const permissions = getDefaultPermissions(UserRole.USER);

      expect(permissions).toContain(Permission.READ);
      expect(permissions).toContain(Permission.WRITE);
      expect(permissions).not.toContain(Permission.DELETE);
    });

    it('should return only read for guest', () => {
      const permissions = getDefaultPermissions(UserRole.GUEST);

      expect(permissions).toContain(Permission.READ);
      expect(permissions).not.toContain(Permission.WRITE);
      expect(permissions).not.toContain(Permission.DELETE);
    });
  });

  describe('validateRegistration', () => {
    it('should validate valid registration data', () => {
      const data = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'Password123',
        confirmPassword: 'Password123',
      };

      const result = validateRegistration(data);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid username', () => {
      const data = {
        username: 'invalid user!',
        email: 'test@example.com',
        password: 'Password123',
        confirmPassword: 'Password123',
      };

      const result = validateRegistration(data);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('用户名'))).toBe(true);
    });

    it('should reject invalid email', () => {
      const data = {
        username: 'testuser',
        email: 'invalid-email',
        password: 'Password123',
        confirmPassword: 'Password123',
      };

      const result = validateRegistration(data);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('邮箱'))).toBe(true);
    });

    it('should reject weak password', () => {
      const data = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'weak',
        confirmPassword: 'weak',
      };

      const result = validateRegistration(data);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('密码'))).toBe(true);
    });

    it('should reject mismatched passwords', () => {
      const data = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'Password123',
        confirmPassword: 'Password456',
      };

      const result = validateRegistration(data);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('两次输入的密码不一致');
    });

    it('should accumulate multiple errors', () => {
      const data = {
        username: 'invalid!',
        email: 'invalid',
        password: 'weak',
        confirmPassword: 'wrong',
      };

      const result = validateRegistration(data);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(2);
    });
  });

  describe('generateSecurePassword', () => {
    it('should generate password with default length', () => {
      const password = generateSecurePassword();

      expect(password).toHaveLength(16);
    });

    it('should generate password with custom length', () => {
      const password = generateSecurePassword(24);

      expect(password).toHaveLength(24);
    });

    it('should include all character types', () => {
      const password = generateSecurePassword(20);

      expect(/[a-z]/.test(password)).toBe(true);
      expect(/[A-Z]/.test(password)).toBe(true);
      expect(/[0-9]/.test(password)).toBe(true);
      expect(/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)).toBe(true);
    });

    it('should generate different passwords', () => {
      const password1 = generateSecurePassword();
      const password2 = generateSecurePassword();

      expect(password1).not.toBe(password2);
    });

    it('should be strong', () => {
      const password = generateSecurePassword();
      const result = getPasswordStrength(password);

      expect(result.strength).toBe('strong');
    });
  });

  describe('createMockUser', () => {
    it('should create mock user with defaults', () => {
      const user = createMockUser();

      expect(user.id).toBe('user-123');
      expect(user.username).toBe('testuser');
      expect(user.email).toBe('test@example.com');
      expect(user.role).toBe(UserRole.USER);
    });

    it('should create mock user with overrides', () => {
      const user = createMockUser({
        username: 'customuser',
        role: UserRole.ADMIN,
      });

      expect(user.username).toBe('customuser');
      expect(user.role).toBe(UserRole.ADMIN);
      expect(user.id).toBe('user-123'); // Default still applies
    });
  });
});
