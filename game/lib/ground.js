import { height as terrainHeight, slope as terrainSlope } from './terrain.js';

const PLATFORM = 0.3; // share of a stairs obstacle that is the top platform
const RAIL_SNAP = 2; // vertical margin below a rail bar that still counts as above it

// Height an obstacle adds to the terrain at world x (0 outside its span).
export function offsetAt(ob, x, fromY = Infinity) {
  const u = x - ob.x;
  if (ob.kind === 'gap') return u >= 0 && u < ob.width ? -ob.height : 0;
  if (u < 0 || u > ob.width) return 0;
  if (ob.kind === 'ramp') return (ob.height * u) / ob.width;
  if (ob.kind === 'ledge' || ob.kind === 'drop') return ob.height;
  if (ob.kind === 'rail') return fromY >= terrainHeight(x) + ob.height - RAIL_SNAP ? ob.height : 0;
  const platformW = PLATFORM * ob.width;
  if (u < platformW) return ob.height;
  const stepW = (ob.width - platformW) / ob.steps;
  const i = Math.min(ob.steps, Math.floor((u - platformW) / stepW) + 1);
  return (ob.height * (ob.steps + 1 - i)) / (ob.steps + 1);
}

export function offsetSlope(ob, x) {
  if (ob.kind !== 'ramp') return 0;
  const u = x - ob.x;
  return u < 0 || u > ob.width ? 0 : ob.height / ob.width;
}

// obstacles must be sorted by x. Returns the ground (terrain plus obstacle offsets) as height, slope and surface functions.
export function createGround(obstacles) {
  function at(x) {
    let lo = 0;
    let hi = obstacles.length - 1;
    let found = null;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (obstacles[mid].x <= x) {
        found = obstacles[mid];
        lo = mid + 1;
      } else hi = mid - 1;
    }
    return found && x <= found.x + found.width ? found : null;
  }
  return {
    height(x, fromY = Infinity) {
      const ob = at(x);
      return terrainHeight(x) + (ob ? offsetAt(ob, x, fromY) : 0);
    },
    slope(x, fromY = Infinity) {
      const ob = at(x);
      return terrainSlope(x) + (ob ? offsetSlope(ob, x, fromY) : 0);
    },
    surface(x, fromY = Infinity) {
      const ob = at(x);
      if (!ob) return 'ground';
      if (ob.kind === 'ledge' || ob.kind === 'drop') return 'ledge';
      if (ob.kind === 'rail') return fromY >= terrainHeight(x) + ob.height - RAIL_SNAP ? 'rail' : 'ground';
      return 'ground';
    },
  };
}

// Vertical faces of an obstacle, as { x, from, to } with heights relative to the terrain, for drawing.
export function risers(ob) {
  if (ob.kind === 'ramp') return [{ x: ob.x + ob.width, from: 0, to: ob.height }];
  if (ob.kind === 'ledge' || ob.kind === 'drop') return [{ x: ob.x, from: 0, to: ob.height }, { x: ob.x + ob.width, from: 0, to: ob.height }];
  if (ob.kind === 'rail') return [];
  if (ob.kind === 'gap') return [{ x: ob.x, from: 0, to: -ob.height }, { x: ob.x + ob.width, from: -ob.height, to: 0 }];
  const platformW = PLATFORM * ob.width;
  const stepW = (ob.width - platformW) / ob.steps;
  const level = (i) => (i > ob.steps ? 0 : (ob.height * (ob.steps + 1 - i)) / (ob.steps + 1));
  const out = [{ x: ob.x, from: 0, to: ob.height }];
  for (let j = 0; j <= ob.steps; j++) out.push({ x: ob.x + platformW + j * stepW, from: level(j + 1), to: level(j) });
  return out;
}
