import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPressLatch } from '../lib/press.js';
import { createRider, stepRider } from '../lib/physics.js';
import { offsetAt, offsetSlope } from '../lib/ground.js';

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

test('a press made on the exact step of a wall hit still produces an ollie on the next possible step', () => {
  const ledge = { kind: 'ledge', x: 100, width: 400, height: 24, steps: 0 };
  const ground = {
    height: (x) => offsetAt(ledge, x),
    slope: (x) => offsetSlope(ledge, x),
  };
  const dt = 1 / 60;
  const speed = 640;

  for (const mode of ['tap', 'hold']) {
    const press = createPressLatch();
    // Position rider so the very next step crosses x = 100 and triggers a wall hit.
    let rider = { ...createRider(), x: 95, y: 0, grounded: true, angle: 0, vg: 0 };
    press.press();
    if (mode === 'tap') press.release();

    let sawWallHit = false;
    let sawOllieAfterLanding = false;
    let landedAfterHit = false;

    for (let i = 0; i < 90; i++) {
      const wasGrounded = rider.grounded;
      const wasHeld = rider.ollieHeld;
      const ollieDown = press.take(rider.grounded);
      rider = stepRider(rider, { ollieDown }, dt, speed, ground);
      if (rider.hit === 'wall') {
        assert.equal(i, 0, `${mode}: expected wall hit on first step`);
        sawWallHit = true;
        if (wasGrounded && ollieDown && !wasHeld && press.requeue) press.requeue();
      } else if (sawWallHit && !landedAfterHit && rider.grounded) {
        landedAfterHit = true;
      } else if (landedAfterHit && rider.ollied) {
        sawOllieAfterLanding = true;
        break;
      }
    }

    assert.equal(sawWallHit, true, `${mode}: wall hit should occur`);
    assert.equal(landedAfterHit, true, `${mode}: rider should land on ledge after bump`);
    assert.equal(sawOllieAfterLanding, true, `${mode}: press from wall-hit step must produce an ollie on the next grounded step`);
  }
});
