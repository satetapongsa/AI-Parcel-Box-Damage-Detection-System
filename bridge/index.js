'use strict';
/**
 * SPDI Bridge
 *   MQTT spdi/<line>/detections (per-frame)  --tracker-->  1 event per physical box
 *   MQTT spdi/<line>/events     (pre-counted) ------------>  1 event
 *   -> MongoDB `inspections` (insert ONLY counted events) + re-publish to spdi/<line>/counted
 *   -> MongoDB `system_status` heartbeat every 3 s
 *
 * Usage:  node index.js          (normal)
 *         node index.js --no-db  (count + log only, no MongoDB — for testing CiRA)
 */
const crypto = require('crypto');
const mqtt = require('mqtt');
const { MongoClient } = require('mongodb');
const { config, requireMongo, safeUrl, summary } = require('./config');
const { createTracker, normalizeEvent, makeClassifier, parseMessage } = require('./tracker');

const NO_DB = process.argv.includes('--no-db') || process.env.NO_DB === '1';
if (!NO_DB) requireMongo();

const HEARTBEAT_MS = 3000;
const STATUS_LOG_MS = 15000;
const MAX_PENDING = 2000;

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

const tracker = createTracker({
  ...config,
  onWarn: (msg) => log('⚠️ ', msg),
});
const classify = makeClassifier(config.goodClasses, config.damagedClasses);
const warnedEvent = new Set();

// ---------------------------------------------------------------- MongoDB
let mongoClient = null;
let inspections = null;
let statusCol = null;
const pending = []; // events waiting to be written (DB down / not yet connected)

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

async function connectMongo() {
  while (!inspections && !state.stopping) {
    let client;
    try {
      client = new MongoClient(config.mongoUri, {
        maxPoolSize: 5,
        serverSelectionTimeoutMS: 8000,
        appName: 'spdi-bridge',
      });
      await client.connect();
      const db = client.db(config.dbName);
      await db.command({ ping: 1 });
      const insp = db.collection('inspections');
      await insp.createIndex({ eventId: 1 }, { unique: true, name: 'eventId_unique' });
      await insp.createIndex({ ts: -1 }, { name: 'ts_desc' });
      mongoClient = client;
      statusCol = db.collection('system_status');
      inspections = insp;
      log(`🍃 MongoDB connected (db="${config.dbName}", indexes ready)`);
    } catch (err) {
      log('❌ MongoDB connect failed:', explainMongoError(err));
      if (client) await client.close().catch(() => {});
      log('   retrying in 5 s ...');
      await sleep(5000);
    }
  }
  await flushPending();
}

function markDb(ok, err) {
  if (ok && !state.dbHealthy) log(`🍃 MongoDB writes OK again${pending.length ? ` — flushing ${pending.length} queued event(s)` : ''}`);
  if (!ok && state.dbHealthy) log('⚠️  MongoDB write failed — events are queued and will be retried:', explainMongoError(err));
  state.dbHealthy = ok;
}

async function insertDoc(doc) {
  try {
    await inspections.insertOne(doc);
    markDb(true);
    return true;
  } catch (err) {
    if (err && err.code === 11000) {
      log(`↩️  duplicate eventId skipped: ${doc.eventId}`);
      return true;
    }
    markDb(false, err);
    return false;
  }
}

let flushing = false;
async function flushPending() {
  if (!inspections || flushing || pending.length === 0) return;
  flushing = true;
  try {
    while (pending.length) {
      const ok = await insertDoc(pending[0]);
      if (!ok) break;
      pending.shift();
    }
  } finally {
    flushing = false;
  }
}

// ---------------------------------------------------------------- events
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
  log(`${icon} ${ev.result} #${state.sessionCount} ${ev.className} conf=${ev.confidence.toFixed(2)}${frames}${votes} [${ev.source}]`);

  if (mqttClient && mqttClient.connected) {
    // unitNo = the #number shown in this log, so the ESP32 shows the same number
    mqttClient.publish(config.topics.counted, JSON.stringify({ ...ev, unitNo: state.sessionCount }), { qos: 0 });
  }

  if (NO_DB) return;
  const doc = { ...ev, ts: new Date(ev.ts), createdAt: new Date() };
  if (!inspections || pending.length > 0) {
    pending.push(doc);
    if (pending.length > MAX_PENDING) pending.shift();
    flushPending();
    return;
  }
  const ok = await insertDoc(doc);
  if (!ok) pending.push(doc);
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
  if (NO_DB || !statusCol || heartbeatBusy) return;
  heartbeatBusy = true;
  try {
    await statusCol.updateOne(
      { _id: 'bridge' },
      {
        $set: {
          mqttConnected: state.mqttConnected,
          fps,
          activeTracks: tracker.activeCount(),
          lastFrameAt: state.lastFrameAt ? new Date(state.lastFrameAt) : null,
          lastEventAt: state.lastEventAt ? new Date(state.lastEventAt) : null,
          lastDevice: state.lastDevice,
          lastSource: state.lastSource,
          line: config.lineId,
          sessionCount: state.sessionCount,
          pendingWrites: pending.length,
          updatedAt: new Date(),
        },
      },
      { upsert: true }
    );
    markDb(true);
    await flushPending();
  } catch (err) {
    markDb(false, err);
  } finally {
    heartbeatBusy = false;
  }
}

function statusLine() {
  const fps = currentFps();
  const db = NO_DB ? 'off' : !inspections ? 'connecting' : state.dbHealthy ? 'ok' : 'DOWN (queueing)';
  const idle = state.lastFrameAt ? Math.round((Date.now() - state.lastFrameAt) / 1000) : null;
  const frames = idle === null ? 'no frames yet' : idle > 5 ? `⏸️ no frames for ${idle}s` : `fps=${fps}`;
  log(
    `📊 ${frames} tracks=${tracker.activeCount()} counted=${state.sessionCount} (PASS ${state.pass} / FAIL ${state.fail}) mqtt=${state.mqttConnected ? 'ok' : 'down'} db=${db}${pending.length ? ` pending=${pending.length}` : ''}`
  );
}

// ---------------------------------------------------------------- lifecycle
async function shutdown() {
  if (state.stopping) return;
  state.stopping = true;
  log(`👋 stopping... session total=${state.sessionCount} (PASS ${state.pass} / FAIL ${state.fail})`);
  const force = setTimeout(() => process.exit(0), 3000);
  try {
    if (statusCol) {
      await statusCol.updateOne(
        { _id: 'bridge' },
        { $set: { mqttConnected: false, fps: 0, activeTracks: 0, updatedAt: new Date(0) } },
        { upsert: true }
      );
    }
  } catch {
    /* ignore */
  }
  if (mqttClient) mqttClient.end(true);
  if (mongoClient) await mongoClient.close().catch(() => {});
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
  if (!NO_DB) await connectMongo();
}

main().catch((err) => {
  console.error('💥 fatal:', err);
  process.exit(1);
});
