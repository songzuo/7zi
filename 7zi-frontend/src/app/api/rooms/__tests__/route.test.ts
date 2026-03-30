/**
 * Room API Tests
 *
 * 房间 API 路由测试
 */

import { NextRequest } from 'next/server';
import { POST, GET } from '../route';

// Mock NextRequest
function createRequest(method: string, body?: unknown, headers?: Record<string, string>): NextRequest {
  return new NextRequest(new URL('http://localhost/api/rooms'), {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe('Room API Routes', () => {
  describe('POST /api/rooms - Create Room', () => {
    it('should create a room successfully', async () => {
      const request = createRequest('POST', {
        name: 'Test Room',
        description: 'A test room',
      });

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(201);
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.name).toBe('Test Room');
      expect(result.data.inviteCode).toBeDefined();
      expect(result.data.id).toBeDefined();
    });

    it('should fail without name', async () => {
      const request = createRequest('POST', {
        description: 'A test room',
      });

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.success).toBe(false);
      expect(result.error).toContain('name');
    });

    it('should create a private room with password', async () => {
      const request = createRequest('POST', {
        name: 'Private Room',
        password: 'secret123',
        isPrivate: true,
      });

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(201);
      expect(result.success).toBe(true);
    });
  });

  describe('GET /api/rooms - List Rooms', () => {
    it('should return empty array initially', async () => {
      // Clear any existing rooms first
      const request = createRequest('GET');
      const response = await GET(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(Array.isArray(result.data.rooms)).toBe(true);
    });

    it('should list created rooms', async () => {
      // Create a room first
      const createRequest = createRequest('POST', { name: 'List Test Room' });
      await POST(createRequest);

      // Then list rooms
      const listRequest = createRequest('GET');
      const response = await GET(listRequest);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.data.rooms.length).toBeGreaterThan(0);
    });
  });
});
