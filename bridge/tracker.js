'use strict';
/**
 * Pure, testable detection -> counted-box logic.
 *
 * 1. extractObjects()   accepts many payload shapes (CiRA versions differ)
 * 2. normalizeObject()  -> { name, conf (0-1), cx, cy, w, h } in normalized 0-1 coords (cx,cy = center)
 * 3. createTracker()    centroid tracking + virtual line counting + majority vote
 *
 * No I/O here (no MQTT, no MongoDB) so it can be unit-tested with node:test.
 */
const crypto = require('crypto');

const DEFAULTS = {
  lineId: 'line1',
  device: 'cira-01',
  source: 'cira',
  goodClasses: ['good'],
  damagedClasses: ['damaged'],
  minConf: 0.5,
  frameW: 640,
  frameH: 480,
  boxOrigin: 'center', // 'center' | 'topleft' (meaning of x,y)
  linePos: 0.5, // virtual line position, normalized 0-1 along x
  direction: 'ltr', // 'ltr' | 'rtl'
  maxDist: 0.12, // max normalized distance to match a detection to a track
  trackTtlMs: 1000, // drop a track not seen for this long
  minFrames: 5, // a track must be seen this many frames before it can be counted
  failRatio: 0.3, // FAIL if damaged votes / all votes >= failRatio (bias to FAIL)
};

// Max believable speed: 3 frame-widths per second (normalized units per ms).
const MAX_SPEED = 3 / 1000;

function toNum(v) {
  if (v === null || v === undefined || v === '') return NaN;
  return typeof v === 'number' ? v : Number(v);
}

function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v));
}

function round(v, digits = 3) {
  const f = 10 ** digits;
  return Math.round(v * f) / f;
}

/**
 * Find the detection array inside any supported payload shape.
 * Returns an array (possibly empty) or null when the shape is unknown.
 */
function extractObjects(payload) {
  if (payload === null || payload === undefined) return null;
  if (Array.isArray(payload)) return payload;
  if (typeof payload !== 'object') return null;
  if (Array.isArray(payload.objects)) return payload.objects;
  const keys = ['DeepDetect', 'DeepDetectCPU', 'deepdetect', 'deepDetect', 'detections', 'payload', 'data'];
  for (const key of keys) {
    const v = payload[key];
    if (Array.isArray(v)) return v;
    if (v && typeof v === 'object' && Array.isArray(v.objects)) return v.objects;
  }
  return null;
}

/**
 * Parse a raw MQTT message text into a JSON value.
 * Handles: plain JSON, double-encoded JSON, and CiRA MqttPub messages that attach an image, e.g.
 *   "have_image___cira__<>,data:image/jpeg;base64,...."  or  "{json}<>data:image/jpeg;base64,..."
 * Returns { payload, hasImage } ; payload is null when no JSON could be found.
 */
function parseMessage(text) {
  const s = String(text == null ? '' : text);
  const hasImage = s.includes('data:image/') || s.startsWith('have_image');
  const tryJson = (t) => {
    try {
      let v = JSON.parse(t);
      if (typeof v === 'string') {
        try {
          v = JSON.parse(v); // double-encoded
        } catch {
          return null;
        }
      }
      return v && typeof v === 'object' ? v : null;
    } catch {
      return null;
    }
  };

  const direct = tryJson(s.trim());
  if (direct) return { payload: direct, hasImage };

  // CiRA separates parts with "<>"; image parts are base64 and never contain { } [ ]
  for (const part of s.split('<>')) {
    const p = part.replace(/^,/, '').trim();
    if (!p || p.startsWith('data:image') || p.startsWith('have_image')) continue;
    const v = tryJson(p);
    if (v) return { payload: v, hasImage };
  }

  // Last resort: the outermost {...} block
  const a = s.indexOf('{');
  const b = s.lastIndexOf('}');
  if (a !== -1 && b > a) {
    const v = tryJson(s.slice(a, b + 1));
    if (v) return { payload: v, hasImage };
  }
  return { payload: null, hasImage };
}

/**
 * Normalize one raw detection object.
 * Accepts name|class|label, confidence|conf|score (0-1 or 0-100),
 * x,y,w,h (or width/height, or bbox:[x,y,w,h]) in pixels or normalized 0-1.
 */
