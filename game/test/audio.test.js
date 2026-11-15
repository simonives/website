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
