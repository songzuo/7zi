/**
 * 用户 API 路由测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GET, POST } from '../route';
import { NextRequest } from 'next/server';

// Mock 用户仓库
vi.mock('@/lib/users/repository', () => ({
  getAllUsers: vi.fn(),
  createUser: vi.fn(),
  initializeUserTables: vi.fn(),
}));

const mockGetAllUsers = vi.mocked(
  await import('@/lib/users/repository').then(m => m.getAllUsers)
);
const mockCreateUser = vi.mocked(
  await import('@/lib/users/repository').then(m => m.createUser)
);

describe('Users API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('GET /api/users', () => {
    it('should return all users', async () => {
      const mockUsers = [
        {
          id: 'user_1',
          name: 'User 1',
          email: 'user1@example.com',
          role: 'member',
          provider: 'system',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'user_2',
          name: 'User 2',
          email: 'user2@example.com',
          role: 'admin',
          provider: 'google',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockGetAllUsers.mockResolvedValueOnce(mockUsers);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.users).toHaveLength(2);
      expect(data.users[0].name).toBe('User 1');
    });

    it('should handle errors', async () => {
      mockGetAllUsers.mockRejectedValueOnce(new Error('Database error'));

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch users');
    });
  });

  describe('POST /api/users', () => {
    it('should create a new user', async () => {
      const newUser = {
        id: 'user_new',
        name: 'New User',
        email: 'new@example.com',
        role: 'member',
        provider: 'system',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockCreateUser.mockResolvedValueOnce(newUser);

      const request = new NextRequest('http://localhost/api/users', {
        method: 'POST',
        body: JSON.stringify({
          name: 'New User',
          email: 'new@example.com',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.user.name).toBe('New User');
      expect(data.user.email).toBe('new@example.com');
    });

    it('should return 400 if name is missing', async () => {
      const request = new NextRequest('http://localhost/api/users', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Name is required');
    });

    it('should return 400 if email is missing', async () => {
      const request = new NextRequest('http://localhost/api/users', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test User',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Email is required');
    });

    it('should return 409 if email already exists', async () => {
      mockCreateUser.mockRejectedValueOnce(
        new Error('UNIQUE constraint failed: users.email')
      );

      const request = new NextRequest('http://localhost/api/users', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Duplicate User',
          email: 'existing@example.com',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toBe('Email already exists');
    });
  });
});