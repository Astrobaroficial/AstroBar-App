import request from 'supertest';
import { createTestApp } from '../testApp';

const app = createTestApp();

describe('Smoke: core availability', () => {
  it('responds on /health', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'ok');
  });

  it('responds on /api/health', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'ok');
    expect(res.body).toHaveProperty('environment');
  });

  it('returns 401 on protected route without token', async () => {
    const res = await request(app).get('/api/connect/status');
    expect(res.status).toBe(401);
  });

  it('returns 404 on unknown route', async () => {
    const res = await request(app).get('/api/__unknown__');
    expect(res.status).toBe(404);
  });
});
