import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRider, stepRider, BUMP_SPEED, JUMP_SPEED } from '../lib/physics.js';
import { offsetAt, offsetSlope } from '../lib/ground.js';
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

// ---- obstacle ground ----
const groundOf = (obs) => ({
  height: (x) => obs.reduce((a, o) => a + offsetAt(o, x), 0),
  slope: (x) => obs.reduce((a, o) => a + offsetSlope(o, x), 0),
});
const riderAt = (g, x) => ({ ...createRider(), x, y: g.height(x), vg: 0, angle: 0 });
const DT60 = 1 / 60;
const ramp = { kind: 'ramp', x: 100, width: 200, height: 60, steps: 0 };
const ledge = { kind: 'ledge', x: 1000, width: 200, height: 20, steps: 0 };

test('ollie from a ramp adds the ramp vertical speed', () => {
  const g = groundOf([ramp]);
  let r = riderAt(g, 150);
  for (let i = 0; i < 20; i++) r = stepRider(r, { ollieDown: false }, DT60, 300, g);
  assert.ok(r.grounded && r.vg > 60, `vg ${r.vg}`);
  const up = stepRider(r, { ollieDown: true }, DT60, 300, g);
  assert.ok(up.vy > JUMP_SPEED + 60, `vy ${up.vy}`);
});

test('rider leaves a ramp lip with upward speed', () => {
  const g = groundOf([ramp]);
  let r = riderAt(g, 200);
  let left = null;
  for (let i = 0; i < 60 && !left; i++) {
    r = stepRider(r, { ollieDown: false }, DT60, 300, g);
    if (!r.grounded) left = r;
  }
  assert.ok(left, 'never left the ramp');
  assert.ok(left.vy > 0);
  assert.equal(left.hit, null);
  assert.equal(left.ollied, false);
});

test('terrain downhill never launches', () => {
  let r = createRider();
  for (let i = 0; i < 1200; i++) {
    r = stepRider(r, { ollieDown: false }, DT60, 400);
    assert.ok(r.grounded, `left ground at step ${i}`);
  }
});

test('riding into a ledge front bumps on top', () => {
  const g = groundOf([ledge]);
  let r = riderAt(g, 990);
  let hit = null;
  for (let i = 0; i < 10 && !hit; i++) {
    r = stepRider(r, { ollieDown: false }, DT60, 400, g);
    if (r.hit) hit = r;
  }
  assert.ok(hit);
  assert.equal(hit.hit, 'wall');
  assert.equal(hit.y, 20);
  assert.equal(hit.vy, BUMP_SPEED);
  assert.equal(hit.grounded, false);
  assert.equal(hit.ollied, false);
});

test('a low jump into a ledge front bumps on top, never inside', () => {
  const g = groundOf([ledge]);
  const r = stepRider({ ...riderAt(g, 995), grounded: false, y: 5, vy: 50, boostArmed: false }, { ollieDown: false }, DT60, 400, g);
  assert.equal(r.hit, 'wall');
  assert.ok(r.y >= 20);
});

test('landing on a ledge is an ordinary landing', () => {
  const g = groundOf([ledge]);
  let r = { ...riderAt(g, 1100), grounded: false, y: 30, vy: -300 };
  for (let i = 0; i < 30 && !r.grounded; i++) r = stepRider(r, { ollieDown: false }, DT60, 100, g);
  assert.equal(r.grounded, true);
  assert.equal(r.y, 20);
  assert.equal(r.hit, null);
});

test('a riser of 5 at speed 400 does not launch', () => {
  const g = { height: (x) => (x < 1000 ? 5 : 0), slope: () => 0 };
  const r = stepRider({ ...riderAt(g, 996), grounded: true, y: 5, vg: 0 }, { ollieDown: false }, DT60, 400, g);
  assert.equal(r.grounded, true);
  assert.equal(r.y, 0);
});

test('a second press in the air adds no height', () => {
  function peakPattern(isDown) {
    let r = createRider();
    const ground = r.y;
    let max = 0;
    let t = 0;
    let left = false;
    for (let i = 0; i < 2000; i++) {
      r = stepRider(r, { ollieDown: isDown(t) }, DT, 0);
      t += DT;
      max = Math.max(max, r.y - ground);
      if (!r.grounded) left = true;
      if (left && r.grounded) break;
    }
    return max;
  }
  const releaseOnly = peakPattern((t) => t < 0.02);
  const pressAgain = peakPattern((t) => t < 0.02 || (t > 0.1 && t < 0.4));
  assert.ok(Math.abs(releaseOnly - pressAgain) < 1e-9, `${releaseOnly} vs ${pressAgain}`);
});

test('ollied is true only on the takeoff step', () => {
  let r = stepRider(createRider(), { ollieDown: true }, DT60, 200);
  assert.equal(r.ollied, true);
  r = stepRider(r, { ollieDown: true }, DT60, 200);
  assert.equal(r.ollied, false);
});

test('a wall hit at 400 never leaves the rider below the ground', () => {
  const g = groundOf([ledge]);
  let seed = 12345;
  const rnd = () => ((seed = (Math.imul(seed, 1103515245) + 12345) >>> 0) / 4294967296);
  for (let run = 0; run < 200; run++) {
    let r = riderAt(g, 900 + rnd() * 100);
    if (rnd() < 0.5) r = { ...r, grounded: false, y: rnd() * 40, vy: (rnd() - 0.5) * 400 };
    for (let i = 0; i < 120; i++) {
      r = stepRider(r, { ollieDown: rnd() < 0.2 }, DT60, 200 + rnd() * 250, g);
      assert.ok(r.y >= g.height(r.x) - 1e-9, `inside ground at run ${run} step ${i}`);
    }
  }
});
