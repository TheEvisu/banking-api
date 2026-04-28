import { HttpStatus } from '@nestjs/common';

import { DomainError, DomainErrorCode } from './domain.error';

export class AccountBlockedError extends DomainError {
  readonly code: DomainErrorCode = 'ACCOUNT_BLOCKED';
  readonly httpStatus = HttpStatus.CONFLICT;

  constructor(accountId: string) {
    super(`Account ${accountId} is blocked`);
  }
}
