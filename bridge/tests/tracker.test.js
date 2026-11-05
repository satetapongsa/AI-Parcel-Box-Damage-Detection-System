'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  parseMessage,
  createTracker,
  extractObjects,
  normalizeObject,
  normalizeEvent,
} = require('../tracker');

const BASE = {
  lineId: 'line1',
  goodClasses: ['good', 'good_box'],
  damagedClasses: ['damaged', 'damaged_box'],
  minConf: 0.5,
  frameW: 640,
  frameH: 480,
  linePos: 0.5,
  direction: 'ltr',
  maxDist: 0.12,
  trackTtlMs: 1000,
  minFrames: 5,
  failRatio: 0.3,
};

const FRAME_MS = 66; // ~15 fps

/**
 * Build a list of frames. Each box: { start (frame index), from, to, frames, y, label(i) }.
 * Returns array of arrays of normalized objects { name, conf, x, y, w, h }.
 */
function buildFrames(boxes, totalFrames) {
  const frames = [];
  for (let f = 0; f < totalFrames; f++) {
    const objs = [];
    for (const b of boxes) {
      const i = f - b.start;
      if (i < 0 || i >= b.frames) continue;
      const x = b.from + ((b.to - b.from) * i) / (b.frames - 1);
      objs.push({ name: b.label(i), conf: 0.9, x, y: b.y ?? 0.5, w: 0.15, h: 0.25 });
    }
    frames.push(objs);
  }
  return frames;
}

function run(tracker, frames, wrap = (objs) => ({ objects: objs })) {
  const events = [];
  frames.forEach((objs, f) => {
    const { events: evs } = tracker.processFrame(wrap(objs), 1_000_000 + f * FRAME_MS, { device: 'test' });
    events.push(...evs);
  });
  return events;
}

test('one box seen 40 frames is counted exactly once', () => {
  const tr = createTracker(BASE);
  const frames = buildFrames([{ start: 0, from: 0.05, to: 0.95, frames: 40, label: () => 'good' }], 60);
  const events = run(tr, frames);
  assert.equal(events.length, 1);
  assert.equal(events[0].result, 'PASS');
  assert.equal(events[0].className, 'good');
  assert.ok(events[0].framesSeen >= BASE.minFrames);
  assert.equal(events[0].confidence, 0.9);
  assert.equal(events[0].device, 'test');
});

test('two separated boxes are counted as 2', () => {
  const tr = createTracker(BASE);
  const frames = buildFrames(
    [
      { start: 0, from: 0.05, to: 0.95, frames: 40, label: () => 'good' },
      { start: 25, from: 0.05, to: 0.95, frames: 40, label: () => 'damaged' },
    ],
    80
  );
  const events = run(tr, frames);
  assert.equal(events.length, 2);
  assert.deepEqual(events.map((e) => e.result), ['PASS', 'FAIL']);
  assert.notEqual(events[0].eventId, events[1].eventId);
});

test('noisy labels -> correct majority vote', () => {
  // good box, every 12th frame mislabeled as damaged (~8%) -> PASS
  const tr1 = createTracker(BASE);
  const good = run(
    tr1,
    buildFrames([{ start: 0, from: 0.05, to: 0.95, frames: 40, label: (i) => (i % 12 === 5 ? 'damaged' : 'good') }], 45)
  );
  assert.equal(good.length, 1);
  assert.equal(good[0].result, 'PASS');
  assert.ok(good[0].votes.fail > 0, 'noise should have produced some fail votes');

  // damaged box, every 6th frame mislabeled as good -> FAIL
  const tr2 = createTracker(BASE);
  const bad = run(
    tr2,
    buildFrames([{ start: 0, from: 0.05, to: 0.95, frames: 40, label: (i) => (i % 6 === 0 ? 'good' : 'damaged') }], 45)
  );
  assert.equal(bad.length, 1);
  assert.equal(bad[0].result, 'FAIL');
  assert.equal(bad[0].className, 'damaged');

  // bias to FAIL: 35% damaged votes >= FAIL_RATIO 0.3 -> FAIL
  const tr3 = createTracker(BASE);
  const biased = run(
    tr3,
    buildFrames([{ start: 0, from: 0.05, to: 0.95, frames: 40, label: (i) => (i % 20 < 7 ? 'damaged' : 'good') }], 45)
  );
  assert.equal(biased[0].result, 'FAIL');
});

