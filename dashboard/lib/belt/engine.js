/**
 * SPDI live conveyor engine (no React, no DOM).
 *
 * Draws the real line from real inspection results: every event from MongoDB (addLiveBox)
 * puts one box on the belt, at the size CiRA CORE measured, with the result the bridge decided.
 * The box passes the camera, the decision line and the pusher, then goes to the exit (PASS)
 * or the BAD bin (FAIL). Nothing here is random about the result.
 *
 * Positions on the belt are normalized: 0 = belt start, 1 = belt end.
 */

export const CLASSES = {
  box_good: { key: 'box_good', label: 'Good', color: '#22c55e', defect: false },
  dent: { key: 'dent', label: 'Dented', color: '#f59e0b', defect: true },
  tear: { key: 'tear', label: 'Torn', color: '#ef4444', defect: true },
};
export const CLASS_KEYS = Object.keys(CLASSES);

export const ZONE = {
  spawn: -0.07,
  camStart: 0.24,
  camEnd: 0.46, // decision line (box counted once here)
  ir: 0.64, // IR breakbeam triggers the ESP32
  arm: 0.7, // reject pusher position
  end: 1.07,
};

/** CiRA CORE per-frame accuracy is fixed by the trained model (not a user setting). */
export const AI_ACCURACY = { min: 0.9, max: 1.0 };

export const LIMITS = { queueMax: 500, events: 200, messages: 40, timelineBuckets: 30 };

const CIRA_FPS = 15; // detections per simulated second
const BASE_SPEED = 0.11; // belt units per simulated second at 1x
const BUCKET_SEC = 10; // timeline bucket size (simulated seconds)
const MIN_GAP = 0.13; // minimum distance between boxes on the belt
const FRAME_W = 1920;
const FRAME_H = 1080;

const rand = (a, b) => a + Math.random() * (b - a);
const clamp01 = (v) => Math.min(0.99, Math.max(0.05, v));
const r3 = (v) => Math.round(v * 1000) / 1000;

function trackingNo(id) {
  const n = String(100000000 + Math.floor(Math.random() * 899999999)).slice(0, 9);
  return `TH${n}${String(id % 100).padStart(2, '0')}`;
}

function emptyStats() {
  return {
    total: 0,
    pass: 0,
    reject: 0,
    byClass: { box_good: 0, dent: 0, tear: 0 },
    correct: 0,
    falseReject: 0, // good box rejected
    missedDefect: 0, // damaged box passed
    confSum: 0,
    accepted: 0, // reached PASS end of belt (shipped)
    rejectedBin: 0, // pushed into a reject bin (all time)
    reworked: 0, // boxes fixed / repacked from the bins and sent back to the belt
  };
}

export function createSim(opts = {}) {
  const s = {
    running: true,
    // live: boxes come only from real inspection events (addLiveBox), with their real result
    live: true,
    liveQueue: [],
    simTime: 0,
    speed: 1,
    dentRate: 0.15, // share of crushed / dented boxes
    tearRate: 0.15, // share of torn boxes
    failRatio: 0.3, // bridge: FAIL if damaged votes >= 30% (fixed, not a user setting)
    online: true,
    beltOffset: 0,
    boxes: [],
    nextId: 1,
    spawnTimer: 0.4,
    manual: [], // queued manual spawns: { truth }
    returning: [], // reworked units waiting to re-enter the belt: { truth, no, tracking, reworked }
    nextNo: 1, // physical unit number (#1, #2, ...) stays with the box for its whole life
    unitsIn: 0, // new units that entered the line
    bins: { dent: [], tear: [] }, // boxes sitting in the two reject bins
    shipped: [], // most recent shipped units (for the exit display)
    detAcc: 0,
    framesTotal: 0,
    events: [],
    messages: [],
    msgSeq: 0,
    lastFrameMsg: -1,
    queue: [], // local SQLite (store-and-forward)
    synced: 0,
    dropped: 0,
    stats: emptyStats(),
    timeline: new Map(),
    arm: { active: false, t: 0 },
    irBlocked: false,
    lightUntil: 0,
    esp32Cmds: 0,
  };
  return s;
}

/* ------------------------------------------------------------------ messages */
function pushMessage(s, topic, payload, kind = 'info') {
  s.msgSeq += 1;
  s.messages.unshift({ id: s.msgSeq, at: Date.now(), topic, kind, payload });
  if (s.messages.length > LIMITS.messages) s.messages.length = LIMITS.messages;
}

