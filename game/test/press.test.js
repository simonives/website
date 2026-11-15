import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPressLatch } from '../lib/press.js';

test('a press and release between two steps is still seen once by the next step', () => {
  const l = createPressLatch();
  l.press();
  l.release();
  assert.equal(l.take(), true);
  assert.equal(l.take(), false);
});

test('a held press is seen on every step until released', () => {
  const l = createPressLatch();
  l.press();
  assert.equal(l.take(), true);
  assert.equal(l.take(), true);
  l.release();
  assert.equal(l.take(), false);
});
