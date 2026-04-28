import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AppConfig } from '../../config/configuration';
import { RedisService } from '../../infrastructure/redis/redis.service';

interface CachedResponse {
  status: number;
  body: unknown;
}

const LOCK_TTL_SECONDS = 30;
const PENDING_SENTINEL = '__pending__';

@Injectable()
export class IdempotencyService {
  private readonly logger = new Logger(IdempotencyService.name);
  private readonly storeTtlSeconds: number;

  constructor(
    private readonly redis: RedisService,
    private readonly config: ConfigService<AppConfig, true>,
  ) {
    const hours = this.config.get('idempotency', { infer: true }).ttlHours;
    this.storeTtlSeconds = hours * 60 * 60;
  }

  buildKey(path: string, key: string): string {
    return `idempotency:${path}:${key}`;
  }

  async tryAcquire(redisKey: string): Promise<boolean> {
    return this.redis.setNxEx(redisKey, PENDING_SENTINEL, LOCK_TTL_SECONDS);
  }

  async getStored(redisKey: string): Promise<CachedResponse | 'pending' | null> {
    const value = await this.redis.get(redisKey);
    if (value === null) return null;
    if (value === PENDING_SENTINEL) return 'pending';
    try {
      return JSON.parse(value) as CachedResponse;
    } catch (err) {
      this.logger.warn({ err, redisKey }, 'failed to parse cached idempotent response');
      return null;
    }
  }

  async store(redisKey: string, status: number, body: unknown): Promise<void> {
    const payload: CachedResponse = { status, body };
    await this.redis.setEx(redisKey, JSON.stringify(payload), this.storeTtlSeconds);
  }

  async release(redisKey: string): Promise<void> {
    await this.redis.del(redisKey);
  }
}
