/**
 * Tests for Ratings API routes
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GET, POST, GET_RATING, DELETE_RATING, POST_HELPFUL } from '@/app/api/ratings/route';
import { NextRequest } from 'next/server';

// Mock dependencies
vi.mock('@/lib/feedback/anti-spam', () => ({
  detectSpam: vi.fn(() => Promise.resolve({ is_spam: false, reason: '', score: 0 })),
}));

vi.mock('@/lib/db/index', () => ({
  getDatabaseAsync: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock('@/lib/api/api-logger', () => ({
  logRequestStart: vi.fn(() => ({ path: '/api/ratings', method: 'GET' })),
  logRequestComplete: vi.fn(),
  logRequestError: vi.fn(),
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
  createValidationError: vi.fn((message) => {
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }),
  createUnauthorizedError: vi.fn((message) => {
    return new Response(
      JSON.stringify({ error: message }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }),
  createForbiddenError: vi.fn((message) => {
    return new Response(
      JSON.stringify({ error: message }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );
  }),
  createNotFoundError: vi.fn((message) => {
    return new Response(
      JSON.stringify({ error: message }),
      { status: 404, headers: { 'Content-Type': 'application/json' } }
    );
  }),
}));

vi.mock('@/lib/db/query-optimizations', () => ({
  getOptimizedRatingStats: vi.fn(() =>
    Promise.resolve({
      average: 3.5,
      total: 100,
      distribution: { 1: 10, 2: 15, 3: 30, 4: 30, 5: 15 },
    })
  ),
}));

const mockDb = {
  queryRows: vi.fn(),
  exec: vi.fn(),
};

describe('GET /api/ratings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const { getDatabaseAsync } = require('@/lib/db/index');
    getDatabaseAsync.mockResolvedValue(mockDb);
  });

  it('should return ratings list', async () => {
    mockDb.queryRows
      .mockReturnValueOnce([{ total: 5 }])
      .mockReturnValueOnce([
        {
          id: '1',
          user_id: 'user1',
          target_type: 'agent',
          target_id: 'agent1',
          rating: 5,
          title: 'Great!',
          description: 'Excellent work',
          metadata: JSON.stringify({ tags: ['awesome'] }),
          helpful_count: 10,
          not_helpful_count: 1,
          verified: 1,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        },
      ]);

    const request = new NextRequest('http://localhost/api/ratings');
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(Array.isArray(data.ratings)).toBe(true);
    expect(data.meta).toBeDefined();
    expect(data.stats).toBeDefined();
  });

  it('should apply filters', async () => {
    mockDb.queryRows
      .mockReturnValueOnce([{ total: 1 }])
      .mockReturnValueOnce([]);

    const request = new NextRequest(
      'http://localhost/api/ratings?user_id=user1&rating_min=4&status=approved'
    );
    const response = await GET(request);

    expect(response.status).toBe(200);
  });

  it('should handle pagination', async () => {
    mockDb.queryRows
      .mockReturnValueOnce([{ total: 100 }])
      .mockReturnValueOnce([]);

    const request = new NextRequest('http://localhost/api/ratings?page=2&per_page=10');
    const response = await GET(request);

    const data = await response.json();
    expect(data.meta.page).toBe(2);
    expect(data.meta.per_page).toBe(10);
    expect(data.meta.total_pages).toBe(10);
  });

  it('should limit per_page to maximum 100', async () => {
    mockDb.queryRows
      .mockReturnValueOnce([{ total: 0 }])
      .mockReturnValueOnce([]);

    const request = new NextRequest('http://localhost/api/ratings?per_page=200');
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(mockDb.queryRows).toHaveBeenCalledWith(
      expect.any(String),
      expect.arrayContaining([100, expect.any(Number)])
    );
  });
});

describe('POST /api/ratings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const { getDatabaseAsync } = require('@/lib/db/index');
    getDatabaseAsync.mockResolvedValue(mockDb);
  });

  it('should create a new rating', async () => {
    mockDb.queryRows.mockReturnValueOnce(undefined); // No existing rating

    const ratingData = {
      target_type: 'agent',
      target_id: 'agent1',
      rating: 5,
      title: 'Excellent',
      description: 'Great work!',
    };

    const request = new NextRequest('http://localhost/api/ratings', {
      method: 'POST',
      body: JSON.stringify(ratingData),
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(mockDb.exec).toHaveBeenCalled();
  });

  it('should validate required fields', async () => {
    const request = new NextRequest('http://localhost/api/ratings', {
      method: 'POST',
      body: JSON.stringify({ rating: 5 }),
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
  });

  it('should validate rating range', async () => {
    const request = new NextRequest('http://localhost/api/ratings', {
      method: 'POST',
      body: JSON.stringify({
        target_type: 'agent',
        target_id: 'agent1',
        rating: 6,
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
  });

  it('should validate target_type', async () => {
    const request = new NextRequest('http://localhost/api/ratings', {
      method: 'POST',
      body: JSON.stringify({
        target_type: 'invalid',
        target_id: 'agent1',
        rating: 5,
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
  });

  it('should validate title length', async () => {
    const request = new NextRequest('http://localhost/api/ratings', {
      method: 'POST',
      body: JSON.stringify({
        target_type: 'agent',
        target_id: 'agent1',
        rating: 5,
        title: 'a'.repeat(101),
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
  });

  it('should validate description length', async () => {
    const request = new NextRequest('http://localhost/api/ratings', {
      method: 'POST',
      body: JSON.stringify({
        target_type: 'agent',
        target_id: 'agent1',
        rating: 5,
        title: 'Test',
        description: 'a'.repeat(1001),
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
  });

  it('should detect spam', async () => {
    const { detectSpam } = require('@/lib/feedback/anti-spam');
    detectSpam.mockResolvedValueOnce({ is_spam: true, reason: 'Too many submissions', score: 0.9 });

    const request = new NextRequest('http://localhost/api/ratings', {
      method: 'POST',
      body: JSON.stringify({
        target_type: 'agent',
        target_id: 'agent1',
        rating: 5,
        title: 'Spam title',
        description: 'Spam description',
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(401);
  });

  it('should update existing rating', async () => {
    mockDb.queryRows.mockReturnValueOnce({
      id: '1',
      user_id: 'anonymous',
      target_type: 'agent',
      target_id: 'agent1',
      rating: 4,
    });

    const ratingData = {
      target_type: 'agent',
      target_id: 'agent1',
      rating: 5,
      title: 'Updated',
    };

    const request = new NextRequest('http://localhost/api/ratings', {
      method: 'POST',
      body: JSON.stringify(ratingData),
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(mockDb.exec).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE ratings'),
      expect.arrayContaining([5, 'Updated', null, expect.any(String), expect.any(String), expect.anything()])
    );
  });

  it('should handle errors', async () => {
    mockDb.queryRows.mockImplementationOnce(() => {
      throw new Error('Database error');
    });

    const request = new NextRequest('http://localhost/api/ratings', {
      method: 'POST',
      body: JSON.stringify({
        target_type: 'agent',
        target_id: 'agent1',
        rating: 5,
        title: 'Test',
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(500);
  });
});

describe('GET_RATING /api/ratings/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const { getDatabaseAsync } = require('@/lib/db/index');
    getDatabaseAsync.mockResolvedValue(mockDb);
  });

  it('should return single rating', async () => {
    mockDb.queryRows.mockReturnValueOnce({
      id: '1',
      rating: 5,
      metadata: JSON.stringify({ tags: ['great'] }),
    });

    const request = new NextRequest('http://localhost/api/ratings/1');
    const response = await GET_RATING(request, { params: Promise.resolve({ id: '1' }) });

    expect(response.status).toBe(200);
  });

  it('should return 404 for non-existent rating', async () => {
    mockDb.queryRows.mockReturnValueOnce(undefined);

    const request = new NextRequest('http://localhost/api/ratings/999');
    const response = await GET_RATING(request, { params: Promise.resolve({ id: '999' }) });

    expect(response.status).toBe(404);
  });
});

describe('DELETE_RATING /api/ratings/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const { getDatabaseAsync } = require('@/lib/db/index');
    getDatabaseAsync.mockResolvedValue(mockDb);
  });

  it('should delete rating owned by user', async () => {
    mockDb.queryRows.mockReturnValueOnce({
      id: '1',
      user_id: 'user1',
      rating: 5,
    });

    const request = new NextRequest('http://localhost/api/ratings/1', {
      headers: { 'x-user-id': 'user1' },
    });

    const response = await DELETE_RATING(request, { params: Promise.resolve({ id: '1' }) });

    expect(response.status).toBe(200);
    expect(mockDb.exec).toHaveBeenCalledWith('DELETE FROM ratings WHERE id = ?', ['1']);
  });

  it('should allow admin to delete any rating', async () => {
    mockDb.queryRows.mockReturnValueOnce({
      id: '1',
      user_id: 'user1',
      rating: 5,
    });

    const request = new NextRequest('http://localhost/api/ratings/1', {
      headers: { 'x-user-id': 'admin' },
    });

    const response = await DELETE_RATING(request, { params: Promise.resolve({ id: '1' }) });

    expect(response.status).toBe(200);
  });

  it('should forbid deletion of other users ratings', async () => {
    mockDb.queryRows.mockReturnValueOnce({
      id: '1',
      user_id: 'user1',
      rating: 5,
    });

    const request = new NextRequest('http://localhost/api/ratings/1', {
      headers: { 'x-user-id': 'user2' },
    });

    const response = await DELETE_RATING(request, { params: Promise.resolve({ id: '1' }) });

    expect(response.status).toBe(403);
  });

  it('should return 404 for non-existent rating', async () => {
    mockDb.queryRows.mockReturnValueOnce(undefined);

    const request = new NextRequest('http://localhost/api/ratings/999', {
      headers: { 'x-user-id': 'user1' },
    });

    const response = await DELETE_RATING(request, { params: Promise.resolve({ id: '999' }) });

    expect(response.status).toBe(404);
  });
});

describe('POST_HELPFUL /api/ratings/[id]/helpful', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const { getDatabaseAsync } = require('@/lib/db/index');
    getDatabaseAsync.mockResolvedValue(mockDb);
  });

  it('should mark rating as helpful', async () => {
    mockDb.queryRows
      .mockReturnValueOnce({ id: '1', helpful_count: 10, not_helpful_count: 1 })
      .mockReturnValueOnce(undefined) // No existing vote
      .mockReturnValueOnce({ id: '1', helpful_count: 11, not_helpful_count: 1 });

    const request = new NextRequest('http://localhost/api/ratings/1/helpful', {
      method: 'POST',
      body: JSON.stringify({ is_helpful: true }),
      headers: { 'x-user-id': 'user1' },
    });

    const response = await POST_HELPFUL(request, { params: Promise.resolve({ id: '1' }) });

    expect(response.status).toBe(200);
  });

  it('should mark rating as not helpful', async () => {
    mockDb.queryRows
      .mockReturnValueOnce({ id: '1', helpful_count: 10, not_helpful_count: 1 })
      .mockReturnValueOnce(undefined)
      .mockReturnValueOnce({ id: '1', helpful_count: 10, not_helpful_count: 2 });

    const request = new NextRequest('http://localhost/api/ratings/1/helpful', {
      method: 'POST',
      body: JSON.stringify({ is_helpful: false }),
      headers: { 'x-user-id': 'user1' },
    });

    const response = await POST_HELPFUL(request, { params: Promise.resolve({ id: '1' }) });

    expect(response.status).toBe(200);
  });

  it('should update existing vote', async () => {
    mockDb.queryRows
      .mockReturnValueOnce({ id: '1', helpful_count: 10, not_helpful_count: 1 })
      .mockReturnValueOnce({ rating_id: '1', user_id: 'user1', is_helpful: 1 })
      .mockReturnValueOnce({ id: '1', helpful_count: 9, not_helpful_count: 2 });

    const request = new NextRequest('http://localhost/api/ratings/1/helpful', {
      method: 'POST',
      body: JSON.stringify({ is_helpful: false }),
      headers: { 'x-user-id': 'user1' },
    });

    const response = await POST_HELPFUL(request, { params: Promise.resolve({ id: '1' }) });

    expect(response.status).toBe(200);
  });

  it('should validate is_helpful parameter', async () => {
    const request = new NextRequest('http://localhost/api/ratings/1/helpful', {
      method: 'POST',
      body: JSON.stringify({ is_helpful: 'not-a-boolean' }),
    });

    const response = await POST_HELPFUL(request, { params: Promise.resolve({ id: '1' }) });

    expect(response.status).toBe(400);
  });

  it('should return 404 for non-existent rating', async () => {
    mockDb.queryRows.mockReturnValueOnce(undefined);

    const request = new NextRequest('http://localhost/api/ratings/999/helpful', {
      method: 'POST',
      body: JSON.stringify({ is_helpful: true }),
    });

    const response = await POST_HELPFUL(request, { params: Promise.resolve({ id: '999' }) });

    expect(response.status).toBe(404);
  });
});
