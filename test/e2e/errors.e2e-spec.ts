import request from 'supertest';

import { TestHandle, createTestApp, resetState } from '../helpers/app-factory';

describe('Error envelope (e2e)', () => {
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

  it('shape contains code, requestId, timestamp', async () => {
    const res = await request(handle.app.getHttpServer())
      .get('/api/v1/accounts/00000000-0000-4000-8000-000000000000')
      .expect(404);

    expect(res.body).toEqual(
      expect.objectContaining({
        statusCode: 404,
        error: 'NotFound',
        code: 'ACCOUNT_NOT_FOUND',
        requestId: expect.any(String),
        timestamp: expect.any(String),
      }),
    );
    expect(res.headers['x-request-id']).toBeDefined();
  });

  it('echoes a provided X-Request-Id when valid', async () => {
    const requestId = '11111111-1111-4111-8111-111111111111';
    const res = await request(handle.app.getHttpServer())
      .get('/api/v1/accounts/00000000-0000-4000-8000-000000000000')
      .set('X-Request-Id', requestId)
      .expect(404);
    expect(res.body.requestId).toBe(requestId);
    expect(res.headers['x-request-id']).toBe(requestId);
  });
});
