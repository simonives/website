import { test } from 'node:test';
import assert from 'node:assert/strict';
import { offsetAt, offsetSlope, createGround, risers, stairGeometry } from '../lib/ground.js';
import { height, slope } from '../lib/terrain.js';
import { placeObstacles } from '../lib/obstacles.js';
import { createRider, stepRider } from '../lib/physics.js';
import { PHRASES } from '../content.js';

const ramp = { kind: 'ramp', x: 1000, width: 200, height: 50, steps: 0 };
const ledge = { kind: 'ledge', x: 1000, width: 200, height: 20, steps: 0 };
const stairs = { kind: 'stairs', x: 1000, width: 400, height: 40, steps: 4 };

test('ramp rises linearly from 0 to its height', () => {
  assert.equal(offsetAt(ramp, 1000), 0);
  assert.ok(Math.abs(offsetAt(ramp, 1100) - 25) < 1e-9);
  assert.ok(Math.abs(offsetAt(ramp, 1200) - 50) < 1e-9);
  assert.equal(offsetAt(ramp, 1201), 0);
  assert.equal(offsetAt(ramp, 999), 0);
});

test('ledge holds its height across the span and is 0 outside', () => {
  assert.equal(offsetAt(ledge, 1000), 20);
  assert.equal(offsetAt(ledge, 1100), 20);
  assert.equal(offsetAt(ledge, 1200), 20);
  assert.equal(offsetAt(ledge, 999), 0);
  assert.equal(offsetAt(ledge, 1201), 0);
});

test('stairs: platform then treads strictly descending, last tread is height over steps+1', () => {
  const { platformW, stepW } = stairGeometry(stairs);
  assert.equal(offsetAt(stairs, 1050), 40);
  assert.equal(offsetAt(stairs, 1000 + platformW - 0.5), 40);
  let prev = 40;
  for (let i = 1; i <= 4; i++) {
    const v = offsetAt(stairs, 1000 + platformW + (i - 0.5) * stepW);
    assert.ok(v < prev, `tread ${i}`);
    prev = v;
  }
  assert.ok(Math.abs(prev - 40 / 5) < 1e-9);
  assert.equal(offsetAt(stairs, 1401), 0);
});

test('offsetSlope is height over width on a ramp and 0 elsewhere', () => {
  assert.ok(Math.abs(offsetSlope(ramp, 1100) - 0.25) < 1e-9);
  assert.equal(offsetSlope(ledge, 1100), 0);
  assert.equal(offsetSlope(stairs, 1100), 0);
  assert.equal(offsetSlope(ramp, 500), 0);
});

test('createGround with no obstacles is the terrain', () => {
  const g = createGround([]);
  for (const x of [0, 123.4, 5000]) {
    assert.equal(g.height(x), height(x));
    assert.equal(g.slope(x), slope(x));
  }
});

test('ground over a ledge is terrain plus its height, and slope over a ramp adds the ramp slope', () => {
  const g = createGround([ledge, { ...ramp, x: 3000 }]);
  assert.ok(Math.abs(g.height(1100) - (height(1100) + 20)) < 1e-9);
  assert.ok(Math.abs(g.height(500) - height(500)) < 1e-9);
  assert.ok(Math.abs(g.slope(3100) - (slope(3100) + 0.25)) < 1e-9);
});

test('risers: a ramp has one at its lip', () => {
  assert.deepEqual(risers(ramp), [{ x: 1200, from: 0, to: 50 }]);
});

test('risers: a ledge has a front and a back', () => {
  assert.deepEqual(risers(ledge), [{ x: 1000, from: 0, to: 20 }, { x: 1200, from: 0, to: 20 }]);
});

test('risers: stairs have a front, a platform edge, and one per tread boundary', () => {
  const r = risers(stairs);
  assert.equal(r.length, stairs.steps + 2);
  assert.deepEqual(r[0], { x: 1000, from: 0, to: 40 });
  assert.ok(Math.abs(r.at(-1).x - 1400) < 1e-9);
  assert.ok(Math.abs(r.at(-1).to - 8) < 1e-9);
  for (const k of r) assert.ok(k.to > k.from);
});

const drop = { kind: 'drop', x: 1000, width: 250, height: 55, steps: 0 };
const rail = { kind: 'rail', x: 2000, width: 200, height: 26, steps: 0 };
const gap = { kind: 'gap', x: 3000, width: 240, height: 32, steps: 0 };

