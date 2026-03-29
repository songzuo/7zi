/**
 * A2A Queue API Route Tests
 *
 * 测试 A2A 队列管理 API 端点
 */

import { GET } from '../route';
import { NextRequest } from 'next/server';

// Mock agent scheduler
vi.mock('@/lib/agent-scheduler/scheduler', () => ({
  agentScheduler: {
    getQueueStats: vi.fn(() => ({
      total: 10,
      pending: 5,
      running: 3,
      completed: 2,
      failed: 0,
    })),
    getQueue: vi.fn(() => []),
  },
}));

describe('A2A Queue API - GET /api/a2a/queue', () => {
  it('应该返回队列状态', async () => {
    const request = new NextRequest('http://localhost:3000/api/a2a/queue', {
      method: 'GET',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.stats).toBeDefined();
  });

  it('应该包含队列统计信息', async () => {
    const request = new NextRequest('http://localhost:3000/api/a2a/queue', {
      method: 'GET',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(data.data.stats).toHaveProperty('total');
    expect(data.data.stats).toHaveProperty('pending');
    expect(data.data.stats).toHaveProperty('running');
    expect(data.data.stats).toHaveProperty('completed');
    expect(data.data.stats).toHaveProperty('failed');
  });
});
