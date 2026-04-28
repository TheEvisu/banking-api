import { HttpStatus } from '@nestjs/common';

import { DomainError, DomainErrorCode } from './domain.error';

export class IdempotencyConflictError extends DomainError {
  readonly code: DomainErrorCode = 'IDEMPOTENCY_CONFLICT';
  readonly httpStatus = HttpStatus.CONFLICT;

  constructor(message = 'A request with the same Idempotency-Key is already in flight') {
    super(message);
  }
}

export class IdempotencyUnavailableError extends DomainError {
  readonly code: DomainErrorCode = 'IDEMPOTENCY_UNAVAILABLE';
  readonly httpStatus = HttpStatus.SERVICE_UNAVAILABLE;

  constructor() {
    super('Idempotency layer is unavailable');
  }
}
