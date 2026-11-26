'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { createOutbox } = require('../outbox');
const { createAlerter } = require('../alerts');
const { createHttpSink } = require('../sinks');

const tmpFile = () => path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'spdi-')), 'outbox.jsonl');

test('outbox keeps events across a restart', () => {
  const file = tmpFile();
  const a = createOutbox({ file });
  a.push({ eventId: 'e1' });
  a.push({ eventId: 'e2' });
  a.flushToDisk();
  const b = createOutbox({ file });
  assert.deepEqual(b.peek(5).map((e) => e.eventId), ['e1', 'e2']);
  b.drop(1);
  b.flushToDisk();
  assert.deepEqual(createOutbox({ file }).peek(5).map((e) => e.eventId), ['e2']);
});

test('outbox drops the oldest when full and skips broken lines', () => {
  const file = tmpFile();
  fs.writeFileSync(file, '{"eventId":"a"}\nnot json\n{"eventId":"b"}\n');
  const warnings = [];
  const o = createOutbox({ file, max: 2, onWarn: (m) => warnings.push(m) });
  assert.equal(o.size, 2);
  o.push({ eventId: 'c' });
  assert.deepEqual(o.peek(5).map((e) => e.eventId), ['b', 'c']);
  assert.equal(o.dropped, 1);
  assert.equal(warnings.length, 1);
});

function fakeAlerter(opts = {}) {
  const sent = [];
  const a = createAlerter({
    discordUrl: 'https://discord.com/api/webhooks/123/abc-DEF',
    failStreak: 3,
    offlineS: 60,
    cooldownS: 60,
    send: async (target, text) => sent.push({ target, text }),
    ...opts,
  });
  return { a, sent };
}
const flush = () => new Promise((r) => setImmediate(r));
const ev = (result) => ({ result, className: result === 'FAIL' ? 'bad' : 'good', confidence: 0.9 });

test('alert after 3 FAIL in a row, once per streak', async () => {
  const { a, sent } = fakeAlerter({ cooldownS: 0 });
  [ev('FAIL'), ev('FAIL')].forEach((e) => a.onEvent(e));
  await flush();
  assert.equal(sent.length, 0);
  a.onEvent(ev('FAIL'));
  a.onEvent(ev('FAIL'));
  await flush();
  assert.equal(sent.length, 1);
  assert.match(sent[0].text, /3 damaged boxes in a row/);
  a.onEvent(ev('PASS'));
  [1, 2, 3].forEach(() => a.onEvent(ev('FAIL')));
  await flush();
  assert.equal(sent.length, 2);
});

test('alert when storage is down for 60 s and when it is back', async () => {
  const { a, sent } = fakeAlerter();
  a.onStorage(false, 0);
  a.onStorage(false, 30000);
  await flush();
  assert.equal(sent.length, 0);
  a.onStorage(false, 61000);
  a.onStorage(true, 70000);
  await flush();
  assert.deepEqual(sent.map((s) => s.text.includes('cannot save') ? 'down' : 'back'), ['down', 'back']);
});

test('a webhook URL that is not Discord is ignored', () => {
  const logs = [];
  const a = createAlerter({ discordUrl: 'http://169.254.169.254/api/webhooks/1/x', log: (m) => logs.push(m) });
  assert.equal(a.enabled, false);
  assert.equal(logs.length, 1);
});

function server(handler) {
  return new Promise((resolve) => {
    const s = http.createServer(handler).listen(0, '127.0.0.1', () => resolve(s));
  });
}

test('http sink sends the token and handles 2xx, 401 and 422', async () => {
  let seen = null;
  let reply = 200;
  const s = await server((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      seen = { auth: req.headers.authorization, url: req.url, body: JSON.parse(body) };
      res.writeHead(reply, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ ok: reply === 200, inserted: 1, error: 'bad event' }));
    });
  });
  const url = `http://127.0.0.1:${s.address().port}`;
  const sink = createHttpSink({ url, token: 't'.repeat(32), log: () => {} });
  assert.deepEqual((await sink.insertMany([{ eventId: 'e1' }])).ok, true);
  assert.equal(seen.auth, `Bearer ${'t'.repeat(32)}`);
  assert.equal(seen.url, '/api/ingest');
  assert.equal(seen.body.events[0].eventId, 'e1');
  reply = 401;
  assert.equal((await sink.insertMany([{ eventId: 'e2' }])).ok, false);
  reply = 422;
  const r = await sink.insertMany([{ eventId: 'e3' }]);
  assert.equal(r.reject, true);
  s.close();
});
