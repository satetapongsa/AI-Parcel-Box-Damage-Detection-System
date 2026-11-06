'use strict';
/**
 * SPDI simulator — pretends to be CiRA CORE.
 *
 *   node simulator.js frames   (default) per-frame detections -> spdi/<line>/detections
 *   node simulator.js events   already-counted box events   -> spdi/<line>/events
 *
 * Options: --fps 15  --interval 2.2 (s between boxes)  --cross 4 (s to cross the frame)
 *          --damaged 0.25  --noise 0.08  --drop 0.03  --device sim-01
 *
 * Payload shape is identical to cira/cira_javascript_node.js output:
 *   { type:"frame", device, source:"simulator", ts, objects:[{ name, conf, x, y, w, h }] }
 * (x,y,w,h in PIXELS of FRAME_W x FRAME_H, x,y = box center unless BOX_ORIGIN=topleft)
 */
const crypto = require('crypto');
const mqtt = require('mqtt');
const { config, safeUrl } = require('./config');

function parseArgs(argv) {
  const out = { mode: 'frames' };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith('--')) {
        out[key] = next;
        i++;
      } else {
        out[key] = true;
      }
    } else {
      out.mode = a;
    }
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));
const MODE = args.mode === 'events' ? 'events' : 'frames';
const FPS = Number(args.fps) || 15;
const INTERVAL_S = Number(args.interval) || 2.2;
const CROSS_S = Number(args.cross) || 4;
const DAMAGED_P = args.damaged !== undefined ? Number(args.damaged) : 0.25;
const NOISE_P = args.noise !== undefined ? Number(args.noise) : 0.08;
const DROP_P = args.drop !== undefined ? Number(args.drop) : 0.03;
const DEVICE = typeof args.device === 'string' ? args.device : 'sim-01';

const GOOD_NAME = config.goodClasses[0] || 'good';
const DAMAGED_NAME = config.damagedClasses[0] || 'damaged';
// each damaged box gets one of the first two damaged classes (e.g. dent / tear)
const DAMAGED_NAMES = config.damagedClasses.slice(0, 2).length ? config.damagedClasses.slice(0, 2) : [DAMAGED_NAME];
const pickDamaged = () => DAMAGED_NAMES[Math.floor(Math.random() * DAMAGED_NAMES.length)];
const BOX_W = 0.16; // normalized
const BOX_H = 0.3;

const log = (...a) => console.log(new Date().toLocaleTimeString('en-GB'), ...a);
const rand = (a, b) => a + Math.random() * (b - a);
const r3 = (v) => Math.round(v * 1000) / 1000;

const stats = { spawned: 0, crossed: 0, good: 0, damaged: 0, published: 0 };

const client = mqtt.connect(config.mqttUrl, {
  clientId: `spdi-sim-${crypto.randomBytes(3).toString('hex')}`,
  reconnectPeriod: 2000,
  connectTimeout: 5000,
  queueQoSZero: false, // do not flood stale frames after a reconnect
});

let errLogged = false;
client.on('connect', () => {
  errLogged = false;
  log(`📡 simulator connected ${safeUrl(config.mqttUrl)}  mode=${MODE}`);
});
client.on('error', (err) => {
  if (errLogged) return;
  errLogged = true;
  log(`❌ MQTT error: ${err.code || err.message}`);
  if (err.code === 'ECONNREFUSED') log('   👉 รัน broker ก่อน: `npm run broker` หรือ `npm run broker:node`');
});
client.on('close', () => {
  if (!errLogged) log('🔌 disconnected, retrying ...');
});

function publish(topic, obj) {
  if (!client.connected) return;
  client.publish(topic, JSON.stringify(obj), { qos: 0 });
  stats.published += 1;
}

// ---------------------------------------------------------------- frames mode
const boxes = [];
let nextBoxId = 1;
let nextSpawnAt = Date.now() + 500;
const ltr = config.direction !== 'rtl';
const speed = (1 + 2 * 0.08) / CROSS_S; // normalized per second

function spawnBox(now) {
  const damaged = Math.random() < DAMAGED_P;
  const box = {
    id: nextBoxId++,
    damaged,
    defect: pickDamaged(),
    cx: ltr ? -0.08 : 1.08,
    cy: rand(0.5, 0.6),
    born: now,
    crossed: false,
  };
  boxes.push(box);
  stats.spawned += 1;
  log(`📦 sim box #${box.id} spawned -> ${damaged ? `DAMAGED ${box.defect} (expect FAIL)` : 'GOOD (expect PASS)'}`);
}

