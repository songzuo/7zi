/**
 * User Avatar Upload API Route Tests
 * Tests for /api/users/[userId]/avatar endpoint
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { Mock } from 'vitest';
import { POST, DELETE } from '../route';
import { getUserById, updateUser } from '@/lib/auth/repository';
import { UserStatus, UserRole } from '@/lib/auth/types';
import { NextRequest } from 'next/server';

// Mock dependencies
vi.mock('@/lib/auth/repository');
vi.mock('@/lib/db/audit-log');
vi.mock('@/lib/logger');
vi.mock('fs/promises', () => ({
  writeFile: vi.fn(),
  mkdir: vi.fn(),
}));
vi.mock('fs', () => ({
  existsSync: vi.fn(),
}));

describe('User Avatar API - /api/users/[userId]/avatar', () => {
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

  describe('POST /api/users/[userId]/avatar - Upload avatar', () => {
    it('should upload avatar successfully', async () => {
      (getUserById as Mock).mockResolvedValue(mockUser);
      (updateUser as Mock).mockResolvedValue({
        ...mockUser,
        avatar: '/uploads/avatars/test.jpg',
      });

      const formData = new FormData();
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      formData.append('avatar', file);

      const request = new NextRequest('http://localhost:3000/api/users/user-123/avatar', {
        method: 'POST',
        body: formData,
      });
      const params = Promise.resolve({ userId: 'user-123' });

      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.avatarUrl).toContain('/uploads/avatars/');
    });

    it('should return 404 if user not found', async () => {
      (getUserById as Mock).mockResolvedValue(null);

      const formData = new FormData();
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      formData.append('avatar', file);

      const request = new NextRequest('http://localhost:3000/api/users/nonexistent/avatar', {
        method: 'POST',
        body: formData,
      });
      const params = Promise.resolve({ userId: 'nonexistent' });

      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('USER_NOT_FOUND');
    });

    it('should return 400 if no file uploaded', async () => {
      (getUserById as Mock).mockResolvedValue(mockUser);

      const formData = new FormData();

      const request = new NextRequest('http://localhost:3000/api/users/user-123/avatar', {
        method: 'POST',
        body: formData,
      });
      const params = Promise.resolve({ userId: 'user-123' });

      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('MISSING_FILE');
    });

    it('should validate file type', async () => {
      (getUserById as Mock).mockResolvedValue(mockUser);

      const formData = new FormData();
      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
      formData.append('avatar', file);

      const request = new NextRequest('http://localhost:3000/api/users/user-123/avatar', {
        method: 'POST',
        body: formData,
      });
      const params = Promise.resolve({ userId: 'user-123' });

      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INVALID_FILE');
      expect(data.error.message).toContain('Invalid file type');
    });

    it('should validate file size', async () => {
      (getUserById as Mock).mockResolvedValue(mockUser);

      const formData = new FormData();
      const largeFile = new File(['x'.repeat(6 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' });
      formData.append('avatar', largeFile);

      const request = new NextRequest('http://localhost:3000/api/users/user-123/avatar', {
        method: 'POST',
        body: formData,
      });
      const params = Promise.resolve({ userId: 'user-123' });

      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INVALID_FILE');
      expect(data.error.message).toContain('too large');
    });

    it('should allow PNG files', async () => {
      (getUserById as Mock).mockResolvedValue(mockUser);
      (updateUser as Mock).mockResolvedValue({
        ...mockUser,
        avatar: '/uploads/avatars/test.png',
      });

      const formData = new FormData();
      const file = new File(['test'], 'test.png', { type: 'image/png' });
      formData.append('avatar', file);

      const request = new NextRequest('http://localhost:3000/api/users/user-123/avatar', {
        method: 'POST',
        body: formData,
      });
      const params = Promise.resolve({ userId: 'user-123' });

      const response = await POST(request, { params });

      expect(response.status).toBe(201);
    });

    it('should allow GIF files', async () => {
      (getUserById as Mock).mockResolvedValue(mockUser);
      (updateUser as Mock).mockResolvedValue({
        ...mockUser,
        avatar: '/uploads/avatars/test.gif',
      });

      const formData = new FormData();
      const file = new File(['test'], 'test.gif', { type: 'image/gif' });
      formData.append('avatar', file);

      const request = new NextRequest('http://localhost:3000/api/users/user-123/avatar', {
        method: 'POST',
        body: formData,
      });
      const params = Promise.resolve({ userId: 'user-123' });

      const response = await POST(request, { params });

      expect(response.status).toBe(201);
    });

    it('should allow WebP files', async () => {
      (getUserById as Mock).mockResolvedValue(mockUser);
      (updateUser as Mock).mockResolvedValue({
        ...mockUser,
        avatar: '/uploads/avatars/test.webp',
      });

      const formData = new FormData();
      const file = new File(['test'], 'test.webp', { type: 'image/webp' });
      formData.append('avatar', file);

      const request = new NextRequest('http://localhost:3000/api/users/user-123/avatar', {
        method: 'POST',
        body: formData,
      });
      const params = Promise.resolve({ userId: 'user-123' });

      const response = await POST(request, { params });

      expect(response.status).toBe(201);
    });
  });

  describe('DELETE /api/users/[userId]/avatar - Remove avatar', () => {
    it('should remove avatar successfully', async () => {
      const userWithAvatar = { ...mockUser, avatar: '/uploads/avatars/old.jpg' };
      (getUserById as Mock).mockResolvedValue(userWithAvatar);
      (updateUser as Mock).mockResolvedValue({
        ...userWithAvatar,
        avatar: '',
      });

      const request = new NextRequest('http://localhost:3000/api/users/user-123/avatar', {
        method: 'DELETE',
      });
      const params = Promise.resolve({ userId: 'user-123' });

      const response = await DELETE(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Avatar removed successfully');
      expect(updateUser).toHaveBeenCalledWith('user-123', { avatar: '' });
    });

    it('should return 404 if user not found', async () => {
      (getUserById as Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/users/nonexistent/avatar', {
        method: 'DELETE',
      });
      const params = Promise.resolve({ userId: 'nonexistent' });

      const response = await DELETE(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('USER_NOT_FOUND');
    });

    it('should return 404 if user has no avatar', async () => {
      (getUserById as Mock).mockResolvedValue(mockUser);

      const request = new NextRequest('http://localhost:3000/api/users/user-123/avatar', {
        method: 'DELETE',
      });
      const params = Promise.resolve({ userId: 'user-123' });

      const response = await DELETE(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('NO_AVATAR');
    });
  });
});
