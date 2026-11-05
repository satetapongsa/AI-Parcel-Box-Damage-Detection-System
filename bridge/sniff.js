'use strict';
/**
 * Debug tool: print every MQTT message on spdi/# (or a topic you pass).
 *   node sniff.js                 -> spdi/#
 *   node sniff.js "spdi/line1/#"  -> custom topic filter
 *   node sniff.js --full          -> do not truncate payloads
 * For detection payloads it also shows whether the bridge can read the objects.
 */
const crypto = require('crypto');
const mqtt = require('mqtt');
const { config, safeUrl } = require('./config');
const { extractObjects, normalizeObject, makeClassifier, parseMessage } = require('./tracker');

const argv = process.argv.slice(2);
const FULL = argv.includes('--full');
const TOPIC = argv.find((a) => !a.startsWith('--')) || 'spdi/#';
const MAX = FULL ? Infinity : 300;
const classify = makeClassifier(config.goodClasses, config.damagedClasses);

const client = mqtt.connect(config.mqttUrl, {
  clientId: `spdi-sniff-${crypto.randomBytes(3).toString('hex')}`,
  reconnectPeriod: 2000,
  connectTimeout: 5000,
});

let count = 0;
let errLogged = false;

client.on('connect', () => {
  errLogged = false;
  console.log(`👃 sniffing "${TOPIC}" on ${safeUrl(config.mqttUrl)}  (Ctrl+C to stop)\n`);
  client.subscribe(TOPIC);
});

client.on('error', (err) => {
  if (errLogged) return;
  errLogged = true;
  console.log(`❌ MQTT error: ${err.code || err.message}`);
  if (err.code === 'ECONNREFUSED') console.log('   👉 broker ยังไม่รัน: `npm run broker` หรือ `npm run broker:node`');
});

client.on('message', (topic, buf) => {
  count += 1;
  const text = buf.toString('utf8');
  const shown = text.length > MAX ? `${text.slice(0, MAX)}… (${text.length} chars)` : text;
  const time = new Date().toLocaleTimeString('en-GB');
  let hint = '';
  const { payload, hasImage } = parseMessage(text);
  if (!payload) {
    hint = hasImage ? '   ⚠️  image only, no JSON (check MqttPub comes after the JavaScript node)' : '   ⚠️  not valid JSON';
  } else if (topic.endsWith('/detections')) {
    const objs = extractObjects(payload);
    if (objs === null) {
      hint = '   ⚠️  bridge cannot find objects[] in this shape';
    } else {
      const parts = objs.map((o) => {
        const n = normalizeObject(o, config);
        if (!n) return '?(no name/x/y)';
        const v = classify(n.name);
        return `${n.name}${v ? `=${v}` : '=UNKNOWN'}@${n.conf.toFixed(2)} x=${n.cx.toFixed(2)}`;
      });
      hint = `   → ${objs.length} object(s): ${parts.join(', ') || '-'}`;
    }
  }
  const body = hasImage && payload ? `${JSON.stringify(payload).slice(0, MAX)}  (+ image)` : shown;
  console.log(`[${time}] #${count} ${topic} (${buf.length} B)\n   ${body}${hint ? `\n${hint}` : ''}`);
});

process.on('SIGINT', () => {
  console.log(`\n👋 ${count} message(s) received`);
  client.end(true);
  process.exit(0);
});