test('rtl direction counts boxes moving right-to-left (and not ltr boxes)', () => {
  const rtl = createTracker({ ...BASE, direction: 'rtl' });
  const evRtl = run(rtl, buildFrames([{ start: 0, from: 0.95, to: 0.05, frames: 40, label: () => 'damaged' }], 45));
  assert.equal(evRtl.length, 1);
  assert.equal(evRtl[0].result, 'FAIL');

  const rtl2 = createTracker({ ...BASE, direction: 'rtl' });
  const evWrong = run(rtl2, buildFrames([{ start: 0, from: 0.05, to: 0.95, frames: 40, label: () => 'good' }], 45));
  assert.equal(evWrong.length, 0);
});

test('pixel vs normalized input give the same result', () => {
  const frames = buildFrames(
    [
      { start: 0, from: 0.05, to: 0.95, frames: 40, label: () => 'good' },
      { start: 22, from: 0.05, to: 0.95, frames: 40, y: 0.6, label: (i) => (i % 9 === 0 ? 'good' : 'damaged') },
    ],
    70
  );
  const toPixels = (objs) =>
    objs.map((o) => ({ ...o, x: o.x * 640, y: o.y * 480, w: o.w * 640, h: o.h * 480 }));
  const strip = (evs) => evs.map(({ eventId, ...rest }) => rest);

  const evNorm = run(createTracker({ ...BASE, runId: 'a' }), frames);
  const evPix = run(createTracker({ ...BASE, runId: 'a' }), frames.map(toPixels));
  assert.equal(evNorm.length, 2);
  assert.deepEqual(strip(evPix), strip(evNorm));
});

test('box jittering back and forth across the line is still counted once', () => {
  const tr = createTracker(BASE);
  const xs = [0.3, 0.35, 0.4, 0.45, 0.48, 0.51, 0.49, 0.52, 0.48, 0.53, 0.56, 0.6, 0.65, 0.7];
  const frames = xs.map((x) => [{ name: 'good', conf: 0.9, x, y: 0.5, w: 0.1, h: 0.1 }]);
  assert.equal(run(tr, frames).length, 1);
});

test('box that disappears briefly (within TTL) is not double counted', () => {
  const tr = createTracker(BASE);
  const frames = buildFrames([{ start: 0, from: 0.05, to: 0.95, frames: 40, label: () => 'good' }], 45);
  for (let f = 18; f < 24; f++) frames[f] = []; // gap of 6 frames (~400 ms) around the line
  assert.equal(run(tr, frames).length, 1);
});

test('payload shapes: objects / DeepDetect / DeepDetectCPU / raw array', () => {
  const objs = [{ name: 'good', conf: 0.9, x: 0.5, y: 0.5, w: 0.1, h: 0.1 }];
  assert.equal(extractObjects({ objects: objs }), objs);
  assert.equal(extractObjects({ DeepDetect: { objects: objs } }), objs);
  assert.equal(extractObjects({ DeepDetectCPU: { objects: objs } }), objs);
  assert.equal(extractObjects(objs), objs);
  assert.equal(extractObjects({ foo: 1 }), null);
  assert.equal(extractObjects('hello'), null);

  for (const wrap of [(o) => ({ objects: o }), (o) => ({ DeepDetect: { objects: o } }), (o) => ({ DeepDetectCPU: { objects: o } }), (o) => o]) {
    const tr = createTracker(BASE);
    const ev = run(tr, buildFrames([{ start: 0, from: 0.05, to: 0.95, frames: 40, label: () => 'good' }], 45), wrap);
    assert.equal(ev.length, 1);
  }
});

