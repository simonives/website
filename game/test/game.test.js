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
  const prevMatchMedia = globalThis.matchMedia;

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
  let mq = null;
  if (opts.matchMedia !== undefined) {
    mq = new EventTarget();
    mq.matches = !!opts.matchMedia;
    globalThis.matchMedia = () => mq;
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
      setReducedMotionMedia: (matches) => {
        if (!mq) return;
        mq.matches = !!matches;
        const e = new Event('change');
        e.matches = !!matches;
        mq.dispatchEvent(e);
      },
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
    if (prevMatchMedia === undefined) delete globalThis.matchMedia;
    else globalThis.matchMedia = prevMatchMedia;
  }
}

test('game controls render Kickflip, Shove-it, Grab, Grind in order and canvas aria-label names all tricks', async () => {
  await withFakeDom(({ root, canvas }) => {
    const game = mountSkateGame(canvas, { reducedMotion: false });
    try {
      const controls = root.children.find((el) => el.className === 'skate-controls');
      assert.ok(controls, 'controls container created');
      const labels = controls.children.map((b) => b.textContent);
      assert.deepEqual(labels.slice(2), ['Auto-ride', 'Calm motion', 'Kickflip', 'Shove-it', 'Grab', 'Grind']);

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
      const doAirTapTrick = (startNow) => {
        let t = startNow;
        canvas.dispatchEvent(key('keydown', 'Space'));
        t = stepFrames(2, t);
        canvas.dispatchEvent(key('keyup', 'Space'));
        t = stepFrames(2, t);
        // Quick tap in air -> with rng () => 0.9 and not over grindable -> shoveit
        canvas.dispatchEvent(key('keydown', 'Space'));
        t = stepFrames(2, t);
        canvas.dispatchEvent(key('keyup', 'Space'));
        // Advance until rider lands cleanly
        return stepFrames(60, t);
      };
      // At calm pace (300), the first landing (x ~ 275) lights the first obstacle at x = 800.
      // A second trick right after lands around x ~ 610, well before obstacle 1 (x >= 1392) minus LOOKAHEAD (600),
      // so no unlit obstacle is in range and the game announces "Clean shove-it." without a caption.
      let now = stepFrames(1, 0);
      now = doAirTapTrick(now);
      now = doAirTapTrick(now);

      assert.ok(tricks.length >= 2, 'expected two clean trick landings');
      assert.equal(tricks[0].trick, 'shoveit');
      assert.equal(tricks[1].trick, 'shoveit');

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

test('the Calm motion button reflects the initial reduced-motion state', async () => {
  for (const initial of [false, true]) {
    await withFakeDom(({ root, canvas }) => {
      const game = mountSkateGame(canvas, { reducedMotion: initial });
      try {
        const controls = root.children.find((el) => el.className === 'skate-controls');
        const autoIdx = controls.children.findIndex((b) => b.textContent === 'Auto-ride');
        const motionBtn = controls.children[autoIdx + 1];
        assert.ok(motionBtn, 'Calm motion button should sit immediately after Auto-ride');
        assert.equal(motionBtn.textContent, 'Calm motion');
        assert.equal(motionBtn.getAttribute('aria-pressed'), String(initial));
      } finally {
        game.destroy();
      }
    });
  }

  for (const matches of [false, true]) {
    await withFakeDom(({ root, canvas }) => {
      const game = mountSkateGame(canvas);
      try {
        const controls = root.children.find((el) => el.className === 'skate-controls');
        const motionBtn = controls.children.find((b) => b.textContent === 'Calm motion');
        assert.ok(motionBtn, 'Calm motion button present when using matchMedia');
        assert.equal(motionBtn.getAttribute('aria-pressed'), String(matches));
      } finally {
        game.destroy();
      }
    }, { matchMedia: matches });
  }
});

test('clicking Calm motion toggles opts and speed and changes aria-pressed', async () => {
  await withFakeDom(({ root, canvas, calls, stepFrames }) => {
    const game = mountSkateGame(canvas, {
      reducedMotion: false,
      phrases: [{ id: 'q', label: 'Quick test', sentence: 'Quick test phrase.' }],
    });
    try {
      const controls = root.children.find((el) => el.className === 'skate-controls');
      const motionBtn = controls.children.find((b) => b.textContent === 'Calm motion');
      assert.equal(motionBtn.getAttribute('aria-pressed'), 'false');

      function readFrame(now) {
        calls.length = 0;
        const next = stepFrames(1, now);
        const fills = calls.filter((c) => c[0] === 'fill').length;
        const qIdx = calls.findIndex((c) => c[0] === 'fillText' && c[1] === 'Q');
        let camX = null;
        if (qIdx >= 2 && calls[qIdx - 2][0] === 'translate') {
          camX = 802 - (calls[qIdx - 2][1] - 240) / 1.25;
        }
        return { now: next, fills, camX };
      }

      // Advance until obstacle 0 (x = 800) is on screen (camX >= 336).
      let now = stepFrames(36, 0);
      const fullA = readFrame(now);
      const fullB = readFrame(fullA.now);
      now = fullB.now;
      const fullSpeed = (fullB.camX - fullA.camX) * 60;
      assert.equal(fullA.fills, 5, 'full motion draws 2 parallax layers + ground + 2 wheels');
      assert.ok(fullSpeed >= 640 && fullSpeed < 700, `expected full speed >= 640, got ${fullSpeed}`);

      // Toggle Calm motion ON.
      motionBtn.dispatchEvent(new Event('click'));
      assert.equal(motionBtn.textContent, 'Calm motion');
      assert.equal(motionBtn.getAttribute('aria-pressed'), 'true');
      now = stepFrames(1, now); // prime loop after refresh()
      const calmA = readFrame(now);
      const calmB = readFrame(calmA.now);
      now = calmB.now;
      const calmSpeed = (calmB.camX - calmA.camX) * 60;
      assert.equal(calmA.fills, 4, 'calm motion draws 1 parallax layer + ground + 2 wheels');
      assert.ok(Math.abs(calmSpeed - 300) < 1e-6, `expected calm speed 300, got ${calmSpeed}`);

      // Toggle Calm motion OFF (back to Full motion).
      motionBtn.dispatchEvent(new Event('click'));
      assert.equal(motionBtn.textContent, 'Calm motion');
      assert.equal(motionBtn.getAttribute('aria-pressed'), 'false');
      now = stepFrames(1, now);
      const backA = readFrame(now);
      const backB = readFrame(backA.now);
      const backSpeed = (backB.camX - backA.camX) * 60;
      assert.equal(backA.fills, 5, 'full motion restores 2 parallax layers');
      assert.ok(backSpeed >= 640, `expected full speed >= 640 after toggle back, got ${backSpeed}`);
    } finally {
      game.destroy();
    }
  });
});

test('clicking it does not pause or unpause the game', async () => {
  // Running in full motion: clicking Calm motion keeps running.
  const log = [];
  await withFakeDom(async ({ root, canvas, calls, stepFrames }) => {
    const game = mountSkateGame(canvas, { reducedMotion: false });
    try {
      const controls = root.children.find((el) => el.className === 'skate-controls');
      const [pauseBtn, soundBtn] = controls.children;
      const motionBtn = controls.children.find((b) => b.textContent === 'Calm motion');

      soundBtn.dispatchEvent(new Event('click'));
      await new Promise((r) => setTimeout(r, 10));
      log.length = 0;

      motionBtn.dispatchEvent(new Event('click'));
      assert.equal(pauseBtn.textContent, 'Pause', 'clicking Calm motion while running must not pause');
      assert.ok(!log.includes('suspend'), 'clicking Calm motion while running must not suspend audio');

      calls.length = 0;
      stepFrames(2, 0);
      assert.ok(calls.length > 0, 'game loop still advances frames');
      assert.ok(
        !calls.some((c) => c[0] === 'fillText' && c[1] === 'Press Space to ride'),
        'paused overlay must not render while running',
      );
    } finally {
      game.destroy();
    }
  }, { audioContext: fakeAudioContext(log) });

  // Paused at start under reduced motion: clicking Calm motion off does not unpause.
  await withFakeDom(({ root, canvas, calls, stepFrames }) => {
    const game = mountSkateGame(canvas, { reducedMotion: true });
    try {
      const controls = root.children.find((el) => el.className === 'skate-controls');
      const [pauseBtn] = controls.children;
      const motionBtn = controls.children.find((b) => b.textContent === 'Calm motion');
      assert.equal(pauseBtn.textContent, 'Resume', 'reduced-motion game starts paused');
      assert.equal(motionBtn.getAttribute('aria-pressed'), 'true');

      calls.length = 0;
      motionBtn.dispatchEvent(new Event('click'));
      assert.equal(motionBtn.getAttribute('aria-pressed'), 'false');
      assert.equal(pauseBtn.textContent, 'Resume', 'turning off Calm motion while paused must not unpause');
      assert.ok(
        calls.some((c) => c[0] === 'fillText' && c[1] === 'Press Space to ride'),
        'paused overlay remains drawn',
      );

      calls.length = 0;
      stepFrames(5, 0);
      assert.equal(calls.length, 0, 'no running frames scheduled while still paused');
    } finally {
      game.destroy();
    }
  });
});

test('a system media-query change updates the button', async () => {
  await withFakeDom(({ root, canvas, setReducedMotionMedia }) => {
    const game = mountSkateGame(canvas);
    try {
      const controls = root.children.find((el) => el.className === 'skate-controls');
      const [pauseBtn] = controls.children;
      const motionBtn = controls.children.find((b) => b.textContent === 'Calm motion');
      assert.equal(motionBtn.getAttribute('aria-pressed'), 'false');
      assert.equal(pauseBtn.textContent, 'Pause');

      setReducedMotionMedia(true);
      assert.equal(motionBtn.getAttribute('aria-pressed'), 'true');
      assert.equal(pauseBtn.textContent, 'Resume', 'OS media-query reduce pauses the game');

      setReducedMotionMedia(false);
      assert.equal(motionBtn.getAttribute('aria-pressed'), 'false');
      assert.equal(pauseBtn.textContent, 'Resume', 'OS media-query unreduce does not force unpause');
    } finally {
      game.destroy();
    }
  }, { matchMedia: false });
});

test('announces Calm motion on and Full motion on', async () => {
  await withFakeDom(async ({ root, canvas }) => {
    const game = mountSkateGame(canvas, { reducedMotion: false });
    try {
      const controls = root.children.find((el) => el.className === 'skate-controls');
      const motionBtn = controls.children.find((b) => b.textContent === 'Calm motion');
      const live = root.children.find((el) => el.getAttribute('role') === 'status');

      motionBtn.dispatchEvent(new Event('click'));
      await new Promise((r) => setTimeout(r, 60));
      assert.equal(live.textContent, 'Calm motion on.');

      motionBtn.dispatchEvent(new Event('click'));
      await new Promise((r) => setTimeout(r, 60));
      assert.equal(live.textContent, 'Full motion on.');
    } finally {
      game.destroy();
    }
  });
});
