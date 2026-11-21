import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRider, stepRider, BUMP_SPEED, JUMP_SPEED, STEP_UP } from '../lib/physics.js';
import { offsetAt, offsetSlope, createGround } from '../lib/ground.js';
import { height } from '../lib/terrain.js';
import { placeObstacles } from '../lib/obstacles.js';
import { PHRASES } from '../content.js';

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

test('a 14-unit riser is a wall at speed 1180 and at 640', () => {
  assert.equal(STEP_UP, 12);
  const riser14 = { kind: 'ledge', x: 1000, width: 200, height: 14, steps: 0 };
  const g = groundOf([riser14]);
  for (const speed of [640, 1180]) {
    let r = riderAt(g, 980);
    let hit = null;
    for (let i = 0; i < 10 && !hit; i++) {
      r = stepRider(r, { ollieDown: false }, DT60, speed, g);
      if (r.hit) hit = r;
    }
    assert.ok(hit, `expected wall hit at speed ${speed}`);
    assert.equal(hit.hit, 'wall');
    assert.equal(hit.vy, BUMP_SPEED);
  }
});

test('terrain and a 0.5-slope ramp never trigger a wall at speed 1200', () => {
  let r = createRider();
  for (let i = 0; i < 400; i++) {
    r = stepRider(r, { ollieDown: false }, DT60, 1200);
    assert.equal(r.hit, null, `terrain wall hit at step ${i} x=${r.x}`);
    assert.equal(r.grounded, true, `terrain ungrounded at step ${i} x=${r.x}`);
  }
  const steepRamp = { kind: 'ramp', x: 750, width: 140, height: 70, steps: 0 };
  for (const g of [groundOf([steepRamp]), createGround([steepRamp])]) {
    let rr = riderAt(g, 710);
    for (let i = 0; i < 15 && rr.x < steepRamp.x + steepRamp.width; i++) {
      rr = stepRider(rr, { ollieDown: false }, DT60, 1200, g);
      assert.equal(rr.hit, null, `ramp wall hit at step ${i} x=${rr.x}`);
    }
  }
});

test('a rider crossing a 320-wide, 40-deep gap at speed 640 without ollie ends up on the ground beyond it, never below it', () => {
  const gap = { kind: 'gap', x: 1000, width: 320, height: 40, steps: 0 };
  const g = createGround([gap]);
  let r = riderAt(g, 950);
  for (let i = 0; i < 120; i++) {
    const prevY = r.y;
    r = stepRider(r, { ollieDown: false }, DT60, 640, g);
    assert.ok(r.y >= g.height(r.x, prevY) - 1e-9, `below ground at step ${i} x=${r.x}`);
  }
  assert.ok(r.x > gap.x + gap.width, `did not pass gap: x=${r.x}`);
  assert.equal(r.grounded, true);
  assert.ok(Math.abs(r.y - height(r.x)) < 1e-6);
});

test('a rider who ollies at the right moment clears a 320 gap at speed 640', () => {
  const gap = { kind: 'gap', x: 1000, width: 320, height: 40, steps: 0 };
  const g = createGround([gap]);
  let r = riderAt(g, 950);
  let everHit = false;
  let dippedBelowTerrain = false;
  for (let i = 0; i < 90; i++) {
    const ollieDown = r.x >= 960 && r.x < 995;
    r = stepRider(r, { ollieDown }, DT60, 640, g);
    if (r.hit) everHit = true;
    if (r.x > gap.x && r.x < gap.x + gap.width && r.y < height(r.x)) dippedBelowTerrain = true;
  }
  assert.equal(everHit, false, 'should clear gap without hitting far wall');
  assert.equal(dippedBelowTerrain, false, 'should stay above terrain across gap');
  assert.ok(r.x > gap.x + gap.width);
  assert.equal(r.grounded, true);
});

test('a rider launched off a 70-high ramp at speed 1000 never exceeds vy 450 at launch', () => {
  const bigRamp = { kind: 'ramp', x: 100, width: 140, height: 70, steps: 0 };
  const g = groundOf([bigRamp]);
  let r = riderAt(g, 120);
  let launched = null;
  for (let i = 0; i < 40 && !launched; i++) {
    r = stepRider(r, { ollieDown: false }, DT60, 1000, g);
    if (!r.grounded) launched = r;
  }
  assert.ok(launched, 'rider never launched');
  assert.ok(launched.vy <= 450, `launch vy ${launched.vy} > 450`);
  assert.ok(launched.vy > 300, `launch vy ${launched.vy} too small`);

  // Ollie from the same ramp also clamps the ramp vg contribution at 450.
  let r2 = riderAt(g, 120);
  for (let i = 0; i < 6; i++) r2 = stepRider(r2, { ollieDown: false }, DT60, 1000, g);
  assert.ok(r2.grounded && r2.vg > 450);
  const up = stepRider(r2, { ollieDown: true }, DT60, 1000, g);
  assert.ok(up.vy <= JUMP_SPEED + 450, `ollie vy ${up.vy} exceeded capped takeoff`);
});

