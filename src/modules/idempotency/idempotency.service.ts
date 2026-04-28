import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AppConfig } from '../../config/configuration';
import { RedisService } from '../../infrastructure/redis/redis.service';

interface PendingEntry {
  phase: 'pending';
  hash: string;
}

interface DoneEntry {
  phase: 'done';
  hash: string;
  status: number;
  body: unknown;
}

type StoredEntry = PendingEntry | DoneEntry;

export type StartResult =
  | { state: 'acquired' }
  | { state: 'pending' }
  | { state: 'replay'; status: number; body: unknown }
  | { state: 'mismatch' };

const LOCK_TTL_SECONDS = 30;

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

  async start(redisKey: string, hash: string): Promise<StartResult> {
    const pending: PendingEntry = { phase: 'pending', hash };
    const acquired = await this.redis.setNxEx(
      redisKey,
      JSON.stringify(pending),
      LOCK_TTL_SECONDS,
    );
    if (acquired) return { state: 'acquired' };

    const stored = await this.read(redisKey);
    if (!stored) return { state: 'acquired' };

    if (stored.hash !== hash) return { state: 'mismatch' };
    if (stored.phase === 'pending') return { state: 'pending' };
    return { state: 'replay', status: stored.status, body: stored.body };
  }

  async store(redisKey: string, hash: string, status: number, body: unknown): Promise<void> {
    const payload: DoneEntry = { phase: 'done', hash, status, body };
    await this.redis.setEx(redisKey, JSON.stringify(payload), this.storeTtlSeconds);
  }

  async release(redisKey: string): Promise<void> {
    await this.redis.del(redisKey);
  }

  private async read(redisKey: string): Promise<StoredEntry | null> {
    const value = await this.redis.get(redisKey);
    if (value === null) return null;
    try {
      return JSON.parse(value) as StoredEntry;
    } catch (err) {
      this.logger.warn({ err, redisKey }, 'failed to parse idempotency entry');
      return null;
    }
  }
}
