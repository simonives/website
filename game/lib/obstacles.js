export const CHAR_W = 14; // world units per label character
const START = 800;
const LOOKAHEAD = 600;

function hash(k) {
  let h = Math.imul(k + 1, 2654435761) >>> 0;
  h ^= h >>> 15;
  h = Math.imul(h, 2246822519) >>> 0;
  return (h ^ (h >>> 13)) >>> 0;
}

function gapAfter(k, kk) {
  const jitter = (hash(k + 7919) % 81) - 40;
  return Math.max(260, 520 - 8 * kk) + jitter;
}

function build(phrases, k, x, flat) {
  const kk = flat ? 0 : k; // difficulty index
  const h = hash(k);
  const r = (h >>> 4) % 10;
  const kind = r < 4 ? 'ramp' : r < 7 ? 'ledge' : 'stairs';
  // Stride 5 through the list plus a 0..2 wobble never repeats a phrase back to back.
  const phrase = phrases[(k * 5 + ((h >>> 8) % 3)) % phrases.length];
  const width = phrase.label.length * CHAR_W;
  let height;
  let steps = 0;
  if (kind === 'ramp') height = Math.min(60, 0.25 * width);
  else if (kind === 'ledge') height = 14 + Math.min(16, 0.5 * kk);
  else {
    height = 24 + Math.min(16, 0.5 * kk);
    steps = 3 + (kk >= 10 ? 1 : 0) + (kk >= 20 ? 1 : 0);
  }
  return { kind, id: phrase.id, label: phrase.label, sentence: phrase.sentence, x, width, height, steps, lit: false };
}

// Obstacles with x in [fromX, toX), sorted. Walks obstacle index from 0, so any sub-range matches the full range.
export function placeObstacles(phrases, fromX, toX, opts = {}) {
  const out = [];
  let x = START;
  for (let k = 0; ; k++) {
    const ob = build(phrases, k, x, !!opts.flat);
    if (ob.x >= toX) break;
    if (ob.x >= fromX) out.push(ob);
    x = ob.x + ob.width + gapAfter(k, opts.flat ? 0 : k);
  }
  return out;
}

export function lightNearest(obstacles, riderX) {
  let best = null;
  for (const o of obstacles) {
    if (o.lit || o.x + o.width < riderX || o.x - riderX > LOOKAHEAD) continue;
    if (!best || o.x < best.x) best = o;
  }
  if (best) best.lit = true;
  return best;
}
