/**
 * @jest-environment node
 */
const request = require('supertest');
const app = require('../../server');

const org = { 'X-organisation': 'test-msg-org' };

describe('Message resource', () => {
  test('GET /message returns 200', async () => {
    const res = await request(app).get('/message').set(org);
    expect(res.status).toBe(200);
  });

  test('POST /message then GET returns payload', async () => {
    const body = 'Hello from test';
    const post = await request(app).post('/message').set(org).send({ message: body });
    expect(post.status).toBe(201);
    const get = await request(app).get('/message').set(org);
    expect(get.status).toBe(200);
    expect(get.text).toBe(body);
  });
});
