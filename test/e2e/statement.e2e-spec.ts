import request from 'supertest';

import { TestHandle, createTestApp, resetState } from '../helpers/app-factory';
import { buildAccount, buildPerson } from '../fixtures/builders';

describe('Statement (e2e)', () => {
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

  const setup = async (): Promise<string> => {
    const person = await buildPerson(handle.dataSource);
    const account = await buildAccount(handle.dataSource, person.id, { balance: '0' });
    return account.id;
  };

  it('returns transactions ordered by recency', async () => {
    const accountId = await setup();
    for (const amount of [10, 20, 30]) {
      await request(handle.app.getHttpServer())
        .post(`/api/v1/accounts/${accountId}/deposit`)
        .send({ amount })
        .expect(201);
    }

    const res = await request(handle.app.getHttpServer())
      .get(`/api/v1/accounts/${accountId}/statement?limit=10`)
      .expect(200);

    expect(res.body.transactions).toHaveLength(3);
    expect(res.body.hasMore).toBe(false);
    expect(res.body.transactions.map((t: { amount: string }) => t.amount)).toEqual([
      '30.0000',
      '20.0000',
      '10.0000',
    ]);
  });

  it('paginates with cursor', async () => {
    const accountId = await setup();
    for (const amount of [1, 2, 3, 4, 5]) {
      await request(handle.app.getHttpServer())
        .post(`/api/v1/accounts/${accountId}/deposit`)
        .send({ amount })
        .expect(201);
    }

    const first = await request(handle.app.getHttpServer())
      .get(`/api/v1/accounts/${accountId}/statement?limit=2`)
      .expect(200);
    expect(first.body.transactions).toHaveLength(2);
    expect(first.body.hasMore).toBe(true);

    const second = await request(handle.app.getHttpServer())
      .get(
        `/api/v1/accounts/${accountId}/statement?limit=2&cursor=${encodeURIComponent(first.body.nextCursor)}`,
      )
      .expect(200);
    expect(second.body.transactions).toHaveLength(2);

    const third = await request(handle.app.getHttpServer())
      .get(
        `/api/v1/accounts/${accountId}/statement?limit=2&cursor=${encodeURIComponent(second.body.nextCursor)}`,
      )
      .expect(200);
    expect(third.body.transactions).toHaveLength(1);
    expect(third.body.hasMore).toBe(false);
  });

  it('rejects an inverted period', async () => {
    const accountId = await setup();
    await request(handle.app.getHttpServer())
      .get(`/api/v1/accounts/${accountId}/statement?from=2026-04-10&to=2026-04-01`)
      .expect(400);
  });

  it('returns empty when there are no transactions', async () => {
    const accountId = await setup();
    const res = await request(handle.app.getHttpServer())
      .get(`/api/v1/accounts/${accountId}/statement`)
      .expect(200);
    expect(res.body.transactions).toEqual([]);
    expect(res.body.hasMore).toBe(false);
    expect(res.body.nextCursor).toBeNull();
  });
});
