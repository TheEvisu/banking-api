import { HttpStatus } from '@nestjs/common';

import { DomainError, DomainErrorCode } from './domain.error';

export class PersonNotFoundError extends DomainError {
  readonly code: DomainErrorCode = 'PERSON_NOT_FOUND';
  readonly httpStatus = HttpStatus.NOT_FOUND;

  constructor(personId: string) {
    super(`Person ${personId} not found`);
  }
}
