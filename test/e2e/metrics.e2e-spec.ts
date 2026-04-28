import request from 'supertest';

import { buildAccount, buildPerson } from '../fixtures/builders';
import { TestHandle, createTestApp, resetState } from '../helpers/app-factory';

describe('Metrics (e2e)', () => {
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

  it('exposes prometheus text exposition format', async () => {
    const res = await request(handle.app.getHttpServer()).get('/api/v1/metrics').expect(200);
    expect(res.headers['content-type']).toContain('text/plain');
    expect(res.text).toContain('# HELP http_request_duration_seconds');
    expect(res.text).toContain('# HELP banking_transactions_total');
    expect(res.text).toContain('process_cpu_user_seconds_total');
  });

  it('counts a successful deposit', async () => {
    const person = await buildPerson(handle.dataSource);
    const account = await buildAccount(handle.dataSource, person.id, { balance: '0' });

    await request(handle.app.getHttpServer())
      .post(`/api/v1/accounts/${account.id}/deposit`)
      .send({ amount: 5 })
      .expect(201);

    const res = await request(handle.app.getHttpServer()).get('/api/v1/metrics').expect(200);
    expect(res.text).toMatch(
      /banking_transactions_total\{type="deposit",outcome="success"\} [1-9]/,
    );
  });

  it('counts a failed withdrawal as a failure', async () => {
    const person = await buildPerson(handle.dataSource);
    const account = await buildAccount(handle.dataSource, person.id, { balance: '1' });

    await request(handle.app.getHttpServer())
      .post(`/api/v1/accounts/${account.id}/withdraw`)
      .send({ amount: 100 })
      .expect(409);

    const res = await request(handle.app.getHttpServer()).get('/api/v1/metrics').expect(200);
    expect(res.text).toMatch(
      /banking_transactions_total\{type="withdrawal",outcome="failure"\} [1-9]/,
    );
  });
});
