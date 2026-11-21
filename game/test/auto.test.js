import { test } from 'node:test';
import assert from 'node:assert/strict';
import { autoInput } from '../lib/auto.js';
import { placeObstacles } from '../lib/obstacles.js';
import { createGround } from '../lib/ground.js';
import { createRider, stepRider } from '../lib/physics.js';
import { speedAt, advanceClock } from '../lib/difficulty.js';
import { PHRASES } from '../content.js';

const ob = (kind, x, width = 200) => ({ kind, id: 'abc', label: 'L', sentence: '', x, width, height: 20, steps: 0, lit: false });
const ground = (x) => ({ x, grounded: true, vy: 0 });

test('a ledge 100 ahead at speed 220 gets an ollie, 300 ahead does not', () => {
  assert.equal(autoInput({ rider: ground(0), obstacles: [ob('ledge', 100)], speed: 220 }).ollieDown, true);
  assert.equal(autoInput({ rider: ground(0), obstacles: [ob('ledge', 300)], speed: 220 }).ollieDown, false);
});

test('stairs are treated like ledges', () => {
  assert.equal(autoInput({ rider: ground(0), obstacles: [ob('stairs', 100)], speed: 220 }).ollieDown, true);
});

test('the ollie distance scales with speed', () => {
  assert.equal(autoInput({ rider: ground(0), obstacles: [ob('ledge', 200)], speed: 400 }).ollieDown, true);
  assert.equal(autoInput({ rider: ground(0), obstacles: [ob('ledge', 200)], speed: 220 }).ollieDown, false);
});

test('on a ramp it ollies only near the lip', () => {
  const r = ob('ramp', 0, 200);
  assert.equal(autoInput({ rider: ground(100), obstacles: [r], speed: 220 }).ollieDown, false);
  assert.equal(autoInput({ rider: ground(185), obstacles: [r], speed: 220 }).ollieDown, true);
});

test('already on a ledge it does nothing', () => {
  assert.equal(autoInput({ rider: ground(50), obstacles: [ob('ledge', 0)], speed: 220 }).ollieDown, false);
});

test('nothing ahead does nothing, and an obstacle behind is ignored', () => {
  assert.deepEqual(autoInput({ rider: ground(0), obstacles: [], speed: 220 }), { ollieDown: false, trick: null });
  assert.equal(autoInput({ rider: ground(400), obstacles: [ob('ledge', 100, 50)], speed: 220 }).ollieDown, false);
});

test('airborne issues a trick and releases the ollie', () => {
  const r = autoInput({ rider: { x: 0, grounded: false, vy: 80 }, obstacles: [ob('stairs', 120)], speed: 220 });
  assert.equal(r.ollieDown, false);
  assert.ok(r.trick === 'kickflip' || r.trick === 'shoveit');
});

test('airborne over a rail/ledge/drop asks for a grind', () => {
  for (const kind of ['rail', 'ledge', 'drop']) {
    const r = autoInput({ rider: { x: 50, grounded: false, vy: 80 }, obstacles: [ob(kind, 120)], speed: 220 });
    assert.deepEqual(r, { ollieDown: false, trick: 'grind' }, `expected grind for ${kind}`);
  }
  const missingId = autoInput({ rider: { x: 0, grounded: false, vy: 80 }, obstacles: [{ kind: 'ramp', x: 120, width: 200 }], speed: 220 });
  assert.deepEqual(missingId, { ollieDown: false, trick: 'shoveit' });
});

test('ollies before drops, rails and gaps, does nothing already on top, does not ollie before a ramp', () => {
  for (const kind of ['drop', 'rail', 'gap']) {
    assert.equal(autoInput({ rider: ground(0), obstacles: [ob(kind, 100)], speed: 220 }).ollieDown, true, `before ${kind}`);
    assert.equal(autoInput({ rider: ground(0), obstacles: [ob(kind, 300)], speed: 220 }).ollieDown, false, `far ${kind}`);
    assert.equal(autoInput({ rider: ground(50), obstacles: [ob(kind, 0)], speed: 220 }).ollieDown, false, `on ${kind}`);
  }
  assert.equal(autoInput({ rider: ground(50), obstacles: [ob('stairs', 0)], speed: 220 }).ollieDown, false, 'on stairs');
  assert.equal(autoInput({ rider: ground(0), obstacles: [ob('ramp', 100)], speed: 220 }).ollieDown, false, 'before ramp');
});

test('auto-ride over 120 simulated seconds through the real obstacle sequence has no NaN, never below ground, and x advances monotonically', () => {
  const dt = 1 / 60;
  const steps = 120 * 60;
  const obstacles = placeObstacles(PHRASES, 0, 90000);
  const ground = createGround(obstacles);
  let rider = createRider();
  for (let i = 0; i < steps; i++) {
    const t = i * dt;
    const speed = speedAt(t, false);
    const input = autoInput({ rider, obstacles, speed });
    const prevX = rider.x;
    const prevY = rider.y;
    rider = stepRider(rider, input, dt, speed, ground);
    assert.ok(Number.isFinite(rider.x) && Number.isFinite(rider.y) && Number.isFinite(rider.vy) && Number.isFinite(rider.angle), `NaN at step ${i}`);
    assert.ok(rider.x > prevX, `x failed to advance at step ${i}: ${prevX} -> ${rider.x}`);
    assert.ok(rider.y >= ground.height(rider.x, prevY) - 1e-9, `below active ground at step ${i}`);
    assert.ok(rider.y >= ground.height(rider.x, -Infinity) - 1e-9, `below solid ground at step ${i}`);
  }
  assert.ok(rider.x > 40000, `rider only reached ${rider.x}`);
});

test('auto-ride survives 300 simulated seconds at the real speed ramp with no NaN, never below the ground and x strictly advancing', () => {
  const dt = 1 / 60;
  const steps = 300 * 60;
  const obstacles = placeObstacles(PHRASES, 0, 360000);
  const ground = createGround(obstacles);
  let rider = createRider();
  let rideT = 0;
  for (let i = 0; i < steps; i++) {
    const speed = speedAt(rideT, false);
    const input = autoInput({ rider, obstacles, speed });
    const prevX = rider.x;
    const prevY = rider.y;
    rider = stepRider(rider, input, dt, speed, ground);
    rideT = advanceClock(rideT, dt, true, rider.hit === 'wall');
    assert.ok(Number.isFinite(rider.x) && Number.isFinite(rider.y) && Number.isFinite(rider.vy) && Number.isFinite(rider.angle), `NaN at step ${i}`);
    assert.ok(rider.x > prevX, `x failed to advance at step ${i}: ${prevX} -> ${rider.x}`);
    assert.ok(rider.y >= ground.height(rider.x, prevY) - 1e-9, `below active ground at step ${i}`);
    assert.ok(rider.y >= ground.height(rider.x, -Infinity) - 1e-9, `below solid ground at step ${i}`);
  }
  assert.ok(rider.x > 200000, `rider only reached ${rider.x}`);
});
