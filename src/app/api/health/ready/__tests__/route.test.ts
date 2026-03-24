/**
 * Tests for Readiness Check Endpoint
 */

import { GET } from '../route';

describe('GET /api/health/ready', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 200 OK when ready', async () => {
    const response = await GET();

    expect(response.status).toBe(200);
  });

  it('should return JSON content', async () => {
    const response = await GET();

    expect(response.headers.get('Content-Type')).toBe('application/json');
  });

  it('should include ready status', async () => {
    const response = await GET();
    const data = await response.json();

    expect(data).toHaveProperty('ready');
    expect(data.ready).toBe(true);
  });

  it('should include timestamp', async () => {
    const response = await GET();
    const data = await response.json();

    expect(data).toHaveProperty('timestamp');
    expect(new Date(data.timestamp)).toBeInstanceOf(Date);
  });
});
