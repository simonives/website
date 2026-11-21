import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mountSkateGame } from '../game.js';

function fakeElement(tag) {
  const el = new EventTarget();
  el.tagName = tag.toUpperCase();
  el.children = [];
  el.attrs = new Map();
  el.textContent = '';
  el.className = '';
  el.parentElement = null;
  el.setAttribute = (k, v) => el.attrs.set(k, String(v));
  el.getAttribute = (k) => el.attrs.get(k) ?? null;
  el.append = (...nodes) => {
    for (const n of nodes) {
      n.parentElement = el;
      el.children.push(n);
    }
  };
  el.after = (...nodes) => {
    if (!el.parentElement) return;
    for (const n of nodes) {
      n.parentElement = el.parentElement;
      el.parentElement.children.push(n);
    }
  };
  el.remove = () => {
    if (!el.parentElement) return;
    const i = el.parentElement.children.indexOf(el);
    if (i >= 0) el.parentElement.children.splice(i, 1);
  };
  el.focus = () => {};
  el.setPointerCapture = () => {};
  return el;
}

async function withFakeDom(fn) {
  const prevDoc = globalThis.document;
  const prevRaf = globalThis.requestAnimationFrame;
  const prevCaf = globalThis.cancelAnimationFrame;

  const doc = new EventTarget();
  doc.hidden = false;
  doc.createElement = (tag) => fakeElement(tag);

  let nextId = 1;
  const rafs = new Map();
  globalThis.document = doc;
  globalThis.requestAnimationFrame = (cb) => {
    const id = nextId++;
    rafs.set(id, cb);
    return id;
  };
  globalThis.cancelAnimationFrame = (id) => {
    rafs.delete(id);
  };

  const root = fakeElement('div');
  const canvas = fakeElement('canvas');
  canvas.clientWidth = 800;
  canvas.clientHeight = 400;
  const ctx = new Proxy({}, {
    get(t, k) {
      if (k === 'measureText') return (s) => ({ width: String(s).length * 8 });
      if (k in t) return t[k];
      return () => {};
    },
    set(t, k, v) { t[k] = v; return true; },
  });
  canvas.getContext = () => ctx;
  root.append(canvas);

  function stepFrames(count, startNow = 0) {
    let now = startNow;
    for (let i = 0; i < count; i++) {
      now += 1000 / 60;
      const entries = [...rafs.entries()];
      rafs.clear();
      for (const [, cb] of entries) cb(now);
    }
    return now;
  }

  try {
    return await fn({ root, canvas, stepFrames });
  } finally {
    globalThis.document = prevDoc;
    globalThis.requestAnimationFrame = prevRaf;
    globalThis.cancelAnimationFrame = prevCaf;
  }
}

test('game controls render Kickflip, Shove-it, Grab, Grind in order and canvas aria-label names all tricks', async () => {
  await withFakeDom(({ root, canvas }) => {
    const game = mountSkateGame(canvas, { reducedMotion: false });
    try {
      const controls = root.children.find((el) => el.className === 'skate-controls');
      assert.ok(controls, 'controls container created');
      const labels = controls.children.map((b) => b.textContent);
      assert.deepEqual(labels.slice(3), ['Kickflip', 'Shove-it', 'Grab', 'Grind']);

      const aria = canvas.getAttribute('aria-label');
      for (const name of ['Kickflip', 'Shove-it', 'Grab', 'Grind']) {
        assert.ok(aria.includes(name), `canvas aria-label should mention ${name}`);
      }
    } finally {
      game.destroy();
    }
  });
});

test('mountSkateGame uses options.rng for air taps and announces Clean <trick>. without a caption', async () => {
  await withFakeDom(async ({ root, canvas, stepFrames }) => {
    const tricks = [];
    const game = mountSkateGame(canvas, {
      reducedMotion: true,
      phrases: [{ id: 'far', label: 'Far away', sentence: 'Far away phrase.' }],
      rng: () => 0.9,
      onTrick: (e) => tricks.push(e),
    });
    game.resume();
    try {
      const key = (type, code) => {
        const e = new Event(type, { cancelable: true });
        e.code = code;
        e.repeat = false;
        return e;
      };
      // Ollie at t = 0 (under reducedMotion speed is 110, so rider lands around x ~ 100, far before START - LOOKAHEAD = 200)
      let now = stepFrames(1, 0);
      canvas.dispatchEvent(key('keydown', 'Space'));
      now = stepFrames(2, now);
      canvas.dispatchEvent(key('keyup', 'Space'));
      now = stepFrames(2, now);
      // Quick tap in air -> with rng () => 0.9 and not over grindable -> shoveit
      canvas.dispatchEvent(key('keydown', 'Space'));
      now = stepFrames(2, now);
      canvas.dispatchEvent(key('keyup', 'Space'));
      // Advance until rider lands cleanly
      stepFrames(60, now);

      assert.ok(tricks.length >= 1, 'expected a clean trick landing');
      assert.equal(tricks[0].trick, 'shoveit');

      // Wait for the 30 ms live-region timeout in a11y.announce
      await new Promise((r) => setTimeout(r, 60));
      const live = root.children.find((el) => el.getAttribute('role') === 'status');
      assert.equal(live.textContent, 'Clean shove-it.');
    } finally {
      game.destroy();
    }
  });
});
