'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createTracker, createImageCounter, sizeOf } = require('../tracker');

const OPTS = { lineId: 'line1', goodClasses: ['good'], damagedClasses: ['bad'], minConf: 0.5, frameW: 1, frameH: 1, minFrames: 3, countMode: 'presence', trackTtlMs: 2500 };
const box = (w, h) => ({ name: 'good', conf: 0.9, x: 0.5, y: 0.5, w, h });

test('size is the average of the detection boxes, in % of frame when not calibrated', () => {
  const t = createTracker(OPTS);
  const ev = [box(0.3, 0.4), box(0.32, 0.4), box(0.34, 0.4)].flatMap((b, i) => t.processFrame({ objects: [b] }, 1000 + i * 100).events)[0];
  assert.equal(ev.size.w, 0.32);
  assert.equal(ev.size.h, 0.4);
  assert.equal(ev.size.lengthCm, null);
});

test('top camera: length and width in cm, height from the fixed value', () => {
  const s = sizeOf(0.3, 0.5, { cameraView: 'top', frameWidthCm: 100, frameHeightCm: 60, fixedDimCm: 20 });
  assert.deepEqual(s, { w: 0.3, h: 0.5, view: 'top', lengthCm: 30, widthCm: 30, heightCm: 20 });
});

test('side camera: length and height in cm, width unknown without a fixed value', () => {
  const s = sizeOf(0.25, 0.4, { cameraView: 'side', frameWidthCm: 80, frameHeightCm: 45, fixedDimCm: 0 });
  assert.deepEqual(s, { w: 0.25, h: 0.4, view: 'side', lengthCm: 20, widthCm: null, heightCm: 18 });
});

test('no box size from CiRA -> size is null', () => {
  assert.equal(sizeOf(0, 0, {}), null);
});

test('image mode keeps the size of the chosen box', () => {
  const c = createImageCounter({ ...OPTS, frameWidthCm: 100, frameHeightCm: 100 });
  const { events } = c.processFrame({ objects: [box(0.2, 0.3)] }, 1000);
  assert.equal(events[0].size.lengthCm, 20);
  assert.equal(events[0].size.widthCm, 30);
});
