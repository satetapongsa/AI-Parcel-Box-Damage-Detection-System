'use strict';
/**
 * Central configuration for bridge, simulator, sniffer and reset tools.
 * Values come from bridge/.env (copy .env.example -> .env).
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env'), quiet: true });

function list(value, fallback) {
  const raw = value === undefined || value === '' ? fallback : value;
  return String(raw)
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

function num(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === '') return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n)) {
    console.warn(`⚠️  ${name}="${raw}" is not a number -> using default ${fallback}`);
    return fallback;
  }
  return n;
}

const lineId = (process.env.LINE_ID || 'line1').trim();

let minConf = num('MIN_CONF', 0.5);
if (minConf > 1) minConf = minConf / 100; // allow "50" meaning 50%

const direction = (process.env.DIRECTION || 'ltr').trim().toLowerCase() === 'rtl' ? 'rtl' : 'ltr';
const boxOrigin = (process.env.BOX_ORIGIN || 'center').trim().toLowerCase() === 'topleft' ? 'topleft' : 'center';

/** 'video' = boxes move across the frame, 'still' = a box is held or placed in view, 'image' = Image Slide. */
function inputModeOf(raw) {
  const v = String(raw || '').trim().toLowerCase();
  if (['image', 'images', 'photo'].includes(v)) return 'image';
  if (['still', 'presence', 'static'].includes(v)) return 'still';
  return 'video';
}

const INPUT_LABELS = {
  video: 'video (count at the virtual line)',
  still: 'still (count a box once it is seen steadily, no line)',
  image: 'image (1 picture = 1 box, Image Slide)',
};

const config = {
  mqttUrl: (process.env.MQTT_URL || 'mqtt://127.0.0.1:1883').trim(),
  mongoUri: (process.env.MONGODB_URI || '').trim(),
  dbName: (process.env.DB_NAME || 'spdi').trim(),
  lineId,
  topics: {
    detections: `spdi/${lineId}/detections`,
    events: `spdi/${lineId}/events`,
    counted: `spdi/${lineId}/counted`,
  },
  goodClasses: list(process.env.GOOD_CLASSES, 'good,good_box,normal,ok,pass'),
  damagedClasses: list(process.env.DAMAGED_CLASSES, 'damaged,damaged_box,damage,defect,broken,ng,fail'),
  minConf,
  frameW: num('FRAME_W', 640),
  frameH: num('FRAME_H', 480),
  boxOrigin,
  linePos: num('LINE_POS', 0.5),
  direction,
  maxDist: num('MAX_DIST', 0.12),
  trackTtlMs: num('TRACK_TTL_MS', 1000),
  minFrames: num('MIN_FRAMES', 5),
  failRatio: num('FAIL_RATIO', 0.3),
  // box size: top = camera looks down (length x width), side = camera looks from the side (length x height)
  cameraView: (process.env.CAMERA_VIEW || 'top').trim().toLowerCase() === 'side' ? 'side' : 'top',
  frameWidthCm: num('FRAME_WIDTH_CM', 0), // what the camera sees at the belt, in cm (0 = sizes only in % of the frame)
  frameHeightCm: num('FRAME_HEIGHT_CM', 0),
  fixedDimCm: num('BOX_FIXED_DIM_CM', 0), // the dimension the camera cannot see (height for top, width for side)
  // video: boxes move across the virtual line (VideoFile / camera)
  // image: one still picture = one box (Image Slide)
  inputMode: inputModeOf(process.env.INPUT_MODE),
  // where counted boxes go: mongo = MongoDB Atlas directly, http = dashboard /api/ingest over HTTPS
  sink: (process.env.SINK || 'mongo').trim().toLowerCase() === 'http' ? 'http' : 'mongo',
  ingestUrl: (process.env.INGEST_URL || '').trim(),
  ingestToken: (process.env.INGEST_TOKEN || '').trim(),
  // queue kept on disk while the database cannot be reached
  outboxFile: path.resolve(__dirname, (process.env.OUTBOX_FILE || 'data/outbox.jsonl').trim()),
  outboxMax: num('OUTBOX_MAX', 20000),
  alerts: {
    discordUrl: (process.env.DISCORD_WEBHOOK_URL || '').trim(),
    lineToken: (process.env.LINE_CHANNEL_TOKEN || '').trim(),
    lineTo: (process.env.LINE_TO || '').trim(),
    failStreak: num('ALERT_FAIL_STREAK', 3),
    offlineS: num('ALERT_OFFLINE_S', 60),
    cooldownS: num('ALERT_COOLDOWN_S', 60),
  },
};