test('a rider riding on a rail top has grinding true, and grinding is false after the rail ends', () => {
  assert.equal(createRider().grinding, false);
  const rail = { kind: 'rail', x: 100, width: 200, height: 24, steps: 0 };
  const g = createGround([rail]);
  let r = { ...createRider(), x: 150, y: height(150) + rail.height + 5, vy: -200, grounded: false };
  let sawGrinding = false;
  let sawAfterEnd = false;
  for (let i = 0; i < 60; i++) {
    r = stepRider(r, { ollieDown: false }, DT60, 640, g);
    if (r.x >= rail.x && r.x <= rail.x + rail.width && r.grounded) {
      assert.equal(r.grinding, true, `expected grinding on rail at x=${r.x}`);
      sawGrinding = true;
    }
    if (r.x > rail.x + rail.width) {
      assert.equal(r.grinding, false, `expected grinding false after rail at x=${r.x}`);
      sawAfterEnd = true;
    }
  }
  assert.ok(sawGrinding, 'never landed and ground on the rail');
  assert.ok(sawAfterEnd, 'never rode past the end of the rail');
});

test('a rider passing under a rail from the ground is not lifted onto it', () => {
  const rail = { kind: 'rail', x: 100, width: 200, height: 24, steps: 0 };
  const g = createGround([rail]);
  let r = riderAt(g, 50);
  for (let i = 0; i < 40; i++) {
    r = stepRider(r, { ollieDown: false }, DT60, 640, g);
    assert.equal(r.grounded, true, `unexpected ungrounded at x=${r.x}`);
    assert.equal(r.grinding, false, `unexpected grinding under rail at x=${r.x}`);
    assert.ok(Math.abs(r.y - height(r.x)) < 1e-6, `lifted off ground at x=${r.x}: y=${r.y} vs ${height(r.x)}`);
  }

  // Rising from under the rail passes up through it without a wall hit and lands on top when descending.
  let r2 = riderAt(g, 110);
  r2 = stepRider(r2, { ollieDown: true }, DT60, 200, g);
  let landedOnRail = false;
  for (let i = 0; i < 60 && !landedOnRail; i++) {
    r2 = stepRider(r2, { ollieDown: false }, DT60, 200, g);
    assert.equal(r2.hit, null, `unexpected wall hit rising under rail at step ${i}`);
    if (r2.grounded && r2.x >= rail.x && r2.x <= rail.x + rail.width) {
      assert.equal(r2.grinding, true);
      assert.ok(Math.abs(r2.y - (height(r2.x) + rail.height)) < 1e-6);
      landedOnRail = true;
    }
  }
  assert.ok(landedOnRail, 'rider should rise through the rail and land on top');
});

test('no step ever leaves the rider below the ground over 1000 deterministic pseudo-random starts at speeds 640 to 1200 across 40 mixed obstacles', () => {
  const obs = placeObstacles(PHRASES, 0, 50000).slice(0, 40);
  assert.equal(obs.length, 40);
  const g = createGround(obs);
  const maxX = obs[obs.length - 1].x + obs[obs.length - 1].width;
  let seed = 0x5eed1234;
  const rnd = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  for (let run = 0; run < 1000; run++) {
    const startX = obs[0].x - 200 + rnd() * (maxX - obs[0].x);
    const speed = 640 + rnd() * 560;
    const baseY = g.height(startX, -Infinity);
    let r = rnd() < 0.5
      ? { ...createRider(), x: startX, y: baseY, grounded: true, vg: 0, angle: 0 }
      : { ...createRider(), x: startX, y: baseY + rnd() * 80, vy: (rnd() - 0.5) * 500, grounded: false, vg: 0, angle: 0 };
    for (let i = 0; i < 60; i++) {
      const prevY = r.y;
      r = stepRider(r, { ollieDown: rnd() < 0.15 }, DT60, speed, g);
      assert.ok(Number.isFinite(r.x) && Number.isFinite(r.y) && Number.isFinite(r.vy), `NaN at run ${run} step ${i}`);
      assert.ok(r.y >= g.height(r.x, prevY) - 1e-9, `below active ground at run ${run} step ${i}`);
      assert.ok(r.y >= g.height(r.x, -Infinity) - 1e-9, `below solid ground at run ${run} step ${i}`);
    }
  }
});
