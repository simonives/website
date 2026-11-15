import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTrickState, airPress, airRelease, startTrick, endGrab, stepTrick, judgeLanding } from '../lib/tricks.js';

function run(t, seconds, dt = 0.005) {
  const n = Math.round(seconds / dt);
  for (let i = 0; i < n; i++) t = stepTrick(t, dt);
  return t;
}

test('a press on the ground does nothing', () => {
  const t = airPress(createTrickState(), false);
  assert.equal(t.pending, null);
  assert.equal(t.presses, 0);
});

test('tap in the air starts a kickflip that completes in 0.6 s', () => {
  let t = airPress(createTrickState(), true);
  t = run(t, 0.1);
  t = airRelease(t);
  assert.equal(t.active, 'kickflip');
  t = run(t, 0.55);
  assert.equal(t.active, 'kickflip');
  t = run(t, 0.05);
  assert.equal(t.active, null);
  assert.deepEqual(t.done, ['kickflip']);
});

test('holding past 0.2 s becomes a grab, completed by releasing after 0.3 s total', () => {
  let t = airPress(createTrickState(), true);
  t = run(t, 0.25);
  assert.equal(t.active, 'grab');
  t = run(t, 0.1);
  t = airRelease(t);
  assert.deepEqual(t.done, ['grab']);
  assert.equal(t.active, null);
});

test('a grab released before 0.3 s is cancelled and the landing resets the streak', () => {
  let t = { ...createTrickState(), streak: 3 };
  t = airPress(t, true);
  t = run(t, 0.25);
  t = airRelease(t);
  assert.deepEqual(t.done, []);
  const j = judgeLanding(t, 0, 0);
  assert.equal(j.clean, false);
  assert.equal(j.trickState.streak, 0);
});

test('a third press queues a shove-it that starts after the flip and completes in 0.45 s', () => {
  let t = airPress(createTrickState(), true);
  t = airRelease(run(t, 0.05));
  t = airPress(t, true);
  assert.equal(t.queued, 'shoveit');
  t = run(t, 0.6);
  assert.deepEqual(t.done, ['kickflip']);
  assert.equal(t.active, 'shoveit');
  t = run(t, 0.45);
  assert.deepEqual(t.done, ['kickflip', 'shoveit']);
  assert.equal(t.active, null);
});

test('a fourth press is ignored', () => {
  let t = airPress(createTrickState(), true);
  t = airRelease(run(t, 0.05));
  t = airPress(t, true);
  const before = t;
  t = airPress(t, true);
  assert.deepEqual(t, before);
});

test('direct startTrick mirrors the tap results', () => {
  let t = startTrick(createTrickState(), 'kickflip', true);
  assert.equal(t.active, 'kickflip');
  assert.equal(startTrick(t, 'shoveit', true).active, 'kickflip');
  t = run(t, 0.6);
  assert.deepEqual(t.done, ['kickflip']);
  assert.equal(startTrick(createTrickState(), 'kickflip', false).active, null);
});

test('a direct grab completes when ended after 0.3 s and is cancelled before', () => {
  let t = run(startTrick(createTrickState(), 'grab', true), 0.35);
  assert.deepEqual(endGrab(t).done, ['grab']);
  t = run(startTrick(createTrickState(), 'grab', true), 0.1);
  assert.deepEqual(endGrab(t).done, []);
});

test('clean landing after a flip adds to the streak and resets the jump', () => {
  let t = startTrick(createTrickState(), 'kickflip', true);
  t = run(t, 0.6);
  const j = judgeLanding(t, 0.1, 0);
  assert.equal(j.clean, true);
  assert.equal(j.trick, 'kickflip');
  assert.equal(j.trickState.streak, 1);
  assert.deepEqual(j.trickState.done, []);
  assert.equal(j.trickState.presses, 0);
  assert.equal(j.trickState.pending, null);
  assert.equal(j.trickState.active, null);
});

test('landing mid-flip resets the streak', () => {
  let t = { ...createTrickState(), streak: 3 };
  t = run(startTrick(t, 'kickflip', true), 0.2);
  const j = judgeLanding(t, 0, 0);
  assert.equal(j.clean, false);
  assert.equal(j.trick, null);
  assert.equal(j.trickState.streak, 0);
});

test('landing while still holding a grab held 0.4 s counts', () => {
  const t = run(startTrick(createTrickState(), 'grab', true), 0.4);
  const j = judgeLanding(t, 0, 0);
  assert.equal(j.clean, true);
  assert.equal(j.trick, 'grab');
});

test('a bad landing angle is not clean', () => {
  const t = run(startTrick(createTrickState(), 'kickflip', true), 0.6);
  assert.equal(judgeLanding(t, 0.9, 0).clean, false);
});

test('a plain landing leaves the streak unchanged', () => {
  const t = { ...createTrickState(), streak: 4 };
  const j = judgeLanding(t, 0, 0);
  assert.equal(j.clean, false);
  assert.equal(j.trickState.streak, 4);
});
