import { BadRequestException } from '@nestjs/common';

import { ParseUuidPipe } from './parse-uuid.pipe';

describe('ParseUuidPipe', () => {
  const pipe = new ParseUuidPipe();
  const meta = { type: 'param' as const, data: 'id' };

  it('passes a valid uuid through unchanged', () => {
    const id = '5f9b1e6e-2c0e-4c7c-93d6-1e4d2fa9d111';
    expect(pipe.transform(id, meta)).toBe(id);
  });

  it('rejects an invalid value', () => {
    expect(() => pipe.transform('not-a-uuid', meta)).toThrow(BadRequestException);
  });
});
