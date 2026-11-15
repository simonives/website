import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../game.css', import.meta.url), 'utf8');

test('canvas allows pinch-zoom as well as vertical panning', () => {
  assert.match(css, /touch-action:\s*pan-y pinch-zoom/);
});
