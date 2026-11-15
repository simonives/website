import { test } from 'node:test';
import assert from 'node:assert/strict';
import { autoInput } from '../lib/auto.js';

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
  const r = autoInput({ rider: { x: 0, grounded: false, vy: 80 }, obstacles: [ob('ledge', 120)], speed: 220 });
  assert.equal(r.ollieDown, false);
  assert.ok(r.trick === 'kickflip' || r.trick === 'shoveit');
});
