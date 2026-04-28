import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';

import { RedisService } from '../../infrastructure/redis/redis.service';

import { IdempotencyService } from './idempotency.service';

describe('IdempotencyService', () => {
  let service: IdempotencyService;
  let redis: jest.Mocked<RedisService>;

  beforeEach(async () => {
    redis = {
      setNxEx: jest.fn(),
      get: jest.fn(),
      setEx: jest.fn(),
      del: jest.fn(),
      ping: jest.fn(),
      getClient: jest.fn(),
    } as unknown as jest.Mocked<RedisService>;

    const module = await Test.createTestingModule({
      providers: [
        IdempotencyService,
        { provide: RedisService, useValue: redis },
        { provide: ConfigService, useValue: { get: () => ({ ttlHours: 1 }) } },
      ],
    }).compile();

    service = module.get(IdempotencyService);
  });

  it('builds keys deterministically', () => {
    expect(service.buildKey('/api/v1/accounts/abc/deposit', 'k1')).toBe(
      'idempotency:/api/v1/accounts/abc/deposit:k1',
    );
  });

  it('reports pending while a sentinel is held', async () => {
    redis.get.mockResolvedValue('__pending__');
    await expect(service.getStored('k')).resolves.toBe('pending');
  });

  it('returns parsed cached payload', async () => {
    redis.get.mockResolvedValue(JSON.stringify({ status: 201, body: { ok: true } }));
    await expect(service.getStored('k')).resolves.toEqual({ status: 201, body: { ok: true } });
  });

  it('returns null on missing key', async () => {
    redis.get.mockResolvedValue(null);
    await expect(service.getStored('k')).resolves.toBeNull();
  });

  it('stores a serialized response', async () => {
    await service.store('k', 200, { ok: true });
    expect(redis.setEx).toHaveBeenCalledWith(
      'k',
      JSON.stringify({ status: 200, body: { ok: true } }),
      3600,
    );
  });
});