function frameTick() {
  const now = Date.now();
  const dt = 1 / FPS;
  if (now >= nextSpawnAt) {
    spawnBox(now);
    nextSpawnAt = now + INTERVAL_S * 1000 * rand(0.75, 1.3);
  }

  const objects = [];
  for (let i = boxes.length - 1; i >= 0; i--) {
    const b = boxes[i];
    b.cx += (ltr ? 1 : -1) * speed * dt;
    if (!b.crossed && (ltr ? b.cx >= config.linePos : b.cx <= config.linePos)) {
      b.crossed = true;
      stats.crossed += 1;
      if (b.damaged) stats.damaged += 1;
      else stats.good += 1;
      log(`🎯 sim box #${b.id} crossed line (${b.damaged ? 'DAMAGED' : 'GOOD'})  expected so far: total=${stats.crossed} good=${stats.good} damaged=${stats.damaged}`);
    }
    if (b.cx < -0.1 || b.cx > 1.1) {
      boxes.splice(i, 1);
      continue;
    }
    // only visible inside the frame
    if (b.cx < 0.03 || b.cx > 0.97) continue;
    if (Math.random() < DROP_P) continue; // missed detection

    const flipped = Math.random() < NOISE_P;
    const isDamagedLabel = flipped ? !b.damaged : b.damaged;
    const conf = flipped ? rand(0.52, 0.7) : rand(0.78, 0.98);
    const cx = b.cx + rand(-0.004, 0.004);
    const cy = b.cy + rand(-0.004, 0.004);
    const w = BOX_W * rand(0.97, 1.03);
    const h = BOX_H * rand(0.97, 1.03);
    const ox = config.boxOrigin === 'topleft' ? cx - w / 2 : cx;
    const oy = config.boxOrigin === 'topleft' ? cy - h / 2 : cy;
    objects.push({
      name: isDamagedLabel ? b.defect : GOOD_NAME,
      conf: r3(conf),
      x: Math.round(ox * config.frameW),
      y: Math.round(oy * config.frameH),
      w: Math.round(w * config.frameW),
      h: Math.round(h * config.frameH),
    });
  }

  publish(config.topics.detections, {
    type: 'frame',
    device: DEVICE,
    source: 'simulator',
    ts: now,
    objects,
  });
}

// ---------------------------------------------------------------- events mode
let eventSeq = 1;
function eventTick() {
  const damaged = Math.random() < DAMAGED_P;
  const ev = {
    type: 'event',
    eventId: `sim-${Date.now().toString(36)}-${eventSeq++}`,
    device: DEVICE,
    source: 'simulator',
    ts: Date.now(),
    result: damaged ? 'FAIL' : 'PASS',
    className: damaged ? pickDamaged() : GOOD_NAME,
    confidence: r3(rand(0.8, 0.98)),
  };
  if (!client.connected) return;
  publish(config.topics.events, ev);
  stats.crossed += 1;
  if (damaged) stats.damaged += 1;
  else stats.good += 1;
  log(`📨 event ${ev.result} ${ev.className}  sent so far: total=${stats.crossed} good=${stats.good} damaged=${stats.damaged}`);
}

// ---------------------------------------------------------------- run
console.log('\n🎬 SPDI Simulator (pretending to be CiRA CORE)');
if (MODE === 'frames') {
  console.log(`   ${FPS} fps, a box every ~${INTERVAL_S}s, crosses in ${CROSS_S}s, damaged=${DAMAGED_P * 100}% noise=${NOISE_P * 100}% drop=${DROP_P * 100}%`);
  console.log(`   topic ${config.topics.detections}, classes "${GOOD_NAME}" / "${DAMAGED_NAMES.join(`" + "`)}", ${config.frameW}x${config.frameH}px, dir=${config.direction}\n`);
  setInterval(frameTick, Math.round(1000 / FPS));
} else {
  console.log(`   one event every ${INTERVAL_S}s -> ${config.topics.events}\n`);
  setInterval(eventTick, INTERVAL_S * 1000);
}

function stop() {
  log(`🛑 simulator stopped. boxes crossed=${stats.crossed} (good ${stats.good} / damaged ${stats.damaged}), messages=${stats.published}`);
  client.end(true);
  process.exit(0);
}
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
