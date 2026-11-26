'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { readSettings, writeSettings } = require('./settings');

function envFile(text) {
  const f = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'spdi-env-')), '.env');
  fs.writeFileSync(f, text);
  return f;
}

test('allowed keys are updated in place and other lines are kept', () => {
  const f = envFile('MONGODB_URI=secret\r\nMIN_CONF=0.5\r\n');
  const r = writeSettings(f, { MIN_CONF: '0.6', GOOD_CLASSES: 'good, o', SINK: 'http' });
  assert.deepEqual(r, { ok: true, changed: ['MIN_CONF', 'GOOD_CLASSES', 'SINK'] });
  assert.equal(fs.readFileSync(f, 'utf8'), 'MONGODB_URI=secret\r\nMIN_CONF=0.6\r\nGOOD_CLASSES=good,o\r\nSINK=http\r\n');
  assert.equal(readSettings(f).MONGODB_URI, undefined);
  assert.equal(readSettings(f).GOOD_CLASSES, 'good,o');
});

test('secrets, new lines and odd characters are refused', () => {
  const f = envFile('MONGODB_URI=secret\n');
  assert.equal(writeSettings(f, { MONGODB_URI: 'x' }).ok, false);
  assert.equal(writeSettings(f, { MIN_CONF: '0.6\nMONGODB_URI=evil' }).ok, false);
  assert.equal(writeSettings(f, { GOOD_CLASSES: 'a;rm -rf' }).ok, false);
  assert.equal(writeSettings(f, { MIN_CONF: '7' }).ok, false);
  assert.equal(writeSettings(f, ['x']).ok, false);
  assert.equal(fs.readFileSync(f, 'utf8'), 'MONGODB_URI=secret\n');
});

test('saving the same value changes nothing', () => {
  const f = envFile('MIN_FRAMES=5\n');
  assert.deepEqual(writeSettings(f, { MIN_FRAMES: '5' }), { ok: true, changed: [] });
});
