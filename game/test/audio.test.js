import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAudio } from '../lib/audio.js';

function withStubFetch(fn, impl = () => Promise.reject(new Error('stubbed offline'))) {
  const prev = globalThis.fetch;
  globalThis.fetch = impl;
  return Promise.resolve().then(fn).finally(() => {
    if (prev === undefined) delete globalThis.fetch;
    else globalThis.fetch = prev;
  });
}

test('without AudioContext enable resolves false and nothing throws', async () => {
  delete globalThis.AudioContext;
  delete globalThis.webkitAudioContext;
  const a = createAudio();
  assert.equal(await a.enable(), false);
  assert.equal(a.isOn(), false);
  a.pop(); a.land(); a.chime(); a.setSpeed(1); a.disable();
});

test('a context that fails to start degrades to silence', async () => {
  globalThis.AudioContext = class { constructor() { throw new Error('blocked'); } };
  const a = createAudio();
  assert.equal(await a.enable(), false);
  a.pop(); a.land(); a.chime(); a.setSpeed(2);
  delete globalThis.AudioContext;
});

test('sound is off until enabled', () => {
  assert.equal(createAudio().isOn(), false);
});

export function fakeContext(log, { deferResume = false, decodeAudioData = null } = {}) {
  return class {
    constructor() {
      log.push('new');
      this.sampleRate = 8000;
      this.currentTime = 0;
      this.destination = { kind: 'destination' };
      this.closed = false;
      this.gains = [];
      this.sources = [];
      this.compressors = [];
      this.oscillators = [];
    }
    resume() {
      log.push('resume');
      return deferResume
        ? new Promise((r) => { Promise.resolve().then(() => { globalThis.__release = r; }); })
        : Promise.resolve();
    }
    suspend() { log.push('suspend'); return Promise.resolve(); }
    close() { this.closed = true; log.push('close'); return Promise.resolve(); }
    createGain() {
      const events = [];
      const node = {
        kind: 'gain',
        events,
        gain: {
          value: 0,
          setValueAtTime(v, t) { events.push({ op: 'set', v, t }); this.value = v; },
          linearRampToValueAtTime(v, t) { events.push({ op: 'linear', v, t }); },
          exponentialRampToValueAtTime(v, t) { events.push({ op: 'exp', v, t }); },
          cancelScheduledValues(t) { events.push({ op: 'cancel', t }); },
        },
        connect(n) { this.connectedTo = n; return n; },
        disconnect() { this.disconnected = true; },
      };
      this.gains.push(node);
      return node;
    }
    createDynamicsCompressor() {
      const node = {
        kind: 'compressor',
        threshold: { value: 0 },
        ratio: { value: 0 },
        knee: { value: 0 },
        attack: { value: 0 },
        release: { value: 0 },
        connect(n) { this.connectedTo = n; return n; },
      };
      this.compressors.push(node);
      log.push('compressor');
      return node;
    }
    createBuffer(c, n) { return { numberOfChannels: c, length: n, getChannelData: () => new Float32Array(n) }; }
    createBufferSource() {
      const src = {
        kind: 'bufferSource',
        buffer: null,
        loop: false,
        started: false,
        stopped: false,
        disconnected: false,
        connect(n) { this.connectedTo = n; return n; },
        start() { this.started = true; log.push('source.start'); },
        stop() { this.stopped = true; log.push('source.stop'); },
        disconnect() { this.disconnected = true; log.push('source.disconnect'); },
      };
      this.sources.push(src);
      return src;
    }
    createBiquadFilter() { return { frequency: { value: 0 }, connect(n) { return n; } }; }
    createOscillator() {
      const osc = {
        type: 'sine',
        frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {} },
        connect(n) { this.connectedTo = n; return n; },
        start() {},
        stop() {},
      };
      this.oscillators.push(osc);
      return osc;
    }
    decodeAudioData(buf) {
      log.push('decodeAudioData');
      if (decodeAudioData) return decodeAudioData(buf);
      return Promise.resolve({ duration: 60, length: 2646000, sampleRate: 44100 });
    }
  };
}

test('two enable calls in flight build one context', async () => {
  await withStubFetch(async () => {
    const log = [];
    globalThis.AudioContext = fakeContext(log, { deferResume: true });
    const a = createAudio();
    const p1 = a.enable();
    const p2 = a.enable();
    await Promise.resolve();
    globalThis.__release();
    assert.equal(await p1, true);
    assert.equal(await p2, true);
    assert.equal(log.filter((x) => x === 'new').length, 1);
    delete globalThis.AudioContext;
  });
});

test('disable during enable leaves no live context and reports off', async () => {
  await withStubFetch(async () => {
    const log = [];
    globalThis.AudioContext = fakeContext(log, { deferResume: true });
    const a = createAudio();
    const p = a.enable();
    await Promise.resolve();
    a.disable();
    globalThis.__release();
    assert.equal(await p, false);
    assert.equal(a.isOn(), false);
    assert.ok(log.includes('close'));
    delete globalThis.AudioContext;
  });
});

test('suspend and resume pass through to the context while on', async () => {
  await withStubFetch(async () => {
    const log = [];
    globalThis.AudioContext = fakeContext(log);
    const a = createAudio();
    await a.enable();
    a.suspend();
    a.resume();
    assert.ok(log.includes('suspend'));
    assert.equal(log.filter((x) => x === 'resume').length, 2);
    delete globalThis.AudioContext;
  });
});

test('suspend and resume are safe when sound was never enabled', () => {
  const a = createAudio();
  a.suspend();
  a.resume();
});

test('master connects through a dynamics compressor to destination', async () => {
  await withStubFetch(async () => {
    const log = [];
    let instance = null;
    const Base = fakeContext(log);
    globalThis.AudioContext = class extends Base {
      constructor() { super(); instance = this; }
    };
    const a = createAudio();
    assert.equal(await a.enable(), true);
    assert.equal(instance.compressors.length, 1);
    const comp = instance.compressors[0];
    assert.equal(comp.threshold.value, -12);
    assert.equal(comp.ratio.value, 8);
    assert.equal(comp.connectedTo, instance.destination);
    const master = instance.gains[0];
    assert.equal(master.connectedTo, comp);
    assert.equal(master.gain.value, 0.35);
    a.disable();
    delete globalThis.AudioContext;
  });
});
