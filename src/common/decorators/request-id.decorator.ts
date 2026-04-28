import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import { Request } from 'express';

import { REQUEST_ID_HEADER } from '../middleware/request-id.middleware';

export const RequestId = createParamDecorator((_data: unknown, ctx: ExecutionContext): string => {
  const req = ctx.switchToHttp().getRequest<Request>();
  return (req.headers[REQUEST_ID_HEADER] as string) ?? '';
});