function normalizeObject(obj, opts = {}) {
  const o = { ...DEFAULTS, ...opts };
  if (!obj || typeof obj !== 'object') return null;

  const nameRaw = obj.name ?? obj.class ?? obj.label ?? obj.className ?? obj.class_name;
  if (nameRaw === undefined || nameRaw === null || String(nameRaw).trim() === '') return null;
  const name = String(nameRaw).trim();

  let conf = toNum(obj.confidence ?? obj.conf ?? obj.score ?? obj.prob ?? obj.probability);
  if (!Number.isFinite(conf)) conf = 1;
  if (conf > 1) conf = conf / 100;
  conf = clamp(conf, 0, 1);

  let x = obj.x;
  let y = obj.y;
  let w = obj.w ?? obj.width;
  let h = obj.h ?? obj.height;
  if ((x === undefined || y === undefined) && Array.isArray(obj.bbox) && obj.bbox.length >= 4) {
    [x, y, w, h] = obj.bbox;
  }
  x = toNum(x);
  y = toNum(y);
  w = toNum(w);
  h = toNum(h);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  if (!Number.isFinite(w)) w = 0;
  if (!Number.isFinite(h)) h = 0;

  // All values within 0..1 => already normalized. Otherwise treat as pixels.
  const isNormalized = x >= 0 && x <= 1 && y >= 0 && y <= 1 && w <= 1 && h <= 1;
  let nx = x;
  let ny = y;
  let nw = w;
  let nh = h;
  if (!isNormalized) {
    nx = x / o.frameW;
    ny = y / o.frameH;
    nw = w / o.frameW;
    nh = h / o.frameH;
  }
  if (o.boxOrigin === 'topleft') {
    nx += nw / 2;
    ny += nh / 2;
  }
  return { name, conf, cx: nx, cy: ny, w: nw, h: nh };
}

/** Build a classifier: class name -> 'PASS' | 'FAIL' | null (unknown). Case-insensitive. */
function makeClassifier(goodClasses, damagedClasses) {
  const good = new Set((goodClasses || []).map((s) => String(s).trim().toLowerCase()));
  const bad = new Set((damagedClasses || []).map((s) => String(s).trim().toLowerCase()));
  return function classify(name) {
    const k = String(name || '').trim().toLowerCase();
    if (bad.has(k)) return 'FAIL';
    if (good.has(k)) return 'PASS';
    return null;
  };
}

function newRunId() {
  return Date.now().toString(36) + crypto.randomBytes(3).toString('hex');
}

/**
 * Create a stateful tracker.
 * processFrame(payload, ts, meta) -> { ok, detections, events[] }
 * update(normalizedDetections, ts, meta) -> events[]
 */
