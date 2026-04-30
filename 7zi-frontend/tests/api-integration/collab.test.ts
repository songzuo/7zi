import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createTestApp } from './helpers';

describe('API: /api/collab', () => {
  it('should return 200 for GET request', async () => {
    const app = createTestApp();
    const response = await request(app)
      .get('/api/collab')
      .expect(200);
    expect(response.body).toBeDefined();
  });

  it('should handle POST for collaboration session', async () => {
    const app = createTestApp();
    const response = await request(app)
      .post('/api/collab')
      .send({ action: 'create', roomId: 'test-room' })
      .expect(201);
    expect(response.body).toMatchObject({ success: true });
  });

  it('should return error for missing required fields', async () => {
    const app = createTestApp();
    const response = await request(app)
      .post('/api/collab')
      .send({})
      .expect(400);
    expect(response.body).toHaveProperty('error');
  });
});
