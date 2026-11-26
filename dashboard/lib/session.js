/**
 * Dashboard login session (optional).
 * Login is ON only when DASHBOARD_PASSWORD_HASH and SESSION_SECRET are set; otherwise the
 * dashboard stays public as before.
 * Cookie value: base64url(JSON {exp}) + "." + base64url(HMAC-SHA256(secret, payload)).
 * Uses Web Crypto so the same code runs in proxy.js and in API routes.
 */
export const COOKIE = 'spdi_session';
export const SESSION_HOURS = 12;

const enc = new TextEncoder();

export function authEnabled() {
  return Boolean(process.env.DASHBOARD_PASSWORD_HASH && (process.env.SESSION_SECRET || '').length >= 32);
}

function b64url(bytes) {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function fromB64url(str) {
  const s = atob(str.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
}

function hmacKey() {
  return crypto.subtle.importKey('raw', enc.encode(process.env.SESSION_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

export async function createSessionValue(now = Date.now()) {
  const payload = b64url(enc.encode(JSON.stringify({ exp: now + SESSION_HOURS * 3600 * 1000 })));
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', await hmacKey(), enc.encode(payload)));
  return `${payload}.${b64url(sig)}`;
}

/** true when the cookie value is signed by us and not expired */
export async function verifySessionValue(value, now = Date.now()) {
  if (typeof value !== 'string' || value.length > 512) return false;
  const [payload, sig, extra] = value.split('.');
  if (!payload || !sig || extra !== undefined) return false;
  try {
    const ok = await crypto.subtle.verify('HMAC', await hmacKey(), fromB64url(sig), enc.encode(payload));
    if (!ok) return false;
    const { exp } = JSON.parse(new TextDecoder().decode(fromB64url(payload)));
    return Number.isFinite(exp) && exp > now;
  } catch {
    return false;
  }
}

export function cookieOptions(maxAgeS = SESSION_HOURS * 3600) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: maxAgeS,
  };
}

/** For API routes: null when allowed, or a 401 Response. */
export async function requireSession(request) {
  if (!authEnabled()) return null;
  const value = request.cookies ? request.cookies.get(COOKIE)?.value : null;
  if (await verifySessionValue(value)) return null;
  return Response.json({ ok: false, error: 'Login required' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
}
