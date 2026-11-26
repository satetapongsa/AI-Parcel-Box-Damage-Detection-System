/** Optional ?line=<id> filter shared by the API routes. Invalid values are ignored. */
export const LINE_RE = /^[\w-]{1,32}$/;

export function lineOf(searchParams) {
  const v = (searchParams.get('line') || '').trim();
  return LINE_RE.test(v) ? v : null;
}

/** system_status document of a line's bridge (line1 keeps the original id). */
export function statusIdOf(line) {
  return !line || line === 'line1' ? 'bridge' : `bridge:${line}`;
}
