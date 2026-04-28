import request from 'supertest';

import { buildAccount, buildPerson } from '../fixtures/builders';
import { TestHandle, createTestApp, resetState } from '../helpers/app-factory';

describe('Listing endpoints (e2e)', () => {
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

  it('GET /persons returns the persons newest first with cursor pagination', async () => {
    for (let i = 0; i < 3; i++) {
      await buildPerson(handle.dataSource, { fullName: `Person ${i}` });
    }

    const first = await request(handle.app.getHttpServer())
      .get('/api/v1/persons?limit=2')
      .expect(200);
    expect(first.body.items).toHaveLength(2);
    expect(first.body.hasMore).toBe(true);

    const second = await request(handle.app.getHttpServer())
      .get(`/api/v1/persons?limit=2&cursor=${encodeURIComponent(first.body.nextCursor)}`)
      .expect(200);
    expect(second.body.items).toHaveLength(1);
    expect(second.body.hasMore).toBe(false);
  });

  it('GET /accounts filters by personId', async () => {
    const a = await buildPerson(handle.dataSource);
    const b = await buildPerson(handle.dataSource);
    await buildAccount(handle.dataSource, a.id);
    await buildAccount(handle.dataSource, a.id);
    await buildAccount(handle.dataSource, b.id);

    const res = await request(handle.app.getHttpServer())
      .get(`/api/v1/accounts?personId=${a.id}`)
      .expect(200);
    expect(res.body.items).toHaveLength(2);
    expect(res.body.items.every((acc: { personId: string }) => acc.personId === a.id)).toBe(true);
  });

  it('rejects an invalid cursor', async () => {
    await request(handle.app.getHttpServer())
      .get('/api/v1/persons?cursor=not-base64')
      .expect(400);
  });
});
