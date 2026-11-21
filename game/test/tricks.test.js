import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  TRICK_NAMES,
  GRIND_SECONDS,
  chooseTrick,
  createTrickState,
  airPress,
  airRelease,
  startTrick,
  endGrab,
  stepTrick,
  judgeLanding,
} from '../lib/tricks.js';

function seeded(seed = 123456789) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

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
  t = airRelease(t, () => 0);
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
  t = airRelease(run(t, 0.05), () => 0);
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

test('chooseTrick holds to grab', () => {
  assert.equal(chooseTrick(() => 0, { held: true, overGrindable: false }), 'grab');
  assert.equal(chooseTrick(() => 0.99, { held: true, overGrindable: true }), 'grab');
  assert.equal(chooseTrick(() => 0.5, { held: true }), 'grab');
});

test('chooseTrick offers grind only when overGrindable', () => {
  const rngOff = seeded(42);
  const offSeen = new Set();
  for (let i = 0; i < 300; i++) {
    const kind = chooseTrick(rngOff, { overGrindable: false, held: false });
    assert.notEqual(kind, 'grind', 'grind must not be chosen when not overGrindable');
    assert.ok(kind === 'kickflip' || kind === 'shoveit', `unexpected kind ${kind}`);
    offSeen.add(kind);
  }
  assert.deepEqual(offSeen, new Set(['kickflip', 'shoveit']));

  const rngOn = seeded(42);
  const onSeen = new Set();
  for (let i = 0; i < 300; i++) {
    const kind = chooseTrick(rngOn, { overGrindable: true, held: false });
    assert.ok(kind === 'kickflip' || kind === 'shoveit' || kind === 'grind', `unexpected kind ${kind}`);
    onSeen.add(kind);
  }
  assert.deepEqual(onSeen, new Set(['kickflip', 'shoveit', 'grind']));

  // Guard rng() === 1 boundary
  assert.equal(chooseTrick(() => 1, { overGrindable: false, held: false }), 'shoveit');
  assert.equal(chooseTrick(() => 1, { overGrindable: true, held: false }), 'grind');
});

test('distribution over 4000 seeded draws is roughly uniform across available kinds (each within 10 percent of expected)', () => {
  const rng2 = seeded(98765);
  const counts2 = { kickflip: 0, shoveit: 0 };
  for (let i = 0; i < 4000; i++) {
    const kind = chooseTrick(rng2, { overGrindable: false, held: false });
    counts2[kind] += 1;
  }
  for (const kind of ['kickflip', 'shoveit']) {
    const expected = 4000 / 2;
    assert.ok(Math.abs(counts2[kind] - expected) <= expected * 0.1, `${kind}: ${counts2[kind]} not within 10% of ${expected}`);
  }

  const rng3 = seeded(98765);
  const counts3 = { kickflip: 0, shoveit: 0, grind: 0 };
  for (let i = 0; i < 4000; i++) {
    const kind = chooseTrick(rng3, { overGrindable: true, held: false });
    counts3[kind] += 1;
  }
  for (const kind of ['kickflip', 'shoveit', 'grind']) {
    const expected = 4000 / 3;
    assert.ok(Math.abs(counts3[kind] - expected) <= expected * 0.1, `${kind}: ${counts3[kind]} not within 10% of ${expected}`);
  }
});

test('TRICK_NAMES maps to display strings', () => {
  assert.deepEqual(TRICK_NAMES, {
    kickflip: 'Kickflip',
    shoveit: 'Shove-it',
    grab: 'Grab',
    grind: 'Grind',
  });
});

test('a tap released with an injected rng starts the chosen trick', () => {
  let t = airPress(createTrickState(), true);
  t = run(t, 0.05);
  assert.equal(airRelease(t, () => 0, false).active, 'kickflip');
  assert.equal(airRelease(t, () => 0.9, false).active, 'shoveit');
  assert.equal(airRelease(t, () => 0.9, true).active, 'grind');
});

test('a grind landing on a grindable surface is clean regardless of angle and increments the streak', () => {
  let t = { ...createTrickState(), streak: 2 };
  t = startTrick(t, 'grind', true);
  t = run(t, 0.2);
  const j = judgeLanding(t, 1.4, 0, true);
  assert.equal(j.clean, true);
  assert.equal(j.trick, 'grind');
  assert.equal(j.trickState.streak, 3);
});

test('a grind landing off a grindable surface counts as a grab when the angle is clean, and is not clean otherwise', () => {
  let t = { ...createTrickState(), streak: 3 };
  t = startTrick(t, 'grind', true);
  t = run(t, 0.6);
  const ok = judgeLanding(t, 0, 0, false);
  assert.equal(ok.clean, true);
  assert.equal(ok.trick, 'grab');
  assert.equal(ok.trickState.streak, 4);

  const bad = judgeLanding(t, 1.0, 0, false);
  assert.equal(bad.clean, false);
  assert.equal(bad.trick, null);
  assert.equal(bad.trickState.streak, 0);

  const jDefault = judgeLanding(t, 1.0, 0);
  assert.equal(jDefault.clean, false);
  assert.equal(jDefault.trickState.streak, 0);
});

