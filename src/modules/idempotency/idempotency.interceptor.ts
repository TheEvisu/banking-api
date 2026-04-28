import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable, defer, from, of, switchMap, tap, throwError } from 'rxjs';

import { IDEMPOTENCY_HEADER } from '../../common/decorators/idempotency-key.decorator';
import {
  IdempotencyConflictError,
  IdempotencyUnavailableError,
} from '../../common/errors/idempotency-conflict.error';

import { hashBody } from './body-hash';
import { IdempotencyService, StartResult } from './idempotency.service';

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

    return defer(() => from(this.startSafely(redisKey, hash))).pipe(
      switchMap((outcome) => {
        if (outcome === null) {
          return throwError(() => new IdempotencyUnavailableError());
        }
        switch (outcome.state) {
          case 'acquired':
            return next.handle().pipe(
              tap({
                next: (body) => {
                  this.idempotency
                    .store(redisKey, hash, res.statusCode, body)
                    .catch((err) =>
                      this.logger.warn({ err, redisKey }, 'idempotency store failed'),
                    );
                },
                error: () => {
                  this.idempotency
                    .release(redisKey)
                    .catch((err) =>
                      this.logger.warn({ err, redisKey }, 'idempotency release failed'),
                    );
                },
              }),
            );
          case 'replay':
            res.status(outcome.status);
            return of(outcome.body);
          case 'pending':
            return throwError(
              () =>
                new IdempotencyConflictError(
                  'A request with the same Idempotency-Key is still in flight',
                ),
            );
          case 'mismatch':
            return throwError(
              () =>
                new IdempotencyConflictError(
                  'Idempotency-Key reused with a different request body',
                ),
            );
        }
      }),
    );
  }

  private async startSafely(redisKey: string, hash: string): Promise<StartResult | null> {
    try {
      return await this.idempotency.start(redisKey, hash);
    } catch (err) {
      this.logger.warn({ err, redisKey }, 'idempotency layer unavailable');
      return null;
    }
  }
}
