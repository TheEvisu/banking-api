import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';

import { AppConfig } from '../../config/configuration';
import { RedisService } from '../../infrastructure/redis/redis.service';

@Injectable()
export class AccountThrottlerGuard implements CanActivate {
  private readonly logger = new Logger(AccountThrottlerGuard.name);

  constructor(
    private readonly redis: RedisService,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const http = ctx.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();

    const accountId = req.params?.id;
    if (!accountId) return true;

    const { accountLimit, accountTtlSeconds } = this.config.get('throttle', { infer: true });
    const key = `ratelimit:account:${accountId}`;

    let count: number;
    let ttl: number;
    try {
      const result = await this.redis.incrWithExpire(key, accountTtlSeconds);
      count = result.count;
      ttl = result.ttl > 0 ? result.ttl : accountTtlSeconds;
    } catch (err) {
      this.logger.warn({ err, key }, 'redis unavailable for account rate limit; failing open');
      return true;
    }

    const remaining = Math.max(accountLimit - count, 0);
    res.setHeader('X-RateLimit-Limit', accountLimit);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', Math.floor(Date.now() / 1000) + ttl);

    if (count > accountLimit) {
      res.setHeader('Retry-After', ttl);
      throw new HttpException(
        {
          message: `Too many requests for account ${accountId}`,
          code: 'RATE_LIMITED',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }
}
