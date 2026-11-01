/**
 * @jest-environment node
 */
const request = require('supertest');
const app = require('../../server');

const org = { 'X-organisation': 'test-subject-org' };

describe('Subject resource', () => {
  test('GET /subject returns 200', async () => {
    const res = await request(app).get('/subject').set(org);
    expect(res.status).toBe(200);
  });

  test('POST /subject then GET returns subject', async () => {
    const title = 'Test subject line';
    const post = await request(app).post('/subject').set(org).send({ subject: title });
    expect(post.status).toBe(201);
    const get = await request(app).get('/subject').set(org);
    expect(get.status).toBe(200);
    expect(get.text).toBe(title);
  });
});
