/**
 * Validation for POST /api/ingest (bridge -> dashboard over HTTPS).
 * Only allow-listed fields with checked types are kept, so a request can never
 * smuggle MongoDB operators ($set, $where, ...) or extra keys into the database.
 */
import { timingSafeEqual } from 'crypto';

export const MAX_BODY_BYTES = 512 * 1024;
export const MAX_EVENTS = 200;

const ID_RE = /^[\w.:-]{1,120}$/;
const NAME_RE = /^[\w .:-]{1,64}$/;
const MIN_TS = Date.UTC(2024, 0, 1);

export function tokenMatches(given, expected) {
  if (!expected) return false;
  const a = Buffer.from(String(given || ''));
  const b = Buffer.from(String(expected));
  return a.length === b.length && timingSafeEqual(a, b);
}

/** "Bearer <token>" -> "<token>" */
export function bearer(header) {
  const m = /^Bearer\s+(\S+)$/i.exec(String(header || ''));
  return m ? m[1] : '';
}

function str(v, re) {
  return typeof v === 'string' && re.test(v) ? v : null;
}
function int(v) {
  return Number.isInteger(v) && v >= 0 && v <= 1e9 ? v : null;
}
function toDate(v, now) {
  const t = typeof v === 'number' ? v : typeof v === 'string' ? Date.parse(v) : NaN;
  if (!Number.isFinite(t) || t < MIN_TS || t > now + 24 * 3600 * 1000) return null;
  return new Date(t);
}

/** Returns { doc } or { error } for one inspection event. */
export function cleanEvent(e, now = Date.now()) {
  if (!e || typeof e !== 'object' || Array.isArray(e)) return { error: 'not an object' };
  const eventId = str(e.eventId, ID_RE);
  if (!eventId) return { error: 'eventId' };
  const ts = toDate(e.ts, now);
  if (!ts) return { error: 'ts' };
  if (e.result !== 'PASS' && e.result !== 'FAIL') return { error: 'result' };
  const line = str(e.line, /^[\w-]{1,32}$/);
  if (!line) return { error: 'line' };
  const className = str(e.className, NAME_RE);
  if (!className) return { error: 'className' };
  const confidence = typeof e.confidence === 'number' && e.confidence >= 0 && e.confidence <= 1 ? e.confidence : null;
  if (confidence === null) return { error: 'confidence' };

  const doc = { eventId, ts, line, result: e.result, className, confidence, createdAt: new Date(now) };
  const device = str(e.device, NAME_RE);
  const source = str(e.source, NAME_RE);
  if (device) doc.device = device;
  if (source) doc.source = source;
  if (int(e.trackId) !== null) doc.trackId = e.trackId;
  if (int(e.framesSeen) !== null) doc.framesSeen = e.framesSeen;
  if (e.votes && int(e.votes.pass) !== null && int(e.votes.fail) !== null) {
    doc.votes = { pass: e.votes.pass, fail: e.votes.fail };
  }
  return { doc };
}

/** Bridge heartbeat -> fields for system_status, or null when invalid. */
export function cleanStatus(s, now = Date.now()) {
  if (!s || typeof s !== 'object' || Array.isArray(s)) return null;
  const line = str(s.line, /^[\w-]{1,32}$/) || 'line1';
  const out = { line, sink: 'http', updatedAt: s.offline === true ? new Date(0) : new Date(now) };
  for (const k of ['mqttConnected']) if (typeof s[k] === 'boolean') out[k] = s[k];
  for (const k of ['fps']) if (typeof s[k] === 'number' && s[k] >= 0 && s[k] < 1000) out[k] = s[k];
  for (const k of ['activeTracks', 'sessionCount', 'pendingWrites']) if (int(s[k]) !== null) out[k] = s[k];
  for (const k of ['inputMode', 'lastDevice', 'lastSource']) {
    const v = str(s[k], NAME_RE);
    if (v) out[k] = v;
  }
  for (const k of ['lastFrameAt', 'lastEventAt']) {
    if (s[k] === null) out[k] = null;
    else {
      const d = toDate(s[k], now);
      if (d) out[k] = d;
    }
  }
  return { id: line === 'line1' ? 'bridge' : `bridge:${line}`, fields: out };
}
