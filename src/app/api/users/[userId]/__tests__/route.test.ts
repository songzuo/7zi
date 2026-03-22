/**
 * Single User API Route Tests
 * Tests for /api/users/[userId] endpoint
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { Mock } from 'vitest';
import { GET, PATCH, DELETE } from '../route';
import { getUserById, updateUser, deleteUser } from '@/lib/auth/repository';
import { UserStatus, UserRole } from '@/lib/auth/types';
import { NextRequest } from 'next/server';

// Mock dependencies
vi.mock('@/lib/auth/repository');
vi.mock('@/lib/db/audit-log');
vi.mock('@/lib/logger');

describe('Single User API - /api/users/[userId]', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    password: 'hashed',
    avatar: null,
    role: UserRole.MEMBER,
    roles: [],
    status: UserStatus.ACTIVE,
    permissions: [],
    metadata: {},
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-02'),
    lastLoginAt: new Date('2024-01-03'),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/users/[userId] - Get user details', () => {
    it('should return user details', async () => {
      (getUserById as Mock).mockResolvedValue(mockUser);

      const request = new NextRequest('http://localhost:3000/api/users/user-123');
      const params = Promise.resolve({ userId: 'user-123' });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.id).toBe('user-123');
      expect(data.data.email).toBe('test@example.com');
      expect(data.data.password).toBeUndefined();
    });

    it('should return 404 if user not found', async () => {
      (getUserById as Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/users/nonexistent');
      const params = Promise.resolve({ userId: 'nonexistent' });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('USER_NOT_FOUND');
    });
  });

  describe('PATCH /api/users/[userId] - Update user', () => {
    it('should update user name', async () => {
      const updatedUser = { ...mockUser, name: 'Updated Name' };
      (getUserById as Mock).mockResolvedValue(mockUser);
      (updateUser as Mock).mockResolvedValue(updatedUser);

      const request = new NextRequest('http://localhost:3000/api/users/user-123', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Updated Name' }),
      });
      const params = Promise.resolve({ userId: 'user-123' });

      const response = await PATCH(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.name).toBe('Updated Name');
      expect(updateUser).toHaveBeenCalledWith('user-123', { name: 'Updated Name' });
    });

    it('should update user avatar', async () => {
      const updatedUser = { ...mockUser, avatar: '/uploads/avatars/test.jpg' };
      (getUserById as Mock).mockResolvedValue(mockUser);
      (updateUser as Mock).mockResolvedValue(updatedUser);

      const request = new NextRequest('http://localhost:3000/api/users/user-123', {
        method: 'PATCH',
        body: JSON.stringify({ avatar: '/uploads/avatars/test.jpg' }),
      });
      const params = Promise.resolve({ userId: 'user-123' });

      const response = await PATCH(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.avatar).toBe('/uploads/avatars/test.jpg');
    });

    it('should update user status', async () => {
      const updatedUser = { ...mockUser, status: UserStatus.INACTIVE };
      (getUserById as Mock).mockResolvedValue(mockUser);
      (updateUser as Mock).mockResolvedValue(updatedUser);

      const request = new NextRequest('http://localhost:3000/api/users/user-123', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'inactive' }),
      });
      const params = Promise.resolve({ userId: 'user-123' });

      const response = await PATCH(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.status).toBe(UserStatus.INACTIVE);
    });

    it('should validate role', async () => {
      (getUserById as Mock).mockResolvedValue(mockUser);

      const request = new NextRequest('http://localhost:3000/api/users/user-123', {
        method: 'PATCH',
        body: JSON.stringify({ role: 'invalid_role' }),
      });
      const params = Promise.resolve({ userId: 'user-123' });

      const response = await PATCH(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should validate status', async () => {
      (getUserById as Mock).mockResolvedValue(mockUser);

      const request = new NextRequest('http://localhost:3000/api/users/user-123', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'invalid_status' }),
      });
      const params = Promise.resolve({ userId: 'user-123' });

      const response = await PATCH(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should validate password length', async () => {
      (getUserById as Mock).mockResolvedValue(mockUser);

      const request = new NextRequest('http://localhost:3000/api/users/user-123', {
        method: 'PATCH',
        body: JSON.stringify({ password: 'short' }),
      });
      const params = Promise.resolve({ userId: 'user-123' });

      const response = await PATCH(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should return 404 if user not found', async () => {
      (getUserById as Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/users/nonexistent', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Updated' }),
      });
      const params = Promise.resolve({ userId: 'nonexistent' });

      const response = await PATCH(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('USER_NOT_FOUND');
    });
  });

  describe('DELETE /api/users/[userId] - Delete user', () => {
    it('should delete user', async () => {
      (getUserById as Mock).mockResolvedValue(mockUser);
      (deleteUser as Mock).mockResolvedValue(true);

      const request = new NextRequest('http://localhost:3000/api/users/user-123', {
        method: 'DELETE',
      });
      const params = Promise.resolve({ userId: 'user-123' });

      const response = await DELETE(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('User deleted successfully');
      expect(deleteUser).toHaveBeenCalledWith('user-123');
    });

    it('should return 404 if user not found', async () => {
      (getUserById as Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/users/nonexistent', {
        method: 'DELETE',
      });
      const params = Promise.resolve({ userId: 'nonexistent' });

      const response = await DELETE(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('USER_NOT_FOUND');
    });

    it('should handle deletion failure', async () => {
      (getUserById as Mock).mockResolvedValue(mockUser);
      (deleteUser as Mock).mockResolvedValue(false);

      const request = new NextRequest('http://localhost:3000/api/users/user-123', {
        method: 'DELETE',
      });
      const params = Promise.resolve({ userId: 'user-123' });

      const response = await DELETE(request, { params });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('DELETE_FAILED');
    });
  });
});
