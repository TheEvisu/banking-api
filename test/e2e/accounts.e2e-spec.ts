import request from 'supertest';

import { TestHandle, createTestApp, resetState } from '../helpers/app-factory';
import { buildPerson } from '../fixtures/builders';

describe('Accounts (e2e)', () => {
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

  describe('POST /api/v1/accounts', () => {
    it('creates an account for an existing person', async () => {
      const person = await buildPerson(handle.dataSource);

      const res = await request(handle.app.getHttpServer())
        .post('/api/v1/accounts')
        .send({ personId: person.id, dailyWithdrawalLimit: 1500 })
        .expect(201);

      expect(res.body).toMatchObject({
        personId: person.id,
        balance: '0.0000',
        dailyWithdrawalLimit: '1500.0000',
        isBlocked: false,
      });
      expect(res.body.id).toBeDefined();
      expect(res.body.accountNumber).toMatch(/^\d{7}$/);
    });

    it('rejects when the person does not exist', async () => {
      await request(handle.app.getHttpServer())
        .post('/api/v1/accounts')
        .send({ personId: '00000000-0000-4000-8000-000000000000' })
        .expect(404)
        .expect((r) => {
          expect(r.body.code).toBe('PERSON_NOT_FOUND');
        });
    });

    it('rejects an invalid personId payload', async () => {
      await request(handle.app.getHttpServer())
        .post('/api/v1/accounts')
        .send({ personId: 'not-a-uuid' })
        .expect(400);
    });
  });

  describe('GET /api/v1/accounts/:id', () => {
    it('returns 404 for an unknown id', async () => {
      await request(handle.app.getHttpServer())
        .get('/api/v1/accounts/00000000-0000-4000-8000-000000000001')
        .expect(404);
    });
  });

  describe('POST /api/v1/accounts/:id/block', () => {
    it('is idempotent on repeat calls', async () => {
      const person = await buildPerson(handle.dataSource);
      const created = await request(handle.app.getHttpServer())
        .post('/api/v1/accounts')
        .send({ personId: person.id })
        .expect(201);

      const first = await request(handle.app.getHttpServer())
        .post(`/api/v1/accounts/${created.body.id}/block`)
        .send({ reason: 'fraud review' })
        .expect(200);

      expect(first.body.isBlocked).toBe(true);
      expect(first.body.blockedReason).toBe('fraud review');

      const second = await request(handle.app.getHttpServer())
        .post(`/api/v1/accounts/${created.body.id}/block`)
        .send({ reason: 'second attempt' })
        .expect(200);

      expect(second.body.isBlocked).toBe(true);
      expect(second.body.blockedReason).toBe('fraud review');
    });
  });
});
