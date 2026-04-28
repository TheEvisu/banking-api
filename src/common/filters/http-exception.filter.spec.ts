import { ArgumentsHost, BadRequestException, HttpException } from '@nestjs/common';

import { AccountBlockedError, AccountNotFoundError, InsufficientFundsError } from '../errors';
import { REQUEST_ID_HEADER } from '../middleware/request-id.middleware';

import { GlobalExceptionFilter } from './http-exception.filter';

const makeHost = (
  requestId = '11111111-1111-4111-8111-111111111111',
): { host: ArgumentsHost; status: jest.Mock; json: jest.Mock } => {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const response = { status, json };
  const request = { headers: { [REQUEST_ID_HEADER]: requestId }, url: '/api/v1/test' };
  const host = {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => request,
    }),
  } as unknown as ArgumentsHost;
  return { host, status, json };
};

describe('GlobalExceptionFilter', () => {
  const filter = new GlobalExceptionFilter();

  it('maps account not found to 404 with structured envelope', () => {
    const { host, status, json } = makeHost();
    filter.catch(new AccountNotFoundError('a'), host);

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 404,
        code: 'ACCOUNT_NOT_FOUND',
        error: 'NotFound',
      }),
    );
  });

  it('maps domain conflicts to 409', () => {
    const { host, status, json } = makeHost();
    filter.catch(new AccountBlockedError('a'), host);
    expect(status).toHaveBeenCalledWith(409);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ code: 'ACCOUNT_BLOCKED' }));
  });

  it('maps insufficient funds to 409', () => {
    const { host, status, json } = makeHost();
    filter.catch(new InsufficientFundsError('a'), host);
    expect(status).toHaveBeenCalledWith(409);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ code: 'INSUFFICIENT_FUNDS' }));
  });

  it('maps validation errors to 400 with details', () => {
    const { host, status, json } = makeHost();
    filter.catch(
      new BadRequestException({ message: 'amount must be positive', code: 'VALIDATION_ERROR' }),
      host,
    );
    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'VALIDATION_ERROR', message: 'amount must be positive' }),
    );
  });

  it('falls back to 500 for unknown errors', () => {
    const { host, status, json } = makeHost();
    filter.catch(new Error('boom'), host);
    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ code: 'INTERNAL_ERROR' }));
  });

  it.each([
    [401, 'Unauthorized'],
    [403, 'Forbidden'],
    [422, 'UnprocessableEntity'],
    [429, 'TooManyRequests'],
    [503, 'ServiceUnavailable'],
  ])('maps HttpException with status %d to %s', (code, label) => {
    const { host, json } = makeHost();
    filter.catch(new HttpException({ message: 'x' }, code), host);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ statusCode: code, error: label }));
  });

  it('handles HttpException with a string response', () => {
    const { host, json } = makeHost();
    filter.catch(new HttpException('plain message', 418), host);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 418, message: 'plain message' }),
    );
  });
});
