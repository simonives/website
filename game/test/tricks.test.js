import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTrickState, startTrick, stepTrick, judgeLanding } from '../lib/tricks.js';

test('trick cannot start on the ground', () => {
  const t = startTrick(createTrickState(), 'kickflip', false);
  assert.equal(t.active, null);
});

test('trick starts in the air and cannot be replaced mid-trick', () => {
  let t = startTrick(createTrickState(), 'kickflip', true);
  assert.equal(t.active, 'kickflip');
  t = startTrick(t, 'shoveit', true);
  assert.equal(t.active, 'kickflip');
});

test('trick progress reaches 1 in 0.6 s', () => {
  let t = startTrick(createTrickState(), 'shoveit', true);
  for (let i = 0; i < 150; i++) t = stepTrick(t, 0.004);
  assert.ok(Math.abs(t.progress - 1) < 1e-9);
  t = stepTrick(t, 1);
  assert.equal(t.progress, 1);
});

test('clean landing extends streak', () => {
  let t = startTrick(createTrickState(), 'kickflip', true);
  t = stepTrick(t, 0.6);
  const j = judgeLanding(t, 0.1, 0.0);
  assert.equal(j.clean, true);
  assert.equal(j.trick, 'kickflip');
  assert.equal(j.trickState.streak, 1);
  assert.equal(j.trickState.active, null);
});

test('incomplete trick landing resets streak', () => {
  let t = { ...createTrickState(), streak: 3 };
  t = startTrick(t, 'kickflip', true);
  t = stepTrick(t, 0.2);
  const j = judgeLanding(t, 0, 0);
  assert.equal(j.clean, false);
  assert.equal(j.trick, null);
  assert.equal(j.trickState.streak, 0);
});

test('bad landing angle resets streak', () => {
  let t = { ...createTrickState(), streak: 2 };
  t = stepTrick(startTrick(t, 'shoveit', true), 0.6);
  const j = judgeLanding(t, 0.9, 0);
  assert.equal(j.clean, false);
  assert.equal(j.trickState.streak, 0);
});

test('plain landing without a trick leaves streak unchanged', () => {
  const t = { ...createTrickState(), streak: 4 };
  const j = judgeLanding(t, 0, 0);
  assert.equal(j.clean, false);
  assert.equal(j.trickState.streak, 4);
});
