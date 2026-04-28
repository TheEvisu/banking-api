import { decodeCursor, encodeCursor } from './cursor';

describe('statement cursor', () => {
  it('round-trips a value', () => {
    const original = { ts: '2026-04-27T10:00:00.000Z', id: '00000000-0000-0000-0000-000000000001' };
    const encoded = encodeCursor(original);
    expect(decodeCursor(encoded)).toEqual(original);
  });

  it('returns null for malformed input', () => {
    expect(decodeCursor('!!!not-base64!!!')).toBeNull();
    expect(decodeCursor(Buffer.from('"plain string"').toString('base64url'))).toBeNull();
  });
});
