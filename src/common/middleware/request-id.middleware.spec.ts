import { Request, Response } from 'express';
import { validate as isUuid } from 'uuid';

import { REQUEST_ID_HEADER, RequestIdMiddleware } from './request-id.middleware';

const buildReq = (headers: Record<string, string> = {}): Request => {
  const stored: Record<string, string | undefined> = { ...headers };
  return {
    headers: stored,
    header(name: string): string | undefined {
      return stored[name.toLowerCase()];
    },
  } as unknown as Request;
};

const buildRes = (): { res: Response; setHeader: jest.Mock } => {
  const setHeader = jest.fn();
  const res = { setHeader } as unknown as Response;
  return { res, setHeader };
};

describe('RequestIdMiddleware', () => {
  const middleware = new RequestIdMiddleware();

  it('preserves a valid incoming uuid', () => {
    const incoming = 'd11b9c8e-1f1d-4a3a-9b48-e16f1ce1d111';
    const req = buildReq({ [REQUEST_ID_HEADER]: incoming });
    const { res, setHeader } = buildRes();
    const next = jest.fn();

    middleware.use(req, res, next);

    expect(req.headers[REQUEST_ID_HEADER]).toBe(incoming);
    expect(setHeader).toHaveBeenCalledWith(REQUEST_ID_HEADER, incoming);
    expect(next).toHaveBeenCalled();
  });

  it('generates a uuid when header is missing or invalid', () => {
    const req = buildReq({ [REQUEST_ID_HEADER]: 'garbage' });
    const { res, setHeader } = buildRes();

    middleware.use(req, res, jest.fn());

    const generated = req.headers[REQUEST_ID_HEADER] as string;
    expect(isUuid(generated)).toBe(true);
    expect(setHeader).toHaveBeenCalledWith(REQUEST_ID_HEADER, generated);
  });
});
