import { randomUUID } from 'node:crypto';

import request from 'supertest';

import { TestHandle, createTestApp, resetState } from '../helpers/app-factory';
import { buildAccount, buildPerson } from '../fixtures/builders';

describe('Idempotency (e2e)', () => {
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

  it('replays a deposit response for the same Idempotency-Key', async () => {
    const person = await buildPerson(handle.dataSource);
    const account = await buildAccount(handle.dataSource, person.id, { balance: '0' });
    const key = randomUUID();

    const first = await request(handle.app.getHttpServer())
      .post(`/api/v1/accounts/${account.id}/deposit`)
      .set('Idempotency-Key', key)
      .send({ amount: 100 })
      .expect(201);

    const second = await request(handle.app.getHttpServer())
      .post(`/api/v1/accounts/${account.id}/deposit`)
      .set('Idempotency-Key', key)
      .send({ amount: 100 })
      .expect(201);

    expect(second.body).toEqual(first.body);

    const balance = await request(handle.app.getHttpServer())
      .get(`/api/v1/accounts/${account.id}/balance`)
      .expect(200);
    expect(balance.body.balance).toBe('100.0000');
  });
});
