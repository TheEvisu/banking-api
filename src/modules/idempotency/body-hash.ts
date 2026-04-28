import { createHash } from 'node:crypto';

const canonicalize = (value: unknown): unknown => {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(canonicalize);
  const record = value as Record<string, unknown>;
  return Object.keys(record)
    .sort()
    .reduce<Record<string, unknown>>((acc, key) => {
      acc[key] = canonicalize(record[key]);
      return acc;
    }, {});
};

export const hashBody = (body: unknown): string => {
  const json = JSON.stringify(canonicalize(body ?? null));
  return createHash('sha256').update(json).digest('hex');
};
