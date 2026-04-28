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

  it('readiness reports postgres, redis and migrations up', async () => {
    const res = await request(handle.app.getHttpServer()).get('/api/v1/health/ready').expect(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.info.postgres.status).toBe('up');
    expect(res.body.info.redis.status).toBe('up');
    expect(res.body.info.migrations.status).toBe('up');
    expect(res.body.info.migrations.expected).toBeDefined();
    expect(res.body.info.migrations.applied).toBeDefined();
  });

  it('readiness returns 503 when the latest applied migration is older than expected', async () => {
    const lastMigration = await handle.dataSource.query<{ id: number; name: string }[]>(
      'SELECT id, name FROM migrations ORDER BY id DESC LIMIT 1',
    );
    if (lastMigration.length === 0) throw new Error('no migrations to drift from');

    await handle.dataSource.query('DELETE FROM migrations WHERE id = $1', [lastMigration[0].id]);
    try {
      const res = await request(handle.app.getHttpServer()).get('/api/v1/health/ready').expect(503);
      expect(res.body.status).toBe('error');
      expect(res.body.details.migrations.status).toBe('down');
      expect(res.body.details.migrations.applied).not.toBe(res.body.details.migrations.expected);
    } finally {
      await handle.dataSource.query(
        'INSERT INTO migrations (id, timestamp, name) VALUES ($1, $2, $3)',
        [lastMigration[0].id, Date.now(), lastMigration[0].name],
      );
    }
  });
});
