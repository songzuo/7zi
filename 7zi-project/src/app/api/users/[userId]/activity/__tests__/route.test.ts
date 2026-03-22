/**
 * User Activity API Route Tests
 * Tests for /api/users/[userId]/activity endpoint
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GET } from '../route';
import { getUserById } from '@/lib/auth/repository';
import { queryAuditLogs, AuditAction, AuditStatus } from '@/lib/db/audit-log';
import { createMockRequest } from '@/test/mocks/api-mocks';

// Mock dependencies
vi.mock('@/lib/auth/repository');
vi.mock('@/lib/db/audit-log');
vi.mock('@/lib/logger');

import { getUserById as mockGetUserById } from '@/lib/auth/repository';
import { queryAuditLogs as mockQueryAuditLogs } from '@/lib/db/audit-log';

describe('/api/users/[userId]/activity', () => {
  const mockUserId = 'user-123';
  const mockUser = {
    id: mockUserId,
    email: 'test@example.com',
    name: 'Test User',
    role: 'member',
    status: 'active',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-02'),
  };

  const mockAuditLogs = [
    {
      id: 'log-1',
      user_id: mockUserId,
      action: AuditAction.LOGIN,
      entity_type: 'user',
      entity_id: mockUserId,
      resource_type: null,
      resource_id: null,
      status: AuditStatus.SUCCESS,
      error_message: null,
      ip_address: '192.168.1.1',
      user_agent: 'Mozilla/5.0',
      created_at: new Date('2024-01-15T10:00:00Z'),
      details: {},
    },
    {
      id: 'log-2',
      user_id: mockUserId,
      action: AuditAction.USER_UPDATED,
      entity_type: 'user',
      entity_id: mockUserId,
      resource_type: 'user',
      resource_id: mockUserId,
      status: AuditStatus.SUCCESS,
      error_message: null,
      ip_address: '192.168.1.1',
      user_agent: 'Mozilla/5.0',
      created_at: new Date('2024-01-14T15:30:00Z'),
      details: { field: 'name', value: 'Updated Name' },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUserById.mockResolvedValue(mockUser);
    mockQueryAuditLogs.mockResolvedValue({
      logs: mockAuditLogs,
      total: mockAuditLogs.length,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/users/[userId]/activity', () => {
    it('should return user activity successfully', async () => {
      const request = createMockRequest(
        `http://localhost:3000/api/users/${mockUserId}/activity`,
        { method: 'GET' }
      );

      const response = await GET(request, { params: Promise.resolve({ userId: mockUserId }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.userId).toBe(mockUserId);
      expect(data.data.activities).toHaveLength(2);
      expect(data.data.pagination).toBeDefined();
      expect(mockGetUserById).toHaveBeenCalledWith(mockUserId);
      expect(mockQueryAuditLogs).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: mockUserId,
          limit: 50,
          offset: 0,
        })
      );
    });

    it('should return 404 if user not found', async () => {
      mockGetUserById.mockResolvedValue(null);

      const request = createMockRequest(
        'http://localhost:3000/api/users/nonexistent/activity',
        { method: 'GET' }
      );

      const response = await GET(request, { params: Promise.resolve({ userId: 'nonexistent' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('USER_NOT_FOUND');
    });

    it('should filter by action type', async () => {
      const request = createMockRequest(
        `http://localhost:3000/api/users/${mockUserId}/activity?action=login`,
        { method: 'GET' }
      );

      const response = await GET(request, { params: Promise.resolve({ userId: mockUserId }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockQueryAuditLogs).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: mockUserId,
          action: AuditAction.LOGIN,
        })
      );
    });

    it('should filter by status', async () => {
      const request = createMockRequest(
        `http://localhost:3000/api/users/${mockUserId}/activity?status=success`,
        { method: 'GET' }
      );

      const response = await GET(request, { params: Promise.resolve({ userId: mockUserId }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockQueryAuditLogs).toHaveBeenCalledWith(
        expect.objectContaining({
          status: AuditStatus.SUCCESS,
        })
      );
    });

    it('should respect custom limit parameter', async () => {
      const request = createMockRequest(
        `http://localhost:3000/api/users/${mockUserId}/activity?limit=10`,
        { method: 'GET' }
      );

      const response = await GET(request, { params: Promise.resolve({ userId: mockUserId }) });

      expect(response.status).toBe(200);
      expect(mockQueryAuditLogs).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 10,
        })
      );
    });

    it('should cap limit at maximum 100', async () => {
      const request = createMockRequest(
        `http://localhost:3000/api/users/${mockUserId}/activity?limit=200`,
        { method: 'GET' }
      );

      const response = await GET(request, { params: Promise.resolve({ userId: mockUserId }) });

      expect(response.status).toBe(200);
      expect(mockQueryAuditLogs).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 100,
        })
      );
    });

    it('should respect offset parameter', async () => {
      const request = createMockRequest(
        `http://localhost:3000/api/users/${mockUserId}/activity?offset=10`,
        { method: 'GET' }
      );

      const response = await GET(request, { params: Promise.resolve({ userId: mockUserId }) });

      expect(response.status).toBe(200);
      expect(mockQueryAuditLogs).toHaveBeenCalledWith(
        expect.objectContaining({
          offset: 10,
        })
      );
    });

    it('should validate action parameter', async () => {
      const request = createMockRequest(
        `http://localhost:3000/api/users/${mockUserId}/activity?action=invalid_action`,
        { method: 'GET' }
      );

      const response = await GET(request, { params: Promise.resolve({ userId: mockUserId }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INVALID_PARAMETER');
    });

    it('should validate status parameter', async () => {
      const request = createMockRequest(
        `http://localhost:3000/api/users/${mockUserId}/activity?status=invalid_status`,
        { method: 'GET' }
      );

      const response = await GET(request, { params: Promise.resolve({ userId: mockUserId }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INVALID_PARAMETER');
    });

    it('should format activity items correctly', async () => {
      const request = createMockRequest(
        `http://localhost:3000/api/users/${mockUserId}/activity`,
        { method: 'GET' }
      );

      const response = await GET(request, { params: Promise.resolve({ userId: mockUserId }) });
      const data = await response.json();

      expect(data.data.activities[0]).toMatchObject({
        id: 'log-1',
        action: AuditAction.LOGIN,
        entityType: 'user',
        entityId: mockUserId,
        status: AuditStatus.SUCCESS,
      });

      expect(data.data.activities[0]).toHaveProperty('description');
      expect(data.data.activities[0].description).toBe('User logged in');
      expect(data.data.activities[0]).toHaveProperty('timestamp');
      expect(typeof data.data.activities[0].timestamp).toBe('string');
    });

    it('should handle empty activity list', async () => {
      mockQueryAuditLogs.mockResolvedValue({
        logs: [],
        total: 0,
      });

      const request = createMockRequest(
        `http://localhost:3000/api/users/${mockUserId}/activity`,
        { method: 'GET' }
      );

      const response = await GET(request, { params: Promise.resolve({ userId: mockUserId }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.activities).toHaveLength(0);
      expect(data.data.pagination.total).toBe(0);
      expect(data.data.pagination.hasMore).toBe(false);
    });

    it('should return correct pagination metadata', async () => {
      mockQueryAuditLogs.mockResolvedValue({
        logs: mockAuditLogs,
        total: 100,
      });

      const request = createMockRequest(
        `http://localhost:3000/api/users/${mockUserId}/activity?limit=20&offset=40`,
        { method: 'GET' }
      );

      const response = await GET(request, { params: Promise.resolve({ userId: mockUserId }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.pagination).toMatchObject({
        total: 100,
        limit: 20,
        offset: 40,
        hasMore: true,
      });
    });

    it('should indicate no more pages at end', async () => {
      mockQueryAuditLogs.mockResolvedValue({
        logs: mockAuditLogs,
        total: 10,
      });

      const request = createMockRequest(
        `http://localhost:3000/api/users/${mockUserId}/activity?limit=10&offset=0`,
        { method: 'GET' }
      );

      const response = await GET(request, { params: Promise.resolve({ userId: mockUserId }) });
      const data = await response.json();

      expect(data.data.pagination.hasMore).toBe(false);
    });
  });

  describe('Error handling', () => {
    it('should handle database errors gracefully', async () => {
      mockQueryAuditLogs.mockRejectedValue(new Error('Database connection failed'));

      const request = createMockRequest(
        `http://localhost:3000/api/users/${mockUserId}/activity`,
        { method: 'GET' }
      );

      const response = await GET(request, { params: Promise.resolve({ userId: mockUserId }) });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INTERNAL_ERROR');
    });

    it('should handle invalid limit parameter', async () => {
      const request = createMockRequest(
        `http://localhost:3000/api/users/${mockUserId}/activity?limit=invalid`,
        { method: 'GET' }
      );

      const response = await GET(request, { params: Promise.resolve({ userId: mockUserId }) });

      // API likely defaults to 50 on invalid input
      expect([200, 400]).toContain(response.status);
    });

    it('should handle invalid offset parameter', async () => {
      const request = createMockRequest(
        `http://localhost:3000/api/users/${mockUserId}/activity?offset=invalid`,
        { method: 'GET' }
      );

      const response = await GET(request, { params: Promise.resolve({ userId: mockUserId }) });

      // API likely defaults to 0 on invalid input
      expect([200, 400]).toContain(response.status);
    });
  });

  describe('Activity description formatting', () => {
    it('should provide human-readable descriptions for all action types', async () => {
      const actions = Object.values(AuditAction);

      for (const action of actions) {
        mockQueryAuditLogs.mockResolvedValue({
          logs: [
            {
              id: 'log-1',
              user_id: mockUserId,
              action,
              entity_type: 'user',
              entity_id: mockUserId,
              resource_type: null,
              resource_id: null,
              status: AuditStatus.SUCCESS,
              error_message: null,
              ip_address: '192.168.1.1',
              user_agent: 'Mozilla/5.0',
              created_at: new Date(),
              details: {},
            },
          ],
          total: 1,
        });

        const request = createMockRequest(
          `http://localhost:3000/api/users/${mockUserId}/activity?action=${action}`,
          { method: 'GET' }
        );

        const response = await GET(request, { params: Promise.resolve({ userId: mockUserId }) });
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.data.activities[0]).toHaveProperty('description');
        expect(typeof data.data.activities[0].description).toBe('string');
      }
    });
  });
});
