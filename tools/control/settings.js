'use strict';
/**
 * Bridge settings that the Control Center may change in bridge/.env.
 * Only these keys, only values that pass the check. Secrets (MONGODB_URI, tokens, webhook URLs) are never read or written here.
 */
const fs = require('fs');

const num = (min, max) => (v) => /^\d+(\.\d+)?$/.test(v) && Number(v) >= min && Number(v) <= max;
const int = (min, max) => (v) => /^\d+$/.test(v) && Number(v) >= min && Number(v) <= max;
const classes = (v) => v.length <= 400 && /^[\w-]{1,40}(,[\w-]{1,40})*$/.test(v);

const SETTINGS = {
  MIN_CONF: { def: '0.5', check: num(0, 1), hint: '0-1, ignore detections below this confidence' },
  MIN_FRAMES: { def: '5', check: int(1, 100), hint: 'frames a box must be seen before it is counted' },
  FAIL_RATIO: { def: '0.3', check: num(0, 1), hint: 'FAIL when this share of frames says damaged' },
  GOOD_CLASSES: { check: classes, hint: 'comma separated, counted as PASS' },
  DAMAGED_CLASSES: { check: classes, hint: 'comma separated, counted as FAIL' },
  SINK: { def: 'mongo', check: (v) => v === 'mongo' || v === 'http', hint: 'mongo = Atlas directly, http = dashboard /api/ingest' },
  ALERT_FAIL_STREAK: { def: '3', check: int(1, 50), hint: 'alert after this many FAIL in a row' },
};

function readText(envFile) {
  try {
    return fs.readFileSync(envFile, 'utf8');
  } catch {
    return '';
  }
}

function readSettings(envFile) {
  const text = readText(envFile);
  const out = {};
  for (const key of Object.keys(SETTINGS)) {
    const m = text.match(new RegExp(`^${key}=(.*)$`, 'm'));
    out[key] = (m && m[1].trim()) || SETTINGS[key].def || ''; // missing in .env -> the bridge default
  }
  return out;
}

/** Validate then write; returns { ok, changed[] } or { ok:false, error }. */
function writeSettings(envFile, values) {
  if (!values || typeof values !== 'object' || Array.isArray(values)) return { ok: false, error: 'values must be an object' };
  const clean = {};
  for (const [key, raw] of Object.entries(values)) {
    const spec = SETTINGS[key];
    if (!spec) return { ok: false, error: `${key} cannot be changed here` };
    const v = String(raw).trim().replace(/\s*,\s*/g, ',');
    if (!spec.check(v)) return { ok: false, error: `${key}: ${spec.hint}` };
    clean[key] = v;
  }
  let text = readText(envFile);
  const nl = text.includes('\r\n') ? '\r\n' : '\n';
  const changed = [];
  for (const [key, v] of Object.entries(clean)) {
    const re = new RegExp(`^${key}=.*$`, 'm');
    const m = text.match(re);
    if (m && m[0].slice(key.length + 1).trim() === v) continue;
    changed.push(key);
    if (m) text = text.replace(re, `${key}=${v}`);
    else text = `${text}${text && !text.endsWith(nl) ? nl : ''}${key}=${v}${nl}`;
  }
  if (changed.length) {
    const tmp = `${envFile}.tmp`;
    fs.writeFileSync(tmp, text);
    fs.renameSync(tmp, envFile);
  }
  return { ok: true, changed };
}

module.exports = { SETTINGS, readSettings, writeSettings };
