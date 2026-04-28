export type DomainErrorCode =
  | 'ACCOUNT_NOT_FOUND'
  | 'PERSON_NOT_FOUND'
  | 'ACCOUNT_BLOCKED'
  | 'INSUFFICIENT_FUNDS'
  | 'DAILY_LIMIT_EXCEEDED'
  | 'IDEMPOTENCY_CONFLICT'
  | 'IDEMPOTENCY_UNAVAILABLE'
  | 'VALIDATION_ERROR';

export abstract class DomainError extends Error {
  abstract readonly code: DomainErrorCode;
  abstract readonly httpStatus: number;

  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}
