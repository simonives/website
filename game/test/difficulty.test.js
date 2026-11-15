import { test } from 'node:test';
import assert from 'node:assert/strict';
import { speedAt, windBack, advanceClock } from '../lib/difficulty.js';

test('speed starts at 330 (50% above the old 220) and rises strictly', () => {
  assert.equal(speedAt(0, false), 330);
  let prev = 0;
  for (const t of [0, 60, 120, 300]) {
    const v = speedAt(t, false);
    assert.ok(v > prev);
    prev = v;
  }
});

test('speed at two minutes is about 520 and stays under 630 for a 30 minute ride', () => {
  assert.ok(Math.abs(speedAt(120, false) - 519.6) < 1);
  assert.ok(speedAt(1800, false) < 630);
});

test('reduced motion holds 110 whatever the time', () => {
  assert.equal(speedAt(0, true), 110);
  assert.equal(speedAt(500, true), 110);
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
