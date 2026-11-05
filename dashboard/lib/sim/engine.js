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
  box_good: { key: 'box_good', th: 'กล่องดี', color: '#22c55e', defect: false },
  dent: { key: 'dent', th: 'บุบ', color: '#f59e0b', defect: true },
  tear: { key: 'tear', th: 'ฉีกขาด', color: '#ef4444', defect: true },
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
    accepted: 0, // reached PASS end of belt
    rejectedBin: 0, // pushed into reject bin
  };
}

export function createSim() {
  const s = {
    running: true,
    simTime: 0,
    speed: 1,
    defectRate: 0.3,
    aiAccuracy: 0.92,
    failRatio: 0.3,
    online: true,
    beltOffset: 0,
    boxes: [],
    nextId: 1,
    spawnTimer: 0.4,
    manual: [], // queued manual spawns
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
  if (Math.random() >= s.defectRate) return 'box_good';
  return Math.random() < 0.55 ? 'dent' : 'tear';
}

function spaceAvailable(s) {
  return !s.boxes.some((b) => b.state === 'belt' && b.x < ZONE.spawn + MIN_GAP);
}

function spawnBox(s, truth) {
  const id = s.nextId++;
  s.boxes.push({
    id,
    tracking: trackingNo(id),
    truth,
    x: ZONE.spawn,
    lane: rand(-6, 6), // small sideways offset in px for realism
    size: rand(0.92, 1.08),
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
    const ok = Math.random() < s.aiAccuracy;
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
    if (s.manual.length) spawnBox(s, s.manual.shift());
    else if (s.spawnTimer <= 0) {
      spawnBox(s, pickTruth(s));
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
      }
    } else if (b.state === 'rejecting') {
      b.rejectT += dt / 0.55;
      b.x += v * dt * 0.3;
      if (b.rejectT >= 1) {
        b.state = 'gone';
        s.stats.rejectedBin += 1;
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
export const DEFAULT_SETTINGS = { speed: 1, defectRate: 0.3, aiAccuracy: 0.92, failRatio: 0.3 };

export function getSettings(s) {
  return { speed: s.speed, defectRate: s.defectRate, aiAccuracy: s.aiAccuracy, failRatio: s.failRatio };
}

export function applySettings(s, obj) {
  if (!obj || typeof obj !== 'object') return;
  const num = (v, lo, hi, d) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d);
  s.speed = num(obj.speed, 0.5, 4, s.speed);
  s.defectRate = num(obj.defectRate, 0, 0.8, s.defectRate);
  s.aiAccuracy = num(obj.aiAccuracy, 0.6, 1, s.aiAccuracy);
  s.failRatio = num(obj.failRatio, 0.1, 0.9, s.failRatio);
}

export function addBox(s, truth) {
  if (s.manual.length < 5) s.manual.push(truth);
}

export function resetSim(s) {
  const fresh = createSim();
  const keep = { speed: s.speed, defectRate: s.defectRate, aiAccuracy: s.aiAccuracy, failRatio: s.failRatio, online: s.online };
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
    defectRate: s.defectRate,
    aiAccuracy: s.aiAccuracy,
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
