import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createLoop } from '../lib/loop.js';

test('first call sets the baseline and runs no steps', () => {
  const loop = createLoop();
  assert.equal(loop.advance(1000), 0);
});

test('one step for 16.7 ms', () => {
  const loop = createLoop();
  loop.advance(0);
  assert.equal(loop.advance(16.7), 1);
});

test('short frames accumulate', () => {
  const loop = createLoop();
  loop.advance(0);
  assert.equal(loop.advance(5), 0);
  assert.equal(loop.advance(17), 1);
});

test('a 60 second gap runs at most 6 steps', () => {
  const loop = createLoop();
  loop.advance(0);
  const n = loop.advance(60000);
  assert.ok(n >= 1 && n <= 6, `got ${n}`);
});

test('a 144 Hz display averages 60 steps per second', () => {
  const loop = createLoop();
  loop.advance(0);
  let steps = 0;
  for (let i = 1; i <= 144; i++) steps += loop.advance((i * 1000) / 144);
  assert.ok(Math.abs(steps - 60) <= 1, `got ${steps}`);
});
