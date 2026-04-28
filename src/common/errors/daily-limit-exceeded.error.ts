import { HttpStatus } from '@nestjs/common';

import { DomainError, DomainErrorCode } from './domain.error';

export class DailyLimitExceededError extends DomainError {
  readonly code: DomainErrorCode = 'DAILY_LIMIT_EXCEEDED';
  readonly httpStatus = HttpStatus.CONFLICT;

  constructor(accountId: string, limit: string) {
    super(`Account ${accountId} would exceed its daily withdrawal limit of ${limit}`);
  }
}
