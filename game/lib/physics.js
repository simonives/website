import { height, slope } from './terrain.js';

// Units are world units and seconds. Up is positive.
export const GRAVITY = 900;
export const JUMP_SPEED = 380; // air time about 0.84 s, long enough to finish a 0.6 s trick
export const HOLD_BOOST = 300; // extra upward acceleration while Space stays held
export const HOLD_CAP = 0.25; // seconds of boost allowed per ollie
export const WALL_GRADIENT = 1.5; // ground rise per unit ridden that counts as a wall
export const LAUNCH_GRADIENT = 1.0; // ground fall per unit ridden that throws the rider off a lip
export const BUMP_SPEED = 200; // hop after a wall hit
const ANGLE_EASE = 6; // per second, air angle eases toward the ground angle
const PENETRATION = 4; // an upward-moving rider this far inside the ground has hit a wall
const TERRAIN = { height, slope };

export function createRider() {
  return {
    x: 0,
    y: height(0),
    vy: 0,
    grounded: true,
    angle: Math.atan(slope(0)),
    ollieHeld: false,
    holdTime: 0,
    vg: 0, // vertical speed of the ground under a grounded rider
    boostArmed: false, // the press that took off is still held
    hit: null, // 'wall' on the step a wall is hit
    ollied: false, // true only on the step a press takes off
  };
}

// ground is { height(x), slope(x) }; it defaults to bare terrain.
export function stepRider(state, input, dt, speed, ground = TERRAIN) {
  const s = { ...state, hit: null, ollied: false };
  const prevY = s.y;
  s.x += speed * dt;
  const down = !!input.ollieDown;
  const freshPress = down && !state.ollieHeld;
  s.ollieHeld = down;
  if (!down) s.boostArmed = false;

  if (s.grounded) {
    const g = ground.height(s.x);
    const per = speed * dt;
    if (per > 0 && (g - prevY) / per > WALL_GRADIENT) {
      s.y = g;
      s.vy = BUMP_SPEED;
      s.grounded = false;
      s.hit = 'wall';
      s.boostArmed = false;
      s.angle = Math.atan(ground.slope(s.x));
      return s;
    }
    if (freshPress) {
      // Takeoff: continue into the airborne integration below, without boost on this step.
      s.y = g;
      s.grounded = false;
      s.vy = JUMP_SPEED + Math.max(0, s.vg);
      s.holdTime = 0;
      s.boostArmed = true;
      s.ollied = true;
    } else if (per > 0 && (prevY - g) / per > LAUNCH_GRADIENT) {
      // The ground fell away: carry on with the vertical speed the surface had.
      s.grounded = false;
      s.vy = s.vg;
      s.holdTime = 0;
      s.boostArmed = false;
    } else {
      s.vg = (g - prevY) / dt;
      s.y = g;
      s.vy = 0;
      s.angle = Math.atan(ground.slope(s.x));
      return s;
    }
  } else if (s.boostArmed && down && s.holdTime < HOLD_CAP) {
    const boostFor = Math.min(dt, HOLD_CAP - s.holdTime);
    s.vy += HOLD_BOOST * boostFor;
    s.holdTime += boostFor;
  }

  // Exact integration for constant acceleration keeps results independent of step size.
  s.y += s.vy * dt - 0.5 * GRAVITY * dt * dt;
  s.vy -= GRAVITY * dt;
  const target = Math.atan(ground.slope(s.x));
  s.angle += (target - s.angle) * Math.min(1, ANGLE_EASE * dt);

  const gnd = ground.height(s.x);
  if (s.y <= gnd) {
    if (s.vy > 0 && gnd - s.y > PENETRATION) {
      s.y = gnd;
      s.vy = BUMP_SPEED;
      s.hit = 'wall';
      s.boostArmed = false;
    } else {
      s.y = gnd;
      s.vy = 0;
      s.vg = 0;
      s.grounded = true;
      s.angle = target;
    }
  }
  return s;
}
