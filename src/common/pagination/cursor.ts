export interface PageCursor {
  ts: string;
  id: string;
}

export const encodePageCursor = (cursor: PageCursor): string => {
  return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url');
};

export const decodePageCursor = (raw: string): PageCursor | null => {
  try {
    const json = Buffer.from(raw, 'base64url').toString('utf8');
    const parsed = JSON.parse(json) as PageCursor;
    if (typeof parsed?.ts !== 'string' || typeof parsed?.id !== 'string') return null;
    return parsed;
  } catch {
    return null;
  }
};
