/**
 * Room Detail API Tests
 *
 * 房间详情 API 测试
 */

import { NextRequest } from 'next/server';
import { POST } from '../../route';
import { GET } from '../route';

// Mock NextRequest
function createRequest(method: string, path: string, body?: unknown): NextRequest {
  return new NextRequest(new URL(`http://localhost${path}`), {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe('Room Detail API', () => {
  describe('GET /api/rooms/[id]', () => {
    it('should return 404 for non-existent room', async () => {
      const request = createRequest('GET', '/api/rooms/non-existent-id');
      const response = await GET(request, { params: Promise.resolve({ id: 'non-existent-id' }) });
      const result = await response.json();

      expect(response.status).toBe(404);
      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should return room details for existing room', async () => {
      // Create a room first
      const createRequest = createRequest('POST', '/api/rooms', { name: 'Detail Test Room' });
      const createResponse = await POST(createRequest);
      const createResult = await createResponse.json();

      // Get room details
      const roomId = createResult.data.id;
      const getRequest = createRequest('GET', `/api/rooms/${roomId}`);
      const response = await GET(getRequest, { params: Promise.resolve({ id: roomId }) });
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.data.room).toBeDefined();
      expect(result.data.room.name).toBe('Detail Test Room');
      expect(result.data.participants).toBeDefined();
      expect(Array.isArray(result.data.participants)).toBe(true);
    });
  });
});
