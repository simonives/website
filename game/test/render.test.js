import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRenderer } from '../lib/render.js';
import { createRider } from '../lib/physics.js';
import { createTrickState } from '../lib/tricks.js';
import { PHASES, FLAT_PHASE } from '../lib/palette.js';
import { placeObstacles } from '../lib/obstacles.js';
import { height as terrainHeight } from '../lib/terrain.js';
import { groundLine } from '../lib/layout.js';
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

test('obstacle text scrolls with the world when the obstacle is cut off at the left edge', () => {
  const ledge = { kind: 'ledge', id: 'x', label: 'Practical wisdom', sentence: '', x: 400, width: 600, height: 30, steps: 0, lit: false };
  const w = 800;
  const sc = 400 / 320;
  const cwW = 8 / sc;
  for (const cameraX of [900, 901.3, 905.7, 913]) {
    const c = stubCanvas(w, 400);
    const r = createRenderer(c, { reducedMotion: false });
    r.resize();
    r.draw(frame({ obstacles: [ledge], cameraX }));
    const row = c.ctx.calls.find((x) => x[0] === 'fillText' && x[1].includes('Practical wisdom'));
    const world = (row[2] - w * 0.3) / sc + cameraX;
    const cells = (world - ledge.x) / cwW;
    assert.ok(Math.abs(cells - Math.round(cells)) < 1e-6, `row starts on the world character grid at camera ${cameraX}`);
  }
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

test('draws all six obstacle kinds without throwing', () => {
  const c = stubCanvas(1200, 400);
  const r = createRenderer(c, { reducedMotion: false });
  r.resize();
  const obs = [
    { kind: 'ramp', id: 'a', label: 'Ramp one', sentence: '', x: 100, width: 160, height: 40, steps: 0, lit: false },
    { kind: 'ledge', id: 'b', label: 'Ledge two', sentence: '', x: 350, width: 140, height: 24, steps: 0, lit: false },
    { kind: 'stairs', id: 'c', label: 'Stairs three', sentence: '', x: 600, width: 200, height: 40, steps: 4, lit: false },
    { kind: 'drop', id: 'd', label: 'Drop four', sentence: '', x: 900, width: 220, height: 55, steps: 0, lit: false },
    { kind: 'rail', id: 'e', label: 'Rail five', sentence: '', x: 1200, width: 180, height: 26, steps: 0, lit: false },
    { kind: 'gap', id: 'f', label: 'Gap six', sentence: '', x: 1500, width: 200, height: 32, steps: 0, lit: false },
  ];
  for (const cameraX of [150, 700, 1300, 1600]) {
    r.draw(frame({ obstacles: obs, cameraX }));
  }
  assert.ok(c.ctx.calls.length > 50);
});

test('a rail is drawn as a stroked bar with posts and no clipped text block', () => {
  const drawStrokes = (obstacles) => {
    const c = stubCanvas(800, 400);
    const r = createRenderer(c, { reducedMotion: false });
    r.resize();
    r.draw(frame({ obstacles, cameraX: 300 }));
    return c.ctx.calls;
  };
  const baseCalls = drawStrokes([]);
  const baseStrokes = baseCalls.filter((x) => x[0] === 'stroke').length;

  const narrowRail = { kind: 'rail', id: 'r1', label: 'Sharp rail', sentence: '', x: 200, width: 180, height: 26, steps: 0, lit: false };
  const narrowCalls = drawStrokes([narrowRail]);
  assert.equal(narrowCalls.filter((x) => x[0] === 'clip').length, 0, 'rail does not use a clipped text block');
  const narrowStrokes = narrowCalls.filter((x) => x[0] === 'stroke').length;
  assert.equal(narrowStrokes, baseStrokes + 3, 'narrow rail adds bar stroke plus two end posts');
  const railText = narrowCalls.filter((x) => x[0] === 'fillText').map((x) => x[1]).join('');
  assert.ok(railText.includes('Sharp'), 'rail draws its label letters along the bar');

  const wideRail = { kind: 'rail', id: 'r2', label: 'Wide bar rail', sentence: '', x: 200, width: 260, height: 26, steps: 0, lit: true };
  const wideCalls = drawStrokes([wideRail]);
  assert.equal(wideCalls.filter((x) => x[0] === 'clip').length, 0, 'wide rail does not use clip');
  const wideStrokes = wideCalls.filter((x) => x[0] === 'stroke').length;
  assert.equal(wideStrokes, baseStrokes + 4, 'wide rail (> 200) adds a middle post');
});

test('a gap draws two face lines and no text fill inside the pit', () => {
  const drawCalls = (obstacles) => {
    const c = stubCanvas(800, 400);
    const r = createRenderer(c, { reducedMotion: false });
    r.resize();
    r.draw(frame({ obstacles, cameraX: 300 }));
    return c.ctx.calls;
  };
  const baseCalls = drawCalls([]);
  const baseStrokes = baseCalls.filter((x) => x[0] === 'stroke').length;
  const baseTexts = baseCalls.filter((x) => x[0] === 'fillText');

  const gap = { kind: 'gap', id: 'g1', label: 'Mind the pit', sentence: '', x: 220, width: 180, height: 32, steps: 0, lit: false };
  const gapCalls = drawCalls([gap]);
  assert.equal(gapCalls.filter((x) => x[0] === 'clip').length, 0, 'gap does not use clip');
  assert.equal(gapCalls.filter((x) => x[0] === 'fillText').length, baseTexts.length, 'gap draws no text inside the pit');
  assert.equal(gapCalls.filter((x) => x[0] === 'stroke').length, baseStrokes + 2, 'gap draws two vertical pit face lines');
});

test('the ground silhouette ignores rails (height is sampled with fromY -Infinity)', () => {
  const w = 800;
  const h = 400;
  const cameraX = 300;
  const sc = h / 320;
  const baseY = groundLine(h);
  const toY = (wy) => baseY - wy * sc;
  const fromX = (sx) => (sx - w * 0.3) / sc + cameraX;

  const rail = { kind: 'rail', id: 'r1', label: 'Rail span', sentence: '', x: 200, width: 200, height: 30, steps: 0, lit: false };
  const c = stubCanvas(w, h);
  const r = createRenderer(c, { reducedMotion: true });
  r.resize();
  r.draw(frame({ obstacles: [rail], cameraX }));

  // Extract all filled paths; under reducedMotion, path 0 is the hills silhouette (step 8) and path 1 is the ground fill (step 4).
  const filledPaths = [];
  let cur = null;
  for (const call of c.ctx.calls) {
    if (call[0] === 'beginPath') cur = [];
    else if (cur && (call[0] === 'moveTo' || call[0] === 'lineTo')) cur.push(call);
    else if (call[0] === 'fill' && cur) {
      filledPaths.push(cur);
      cur = null;
    }
  }
  const groundFill = filledPaths[1];
  assert.ok(groundFill && groundFill.length > 50, 'captured ground silhouette fill path');
  const overRail = groundFill.filter((pt) => {
    if (pt[0] !== 'lineTo') return false;
    if (pt[2] === h) return false;
    const wx = fromX(pt[1]);
    return wx >= rail.x && wx <= rail.x + rail.width;
  });
  assert.ok(overRail.length >= 10, 'multiple ground fill samples fall within the rail span');
  for (const [, sx, sy] of overRail) {
    const expected = toY(terrainHeight(fromX(sx)));
    assert.ok(Math.abs(sy - expected) < 1e-6, `ground silhouette at sx=${sx} should match terrain+0 (${expected}), got ${sy}`);
  }
});

test('grind sparks are drawn only while grinding', () => {
  const run = (grinding, cameraX = 350) => {
    const c = stubCanvas(800, 400);
    const r = createRenderer(c, { reducedMotion: false });
    r.resize();
    const rider = createRider();
    if (grinding === undefined) delete rider.grinding;
    else rider.grinding = grinding;
    r.draw(frame({ obstacles: [], rider, cameraX }));
    return c.ctx.calls;
  };
  const offCalls = run(false);
  const undefCalls = run(undefined);
  const onCalls = run(true);
  const onCallsRepeat = run(true);

  const countStrokes = (calls) => calls.filter((x) => x[0] === 'stroke').length;
  assert.equal(countStrokes(undefCalls), countStrokes(offCalls), 'undefined grinding draws no sparks');
  assert.equal(countStrokes(onCalls), countStrokes(offCalls) + 6, 'grinding draws 6 spark lines');
  assert.deepEqual(onCalls, onCallsRepeat, 'spark geometry is deterministic for the same cameraX');
});

test('ledge and drop draw a bright coping stroke on their top edge', () => {
  const countStrokes = (obstacles) => {
    const c = stubCanvas(800, 400);
    const r = createRenderer(c, { reducedMotion: false });
    r.resize();
    r.draw(frame({ obstacles, cameraX: 300 }));
    return c.ctx.calls.filter((x) => x[0] === 'stroke').length;
  };
  const base = countStrokes([]);
  const ledge = { kind: 'ledge', id: 'l', label: 'Ledge', sentence: '', x: 200, width: 160, height: 24, steps: 0, lit: false };
  const drop = { kind: 'drop', id: 'd', label: 'Drop', sentence: '', x: 200, width: 200, height: 50, steps: 0, lit: false };
  const ramp = { kind: 'ramp', id: 'p', label: 'Ramp', sentence: '', x: 200, width: 160, height: 40, steps: 0, lit: false };
  assert.equal(countStrokes([ledge]), base + 1, 'ledge adds coping stroke');
  assert.equal(countStrokes([drop]), base + 1, 'drop adds coping stroke');
  assert.equal(countStrokes([ramp]), base, 'ramp does not add coping stroke');
});

test('drawing at heights 1, 280 and 900 with all six kinds never passes NaN to the context', () => {
  const obs = [
    { kind: 'ramp', id: 'a', label: 'Ramp one', sentence: '', x: 100, width: 160, height: 40, steps: 0, lit: false },
    { kind: 'ledge', id: 'b', label: 'Ledge two', sentence: '', x: 350, width: 140, height: 24, steps: 0, lit: true },
    { kind: 'stairs', id: 'c', label: 'Stairs three', sentence: '', x: 600, width: 200, height: 40, steps: 4, lit: false },
    { kind: 'drop', id: 'd', label: 'Drop four', sentence: '', x: 900, width: 220, height: 55, steps: 0, lit: true },
    { kind: 'rail', id: 'e', label: 'Rail five', sentence: '', x: 1200, width: 240, height: 26, steps: 0, lit: true },
    { kind: 'gap', id: 'f', label: 'Gap six', sentence: '', x: 1500, width: 200, height: 32, steps: 0, lit: false },
  ];
  for (const h of [1, 280, 900]) {
    const c = stubCanvas(800, h);
    const r = createRenderer(c, { reducedMotion: false });
    r.resize();
    for (const cameraX of [0, 120, 420, 700, 1020, 1320, 1620, 1720]) {
      const rider = { ...createRider(), x: cameraX, grinding: true };
      r.draw(frame({ obstacles: obs, cameraX, rider }));
    }
    assert.ok(c.ctx.calls.length > 0, `drew calls at height ${h}`);
    for (const call of c.ctx.calls) {
      for (const arg of call.slice(1)) {
        if (typeof arg === 'number') {
          assert.ok(Number.isFinite(arg), `non-finite numeric arg in ${call[0]}(${call.slice(1).join(', ')}) at height ${h}`);
        }
      }
    }
  }
});

test('a grind pose draws without NaN', () => {
  const drawAndCheck = (extra) => {
    const c = stubCanvas(800, 400);
    const r = createRenderer(c, { reducedMotion: false });
    r.resize();
    r.draw(frame({ obstacles: [], ...extra }));
    assert.ok(c.ctx.calls.length > 20);
    for (const call of c.ctx.calls) {
      for (const arg of call.slice(1)) {
        if (typeof arg === 'number') {
          assert.ok(Number.isFinite(arg), `non-finite arg in ${call[0]}(${call.slice(1).join(', ')})`);
        }
      }
    }
    return c.ctx.calls;
  };

  const idleCalls = drawAndCheck({});
  const grindTrickCalls = drawAndCheck({ trick: { ...createTrickState(), active: 'grind', progress: 0.5 } });
  const grindingRiderCalls = drawAndCheck({ rider: { ...createRider(), grinding: true } });

  // Board scale remains flat (1, 1) during a grind trick.
  const grindScales = grindTrickCalls.filter((x) => x[0] === 'scale');
  assert.deepEqual(grindScales, [['scale', 1, 1]]);

  // Rider head vertical coordinate is scaled by 0.88 when t.active === 'grind' or r.grinding.
  const headY = (calls) => {
    const arcs = calls.filter((x) => x[0] === 'arc');
    // The rider head is the last arc drawn (after the two wheels).
    return arcs.at(-1)[2];
  };
  assert.ok(Math.abs(headY(grindTrickCalls) - headY(idleCalls) * 0.88) < 1e-6, 'grind trick bends knees (0.88 vertical scale)');
  assert.ok(Math.abs(headY(grindingRiderCalls) - headY(idleCalls) * 0.88) < 1e-6, 'grinding rider bends knees (0.88 vertical scale)');
});
