import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createTestApp } from './helpers';

describe('API: /api/agents', () => {
  it('should return 200 for GET request', async () => {
    const app = createTestApp();
    const response = await request(app)
      .get('/api/agents')
      .expect(200);
    expect(response.body).toBeDefined();
  });

  it('should accept POST request for agent creation', async () => {
    const app = createTestApp();
    const response = await request(app)
      .post('/api/agents')
      .send({ name: 'test-agent', type: 'test' })
      .expect(201);
    expect(response.body).toMatchObject({ success: true });
  });

  it('should return proper error for invalid request', async () => {
    const app = createTestApp();
    const response = await request(app)
      .post('/api/agents')
      .send({})
      .expect(400);
    expect(response.body).toHaveProperty('error');
  });
});