/* ------------------------------------------------------------------ spawning */
/** Carton colours seen on a real parcel line (weights = how common). */
export const BOX_COLORS = [
  { key: 'kraft', weight: 5 },
  { key: 'light', weight: 2 },
  { key: 'dark', weight: 2 },
  { key: 'white', weight: 1 },
];

function pickColor() {
  const total = BOX_COLORS.reduce((a, c) => a + c.weight, 0);
  let r = Math.random() * total;
  for (const c of BOX_COLORS) {
    r -= c.weight;
    if (r <= 0) return c.key;
  }
  return 'kraft';
}

/** Relative box size (1 = standard carton): flat mailers, cubes and tall boxes. */
function pickDims() {
  const kind = Math.random();
  if (kind < 0.2) return { w: rand(1.05, 1.3), h: rand(0.55, 0.72), d: rand(0.9, 1.2) }; // flat
  if (kind < 0.4) return { w: rand(0.72, 0.88), h: rand(1.15, 1.4), d: rand(0.75, 0.9) }; // tall
  return { w: rand(0.85, 1.15), h: rand(0.85, 1.1), d: rand(0.85, 1.1) }; // regular
}

function spaceAvailable(s) {
  return !s.boxes.some((b) => b.state === 'belt' && b.x < ZONE.spawn + MIN_GAP);
}

function spawnBox(s, spec) {
  const id = s.nextId++;
  const truth = spec.truth;
  let no = spec.no;
  if (!no) {
    no = s.nextNo++;
    s.unitsIn += 1;
  }
  s.boxes.push({
    id,
    no,
    reworked: spec.reworked || 0,
    tracking: spec.tracking || trackingNo(no),
    truth,
    x: ZONE.spawn,
    lane: rand(-6, 6), // small sideways offset in px for realism
    size: 1,
    dims: spec.dims || pickDims(),
    sizeLabel: spec.sizeLabel || null,
    color: spec.color || pickColor(),
    weight: r3(truth === 'box_good' ? rand(0.8, 3.2) : rand(0.6, 3.0)),
    votes: { box_good: 0, dent: 0, tear: 0 },
    confSum: { box_good: 0, dent: 0, tear: 0 },
    frames: 0,
    seen: null, // latest CiRA detection { cls, conf }
    decision: null, // 'PASS' | 'REJECT'
    predicted: null,
    conf: 0,
    state: 'belt', // belt | rejecting | gone
    rejectT: 0,
    seed: Math.random(),
    acc: rand(AI_ACCURACY.min, AI_ACCURACY.max), // model accuracy for this box
    forced: spec.forced || null, // live mode: { result, cls, conf } from the real event
  });
}

/* ------------------------------------------------------------- CiRA CORE AI */
function wrongClass(truth) {
  if (truth === 'box_good') return Math.random() < 0.5 ? 'dent' : 'tear';
  // a damaged box is usually confused with a good one
  if (Math.random() < 0.75) return 'box_good';
  return truth === 'dent' ? 'tear' : 'dent';
}

function ciraFrame(s) {
  s.framesTotal += 1;
  const objects = [];
  for (const b of s.boxes) {
    if (b.state !== 'belt' || b.x < ZONE.camStart || b.x > ZONE.camEnd) {
      if (b.x > ZONE.camEnd) b.seen = null;
      continue;
    }
    if (Math.random() < 0.03) continue; // missed frame
    const ok = b.forced ? true : Math.random() < b.acc;
    const cls = b.forced ? b.forced.cls : ok ? b.truth : wrongClass(b.truth);
    const conf = b.forced ? clamp01(b.forced.conf + rand(-0.03, 0.03)) : ok ? rand(0.8, 0.98) : rand(0.5, 0.74);
    b.votes[cls] += 1;
    b.confSum[cls] += conf;
    b.frames += 1;
    b.seen = { cls, conf };
    objects.push({
      name: cls,
      conf: r3(conf),
      x: Math.round(((b.x - ZONE.camStart) / (ZONE.camEnd - ZONE.camStart)) * FRAME_W),
      y: Math.round(FRAME_H / 2 + b.lane * 10),
      w: Math.round(300 * b.size),
      h: Math.round(260 * b.size),
    });
  }
  // show roughly 2 frame messages per real second so the feed stays readable
  const now = Date.now();
  if (objects.length && now - s.lastFrameMsg > 500) {
    s.lastFrameMsg = now;
    pushMessage(s, 'spdi/line1/detections', { type: 'frame', device: 'cira-01', objects }, 'frame');
  }
}

