export const CHAR_W = 14; // world units per label character
const START = 800;
const LOOKAHEAD = 600;

function hash(k) {
  let h = Math.imul(k + 1, 2654435761) >>> 0;
  h ^= h >>> 15;
  h = Math.imul(h, 2246822519) >>> 0;
  return (h ^ (h >>> 13)) >>> 0;
}

function pickKind(k, kk) {
  const h = hash(k);
  if (kk < 3) {
    const r = (h >>> 4) % 10;
    return r < 4 ? 'ramp' : r < 7 ? 'ledge' : 'stairs';
  }
  const t = Math.min(1, (kk - 3) / 30);
  const gapW = Math.round(10 + 12 * t);
  const dropW = Math.round(10 + 10 * t);
  const railW = 16;
  const rampW = 20;
  const ledgeW = Math.round(22 - 11 * t);
  const r = (h >>> 4) % 100;
  if (r < gapW) return 'gap';
  if (r < gapW + dropW) return 'drop';
  if (r < gapW + dropW + railW) return 'rail';
  if (r < gapW + dropW + railW + rampW) return 'ramp';
  if (r < gapW + dropW + railW + rampW + ledgeW) return 'ledge';
  return 'stairs';
}

function gapAfter(k, kk, prevKind, nextKind) {
  if (prevKind === 'ramp' && nextKind === 'gap') {
    return 120 + (hash(k + 7919) % 61);
  }
  const jitter = (hash(k + 7919) % 81) - 40;
  return Math.max(260, 520 - 8 * kk) + jitter;
}

function pickInRange(h, min, max) {
  return min + (h % (max - min + 1));
}

function pickHeight(k, kk, min, max) {
  if (kk === 0) return min;
  const d = Math.min(1, kk / 40);
  const v = (hash(k + 31337) % 101) / 100;
  const frac = Math.min(1, d * (0.4 + 0.6 * v) + 0.25 * v);
  return Math.round(min + (max - min) * frac);
}

function build(phrases, k, x, flat) {
  const kk = flat ? 0 : k; // difficulty index
  const h = hash(k);
  const kind = pickKind(k, kk);
  // Stride 5 through the list plus a 0..2 wobble never repeats a phrase back to back.
  const phrase = phrases[(k * 5 + ((h >>> 8) % 3)) % phrases.length];
  const labelW = phrase.label.length * CHAR_W;
  const wh = hash(k + 12347);
  let width = labelW;
  let height;
  let steps = 0;
  if (kind === 'ramp') {
    height = pickHeight(k, kk, 20, 70);
    width = Math.min(480, Math.max(labelW, 2 * height));
  } else if (kind === 'ledge') {
    height = pickHeight(k, kk, 14, 36);
  } else if (kind === 'stairs') {
    height = pickHeight(k, kk, 30, 60);
    steps = 3 + (kk >= 10 ? 1 : 0) + (kk >= 20 ? 1 : 0);
  } else if (kind === 'drop') {
    height = pickHeight(k, kk, 40, 70);
    width = pickInRange(wh, 180, 420);
  } else if (kind === 'rail') {
    height = pickHeight(k, kk, 18, 34);
    width = pickInRange(wh, 140, 320);
  } else {
    height = pickHeight(k, kk, 24, 40);
    width = pickInRange(wh, 160, 320);
  }
  return { kind, id: phrase.id, label: phrase.label, sentence: phrase.sentence, x, width, height, steps, lit: false };
}

// Obstacles with x in [fromX, toX), sorted. Walks obstacle index from 0, so any sub-range matches the full range.
export function placeObstacles(phrases, fromX, toX, opts = {}) {
  const out = [];
  const flat = !!opts.flat;
  let x = START;
  for (let k = 0; ; k++) {
    const ob = build(phrases, k, x, flat);
    if (ob.x >= toX) break;
    if (ob.x >= fromX) out.push(ob);
    const kk = flat ? 0 : k;
    const nextKind = pickKind(k + 1, flat ? 0 : k + 1);
    x = ob.x + ob.width + gapAfter(k, kk, ob.kind, nextKind);
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