test('grind holds at progress 1 until landing', () => {
  assert.equal(GRIND_SECONDS, 0.5);
  let t = startTrick(createTrickState(), 'grind', true);
  t = run(t, 0.25);
  assert.equal(t.active, 'grind');
  assert.ok(Math.abs(t.progress - 0.5) < 1e-6);
  t = run(t, 0.25);
  assert.equal(t.active, 'grind');
  assert.equal(t.progress, 1);
  assert.deepEqual(t.done, []);
  t = run(t, 0.5);
  assert.equal(t.active, 'grind');
  assert.equal(t.progress, 1);
  assert.deepEqual(t.done, []);
});

test('trick state returns to idle after landing', () => {
  let t = startTrick(createTrickState(), 'grind', true);
  t = run(t, 0.5);
  const clean = judgeLanding(t, 1.2, 0, true);
  assert.equal(clean.trickState.active, null);
  assert.equal(clean.trickState.progress, 0);
  assert.equal(clean.trickState.presses, 0);
  assert.equal(clean.trickState.pending, null);
  assert.deepEqual(clean.trickState.done, []);
  assert.equal(clean.trickState.queued, null);
  assert.equal(clean.trickState.attempted, false);

  const missed = judgeLanding(t, 0, 0, false);
  assert.equal(missed.trickState.active, null);
  assert.equal(missed.trickState.progress, 0);
  assert.equal(missed.trickState.presses, 0);
  assert.equal(missed.trickState.pending, null);
  assert.deepEqual(missed.trickState.done, []);
  assert.equal(missed.trickState.queued, null);
  assert.equal(missed.trickState.attempted, false);
});

test('flat-ground ollie at speed 1600 finishes a kickflip started on the first airborne frame and starts a queued shove-it, cancelling cleanly on landing', async () => {
  const { createRider, stepRider } = await import('../lib/physics.js');
  const flatGround = { height: () => 0, slope: () => 0 };
  const dt = 1 / 60;
  const speed = 1600;

  // Case 1: Kickflip started on the first airborne frame completes cleanly before landing.
  {
    let r = { ...createRider(), x: 0, y: 0, angle: 0 };
    let t = createTrickState();
    r = stepRider(r, { ollieDown: true }, dt, speed, flatGround);
    assert.equal(r.grounded, false, 'ollie leaves flat ground');
    assert.equal(r.ollied, true);

    t = airPress(t, !r.grounded);
    t = airRelease(t, () => 0, false);
    assert.equal(t.active, 'kickflip');

    let kickflipDoneInAir = false;
    let prevAngle = r.angle;
    for (let i = 0; i < 120 && !r.grounded; i++) {
      prevAngle = r.angle;
      r = stepRider(r, { ollieDown: false }, dt, speed, flatGround);
      t = stepTrick(t, dt);
      if (!r.grounded && t.done.includes('kickflip') && t.active === null) kickflipDoneInAir = true;
    }
    assert.equal(r.grounded, true, 'rider landed');
    assert.equal(kickflipDoneInAir, true, 'kickflip must complete before landing');
    const j = judgeLanding(t, prevAngle, 0, false);
    assert.equal(j.clean, true);
    assert.equal(j.trick, 'kickflip');
    assert.equal(j.trickState.active, null);
  }

  // Case 2: Queued shove-it after kickflip starts in air and cancels cleanly to idle on landing if unfinished.
  {
    let r = { ...createRider(), x: 0, y: 0, angle: 0 };
    let t = createTrickState();
    r = stepRider(r, { ollieDown: true }, dt, speed, flatGround);
    t = airPress(t, !r.grounded);
    t = airRelease(t, () => 0, false);
    assert.equal(t.active, 'kickflip');
    t = airPress(t, !r.grounded);
    assert.equal(t.queued, 'shoveit');

    let sawKickflipDone = false;
    let sawShoveitStart = false;
    let prevAngle = r.angle;
    for (let i = 0; i < 120 && !r.grounded; i++) {
      prevAngle = r.angle;
      r = stepRider(r, { ollieDown: false }, dt, speed, flatGround);
      t = stepTrick(t, dt);
      if (t.done.includes('kickflip')) sawKickflipDone = true;
      if (!r.grounded && t.active === 'shoveit') sawShoveitStart = true;
    }
    assert.equal(r.grounded, true, 'rider landed');
    assert.equal(sawKickflipDone, true, 'kickflip completed before landing');
    assert.equal(sawShoveitStart, true, 'queued shove-it got to start before landing');
    const j = judgeLanding(t, prevAngle, 0, false);
    assert.equal(j.trickState.active, null, 'no stuck active trick after landing');
    assert.equal(j.trickState.progress, 0);
    assert.equal(j.trickState.pending, null);
    assert.equal(j.trickState.queued, null);
    assert.equal(j.trickState.presses, 0);
    assert.deepEqual(j.trickState.done, []);
    assert.equal(j.trickState.attempted, false);
  }
});
