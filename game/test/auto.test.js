import { test } from 'node:test';
import assert from 'node:assert/strict';
import { autoInput } from '../lib/auto.js';

const ob = (x) => ({ id: 'abc', label: 'L', sentence: '', x, width: 100, lit: false });

test('grounded with an obstacle within 150 ahead issues an ollie', () => {
  const r = autoInput({ rider: { x: 0, grounded: true, vy: 0 }, obstacles: [ob(120)] });
  assert.equal(r.ollieDown, true);
  assert.equal(r.trick, null);
});

test('grounded with nothing near does nothing', () => {
  const r = autoInput({ rider: { x: 0, grounded: true, vy: 0 }, obstacles: [ob(500)] });
  assert.deepEqual(r, { ollieDown: false, trick: null });
});

test('an obstacle behind the rider is ignored', () => {
  const r = autoInput({ rider: { x: 400, grounded: true, vy: 0 }, obstacles: [ob(100)] });
  assert.equal(r.ollieDown, false);
});

test('airborne issues a trick and releases the ollie', () => {
  const r = autoInput({ rider: { x: 0, grounded: false, vy: 80 }, obstacles: [ob(120)] });
  assert.equal(r.ollieDown, false);
  assert.ok(r.trick === 'kickflip' || r.trick === 'shoveit');
});
