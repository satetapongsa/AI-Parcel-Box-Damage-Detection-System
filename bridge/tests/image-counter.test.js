'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createImageCounter } = require('../tracker');

const BASE = {
  lineId: 'line1',
  goodClasses: ['box_good', 'o'],
  damagedClasses: ['dent', 'tear'],
  minConf: 0.5,
  frameW: 640,
  frameH: 480,
};

const frame = (...objects) => ({ type: 'frame', objects });
const box = (name, conf, x = 320, y = 240, w = 200, h = 150) => ({ name, conf, x, y, w, h });

test('one picture with a good box -> one PASS', () => {
  const c = createImageCounter(BASE);
  const { events } = c.processFrame(frame(box('o', 0.99)));
  assert.equal(events.length, 1);
  assert.equal(events[0].result, 'PASS');
  assert.equal(events[0].className, 'o');
  assert.equal(events[0].framesSeen, 1);
});

test('the same picture sent again is counted once', () => {
  const c = createImageCounter(BASE);
  let total = 0;
  for (let i = 0; i < 10; i++) total += c.processFrame(frame(box('box_good', 0.9))).events.length;
  assert.equal(total, 1);
});

test('a different picture is counted again', () => {
  const c = createImageCounter(BASE);
  assert.equal(c.processFrame(frame(box('box_good', 0.9, 300, 200))).events.length, 1);
  assert.equal(c.processFrame(frame(box('box_good', 0.9, 420, 260))).events.length, 1);
});

test('an empty frame lets the same picture count again', () => {
  const c = createImageCounter(BASE);
  assert.equal(c.processFrame(frame(box('box_good', 0.9))).events.length, 1);
  assert.equal(c.processFrame(frame()).events.length, 0);
  assert.equal(c.processFrame(frame(box('box_good', 0.9))).events.length, 1);
});

test('any damaged class makes the picture FAIL with that class', () => {
  const c = createImageCounter(BASE);
  const { events } = c.processFrame(frame(box('box_good', 0.95, 200), box('tear', 0.7, 450)));
  assert.equal(events[0].result, 'FAIL');
  assert.equal(events[0].className, 'tear');
  assert.deepEqual(events[0].votes, { pass: 1, fail: 1 });
});

test('low confidence and unknown classes are ignored', () => {
  const warns = [];
  const c = createImageCounter({ ...BASE, onWarn: (m) => warns.push(m) });
  assert.equal(c.processFrame(frame(box('dent', 0.3))).events.length, 0);
  assert.equal(c.processFrame(frame(box('cat', 0.9))).events.length, 0);
  assert.ok(warns.some((m) => m.includes('"cat"')));
});

test('confidence in percent and unique event ids', () => {
  const c = createImageCounter(BASE);
  const a = c.processFrame(frame(box('box_good', 88, 200))).events[0];
  const b = c.processFrame(frame(box('dent', 76, 400))).events[0];
  assert.equal(a.confidence, 0.88);
  assert.equal(b.result, 'FAIL');
  assert.notEqual(a.eventId, b.eventId);
});
