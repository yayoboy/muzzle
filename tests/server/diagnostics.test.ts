import request = require('supertest');
import { createApp } from '../../apps/server/src/app';
import { generateToken } from '../../apps/server/src/services/auth';

beforeAll(() => {
  process.env.JWT_SECRET = 'test-secret-diagnostics';
});

test('GET /api/diagnostics returns system info', async () => {
  const app = createApp();
  const { token } = generateToken();
  const res = await request(app)
    .get('/api/diagnostics')
    .set('Authorization', `Bearer ${token}`);
  expect(res.status).toBe(200);
  expect(res.body).toMatchObject({
    hostname: expect.any(String),
    ip: expect.any(String),
    ram: {
      used: expect.any(Number),
      total: expect.any(Number),
    },
    uptime: expect.any(Number),
    cpus: {
      count: expect.any(Number),
      model: expect.any(String),
    },
  });
});

test('GET /api/diagnostics returns 401 without token', async () => {
  const app = createApp();
  const res = await request(app).get('/api/diagnostics');
  expect(res.status).toBe(401);
});
