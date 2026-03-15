/**
 * 测试 src/app/api/comments 路由
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET, POST } from '@/app/api/comments/route';
import { NextRequest } from 'next/server';

// Mock the in-memory store
vi.mock('@/lib/store/array-store', () => ({
  ArrayStore: {
    getInstance: vi.fn(() => ({
      getAll: vi.fn(() => []),
      getById: vi.fn(() => null),
      create: vi.fn((data) => ({ id: 'comment-test-1', ...data })),
      update: vi.fn(),
      delete: vi.fn(),
      findBy: vi.fn(() => []),
    })),
  },
}));

describe('/api/comments', () => {
  describe('GET', () => {
    it('should return comments for a specific post', async () => {
      const url = new URL('http://localhost/api/comments?postId=post-001');
      const request = new NextRequest(url);
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
    });

    it('should return all comments when no postId provided', async () => {
      const url = new URL('http://localhost/api/comments');
      const request = new NextRequest(url);
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should filter by author when provided', async () => {
      const url = new URL('http://localhost/api/comments?author=John');
      const request = new NextRequest(url);
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe('POST', () => {
    it('should create a new comment with valid data', async () => {
      const url = new URL('http://localhost/api/comments');
      const request = new NextRequest(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId: 'post-001',
          author: 'Test User',
          content: 'This is a test comment',
        }),
      });
      
      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('id');
      expect(data.data.author).toBe('Test User');
      expect(data.data.content).toBe('This is a test comment');
    });

    it('should reject comment without postId', async () => {
      const url = new URL('http://localhost/api/comments');
      const request = new NextRequest(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          author: 'Test User',
          content: 'This is a test comment',
        }),
      });
      
      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should reject comment without author', async () => {
      const url = new URL('http://localhost/api/comments');
      const request = new NextRequest(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId: 'post-001',
          content: 'This is a test comment',
        }),
      });
      
      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should reject comment without content', async () => {
      const url = new URL('http://localhost/api/comments');
      const request = new NextRequest(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId: 'post-001',
          author: 'Test User',
        }),
      });
      
      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should reject comment with content exceeding limit', async () => {
      const url = new URL('http://localhost/api/comments');
      const longContent = 'a'.repeat(5001);
      const request = new NextRequest(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId: 'post-001',
          author: 'Test User',
          content: longContent,
        }),
      });
      
      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });
  });
});
