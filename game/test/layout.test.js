import { test } from 'node:test';
import assert from 'node:assert/strict';
import { groundLine } from '../lib/layout.js';

test('ground line is finite for heights 0, 1, 50', () => {
  for (const h of [0, 1, 50]) {
    const y = groundLine(h);
    assert.ok(Number.isFinite(y), `expected finite number for height ${h}, got ${y}`);
  }
});

test('ground line sits between 50% and 85% of heights from 280 to 2000', () => {
  for (let h = 280; h <= 2000; h += 1) {
    const y = groundLine(h);
    assert.ok(y >= 0.5 * h && y <= 0.85 * h, `expected ${y} within [0.5*${h}, 0.85*${h}]`);
  }
});

test('ground line is monotonic in height', () => {
  let prev = groundLine(0);
  for (let h = 1; h <= 2000; h += 1) {
    const cur = groundLine(h);
    assert.ok(cur >= prev, `groundLine(${h})=${cur} < groundLine(${h - 1})=${prev}`);
    prev = cur;
  }
});
