import test from 'node:test';
import assert from 'node:assert/strict';
import { bearer, cleanEvent, cleanStatus, tokenMatches } from '../lib/ingest.js';

const NOW = Date.UTC(2026, 10, 26, 8, 0, 0);
const good = { eventId: 'line1-abc-12', ts: NOW - 1000, line: 'line1', result: 'FAIL', className: 'bad', confidence: 0.94, device: 'cira-01', source: 'cira', trackId: 12, framesSeen: 31, votes: { pass: 12, fail: 19 } };

test('a normal bridge event is kept with only known fields', () => {
  const { doc, error } = cleanEvent({ ...good, extra: 'x', $where: '1' }, NOW);
  assert.equal(error, undefined);
  assert.equal(doc.eventId, 'line1-abc-12');
  assert.ok(doc.ts instanceof Date);
  assert.equal(doc.extra, undefined);
  assert.equal(doc.$where, undefined);
  assert.deepEqual(doc.votes, { pass: 12, fail: 19 });
});

test('operator objects and bad types are refused', () => {
  assert.equal(cleanEvent({ ...good, eventId: { $gt: '' } }, NOW).error, 'eventId');
  assert.equal(cleanEvent({ ...good, result: 'OK' }, NOW).error, 'result');
  assert.equal(cleanEvent({ ...good, confidence: 3 }, NOW).error, 'confidence');
  assert.equal(cleanEvent({ ...good, className: '<script>' }, NOW).error, 'className');
  assert.equal(cleanEvent({ ...good, ts: NOW + 3 * 86400000 }, NOW).error, 'ts');
  assert.equal(cleanEvent({ ...good, line: 'a'.repeat(40) }, NOW).error, 'line');
  assert.equal(cleanEvent([good], NOW).error, 'not an object');
});

test('optional fields with wrong types are dropped, not stored', () => {
  const { doc } = cleanEvent({ ...good, trackId: -1, framesSeen: '9', votes: { pass: 'x', fail: 1 } }, NOW);
  assert.equal(doc.trackId, undefined);
  assert.equal(doc.framesSeen, undefined);
  assert.equal(doc.votes, undefined);
});

test('status keeps known fields and maps the line to its document id', () => {
  const st = cleanStatus({ line: 'line2', fps: 7.2, mqttConnected: true, pendingWrites: 3, inputMode: 'still', $set: { x: 1 } }, NOW);
  assert.equal(st.id, 'bridge:line2');
  assert.equal(st.fields.fps, 7.2);
  assert.equal(st.fields.$set, undefined);
  assert.equal(cleanStatus({ offline: true }, NOW).fields.updatedAt.getTime(), 0);
  assert.equal(cleanStatus('x', NOW), null);
});

test('size is kept only with valid numbers', () => {
  const { doc } = cleanEvent({ ...good, size: { w: 0.3, h: 0.4, view: 'side', lengthCm: 31.24, widthCm: null, heightCm: 'x', $set: 1 } }, NOW);
  assert.deepEqual(doc.size, { w: 0.3, h: 0.4, view: 'side', lengthCm: 31.2, widthCm: null, heightCm: null });
  assert.equal(cleanEvent({ ...good, size: { w: 9, h: 0.4 } }, NOW).doc.size, undefined);
});

test('token check', () => {
  assert.equal(bearer('Bearer abc'), 'abc');
  assert.equal(bearer('Basic abc'), '');
  assert.equal(tokenMatches('abc', 'abc'), true);
  assert.equal(tokenMatches('abd', 'abc'), false);
  assert.equal(tokenMatches('abc', ''), false);
});
