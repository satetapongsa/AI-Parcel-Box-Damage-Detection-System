/**
 * Small in-memory limiter for the login form: 10 failed tries per 15 min per client.
 * Note: on serverless each instance has its own memory, so this slows guessing down
 * but is not a hard global limit. The strong defence is a long password (scrypt-hashed).
 */
const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILS = 10;
const fails = new Map();

export function clientKey(request) {
  const fwd = request.headers.get('x-forwarded-for') || '';
  return (fwd.split(',')[0] || request.headers.get('x-real-ip') || 'local').trim().slice(0, 64);
}

export function isBlocked(key, now = Date.now()) {
  const e = fails.get(key);
  if (!e || now - e.start > WINDOW_MS) return false;
  return e.n >= MAX_FAILS;
}

export function recordFail(key, now = Date.now()) {
  const e = fails.get(key);
  if (!e || now - e.start > WINDOW_MS) fails.set(key, { start: now, n: 1 });
  else e.n += 1;
  if (fails.size > 5000) fails.delete(fails.keys().next().value);
}

export function clearFails(key) {
  fails.delete(key);
}
