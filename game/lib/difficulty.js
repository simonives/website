export const BASE_SPEED = 640;
export const CEIL_SPEED = 1600;
const SPEED_SPAN = CEIL_SPEED - BASE_SPEED;
const RAMP_TAU = 75;
const CALM_SPEED = 300;

// The ride gets faster the longer it runs. Reduced motion holds a steady calm pace (300) instead of ramping up.
export function speedAt(t, reduced) {
  if (reduced) return CALM_SPEED;
  return CEIL_SPEED - SPEED_SPAN * Math.exp(-t / RAMP_TAU);
}

// Ride time t >= 0 at which an unbroken ride from t = 0 has covered distance x.
// Inverse of D(t) = 1600 * t - 960 * 75 * (1 - exp(-t / 75)).
export function timeAtDistance(x) {
  if (x <= 0) return 0;
  let lo = 0;
  let hi = x / BASE_SPEED + 1;
  for (let i = 0; i < 60; i++) {
    const mid = 0.5 * (lo + hi);
    const d = CEIL_SPEED * mid - SPEED_SPAN * RAMP_TAU * (1 - Math.exp(-mid / RAMP_TAU));
    if (d < x) lo = mid;
    else hi = mid;
  }
  return 0.5 * (lo + hi);
}

// A bump takes 8 seconds off the ride clock, so a struggling rider gets a breather.
export function windBack(t) {
  return Math.max(0, t - 8);
}

// The clock advances only while the game runs (not while paused or hidden).
export function advanceClock(rideT, dt, running, hit) {
  const next = running ? rideT + dt : rideT;
  return hit ? windBack(next) : next;
}
