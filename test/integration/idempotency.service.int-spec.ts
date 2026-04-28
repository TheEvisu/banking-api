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

  it('first SETNX wins, the second sees pending sentinel', async () => {
    const key = service.buildKey('/test', 'k1');
    const a = await service.tryAcquire(key);
    const b = await service.tryAcquire(key);

    expect(a).toBe(true);
    expect(b).toBe(false);
    expect(await service.getStored(key)).toBe('pending');
  });

  it('after store(), subsequent acquires read the stored payload', async () => {
    const key = service.buildKey('/test', 'k2');
    expect(await service.tryAcquire(key)).toBe(true);
    await service.store(key, 201, { id: 1, ok: true });

    expect(await service.getStored(key)).toEqual({ status: 201, body: { id: 1, ok: true } });
  });

  it('release() drops the lock so a new request can run', async () => {
    const key = service.buildKey('/test', 'k3');
    expect(await service.tryAcquire(key)).toBe(true);
    await service.release(key);
    expect(await service.tryAcquire(key)).toBe(true);
  });
});
