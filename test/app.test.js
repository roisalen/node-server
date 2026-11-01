/**
 * @jest-environment node
 */
const request = require('supertest');
const app = require('../server');

describe('HTTP API', () => {
  const orgHeader = { 'X-organisation': 'test-org-ci' };

  test('GET /speakerList returns 200 and array for organisation', async () => {
    const res = await request(app).get('/speakerList').set(orgHeader);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('GET /subject returns 200', async () => {
    const res = await request(app).get('/subject').set(orgHeader);
    expect(res.status).toBe(200);
  });
});