/* ------------------------------------------------- bridge tracker decision */
function decide(s, b) {
  const total = b.votes.box_good + b.votes.dent + b.votes.tear;
  const bad = b.votes.dent + b.votes.tear;
  const failShare = total > 0 ? bad / total : 0;
  let result = failShare >= s.failRatio ? 'REJECT' : 'PASS';
  let predicted = 'box_good';
  if (result === 'REJECT') predicted = b.votes.dent >= b.votes.tear ? 'dent' : 'tear';
  if (b.forced) {
    // live mode: the real bridge already decided this box
    result = b.forced.result === 'FAIL' ? 'REJECT' : 'PASS';
    predicted = result === 'REJECT' ? (b.forced.cls === 'tear' ? 'tear' : 'dent') : 'box_good';
  }
  const n = b.votes[predicted];
  const conf = n > 0 ? b.confSum[predicted] / n : 0;

  b.decision = result;
  b.predicted = predicted;
  b.conf = conf;

  const truthDefect = CLASSES[b.truth].defect;
  const correct = (result === 'REJECT') === truthDefect;
  const st = s.stats;
  st.total += 1;
  st.confSum += conf;
  st.byClass[predicted] += 1;
  if (result === 'PASS') st.pass += 1;
  else st.reject += 1;
  if (correct) st.correct += 1;
  else if (truthDefect) st.missedDefect += 1;
  else st.falseReject += 1;

  const bucket = Math.floor(s.simTime / BUCKET_SEC) * BUCKET_SEC;
  const row = s.timeline.get(bucket) || { t: bucket, pass: 0, reject: 0 };
  if (result === 'PASS') row.pass += 1;
  else row.reject += 1;
  s.timeline.set(bucket, row);
  while (s.timeline.size > LIMITS.timelineBuckets) s.timeline.delete(s.timeline.keys().next().value);

  const ev = {
    eventId: `line1-${b.id}`,
    no: b.no,
    reworked: b.reworked,
    tracking: b.tracking,
    at: Date.now(),
    simTime: s.simTime,
    truth: b.truth,
    predicted,
    result,
    conf: r3(conf),
    frames: b.frames,
    votes: { ...b.votes },
    weight: b.weight,
    correct,
    seed: b.seed,
  };
  s.events.unshift(ev);
  if (s.events.length > LIMITS.events) s.events.length = LIMITS.events;

  // local SQLite first (edge), cloud later
  s.queue.push({ eventId: ev.eventId, t: s.simTime });
  if (s.queue.length > LIMITS.queueMax) {
    s.queue.shift();
    s.dropped += 1;
  }

  pushMessage(
    s,
    'spdi/line1/counted',
    {
      eventId: ev.eventId,
      unit: b.no,
      tracking: ev.tracking,
      result,
      className: predicted,
      confidence: ev.conf,
      framesSeen: b.frames,
      votes: ev.votes,
    },
    result === 'REJECT' ? 'reject' : 'pass'
  );
  if (result === 'REJECT') s.lightUntil = s.simTime + 1.2;
}

/* ------------------------------------------------------------ cloud sync */
function syncStep(s) {
  if (!s.online || s.queue.length === 0) return;
  let n = 0;
  // ~0.4 s upload latency; after an outage the backlog is re-synced in batches of 25
  while (s.queue.length && s.simTime - s.queue[0].t > 0.4 && n < 25) {
    s.queue.shift();
    n += 1;
  }
  s.synced += n;
}

