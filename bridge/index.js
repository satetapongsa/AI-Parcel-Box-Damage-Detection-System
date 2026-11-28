'use strict';
/**
 * SPDI Bridge
 *   MQTT spdi/<line>/detections (per-frame)  --tracker-->  1 event per physical box
 *   MQTT spdi/<line>/events     (pre-counted) ------------>  1 event
 *   -> outbox on disk -> MongoDB `inspections` (or the dashboard /api/ingest over HTTPS) + re-publish to spdi/<line>/counted
 *   -> MongoDB `system_status` heartbeat every 3 s
 *
 * Usage:  node index.js          (normal)
 *         node index.js --no-db  (count + log only, no MongoDB — for testing CiRA)
 */
const crypto = require('crypto');
const mqtt = require('mqtt');
const { config, requireSink, safeUrl, summary } = require('./config');
const { createOutbox } = require('./outbox');
const { createMongoSink, createHttpSink } = require('./sinks');
const { createAlerter } = require('./alerts');
const { createTracker, createImageCounter, normalizeEvent, makeClassifier, parseMessage } = require('./tracker');

const NO_DB = process.argv.includes('--no-db') || process.env.NO_DB === '1';
if (!NO_DB) requireSink();

const HEARTBEAT_MS = 3000;
const STATUS_LOG_MS = 15000;
const BATCH = 100; // events per write

const log = (...args) => console.log(new Date().toLocaleTimeString('en-GB'), ...args);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const truncate = (s, n) => (s.length > n ? `${s.slice(0, n)}… (${s.length} chars)` : s);

const state = {
  mqttConnected: false,
  mqttErrorLogged: false,
  frameTimes: [],
  lastFrameAt: null,
  lastEventAt: null,
  lastDevice: null,
  lastSource: null,
  sessionCount: 0,
  pass: 0,
  fail: 0,
  firstMessageLogged: new Set(),
  parseErrors: 0,
  recentIds: new Set(),
  dbHealthy: true,
  stopping: false,
};

const trackerOpts = { ...config, onWarn: (msg) => log('⚠️ ', msg) };
const tracker =
  config.inputMode === 'image'
    ? createImageCounter(trackerOpts)
    : config.inputMode === 'still'
      ? // a held box flickers in and out of detection: keep its track longer so it is counted once
        createTracker({ ...trackerOpts, countMode: 'presence', trackTtlMs: Math.max(config.trackTtlMs, 2500) })
      : createTracker(trackerOpts);
const classify = makeClassifier(config.goodClasses, config.damagedClasses);
const warnedEvent = new Set();

// ---------------------------------------------------------------- storage
// every counted box goes to the outbox on disk first, then to the sink (MongoDB or the ingest API)
const outbox = createOutbox({ file: config.outboxFile, max: config.outboxMax, onWarn: (m) => log('⚠️ ', m) });
let sink = null;
const alerts = createAlerter({ ...config.alerts, lineId: config.lineId, log });

function explainMongoError(err) {
  const msg = String((err && err.message) || err);
  if (/bad auth|authentication failed/i.test(msg)) {
    return `${msg}\n   👉 user/password ผิด — ใช้ Database User (ไม่ใช่รหัส login Atlas) และถ้ารหัสมีอักขระพิเศษ (@ : / ? #) ต้อง URL-encode`;
  }
  if (/querySrv|ENOTFOUND|EAI_AGAIN/i.test(msg)) {
    return `${msg}\n   👉 หา host ของ Atlas ไม่เจอ — เช็คชื่อ cluster ใน URI, อินเทอร์เน็ต, หรือลองเปลี่ยน DNS เป็น 8.8.8.8`;
  }
  if (/Server selection timed out|ETIMEDOUT|ECONNRESET|whitelist|not authorized to access/i.test(msg)) {
    return `${msg}\n   👉 น่าจะยังไม่ได้เพิ่ม IP นี้ใน Atlas → Network Access (Add Current IP Address)`;
  }
  return msg;
}

function markDb(ok, err) {
  if (ok && !state.dbHealthy) log(`🍃 saving works again${outbox.size ? ` — sending ${outbox.size} queued event(s)` : ''}`);
  if (!ok && state.dbHealthy) log('⚠️  save failed — events are queued on disk and will be retried:', err);
  state.dbHealthy = ok;
  alerts.onStorage(ok);
}

async function connectSink() {
  sink =
    config.sink === 'http'
      ? createHttpSink({ url: config.ingestUrl, token: config.ingestToken, log })
      : createMongoSink({ uri: config.mongoUri, dbName: config.dbName, log, explain: explainMongoError });
  if (outbox.size) log(`📥 ${outbox.size} queued event(s) loaded from ${config.outboxFile}`);
  while (!state.stopping) {
    if (await sink.connect()) break;
    alerts.onStorage(false);
    log('   retrying in 5 s ...');
    await sleep(5000);
  }
  await flushPending();
}

