import { HttpStatus } from '@nestjs/common';

import { DomainError, DomainErrorCode } from './domain.error';

export class InsufficientFundsError extends DomainError {
  readonly code: DomainErrorCode = 'INSUFFICIENT_FUNDS';
  readonly httpStatus = HttpStatus.CONFLICT;

  constructor(accountId: string) {
    super(`Account ${accountId} has insufficient funds`);
  }
}
