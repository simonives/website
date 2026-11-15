import { test } from 'node:test';
import assert from 'node:assert/strict';
import { height, slope } from '../lib/terrain.js';

test('height is deterministic', () => {
  assert.equal(height(123.4), height(123.4));
});

test('height is continuous', () => {
  for (let x = 0; x <= 5000; x += 1) {
    assert.ok(Math.abs(height(x + 0.01) - height(x)) < 0.05, `jump at ${x}`);
  }
});

test('slope stays rideable', () => {
  for (let x = 0; x <= 5000; x += 1) {
    assert.ok(Math.abs(slope(x)) < 0.6, `too steep at ${x}`);
  }
});

test('slope matches finite difference', () => {
  for (let x = 0; x <= 5000; x += 7) {
    const fd = (height(x + 0.001) - height(x - 0.001)) / 0.002;
    assert.ok(Math.abs(slope(x) - fd) < 1e-3, `mismatch at ${x}`);
  }
});
