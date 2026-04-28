import { IdempotencyService } from '../../src/modules/idempotency/idempotency.service';
import { TestHandle, createTestApp, resetState } from '../helpers/app-factory';

describe('IdempotencyService (integration)', () => {
  let handle: TestHandle;
  let service: IdempotencyService;

  beforeAll(async () => {
    handle = await createTestApp();
    service = handle.app.get(IdempotencyService);
  });

  afterAll(async () => {
    await handle.close();
  });

  beforeEach(async () => {
    await resetState(handle);
  });

  it('first start acquires; second sees pending for same hash', async () => {
    const key = service.buildKey('/test', 'k1');
    const a = await service.start(key, 'hash-A');
    const b = await service.start(key, 'hash-A');

    expect(a).toEqual({ state: 'acquired' });
    expect(b).toEqual({ state: 'pending' });
  });

  it('returns mismatch when a different hash is presented', async () => {
    const key = service.buildKey('/test', 'k2');
    await service.start(key, 'hash-A');
    const result = await service.start(key, 'hash-B');
    expect(result).toEqual({ state: 'mismatch' });
  });

  it('after store(), the same hash replays the stored response', async () => {
    const key = service.buildKey('/test', 'k3');
    await service.start(key, 'hash-A');
    await service.store(key, 'hash-A', 201, { id: 1, ok: true });

    const result = await service.start(key, 'hash-A');
    expect(result).toEqual({ state: 'replay', status: 201, body: { id: 1, ok: true } });
  });

  it('release() drops the lock so a fresh start can acquire', async () => {
    const key = service.buildKey('/test', 'k4');
    await service.start(key, 'hash-A');
    await service.release(key);
    expect(await service.start(key, 'hash-A')).toEqual({ state: 'acquired' });
  });
});