/** Send one batch; a refused batch is retried one by one so a single bad event cannot block the queue. */
async function sendBatch(batch) {
  const r = await sink.insertMany(batch);
  if (r.ok || !r.reject) return r;
  if (batch.length === 1) {
    log(`⚠️  event ${batch[0].eventId} refused by the server and dropped: ${r.error}`);
    return { ok: true };
  }
  for (let k = 0; k < batch.length; k++) {
    const one = await sendBatch([batch[k]]);
    if (!one.ok) return { ok: false, error: one.error, sent: k };
  }
  return { ok: true };
}

let flushing = false;
async function flushPending() {
  if (!sink || !sink.ready || flushing || outbox.size === 0) return;
  flushing = true;
  try {
    while (outbox.size) {
      const batch = outbox.peek(BATCH);
      const r = await sendBatch(batch);
      if (r.ok) {
        outbox.drop(batch.length);
        markDb(true);
        continue;
      }
      if (r.sent) outbox.drop(r.sent);
      markDb(false, r.error);
      break;
    }
  } finally {
    flushing = false;
  }
}

// ---------------------------------------------------------------- events
/** "32x24x? cm" when calibrated, else "35%x48% of frame" */
function sizeText(s) {
  if (s.lengthCm !== null) return `${[s.lengthCm, s.widthCm, s.heightCm].map((v) => (v === null ? '?' : v)).join('x')} cm (LxWxH)`;
  return `${Math.round(s.w * 100)}%x${Math.round(s.h * 100)}% of frame`;
}

async function saveEvent(ev) {
  if (state.recentIds.has(ev.eventId)) {
    log(`↩️  duplicate eventId skipped: ${ev.eventId}`);
    return;
  }
  state.recentIds.add(ev.eventId);
  if (state.recentIds.size > 1000) {
    state.recentIds.delete(state.recentIds.values().next().value);
  }

  state.sessionCount += 1;
  state.lastEventAt = Date.now();
  if (ev.result === 'FAIL') state.fail += 1;
  else state.pass += 1;

  const icon = ev.result === 'FAIL' ? '🟥' : '✅';
  const frames = ev.framesSeen !== null && ev.framesSeen !== undefined ? ` frames=${ev.framesSeen}` : '';
  const votes = ev.votes ? ` votes=${ev.votes.pass}/${ev.votes.fail}` : '';
  const size = ev.size ? ` size=${sizeText(ev.size)}` : '';
  log(`${icon} ${ev.result} #${state.sessionCount} ${ev.className} conf=${ev.confidence.toFixed(2)}${frames}${votes}${size} [${ev.source}]`);

  if (mqttClient && mqttClient.connected) {
    // unitNo = the #number shown in this log, so the ESP32 shows the same number
    mqttClient.publish(config.topics.counted, JSON.stringify({ ...ev, unitNo: state.sessionCount }), { qos: 0 });
  }

  alerts.onEvent(ev);
  if (NO_DB) return;
  outbox.push(ev);
  await flushPending();
}

function handleFrame(payload) {
  const now = Date.now();
  state.frameTimes.push(now);
  state.lastFrameAt = now;
  const isObj = payload && typeof payload === 'object' && !Array.isArray(payload);
  const meta = {
    device: (isObj && payload.device && String(payload.device)) || 'cira-01',
    source: (isObj && payload.source && String(payload.source)) || 'cira',
  };
  state.lastDevice = meta.device;
  state.lastSource = meta.source;
  const { events } = tracker.processFrame(payload, now, meta);
  for (const ev of events) saveEvent(ev);
}

function handleEvent(payload) {
  const ev = normalizeEvent(payload, {
    lineId: config.lineId,
    classify,
    device: 'cira-01',
    source: 'cira',
    now: Date.now(),
  });
  if (!ev) {
    const key = JSON.stringify(payload).slice(0, 80);
    if (!warnedEvent.has(key)) {
      warnedEvent.add(key);
      log('⚠️  event skipped: need "result":"PASS"/"FAIL" or a known class name ->', truncate(JSON.stringify(payload), 200));
    }
    return;
  }
  saveEvent(ev);
}

// ---------------------------------------------------------------- MQTT
let mqttClient = null;

function onMessage(topic, buf) {
  const text = buf.toString('utf8');
  const { payload, hasImage } = parseMessage(text);
  if (!payload) {
    state.parseErrors += 1;
    if (state.parseErrors <= 3 || state.parseErrors % 100 === 0) {
      log(`⚠️  message without JSON on ${topic} (#${state.parseErrors}):`, truncate(text, 200));
      if (hasImage) {
        log('   👉 CiRA MqttPub ส่งมาแต่รูปภาพ ไม่มีข้อมูลกล่อง: ตรวจว่า MqttPub ต่อจาก node JavaScript และปิดตัวเลือกส่งรูป (image) ถ้ามี');
      }
    }
    return;
  }

  if (!state.firstMessageLogged.has(topic)) {
    state.firstMessageLogged.add(topic);
    const shown = hasImage ? JSON.stringify(payload) : text;
    log(`🔍 First message on ${topic}${hasImage ? ' (image part removed)' : ''} (raw JSON, truncated):\n${truncate(shown, 800)}`);
  }

  const looksLikeEvent = payload && typeof payload === 'object' && payload.type === 'event';
  if (topic === config.topics.detections && !looksLikeEvent) handleFrame(payload);
  else handleEvent(payload);
}

