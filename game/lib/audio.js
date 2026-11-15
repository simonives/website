// Synthesised sound. Silent until enable() succeeds inside a user gesture; every method is safe to call regardless.
const MASTER = 0.15;

export function createAudio() {
  let ctx = null;
  let master = null;
  let rumbleGain = null;
  let rumbleFilter = null;
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

  async function enable() {
    if (on) return true;
    try {
      const Ctor = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!Ctor) return false;
      ctx = new Ctor();
      await ctx.resume();
      master = ctx.createGain();
      master.gain.value = MASTER;
      master.connect(ctx.destination);
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
      return true;
    } catch {
      on = false;
      return false;
    }
  }

  function disable() {
    if (!ctx) return;
    on = false;
    try { ctx.close(); } catch { /* already closed */ }
    ctx = null;
  }

  return {
    enable,
    disable,
    isOn: () => on,
    setSpeed(v) {
      if (!on) return;
      rumbleFilter.frequency.value = 150 + 250 * v;
      rumbleGain.gain.value = Math.min(0.4, 0.1 + 0.15 * v);
    },
    pop: () => blip('square', 300, 120, 0.08, 0.5),
    land: () => blip('sine', 140, 60, 0.15, 0.7),
    chime: () => blip('sine', 660, 880, 0.35, 0.3),
  };
}
