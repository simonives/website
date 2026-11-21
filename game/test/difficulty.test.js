import { test } from 'node:test';
import assert from 'node:assert/strict';
import { speedAt, timeAtDistance, windBack, advanceClock } from '../lib/difficulty.js';

test('speed starts at 640 and rises strictly', () => {
  assert.equal(speedAt(0, false), 640);
  let prev = 0;
  for (const t of [0, 10, 60, 75, 120, 300, 600]) {
    const v = speedAt(t, false);
    assert.ok(v > prev, `expected speedAt(${t})=${v} > ${prev}`);
    prev = v;
  }
});

test('speed at 75 s is about 1247 and approaches 1600 (within 1590 to 1600 at t = 1e6)', () => {
  const at75 = speedAt(75, false);
  assert.ok(Math.abs(at75 - 1246.8) < 1, `speedAt(75) was ${at75}`);
  const ceil = speedAt(1e6, false);
  assert.ok(ceil >= 1590 && ceil <= 1600, `speedAt(1e6) was ${ceil}`);
});

test('full pace unchanged at 640 at t=0', () => {
  assert.equal(speedAt(0, false), 640);
  assert.equal(speedAt(75, false), 1600 - 960 * Math.exp(-1));
});

test('reduced pace is 300', () => {
  assert.equal(speedAt(0, true), 300);
  assert.equal(speedAt(500, true), 300);
});

test('timeAtDistance inverts the ride distance (for t in 0..600, timeAtDistance(D(t)) is within 1e-6 of t)', () => {
  const D = (t) => 1600 * t - 960 * 75 * (1 - Math.exp(-t / 75));
  for (let t = 0; t <= 600; t += 1) {
    const got = timeAtDistance(D(t));
    assert.ok(Math.abs(got - t) < 1e-6, `at t=${t}: got ${got}`);
  }
  for (const t of [0.1, 0.5, 12.34, 75.5, 250.25, 599.9]) {
    const got = timeAtDistance(D(t));
    assert.ok(Math.abs(got - t) < 1e-6, `at t=${t}: got ${got}`);
  }
});

test('timeAtDistance(0) is 0 and negative gives 0', () => {
  assert.equal(timeAtDistance(0), 0);
  assert.equal(timeAtDistance(-1), 0);
  assert.equal(timeAtDistance(-10000), 0);
});

test('windBack takes 8 seconds off and never goes below 0', () => {
  assert.equal(windBack(30), 22);
  assert.equal(windBack(5), 0);
});

test('the ride clock advances only while running and winds back on a hit', () => {
  assert.equal(advanceClock(10, 0.5, false, false), 10);
  assert.equal(advanceClock(10, 0.5, true, false), 10.5);
  assert.equal(advanceClock(30, 0, true, true), 22);
  assert.equal(advanceClock(3, 0, true, true), 0);
});
