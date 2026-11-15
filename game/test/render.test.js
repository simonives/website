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

test('obstacles are drawn as letters, with a column of bars at risers', () => {
  const c = stubCanvas(1600, 500);
  const r = createRenderer(c, { reducedMotion: false });
  r.resize();
  const ramp = { kind: 'ramp', id: 'x', label: 'Practical wisdom', sentence: '', x: 400, width: 224, height: 56, steps: 0, lit: false };
  r.draw(frame({ obstacles: [ramp], cameraX: 400 }));
  const texts = c.ctx.calls.filter((x) => x[0] === 'fillText').map((x) => x[1]);
  assert.equal(texts.filter((t) => t === '|').length, 6, 'one bar every 9 units up a 56 unit lip');
  assert.ok(texts.includes('P'));
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
