/**
 * Room Join/Leave API Tests
 */

import { NextRequest } from 'next/server';
import { POST as createRoom } from '../../route';
import { POST as joinRoom } from './route';
import { POST as leaveRoom } from '../leave/route';

function createRequest(method: string, path: string, body?: unknown, headers?: Record<string, string>): NextRequest {
  return new NextRequest(new URL(`http://localhost${path}`), {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe('Room Join API', () => {
  describe('POST /api/rooms/[id]/join', () => {
    it('should return 404 for non-existent room', async () => {
      const request = createRequest('POST', '/api/rooms/non-existent/join');
      const response = await joinRoom(request, { params: Promise.resolve({ id: 'non-existent' }) });
      const result = await response.json();

      expect(response.status).toBe(404);
      expect(result.success).toBe(false);
    });

    it('should join an existing room', async () => {
      // Create a room first
      const createRequest = createRequest('POST', '/api/rooms', { name: 'Join Test Room' });
      const createResponse = await createRoom(createRequest);
      const createResult = await createResponse.json();

      const roomId = createResult.data.id;

      // Join with a different user
      const joinRequest = createRequest(
        'POST',
        `/api/rooms/${roomId}/join`,
        {},
        { 'x-user-id': 'user-2', 'x-user-name': 'Test User 2' }
      );
      const response = await joinRoom(joinRequest, { params: Promise.resolve({ id: roomId }) });
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.data.room).toBeDefined();
    });

    it('should fail with incorrect password for password-protected room', async () => {
      // Create a password-protected room
      const createRequest = createRequest('POST', '/api/rooms', {
        name: 'Protected Room',
        password: 'correct-password',
      });
      const createResponse = await createRoom(createRequest);
      const createResult = await createResponse.json();

      const roomId = createResult.data.id;

      // Try to join without password
      const joinRequest = createRequest(
        'POST',
        `/api/rooms/${roomId}/join`,
        {},
        { 'x-user-id': 'user-3', 'x-user-name': 'Test User 3' }
      );
      const response = await joinRoom(joinRequest, { params: Promise.resolve({ id: roomId }) });
      const result = await response.json();

      expect(response.status).toBe(401);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Password');
    });

    it('should join password-protected room with correct password', async () => {
      // Create a password-protected room
      const createRequest = createRequest('POST', '/api/rooms', {
        name: 'Protected Room 2',
        password: 'correct-password',
      });
      const createResponse = await createRoom(createRequest);
      const createResult = await createResponse.json();

      const roomId = createResult.data.id;

      // Join with correct password
      const joinRequest = createRequest(
        'POST',
        `/api/rooms/${roomId}/join`,
        { password: 'correct-password' },
        { 'x-user-id': 'user-4', 'x-user-name': 'Test User 4' }
      );
      const response = await joinRoom(joinRequest, { params: Promise.resolve({ id: roomId }) });
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
    });
  });
});

describe('Room Leave API', () => {
  describe('POST /api/rooms/[id]/leave', () => {
    it('should return 404 for non-existent room', async () => {
      const request = createRequest('POST', '/api/rooms/non-existent/leave');
      const response = await leaveRoom(request, { params: Promise.resolve({ id: 'non-existent' }) });
      const result = await response.json();

      expect(response.status).toBe(404);
      expect(result.success).toBe(false);
    });

    it('should fail when owner tries to leave', async () => {
      // Create a room
      const createRequest = createRequest('POST', '/api/rooms', { name: 'Leave Test Room' });
      const createResponse = await createRoom(createRequest);
      const createResult = await createResponse.json();

      const roomId = createResult.data.id;

      // Owner tries to leave
      const leaveRequest = createRequest('POST', `/api/rooms/${roomId}/leave`);
      const response = await leaveRoom(leaveRequest, { params: Promise.resolve({ id: roomId }) });
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.success).toBe(false);
      expect(result.error).toContain('owner');
    });
  });
});
