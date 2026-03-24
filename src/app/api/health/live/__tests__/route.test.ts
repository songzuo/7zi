// @ts-nocheck - Test file with complex type issues
/**
 * Tests for Live Health Check Endpoint
 */

import { GET } from '../route';

describe('GET /api/health/live', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 200 OK status', async () => {
    const response = await GET();

    expect(response.status).toBe(200);
  });

  it('should return JSON content', async () => {
    const response = await GET();

    expect(response.headers.get('Content-Type')).toBe('application/json');
  });

  it('should include success status', async () => {
    const response = await GET();
    const data = response.json;

    expect(data).toHaveProperty('success');
    expect(data.success).toBe(true);
  });
});
