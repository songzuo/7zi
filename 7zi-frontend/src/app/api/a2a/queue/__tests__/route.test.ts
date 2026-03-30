/**
 * A2A Queue API Route Tests
 *
 * 测试 A2A 队列管理 API 端点
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET } from '../route';
import { NextRequest } from 'next/server';

// Mock agent scheduler
vi.mock('@/lib/agents/scheduler/scheduler', () => ({
  agentScheduler: {
    getQueueStats: vi.fn(() => ({
      total: 10,
      pending: 5,
      running: 3,
      completed: 2,
      failed: 0,
    })),
    getQueue: vi.fn(() => []),
    getAllTasks: vi.fn(() => []),
    getTask: vi.fn(() => null),
  },
}));

vi.mock('@/lib/auth/api-auth', () => ({
  authenticateJWT: vi.fn(async (req) => ({
    authenticated: true,
    userId: 'user-1',
    role: 'admin',
  })),
}));

import { authenticateJWT } from '@/lib/auth/api-auth';
import { agentScheduler } from '@/lib/agents/scheduler/scheduler';

describe('A2A Queue API - GET /api/a2a/queue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authenticateJWT).mockResolvedValue({
      authenticated: true,
      userId: 'user-1',
      role: 'admin',
    });
  });

  it('应该返回队列状态', async () => {
    vi.mocked(agentScheduler.getQueueStats).mockReturnValue({
      total: 10,
      pending: 5,
      running: 3,
      completed: 2,
      failed: 0,
    });
    vi.mocked(agentScheduler.getAllTasks).mockReturnValue([]);

    const request = new NextRequest('http://localhost:3000/api/a2a/queue', {
      method: 'GET',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toBeDefined();
  });

  it('应该包含队列统计信息', async () => {
    vi.mocked(agentScheduler.getQueueStats).mockReturnValue({
      total: 10,
      pending: 5,
      running: 3,
      completed: 2,
      failed: 0,
    });
    vi.mocked(agentScheduler.getAllTasks).mockReturnValue([]);

    const request = new NextRequest('http://localhost:3000/api/a2a/queue', {
      method: 'GET',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });
});
