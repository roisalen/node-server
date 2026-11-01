/**
 * @jest-environment node
 */
const request = require('supertest');

describe('Usage dashboard API', () => {
  const app = require('../server');

  test('GET /usage/summary without admin secret returns 401', async () => {
    const res = await request(app).get('/usage/summary');
    expect(res.status).toBe(401);
  });

  test('GET /usage/summary with wrong admin secret returns 401', async () => {
    const res = await request(app)
      .get('/usage/summary')
      .set('X-Admin-Secret', 'wrong-secret-value-here');
    expect(res.status).toBe(401);
  });
});
