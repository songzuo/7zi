/**
 * A2A Registry API Route Tests
 *
 * 测试 A2A 注册表 API 端点
 */

import { GET, POST } from '../route';
import { NextRequest } from 'next/server';

// Mock dependencies
vi.mock('@/lib/agent-scheduler/registry', () => ({
  agentRegistry: {
    register: vi.fn(() => ({ success: true, agentId: 'agent-1' })),
    unregister: vi.fn(() => true),
    getAgent: vi.fn(() => null),
    getAllAgents: vi.fn(() => []),
  },
}));

describe('A2A Registry API - GET /api/a2a/registry', () => {
  it('应该返回已注册的代理列表', async () => {
    const request = new NextRequest('http://localhost:3000/api/a2a/registry', {
      method: 'GET',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.agents).toBeInstanceOf(Array);
  });
});

describe('A2A Registry API - POST /api/a2a/registry', () => {
  it('应该注册新代理', async () => {
    const request = new NextRequest('http://localhost:3000/api/a2a/registry', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: 'agent-1',
        name: 'Test Agent',
        capabilities: ['search', 'analysis'],
        endpoint: 'http://localhost:3001',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200); // 或 201
    expect(data.success).toBe(true);
    expect(data.data.agentId).toBeDefined();
  });

  it('应该验证代理注册数据', async () => {
    const request = new NextRequest('http://localhost:3000/api/a2a/registry', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Test Agent',
        // 缺少必填字段
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
  });
});
