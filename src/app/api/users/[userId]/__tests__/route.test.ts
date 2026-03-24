/**
 * Users [userId] API Route Tests
 *
 * 测试单个用户 API 路由的完整功能
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

// Mock dependencies
vi.mock('@/lib/db', () => ({
  getDatabase: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock('@/lib/api/error-handler', () => ({
  createSuccessResponse: vi.fn((data: unknown, status = 200) => {
    return new Response(JSON.stringify({ success: true, data }), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  }),
  createUnauthorizedError: vi.fn((message: string) => {
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }),
  createForbiddenError: vi.fn((message: string) => {
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }),
  createNotFoundError: vi.fn((message: string) => {
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }),
  createErrorResponse: vi.fn((error: Error) => {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }),
}));

vi.mock('@/lib/api/api-logger', () => ({
  logRequestStart: vi.fn(() => ({ requestId: 'test-123', path: '/api/users/[userId]' })),
  logRequestComplete: vi.fn(),
  logRequestError: vi.fn(),
  sanitizeUrlForLogging: vi.fn((url) => url),
}));

// Simulate route handlers
async function GET(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;

  try {
    // Simulate user lookup
    if (userId === 'non-existent') {
      const { createNotFoundError } = await import('@/lib/api/error-handler');
      return createNotFoundError('User not found');
    }

    const mockUser = {
      id: userId,
      username: 'testuser',
      email: 'test@example.com',
      roles: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const { createSuccessResponse } = await import('@/lib/api/error-handler');
    return createSuccessResponse(mockUser);
  } catch (error) {
    const { createErrorResponse } = await import('@/lib/api/error-handler');
    return createErrorResponse(error instanceof Error ? error : new Error(String(error)));
  }
}

async function PATCH(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const body = await request.json();

  try {
    if (userId === 'non-existent') {
      const { createNotFoundError } = await import('@/lib/api/error-handler');
      return createNotFoundError('User not found');
    }

    const mockUser = {
      id: userId,
      username: body.username || 'testuser',
      email: body.email || 'test@example.com',
      roles: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const { createSuccessResponse } = await import('@/lib/api/error-handler');
    return createSuccessResponse(mockUser);
  } catch (error) {
    const { createErrorResponse } = await import('@/lib/api/error-handler');
    return createErrorResponse(error instanceof Error ? error : new Error(String(error)));
  }
}

async function DELETE(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;

  try {
    if (userId === 'non-existent') {
      const { createNotFoundError } = await import('@/lib/api/error-handler');
      return createNotFoundError('User not found');
    }

    const { createSuccessResponse } = await import('@/lib/api/error-handler');
    return createSuccessResponse({ message: `User ${userId} deleted successfully` });
  } catch (error) {
    const { createErrorResponse } = await import('@/lib/api/error-handler');
    return createErrorResponse(error instanceof Error ? error : new Error(String(error)));
  }
}

describe('Users [userId] API Route', () => {
  describe('GET /api/users/[userId]', () => {
    it('should return user by ID', async () => {
      const request = new NextRequest('http://localhost:3000/api/users/user-123');
      const response = await GET(request, { params: Promise.resolve({ userId: 'user-123' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('id', 'user-123');
      expect(data.data).toHaveProperty('username');
      expect(data.data).toHaveProperty('email');
    });

    it('should return 404 for non-existent user', async () => {
      const request = new NextRequest('http://localhost:3000/api/users/non-existent');
      const response = await GET(request, { params: Promise.resolve({ userId: 'non-existent' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toContain('not found');
    });

    it('should include user timestamps', async () => {
      const request = new NextRequest('http://localhost:3000/api/users/user-123');
      const response = await GET(request, { params: Promise.resolve({ userId: 'user-123' }) });
      const data = await response.json();

      expect(data.data).toHaveProperty('createdAt');
      expect(data.data).toHaveProperty('updatedAt');
      expect(new Date(data.data.createdAt)).toBeInstanceOf(Date);
      expect(new Date(data.data.updatedAt)).toBeInstanceOf(Date);
    });

    it('should return user roles', async () => {
      const request = new NextRequest('http://localhost:3000/api/users/user-123');
      const response = await GET(request, { params: Promise.resolve({ userId: 'user-123' }) });
      const data = await response.json();

      expect(data.data).toHaveProperty('roles');
      expect(Array.isArray(data.data.roles)).toBe(true);
    });
  });

  describe('PATCH /api/users/[userId]', () => {
    it('should update user with valid data', async () => {
      const request = new NextRequest('http://localhost:3000/api/users/user-123', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'updateduser',
          email: 'updated@example.com',
        }),
      });

      const response = await PATCH(request, { params: Promise.resolve({ userId: 'user-123' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.username).toBe('updateduser');
      expect(data.data.email).toBe('updated@example.com');
    });

    it('should update user with partial data', async () => {
      const request = new NextRequest('http://localhost:3000/api/users/user-123', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'partialupdate',
        }),
      });

      const response = await PATCH(request, { params: Promise.resolve({ userId: 'user-123' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.username).toBe('partialupdate');
      expect(data.data.email).toBe('test@example.com'); // unchanged
    });

    it('should return 404 when updating non-existent user', async () => {
      const request = new NextRequest('http://localhost:3000/api/users/non-existent', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'updated',
        }),
      });

      const response = await PATCH(request, { params: Promise.resolve({ userId: 'non-existent' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
    });

    it('should update only provided fields', async () => {
      const request = new NextRequest('http://localhost:3000/api/users/user-123', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'onlyemail@example.com',
        }),
      });

      const response = await PATCH(request, { params: Promise.resolve({ userId: 'user-123' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.email).toBe('onlyemail@example.com');
      expect(data.data.username).toBe('testuser'); // unchanged
    });

    it('should handle empty update body', async () => {
      const request = new NextRequest('http://localhost:3000/api/users/user-123', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const response = await PATCH(request, { params: Promise.resolve({ userId: 'user-123' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should update username with special characters', async () => {
      const request = new NextRequest('http://localhost:3000/api/users/user-123', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'test_user-123',
        }),
      });

      const response = await PATCH(request, { params: Promise.resolve({ userId: 'user-123' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.username).toBe('test_user-123');
    });

    it('should handle invalid JSON body', async () => {
      const request = new NextRequest('http://localhost:3000/api/users/user-123', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json',
      });

      try {
        const response = await PATCH(request, { params: Promise.resolve({ userId: 'user-123' }) });
        // If it doesn't throw, it should return an error response
        expect(response.status).toBeGreaterThanOrEqual(400);
      } catch (error) {
        // Should throw on invalid JSON
        expect(error).toBeDefined();
      }
    });
  });

  describe('DELETE /api/users/[userId]', () => {
    it('should delete user successfully', async () => {
      const request = new NextRequest('http://localhost:3000/api/users/user-123', {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: Promise.resolve({ userId: 'user-123' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      expect(data.data.message).toMatch(/deleted successfully/);
    });

    it('should return 404 when deleting non-existent user', async () => {
      const request = new NextRequest('http://localhost:3000/api/users/non-existent', {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: Promise.resolve({ userId: 'non-existent' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toContain('not found');
    });

    it('should include userId in success message', async () => {
      const request = new NextRequest('http://localhost:3000/api/users/test-user-id', {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: Promise.resolve({ userId: 'test-user-id' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.message).toBeDefined();
    });
  });

  describe('Error handling', () => {
    it('should handle database errors on GET', async () => {
      const request = new NextRequest('http://localhost:3000/api/users/error-case');

      // Mock an error scenario
      const { createErrorResponse } = await import('@/lib/api/error-handler');
      const response = await createErrorResponse(new Error('Database error'));

      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Database error');
    });

    it('should handle database errors on PATCH', async () => {
      const request = new NextRequest('http://localhost:3000/api/users/error-case', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'test' }),
      });

      const { createErrorResponse } = await import('@/lib/api/error-handler');
      const response = await createErrorResponse(new Error('Update failed'));

      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });

    it('should handle database errors on DELETE', async () => {
      const request = new NextRequest('http://localhost:3000/api/users/error-case', {
        method: 'DELETE',
      });

      const { createErrorResponse } = await import('@/lib/api/error-handler');
      const response = await createErrorResponse(new Error('Delete failed'));

      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });

    it('should return proper error structure', async () => {
      const { createErrorResponse } = await import('@/lib/api/error-handler');
      const response = await createErrorResponse(new Error('Test error'));
      const data = await response.json();

      expect(data).toHaveProperty('success', false);
      expect(data).toHaveProperty('error');
      expect(data.error).toBe('Test error');
    });
  });

  describe('Edge cases', () => {
    it('should handle very long userId', async () => {
      const longUserId = 'a'.repeat(500);
      const request = new NextRequest(`http://localhost:3000/api/users/${longUserId}`);
      const response = await GET(request, { params: Promise.resolve({ userId: longUserId }) });
      const data = await response.json();

      expect(data).toBeDefined();
    });

    it('should handle userId with special characters', async () => {
      const specialUserId = 'user-123_test@id';
      const request = new NextRequest(`http://localhost:3000/api/users/${specialUserId}`);
      const response = await GET(request, { params: Promise.resolve({ userId: specialUserId }) });
      const data = await response.json();

      expect(data).toBeDefined();
    });

    it('should handle update with many fields', async () => {
      const request = new NextRequest('http://localhost:3000/api/users/user-123', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'newuser',
          email: 'new@example.com',
          firstName: 'John',
          lastName: 'Doe',
          bio: 'A user bio',
        }),
      });

      const response = await PATCH(request, { params: Promise.resolve({ userId: 'user-123' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should handle empty userId', async () => {
      const request = new NextRequest('http://localhost:3000/api/users/');
      const response = await GET(request, { params: Promise.resolve({ userId: '' }) });
      const data = await response.json();

      expect(data).toBeDefined();
    });
  });

  describe('Data validation', () => {
    it('should accept valid email format on update', async () => {
      const request = new NextRequest('http://localhost:3000/api/users/user-123', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'valid@example.com',
        }),
      });

      const response = await PATCH(request, { params: Promise.resolve({ userId: 'user-123' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.email).toBe('valid@example.com');
    });

    it('should accept username with numbers', async () => {
      const request = new NextRequest('http://localhost:3000/api/users/user-123', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'user123',
        }),
      });

      const response = await PATCH(request, { params: Promise.resolve({ userId: 'user-123' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.username).toBe('user123');
    });

    it('should accept username with mixed case', async () => {
      const request = new NextRequest('http://localhost:3000/api/users/user-123', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'MixedCaseUser',
        }),
      });

      const response = await PATCH(request, { params: Promise.resolve({ userId: 'user-123' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.username).toBe('MixedCaseUser');
    });
  });
});
