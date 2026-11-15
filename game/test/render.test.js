import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRenderer } from '../lib/render.js';
import { createRider } from '../lib/physics.js';
import { createTrickState } from '../lib/tricks.js';
import { PHASES, FLAT_PHASE } from '../lib/palette.js';
import { placeObstacles } from '../lib/obstacles.js';
import { PHRASES } from '../content.js';

function stubCanvas(w, h) {
  const calls = [];
  const ctx = new Proxy({}, {
    get(t, k) {
      if (k === 'calls') return calls;
      if (k === 'measureText') return (s) => ({ width: String(s).length * 8 });
      if (k in t) return t[k];
      return (...args) => { calls.push([k, ...args]); };
    },
    set(t, k, v) { t[k] = v; return true; },
  });
  return { clientWidth: w, clientHeight: h, width: 0, height: 0, getContext: () => ctx, ctx };
}

function frame(extra = {}) {
  return {
    rider: createRider(),
    trick: createTrickState(),
    obstacles: placeObstacles(PHRASES, 0, 6000),
    cameraY: 0,
    phase: { from: PHASES[0], to: PHASES[1], mix: 0 },
    cameraX: 0,
    caption: null,
    paused: false,
    ...extra,
  };
}

test('draws a normal frame', () => {
  const c = stubCanvas(800, 400);
  const r = createRenderer(c, { reducedMotion: false });
  r.resize();
  r.draw(frame());
  assert.ok(c.ctx.calls.length > 20);
});

test('draws a caption, a paused overlay and tricks', () => {
  const c = stubCanvas(375, 600);
  const r = createRenderer(c, { reducedMotion: false });
  r.resize();
  r.draw(frame({ caption: 'Phronesis without accountability is power calling itself wisdom.', paused: true }));
  for (const active of ['kickflip', 'shoveit']) {
    r.draw(frame({ trick: { active, progress: 0.4, streak: 2 }, phase: { from: PHASES[2], to: PHASES[5], mix: 0.5 } }));
  }
  const texts = c.ctx.calls.filter((x) => x[0] === 'fillText').map((x) => x[1]).join('');
  assert.ok(texts.includes('Press Space to ride'));
});

test('draws every trick pose and a raised camera', () => {
  const c = stubCanvas(800, 400);
  const r = createRenderer(c, { reducedMotion: false });
  r.resize();
  const base = createTrickState();
  const poses = [
    { ...base, active: 'grab', progress: 0.5 },
    { ...base, active: 'kickflip', progress: 0.4 },
    { ...base, active: 'shoveit', progress: 0.3 },
    { ...base, pending: 0.1 },
  ];
  for (const trick of poses) r.draw(frame({ trick, cameraY: 60 }));
  assert.ok(c.ctx.calls.length > 40);
});

test('an obstacle is a clipped block of small repeating text, not big letters', () => {
  const c = stubCanvas(1600, 500);
  const r = createRenderer(c, { reducedMotion: false });
  r.resize();
  const ledge = { kind: 'ledge', id: 'x', label: 'Practical wisdom', sentence: '', x: 400, width: 224, height: 30, steps: 0, lit: false };
  r.draw(frame({ obstacles: [ledge], cameraX: 400 }));
  const calls = c.ctx.calls;
  assert.ok(calls.some((x) => x[0] === 'clip'), 'texture is clipped to the obstacle shape');
  const rows = calls.filter((x) => x[0] === 'fillText' && x[1].includes('Practical wisdom'));
  assert.ok(rows.length >= 3, 'several rows of the label fill the body');
  assert.ok(rows.some((x) => x[1].split('Practical wisdom').length > 3), 'a row repeats the label to fill the width');
});

test('the board is ten letters set along a kicked deck, each turned to the curve', () => {
  const c = stubCanvas(800, 400);
  const r = createRenderer(c, { reducedMotion: false });
  r.resize();
  r.draw(frame({ obstacles: [] }));
  const calls = c.ctx.calls;
  const letters = calls.filter((x) => x[0] === 'fillText' && x[1].length === 1 && 'SIMONVE '.includes(x[1])).map((x) => x[1]).join('');
  assert.ok(letters.includes('SIMON IVES'));
  const turns = calls.filter((x) => x[0] === 'rotate').map((x) => Math.round(x[1] * 100));
  assert.ok(new Set(turns).size >= 3, 'letters at the kicks tilt differently from the flat middle');
});

test('a shove-it mirrors the board at 180 degrees and restores it at 360', () => {
  const sx = (progress) => {
    const c = stubCanvas(800, 400);
    const r = createRenderer(c, { reducedMotion: false });
    r.resize();
    r.draw(frame({ obstacles: [], trick: { ...createTrickState(), active: 'shoveit', progress } }));
    return c.ctx.calls.filter((x) => x[0] === 'scale').map((x) => x[1]);
  };
  assert.ok(sx(0.5).some((v) => v < -0.9), 'half way round the text runs backwards');
  assert.ok(!sx(0.01).some((v) => v < 0), 'start is unmirrored');
});

test('draws in reduced-motion mode', () => {
  const c = stubCanvas(800, 400);
  const r = createRenderer(c, { reducedMotion: true });
  r.resize();
  r.draw(frame());
  assert.ok(c.ctx.calls.length > 10);
});

test('a 0 by 0 canvas does not throw and draws nothing', () => {
  const c = stubCanvas(0, 0);
  const r = createRenderer(c, { reducedMotion: false });
  r.resize();
  r.draw(frame());
  assert.equal(c.ctx.calls.length, 0);
});
