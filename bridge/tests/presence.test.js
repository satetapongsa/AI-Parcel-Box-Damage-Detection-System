'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createTracker } = require('../tracker');

const OPTS = {
  lineId: 'line1',
  goodClasses: ['good'],
  damagedClasses: ['bad'],
  minConf: 0.5,
  frameW: 1,
  frameH: 1,
  maxDist: 0.12,
  trackTtlMs: 2500,
  minFrames: 5,
  failRatio: 0.3,
  countMode: 'presence',
};
const FRAME_MS = 150; // ~7 fps, like the real camera

function run(tracker, frames) {
  const events = [];
  frames.forEach((objs, i) => {
    events.push(...tracker.processFrame({ objects: objs }, 1000 + i * FRAME_MS).events);
  });
  return events;
}
const box = (name, x) => ({ name, conf: 0.9, x, y: 0.5, w: 0.3, h: 0.4 });

test('a box that stays in the middle is counted once', () => {
  const xs = [0.5, 0.5, 0.42, 0.42, 0.44, 0.46, 0.45, 0.46, 0.45, 0.46];
  const frames = [...xs, ...xs, ...xs].map((x) => [box('good', x)]);
  const events = run(createTracker(OPTS), frames);
  assert.equal(events.length, 1);
  assert.equal(events[0].result, 'PASS');
});

test('short gaps in detection do not count the same box again', () => {
  const frames = [];
  for (let r = 0; r < 4; r++) {
    for (let i = 0; i < 6; i++) frames.push([box('good', 0.45)]);
    for (let i = 0; i < 7; i++) frames.push([]); // ~1 s without detection
  }
  assert.equal(run(createTracker(OPTS), frames).length, 1);
});

test('a new box after the old one left is counted again', () => {
  const gone = Array(25).fill([]); // > 2.5 s empty
  const frames = [...Array(8).fill([box('good', 0.45)]), ...gone, ...Array(8).fill([box('bad', 0.47)])];
  const events = run(createTracker(OPTS), frames);
  assert.deepEqual(events.map((e) => e.result), ['PASS', 'FAIL']);
});

test('a box seen for fewer than minFrames is not counted', () => {
  const frames = [...Array(3).fill([box('good', 0.45)]), ...Array(25).fill([])];
  assert.equal(run(createTracker(OPTS), frames).length, 0);
});

test('line mode still needs the line crossing', () => {
  const frames = Array(20).fill([box('good', 0.3)]);
  assert.equal(run(createTracker({ ...OPTS, countMode: 'line', linePos: 0.5, direction: 'ltr' }), frames).length, 0);
});