function startMqtt() {
  mqttClient = mqtt.connect(config.mqttUrl, {
    clientId: `spdi-bridge-${crypto.randomBytes(3).toString('hex')}`,
    reconnectPeriod: 2000,
    connectTimeout: 5000,
    clean: true,
  });

  mqttClient.on('connect', () => {
    state.mqttConnected = true;
    state.mqttErrorLogged = false;
    log(`📡 MQTT connected ${safeUrl(config.mqttUrl)}`);
    mqttClient.subscribe([config.topics.detections, config.topics.events], { qos: 0 }, (err) => {
      if (err) log('❌ subscribe failed:', err.message);
      else log(`👂 subscribed: ${config.topics.detections}, ${config.topics.events}`);
    });
  });
  mqttClient.on('close', () => {
    if (state.mqttConnected) log('🔌 MQTT disconnected — auto-reconnecting every 2 s ...');
    state.mqttConnected = false;
  });
  mqttClient.on('error', (err) => {
    if (state.mqttErrorLogged) return; // log once per outage
    state.mqttErrorLogged = true;
    const code = err.code || err.message;
    log(`❌ MQTT error: ${code}`);
    if (code === 'ECONNREFUSED') {
      log('   👉 broker ยังไม่รัน: เปิด terminal ใหม่แล้วรัน `npm run broker` (Mosquitto) หรือ `npm run broker:node`');
    }
  });
  mqttClient.on('message', onMessage);
}

// ---------------------------------------------------------------- heartbeat
function currentFps() {
  const now = Date.now();
  state.frameTimes = state.frameTimes.filter((t) => now - t <= 5000);
  return Math.round((state.frameTimes.length / 5) * 10) / 10;
}

let heartbeatBusy = false;
async function heartbeat() {
  const fps = currentFps();
  if (NO_DB || !sink || !sink.ready || heartbeatBusy) return;
  heartbeatBusy = true;
  try {
    await sink.heartbeat(
      {
        mqttConnected: state.mqttConnected,
        fps,
        activeTracks: tracker.activeCount(),
        inputMode: config.inputMode,
        sink: config.sink,
        lastFrameAt: state.lastFrameAt ? new Date(state.lastFrameAt) : null,
        lastEventAt: state.lastEventAt ? new Date(state.lastEventAt) : null,
        lastDevice: state.lastDevice,
        lastSource: state.lastSource,
        line: config.lineId,
        sessionCount: state.sessionCount,
        pendingWrites: outbox.size,
      },
      config.lineId
    );
    markDb(true);
    await flushPending();
  } catch (err) {
    markDb(false, err && err.message);
  } finally {
    heartbeatBusy = false;
  }
}

function statusLine() {
  const fps = currentFps();
  const db = NO_DB ? 'off' : !sink || !sink.ready ? 'connecting' : state.dbHealthy ? 'ok' : 'DOWN (queueing on disk)';
  const idle = state.lastFrameAt ? Math.round((Date.now() - state.lastFrameAt) / 1000) : null;
  const frames = idle === null ? 'no frames yet' : idle > 5 ? `⏸️ no frames for ${idle}s` : `fps=${fps}`;
  log(
    `📊 ${frames} tracks=${tracker.activeCount()} counted=${state.sessionCount} (PASS ${state.pass} / FAIL ${state.fail}) mqtt=${state.mqttConnected ? 'ok' : 'down'} db=${db}${outbox.size ? ` queued=${outbox.size}` : ''}`
  );
}

// ---------------------------------------------------------------- lifecycle
async function shutdown() {
  if (state.stopping) return;
  state.stopping = true;
  log(`👋 stopping... session total=${state.sessionCount} (PASS ${state.pass} / FAIL ${state.fail})`);
  const force = setTimeout(() => process.exit(0), 3000);
  outbox.flushToDisk();
  try {
    if (sink && sink.ready) {
      await sink.heartbeat({ mqttConnected: false, fps: 0, activeTracks: 0, offline: true, pendingWrites: outbox.size }, config.lineId);
    }
  } catch {
    /* ignore */
  }
  if (mqttClient) mqttClient.end(true);
  if (sink) await sink.close();
  clearTimeout(force);
  process.exit(0);
}

async function main() {
  console.log('\n📦 SPDI Bridge — Smart Parcel Damage Inspector');
  console.log(summary());
  if (NO_DB) console.log('   ⚠️  --no-db mode: events are counted and logged but NOT saved\n');
  else console.log('');

  startMqtt();
  setInterval(heartbeat, HEARTBEAT_MS);
  setInterval(statusLine, STATUS_LOG_MS);
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
  if (alerts.enabled) log(`🔔 alerts on: ${alerts.targets.join(', ')}`);
  if (!NO_DB) await connectSink();
}

main().catch((err) => {
  console.error('💥 fatal:', err);
  process.exit(1);
});
