import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable, tap } from 'rxjs';

import { MetricsService } from './metrics.service';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metrics: MetricsService) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const start = process.hrtime.bigint();
    const http = ctx.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();

    const observe = (status: number): void => {
      const elapsedNs = Number(process.hrtime.bigint() - start);
      const seconds = elapsedNs / 1e9;
      const route = req.route?.path ?? this.normalizePath(req.originalUrl ?? req.url);
      this.metrics.observeRequest(req.method, route, status, seconds);
    };

    return next.handle().pipe(
      tap({
        next: () => observe(res.statusCode),
        error: (err: { status?: number }) => observe(err?.status ?? 500),
      }),
    );
  }

  private normalizePath(url: string): string {
    const path = url.split('?')[0];
    return path.replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:id');
  }
}