test('drop holds its height', () => {
  assert.equal(offsetAt(drop, 1000), 55);
  assert.equal(offsetAt(drop, 1125), 55);
  assert.equal(offsetAt(drop, 1250), 55);
  assert.equal(offsetAt(drop, 999), 0);
  assert.equal(offsetAt(drop, 1251), 0);
  assert.equal(offsetSlope(drop, 1100), 0);
  assert.deepEqual(risers(drop), [{ x: 1000, from: 0, to: 55 }, { x: 1250, from: 0, to: 55 }]);
  const g = createGround([drop]);
  assert.ok(Math.abs(g.height(1100) - (height(1100) + 55)) < 1e-9);
});

test('gap lowers the ground by its depth across its span and is 0 outside', () => {
  assert.equal(offsetAt(gap, 2999), 0);
  assert.equal(offsetAt(gap, 3000), -32);
  assert.equal(offsetAt(gap, 3120), -32);
  assert.equal(offsetAt(gap, 3239.9), -32);
  assert.equal(offsetAt(gap, 3240), 0);
  assert.equal(offsetAt(gap, 3241), 0);
  assert.equal(offsetSlope(gap, 3100), 0);
  assert.deepEqual(risers(gap), [{ x: 3000, from: 0, to: -32 }, { x: 3240, from: -32, to: 0 }]);
  const g = createGround([gap]);
  assert.ok(Math.abs(g.height(3100) - (height(3100) - 32)) < 1e-9);
  assert.ok(Math.abs(g.height(3240) - height(3240)) < 1e-9);
});

test('rail is ground only from above: height(x, lowY) is terrain, height(x, highY) is terrain + bar height', () => {
  const g = createGround([rail]);
  const x = 2100;
  const base = height(x);
  assert.ok(Math.abs(g.height(x, base) - base) < 1e-9);
  assert.ok(Math.abs(g.height(x, base + rail.height - 2.1) - base) < 1e-9);
  assert.ok(Math.abs(g.height(x, base + rail.height - 2) - (base + rail.height)) < 1e-9);
  assert.ok(Math.abs(g.height(x, base + rail.height + 20) - (base + rail.height)) < 1e-9);
  assert.equal(offsetSlope(rail, x), 0);
  assert.deepEqual(risers(rail), []);
});

test('surface reports rail, ledge, ground', () => {
  const obs = [
    { ...ramp, x: 500 },
    { ...ledge, x: 1000 },
    { ...stairs, x: 1500 },
    { ...drop, x: 2200 },
    { ...rail, x: 2700 },
    { ...gap, x: 3200 },
  ];
  const g = createGround(obs);
  assert.equal(g.surface(100), 'ground');
  assert.equal(g.surface(600), 'ground');
  assert.equal(g.surface(1100), 'ledge');
  assert.equal(g.surface(1600), 'ground');
  assert.equal(g.surface(2300), 'ledge');
  assert.equal(g.surface(2800, height(2800) + rail.height), 'rail');
  assert.equal(g.surface(2800, height(2800)), 'ground');
  assert.equal(g.surface(2800), 'rail');
  assert.equal(g.surface(3300), 'ground');
});

test('height and slope with one argument behave as before', () => {
  const g = createGround([ledge, { ...ramp, x: 3000 }, { ...rail, x: 4000 }]);
  assert.ok(Math.abs(g.height(1100) - (height(1100) + 20)) < 1e-9);
  assert.ok(Math.abs(g.slope(1100) - slope(1100)) < 1e-9);
  assert.ok(Math.abs(g.height(3100) - (height(3100) + 25)) < 1e-9);
  assert.ok(Math.abs(g.slope(3100) - (slope(3100) + 0.25)) < 1e-9);
  assert.ok(Math.abs(g.height(4100) - (height(4100) + 26)) < 1e-9);
  assert.ok(Math.abs(g.slope(4100) - slope(4100)) < 1e-9);
});

const placedStairs = placeObstacles(PHRASES, 0, 60000).filter((o) => o.kind === 'stairs');

test('stair treads are no deeper than 1.2 times their riser (steep, unless capped by the obstacle width)', () => {
  assert.ok(placedStairs.length > 0, 'found stairs obstacles in 0..60000');
  for (const ob of placedStairs) {
    const { stepW, riser } = stairGeometry(ob);
    assert.ok(Math.abs(riser - ob.height / (ob.steps + 1)) < 1e-9);
    assert.ok(stepW <= 1.2 * riser + 1e-9, `stepW ${stepW} exceeds 1.2 * riser ${1.2 * riser}`);
    assert.ok(stepW <= (0.7 * ob.width) / ob.steps + 1e-9, `stepW ${stepW} exceeds 70% width cap`);
    assert.ok(Math.abs(stepW - Math.min(1.2 * riser, (0.7 * ob.width) / ob.steps)) < 1e-9);
  }
  const narrow = { kind: 'stairs', x: 1000, width: 30, height: 60, steps: 4 };
  const ng = stairGeometry(narrow);
  assert.ok(Math.abs(ng.stepW - (0.7 * narrow.width) / narrow.steps) < 1e-9, 'narrow stairs cap descent at 70% of width');
  assert.ok(Math.abs(ng.platformW - 0.3 * narrow.width) < 1e-9, 'narrow stairs keep 30% platform');
});

