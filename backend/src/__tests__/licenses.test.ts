/**
 * Integration-style tests for the license routes.
 */

import request from 'supertest';
import { createApp } from '../app';

jest.mock('../db/client', () => ({ db: jest.fn() }));
jest.mock('../lib/redis', () => ({
  redis: {
    get: jest.fn().mockResolvedValue(null),
    setex: jest.fn(),
    ping: jest.fn().mockResolvedValue('PONG'),
    del: jest.fn(),
  },
}));

const app = createApp();

describe('POST /api/v1/verify/batch', () => {
  it('returns 400 when licenseIds missing', async () => {
    const res = await request(app)
      .post('/api/v1/verify/batch')
      .send({});
    expect(res.status).toBe(400);
  });

  it('returns 400 when more than 50 IDs provided', async () => {
    const ids = Array.from({ length: 51 }, (_, i) => `id-${i}`);
    const res = await request(app)
      .post('/api/v1/verify/batch')
      .send({ licenseIds: ids });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/v1/licenses without auth', () => {
  it('returns 401', async () => {
    const res = await request(app).get('/api/v1/licenses');
    expect(res.status).toBe(401);
  });
});