function createTracker(options = {}) {
  const o = { ...DEFAULTS, ...options };
  const onWarn = typeof o.onWarn === 'function' ? o.onWarn : () => {};
  const runId = o.runId || newRunId();
  const classify = makeClassifier(o.goodClasses, o.damagedClasses);
  const warned = new Set();
  const tracks = new Map();
  let nextId = 1;

  function warnOnce(key, message) {
    if (warned.has(key)) return;
    warned.add(key);
    onWarn(message);
  }

  /** 'before' or 'after' the virtual line, depending on travel direction. */
  function sideOf(cx) {
    if (o.direction === 'rtl') return cx > o.linePos ? 'before' : 'after';
    return cx < o.linePos ? 'before' : 'after';
  }

  function decide(t) {
    const total = t.passVotes + t.failVotes;
    const failShare = total > 0 ? t.failVotes / total : 0;
    const result = failShare >= o.failRatio ? 'FAIL' : 'PASS';
    // most frequent class name within the winning group
    let className = result === 'FAIL' ? 'damaged' : 'good';
    let best = -1;
    for (const [name, info] of Object.entries(t.names)) {
      if (info.vote === result && info.n > best) {
        best = info.n;
        className = name;
      }
    }
    const confSum = result === 'FAIL' ? t.confFail : t.confPass;
    const confN = result === 'FAIL' ? t.failVotes : t.passVotes;
    return { result, className, confidence: confN > 0 ? round(confSum / confN) : 0 };
  }

  function observe(t, det, ts, meta) {
    const dt = ts - t.lastSeen;
    if (t.frames > 0 && dt > 0) {
      // smoothed velocity in normalized units per millisecond (works with dropped frames),
      // clamped so one bad match cannot explode it
      const vx = (det.cx - t.cx) / dt;
      const vy = (det.cy - t.cy) / dt;
      t.vx = clamp(t.frames > 1 ? 0.6 * t.vx + 0.4 * vx : vx, -MAX_SPEED, MAX_SPEED);
      t.vy = clamp(t.frames > 1 ? 0.6 * t.vy + 0.4 * vy : vy, -MAX_SPEED, MAX_SPEED);
    }
    t.cx = det.cx;
    t.cy = det.cy;
    t.frames += 1;
    t.lastSeen = ts;
    if (meta.device) t.device = meta.device;
    if (meta.source) t.source = meta.source;
    if (det.vote === 'FAIL') {
      t.failVotes += 1;
      t.confFail += det.conf;
    } else {
      t.passVotes += 1;
      t.confPass += det.conf;
    }
    const entry = t.names[det.name] || { n: 0, vote: det.vote };
    entry.n += 1;
    t.names[det.name] = entry;
  }

  function maybeCount(t, ts) {
    if (t.counted) return null;
    if (t.startSide !== 'before') return null; // born past the line -> never count (prevents re-counting)
    if (sideOf(t.cx) !== 'after') return null;
    if (t.frames < o.minFrames) return null;
    t.counted = true;
    const d = decide(t);
    return {
      eventId: `${o.lineId}-${runId}-${t.id}`,
      ts,
      line: o.lineId,
      device: t.device,
      result: d.result,
      className: d.className,
      confidence: d.confidence,
      trackId: t.id,
      framesSeen: t.frames,
      votes: { pass: t.passVotes, fail: t.failVotes },
      source: t.source,
    };
  }

  /**
   * dets: [{ name, conf, cx, cy, vote: 'PASS'|'FAIL' }] (already normalized & classified)
   */
  function update(dets, ts = Date.now(), meta = {}) {
    // 1) expire stale tracks
    for (const [id, t] of tracks) {
      if (ts - t.lastSeen > o.trackTtlMs) tracks.delete(id);
    }

    // 2) greedy nearest-neighbor matching (predicted position vs detection)
    const pairs = [];
    for (const t of tracks.values()) {
      const elapsed = Math.max(0, ts - t.lastSeen);
      const px = t.cx + t.vx * elapsed;
      const py = t.cy + t.vy * elapsed;
      for (let i = 0; i < dets.length; i++) {
        const d = Math.hypot(px - dets[i].cx, py - dets[i].cy);
        if (d <= o.maxDist) pairs.push([d, t.id, i]);
      }
    }
    pairs.sort((a, b) => a[0] - b[0]);
    const usedTracks = new Set();
    const usedDets = new Set();
    const events = [];

    for (const [, tid, i] of pairs) {
      if (usedTracks.has(tid) || usedDets.has(i)) continue;
      usedTracks.add(tid);
      usedDets.add(i);
      const t = tracks.get(tid);
      observe(t, dets[i], ts, meta);
      const ev = maybeCount(t, ts);
      if (ev) events.push(ev);
    }

    // 3) unmatched detections start new tracks
    for (let i = 0; i < dets.length; i++) {
      if (usedDets.has(i)) continue;
      const t = {
        id: nextId++,
        cx: dets[i].cx,
        cy: dets[i].cy,
        vx: 0,
        vy: 0,
        frames: 0,
        firstSeen: ts,
        lastSeen: ts,
        startSide: sideOf(dets[i].cx),
        passVotes: 0,
        failVotes: 0,
        confPass: 0,
        confFail: 0,
        names: {},
        counted: false,
        device: meta.device || o.device,
        source: meta.source || o.source,
      };
      tracks.set(t.id, t);
      observe(t, dets[i], ts, meta);
      const ev = maybeCount(t, ts);
      if (ev) events.push(ev);
    }
    return events;
  }

  /** Full pipeline for one raw MQTT payload (any supported shape). */
  function processFrame(payload, ts = Date.now(), meta = {}) {
    const raw = extractObjects(payload);
    if (raw === null) {
      warnOnce(
        'shape',
        'Unknown payload shape: expected {objects:[...]}, {DeepDetect:{objects:[...]}}, {DeepDetectCPU:{objects:[...]}} or an array'
      );
      return { ok: false, detections: 0, events: update([], ts, meta) };
    }
    const dets = [];
    for (const r of raw) {
      const n = normalizeObject(r, o);
      if (!n) continue;
      if (n.cx > 1.5 || n.cy > 1.5 || n.cx < -0.5 || n.cy < -0.5) {
        warnOnce(
          'range',
          `Box position outside the frame (x=${round(n.cx, 2)}, y=${round(n.cy, 2)} normalized). Check FRAME_W/FRAME_H (now ${o.frameW}x${o.frameH}) and BOX_ORIGIN.`
        );
      }
      const vote = classify(n.name);
      if (!vote) {
        warnOnce(
          `class:${n.name.toLowerCase()}`,
          `Unknown class "${n.name}" -> skipped. Add it to GOOD_CLASSES or DAMAGED_CLASSES in bridge/.env`
        );
        continue;
      }
      if (n.conf < o.minConf) continue;
      dets.push({ ...n, vote });
    }
    return { ok: true, detections: dets.length, events: update(dets, ts, meta) };
  }

  return {
    runId,
    processFrame,
    update,
    activeCount: () => tracks.size,
    getTracks: () => [...tracks.values()].map((t) => ({ ...t, names: { ...t.names } })),
    reset: () => {
      tracks.clear();
      nextId = 1;
    },
  };
}