const overlap = config.goodClasses.filter((c) => config.damagedClasses.includes(c));
if (overlap.length) {
  console.warn(`⚠️  Class name(s) in BOTH GOOD_CLASSES and DAMAGED_CLASSES: ${overlap.join(', ')} -> treated as damaged`);
}

/** Exit with a clear Thai message when MongoDB is not configured. */
/** Exit with a clear message when the chosen sink is not configured. */
function requireSink() {
  if (config.sink === 'mongo') return requireMongo();
  let u = null;
  try {
    u = new URL(config.ingestUrl);
  } catch {
    /* handled below */
  }
  const local = u && ['localhost', '127.0.0.1', '[::1]'].includes(u.hostname);
  if (!u || !(u.protocol === 'https:' || (u.protocol === 'http:' && local))) {
    console.error('\n❌ SINK=http needs INGEST_URL=https://<your-dashboard> (http:// only for localhost)\n');
    process.exit(1);
  }
  if (config.ingestToken.length < 24) {
    console.error('\n❌ SINK=http needs INGEST_TOKEN (at least 24 characters, the same value as on the dashboard)\n');
    process.exit(1);
  }
}

function requireMongo() {
  if (!config.mongoUri) {
    console.error(
      [
        '',
        '❌ ไม่พบ MONGODB_URI',
        '   วิธีแก้:',
        '   1) copy bridge/.env.example เป็น bridge/.env',
        '   2) ใส่ MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/',
        '      (คัดลอกจาก Atlas → Connect → Drivers)',
        '   หรือทดสอบแบบไม่ใช้ฐานข้อมูล: npm run bridge:nodb',
        '',
      ].join('\n')
    );
    process.exit(1);
  }
  if (!/^mongodb(\+srv)?:\/\//.test(config.mongoUri)) {
    console.error('\n❌ MONGODB_URI ต้องขึ้นต้นด้วย mongodb+srv:// หรือ mongodb://  (ตรวจใน bridge/.env)\n');
    process.exit(1);
  }
}

/** Hide user:password in a URL before printing it. */
function safeUrl(url) {
  try {
    const u = new URL(url);
    if (u.password) u.password = '***';
    return u.toString();
  } catch {
    return '(invalid url)';
  }
}

function summary() {
  return [
    `   MQTT      ${safeUrl(config.mqttUrl)}`,
    `   Topics    ${config.topics.detections} | ${config.topics.events} -> ${config.topics.counted}`,
    config.sink === 'http'
      ? `   Save to   ${safeUrl(config.ingestUrl).replace(/\/+$/, '')}/api/ingest`
      : `   MongoDB   ${config.mongoUri ? `configured ✓ (db="${config.dbName}")` : 'not configured'}`,
    `   Queue     ${config.outboxFile} (max ${config.outboxMax})`,
    `   GOOD      ${config.goodClasses.join(', ')}`,
    `   DAMAGED   ${config.damagedClasses.join(', ')}`,
    `   Frame     ${config.frameW}x${config.frameH} px, box origin=${config.boxOrigin}`,
    `   Input     ${INPUT_LABELS[config.inputMode]}`,
    `   Line      x=${config.linePos} dir=${config.direction}  MIN_CONF=${config.minConf} MIN_FRAMES=${config.minFrames}`,
    `   Size      camera=${config.cameraView} ${config.frameWidthCm > 0 && config.frameHeightCm > 0 ? `view=${config.frameWidthCm}x${config.frameHeightCm} cm` : 'not calibrated (sizes in % of frame)'}${config.fixedDimCm > 0 ? ` ${config.cameraView === 'side' ? 'width' : 'height'}=${config.fixedDimCm} cm` : ''}`,
    `   Tracking  MAX_DIST=${config.maxDist} TTL=${config.trackTtlMs}ms FAIL_RATIO=${config.failRatio}`,
  ].join('\n');
}

module.exports = { config, requireMongo, requireSink, safeUrl, summary };
