import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import { Request } from 'express';

export const IDEMPOTENCY_HEADER = 'idempotency-key';

export const IdempotencyKey = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | undefined => {
    const req = ctx.switchToHttp().getRequest<Request>();
    const value = req.header(IDEMPOTENCY_HEADER);
    return value?.trim() || undefined;
  },
);
