import { test } from 'node:test';
import assert from 'node:assert/strict';
import { offsetAt, offsetSlope, createGround } from '../lib/ground.js';
import { height, slope } from '../lib/terrain.js';

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
  assert.equal(offsetAt(stairs, 1050), 40); // platform is the first 0.3 * 400 = 120
  const stepW = (400 - 120) / 4;
  let prev = 40;
  for (let i = 1; i <= 4; i++) {
    const v = offsetAt(stairs, 1000 + 120 + (i - 0.5) * stepW);
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

import { risers } from '../lib/ground.js';

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
