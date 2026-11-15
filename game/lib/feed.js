import { placeObstacles } from './obstacles.js';

// Lays obstacles ahead of x and drops those far behind. Returns the new { obstacles, genTo }.
export function extend(state, x, phrases, flat) {
  if (x + 3000 <= state.genTo) return state;
  const added = placeObstacles(phrases, state.genTo, x + 6000, { flat });
  return {
    obstacles: [...state.obstacles, ...added].filter((o) => o.x + o.width > x - 800),
    genTo: x + 6000,
  };
}

// After the difficulty setting changes, keep what is on screen and lay the rest afresh.
export function relay(state, riderX, phrases, flat) {
  const keep = state.obstacles.filter((o) => o.x <= riderX + 600);
  const last = keep[keep.length - 1];
  return extend({ obstacles: keep, genTo: Math.max(riderX + 600, last ? last.x + last.width + 300 : 0) }, riderX, phrases, flat);
}
