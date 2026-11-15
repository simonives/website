// Rolling ground: a fixed sum of three low-frequency sines. Pure and seedless by construction.
const WAVES = [
  { a: 40, f: 0.004, p: 0.0 },
  { a: 18, f: 0.011, p: 1.7 },
  { a: 8, f: 0.023, p: 4.1 },
];

export function height(x) {
  let y = 0;
  for (const w of WAVES) y += w.a * Math.sin(w.f * x + w.p);
  return y;
}

export function slope(x) {
  let s = 0;
  for (const w of WAVES) s += w.a * w.f * Math.cos(w.f * x + w.p);
  return s;
}
