import request from 'supertest';
import { Redis } from 'ioredis';

import { REDIS_CLIENT } from '../../src/infrastructure/redis/redis.service';
import { buildAccount, buildPerson } from '../fixtures/builders';
import { TestHandle, createTestApp, resetState } from '../helpers/app-factory';

describe('Redis outage degradation', () => {
  let handle: TestHandle;

  beforeAll(async () => {
    handle = await createTestApp();
  });

  afterAll(async () => {
    await handle.close();
  });

  beforeEach(async () => {
    await resetState(handle);
  });

  it('returns 503 IDEMPOTENCY_UNAVAILABLE on mutating requests with a key when redis is down', async () => {
    const person = await buildPerson(handle.dataSource);
    const account = await buildAccount(handle.dataSource, person.id, { balance: '100' });

    const redis = handle.app.get<Redis>(REDIS_CLIENT);
    await redis.disconnect();
    try {
      const res = await request(handle.app.getHttpServer())
        .post(`/api/v1/accounts/${account.id}/deposit`)
        .set('Idempotency-Key', '11111111-2222-4333-8444-555555555555')
        .send({ amount: 1 })
        .expect(503);
      expect(res.body.code).toBe('IDEMPOTENCY_UNAVAILABLE');
    } finally {
      await redis.connect();
    }
  });

  it('proceeds without idempotency when no key is supplied even if redis is down', async () => {
    const person = await buildPerson(handle.dataSource);
    const account = await buildAccount(handle.dataSource, person.id, { balance: '100' });

    const redis = handle.app.get<Redis>(REDIS_CLIENT);
    await redis.disconnect();
    try {
      // The per-account rate limit guard runs before the idempotency interceptor; it fails open
      // when redis is unavailable, so the request must still succeed.
      await request(handle.app.getHttpServer())
        .post(`/api/v1/accounts/${account.id}/deposit`)
        .send({ amount: 1 })
        .expect(201);
    } finally {
      await redis.connect();
    }
  });
});
