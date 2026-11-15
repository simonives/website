// The ride gets faster the longer it runs. Reduced motion holds the half-speed baseline (110), whatever the faster default.
export function speedAt(t, reduced) {
  if (reduced) return 110;
  return 330 + 300 * (1 - Math.exp(-t / 120));
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
