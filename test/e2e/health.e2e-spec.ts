import request from 'supertest';

import { TestHandle, createTestApp } from '../helpers/app-factory';

describe('Health (e2e)', () => {
  let handle: TestHandle;

  beforeAll(async () => {
    handle = await createTestApp();
  });

  afterAll(async () => {
    await handle.close();
  });

  it('liveness returns 200 ok', async () => {
    const res = await request(handle.app.getHttpServer()).get('/api/v1/health').expect(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('readiness reports postgres and redis up', async () => {
    const res = await request(handle.app.getHttpServer()).get('/api/v1/health/ready').expect(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.info.postgres.status).toBe('up');
    expect(res.body.info.redis.status).toBe('up');
  });
});
