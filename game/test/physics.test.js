import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRider, stepRider } from '../lib/physics.js';
import { height } from '../lib/terrain.js';

const DT = 0.004;

// Ride at speed 0 so terrain is constant, holding Space for holdSeconds. Returns peak height above ground.
function peak(holdSeconds, dt = DT) {
  let r = createRider();
  const ground = r.y;
  let max = 0;
  let t = 0;
  let left = false;
  for (let i = 0; i < 2000; i++) {
    r = stepRider(r, { ollieDown: t < holdSeconds }, dt, 0);
    t += dt;
    max = Math.max(max, r.y - ground);
    if (!r.grounded) left = true;
    if (left && r.grounded) break;
  }
  return max;
}

test('ollie leaves the ground', () => {
  const r = stepRider(createRider(), { ollieDown: true }, DT, 200);
  assert.equal(r.grounded, false);
  assert.ok(r.vy > 0);
});

test('holding Space gives a higher ollie, capped', () => {
  assert.ok(peak(0.25) > peak(0.05));
  assert.ok(Math.abs(peak(2) - peak(0.5)) < 1e-9);
  assert.ok(Math.abs(peak(0.25) - peak(2)) / peak(2) < 0.02);
});

test('key repeat gives one ollie', () => {
  let r = createRider();
  let takeoffs = 0;
  for (let i = 0; i < 500; i++) {
    const next = stepRider(r, { ollieDown: true }, DT, 0);
    if (r.grounded && !next.grounded) takeoffs++;
    r = next;
  }
  assert.equal(takeoffs, 1);
});

test('rider follows terrain when grounded', () => {
  let r = createRider();
  for (let i = 0; i < 200; i++) {
    r = stepRider(r, { ollieDown: false }, 0.016, 220);
    assert.ok(r.grounded);
    assert.ok(Math.abs(r.y - height(r.x)) < 1e-6);
  }
});

test('gravity returns rider to ground', () => {
  let r = stepRider(createRider(), { ollieDown: true }, DT, 200);
  for (let i = 0; i < 500 && !r.grounded; i++) r = stepRider(r, { ollieDown: false }, DT, 200);
  assert.equal(r.grounded, true);
});

test('step size independence', () => {
  const coarse = (() => {
    let r = createRider();
    const g = r.y;
    let max = 0;
    r = stepRider(r, { ollieDown: true }, 0.016, 0);
    for (let i = 0; i < 200 && !r.grounded; i++) {
      r = stepRider(r, { ollieDown: false }, 0.016, 0);
      max = Math.max(max, r.y - g);
    }
    return max;
  })();
  const fine = (() => {
    let r = createRider();
    const g = r.y;
    let max = 0;
    r = stepRider(r, { ollieDown: true }, 0.004, 0);
    for (let i = 0; i < 800 && !r.grounded; i++) {
      r = stepRider(r, { ollieDown: false }, 0.004, 0);
      max = Math.max(max, r.y - g);
    }
    return max;
  })();
  assert.ok(Math.abs(coarse - fine) / fine < 0.02, `${coarse} vs ${fine}`);
});
