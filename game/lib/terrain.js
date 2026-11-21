// Concrete-style piecewise-linear ground: flat runs and straight angular slopes, periodic over PERIOD.
export const PERIOD = 6000;

// Segments in order as [length, slope] where slope is dy/dx.
// Lengths sum to PERIOD and net rise sums to 0.
export const SEGMENTS = Object.freeze([
  [700, 0],
  [250, 0.15],
  [500, 0],
  [300, -0.125],
  [800, 0],
  [200, -0.18],
  [600, 0],
  [240, 0.15],
  [900, 0],
  [300, 0.1],
  [500, 0],
  [150, -0.2],
  [560, 0],
]);

const SEG_COUNT = SEGMENTS.length;
const START_X = new Float64Array(SEG_COUNT);
const END_X = new Float64Array(SEG_COUNT);
const START_Y = new Float64Array(SEG_COUNT);
const SLOPES = new Float64Array(SEG_COUNT);

{
  let x = 0;
  let y = 0;
  for (let i = 0; i < SEG_COUNT; i++) {
    const [len, m] = SEGMENTS[i];
    START_X[i] = x;
    START_Y[i] = y;
    SLOPES[i] = m;
    x += len;
    y += len * m;
    END_X[i] = x;
  }
}

function wrap(x) {
  return ((x % PERIOD) + PERIOD) % PERIOD;
}

function segmentIndex(u) {
  let lo = 0;
  let hi = SEG_COUNT - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (u < END_X[mid]) hi = mid;
    else lo = mid + 1;
  }
  return lo;
}

export function height(x) {
  const u = wrap(x);
  const i = segmentIndex(u);
  return START_Y[i] + SLOPES[i] * (u - START_X[i]);
}

export function slope(x) {
  return SLOPES[segmentIndex(wrap(x))];
}
