// Looping electronic backing track loader and player.
// Fetches and decodes backing.m4a (falling back to backing.mp3), plays sample-accurately looped through a GainNode.

const DUCK_FACTOR = 0.65;
const DUCK_RESTORE_SECONDS = 0.2;

export function createMusic(ctx, destination) {
  const gainNode = ctx.createGain();
  let volume = 1;
  gainNode.gain.value = volume;
  gainNode.connect(destination);

  let buffer = null;
  let source = null;
  let playing = false;
  let loadPromise = null;

  async function tryFetchAndDecode(url) {
    if (typeof globalThis.fetch !== 'function') return null;
    if (typeof ctx.decodeAudioData !== 'function') return null;
    try {
      const res = await globalThis.fetch(url);
      if (!res || !res.ok) return null;
      const bytes = await res.arrayBuffer();
      const decoded = await ctx.decodeAudioData(bytes);
      return decoded || null;
    } catch {
      return null;
    }
  }

  function load() {
    if (buffer) return Promise.resolve(true);
    if (!loadPromise) {
      loadPromise = (async () => {
        const m4a = new URL('../audio/backing.m4a', import.meta.url);
        const mp3 = new URL('../audio/backing.mp3', import.meta.url);
        const decoded = (await tryFetchAndDecode(m4a)) || (await tryFetchAndDecode(mp3));
        if (!decoded) return false;
        buffer = decoded;
        return true;
      })().catch(() => false).finally(() => {
        loadPromise = null;
      });
    }
    return loadPromise;
  }

  function start() {
    if (!buffer) return false;
    if (playing && source) return true;
    try {
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.loop = true;
      src.connect(gainNode);
      src.start(0);
      source = src;
      playing = true;
      return true;
    } catch {
      playing = false;
      source = null;
      return false;
    }
  }

  function stop() {
    playing = false;
    if (!source) return;
    const s = source;
    source = null;
    try { s.stop(); } catch { /* already stopped */ }
    try { s.disconnect(); } catch { /* already disconnected */ }
  }

  function setVolume(v) {
    volume = Math.max(0, Number(v) || 0);
    const t = ctx.currentTime || 0;
    if (gainNode.gain.cancelScheduledValues) gainNode.gain.cancelScheduledValues(t);
    gainNode.gain.value = volume;
  }

  function duck() {
    const t = ctx.currentTime || 0;
    const dipped = volume * DUCK_FACTOR;
    if (gainNode.gain.cancelScheduledValues) gainNode.gain.cancelScheduledValues(t);
    if (gainNode.gain.setValueAtTime) gainNode.gain.setValueAtTime(dipped, t);
    else gainNode.gain.value = dipped;
    if (gainNode.gain.linearRampToValueAtTime) {
      gainNode.gain.linearRampToValueAtTime(volume, t + DUCK_RESTORE_SECONDS);
    } else if (gainNode.gain.exponentialRampToValueAtTime) {
      gainNode.gain.exponentialRampToValueAtTime(Math.max(0.0001, volume), t + DUCK_RESTORE_SECONDS);
    }
  }

  return {
    load,
    start,
    stop,
    duck,
    setVolume,
    isPlaying: () => playing,
  };
}
