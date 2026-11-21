import { test } from 'node:test';
import assert from 'node:assert/strict';
import { keyAction } from '../lib/gestures.js';

test('key map', () => {
  assert.equal(keyAction('Space'), 'control');
  assert.equal(keyAction('ArrowUp'), 'control');
  assert.equal(keyAction('ArrowLeft'), 'kickflip');
  assert.equal(keyAction('KeyZ'), 'kickflip');
  assert.equal(keyAction('ArrowRight'), 'shoveit');
  assert.equal(keyAction('KeyX'), 'shoveit');
  assert.equal(keyAction('ArrowDown'), 'grab');
  assert.equal(keyAction('KeyC'), 'grab');
  assert.equal(keyAction('KeyV'), 'grind');
  assert.equal(keyAction('KeyP'), 'pause');
  assert.equal(keyAction('KeyM'), 'mute');
  assert.equal(keyAction('KeyQ'), null);
});
