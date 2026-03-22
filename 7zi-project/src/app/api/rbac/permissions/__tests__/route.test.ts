/**
 * Tests for RBAC Permissions API route
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/rbac/permissions/route';
import { NextRequest } from 'next/server';

// Mock dependencies
vi.mock('@/lib/auth/middleware-rbac', () => ({
  withAdmin: vi.fn((request, handler) => {
    return handler(request, { userId: 'admin-user' });
  }),
}));

vi.mock('@/lib/permissions/repository', () => ({
  getAllPermissions: vi.fn(() => [
    'projects:create',
    'projects:read',
    'projects:update',
    'projects:delete',
    'tasks:create',
    'tasks:read',
    'users:read',
    'users:update',
  ]),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
  },
}));

vi.mock('@/lib/api/error-handler', () => ({
  createSuccessResponse: vi.fn((data, status = 200) => {
    return new Response(JSON.stringify(data), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  }),
  createErrorResponse: vi.fn((error) => {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }),
}));

describe('GET /api/rbac/permissions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return all permissions without grouping', async () => {
    const request = new NextRequest('http://localhost/api/rbac/permissions');
    const response = await GET(request);

    expect(response.status).toBe(200);

    const data = await response.json();
    expect(Array.isArray(data.data)).toBe(true);
    expect(data.count).toBeGreaterThan(0);
  });

  it('should group permissions by resource', async () => {
    const request = new NextRequest('http://localhost/api/rbac/permissions?groupBy=resource');
    const response = await GET(request);

    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.data).not.toBeInstanceOf(Array);
    expect(data.data.projects).toBeDefined();
    expect(data.data.tasks).toBeDefined();
    expect(data.data.users).toBeDefined();
  });

  it('should group permissions by action', async () => {
    const request = new NextRequest('http://localhost/api/rbac/permissions?groupBy=action');
    const response = await GET(request);

    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.data).not.toBeInstanceOf(Array);
    expect(data.data.create).toBeDefined();
    expect(data.data.read).toBeDefined();
    expect(data.data.update).toBeDefined();
    expect(data.data.delete).toBeDefined();
  });

  it('should handle invalid groupBy parameter', async () => {
    const request = new NextRequest('http://localhost/api/rbac/permissions?groupBy=invalid');
    const response = await GET(request);

    expect(response.status).toBe(200);

    const data = await response.json();
    expect(Array.isArray(data.data)).toBe(true);
  });

  it('should return correct count', async () => {
    const request = new NextRequest('http://localhost/api/rbac/permissions');
    const response = await GET(request);

    const data = await response.json();
    expect(data.count).toBe(data.data.length);
  });
});
