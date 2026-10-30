import { test } from 'node:test';
import assert from 'node:assert/strict';
import { slideCamera } from '../src/geom/slides.js';

const W = 1920, H = 800, PAD = 48;
const BAND = { pad: PAD, minK: 2.2, maxK: 2.5 };

/** Whether a world rect sits inside the frame, with the margin. */
const framed = (vp, r) => r.x * vp.k + vp.x >= PAD - 0.01 && r.y * vp.k + vp.y >= PAD - 0.01
  && (r.x + r.w) * vp.k + vp.x <= W - PAD + 0.01 && (r.y + r.h) * vp.k + vp.y <= H - PAD + 0.01;

test('a small lit part is shown at the cap, not blown up past it', () => {
  const vp = slideCamera({ x: 0, y: 0, w: 220, h: 120 }, [], W, H, BAND);
  assert.equal(vp.k, 2.5);
});

test('a ring that fits at the floor is framed with the lit parts', () => {
  const lit = { x: 0, y: 0, w: 220, h: 120 };
  const ring = [{ x: 300, y: 0, w: 220, h: 120 }];
  const vp = slideCamera(lit, ring, W, H, BAND);
  assert.ok(vp.k >= BAND.minK && vp.k <= BAND.maxK);
  assert.ok(framed(vp, lit) && framed(vp, ring[0]));
});

test('a ring too wide for the floor is cut, and the lit parts stay whole', () => {
  const lit = { x: 1000, y: 0, w: 220, h: 120 };
  const ring = [{ x: 0, y: 0, w: 220, h: 120 }, { x: 2000, y: 0, w: 220, h: 120 }];
  const vp = slideCamera(lit, ring, W, H, BAND);
  assert.equal(vp.k, BAND.minK);
  assert.ok(framed(vp, lit));
  assert.ok(!framed(vp, ring[0]) || !framed(vp, ring[1]));
});

test('lit parts too big for the floor are all shown, smaller', () => {
  const lit = { x: 0, y: 0, w: 220, h: 800 };
  const vp = slideCamera(lit, [], W, H, BAND);
  assert.ok(vp.k < BAND.minK);
  assert.ok(framed(vp, lit));
});
