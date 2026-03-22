/**
 * Tests for Health Check API Routes
 */

import { GET, HEAD } from '../route';
import { NextRequest } from 'next/server';

// Mock NextResponse
vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((data, init) => {
      const response = {
        json: data,
        status: init?.status || 200,
        headers: new Map(Object.entries(init?.headers || {}))
      };
      return response as unknown;
    })
  },
  NextRequest: vi.fn()
}));

describe('GET /api/health', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return healthy status', async () => {
    const request = new NextRequest('http://localhost/api/health', {
      method: 'GET'
    });

    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = response.json;
    expect(data.success).toBe(true);
    expect(data.data.status).toBe('healthy');
  });

  it('should include uptime information', async () => {
    const request = new NextRequest('http://localhost/api/health', {
      method: 'GET'
    });

    const response = await GET(request);

    expect(response.json).toHaveProperty('data');
    const data = response.json.data;
    expect(data.uptime).toBeGreaterThanOrEqual(0);
    expect(typeof data.uptime).toBe('number');
  });

  it('should include timestamp', async () => {
    const request = new NextRequest('http://localhost/api/health', {
      method: 'GET'
    });

    const response = await GET(request);

    const data = response.json.data;
    expect(data.timestamp).toBeDefined();
    expect(new Date(data.timestamp)).toBeInstanceOf(Date);
  });

  it('should include version information', async () => {
    const request = new NextRequest('http://localhost/api/health', {
      method: 'GET'
    });

    const response = await GET(request);

    const data = response.json.data;
    expect(data.version).toBeDefined();
    expect(typeof data.version).toBe('string');
  });

  it('should include memory check', async () => {
    const request = new NextRequest('http://localhost/api/health', {
      method: 'GET'
    });

    const response = await GET(request);

    const data = response.json.data;
    expect(data.checks).toHaveProperty('memory');
    expect(data.checks.memory).toHaveProperty('status');
    expect(data.checks.memory).toHaveProperty('used');
    expect(data.checks.memory).toHaveProperty('limit');
    expect(typeof data.checks.memory.used).toBe('number');
    expect(data.checks.memory.used).toBeGreaterThan(0);
  });

  it('should set memory status to warning when over 90% limit', async () => {
    // Mock high memory usage
    const mockMemoryUsage = () => ({ heapUsed: 512 * 1024 * 1024 * 0.95 });
    Object.defineProperty(process, 'memoryUsage', {
      value: mockMemoryUsage,
      configurable: true
    });

    const request = new NextRequest('http://localhost/api/health', {
      method: 'GET'
    });

    const response = await GET(request);

    const data = response.json.data;
    expect(data.checks.memory.status).toBe('warning');
  });

  it('should include node version check', async () => {
    const request = new NextRequest('http://localhost/api/health', {
      method: 'GET'
    });

    const response = await GET(request);

    const data = response.json.data;
    expect(data.checks).toHaveProperty('node');
    expect(data.checks.node).toHaveProperty('status');
    expect(data.checks.node).toHaveProperty('version');
    expect(data.checks.node.status).toBe('ok');
  });

  it('should set correct cache headers', async () => {
    const request = new NextRequest('http://localhost/api/health', {
      method: 'GET'
    });

    const response = await GET(request);

    expect(response.headers.get('Cache-Control')).toBe('no-cache');
    expect(response.headers.get('Content-Type')).toBe('application/json');
  });

  it('should handle errors gracefully', async () => {
    // Mock GET to throw error
    const { GET } = await import('../route');
    const originalGet = GET;
    vi.doMock('../route', async () => ({
      GET: async () => {
        throw new Error('Health check failed');
      }
    }));

    const request = new NextRequest('http://localhost/api/health', {
      method: 'GET'
    });

    const response = await GET(request);

    expect(response.status).toBe(503);
    const data = response.json;
    expect(data.success).toBe(false);
  });
});

describe('HEAD /api/health', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 200 on successful health check', async () => {
    const response = await HEAD();

    expect(response.status).toBe(200);
  });

  it('should return 503 on error', async () => {
    // Mock GET to throw error
    vi.doMock('../route', async () => ({
      GET: async () => {
        throw new Error('Failed');
      }
    }));

    const response = await HEAD();

    expect(response.status).toBe(503);
  });

  it('should return same response as GET', async () => {
    const request = new NextRequest('http://localhost/api/health', {
      method: 'GET'
    });

    const getResponse = await GET(request);
    const headResponse = await HEAD();

    expect(getResponse.status).toBe(headResponse.status);
  });
});
