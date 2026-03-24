/**
// @ts-expect-error - Mock type compatibility issues
 * Auth Module Tests
 * Tests for authentication service, repository, and middleware
 */

import {describe, it, expect, beforeEach, afterEach} from 'vitest';
import {
  registerUser,
  loginUser,
  logoutUser,
  refreshToken,
  changePassword,
  initiatePasswordReset,
  resetPassword,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
} from '../service';
import {
  createUser,
  getUserByEmail,
  getUserById,
  updateUser,
  deleteUser,
  hashPassword,
  verifyPassword,
  createPasswordResetToken,
  validatePasswordResetToken,
  deletePasswordResetToken,
  revokeAllUserTokens,
} from '../repository';
import { UserRole, UserStatus } from '../types';

describe('Auth Repository', () => {
  describe('Password Utils', () => {
    it('should hash and verify passwords correctly', () => {
      const password = 'TestPassword123!';
      const hashed = hashPassword(password);

      expect(hashed).not.toBe(password);
      expect(hashed).toContain(':');
      expect(verifyPassword(password, hashed)).toBe(true);
      expect(verifyPassword('wrongpassword', hashed)).toBe(false);
    });

    it('should generate different hashes for the same password', () => {
      const password = 'TestPassword123!';
      const hash1 = hashPassword(password);
      const hash2 = hashPassword(password);

      expect(hash1).not.toBe(hash2);
      expect(verifyPassword(password, hash1)).toBe(true);
      expect(verifyPassword(password, hash2)).toBe(true);
    });
  });

  describe('User CRUD', () => {
    let userId: string;

    beforeEach(async () => {
      // Create a test user
      const user = await createUser({
        email: 'test@example.com',
        password: 'TestPassword123!',
        name: 'Test User',
        role: UserRole.MEMBER,
      });
      userId = user.id;
    });

    afterEach(async () => {
      // Clean up
      await deleteUser(userId);
    });

    it('should create a user with hashed password', async () => {
      const user = await getUserById(userId);

      expect(user).toBeTruthy();
      expect(user?.email).toBe('test@example.com');
      expect(user?.name).toBe('Test User');
      expect(user?.role).toBe(UserRole.MEMBER);
      expect(user?.status).toBe(UserStatus.ACTIVE);
      expect(user?.password).not.toBe('TestPassword123!');
      expect(verifyPassword('TestPassword123!', user!.password)).toBe(true);
    });

    it('should find user by email', async () => {
      const user = await getUserByEmail('test@example.com');

      expect(user).toBeTruthy();
      expect(user?.id).toBe(userId);
      expect(user?.email).toBe('test@example.com');
    });

    it('should update user information', async () => {
      const updated = await updateUser(userId, {
        name: 'Updated Name',
        role: UserRole.MANAGER,
      });

      expect(updated).toBeTruthy();
      expect(updated?.name).toBe('Updated Name');
      expect(updated?.role).toBe(UserRole.MANAGER);
    });

    it('should change user password', async () => {
      const user = await getUserById(userId);
      const oldPassword = user!.password;

      await updateUser(userId, {
        password: 'NewPassword456!',
      });

      const updated = await getUserById(userId);
      expect(updated?.password).not.toBe(oldPassword);
      expect(verifyPassword('NewPassword456!', updated!.password)).toBe(true);
      expect(verifyPassword('TestPassword123!', updated!.password)).toBe(false);
    });

    it('should delete user', async () => {
      await deleteUser(userId);
      const user = await getUserById(userId);

      expect(user).toBeNull();
    });
  });

  describe('Password Reset', () => {
    let userId: string;

    beforeEach(async () => {
      const user = await createUser({
        email: 'reset@example.com',
        password: 'TestPassword123!',
        name: 'Reset User',
      });
      userId = user.id;
    });

    afterEach(async () => {
      await deleteUser(userId);
    });

    it('should create and validate reset token', async () => {
      const token = await createPasswordResetToken(userId, 1);

      expect(token).toBeTruthy();
      expect(token.length).toBeGreaterThan(0);

      const user = await validatePasswordResetToken(token);
      expect(user).toBeTruthy();
      expect(user?.id).toBe(userId);
    });

    it('should invalidate reset token after use', async () => {
      const token = await createPasswordResetToken(userId, 1);

      // Delete the token
      await deletePasswordResetToken(token);

      // Should not find user with deleted token
      const user = await validatePasswordResetToken(token);
      expect(user).toBeNull();
    });
  });
});

