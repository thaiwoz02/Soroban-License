/**
 * Tests for the public /verify endpoint.
 * Uses an in-memory DB mock so no real Postgres is required.
 */

import request from 'supertest';
import { createApp } from '../app';

// Mock the DB client
jest.mock('../db/client', () => ({
  db: {
    raw: jest.fn().mockResolvedValue({}),
    fn: { now: () => 'NOW()' },
  },
}));

// Mock Redis
jest.mock('../lib/redis', () => ({
  redis: {
    get: jest.fn().mockResolvedValue(null),
    setex: jest.fn().mockResolvedValue('OK'),
    ping: jest.fn().mockResolvedValue('PONG'),
  },
}));

const app = createApp();

describe('GET /api/v1/verify/:licenseId', () => {
  it('returns 200 with valid:false when license not found', async () => {
    const { db } = require('../db/client');
    db.mockImplementation(() => ({
      where: () => ({ orWhere: () => ({ first: () => Promise.resolve(null) }) }),
    }));

    const res = await request(app).get('/api/v1/verify/nonexistent-id');
    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(false);
    expect(res.body.reason).toBeDefined();
  });

  it('returns health check', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});
