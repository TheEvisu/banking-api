import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Redis } from 'ioredis';

export const REDIS_CLIENT = 'REDIS_CLIENT';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);

  constructor(@Inject(REDIS_CLIENT) private readonly client: Redis) {}

  getClient(): Redis {
    return this.client;
  }

  async ping(): Promise<boolean> {
    try {
      const reply = await this.client.ping();
      return reply === 'PONG';
    } catch (err) {
      this.logger.warn({ err }, 'redis ping failed');
      return false;
    }
  }

  async setNxEx(key: string, value: string, ttlSeconds: number): Promise<boolean> {
    const reply = await this.client.set(key, value, 'EX', ttlSeconds, 'NX');
    return reply === 'OK';
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async setEx(key: string, value: string, ttlSeconds: number): Promise<void> {
    await this.client.set(key, value, 'EX', ttlSeconds);
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  /**
   * Atomic INCR + EXPIRE on first hit. Returns (count, ttlSeconds).
   */
  async incrWithExpire(
    key: string,
    windowSeconds: number,
  ): Promise<{ count: number; ttl: number }> {
    const pipeline = this.client.multi();
    pipeline.incr(key);
    pipeline.ttl(key);
    const result = await pipeline.exec();
    const count = Number(result?.[0]?.[1] ?? 0);
    let ttl = Number(result?.[1]?.[1] ?? -1);
    if (ttl < 0) {
      await this.client.expire(key, windowSeconds);
      ttl = windowSeconds;
    }
    return { count, ttl };
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit().catch(() => undefined);
  }
}
