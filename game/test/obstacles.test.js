import { test } from 'node:test';
import assert from 'node:assert/strict';
import { placeObstacles, resolveContact, lightNearest, OBSTACLE_H } from '../lib/obstacles.js';
import { PHRASES } from '../content.js';
import { height } from '../lib/terrain.js';

test('placement is deterministic', () => {
  assert.deepEqual(placeObstacles(PHRASES, 0, 6000), placeObstacles(PHRASES, 0, 6000));
});

test('placement respects spacing and range', () => {
  const obs = placeObstacles(PHRASES, 0, 20000);
  assert.ok(obs.length > 10);
  for (let i = 0; i < obs.length; i++) {
    assert.ok(obs[i].x >= 0 && obs[i].x < 20000);
    if (i > 0) assert.ok(obs[i].x - obs[i - 1].x >= 400, `gap at ${i}`);
  }
});

test('placement of a sub-range matches the same obstacles in the full range', () => {
  const full = placeObstacles(PHRASES, 0, 10000);
  const part = placeObstacles(PHRASES, 4000, 8000);
  assert.deepEqual(part, full.filter((o) => o.x >= 4000 && o.x < 8000));
});

test('every obstacle label comes from the phrase list and starts unlit', () => {
  const labels = new Set(PHRASES.map((p) => p.label));
  for (const o of placeObstacles(PHRASES, 0, 20000)) {
    assert.ok(labels.has(o.label));
    assert.equal(o.lit, false);
    assert.ok(o.width > 0);
  }
});

const ob = { id: 'x', label: 'Test', sentence: 'S', x: 1000, width: 200, lit: false };
const mid = 1100;
const g = height(mid);

test('contact outside the span is none', () => {
  assert.equal(resolveContact({ x: 900, y: height(900), vy: 0, grounded: true }, ob), 'none');
  assert.equal(resolveContact({ x: 1300, y: height(1300), vy: 0, grounded: true }, ob), 'none');
});

test('a grounded rider meeting a phrase bumps', () => {
  assert.equal(resolveContact({ x: mid, y: g, vy: 0, grounded: true }, ob), 'bump');
});

test('an airborne rider above the phrase goes over', () => {
  assert.equal(resolveContact({ x: mid, y: g + OBSTACLE_H + 20, vy: 50, grounded: false }, ob), 'over');
});

test('a falling rider at ledge height grinds', () => {
  assert.equal(resolveContact({ x: mid, y: g + OBSTACLE_H - 2, vy: -200, grounded: false }, ob), 'grind');
});

test('a low airborne rider bumps', () => {
  assert.equal(resolveContact({ x: mid, y: g + 1, vy: 100, grounded: false }, ob), 'bump');
});

test('resolveContact only returns the four values', () => {
  const allowed = new Set(['none', 'over', 'grind', 'bump']);
  for (let x = 900; x < 1400; x += 13) {
    for (let dy = 0; dy < 60; dy += 3) {
      for (const vy of [-300, 0, 300]) {
        assert.ok(allowed.has(resolveContact({ x, y: height(x) + dy, vy, grounded: dy === 0 }, ob)));
      }
    }
  }
});

test('lightNearest lights the nearest unlit obstacle within 600 ahead, once each', () => {
  const list = [
    { id: 'a', label: 'A', sentence: '', x: 300, width: 100, lit: false },
    { id: 'b', label: 'B', sentence: '', x: 550, width: 100, lit: false },
    { id: 'c', label: 'C', sentence: '', x: 5000, width: 100, lit: false },
  ];
  assert.equal(lightNearest(list, 0).id, 'a');
  assert.equal(list[0].lit, true);
  assert.equal(lightNearest(list, 0).id, 'b');
  assert.equal(lightNearest(list, 0), null);
  assert.equal(list[2].lit, false);
});
