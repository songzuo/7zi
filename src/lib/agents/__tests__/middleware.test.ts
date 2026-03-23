/**
 * Agent Middleware Tests
 */

import {describe, it, expect, vi, beforeEach} from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { withAgentAuth, withPermissions, withAnyPermission, AgentContext } from '@/lib/agents/middleware';
import { verifyAgentToken } from '@/lib/agents/auth-service';

// Mock dependencies
const mockVerifyAgentToken = vi.fn();
const mockHasPermission = vi.fn();
const mockHasAllPermissions = vi.fn();
const mockUpdateAgentLastActive = vi.fn();

vi.mock('@/lib/agents/auth-service', async () => {
  const actual = await vi.importActual<typeof import('@/lib/agents/auth-service')>('@/lib/agents/auth-service');
  return {
    ...actual,
    verifyAgentToken: mockVerifyAgentToken,
    hasPermission: mockHasPermission,
    hasAllPermissions: mockHasAllPermissions,
  };
});

vi.mock('@/lib/agents/repository', () => ({
  updateAgentLastActive: mockUpdateAgentLastActive,
}));

describe('Agent Middleware', () => {
  let mockRequest: NextRequest;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Create mock request
    mockRequest = new NextRequest('http://localhost:3000/api/test', {
      headers: new Headers({
        'content-type': 'application/json',
      }),
    });
  });

  describe('withAgentAuth', () => {
    it('should reject requests without authorization header', async () => {
      const handler = vi.fn().mockResolvedValue(new NextResponse('OK'));
      
      const response = await withAgentAuth(mockRequest, handler);
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('UNAUTHORIZED');
    });

    it('should reject requests with invalid bearer format', async () => {
      mockRequest.headers.set('authorization', 'Basic abc123');
      
      const handler = vi.fn().mockResolvedValue(new NextResponse('OK'));
      
      const response = await withAgentAuth(mockRequest, handler);
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body.error.code).toBe('UNAUTHORIZED');
    });

    it('should reject requests with invalid token', async () => {
      mockRequest.headers.set('authorization', 'Bearer invalid-token');
      mockVerifyAgentToken.mockResolvedValue(null);
      
      const handler = vi.fn().mockResolvedValue(new NextResponse('OK'));
      
      const response = await withAgentAuth(mockRequest, handler);
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body.error.code).toBe('INVALID_TOKEN');
    });

    it('should call handler with valid token', async () => {
      mockRequest.headers.set('authorization', 'Bearer valid-token');
      mockVerifyAgentToken.mockResolvedValue({
        agentId: 'agent-1',
        role: 'executor',
        permissions: ['read:tasks'],
      });
      
      const handler = vi.fn().mockImplementation(async (_, context: AgentContext) => {
        return NextResponse.json({ 
          success: true, 
          data: { agentId: context.agentId } 
        });
      });
      
      const response = await withAgentAuth(mockRequest, handler);
      const body = await response.json();

      expect(handler).toHaveBeenCalled();
      expect(body.success).toBe(true);
      expect(body.data.agentId).toBe('agent-1');
    });

    it('should return 500 on unexpected errors', async () => {
      mockRequest.headers.set('authorization', 'Bearer valid-token');
      mockVerifyAgentToken.mockRejectedValue(new Error('Unexpected error'));
      
      const handler = vi.fn();
      
      const response = await withAgentAuth(mockRequest, handler);
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.error.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('withPermissions', () => {
    it('should reject when permissions are insufficient', async () => {
      mockRequest.headers.set('authorization', 'Bearer valid-token');
      mockVerifyAgentToken.mockResolvedValue({
        agentId: 'agent-1',
        role: 'executor',
        permissions: ['read:tasks'],
      });
      
      mockHasAllPermissions.mockReturnValue(false);

      const middleware = withPermissions('write:tasks');
      const handler = vi.fn().mockResolvedValue(new NextResponse('OK'));
      
      const response = await middleware(mockRequest, handler);
      const body = await response.json();

      expect(response.status).toBe(403);
      expect(body.error.code).toBe('FORBIDDEN');
    });

    it('should allow when all permissions are present', async () => {
      mockRequest.headers.set('authorization', 'Bearer valid-token');
      mockVerifyAgentToken.mockResolvedValue({
        agentId: 'agent-1',
        role: 'executor',
        permissions: ['read:tasks', 'write:tasks'],
      });
      
      mockHasAllPermissions.mockReturnValue(true);

      const middleware = withPermissions('write:tasks');
      const handler = vi.fn().mockResolvedValue(new NextResponse('OK'));
      
      const response = await middleware(mockRequest, handler);

      expect(handler).toHaveBeenCalled();
      expect(response.status).toBe(200);
    });
  });

  describe('withAnyPermission', () => {
    it('should allow when any permission is present', async () => {
      mockRequest.headers.set('authorization', 'Bearer valid-token');
      mockVerifyAgentToken.mockResolvedValue({
        agentId: 'agent-1',
        role: 'executor',
        permissions: ['read:tasks'],
      });
      
      mockHasPermission.mockImplementation((perms: string[], perm: string) => {
        return perms.includes(perm);
      });

      const middleware = withAnyPermission('write:tasks', 'read:tasks');
      const handler = vi.fn().mockResolvedValue(new NextResponse('OK'));
      
      const response = await middleware(mockRequest, handler);

      expect(handler).toHaveBeenCalled();
      expect(response.status).toBe(200);
    });
  });
});
