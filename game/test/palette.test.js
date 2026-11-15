import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contrast, PHASES, FLAT_PHASE, phaseAt } from '../lib/palette.js';

test('contrast of black on white is 21', () => {
  assert.ok(Math.abs(contrast('#000000', '#ffffff') - 21) < 1e-9);
});

test('contrast of #777777 on white is about 4.48', () => {
  assert.ok(Math.abs(contrast('#777777', '#ffffff') - 4.48) < 0.01);
});

const all = [...PHASES, FLAT_PHASE];
// Every background any foreground can sit on, across every phase (phases mix mid-transition).
const backgrounds = all.flatMap((p) => [...p.skyBands, p.ridge, p.hills, p.ground]);

test('text and lit text meet 4.5:1 on every background of every phase', () => {
  for (const p of all) {
    for (const bg of backgrounds) {
      assert.ok(contrast(p.text, bg) >= 4.5, `${p.name} text on ${bg}`);
      assert.ok(contrast(p.textLit, bg) >= 4.5, `${p.name} textLit on ${bg}`);
    }
  }
});

test('board and rider meet 3:1 on every background of every phase', () => {
  for (const p of all) {
    for (const bg of backgrounds) {
      assert.ok(contrast(p.board, bg) >= 3, `${p.name} board on ${bg}`);
      assert.ok(contrast(p.rider, bg) >= 3, `${p.name} rider on ${bg}`);
    }
  }
});

test('phases have 4 sky bands and 4 phases exist', () => {
  assert.equal(PHASES.length, 4);
  for (const p of all) assert.equal(p.skyBands.length, 4);
});

test('cycle returns to the start after 180 s', () => {
  assert.equal(phaseAt(0).from, phaseAt(180).from);
  assert.equal(phaseAt(0).mix, phaseAt(180).mix);
});

test('mix is stepped in quarters', () => {
  for (let t = 0; t < 360; t += 0.25) {
    const m = phaseAt(t).mix;
    assert.ok([0, 0.25, 0.5, 0.75, 1].includes(m), `mix ${m} at ${t}`);
  }
});

test('phases advance in order and wrap', () => {
  assert.equal(phaseAt(0).from, PHASES[0]);
  assert.equal(phaseAt(0).to, PHASES[1]);
  assert.equal(phaseAt(50).from, PHASES[1]);
  assert.equal(phaseAt(175).to, PHASES[0]);
});
