import { hashBody } from './body-hash';

describe('hashBody', () => {
  it('produces the same hash regardless of key order', () => {
    expect(hashBody({ a: 1, b: 2 })).toBe(hashBody({ b: 2, a: 1 }));
  });

  it('differs when values change', () => {
    expect(hashBody({ amount: 100 })).not.toBe(hashBody({ amount: 101 }));
  });

  it('handles nested structures and arrays consistently', () => {
    expect(hashBody({ a: [{ x: 1, y: 2 }] })).toBe(hashBody({ a: [{ y: 2, x: 1 }] }));
  });

  it('treats undefined and missing payloads as null', () => {
    expect(hashBody(undefined)).toBe(hashBody(null));
  });
});
