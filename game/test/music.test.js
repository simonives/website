import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMusic } from '../lib/music.js';
import {
  createAudio,
  EFFECT_GAIN,
  MUSIC_GAIN,
  POP_PEAK,
  LAND_PEAK,
  CHIME_PEAK,
} from '../lib/audio.js';

function makeContext({ decodeAudioData = null } = {}) {
  const ctx = {
    currentTime: 1.5,
    sampleRate: 44100,
    destination: { kind: 'destination' },
    gains: [],
    sources: [],
    compressors: [],
    resume: () => Promise.resolve(),
    suspend: () => Promise.resolve(),
    close: () => Promise.resolve(),
    createGain() {
      const events = [];
      const node = {
        events,
        gain: {
          value: 1,
          setValueAtTime(v, t) { events.push({ op: 'set', v, t }); this.value = v; },
          linearRampToValueAtTime(v, t) { events.push({ op: 'linear', v, t }); },
          exponentialRampToValueAtTime(v, t) { events.push({ op: 'exp', v, t }); },
          cancelScheduledValues(t) { events.push({ op: 'cancel', t }); },
        },
        connect(n) { this.connectedTo = n; return n; },
        disconnect() { this.disconnected = true; },
      };
      ctx.gains.push(node);
      return node;
    },
    createDynamicsCompressor() {
      const node = {
        threshold: { value: 0 },
        ratio: { value: 0 },
        connect(n) { this.connectedTo = n; return n; },
      };
      ctx.compressors.push(node);
      return node;
    },
    createBuffer(c, n) { return { getChannelData: () => new Float32Array(n) }; },
    createBiquadFilter() { return { frequency: { value: 0 }, connect(n) { return n; } }; },
    createOscillator() {
      return {
        frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {} },
        connect(n) { return n; },
        start() {},
        stop() {},
      };
    },
    createBufferSource() {
      const src = {
        buffer: null,
        loop: false,
        started: 0,
        stopped: 0,
        disconnected: 0,
        connect(n) { this.connectedTo = n; return n; },
        start() { this.started++; },
        stop() { this.stopped++; },
        disconnect() { this.disconnected++; },
      };
      ctx.sources.push(src);
      return src;
    },
    decodeAudioData(buf) {
      if (decodeAudioData) return decodeAudioData(buf);
      return Promise.resolve({ duration: 60, tag: 'decoded', raw: buf });
    },
  };
  return ctx;
}

function withFetch(impl, fn) {
  const prev = globalThis.fetch;
  if (impl === undefined) delete globalThis.fetch;
  else globalThis.fetch = impl;
  return Promise.resolve().then(fn).finally(() => {
    if (prev === undefined) delete globalThis.fetch;
    else globalThis.fetch = prev;
  });
}

test('load resolves false when fetch fails and never throws', async () => {
  await withFetch(() => Promise.reject(new Error('network down')), async () => {
    const ctx = makeContext();
    const m = createMusic(ctx, ctx.destination);
    assert.equal(await m.load(), false);
    assert.equal(m.isPlaying(), false);
  });

  await withFetch(undefined, async () => {
    const ctx = makeContext();
    const m = createMusic(ctx, ctx.destination);
    assert.equal(await m.load(), false);
  });

  await withFetch(async () => ({ ok: false, status: 404 }), async () => {
    const ctx = makeContext();
    const m = createMusic(ctx, ctx.destination);
    assert.equal(await m.load(), false);
  });
});

test('start returns false before load', () => {
  const ctx = makeContext();
  const m = createMusic(ctx, ctx.destination);
  assert.equal(m.start(), false);
  assert.equal(m.isPlaying(), false);
});

