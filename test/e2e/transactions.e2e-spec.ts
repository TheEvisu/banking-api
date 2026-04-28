import request from 'supertest';

import { TestHandle, createTestApp, resetState } from '../helpers/app-factory';
import { buildAccount, buildPerson } from '../fixtures/builders';

describe('Transactions (e2e)', () => {
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

  const seedAccount = async (overrides: Parameters<typeof buildAccount>[2] = {}): Promise<string> => {
    const person = await buildPerson(handle.dataSource);
    const account = await buildAccount(handle.dataSource, person.id, overrides);
    return account.id;
  };

  it('credits a deposit and updates balance', async () => {
    const accountId = await seedAccount();
    await request(handle.app.getHttpServer())
      .post(`/api/v1/accounts/${accountId}/deposit`)
      .send({ amount: 250.5, description: 'salary' })
      .expect(201);

    const res = await request(handle.app.getHttpServer())
      .get(`/api/v1/accounts/${accountId}/balance`)
      .expect(200);

    expect(res.body.balance).toBe('250.5000');
  });

  it('debits a withdrawal', async () => {
    const accountId = await seedAccount({ balance: '300' });
    const res = await request(handle.app.getHttpServer())
      .post(`/api/v1/accounts/${accountId}/withdraw`)
      .send({ amount: 100 })
      .expect(201);

    expect(res.body.balanceAfter).toBe('200.0000');
  });

  it('rejects withdrawals beyond balance', async () => {
    const accountId = await seedAccount({ balance: '50' });
    await request(handle.app.getHttpServer())
      .post(`/api/v1/accounts/${accountId}/withdraw`)
      .send({ amount: 100 })
      .expect(409)
      .expect((r) => {
        expect(r.body.code).toBe('INSUFFICIENT_FUNDS');
      });
  });

  it('rejects mutations on a blocked account', async () => {
    const accountId = await seedAccount({ balance: '500', isBlocked: true });
    await request(handle.app.getHttpServer())
      .post(`/api/v1/accounts/${accountId}/deposit`)
      .send({ amount: 10 })
      .expect(409)
      .expect((r) => {
        expect(r.body.code).toBe('ACCOUNT_BLOCKED');
      });
  });

  it('enforces the daily withdrawal limit', async () => {
    const accountId = await seedAccount({ balance: '5000', dailyWithdrawalLimit: '100' });
    await request(handle.app.getHttpServer())
      .post(`/api/v1/accounts/${accountId}/withdraw`)
      .send({ amount: 80 })
      .expect(201);

    await request(handle.app.getHttpServer())
      .post(`/api/v1/accounts/${accountId}/withdraw`)
      .send({ amount: 30 })
      .expect(409)
      .expect((r) => {
        expect(r.body.code).toBe('DAILY_LIMIT_EXCEEDED');
      });
  });

  it('rejects negative or zero amounts', async () => {
    const accountId = await seedAccount();
    await request(handle.app.getHttpServer())
      .post(`/api/v1/accounts/${accountId}/deposit`)
      .send({ amount: -1 })
      .expect(400);
    await request(handle.app.getHttpServer())
      .post(`/api/v1/accounts/${accountId}/deposit`)
      .send({ amount: 0 })
      .expect(400);
  });
});