test('field aliases and 0-100 confidence are normalized', () => {
  const a = normalizeObject({ class: 'Damaged', confidence: 87, x: 320, y: 240, width: 64, height: 48 }, BASE);
  assert.equal(a.name, 'Damaged');
  assert.equal(a.conf, 0.87);
  assert.equal(a.cx, 0.5);
  assert.equal(a.cy, 0.5);
  assert.equal(a.w, 0.1);
  const b = normalizeObject({ label: 'good', conf: 0.5, x: 0.2, y: 0.3, w: 0.1, h: 0.1 }, BASE);
  assert.equal(b.cx, 0.2);
  const tl = normalizeObject({ name: 'good', conf: 0.9, x: 0.2, y: 0.3, w: 0.2, h: 0.2 }, { ...BASE, boxOrigin: 'topleft' });
  assert.ok(Math.abs(tl.cx - 0.3) < 1e-9 && Math.abs(tl.cy - 0.4) < 1e-9);
  assert.equal(normalizeObject({ conf: 0.9, x: 1, y: 1 }, BASE), null); // no name
});

test('unknown class names warn once and are skipped; low confidence is ignored', () => {
  const warnings = [];
  const tr = createTracker({ ...BASE, onWarn: (m) => warnings.push(m) });
  const frames = buildFrames([{ start: 0, from: 0.05, to: 0.95, frames: 40, label: () => 'carton' }], 45);
  assert.equal(run(tr, frames).length, 0);
  assert.equal(warnings.filter((w) => w.includes('carton')).length, 1);

  const tr2 = createTracker(BASE);
  const low = buildFrames([{ start: 0, from: 0.05, to: 0.95, frames: 40, label: () => 'good' }], 45).map((objs) =>
    objs.map((o) => ({ ...o, conf: 0.2 }))
  );
  assert.equal(run(tr2, low).length, 0);
});

test('case-insensitive class matching', () => {
  const tr = createTracker(BASE);
  const ev = run(tr, buildFrames([{ start: 0, from: 0.05, to: 0.95, frames: 40, label: () => 'DAMAGED_BOX' }], 45));
  assert.equal(ev.length, 1);
  assert.equal(ev[0].result, 'FAIL');
});

test('normalizeEvent accepts result or class name', () => {
  const ctx = { ...BASE, device: 'cira-01', source: 'cira', now: 1_700_000_000_000 };
  assert.equal(normalizeEvent({ result: 'ng' }, ctx).result, 'FAIL');
  assert.equal(normalizeEvent({ result: 'PASS', confidence: 95 }, ctx).confidence, 0.95);
  assert.equal(normalizeEvent({ className: 'damaged_box' }, ctx).result, 'FAIL');
  assert.equal(normalizeEvent({ eventId: 'abc', name: 'good' }, ctx).eventId, 'abc');
  assert.equal(normalizeEvent({ name: 'unknown' }, ctx), null);
  assert.equal(normalizeEvent('x', ctx), null);
});

test('parseMessage handles plain, double-encoded and CiRA image messages', () => {
  const obj = { type: 'frame', objects: [{ name: 'box', conf: 0.9, x: 1, y: 2, w: 3, h: 4 }] };
  const img = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcG+/=';
  assert.deepEqual(parseMessage(JSON.stringify(obj)).payload, obj);
  assert.deepEqual(parseMessage(JSON.stringify(JSON.stringify(obj))).payload, obj);
  const withImg = parseMessage(`${JSON.stringify(obj)}<>${img}`);
  assert.deepEqual(withImg.payload, obj);
  assert.equal(withImg.hasImage, true);
  assert.deepEqual(parseMessage(`have_image___cira__<>${JSON.stringify(obj)}<>,${img}`).payload, obj);
  const onlyImg = parseMessage(`have_image___cira__<>,${img}`);
  assert.equal(onlyImg.payload, null);
  assert.equal(onlyImg.hasImage, true);
  assert.equal(parseMessage('hello').payload, null);
});