/**
 * Normalize an already-counted event (topic spdi/<line>/events, e.g. counting done inside CiRA).
 * Returns an event object or null if result cannot be determined.
 */
function normalizeEvent(payload, ctx = {}) {
  const c = { ...DEFAULTS, ...ctx };
  const classify = c.classify || makeClassifier(c.goodClasses, c.damagedClasses);
  const p = Array.isArray(payload) ? payload[0] : payload;
  if (!p || typeof p !== 'object') return null;

  const resultMap = {
    PASS: 'PASS', OK: 'PASS', GOOD: 'PASS', TRUE: 'PASS',
    FAIL: 'FAIL', NG: 'FAIL', DAMAGED: 'FAIL', DAMAGE: 'FAIL', DEFECT: 'FAIL', REJECT: 'FAIL',
  };
  const name = p.className ?? p.name ?? p.class ?? p.label ?? null;
  let result = resultMap[String(p.result ?? p.status ?? '').trim().toUpperCase()] || null;
  if (!result && name !== null) result = classify(name);
  if (!result) return null;

  let conf = toNum(p.confidence ?? p.conf ?? p.score);
  if (!Number.isFinite(conf)) conf = 1;
  if (conf > 1) conf /= 100;

  const ts = Number.isFinite(toNum(p.ts)) && toNum(p.ts) > 1e12 ? toNum(p.ts) : c.now || Date.now();
  const device = p.device ? String(p.device) : c.device;
  return {
    eventId: p.eventId ? String(p.eventId) : `${c.lineId}-evt-${ts}-${crypto.randomBytes(3).toString('hex')}`,
    ts,
    line: c.lineId,
    device,
    result,
    className: name !== null ? String(name) : result === 'FAIL' ? 'damaged' : 'good',
    confidence: round(clamp(conf, 0, 1)),
    trackId: Number.isFinite(toNum(p.trackId)) ? toNum(p.trackId) : null,
    framesSeen: Number.isFinite(toNum(p.framesSeen)) ? toNum(p.framesSeen) : null,
    votes: p.votes && typeof p.votes === 'object' ? p.votes : null,
    source: p.source ? String(p.source) : c.source,
  };
}

module.exports = {
  DEFAULTS,
  parseMessage,
  extractObjects,
  normalizeObject,
  makeClassifier,
  createTracker,
  normalizeEvent,
};
