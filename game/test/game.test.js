import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mountSkateGame } from '../game.js';

function fakeAudioContext(log) {
  return class {
    constructor() {
      this.sampleRate = 8000;
      this.currentTime = 0;
      this.destination = { kind: 'destination' };
    }
    resume() { log.push('resume'); return Promise.resolve(); }
    suspend() { log.push('suspend'); return Promise.resolve(); }
    close() { log.push('close'); return Promise.resolve(); }
    createGain() {
      return {
        gain: { value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, cancelScheduledValues() {} },
        connect(n) { return n; },
        disconnect() {},
      };
    }
    createDynamicsCompressor() {
      return { threshold: { value: 0 }, ratio: { value: 0 }, connect(n) { return n; } };
    }
    createBuffer(c, n) { return { numberOfChannels: c, length: n, getChannelData: () => new Float32Array(n) }; }
    createBufferSource() {
      return { buffer: null, loop: false, connect(n) { return n; }, start() { log.push('source.start'); }, stop() {}, disconnect() {} };
    }
    createBiquadFilter() { return { frequency: { value: 0 }, connect(n) { return n; } }; }
    createOscillator() {
      return { type: 'sine', frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect(n) { return n; }, start() {}, stop() {} };
    }
  };
}

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

async function withFakeDom(fn, opts = {}) {
  const prevDoc = globalThis.document;
  const prevRaf = globalThis.requestAnimationFrame;
  const prevCaf = globalThis.cancelAnimationFrame;
  const prevIO = globalThis.IntersectionObserver;
  const prevAudio = globalThis.AudioContext;
  const prevFetch = globalThis.fetch;

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

  let ioCallback = null;
  if (opts.intersectionObserver) {
    globalThis.IntersectionObserver = class {
      constructor(cb) { ioCallback = cb; }
      observe() {}
      disconnect() {}
    };
  }
  if (opts.audioContext) {
    globalThis.AudioContext = opts.audioContext;
    globalThis.fetch = () => Promise.reject(new Error('offline'));
  }

  const calls = [];
  const root = fakeElement('div');
  const canvas = fakeElement('canvas');
  canvas.clientWidth = 800;
  canvas.clientHeight = 400;
  const ctx = new Proxy({}, {
    get(t, k) {
      if (k === 'measureText') return (s) => ({ width: String(s).length * 8 });
      if (k in t) return t[k];
      return (...args) => { calls.push([k, ...args]); };
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
    return await fn({
      root,
      canvas,
      doc,
      calls,
      stepFrames,
      setIntersecting: (v) => ioCallback && ioCallback([{ isIntersecting: v }]),
    });
  } finally {
    globalThis.document = prevDoc;
    globalThis.requestAnimationFrame = prevRaf;
    globalThis.cancelAnimationFrame = prevCaf;
    if (prevIO === undefined) delete globalThis.IntersectionObserver;
    else globalThis.IntersectionObserver = prevIO;
    if (prevAudio === undefined) delete globalThis.AudioContext;
    else globalThis.AudioContext = prevAudio;
    if (prevFetch === undefined) delete globalThis.fetch;
    else globalThis.fetch = prevFetch;
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

test('sound suspends on Pause button, P key, hidden and offscreen, and resumes when running again', async () => {
  const log = [];
  await withFakeDom(async ({ root, canvas, doc, setIntersecting }) => {
    const game = mountSkateGame(canvas, { reducedMotion: false });
    try {
      const controls = root.children.find((el) => el.className === 'skate-controls');
      const [pauseBtn, soundBtn] = controls.children;

      // Enable sound while running.
      soundBtn.dispatchEvent(new Event('click'));
      await new Promise((r) => setTimeout(r, 10));
      assert.equal(soundBtn.textContent, 'Sound on');

      const key = (type, code) => {
        const e = new Event(type, { cancelable: true });
        e.code = code;
        e.repeat = false;
        return e;
      };

      // Pause button
      log.length = 0;
      pauseBtn.dispatchEvent(new Event('click'));
      assert.deepEqual(log, ['suspend'], 'Pause button suspends audio');
      log.length = 0;
      pauseBtn.dispatchEvent(new Event('click'));
      assert.deepEqual(log, ['resume'], 'Resume button resumes audio');

      // P key
      log.length = 0;
      canvas.dispatchEvent(key('keydown', 'KeyP'));
      assert.deepEqual(log, ['suspend'], 'P key suspends audio');
      log.length = 0;
      canvas.dispatchEvent(key('keydown', 'KeyP'));
      assert.deepEqual(log, ['resume'], 'P key again resumes audio');

      // Hidden
      log.length = 0;
      doc.hidden = true;
      doc.dispatchEvent(new Event('visibilitychange'));
      assert.deepEqual(log, ['suspend'], 'visibilitychange hidden suspends audio');
      log.length = 0;
      doc.hidden = false;
      doc.dispatchEvent(new Event('visibilitychange'));
      assert.deepEqual(log, ['resume'], 'visibilitychange visible resumes audio');

      // Offscreen
      log.length = 0;
      setIntersecting(false);
      assert.deepEqual(log, ['suspend'], 'offscreen suspends audio');
      log.length = 0;
      setIntersecting(true);
      assert.deepEqual(log, ['resume'], 'back onscreen resumes audio');
    } finally {
      game.destroy();
    }
  }, { audioContext: fakeAudioContext(log), intersectionObserver: true });
});

test('enabling sound while already paused suspends audio immediately', async () => {
  const log = [];
  await withFakeDom(async ({ root, canvas }) => {
    const game = mountSkateGame(canvas, { reducedMotion: false });
    try {
      const controls = root.children.find((el) => el.className === 'skate-controls');
      const [pauseBtn, soundBtn] = controls.children;

      pauseBtn.dispatchEvent(new Event('click'));
      soundBtn.dispatchEvent(new Event('click'));
      await new Promise((r) => setTimeout(r, 10));
      assert.equal(soundBtn.textContent, 'Sound on');
      assert.equal(log.at(-1), 'suspend', 'audio enabled while paused must immediately suspend');
    } finally {
      game.destroy();
    }
  }, { audioContext: fakeAudioContext(log) });
});

test('releasing a grab during pause or on blur ends the grab so it does not stay active', async () => {
  const key = (type, code) => {
    const e = new Event(type, { cancelable: true });
    e.code = code;
    e.repeat = false;
    return e;
  };

  async function runScenario(mode) {
    const tricks = [];
    await withFakeDom(({ root, canvas, stepFrames }) => {
      const game = mountSkateGame(canvas, {
        reducedMotion: true,
        phrases: [{ id: 'far', label: 'Far away', sentence: 'Far away phrase.' }],
        onTrick: (e) => tricks.push(e),
      });
      game.resume();
      try {
        const controls = root.children.find((el) => el.className === 'skate-controls');
        const grabBtn = controls.children.find((b) => b.textContent === 'Grab');

        // Ollie into the air.
        let now = stepFrames(1, 0);
        canvas.dispatchEvent(key('keydown', 'Space'));
        now = stepFrames(2, now);
        canvas.dispatchEvent(key('keyup', 'Space'));
        now = stepFrames(2, now);

        if (mode === 'keyC-keyup' || mode === 'keyC-blur' || mode === 'keyC-held') {
          canvas.dispatchEvent(key('keydown', 'KeyC'));
          now = stepFrames(6, now); // 0.1 s < 0.3 s threshold
          game.pause();
          if (mode === 'keyC-keyup') canvas.dispatchEvent(key('keyup', 'KeyC'));
          if (mode === 'keyC-blur') canvas.dispatchEvent(new Event('blur'));
        } else if (mode === 'btn-pointerup') {
          grabBtn.dispatchEvent(new Event('pointerdown'));
          now = stepFrames(6, now);
          game.pause();
          grabBtn.dispatchEvent(new Event('pointerup'));
        } else if (mode === 'space-keyup' || mode === 'space-blur' || mode === 'space-held') {
          canvas.dispatchEvent(key('keydown', 'Space'));
          now = stepFrames(14, now); // ~0.233 s: grab active, progress ~0.78 < 1
          game.pause();
          if (mode === 'space-keyup') canvas.dispatchEvent(key('keyup', 'Space'));
          if (mode === 'space-blur') canvas.dispatchEvent(new Event('blur'));
        }

        game.resume();
        stepFrames(70, now);
      } finally {
        game.destroy();
      }
    });
    return tricks;
  }

  // Control check: when not released during pause, resuming completes the grab on landing.
  assert.equal((await runScenario('keyC-held')).length, 1, 'control: unreleased KeyC grab completes');
  assert.equal((await runScenario('space-held')).length, 1, 'control: unreleased Space grab completes');

  // Releasing during pause or on blur must end the grab early (cancelled < 0.3 s -> no clean trick).
  assert.equal((await runScenario('keyC-keyup')).length, 0, 'KeyC keyup while paused must end grab');
  assert.equal((await runScenario('keyC-blur')).length, 0, 'KeyC blur while paused must end grab');
  assert.equal((await runScenario('btn-pointerup')).length, 0, 'Grab button pointerup while paused must end grab');
  assert.equal((await runScenario('space-keyup')).length, 0, 'Space keyup while paused must end grab');
  assert.equal((await runScenario('space-blur')).length, 0, 'Space blur while paused must end grab');
});

test('timers started by game.js are cleared on destroy and no callback fires after destroy', async () => {
  const prevSet = globalThis.setTimeout;
  const prevClear = globalThis.clearTimeout;
  const pending = new Map();
  let nextTimerId = 1;
  let firedAfterDestroy = 0;
  let isDestroyed = false;

  globalThis.setTimeout = (fn, ms) => {
    const id = nextTimerId++;
    pending.set(id, {
      ms,
      fn: () => {
        if (isDestroyed) firedAfterDestroy++;
        fn();
      },
    });
    return id;
  };
  globalThis.clearTimeout = (id) => {
    pending.delete(id);
  };

  try {
    await withFakeDom(async ({ root, canvas }) => {
      delete globalThis.AudioContext;
      delete globalThis.webkitAudioContext;
      const game = mountSkateGame(canvas, { reducedMotion: false });
      const controls = root.children.find((el) => el.className === 'skate-controls');
      const soundBtn = controls.children.find((b) => b.textContent === 'Sound off');
      const grabBtn = controls.children.find((b) => b.textContent === 'Grab');

      // Keyboard activation of Grab button schedules the 450 ms grab-release timer.
      const kbClick = new Event('click');
      kbClick.detail = 0;
      grabBtn.dispatchEvent(kbClick);
      assert.ok([...pending.values()].some((t) => t.ms === 450), 'expected 450 ms grab-release timer');

      // Trigger a11y.announce timer (30 ms) via unavailable sound click.
      soundBtn.dispatchEvent(new Event('click'));
      for (let i = 0; i < 6; i++) await Promise.resolve();
      assert.ok([...pending.values()].some((t) => t.ms === 30), 'expected 30 ms a11y announce timer');

      game.destroy();
      isDestroyed = true;

      // Flush any surviving timers to verify none were left behind.
      for (const [, entry] of [...pending.entries()]) entry.fn();
      assert.equal(pending.size, 0, `expected all timers cleared on destroy, ${pending.size} survived`);
      assert.equal(firedAfterDestroy, 0, 'no timer callback should fire after destroy');
    });
  } finally {
    globalThis.setTimeout = prevSet;
    globalThis.clearTimeout = prevClear;
  }
});