describe('Auth Service', () => {
  describe('Registration', () => {
    it('should register a new user', async () => {
      const result = await registerUser({
        email: 'newuser@example.com',
        password: 'SecurePass123!',
        name: 'New User',
      });

      expect(result.success).toBe(true);
      expect(result.user).toBeTruthy();
      expect(result.user?.email).toBe('newuser@example.com');

      // Clean up
      if (result.user) {
        await deleteUser(result.user.id);
      }
    });

    it('should reject duplicate email', async () => {
      // Create first user
      await registerUser({
        email: 'duplicate@example.com',
        password: 'SecurePass123!',
        name: 'First User',
      });

      // Try to create second user with same email
      const result = await registerUser({
        email: 'duplicate@example.com',
        password: 'SecurePass123!',
        name: 'Second User',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('already');

      // Clean up
      const user = await getUserByEmail('duplicate@example.com');
      if (user) await deleteUser(user.id);
    });

    it('should reject weak passwords', async () => {
      const weakPasswords = [
        '123',
        'password',
        'PASSWORD',
        '12345678',
        'Password',
        'password123',
      ];

      for (const password of weakPasswords) {
        const result = await registerUser({
          email: `test${Math.random()}@example.com`,
          password,
          name: 'Test User',
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain('weak');
      }
    });
  });

  describe('Login', () => {
    let userId: string;

    beforeEach(async () => {
      const user = await createUser({
        email: 'login@example.com',
        password: 'LoginPass123!',
        name: 'Login User',
        role: UserRole.MEMBER,
      });
      userId = user.id;
    });

    afterEach(async () => {
      await deleteUser(userId);
    });

    it('should login with valid credentials', async () => {
      const result = await loginUser({
        email: 'login@example.com',
        password: 'LoginPass123!',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.user).toBeTruthy();
        expect(result.token).toBeTruthy();
        expect(result.refreshToken).toBeTruthy();
        expect(result.expiresAt).toBeTruthy();
      }
    });

    it('should reject invalid email', async () => {
      const result = await loginUser({
        email: 'wrong@example.com',
        password: 'LoginPass123!',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Invalid');
      }
    });

    it('should reject invalid password', async () => {
      const result = await loginUser({
        email: 'login@example.com',
        password: 'WrongPassword!',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Invalid');
      }
    });
  });

  describe('Permission Checking', () => {
    it('should check exact permission match', () => {
      const permissions = ['read:tasks', 'write:tasks', 'manage:users'];

      expect(hasPermission(permissions, 'read:tasks')).toBe(true);
      expect(hasPermission(permissions, 'write:tasks')).toBe(true);
      expect(hasPermission(permissions, 'delete:tasks')).toBe(false);
    });

    it('should check wildcard permissions', () => {
      const permissions = ['read:*', 'write:*', 'admin:*'];

      expect(hasPermission(permissions, 'read:tasks')).toBe(true);
      expect(hasPermission(permissions, 'write:users')).toBe(true);
      expect(hasPermission(permissions, 'admin:system')).toBe(true);
      expect(hasPermission(permissions, 'delete:tasks')).toBe(false);
    });

    it('should check any permission', () => {
      const permissions = ['read:tasks', 'write:tasks'];

      expect(hasAnyPermission(permissions, ['read:tasks', 'delete:users'])).toBe(true);
      expect(hasAnyPermission(permissions, ['write:users', 'delete:users'])).toBe(false);
      expect(hasAnyPermission(permissions, ['delete:tasks', 'delete:users'])).toBe(false);
    });

    it('should check all permissions', () => {
      const permissions = ['read:tasks', 'write:tasks'];

      expect(hasAllPermissions(permissions, ['read:tasks', 'write:tasks'])).toBe(true);
      expect(hasAllPermissions(permissions, ['read:tasks'])).toBe(true);
      expect(hasAllPermissions(permissions, ['read:tasks', 'delete:tasks'])).toBe(false);
    });
  });

  describe('Password Change', () => {
    let userId: string;

    beforeEach(async () => {
      const user = await createUser({
        email: 'changepass@example.com',
        password: 'OldPassword123!',
        name: 'Change Pass User',
      });
      userId = user.id;
    });

    afterEach(async () => {
      await deleteUser(userId);
    });

    it('should change password with valid current password', async () => {
      const result = await changePassword(userId, 'OldPassword123!', 'NewPassword456!');

      expect(result.success).toBe(true);

      // Verify login with new password works
      const loginResult = await loginUser({
        email: 'changepass@example.com',
        password: 'NewPassword456!',
      });

      expect(loginResult.success).toBe(true);
    });

    it('should reject wrong current password', async () => {
      const result = await changePassword(userId, 'WrongPassword!', 'NewPassword456!');

      expect(result.success).toBe(false);
      expect(result.error).toContain('incorrect');
    });

    it('should reject weak new password', async () => {
      const result = await changePassword(userId, 'OldPassword123!', 'weak');

      expect(result.success).toBe(false);
      expect(result.error).toContain('weak');
    });
  });

  describe('Password Reset', () => {
    let userId: string;

    beforeEach(async () => {
      const user = await createUser({
        email: 'reset@example.com',
        password: 'OldPassword123!',
        name: 'Reset User',
      });
      userId = user.id;
    });

    afterEach(async () => {
      await deleteUser(userId);
    });

    it('should initiate password reset', async () => {
      const result = await initiatePasswordReset('reset@example.com');

      expect(result.success).toBe(true);
      expect(result.token).toBeTruthy();
    });

    it('should reset password with valid token', async () => {
      // Initiate reset
      const initResult = await initiatePasswordReset('reset@example.com');
      expect(initResult.success).toBe(true);

      // Reset password
      const resetResult = await resetPassword(initResult.token!, 'NewPassword456!');
      expect(resetResult.success).toBe(true);

      // Verify login with new password
      const loginResult = await loginUser({
        email: 'reset@example.com',
        password: 'NewPassword456!',
      });
      expect(loginResult.success).toBe(true);
    });

    it('should reject invalid reset token', async () => {
      const result = await resetPassword('invalid-token', 'NewPassword456!');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid');
    });
  });
});
