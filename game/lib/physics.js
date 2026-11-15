import { height, slope } from './terrain.js';

// Units are world units and seconds. Up is positive.
export const GRAVITY = 900;
export const JUMP_SPEED = 380; // air time about 0.84 s, long enough to finish a 0.6 s trick
export const HOLD_BOOST = 300; // extra upward acceleration while Space stays held
export const HOLD_CAP = 0.25; // seconds of boost allowed per ollie
const ANGLE_EASE = 6; // per second, air angle eases toward the terrain angle

export function createRider() {
  return { x: 0, y: height(0), vy: 0, grounded: true, angle: Math.atan(slope(0)), ollieHeld: false, holdTime: 0 };
}

export function stepRider(state, input, dt, speed) {
  const s = { ...state };
  s.x += speed * dt;
  const down = !!input.ollieDown;
  const freshPress = down && !state.ollieHeld;
  s.ollieHeld = down;

  if (s.grounded) {
    s.y = height(s.x);
    s.angle = Math.atan(slope(s.x));
    s.vy = 0;
    if (!freshPress) return s;
    // Takeoff: continue into the airborne integration below, without boost on this step.
    s.grounded = false;
    s.vy = JUMP_SPEED;
    s.holdTime = 0;
  } else if (down && s.holdTime < HOLD_CAP) {
    // Boost only while the same press that started the ollie is still held.
    const boostFor = Math.min(dt, HOLD_CAP - s.holdTime);
    s.vy += HOLD_BOOST * boostFor;
    s.holdTime += boostFor;
  }

  // Exact integration for constant acceleration keeps results independent of step size.
  s.y += s.vy * dt - 0.5 * GRAVITY * dt * dt;
  s.vy -= GRAVITY * dt;
  const target = Math.atan(slope(s.x));
  s.angle += (target - s.angle) * Math.min(1, ANGLE_EASE * dt);

  const ground = height(s.x);
  if (s.y <= ground && s.vy <= 0) {
    s.y = ground;
    s.vy = 0;
    s.grounded = true;
    s.angle = target;
  }
  return s;
}
