import { decodePageCursor, encodePageCursor } from './cursor';

describe('page cursor', () => {
  it('round-trips a value', () => {
    const original = { ts: '2026-04-28T10:00:00.000Z', id: '11111111-2222-4333-8444-555555555555' };
    expect(decodePageCursor(encodePageCursor(original))).toEqual(original);
  });

  it('returns null on garbage input', () => {
    expect(decodePageCursor('!not-base64!')).toBeNull();
    expect(decodePageCursor(Buffer.from('"plain"').toString('base64url'))).toBeNull();
  });
});
