import { createMusic } from './music.js';

// Synthesised sound and backing track. Silent until enable() succeeds inside a user gesture; every method is safe to call regardless.
const MASTER = 0.35;
export const EFFECT_GAIN = 1.0;
export const MUSIC_GAIN = 0.28;
export const POP_PEAK = 1.3;
export const LAND_PEAK = 1.8;
export const CHIME_PEAK = 0.8;

export function createAudio() {
  let ctx = null;
  let master = null;
  let rumbleGain = null;
  let rumbleFilter = null;
  let music = null;
  let on = false;

  function noiseBuffer(seconds) {
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  function blip(type, f0, f1, dur, vol) {
    if (!on) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + dur);
  }

  let pending = null;
  let generation = 0;

  async function build(token) {
    let c = null;
    try {
      const Ctor = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!Ctor) return false;
      c = new Ctor();
      await c.resume();
      if (token !== generation) {
        c.close();
        return false;
      }
      ctx = c;
      master = ctx.createGain();
      master.gain.value = MASTER;
      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.value = -12;
      compressor.ratio.value = 8;
      master.connect(compressor).connect(ctx.destination);
      const src = ctx.createBufferSource();
      src.buffer = noiseBuffer(2);
      src.loop = true;
      rumbleFilter = ctx.createBiquadFilter();
      rumbleFilter.type = 'lowpass';
      rumbleFilter.frequency.value = 200;
      rumbleGain = ctx.createGain();
      rumbleGain.gain.value = 0.25;
      src.connect(rumbleFilter).connect(rumbleGain).connect(master);
      src.start();
      on = true;

      const m = createMusic(ctx, master);
      m.setVolume(MUSIC_GAIN);
      music = m;
      m.load().then((loaded) => {
        if (loaded && on && token === generation && music === m) {
          m.start();
        }
      });

      return true;
    } catch {
      on = false;
      music = null;
      ctx = null;
      if (c) {
        try { c.close(); } catch { /* already closed */ }
      }
      return false;
    }
  }

  // Repeat callers share the in-flight attempt, so one context exists at most.
  function enable() {
    if (on) return Promise.resolve(true);
    if (!pending) {
      const token = generation;
      pending = build(token).finally(() => { pending = null; });
    }
    return pending;
  }

  function disable() {
    generation++;
    on = false;
    if (music) {
      music.stop();
      music = null;
    }
    if (!ctx) return;
    try { ctx.close(); } catch { /* already closed */ }
    ctx = null;
  }

  return {
    enable,
    disable,
    isOn: () => on,
    suspend() { if (on && ctx) ctx.suspend(); },
    resume() { if (on && ctx) ctx.resume(); },
    setSpeed(v) {
      if (!on) return;
      rumbleFilter.frequency.value = 150 + 250 * v;
      rumbleGain.gain.value = Math.min(0.4, 0.1 + 0.15 * v);
    },
    pop: () => blip('square', 300, 120, 0.08, POP_PEAK * EFFECT_GAIN),
    land: () => {
      if (on && music) music.duck();
      blip('sine', 140, 60, 0.15, LAND_PEAK * EFFECT_GAIN);
    },
    chime: () => {
      if (on && music) music.duck();
      blip('sine', 660, 880, 0.35, CHIME_PEAK * EFFECT_GAIN);
    },
  };
}
