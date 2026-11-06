/**
 * SPDI digital twin — pure simulation engine (no React, no DOM).
 *
 * Models the whole line:
 *   conveyor → camera → CiRA CORE (per-frame detections) → bridge tracker (majority vote,
 *   counted once at the decision line) → ESP32 + IR breakbeam → reject pusher
 *   → local SQLite queue (store-and-forward, max 500) → cloud sync → dashboard
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

export function createSim() {
  const s = {
    running: true,
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
function pickTruth(s) {
  const r = Math.random();
  if (r < s.dentRate) return 'dent';
  if (r < s.dentRate + s.tearRate) return 'tear';
  return 'box_good';
}

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
    const ok = Math.random() < b.acc;
    const cls = ok ? b.truth : wrongClass(b.truth);
    const conf = ok ? rand(0.8, 0.98) : rand(0.5, 0.74);
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
  const result = failShare >= s.failRatio ? 'REJECT' : 'PASS';
  let predicted = 'box_good';
  if (result === 'REJECT') predicted = b.votes.dent >= b.votes.tear ? 'dent' : 'tear';
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

  // spawn (manual requests first)
  s.spawnTimer -= dt;
  if (spaceAvailable(s)) {
    if (s.returning.length) spawnBox(s, s.returning.shift());
    else if (s.manual.length) spawnBox(s, s.manual.shift());
    else if (s.spawnTimer <= 0) {
      spawnBox(s, { truth: pickTruth(s) });
      s.spawnTimer = rand(1.4, 2.6);
    }
  }

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

export function setOnline(s, online) {
  if (s.online === online) return;
  s.online = online;
  if (online) {
    const n = s.queue.length;
    pushMessage(s, 'spdi/line1/sync', { status: 'online', resync: n }, 'sync');
  } else {
    pushMessage(s, 'spdi/line1/sync', { status: 'offline', note: 'store-and-forward to local SQLite' }, 'offline');
  }
}

/** Control-panel settings that can be saved in the browser. */
export const DEFAULT_SETTINGS = { speed: 1, dentRate: 0.15, tearRate: 0.15 };

export function getSettings(s) {
  return { speed: s.speed, dentRate: s.dentRate, tearRate: s.tearRate };
}

export function applySettings(s, obj) {
  if (!obj || typeof obj !== 'object') return;
  const num = (v, lo, hi, d) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d);
  s.speed = num(obj.speed, 0.5, 4, s.speed);
  s.dentRate = num(obj.dentRate, 0, 0.5, s.dentRate);
  s.tearRate = num(obj.tearRate, 0, 0.5, s.tearRate);
}

export function addBox(s, truth) {
  if (s.manual.length < 5) s.manual.push({ truth });
}

/**
 * Operator handles a reject bin: dented boxes are fixed, torn boxes are repacked into a new carton.
 * Every unit keeps its number, becomes a normal box and goes back to the start of the belt
 * to be inspected again. Returns how many boxes were sent back.
 */
export function reworkBin(s, kind) {
  const items = s.bins[kind].splice(0);
  for (const it of items) {
    s.returning.push({ truth: 'box_good', no: it.no, tracking: it.tracking, reworked: (it.reworked || 0) + 1, dims: it.dims, color: it.color });
  }
  s.stats.reworked += items.length;
  if (items.length) {
    pushMessage(
      s,
      'spdi/line1/rework',
      { bin: kind, action: kind === 'tear' ? 'repack' : 'fix', count: items.length, units: items.map((i) => i.no) },
      'sync'
    );
  }
  return items.length;
}

export function resetSim(s) {
  const fresh = createSim();
  const keep = { speed: s.speed, dentRate: s.dentRate, tearRate: s.tearRate, online: s.online };
  Object.assign(s, fresh, keep);
}

/** Light-weight copy for React panels (charts, KPIs, logs). */
export function snapshot(s) {
  const st = s.stats;
  const perMin = (() => {
    const from = s.simTime - 60;
    let n = 0;
    for (const e of s.events) {
      if (e.simTime >= from) n += 1;
      else break;
    }
    return s.simTime >= 60 ? n : Math.round((n / Math.max(s.simTime, 1)) * 60);
  })();
  return {
    running: s.running,
    simTime: s.simTime,
    speed: s.speed,
    dentRate: s.dentRate,
    tearRate: s.tearRate,
    online: s.online,
    stats: { ...st, byClass: { ...st.byClass } },
    yieldPct: st.total ? Math.round((st.pass / st.total) * 1000) / 10 : 0,
    rejectPct: st.total ? Math.round((st.reject / st.total) * 1000) / 10 : 0,
    accuracyPct: st.total ? Math.round((st.correct / st.total) * 1000) / 10 : 0,
    avgConf: st.total ? st.confSum / st.total : null,
    perMin,
    framesTotal: s.framesTotal,
    events: s.events.slice(0, 30),
    messages: s.messages.slice(0, 25),
    queue: s.queue.length,
    synced: s.synced,
    dropped: s.dropped,
    esp32Cmds: s.esp32Cmds,
    unitsIn: s.unitsIn,
    shipped: st.accepted,
    shippedRecent: s.shipped.slice(0, 6),
    bins: { dent: s.bins.dent.length, tear: s.bins.tear.length },
    returning: s.returning.length,
    onBelt: s.boxes.length,
    // every unit is in exactly one place: shipped, in a bin, on the belt or waiting to re-enter
    balanceOk: s.unitsIn === st.accepted + s.bins.dent.length + s.bins.tear.length + s.boxes.length + s.returning.length,
    timeline: [...s.timeline.values()].map((r) => ({ ...r })),
    light: lightOf(s),
  };
}

export function lightOf(s) {
  if (!s.running) return 'red';
  if (s.simTime < s.lightUntil) return 'yellow';
  return 'green';
}

export function formatSimTime(sec) {
  const m = Math.floor(sec / 60);
  const ss = Math.floor(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}
