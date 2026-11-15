import { test } from 'node:test';
import assert from 'node:assert/strict';
import { placeObstacles, lightNearest, CHAR_W } from '../lib/obstacles.js';
import { PHRASES } from '../content.js';

const far = 60000;

test('placement is deterministic', () => {
  assert.deepEqual(placeObstacles(PHRASES, 0, 8000), placeObstacles(PHRASES, 0, 8000));
});

test('a sub-range equals the same obstacles in the full range', () => {
  const full = placeObstacles(PHRASES, 0, 12000);
  assert.deepEqual(placeObstacles(PHRASES, 4000, 9000), full.filter((o) => o.x >= 4000 && o.x < 9000));
});

test('obstacles are sorted, keep clear ground between them, and start at 800', () => {
  const obs = placeObstacles(PHRASES, 0, far);
  assert.ok(obs.length > 40);
  assert.equal(obs[0].x, 800);
  for (let i = 1; i < obs.length; i++) {
    assert.ok(obs[i].x - (obs[i - 1].x + obs[i - 1].width) >= 220, `gap before ${i}`);
  }
});

test('heights stay in range for each kind, stairs have 3 to 5 steps', () => {
  for (const o of placeObstacles(PHRASES, 0, far)) {
    if (o.kind === 'ramp') assert.ok(o.height > 0 && o.height <= 60);
    if (o.kind === 'ledge') assert.ok(o.height >= 14 && o.height <= 30);
    if (o.kind === 'stairs') {
      assert.ok(o.height >= 24 && o.height <= 40);
      assert.ok(o.steps >= 3 && o.steps <= 5);
    } else assert.equal(o.steps, 0);
  }
});

test('all three kinds appear in the first 40', () => {
  const kinds = new Set(placeObstacles(PHRASES, 0, far).slice(0, 40).map((o) => o.kind));
  assert.deepEqual([...kinds].sort(), ['ledge', 'ramp', 'stairs']);
});

test('labels come from the phrase list, width is label length times CHAR_W, start unlit', () => {
  const byLabel = new Map(PHRASES.map((p) => [p.label, p]));
  for (const o of placeObstacles(PHRASES, 0, far)) {
    assert.ok(byLabel.has(o.label));
    assert.equal(o.sentence, byLabel.get(o.label).sentence);
    assert.equal(o.width, o.label.length * CHAR_W);
    assert.equal(o.lit, false);
  }
});

test('difficulty rises: later obstacles have less clear ground between them', () => {
  const obs = placeObstacles(PHRASES, 0, far * 4);
  const gap = (i) => obs[i].x - (obs[i - 1].x + obs[i - 1].width);
  const avg = (a, b) => { let s = 0; for (let i = a; i < b; i++) s += gap(i); return s / (b - a); };
  assert.ok(avg(30, 40) < avg(1, 10) - 100, `${avg(30, 40)} vs ${avg(1, 10)}`);
});

test('flat mode keeps gaps near 520 and heights at their starting values', () => {
  const obs = placeObstacles(PHRASES, 0, far, { flat: true });
  for (let i = 1; i < obs.length; i++) {
    const g = obs[i].x - (obs[i - 1].x + obs[i - 1].width);
    assert.ok(g >= 480 && g <= 560, `gap ${g}`);
  }
  for (const o of obs) {
    if (o.kind === 'ledge') assert.equal(o.height, 14);
    if (o.kind === 'stairs') assert.equal(o.height, 24);
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
