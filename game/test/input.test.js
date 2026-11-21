import { test } from 'node:test';
import assert from 'node:assert/strict';
import { attachInput } from '../lib/input.js';

function fakeCanvas() {
  const c = new EventTarget();
  c.focus = () => {};
  c.setPointerCapture = () => {};
  return c;
}
function ev(type, props) {
  const e = new Event(type, { cancelable: true });
  Object.assign(e, { isPrimary: true, pointerId: 1, pointerType: 'touch', repeat: false }, props);
  return e;
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function setup() {
  const calls = [];
  const c = fakeCanvas();
  attachInput(c, {
    control: (d) => calls.push(['control', d]),
    trick: (k) => calls.push(['trick', k]),
    trickEnd: (k) => calls.push(['trickEnd', k]),
    pause: () => calls.push(['pause']),
    mute: () => calls.push(['mute']),
  });
  const of = (name) => calls.filter((x) => x[0] === name);
  return { c, calls, of };
}

test('a touch that is cancelled by a scroll never calls control', async () => {
  const { c, of } = setup();
  c.dispatchEvent(ev('pointerdown'));
  c.dispatchEvent(ev('pointercancel'));
  await wait(200);
  assert.deepEqual(of('control'), []);
});

test('a touch held past 100 ms presses, and releases on pointerup', async () => {
  const { c, of } = setup();
  c.dispatchEvent(ev('pointerdown'));
  await wait(180);
  assert.deepEqual(of('control'), [['control', true]]);
  c.dispatchEvent(ev('pointerup'));
  assert.deepEqual(of('control').at(-1), ['control', false]);
});

test('a quick touch tap presses and releases once, on pointerup', () => {
  const { c, of } = setup();
  c.dispatchEvent(ev('pointerdown'));
  assert.deepEqual(of('control'), []);
  c.dispatchEvent(ev('pointerup'));
  assert.deepEqual(of('control'), [['control', true], ['control', false]]);
});

test('a mouse press is immediate and releases on pointerup', () => {
  const { c, of } = setup();
  c.dispatchEvent(ev('pointerdown', { pointerType: 'mouse' }));
  assert.deepEqual(of('control'), [['control', true]]);
  c.dispatchEvent(ev('pointerup', { pointerType: 'mouse' }));
  assert.deepEqual(of('control'), [['control', true], ['control', false]]);
});

test('Space down, repeat and up give one press and one release', () => {
  const { c, of } = setup();
  c.dispatchEvent(ev('keydown', { code: 'Space' }));
  c.dispatchEvent(ev('keydown', { code: 'Space', repeat: true }));
  c.dispatchEvent(ev('keyup', { code: 'Space' }));
  assert.deepEqual(of('control'), [['control', true], ['control', false]]);
});

test('Space and ArrowUp together release only after both are up', () => {
  const { c, of } = setup();
  c.dispatchEvent(ev('keydown', { code: 'Space' }));
  c.dispatchEvent(ev('keydown', { code: 'ArrowUp' }));
  c.dispatchEvent(ev('keyup', { code: 'Space' }));
  assert.deepEqual(of('control'), [['control', true]]);
  c.dispatchEvent(ev('keyup', { code: 'ArrowUp' }));
  assert.deepEqual(of('control'), [['control', true], ['control', false]]);
});

test('KeyC starts and ends a grab, KeyZ and KeyX trick, P pauses, M mutes', () => {
  const { c, calls } = setup();
  c.dispatchEvent(ev('keydown', { code: 'KeyC' }));
  c.dispatchEvent(ev('keyup', { code: 'KeyC' }));
  c.dispatchEvent(ev('keydown', { code: 'KeyZ' }));
  c.dispatchEvent(ev('keydown', { code: 'KeyX' }));
  c.dispatchEvent(ev('keydown', { code: 'KeyP' }));
  c.dispatchEvent(ev('keydown', { code: 'KeyM' }));
  assert.deepEqual(calls, [['trick', 'grab'], ['trickEnd', 'grab'], ['trick', 'kickflip'], ['trick', 'shoveit'], ['pause'], ['mute']]);
});

test('mapped keys are default-prevented, unmapped keys and modified keys are left alone', () => {
  const { c } = setup();
  const space = ev('keydown', { code: 'Space' });
  c.dispatchEvent(space);
  assert.equal(space.defaultPrevented, true);
  const q = ev('keydown', { code: 'KeyQ' });
  c.dispatchEvent(q);
  assert.equal(q.defaultPrevented, false);
  const cmd = ev('keydown', { code: 'KeyP', metaKey: true });
  c.dispatchEvent(cmd);
  assert.equal(cmd.defaultPrevented, false);
});

test('blur releases a held control', () => {
  const { c, of } = setup();
  c.dispatchEvent(ev('keydown', { code: 'Space' }));
  c.dispatchEvent(ev('blur'));
  assert.deepEqual(of('control'), [['control', true], ['control', false]]);
});

test('KeyV maps to grind and calls handlers.trick with grind', () => {
  const { c, calls } = setup();
  const down = ev('keydown', { code: 'KeyV' });
  c.dispatchEvent(down);
  assert.equal(down.defaultPrevented, true);
  c.dispatchEvent(ev('keydown', { code: 'KeyV', repeat: true }));
  c.dispatchEvent(ev('keyup', { code: 'KeyV' }));
  assert.deepEqual(calls, [['trick', 'grind']]);
});
