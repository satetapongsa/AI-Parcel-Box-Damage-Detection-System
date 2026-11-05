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
};

const overlap = config.goodClasses.filter((c) => config.damagedClasses.includes(c));
if (overlap.length) {
  console.warn(`⚠️  Class name(s) in BOTH GOOD_CLASSES and DAMAGED_CLASSES: ${overlap.join(', ')} -> treated as damaged`);
}

/** Exit with a clear Thai message when MongoDB is not configured. */
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
    `   MongoDB   ${config.mongoUri ? `configured ✓ (db="${config.dbName}")` : 'not configured'}`,
    `   GOOD      ${config.goodClasses.join(', ')}`,
    `   DAMAGED   ${config.damagedClasses.join(', ')}`,
    `   Frame     ${config.frameW}x${config.frameH} px, box origin=${config.boxOrigin}`,
    `   Line      x=${config.linePos} dir=${config.direction}  MIN_CONF=${config.minConf} MIN_FRAMES=${config.minFrames}`,
    `   Tracking  MAX_DIST=${config.maxDist} TTL=${config.trackTtlMs}ms FAIL_RATIO=${config.failRatio}`,
  ].join('\n');
}

module.exports = { config, requireMongo, safeUrl, summary };
