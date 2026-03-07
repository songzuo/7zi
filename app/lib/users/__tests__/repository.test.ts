/**
 * 用户仓库测试
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  createUser,
  getUserById,
  getUserByEmail,
  getAllUsers,
  updateUser,
  updateUserAvatar,
  deleteUser,
  getUserProfile,
  updateUserProfile,
  initializeUserTables,
} from '../repository';
import { closeDatabase, getDatabaseAsync } from '../../db';

describe('User Repository', () => {
  beforeAll(async () => {
    await initializeUserTables();
  });

  beforeEach(async () => {
    // 清理所有用户数据，确保每个测试独立
    const db = await getDatabaseAsync();
    db.exec('DELETE FROM user_profiles');
    db.exec('DELETE FROM users');
  });

  afterAll(() => {
    closeDatabase();
  });

  describe('createUser', () => {
    it('should create a new user', async () => {
      const user = await createUser({
        name: 'Test User',
        email: 'test@example.com',
        bio: 'Test bio',
      });

      expect(user).toBeDefined();
      expect(user.id).toMatch(/^user_/);
      expect(user.name).toBe('Test User');
      expect(user.email).toBe('test@example.com');
      expect(user.bio).toBe('Test bio');
      expect(user.role).toBe('member');
      expect(user.provider).toBe('system');
    });

    it('should create user with custom role and provider', async () => {
      const user = await createUser({
        name: 'Admin User',
        email: 'admin@example.com',
        role: 'admin',
        provider: 'google',
      });

      expect(user.role).toBe('admin');
      expect(user.provider).toBe('google');
    });
  });

  describe('getUserById', () => {
    it('should return user by id', async () => {
      const created = await createUser({
        name: 'Find Me',
        email: 'findme@example.com',
      });

      const found = await getUserById(created.id);
      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.name).toBe('Find Me');
    });

    it('should return null for non-existent user', async () => {
      const found = await getUserById('non-existent-id');
      expect(found).toBeNull();
    });
  });

  describe('getUserByEmail', () => {
    it('should return user by email', async () => {
      const created = await createUser({
        name: 'Email User',
        email: 'emailuser@example.com',
      });

      const found = await getUserByEmail('emailuser@example.com');
      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
    });

    it('should return null for non-existent email', async () => {
      const found = await getUserByEmail('nonexistent@example.com');
      expect(found).toBeNull();
    });
  });

  describe('getAllUsers', () => {
    it('should return all users', async () => {
      await createUser({ name: 'User 1', email: 'user1@example.com' });
      await createUser({ name: 'User 2', email: 'user2@example.com' });

      const users = await getAllUsers();
      expect(users.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('updateUser', () => {
    it('should update user fields', async () => {
      const created = await createUser({
        name: 'Original Name',
        email: 'update@example.com',
      });

      const updated = await updateUser(created.id, {
        name: 'Updated Name',
        bio: 'New bio',
      });

      expect(updated).toBeDefined();
      expect(updated?.name).toBe('Updated Name');
      expect(updated?.bio).toBe('New bio');
    });

    it('should return null for non-existent user', async () => {
      const updated = await updateUser('non-existent-id', { name: 'New Name' });
      expect(updated).toBeNull();
    });
  });

  describe('updateUserAvatar', () => {
    it('should update user avatar', async () => {
      const created = await createUser({
        name: 'Avatar User',
        email: 'avatar@example.com',
      });

      const updated = await updateUserAvatar(created.id, '/uploads/avatar.png');
      expect(updated?.avatar).toBe('/uploads/avatar.png');
    });
  });

  describe('deleteUser', () => {
    it('should delete user', async () => {
      const created = await createUser({
        name: 'Delete Me',
        email: 'delete@example.com',
      });

      const success = await deleteUser(created.id);
      expect(success).toBe(true);

      const found = await getUserById(created.id);
      expect(found).toBeNull();
    });

    it('should return false for non-existent user', async () => {
      const success = await deleteUser('non-existent-id');
      expect(success).toBe(false);
    });
  });

  describe('User Profile', () => {
    it('should create default profile for user', async () => {
      const user = await createUser({
        name: 'Profile User',
        email: 'profile@example.com',
      });

      const profile = await getUserProfile(user.id);
      expect(profile).toBeDefined();
      expect(profile?.userId).toBe(user.id);
      expect(profile?.displayName).toBe('Profile User');
    });

    it('should update user profile', async () => {
      const user = await createUser({
        name: 'Profile Update',
        email: 'profileupdate@example.com',
      });

      const updated = await updateUserProfile(user.id, {
        displayName: 'New Display Name',
        bio: 'My bio',
        location: 'Beijing',
        website: 'https://example.com',
      });

      expect(updated).toBeDefined();
      expect(updated?.displayName).toBe('New Display Name');
      expect(updated?.bio).toBe('My bio');
      expect(updated?.location).toBe('Beijing');
      expect(updated?.website).toBe('https://example.com');
    });
  });
});