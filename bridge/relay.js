'use strict';
/**
 * Relay: local broker -> public broker, so a simulated ESP32 (Wokwi) can react.
 *
 *   local  spdi/<line>/counted  --(compact)-->  public  <RELAY_TOPIC>/cmd
 *                                                public  <RELAY_TOPIC>/status  (retained online/offline)
 *   public <RELAY_TOPIC>/ack   <-- ESP32 reports what it did (logged here)
 *
 *   node relay.js          forward real events from the bridge
 *   node relay.js --test   no local broker needed: send PASS/FAIL every 3 s
 *
 * Only PASS/FAIL + class name + unit number go to the public broker
 * (no images, no database info). Anyone who knows RELAY_TOPIC can read them,
 * so the topic gets a random part.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const mqtt = require('mqtt');
const { config, safeUrl } = require('./config');

const TEST = process.argv.includes('--test');
const ENV_FILE = path.join(__dirname, '.env');
const RELAY_URL = (process.env.RELAY_URL || 'mqtt://broker.hivemq.com:1883').trim();
let base = (process.env.RELAY_TOPIC || '').trim().replace(/\/+$/, '');

// First run: invent a hard-to-guess topic and remember it in bridge/.env
if (!base) {
  base = `spdi-${crypto.randomBytes(4).toString('hex')}/${config.lineId}`;
  try {
    const nl = fs.existsSync(ENV_FILE) && !fs.readFileSync(ENV_FILE, 'utf8').endsWith('\n') ? '\n' : '';
    fs.appendFileSync(ENV_FILE, `${nl}\n# ESP32 (Wokwi) relay topic - paste the same value into esp32/wokwi/sketch.ino\nRELAY_TOPIC=${base}\n`);
    console.log(`🆕 created RELAY_TOPIC=${base} (saved in bridge/.env)`);
  } catch (err) {
    console.log(`⚠️  could not save RELAY_TOPIC to bridge/.env (${err.message}); using ${base} for this run only`);
  }
}

const T = { cmd: `${base}/cmd`, status: `${base}/status`, ack: `${base}/ack` };
const id = () => crypto.randomBytes(3).toString('hex');
const stats = { sent: 0, acks: 0 };

function compact(ev) {
  return JSON.stringify({
    r: ev.result === 'FAIL' ? 'FAIL' : 'PASS',
    c: String(ev.className || '').slice(0, 20),
    n: ev.unitNo ?? ev.no ?? stats.sent + 1,
  });
}

// ---------------------------------------------------------------- public side
const pub = mqtt.connect(RELAY_URL, {
  clientId: `spdi-relay-${id()}`,
  reconnectPeriod: 3000,
  connectTimeout: 8000,
  will: { topic: T.status, payload: 'offline', retain: true, qos: 1 },
});

pub.on('connect', () => {
  console.log(`🌐 public broker ${safeUrl(RELAY_URL)} connected`);
  pub.publish(T.status, 'online', { retain: true, qos: 1 });
  pub.subscribe(T.ack);
});
// say "online" again every 10 s: an older relay that was stopped or killed may have
// left a retained "offline" behind, which would make the ESP32 think the bridge is down
const statusTimer = setInterval(() => {
  if (pub.connected) pub.publish(T.status, 'online', { retain: true, qos: 1 });
}, 10_000);
pub.on('reconnect', () => console.log('🌐 reconnecting to public broker...'));
pub.on('error', (err) => console.log(`❌ public broker: ${err.code || err.message}`));
pub.on('message', (topic, buf) => {
  if (topic !== T.ack) return;
  stats.acks += 1;
  console.log(`   🤖 ESP32: ${buf.toString().slice(0, 120)}`);
});

function forward(payload) {
  if (!pub.connected) {
    console.log('   ⚠️  public broker not connected - dropped');
    return;
  }
  pub.publish(T.cmd, payload, { qos: 0 });
  stats.sent += 1;
  console.log(`📤 ${payload}`);
}

// ---------------------------------------------------------------- local side
let local = null;
let timer = null;

if (TEST) {
  let n = 0;
  pub.once('connect', () => (timer = setInterval(() => {
    n += 1;
    const fail = n % 3 === 0;
    forward(compact({ result: fail ? 'FAIL' : 'PASS', className: fail ? (n % 2 ? 'tear' : 'dent') : 'box_good', unitNo: n }));
  }, 3000)));
} else {
  local = mqtt.connect(config.mqttUrl, {
    clientId: `spdi-relay-local-${id()}`,
    reconnectPeriod: 2000,
    connectTimeout: 5000,
  });
  let errLogged = false;
  local.on('connect', () => {
    errLogged = false;
    console.log(`🏠 local broker ${safeUrl(config.mqttUrl)} connected, listening on ${config.topics.counted}`);
    local.subscribe(config.topics.counted);
  });
  local.on('error', (err) => {
    if (errLogged) return;
    errLogged = true;
    console.log(`❌ local broker: ${err.code || err.message}`);
    if (err.code === 'ECONNREFUSED') console.log('   👉 start the broker first (npm run broker / broker:node), or try: npm run relay:test');
  });
  local.on('message', (_topic, buf) => {
    try {
      forward(compact(JSON.parse(buf.toString())));
    } catch {
      console.log('   ⚠️  skipped a message that is not JSON');
    }
  });
}

console.log(
  [
    '',
    `🔁 SPDI relay${TEST ? ' (TEST mode: fake PASS/FAIL every 3 s)' : ''}`,
    `   ESP32 topic base   ${base}`,
    `   commands  ->       ${T.cmd}`,
    `   status    ->       ${T.status} (retained)`,
    `   ESP32 ack <-       ${T.ack}`,
    '   Ctrl+C to stop',
    '',
  ].join('\n')
);

function shutdown() {
  clearInterval(timer);
  clearInterval(statusTimer);
  console.log(`\n👋 relay stopped (sent ${stats.sent}, ESP32 acks ${stats.acks})`);
  const done = () => process.exit(0);
  if (local) local.end(true);
  if (pub.connected) pub.publish(T.status, 'offline', { retain: true, qos: 1 }, () => pub.end(false, {}, done));
  else done();
  setTimeout(done, 1500).unref();
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
