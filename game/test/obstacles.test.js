import { test } from 'node:test';
import assert from 'node:assert/strict';
import { placeObstacles, lightNearest, CHAR_W } from '../lib/obstacles.js';
import { speedAt, timeAtDistance } from '../lib/difficulty.js';
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
    const xEnd = obs[i - 1].x + obs[i - 1].width;
    const clear = obs[i].x - xEnd;
    if (obs[i - 1].kind === 'ramp' && obs[i].kind === 'gap') {
      assert.ok(clear >= 120, `combo gap before ${i}: ${clear} < 120`);
    } else {
      assert.ok(clear >= 352, `gap before ${i}: ${clear} < 352`);
      const speedMin = 0.8 * speedAt(timeAtDistance(xEnd), false) - 40;
      assert.ok(clear >= speedMin - 1e-9, `gap before ${i}: ${clear} < ${speedMin}`);
    }
  }
});

test('at the speed in force at each obstacle, clear ground lasts at least 0.55 s at 640 and at least 0.3 s at the ceiling', () => {
  const obs = placeObstacles(PHRASES, 0, far * 8);
  let earlyChecked = 0;
  let ceilingChecked = 0;
  for (let i = 1; i < obs.length; i++) {
    if (obs[i - 1].kind === 'ramp' && obs[i].kind === 'gap') continue;
    const xEnd = obs[i - 1].x + obs[i - 1].width;
    const clear = obs[i].x - xEnd;
    const v = speedAt(timeAtDistance(xEnd), false);
    const seconds = clear / v;
    assert.ok(seconds >= 0.3, `clear time before ${i}: ${seconds} s < 0.3 s at v=${v}`);
    if (obs[i - 1].x < 4000) {
      assert.ok(seconds >= 0.55, `early clear time before ${i}: ${seconds} s < 0.55 s at v=${v}`);
      earlyChecked++;
    }
    if (v >= 1170) ceilingChecked++;
  }
  assert.ok(earlyChecked > 0, 'expected pairs in the first 4000 units');
  assert.ok(ceilingChecked > 0, 'expected pairs near the ceiling speed');
});

test('heights, widths and steps stay in the ranges above for every kind', () => {
  const obs = placeObstacles(PHRASES, 0, far * 2);
  assert.ok(obs.length >= 60);
  for (const o of obs) {
    const labelW = o.label.length * CHAR_W;
    if (o.kind === 'ramp') {
      assert.ok(o.height >= 20 && o.height <= 70, `ramp height ${o.height}`);
      assert.equal(o.width, Math.min(480, Math.max(labelW, 2 * o.height)));
      assert.ok(o.height / o.width <= 0.5 + 1e-9, `ramp slope ${o.height / o.width}`);
      assert.equal(o.steps, 0);
    } else if (o.kind === 'ledge') {
      assert.ok(o.height >= 14 && o.height <= 36, `ledge height ${o.height}`);
      assert.equal(o.width, labelW);
      assert.equal(o.steps, 0);
    } else if (o.kind === 'stairs') {
      assert.ok(o.height >= 30 && o.height <= 60, `stairs height ${o.height}`);
      assert.equal(o.width, labelW);
      assert.ok(o.steps >= 3 && o.steps <= 5, `stairs steps ${o.steps}`);
    } else if (o.kind === 'drop') {
      assert.ok(o.height >= 40 && o.height <= 70, `drop height ${o.height}`);
      assert.ok(o.width >= 180 && o.width <= 420, `drop width ${o.width}`);
      assert.equal(o.steps, 0);
    } else if (o.kind === 'rail') {
      assert.ok(o.height >= 18 && o.height <= 34, `rail height ${o.height}`);
      assert.ok(o.width >= 140 && o.width <= 320, `rail width ${o.width}`);
      assert.equal(o.steps, 0);
    } else if (o.kind === 'gap') {
      assert.ok(o.height >= 24 && o.height <= 40, `gap depth ${o.height}`);
      assert.ok(o.width >= 160 && o.width <= 320, `gap width ${o.width}`);
      assert.equal(o.steps, 0);
    } else {
      assert.fail(`unexpected kind ${o.kind}`);
    }
  }
  // Short labels still enforce ramp width >= 2 * height so slope stays <= 0.5.
  const shortPhrases = [{ id: 's', label: 'Go', sentence: 'Go.' }];
  for (const o of placeObstacles(shortPhrases, 0, far)) {
    if (o.kind === 'ramp') {
      assert.ok(o.width >= 2 * o.height && o.width <= 480);
      assert.ok(o.height / o.width <= 0.5 + 1e-9);
    }
  }
});