test('falls back to mp3 when m4a decode fails', async () => {
  const urls = [];
  const m4aBytes = new Uint8Array([1, 2, 3]).buffer;
  const mp3Bytes = new Uint8Array([4, 5, 6]).buffer;
  const ctx = makeContext({
    decodeAudioData(buf) {
      if (buf === m4aBytes) return Promise.reject(new Error('unsupported codec'));
      return Promise.resolve({ duration: 60, format: 'mp3' });
    },
  });
  await withFetch(async (url) => {
    const href = String(url);
    urls.push(href);
    return {
      ok: true,
      arrayBuffer: async () => (href.endsWith('.m4a') ? m4aBytes : mp3Bytes),
    };
  }, async () => {
    const m = createMusic(ctx, ctx.destination);
    assert.equal(await m.load(), true);
    assert.equal(urls.length, 2);
    assert.ok(urls[0].endsWith('/audio/backing.m4a'));
    assert.ok(urls[1].endsWith('/audio/backing.mp3'));
    assert.equal(m.start(), true);
    assert.equal(ctx.sources[0].buffer.format, 'mp3');
  });
});

test('start loops the source and isPlaying is true', async () => {
  const ctx = makeContext();
  await withFetch(async () => ({
    ok: true,
    arrayBuffer: async () => new Uint8Array([9, 8, 7]).buffer,
  }), async () => {
    const m = createMusic(ctx, ctx.destination);
    assert.equal(await m.load(), true);
    assert.equal(m.start(), true);
    assert.equal(m.isPlaying(), true);
    assert.equal(ctx.sources.length, 1);
    assert.equal(ctx.sources[0].loop, true);
    assert.equal(ctx.sources[0].started, 1);
    assert.equal(ctx.sources[0].connectedTo, ctx.gains[0]);
    assert.equal(ctx.gains[0].connectedTo, ctx.destination);
  });
});

test('stop is safe to call twice and clears playing', async () => {
  const ctx = makeContext();
  await withFetch(async () => ({
    ok: true,
    arrayBuffer: async () => new Uint8Array([1]).buffer,
  }), async () => {
    const m = createMusic(ctx, ctx.destination);
    await m.load();
    m.start();
    assert.equal(m.isPlaying(), true);
    m.stop();
    assert.equal(m.isPlaying(), false);
    assert.equal(ctx.sources[0].stopped, 1);
    assert.equal(ctx.sources[0].disconnected, 1);
    m.stop();
    assert.equal(m.isPlaying(), false);
    assert.equal(ctx.sources[0].stopped, 1);
  });
});

test('duck lowers gain by 35 percent then restores', () => {
  const ctx = makeContext();
  const m = createMusic(ctx, ctx.destination);
  m.setVolume(0.4);
  const gainNode = ctx.gains[0];
  gainNode.events.length = 0;

  m.duck();

  const setEv = gainNode.events.find((e) => e.op === 'set');
  const rampEv = gainNode.events.find((e) => e.op === 'linear' || e.op === 'exp');
  assert.ok(setEv, 'expected setValueAtTime call for duck');
  assert.ok(rampEv, 'expected ramp call to restore gain');
  assert.ok(Math.abs(setEv.v - 0.4 * 0.65) < 1e-6, `expected ducked gain ${0.4 * 0.65}, got ${setEv.v}`);
  assert.equal(setEv.t, ctx.currentTime);
  assert.ok(Math.abs(rampEv.v - 0.4) < 1e-6, `expected restored gain 0.4, got ${rampEv.v}`);
  assert.ok(Math.abs(rampEv.t - (ctx.currentTime + 0.2)) < 1e-6, `expected 200ms restore, got ${rampEv.t - ctx.currentTime}`);
});

test('music does not start before enable (audio.js): sound off by default', async () => {
  let fetched = 0;
  await withFetch(async () => {
    fetched++;
    return { ok: true, arrayBuffer: async () => new Uint8Array([1]).buffer };
  }, async () => {
    let ctxInstance = null;
    globalThis.AudioContext = class {
      constructor() {
        ctxInstance = makeContext();
        return ctxInstance;
      }
    };
    const a = createAudio();
    assert.equal(a.isOn(), false);
    assert.equal(ctxInstance, null);
    assert.equal(fetched, 0);
    delete globalThis.AudioContext;
  });
});

