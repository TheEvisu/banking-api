import { HttpStatus } from '@nestjs/common';

import { DomainError, DomainErrorCode } from './domain.error';

export class AccountNotFoundError extends DomainError {
  readonly code: DomainErrorCode = 'ACCOUNT_NOT_FOUND';
  readonly httpStatus = HttpStatus.NOT_FOUND;

  constructor(accountId: string) {
    super(`Account ${accountId} not found`);
  }
}
