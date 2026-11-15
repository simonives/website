export const TRICK_SECONDS = 0.6;
export const CLEAN_ANGLE = 0.35; // radians

export function createTrickState() {
  return { active: null, progress: 0, streak: 0 };
}

export function startTrick(t, kind, airborne) {
  if (!airborne || t.active) return t;
  return { ...t, active: kind, progress: 0 };
}

export function stepTrick(t, dt) {
  if (!t.active) return t;
  return { ...t, progress: Math.min(1, t.progress + dt / TRICK_SECONDS) };
}

export function judgeLanding(t, riderAngle, slopeAngle) {
  if (!t.active) return { clean: false, trick: null, trickState: t };
  const clean = t.progress >= 1 && Math.abs(riderAngle - slopeAngle) < CLEAN_ANGLE;
  const trickState = { active: null, progress: 0, streak: clean ? t.streak + 1 : 0 };
  return { clean, trick: clean ? t.active : null, trickState };
}
