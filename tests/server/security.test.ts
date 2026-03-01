import request = require('supertest');
import { createApp } from '../../apps/server/src/app';

const app = createApp();

test('POST with body > 10kb returns 413', async () => {
  const bigBody = { name: 'x'.repeat(11 * 1024) }; // 11 KB
  const res = await request(app)
    .post('/api/sessions')
    .set('Authorization', 'Bearer dummy-token')
    .send(bigBody);
  expect(res.status).toBe(413);
});
