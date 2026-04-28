import request from 'supertest';

import { buildAccount, buildPerson } from '../fixtures/builders';
import { TestHandle, createTestApp, resetState } from '../helpers/app-factory';

describe('Per-account throttling (e2e)', () => {
  let handle: TestHandle;

  beforeAll(async () => {
    process.env.THROTTLE_ACCOUNT_LIMIT = '3';
    process.env.THROTTLE_ACCOUNT_TTL_SECONDS = '60';
    handle = await createTestApp();
  });

  afterAll(async () => {
    await handle.close();
    delete process.env.THROTTLE_ACCOUNT_LIMIT;
    delete process.env.THROTTLE_ACCOUNT_TTL_SECONDS;
  });

  beforeEach(async () => {
    await resetState(handle);
  });

  it('allows requests up to the limit, then returns 429 with rate-limit headers', async () => {
    const person = await buildPerson(handle.dataSource);
    const account = await buildAccount(handle.dataSource, person.id, { balance: '1000' });

    for (let i = 0; i < 3; i++) {
      const res = await request(handle.app.getHttpServer())
        .post(`/api/v1/accounts/${account.id}/deposit`)
        .send({ amount: 1 })
        .expect(201);
      expect(res.headers['x-ratelimit-limit']).toBe('3');
    }

    const blocked = await request(handle.app.getHttpServer())
      .post(`/api/v1/accounts/${account.id}/deposit`)
      .send({ amount: 1 })
      .expect(429);
    expect(blocked.body.code).toBe('RATE_LIMITED');
    expect(blocked.headers['retry-after']).toBeDefined();
    expect(blocked.headers['x-ratelimit-remaining']).toBe('0');
  });

  it('counts deposit and withdraw against the same per-account bucket', async () => {
    const person = await buildPerson(handle.dataSource);
    const account = await buildAccount(handle.dataSource, person.id, { balance: '1000' });

    await request(handle.app.getHttpServer())
      .post(`/api/v1/accounts/${account.id}/deposit`)
      .send({ amount: 1 })
      .expect(201);
    await request(handle.app.getHttpServer())
      .post(`/api/v1/accounts/${account.id}/withdraw`)
      .send({ amount: 1 })
      .expect(201);
    await request(handle.app.getHttpServer())
      .post(`/api/v1/accounts/${account.id}/deposit`)
      .send({ amount: 1 })
      .expect(201);
    await request(handle.app.getHttpServer())
      .post(`/api/v1/accounts/${account.id}/withdraw`)
      .send({ amount: 1 })
      .expect(429);
  });
});
