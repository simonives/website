import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAudio } from '../lib/audio.js';

test('without AudioContext enable resolves false and nothing throws', async () => {
  delete globalThis.AudioContext;
  delete globalThis.webkitAudioContext;
  const a = createAudio();
  assert.equal(await a.enable(), false);
  assert.equal(a.isOn(), false);
  a.pop(); a.land(); a.chime(); a.setSpeed(1); a.disable();
});

test('a context that fails to start degrades to silence', async () => {
  globalThis.AudioContext = class { constructor() { throw new Error('blocked'); } };
  const a = createAudio();
  assert.equal(await a.enable(), false);
  a.pop(); a.land(); a.chime(); a.setSpeed(2);
  delete globalThis.AudioContext;
});

test('sound is off until enabled', () => {
  assert.equal(createAudio().isOn(), false);
});

function fakeContext(log, { deferResume = false } = {}) {
  let release;
  return class {
    constructor() {
      log.push('new');
      this.sampleRate = 8000;
      this.currentTime = 0;
      this.destination = {};
      this.closed = false;
    }
    resume() {
      log.push('resume');
      return deferResume ? new Promise((r) => { release = r; Promise.resolve().then(() => { globalThis.__release = r; }); }) : Promise.resolve();
    }
    suspend() { log.push('suspend'); return Promise.resolve(); }
    close() { this.closed = true; log.push('close'); return Promise.resolve(); }
    createGain() { return { gain: { value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect(n) { return n; } }; }
    createBuffer(c, n) { return { getChannelData: () => new Float32Array(n) }; }
    createBufferSource() { return { connect(n) { return n; }, start() {}, loop: false }; }
    createBiquadFilter() { return { frequency: { value: 0 }, connect(n) { return n; } }; }
    createOscillator() { return { frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect(n) { return n; }, start() {}, stop() {} }; }
  };
}

test('two enable calls in flight build one context', async () => {
  const log = [];
  globalThis.AudioContext = fakeContext(log, { deferResume: true });
  const a = createAudio();
  const p1 = a.enable();
  const p2 = a.enable();
  await Promise.resolve();
  globalThis.__release();
  assert.equal(await p1, true);
  assert.equal(await p2, true);
  assert.equal(log.filter((x) => x === 'new').length, 1);
  delete globalThis.AudioContext;
});

test('disable during enable leaves no live context and reports off', async () => {
  const log = [];
  globalThis.AudioContext = fakeContext(log, { deferResume: true });
  const a = createAudio();
  const p = a.enable();
  await Promise.resolve();
  a.disable();
  globalThis.__release();
  assert.equal(await p, false);
  assert.equal(a.isOn(), false);
  assert.ok(log.includes('close'));
  delete globalThis.AudioContext;
});

test('suspend and resume pass through to the context while on', async () => {
  const log = [];
  globalThis.AudioContext = fakeContext(log);
  const a = createAudio();
  await a.enable();
  a.suspend();
  a.resume();
  assert.ok(log.includes('suspend'));
  assert.equal(log.filter((x) => x === 'resume').length, 2);
  delete globalThis.AudioContext;
});

test('suspend and resume are safe when sound was never enabled', () => {
  const a = createAudio();
  a.suspend();
  a.resume();
});