/* ------------------------------------------------------------------ public */
export function step(s, dtReal) {
  if (!s.running) return;
  const dt = Math.min(dtReal, 0.1) * s.speed;
  s.simTime += dt;
  const v = BASE_SPEED;
  s.beltOffset = (s.beltOffset + v * dt) % 1;

  // boxes come only from real inspections (addLiveBox)
  if (spaceAvailable(s) && s.liveQueue.length) spawnBox(s, s.liveQueue.shift());

  // move boxes
  for (const b of s.boxes) {
    if (b.state === 'belt') {
      const before = b.x;
      b.x += v * dt;
      if (before < ZONE.camEnd && b.x >= ZONE.camEnd && !b.decision) decide(s, b);
      if (b.decision === 'REJECT' && before < ZONE.arm && b.x >= ZONE.arm && !s.arm.active) {
        b.state = 'rejecting';
        b.rejectT = 0;
        s.arm.active = true;
        s.arm.t = 0;
        s.esp32Cmds += 1;
        pushMessage(s, 'spdi/line1/esp32/cmd', { action: 'REJECT', tracking: b.tracking, delay_ms: 0 }, 'reject');
      }
      if (b.x >= ZONE.end) {
        b.state = 'gone';
        s.stats.accepted += 1;
        s.shipped.unshift({ no: b.no, reworked: b.reworked });
        if (s.shipped.length > 8) s.shipped.length = 8;
      }
    } else if (b.state === 'rejecting') {
      b.rejectT += dt / 0.55;
      b.x += v * dt * 0.3;
      if (b.rejectT >= 1) {
        b.state = 'gone';
        s.stats.rejectedBin += 1;
        const bin = b.predicted === 'tear' ? 'tear' : 'dent';
        s.bins[bin].push({ no: b.no, tracking: b.tracking, truth: b.truth, seed: b.seed, reworked: b.reworked, dims: b.dims, color: b.color });
      }
    }
  }
  s.boxes = s.boxes.filter((b) => b.state !== 'gone');

  // pusher animation (out and back)
  if (s.arm.active) {
    s.arm.t += dt / 0.9;
    if (s.arm.t >= 1) {
      s.arm.active = false;
      s.arm.t = 0;
    }
  }

  // IR breakbeam
  s.irBlocked = s.boxes.some((b) => b.state === 'belt' && Math.abs(b.x - ZONE.ir) < 0.035);

  // CiRA runs at a fixed simulated frame rate
  s.detAcc += dt;
  while (s.detAcc >= 1 / CIRA_FPS) {
    s.detAcc -= 1 / CIRA_FPS;
    ciraFrame(s);
  }

  syncStep(s);
}

/**
 * Live mode: put one real inspection event on the belt.
 * ev: { result: 'PASS'|'FAIL', className, confidence } from MongoDB (/api/events)
 */
export function addLiveBox(s, ev) {
  const fail = ev.result === 'FAIL';
  // the live line has one reject bin: every FAIL goes there (kept in the "dent" slot)
  const cls = fail ? 'dent' : 'box_good';
  const conf = Number.isFinite(ev.confidence) ? ev.confidence : 0.9;
  const { dims, label } = liveDims(ev.size);
  if (s.liveQueue.length < 50) s.liveQueue.push({ truth: cls, dims, sizeLabel: label, forced: { result: fail ? 'FAIL' : 'PASS', cls, conf } });
}

const REF_CM = { length: 30, width: 25, height: 20 }; // drawn at the normal box size
const REF_FRAME = { w: 0.3, h: 0.35 }; // share of the camera frame drawn at the normal size
const scale = (v, ref) => Math.min(1.7, Math.max(0.5, v / ref));

/**
 * Real box size from the bridge -> drawing scale { w: length, h: height, d: width } and a short label.
 * Calibrated: cm values (a missing one stays normal size, shown as "?").
 * Not calibrated: share of the camera frame (top camera: length x width, side camera: length x height).
 */
export function liveDims(size) {
  if (!size || !(size.w > 0) || !(size.h > 0)) return { dims: { w: 1, h: 1, d: 1 }, label: null };
  if (size.lengthCm > 0) {
    const show = (v) => (v > 0 ? Math.round(v) : '?');
    return {
      dims: {
        w: scale(size.lengthCm, REF_CM.length),
        h: size.heightCm > 0 ? scale(size.heightCm, REF_CM.height) : 1,
        d: size.widthCm > 0 ? scale(size.widthCm, REF_CM.width) : 1,
      },
      label: `${show(size.lengthCm)}×${show(size.widthCm)}×${show(size.heightCm)} cm`,
    };
  }
  const pct = (v) => `${Math.round(v * 100)}%`;
  const side = size.view === 'side';
  return {
    dims: { w: scale(size.w, REF_FRAME.w), h: side ? scale(size.h, REF_FRAME.h) : 1, d: side ? 1 : scale(size.h, REF_FRAME.h) },
    label: `${pct(size.w)}×${pct(size.h)} of frame`,
  };
}

/** Control-panel settings that can be saved in the browser. */

export function lightOf(s) {
  if (!s.running) return 'red';
  if (s.simTime < s.lightUntil) return 'yellow';
  return 'green';
}
