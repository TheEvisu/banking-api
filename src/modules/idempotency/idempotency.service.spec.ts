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

  describe('start', () => {
    it('returns acquired on first call', async () => {
      redis.setNxEx.mockResolvedValue(true);
      const result = await service.start('k', 'h1');
      expect(result).toEqual({ state: 'acquired' });
    });

    it('returns pending when the same hash is in flight', async () => {
      redis.setNxEx.mockResolvedValue(false);
      redis.get.mockResolvedValue(JSON.stringify({ phase: 'pending', hash: 'h1' }));
      const result = await service.start('k', 'h1');
      expect(result).toEqual({ state: 'pending' });
    });

    it('returns replay when the same hash already completed', async () => {
      redis.setNxEx.mockResolvedValue(false);
      redis.get.mockResolvedValue(
        JSON.stringify({ phase: 'done', hash: 'h1', status: 201, body: { id: 'x' } }),
      );
      const result = await service.start('k', 'h1');
      expect(result).toEqual({ state: 'replay', status: 201, body: { id: 'x' } });
    });

    it('returns mismatch when the stored hash differs', async () => {
      redis.setNxEx.mockResolvedValue(false);
      redis.get.mockResolvedValue(JSON.stringify({ phase: 'pending', hash: 'other' }));
      const result = await service.start('k', 'h1');
      expect(result).toEqual({ state: 'mismatch' });
    });
  });

  it('store() writes a done payload with TTL', async () => {
    await service.store('k', 'h1', 200, { ok: true });
    expect(redis.setEx).toHaveBeenCalledWith(
      'k',
      JSON.stringify({ phase: 'done', hash: 'h1', status: 200, body: { ok: true } }),
      3600,
    );
  });

  it('release() drops the key', async () => {
    await service.release('k');
    expect(redis.del).toHaveBeenCalledWith('k');
  });
});