test('every kind appears in the first 60 obstacles', () => {
  const obs = placeObstacles(PHRASES, 0, far * 2);
  assert.ok(obs.length >= 60);
  const kinds = new Set(obs.slice(0, 60).map((o) => o.kind));
  assert.deepEqual([...kinds].sort(), ['drop', 'gap', 'ledge', 'rail', 'ramp', 'stairs']);
});

test('no gap or drop in the first 3 obstacles', () => {
  const first3 = placeObstacles(PHRASES, 0, far).slice(0, 3);
  assert.equal(first3.length, 3);
  for (const o of first3) {
    assert.ok(['ramp', 'ledge', 'stairs'].includes(o.kind), `early kind ${o.kind}`);
  }
});

test('combos: only a gap may follow a ramp closer than 220, and then clear ground is at least 120', () => {
  const obs = placeObstacles(PHRASES, 0, far * 2);
  let sawCombo = false;
  for (let i = 1; i < obs.length; i++) {
    const clear = obs[i].x - (obs[i - 1].x + obs[i - 1].width);
    if (clear < 220) {
      assert.equal(obs[i - 1].kind, 'ramp', `only ramp may precede close gap at ${i}`);
      assert.equal(obs[i].kind, 'gap', `only gap may follow ramp closer than 220 at ${i}`);
      assert.ok(clear >= 120, `combo clear ground ${clear} < 120 at ${i}`);
      sawCombo = true;
    }
  }
  assert.ok(sawCombo, 'expected at least one ramp->gap combo');
});

test('labels come from the phrase list, label-based widths match CHAR_W, start unlit', () => {
  const byLabel = new Map(PHRASES.map((p) => [p.label, p]));
  for (const o of placeObstacles(PHRASES, 0, far)) {
    assert.ok(byLabel.has(o.label));
    assert.equal(o.sentence, byLabel.get(o.label).sentence);
    if (o.kind === 'ledge' || o.kind === 'stairs') {
      assert.equal(o.width, o.label.length * CHAR_W);
    }
    assert.equal(o.lit, false);
  }
});

test('spacing scales with speed: later obstacles have more clear ground between them', () => {
  const obs = placeObstacles(PHRASES, 0, far * 4);
  const gap = (i) => obs[i].x - (obs[i - 1].x + obs[i - 1].width);
  const avg = (a, b) => { let s = 0; for (let i = a; i < b; i++) s += gap(i); return s / (b - a); };
  assert.ok(avg(30, 40) > avg(1, 10) + 100, `${avg(30, 40)} vs ${avg(1, 10)}`);
});

test('flat mode keeps gaps near 520 and heights at their starting values', () => {
  const obs = placeObstacles(PHRASES, 0, far, { flat: true });
  for (let i = 1; i < obs.length; i++) {
    const g = obs[i].x - (obs[i - 1].x + obs[i - 1].width);
    assert.ok(g >= 480 && g <= 560, `gap ${g}`);
  }
  for (const o of obs) {
    assert.ok(['ramp', 'ledge', 'stairs'].includes(o.kind), `flat mode kind ${o.kind}`);
    if (o.kind === 'ledge') assert.equal(o.height, 14);
    if (o.kind === 'stairs') assert.equal(o.height, 30);
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
