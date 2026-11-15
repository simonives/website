import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contrast, luminance, PHASES, FLAT_PHASE, mixAt } from '../lib/palette.js';

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

test('six phases with four sky bands each, and distinct names', () => {
  assert.equal(PHASES.length, 6);
  for (const p of all) assert.equal(p.skyBands.length, 4);
  assert.equal(new Set(PHASES.map((p) => p.name)).size, 6);
});

test('no two palettes differ by 0.1 relative luminance in any layer (stays under the flash threshold)', () => {
  const layers = (p) => [...p.skyBands, p.ridge, p.hills, p.ground];
  for (const a of PHASES) {
    for (const b of PHASES) {
      const la = layers(a);
      const lb = layers(b);
      for (let i = 0; i < la.length; i++) {
        assert.ok(Math.abs(luminance(la[i]) - luminance(lb[i])) < 0.1, `${a.name} vs ${b.name} layer ${i}`);
      }
    }
  }
});

test('mixAt steps in quarters over 0.24 s, and is instant when reduced', () => {
  assert.equal(mixAt(-1, false), 0);
  assert.equal(mixAt(0, false), 0);
  assert.equal(mixAt(0.06, false), 0.25);
  assert.equal(mixAt(0.12, false), 0.5);
  assert.equal(mixAt(0.18, false), 0.75);
  assert.equal(mixAt(0.24, false), 1);
  assert.equal(mixAt(5, false), 1);
  assert.equal(mixAt(0, true), 1);
  assert.equal(mixAt(-1, true), 1);
});
