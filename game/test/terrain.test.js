import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as terrain from '../lib/terrain.js';

const { height, slope } = terrain;

const SPEC_PERIOD = 6000;
const SPEC_SEGMENTS = [
  [700, 0],
  [250, 0.15],
  [500, 0],
  [300, -0.125],
  [800, 0],
  [200, -0.18],
  [600, 0],
  [240, 0.15],
  [900, 0],
  [300, 0.1],
  [500, 0],
  [150, -0.2],
  [560, 0],
];

const JOINTS = [];
{
  let acc = 0;
  for (const [len] of SPEC_SEGMENTS) {
    JOINTS.push(acc);
    acc += len;
  }
}

const VALID_SLOPES = new Set(SPEC_SEGMENTS.map(([, s]) => s));

function distToJoint(x) {
  const u = ((x % SPEC_PERIOD) + SPEC_PERIOD) % SPEC_PERIOD;
  let min = Infinity;
  for (const j of JOINTS) {
    const d = Math.abs(u - j);
    const wrapped = Math.min(d, SPEC_PERIOD - d);
    if (wrapped < min) min = wrapped;
  }
  return min;
}

test('segment lengths sum to the period and net rise is zero', () => {
  assert.equal(terrain.PERIOD, SPEC_PERIOD);
  assert.ok(Array.isArray(terrain.SEGMENTS), 'SEGMENTS should be exported');
  assert.deepEqual(terrain.SEGMENTS, SPEC_SEGMENTS);

  let totalLength = 0;
  let netRise = 0;
  for (const [len, m] of terrain.SEGMENTS) {
    totalLength += len;
    netRise += len * m;
  }
  assert.equal(totalLength, terrain.PERIOD);
  assert.ok(Math.abs(netRise) < 1e-9, `net rise ${netRise}`);
  assert.equal(height(0), 0);
  assert.ok(Math.abs(height(SPEC_PERIOD) - height(0)) < 1e-9);
});

test('height is deterministic', () => {
  for (const x of [-1234.5, 0, 123.4, 700, 5999.9, 60123.4]) {
    assert.equal(height(x), height(x));
  }
});

test('height is continuous', () => {
  const bound = 0.01 * 0.2 + 1e-9;
  for (let x = 0; x <= 12000; x += 1) {
    assert.ok(Math.abs(height(x + 0.01) - height(x)) < bound, `jump at ${x}`);
  }
  // Explicitly straddle period boundaries and negative x
  for (const x of [-0.005, 5999.995, 11999.995]) {
    assert.ok(Math.abs(height(x + 0.01) - height(x)) < bound, `boundary jump at ${x}`);
  }
});

test('slope takes only values from the table', () => {
  for (let x = -6000; x <= 12000; x += 1) {
    const s = slope(x);
    assert.ok(VALID_SLOPES.has(s), `unexpected slope ${s} at ${x}`);
  }
  // At each joint, slope uses the segment starting there
  for (let i = 0; i < JOINTS.length; i++) {
    const expected = SPEC_SEGMENTS[i][1];
    assert.equal(slope(JOINTS[i]), expected, `joint ${JOINTS[i]}`);
    assert.equal(slope(JOINTS[i] - SPEC_PERIOD), expected, `negative joint ${JOINTS[i] - SPEC_PERIOD}`);
    assert.equal(slope(JOINTS[i] + SPEC_PERIOD), expected, `shifted joint ${JOINTS[i] + SPEC_PERIOD}`);
  }
});

test('no curvature away from joints', () => {
  const h = 1;
  for (let x = -6000; x <= 12000; x += 1) {
    if (distToJoint(x) < 2) continue;
    const secondDiff = height(x + h) - 2 * height(x) + height(x - h);
    assert.ok(Math.abs(secondDiff) < 1e-9, `curvature ${secondDiff} at ${x}`);
  }
});

test('height stays within -40 and 40 over -6000 to 60000', () => {
  for (let x = -6000; x <= 60000; x += 1) {
    const y = height(x);
    assert.ok(y >= -40 && y <= 40, `out of range ${y} at ${x}`);
  }
});

test('slope equals the finite difference away from joints', () => {
  const h = 0.001;
  for (let x = -6000; x <= 12000; x += 7) {
    if (distToJoint(x) < 1) continue;
    const fd = (height(x + h) - height(x - h)) / (2 * h);
    assert.ok(Math.abs(slope(x) - fd) < 1e-6, `mismatch at ${x}: slope=${slope(x)}, fd=${fd}`);
  }
});

test('periodic: height(x) equals height(x+6000)', () => {
  for (let x = -6000; x <= 12000; x += 1) {
    assert.equal(height(x), height(x + SPEC_PERIOD), `mismatch at integer ${x}`);
    assert.equal(slope(x), slope(x + SPEC_PERIOD), `slope mismatch at integer ${x}`);
  }
  for (const x of [-12345.67, -0.25, 350.5, 725.3, 5300.75, 600000.25]) {
    assert.ok(Math.abs(height(x) - height(x + SPEC_PERIOD)) < 1e-9, `mismatch at ${x}`);
    assert.equal(slope(x), slope(x + SPEC_PERIOD), `slope mismatch at ${x}`);
  }
});

test('max slope magnitude is at most 0.21', () => {
  for (let x = -6000; x <= 12000; x += 1) {
    assert.ok(Math.abs(slope(x)) <= 0.21, `too steep at ${x}: ${slope(x)}`);
  }
});
