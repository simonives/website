import { height } from './terrain.js';

export const OBSTACLE_H = 14; // ledge height above the ground, world units
export const CHAR_W = 14; // world units per label character
const START = 800;
const SLOT = 800;
const JITTER = 100;
const GRIND_WINDOW = 8; // how far below ledge height a falling rider still lands on it
const LOOKAHEAD = 600;

function hash(k) {
  let h = Math.imul(k + 1, 2654435761) >>> 0;
  h ^= h >>> 15;
  h = Math.imul(h, 2246822519) >>> 0;
  return (h ^ (h >>> 13)) >>> 0;
}

function obstacleAt(phrases, k) {
  const h = hash(k);
  const jitter = (h % (2 * JITTER + 1)) - JITTER;
  // Stride 5 through the list plus a 0..2 wobble never repeats a phrase back to back.
  const phrase = phrases[(k * 5 + ((h >>> 8) % 3)) % phrases.length];
  return {
    id: phrase.id,
    label: phrase.label,
    sentence: phrase.sentence,
    x: START + k * SLOT + jitter,
    width: phrase.label.length * CHAR_W,
    lit: false,
  };
}

export function placeObstacles(phrases, fromX, toX) {
  const out = [];
  const first = Math.max(0, Math.floor((fromX - START) / SLOT) - 1);
  for (let k = first; START + k * SLOT - JITTER < toX; k++) {
    const o = obstacleAt(phrases, k);
    if (o.x >= fromX && o.x < toX) out.push(o);
  }
  return out;
}

export function resolveContact(rider, ob) {
  if (rider.x < ob.x || rider.x > ob.x + ob.width) return 'none';
  const clearance = rider.y - height(rider.x);
  if (clearance > OBSTACLE_H) return 'over';
  if (rider.grounded) return 'bump';
  if (rider.vy <= 0 && clearance >= OBSTACLE_H - GRIND_WINDOW) return 'grind';
  return 'bump';
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
