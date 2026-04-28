export interface StatementCursor {
  ts: string;
  id: string;
}

export const encodeCursor = (cursor: StatementCursor): string => {
  return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url');
};

export const decodeCursor = (raw: string): StatementCursor | null => {
  try {
    const json = Buffer.from(raw, 'base64url').toString('utf8');
    const parsed = JSON.parse(json) as StatementCursor;
    if (typeof parsed?.ts !== 'string' || typeof parsed?.id !== 'string') {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};
