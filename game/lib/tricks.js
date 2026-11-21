export const KICKFLIP_SECONDS = 0.6;
export const SHOVEIT_SECONDS = 0.45;
export const GRIND_SECONDS = 0.5;
export const GRAB_DECIDE_SECONDS = 0.2; // a second press held this long becomes a grab
export const GRAB_HOLD_SECONDS = 0.3; // total hold that makes a grab count
export const CLEAN_ANGLE = 0.35; // radians
export const TRICK_NAMES = {
  kickflip: 'Kickflip',
  shoveit: 'Shove-it',
  grab: 'Grab',
  grind: 'Grind',
};
const EPS = 1e-9;

const fresh = (streak) => ({ active: null, progress: 0, streak, presses: 0, pending: null, done: [], queued: null, attempted: false });

export function createTrickState() {
  return fresh(0);
}

export function chooseTrick(rng = Math.random, ctx = {}) {
  if (ctx.held) return 'grab';
  const candidates = ctx.overGrindable ? ['kickflip', 'shoveit', 'grind'] : ['kickflip', 'shoveit'];
  const idx = Math.min(candidates.length - 1, Math.max(0, Math.floor(rng() * candidates.length)));
  return candidates[idx];
}

const duration = (kind) => (
  kind === 'kickflip' ? KICKFLIP_SECONDS
  : kind === 'shoveit' ? SHOVEIT_SECONDS
  : kind === 'grind' ? GRIND_SECONDS
  : GRAB_HOLD_SECONDS
);

// Starts a queued trick as soon as nothing else is running.
function settle(t) {
  if (t.active === null && t.pending === null && t.queued) return { ...t, active: t.queued, progress: 0, queued: null };
  return t;
}

// Press of the single control while airborne: first starts an undecided flip-or-grab, second queues a shove-it.
export function airPress(t, airborne) {
  if (!airborne) return t;
  if (t.presses === 0) return { ...t, presses: 1, pending: 0, attempted: true };
  if (t.presses === 1) return { ...t, presses: 2, queued: 'shoveit', attempted: true };
  return t;
}

export function endGrab(t) {
  if (t.active !== 'grab') return t;
  const done = t.progress >= 1 - EPS ? [...t.done, 'grab'] : t.done;
  return settle({ ...t, active: null, progress: 0, done });
}

export function airRelease(t, rng = Math.random, overGrindable = false) {
  if (t.pending !== null) {
    // Released before the grab threshold: a tap, so choose a trick (if nothing else is running).
    const active = t.active ? t.active : chooseTrick(rng, { overGrindable, held: false });
    return settle({ ...t, pending: null, active, progress: t.active ? t.progress : 0 });
  }
  return endGrab(t);
}

// Direct trick (Z, X, C, V and the on-screen buttons).
export function startTrick(t, kind, airborne) {
  if (!airborne || t.active || t.pending !== null) return t;
  return { ...t, active: kind, progress: 0, attempted: true };
}

export function stepTrick(t, dt) {
  let n = { ...t };
  if (n.pending !== null) {
    n.pending += dt;
    if (n.pending >= GRAB_DECIDE_SECONDS) {
      if (!n.active) {
        n.active = 'grab';
        n.progress = Math.min(1, n.pending / GRAB_HOLD_SECONDS);
      }
      n.pending = null;
    }
  }
  if (n.active) {
    const next = n.progress + dt / duration(n.active);
    n.progress = next >= 1 - EPS ? 1 : next;
    if (n.active !== 'grab' && n.active !== 'grind' && n.progress >= 1) {
      n.done = [...n.done, n.active];
      n.active = null;
      n.progress = 0;
    }
  }
  return settle(n);
}

export function judgeLanding(t, riderAngle, slopeAngle, onGrindable = false) {
  if (t.active === 'grind') {
    if (onGrindable) return { clean: true, trick: 'grind', trickState: fresh(t.streak + 1) };
    // Off a rail or ledge a grind becomes a held grab, so a clean landing still counts (and reveals its caption).
    if (Math.abs(riderAngle - slopeAngle) < CLEAN_ANGLE) return { clean: true, trick: 'grab', trickState: fresh(t.streak + 1) };
    return { clean: false, trick: null, trickState: fresh(0) };
  }
  const done = [...t.done];
  const grabCounts = t.active === 'grab' && t.progress >= 1 - EPS;
  if (grabCounts) done.push('grab');
  const unfinished = (t.active !== null && !grabCounts) || t.pending !== null;
  const clean = done.length > 0 && !unfinished && Math.abs(riderAngle - slopeAngle) < CLEAN_ANGLE;
  if (clean) return { clean: true, trick: done[done.length - 1], trickState: fresh(t.streak + 1) };
  if (t.attempted || done.length > 0) return { clean: false, trick: null, trickState: fresh(0) };
  return { clean: false, trick: null, trickState: fresh(t.streak) };
}
