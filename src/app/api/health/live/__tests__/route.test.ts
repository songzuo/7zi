/**
 * Tests for Live Health Check Endpoint
 */

import { GET } from '../route';

// Mock NextResponse and NextRequest
vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((data) => ({
      json: data,
      status: 200
    }))
  },
  NextRequest: vi.fn()
}));

describe('GET /api/health/live', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 200 OK status', async () => {
    const { NextRequest } = await import('next/server');
    const request = new NextRequest('http://localhost/api/health/live', {
      method: 'GET'
    });

    const response = await GET(request);

    expect(response.status).toBe(200);
  });

  it('should return JSON content', async () => {
    const { NextRequest } = await import('next/server');
    const request = new NextRequest('http://localhost/api/health/live', {
      method: 'GET'
    });

    const response = await GET(request);

    expect(response.headers.get('Content-Type')).toBe('application/json');
  });

  it('should include success status', async () => {
    const { NextRequest } = await import('next/server');
    const request = new NextRequest('http://localhost/api/health/live', {
      method: 'GET'
    });

    const response = await GET(request);
    const data = response.json;

    expect(data).toHaveProperty('success');
    expect(data.success).toBe(true);
  });
});