function flushMicrotasks() {
  return new Promise((r) => setImmediate(r));
}

test('disable stops music', async () => {
  let ctxInstance = null;
  await withFetch(async () => ({
    ok: true,
    arrayBuffer: async () => new Uint8Array([1]).buffer,
  }), async () => {
    globalThis.AudioContext = class {
      constructor() {
        ctxInstance = makeContext();
        return ctxInstance;
      }
    };
    const a = createAudio();
    assert.equal(await a.enable(), true);
    await flushMicrotasks();
    // sources[0] is rumble, sources[1] is music
    assert.equal(ctxInstance.sources.length, 2);
    const musicSrc = ctxInstance.sources[1];
    assert.equal(musicSrc.loop, true);
    assert.equal(musicSrc.started, 1);

    a.disable();
    assert.equal(musicSrc.stopped, 1);
    assert.equal(musicSrc.disconnected, 1);
    delete globalThis.AudioContext;
  });
});

test('chime and land duck the music', async () => {
  let ctxInstance = null;
  await withFetch(async () => ({
    ok: true,
    arrayBuffer: async () => new Uint8Array([1]).buffer,
  }), async () => {
    globalThis.AudioContext = class {
      constructor() {
        ctxInstance = makeContext();
        return ctxInstance;
      }
    };
    const a = createAudio();
    await a.enable();
    await flushMicrotasks();
    // gains[0] = master, gains[1] = rumble, gains[2] = music
    const musicGain = ctxInstance.gains[2];
    musicGain.events.length = 0;
    a.land();
    assert.ok(musicGain.events.some((e) => e.op === 'set' && Math.abs(e.v - MUSIC_GAIN * 0.65) < 1e-6));

    musicGain.events.length = 0;
    a.chime();
    assert.ok(musicGain.events.some((e) => e.op === 'set' && Math.abs(e.v - MUSIC_GAIN * 0.65) < 1e-6));

    a.disable();
    delete globalThis.AudioContext;
  });
});

test('enable resolves true without waiting on music fetch and starts music once loaded', async () => {
  let resolveFetch;
  let ctxInstance = null;
  await withFetch(() => new Promise((r) => { resolveFetch = r; }), async () => {
    globalThis.AudioContext = class {
      constructor() {
        ctxInstance = makeContext();
        return ctxInstance;
      }
    };
    const a = createAudio();
    const enabled = await a.enable();
    assert.equal(enabled, true);
    assert.equal(a.isOn(), true);
    // Only rumble source exists so far; music is still loading.
    assert.equal(ctxInstance.sources.length, 1);

    resolveFetch({ ok: true, arrayBuffer: async () => new Uint8Array([1]).buffer });
    await flushMicrotasks();
    assert.equal(ctxInstance.sources.length, 2);
    assert.equal(ctxInstance.sources[1].loop, true);
    assert.equal(ctxInstance.sources[1].started, 1);

    a.disable();
    delete globalThis.AudioContext;
  });
});

test('effect peak constants: pop, land and chime peak volumes are each at least 2.5x their previous values and EFFECT_GAIN * pop peak > MUSIC_GAIN * 2', () => {
  assert.equal(EFFECT_GAIN, 1.0);
  assert.equal(MUSIC_GAIN, 0.28);
  assert.ok(POP_PEAK >= 0.5 * 2.5, `POP_PEAK ${POP_PEAK} must be >= 1.25`);
  assert.ok(LAND_PEAK >= 0.7 * 2.5, `LAND_PEAK ${LAND_PEAK} must be >= 1.75`);
  assert.ok(CHIME_PEAK >= 0.3 * 2.5, `CHIME_PEAK ${CHIME_PEAK} must be >= 0.75`);
  assert.ok(EFFECT_GAIN * POP_PEAK > MUSIC_GAIN * 2, `EFFECT_GAIN * POP_PEAK (${EFFECT_GAIN * POP_PEAK}) must exceed MUSIC_GAIN * 2 (${MUSIC_GAIN * 2})`);
});
