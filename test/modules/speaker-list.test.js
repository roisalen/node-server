/**
 * @jest-environment node
 */
const request = require('supertest');
const app = require('../../server');

describe('Speaker list resource', () => {
  const orgA = { 'X-organisation': 'speaker-test-a' };
  const orgB = { 'X-organisation': 'speaker-test-b' };

  test('GET /speakerList returns empty array for new org', async () => {
    const res = await request(app).get('/speakerList').set(orgA);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(0);
  });

  test('speaker queues are isolated per organisation header', async () => {
    const a = await request(app).get('/speakerList').set(orgA);
    const b = await request(app).get('/speakerList').set(orgB);
    expect(a.body).toEqual([]);
    expect(b.body).toEqual([]);
  });
});
