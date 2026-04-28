import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable, from, of, switchMap, tap } from 'rxjs';

import { IDEMPOTENCY_HEADER } from '../../common/decorators/idempotency-key.decorator';
import {
  IdempotencyConflictError,
  IdempotencyUnavailableError,
} from '../../common/errors/idempotency-conflict.error';

import { IdempotencyService } from './idempotency.service';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  private readonly logger = new Logger(IdempotencyInterceptor.name);

  constructor(private readonly idempotency: IdempotencyService) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = ctx.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();

    if (!MUTATING_METHODS.has(req.method)) return next.handle();

    const headerValue = req.header(IDEMPOTENCY_HEADER);
    const idempotencyKey = headerValue?.trim();
    if (!idempotencyKey) return next.handle();

    const redisKey = this.idempotency.buildKey(req.originalUrl ?? req.url, idempotencyKey);

    return from(this.idempotency.tryAcquire(redisKey)).pipe(
      switchMap((acquired) => {
        if (acquired) {
          return next.handle().pipe(
            tap({
              next: async (body) => {
                const status = res.statusCode;
                await this.idempotency.store(redisKey, status, body);
              },
              error: async () => {
                await this.idempotency.release(redisKey).catch(() => undefined);
              },
            }),
          );
        }

        return from(this.idempotency.getStored(redisKey)).pipe(
          switchMap((stored) => {
            if (stored === null) {
              throw new IdempotencyUnavailableError();
            }
            if (stored === 'pending') {
              throw new IdempotencyConflictError();
            }
            res.status(stored.status);
            return of(stored.body);
          }),
        );
      }),
    );
  }
}