test('the platform is at least 30% of the width for every stairs obstacle in that range', () => {
  assert.ok(placedStairs.length > 0);
  for (const ob of placedStairs) {
    const { platformW, stepW } = stairGeometry(ob);
    assert.ok(platformW >= 0.3 * ob.width - 1e-9, `platformW ${platformW} < 30% of ${ob.width}`);
    assert.ok(Math.abs(platformW + ob.steps * stepW - ob.width) < 1e-9);
  }
});

test('risers() returns one vertical face per tread boundary at the new tread spacing', () => {
  const { platformW, stepW, riser } = stairGeometry(stairs);
  const r = risers(stairs);
  assert.equal(r.length, stairs.steps + 2);
  assert.deepEqual(r[0], { x: stairs.x, from: 0, to: stairs.height });
  for (let j = 0; j <= stairs.steps; j++) {
    const face = r[j + 1];
    const expectedX = stairs.x + platformW + j * stepW;
    const expectedTo = stairs.height - j * riser;
    const expectedFrom = j === stairs.steps ? 0 : stairs.height - (j + 1) * riser;
    assert.ok(Math.abs(face.x - expectedX) < 1e-9, `riser ${j} x=${face.x} expected ${expectedX}`);
    assert.ok(Math.abs(face.to - expectedTo) < 1e-9, `riser ${j} to=${face.to} expected ${expectedTo}`);
    assert.ok(Math.abs(face.from - expectedFrom) < 1e-9, `riser ${j} from=${face.from} expected ${expectedFrom}`);
    if (j > 0) assert.ok(Math.abs(face.x - r[j].x - stepW) < 1e-9, `spacing between riser ${j - 1} and ${j}`);
  }
});

test('offsetAt descends strictly by one riser per tread', () => {
  for (const ob of [stairs, ...placedStairs.slice(0, 6)]) {
    const { platformW, stepW, riser } = stairGeometry(ob);
    assert.equal(offsetAt(ob, ob.x), ob.height);
    assert.equal(offsetAt(ob, ob.x + platformW - 1e-6), ob.height);
    let prev = ob.height;
    for (let i = 1; i <= ob.steps; i++) {
      const mid = offsetAt(ob, ob.x + platformW + (i - 0.5) * stepW);
      assert.ok(Math.abs(prev - mid - riser) < 1e-9, `tread ${i} drop ${prev - mid} vs riser ${riser}`);
      prev = mid;
    }
    assert.ok(Math.abs(prev - riser) < 1e-9, 'last tread sits one riser above ground');
    assert.equal(offsetAt(ob, ob.x + ob.width + 1e-6), 0);
  }
});

test('a rider riding down the staircase never ends below the ground and never gets stuck', () => {
  const dt = 1 / 60;
  const speed = 640;
  for (const ob of [stairs, ...placedStairs]) {
    const ground = createGround([ob]);
    const startX = ob.x + 10;
    let rider = {
      ...createRider(),
      x: startX,
      y: ground.height(startX),
      angle: Math.atan(ground.slope(startX)),
      grounded: true,
    };
    const endX = ob.x + ob.width + 400;
    let steps = 0;
    while (rider.x < endX && steps < 600) {
      const prevX = rider.x;
      const prevY = rider.y;
      rider = stepRider(rider, { ollieDown: false }, dt, speed, ground);
      steps++;
      assert.ok(Number.isFinite(rider.x) && Number.isFinite(rider.y), 'finite position');
      assert.ok(rider.x > prevX, `rider stuck at x=${rider.x}`);
      const g = ground.height(rider.x, prevY);
      assert.ok(rider.y >= g - 1e-9, `rider y=${rider.y} below ground ${g} at x=${rider.x}`);
    }
    assert.ok(rider.x >= endX, `rider cleared staircase in ${steps} steps`);
    assert.equal(rider.grounded, true, 'rider lands cleanly after the staircase');
  }
});
