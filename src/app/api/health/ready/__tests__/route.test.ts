/**
 * Tests for Readiness Check Endpoint
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

describe('GET /api/health/ready', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 200 OK when ready', async () => {
    const { NextRequest } = await import('next/server');
    const request = new NextRequest('http://localhost/api/health/ready', {
      method: 'GET'
    });

    const response = await GET(request);

    expect(response.status).toBe(200);
  });

  it('should return JSON content', async () => {
    const { NextRequest } = await import('next/server');
    const request = new NextRequest('http://localhost/api/health/ready', {
      method: 'GET'
    });

    const response = await GET(request);

    expect(response.headers.get('Content-Type')).toBe('application/json');
  });

  it('should include ready status', async () => {
    const { NextRequest } = await import('next/server');
    const request = new NextRequest('http://localhost/api/health/ready', {
      method: 'GET'
    });

    const response = await GET(request);
    const data = response.json;

    expect(data).toHaveProperty('ready');
    expect(data.ready).toBe(true);
  });

  it('should include timestamp', async () => {
    const { NextRequest } = await import('next/server');
    const request = new NextRequest('http://localhost/api/health/ready', {
      method: 'GET'
    });

    const response = await GET(request);
    const data = response.json;

    expect(data).toHaveProperty('timestamp');
    expect(new Date(data.timestamp)).toBeInstanceOf(Date);
  });
});
