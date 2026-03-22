/**
 * User Management API Routes Tests
 * Tests for /api/users endpoint with search and pagination
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { GET, POST } from '../route';
import { createUser, getAllUsers, getUserByEmail } from '@/lib/auth/repository';
import { UserStatus, UserRole } from '@/lib/auth/types';
import { NextRequest } from 'next/server';

// Mock dependencies
jest.mock('@/lib/auth/repository');
jest.mock('@/lib/db/audit-log');
jest.mock('@/lib/logger');

describe('User Management API - /api/users', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('GET /api/users - List users with search and pagination', () => {
    it('should return paginated list of users', async () => {
      const mockUsers = [
        {
          id: '1',
          email: 'user1@example.com',
          name: 'User One',
          avatar: null,
          role: UserRole.MEMBER,
          status: UserStatus.ACTIVE,
          createdAt: new Date('2024-01-01'),
          lastLoginAt: new Date('2024-01-02'),
        },
        {
          id: '2',
          email: 'user2@example.com',
          name: 'User Two',
          avatar: null,
          role: UserRole.ADMIN,
          status: UserStatus.ACTIVE,
          createdAt: new Date('2024-01-03'),
          lastLoginAt: new Date('2024-01-04'),
        },
      ];

      (getAllUsers as jest.Mock).mockResolvedValue(mockUsers);

      const request = new NextRequest(
        'http://localhost:3000/api/users?page=1&limit=10'
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.users).toHaveLength(2);
      expect(data.data.pagination.currentPage).toBe(1);
      expect(data.data.pagination.totalUsers).toBe(2);
    });

    it('should filter users by search term', async () => {
      const mockUsers = [
        {
          id: '1',
          email: 'john@example.com',
          name: 'John Doe',
          avatar: null,
          role: UserRole.MEMBER,
          status: UserStatus.ACTIVE,
          createdAt: new Date('2024-01-01'),
        },
        {
          id: '2',
          email: 'jane@example.com',
          name: 'Jane Smith',
          avatar: null,
          role: UserRole.MEMBER,
          status: UserStatus.ACTIVE,
          createdAt: new Date('2024-01-02'),
        },
      ];

      (getAllUsers as jest.Mock).mockResolvedValue(mockUsers);

      const request = new NextRequest(
        'http://localhost:3000/api/users?search=john'
      );

      const response = await GET(request);
      const data = await response.json();

      expect(data.data.users).toHaveLength(1);
      expect(data.data.users[0].name).toBe('John Doe');
    });

    it('should filter users by status', async () => {
      const mockUsers = [
        {
          id: '1',
          email: 'active@example.com',
          name: 'Active User',
          avatar: null,
          role: UserRole.MEMBER,
          status: UserStatus.ACTIVE,
          createdAt: new Date('2024-01-01'),
        },
        {
          id: '2',
          email: 'inactive@example.com',
          name: 'Inactive User',
          avatar: null,
          role: UserRole.MEMBER,
          status: UserStatus.INACTIVE,
          createdAt: new Date('2024-01-02'),
        },
      ];

      (getAllUsers as jest.Mock).mockResolvedValue([mockUsers[0]]);

      const request = new NextRequest(
        'http://localhost:3000/api/users?status=active'
      );

      const response = await GET(request);
      const data = await response.json();

      expect(data.data.users).toHaveLength(1);
      expect(data.data.users[0].status).toBe(UserStatus.ACTIVE);
    });

    it('should filter users by role', async () => {
      const mockUsers = [
        {
          id: '1',
          email: 'admin@example.com',
          name: 'Admin User',
          avatar: null,
          role: UserRole.ADMIN,
          status: UserStatus.ACTIVE,
          createdAt: new Date('2024-01-01'),
        },
      ];

      (getAllUsers as jest.Mock).mockResolvedValue(mockUsers);

      const request = new NextRequest(
        'http://localhost:3000/api/users?role=admin'
      );

      const response = await GET(request);
      const data = await response.json();

      expect(data.data.users).toHaveLength(1);
      expect(data.data.users[0].role).toBe(UserRole.ADMIN);
    });

    it('should validate page parameter', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/users?page=0'
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INVALID_PARAMETER');
    });

    it('should validate limit parameter', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/users?limit=101'
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INVALID_PARAMETER');
    });

    it('should validate status parameter', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/users?status=invalid'
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should sort users by name', async () => {
      const mockUsers = [
        {
          id: '1',
          email: 'zebra@example.com',
          name: 'Zebra',
          avatar: null,
          role: UserRole.MEMBER,
          status: UserStatus.ACTIVE,
          createdAt: new Date('2024-01-01'),
        },
        {
          id: '2',
          email: 'apple@example.com',
          name: 'Apple',
          avatar: null,
          role: UserRole.MEMBER,
          status: UserStatus.ACTIVE,
          createdAt: new Date('2024-01-02'),
        },
      ];

      (getAllUsers as jest.Mock).mockResolvedValue(mockUsers);

      const request = new NextRequest(
        'http://localhost:3000/api/users?sort_by=name&sort_order=asc'
      );

      const response = await GET(request);
      const data = await response.json();

      expect(data.data.users[0].name).toBe('Apple');
      expect(data.data.users[1].name).toBe('Zebra');
    });
  });

  describe('POST /api/users - Create user', () => {
    it('should create a new user', async () => {
      const newUserData = {
        email: 'newuser@example.com',
        password: 'password123',
        name: 'New User',
      };

      const mockCreatedUser = {
        id: '123',
        ...newUserData,
        role: UserRole.MEMBER,
        status: UserStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (getUserByEmail as jest.Mock).mockResolvedValue(null);
      (createUser as jest.Mock).mockResolvedValue(mockCreatedUser);

      const request = new NextRequest('http://localhost:3000/api/users', {
        method: 'POST',
        body: JSON.stringify(newUserData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.email).toBe(newUserData.email);
      expect(data.data.name).toBe(newUserData.name);
      expect(createUser).toHaveBeenCalledWith(
        expect.objectContaining({
          email: newUserData.email,
          name: newUserData.name,
          password: newUserData.password,
        })
      );
    });

    it('should validate required fields', async () => {
      const request = new NextRequest('http://localhost:3000/api/users', {
        method: 'POST',
        body: JSON.stringify({ email: 'test@example.com' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should validate email format', async () => {
      const request = new NextRequest('http://localhost:3000/api/users', {
        method: 'POST',
        body: JSON.stringify({
          email: 'invalid-email',
          password: 'password123',
          name: 'Test User',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should validate password length', async () => {
      const request = new NextRequest('http://localhost:3000/api/users', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'short',
          name: 'Test User',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.message).toContain('8 characters');
    });

    it('should check for duplicate email', async () => {
      const existingUser = {
        id: '1',
        email: 'existing@example.com',
        name: 'Existing User',
        password: 'hashed',
        role: UserRole.MEMBER,
        status: UserStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (getUserByEmail as jest.Mock).mockResolvedValue(existingUser);

      const request = new NextRequest('http://localhost:3000/api/users', {
        method: 'POST',
        body: JSON.stringify({
          email: 'existing@example.com',
          password: 'password123',
          name: 'New User',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('USER_EXISTS');
    });

    it('should validate role if provided', async () => {
      (getUserByEmail as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/users', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User',
          role: 'invalid_role',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });
  });
});
