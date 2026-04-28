import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable, from, of, switchMap, tap } from 'rxjs';

import { IDEMPOTENCY_HEADER } from '../../common/decorators/idempotency-key.decorator';
import { IdempotencyConflictError } from '../../common/errors/idempotency-conflict.error';

import { hashBody } from './body-hash';
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
    const hash = hashBody(req.body);

    return from(this.idempotency.start(redisKey, hash)).pipe(
      switchMap((outcome) => {
        switch (outcome.state) {
          case 'acquired':
            return next.handle().pipe(
              tap({
                next: async (body) => {
                  await this.idempotency.store(redisKey, hash, res.statusCode, body);
                },
                error: async () => {
                  await this.idempotency.release(redisKey).catch(() => undefined);
                },
              }),
            );
          case 'replay':
            res.status(outcome.status);
            return of(outcome.body);
          case 'pending':
            throw new IdempotencyConflictError(
              'A request with the same Idempotency-Key is still in flight',
            );
          case 'mismatch':
            throw new IdempotencyConflictError(
              'Idempotency-Key reused with a different request body',
            );
        }
      }),
    );
  }

}
