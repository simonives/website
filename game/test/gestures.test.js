import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifySwipe, keyAction } from '../lib/gestures.js';

test('tap', () => assert.equal(classifySwipe(3, 2, 120), 'tap'));
test('left swipe', () => assert.equal(classifySwipe(-80, 10, 150), 'left'));
test('right swipe', () => assert.equal(classifySwipe(90, -12, 150), 'right'));
test('vertical drag is scroll', () => assert.equal(classifySwipe(10, 120, 200), 'scroll'));
test('diagonal drag is scroll', () => assert.equal(classifySwipe(60, 55, 200), 'scroll'));
test('slow short drag is scroll', () => assert.equal(classifySwipe(5, 5, 900), 'scroll'));

test('key map', () => {
  assert.equal(keyAction('Space'), 'ollie');
  assert.equal(keyAction('ArrowUp'), 'ollie');
  assert.equal(keyAction('ArrowLeft'), 'kickflip');
  assert.equal(keyAction('KeyZ'), 'kickflip');
  assert.equal(keyAction('ArrowRight'), 'shoveit');
  assert.equal(keyAction('KeyX'), 'shoveit');
  assert.equal(keyAction('KeyP'), 'pause');
  assert.equal(keyAction('KeyM'), 'mute');
  assert.equal(keyAction('KeyQ'), null);
});
