import { PHRASES } from './content.js';
import { createRider, stepRider } from './lib/physics.js';
import { TRICK_NAMES, createTrickState, airPress, airRelease, startTrick, endGrab, stepTrick, judgeLanding } from './lib/tricks.js';
import { createGround } from './lib/ground.js';
import { lightNearest } from './lib/obstacles.js';
import { extend, relay } from './lib/feed.js';
import { createPressLatch } from './lib/press.js';
import { PHASES, mixAt } from './lib/palette.js';
import { speedAt, advanceClock } from './lib/difficulty.js';
import { createLoop } from './lib/loop.js';
import { createRenderer } from './lib/render.js';
import { attachInput } from './lib/input.js';
import { createA11y } from './lib/a11y.js';
import { createAudio } from './lib/audio.js';
import { autoInput } from './lib/auto.js';

const STEP = 1 / 60;
const CAPTION_SECONDS = 5;
const SLOW = 0.6; // speed factor after a bump
const SLOW_SECONDS = 0.6;

export function mountSkateGame(canvas, options = {}) {
  const phrases = options.phrases || PHRASES;
  const rng = options.rng || Math.random;
  const root = canvas.parentElement;
  const mq = globalThis.matchMedia ? globalThis.matchMedia('(prefers-reduced-motion: reduce)') : null;
  const opts = { reducedMotion: options.reducedMotion ?? !!(mq && mq.matches) };
  const renderer = createRenderer(canvas, opts);
  const audio = createAudio();
  const a11y = createA11y(root, phrases);

  canvas.setAttribute('tabindex', '0');
  canvas.setAttribute('role', 'application');
  canvas.setAttribute('aria-roledescription', 'game');
  canvas.setAttribute(
    'aria-label',
    `Skateboard game. Press Space or Up Arrow to ollie. Tap again in the air for a trick, hold to ${TRICK_NAMES.grab.toLowerCase()}, press again for a ${TRICK_NAMES.shoveit.toLowerCase()}. Left Arrow or Z for ${TRICK_NAMES.kickflip}, Right Arrow or X for ${TRICK_NAMES.shoveit}, Down Arrow or C for ${TRICK_NAMES.grab}, V for ${TRICK_NAMES.grind}. P pauses, M toggles sound. There is no way to fail.`,
  );

  const s = {
    rider: createRider(),
    trick: createTrickState(),
    obstacles: [],
    ground: createGround([]),
    genTo: 0,
    simT: 0,
    rideT: 0, // difficulty clock, seconds of riding
    caption: null,
    captionUntil: 0,
    slowUntil: 0,
    press: createPressLatch(),
    auto: false,
    phaseIdx: 0,
    prevIdx: 0,
    phaseStart: -1,
    cameraY: 0,
  };
  const why = { user: !!opts.reducedMotion, hidden: false, offscreen: false };
  let loop = createLoop();
  let raf = 0;
  let grabTimer = 0;
  let destroyed = false;

  // ----- controls -----
  const controls = document.createElement('div');
  controls.className = 'skate-controls';
  controls.setAttribute('role', 'group');
  controls.setAttribute('aria-label', 'Game controls');
  function button(label, onClick, pressed) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = label;
    if (pressed !== undefined) b.setAttribute('aria-pressed', String(pressed));
    b.addEventListener('click', onClick);
    controls.append(b);
    return b;
  }
  const pauseBtn = button('Pause', () => setUserPaused(!why.user));
  const soundBtn = button('Sound off', () => toggleSound(), false);
  const autoBtn = button('Auto-ride', () => {
    s.auto = !s.auto;
    autoBtn.setAttribute('aria-pressed', String(s.auto));
  }, false);
  const motionBtn = button('Calm motion', () => {
    applyMotion(!opts.reducedMotion, { fromSystem: false });
  }, opts.reducedMotion);
  button(TRICK_NAMES.kickflip, () => doTrick('kickflip'));
  button(TRICK_NAMES.shoveit, () => doTrick('shoveit'));
  const grabBtn = button(TRICK_NAMES.grab, (e) => {
    // A keyboard activation has no press and release, so it grabs for a moment.
    if (e.detail === 0) {
      doTrick('grab');
      clearTimeout(grabTimer);
      grabTimer = setTimeout(() => {
        grabTimer = 0;
        releaseGrab();
      }, 450);
    }
  });
  button(TRICK_NAMES.grind, () => doTrick('grind'));
  grabBtn.addEventListener('pointerdown', () => doTrick('grab'));
  for (const t of ['pointerup', 'pointercancel', 'pointerleave', 'blur']) grabBtn.addEventListener(t, releaseGrab);
  canvas.after(controls);

  function syncButtons() {
    pauseBtn.textContent = why.user ? 'Resume' : 'Pause';
    motionBtn.setAttribute('aria-pressed', String(opts.reducedMotion));
  }

  // ----- helpers -----
  const running = () => !why.user && !why.hidden && !why.offscreen;
  const airborne = () => !s.rider.grounded;

  function schedule() {
    if (!raf && !destroyed) raf = requestAnimationFrame(tick);
  }

  function setUserPaused(v) {
    why.user = v;
    syncButtons();
    refresh();
  }

  function refresh() {
    loop = createLoop();
    if (running()) {
      audio.resume();
      schedule();
    } else {
      audio.suspend();
      render();
    }
  }

  async function toggleSound() {
    if (audio.isOn()) {
      audio.disable();
      soundBtn.textContent = 'Sound off';
      soundBtn.setAttribute('aria-pressed', 'false');
    } else if (await audio.enable()) {
      if (destroyed) {
        audio.disable();
        return;
      }
      soundBtn.textContent = 'Sound on';
      soundBtn.setAttribute('aria-pressed', 'true');
      if (!running()) audio.suspend();
    } else if (!destroyed) a11y.announce('Sound is not available in this browser.');
  }

  function doTrick(kind) {
    if (!running()) return;
    s.trick = startTrick(s.trick, kind, airborne());
  }

  function releaseGrab() {
    if (grabTimer) {
      clearTimeout(grabTimer);
      grabTimer = 0;
    }
    s.trick = endGrab(s.trick);
  }

  function overGrindable() {
    const surf = s.ground.surface(s.rider.x, s.rider.y);
    return surf === 'rail' || surf === 'ledge';
  }

  function control(down) {
    if (down && !running() && why.user) setUserPaused(false);
    if (down) {
      s.press.press();
      if (!running()) return;
      s.trick = airPress(s.trick, airborne());
    } else {
      s.press.release();
      s.trick = airRelease(s.trick, rng, overGrindable());
    }
  }

  function rebuildGround() {
    s.ground = createGround(s.obstacles);
  }

  function extendObstacles(x) {
    const n = extend({ obstacles: s.obstacles, genTo: s.genTo }, x, phrases, opts.reducedMotion);
    if (n.obstacles === s.obstacles && n.genTo === s.genTo) return;
    s.obstacles = n.obstacles;
    s.genTo = n.genTo;
    rebuildGround();
  }

  function landed(angle) {
    const j = judgeLanding(s.trick, angle, Math.atan(s.ground.slope(s.rider.x)), s.rider.grinding);
    s.trick = j.trickState;
    audio.land();
    if (!j.clean) return;
    if (options.onTrick) options.onTrick({ trick: j.trick, streak: s.trick.streak });
    const ob = lightNearest(s.obstacles, s.rider.x);
    if (!ob) {
      if (!s.auto) a11y.announce(`Clean ${TRICK_NAMES[j.trick].toLowerCase()}.`);
      return;
    }
    s.caption = ob.sentence;
    s.captionUntil = s.simT + CAPTION_SECONDS;
    audio.chime();
    a11y.announce(ob.sentence);
    const p = phrases.find((x) => x.id === ob.id);
    if (p && options.onReveal) options.onReveal(p);
  }

  function step() {
    s.simT += STEP;
    const speed = speedAt(s.rideT, opts.reducedMotion) * (s.simT < s.slowUntil ? SLOW : 1);
    let ollieDown = s.press.take(s.rider.grounded);
    if (s.auto) {
      const a = autoInput({ rider: s.rider, obstacles: s.obstacles, speed });
      ollieDown = a.ollieDown;
      if (a.trick && !s.trick.attempted) s.trick = startTrick(s.trick, a.trick, airborne());
    }
    const wasGrounded = s.rider.grounded;
    const wasHeld = s.rider.ollieHeld;
    const prevAngle = s.rider.angle;
    s.rider = stepRider(s.rider, { ollieDown }, STEP, speed, s.ground);
    if (s.rider.ollied) {
      s.prevIdx = s.phaseIdx;
      s.phaseIdx = (s.phaseIdx + 1) % PHASES.length;
      s.phaseStart = s.simT;
      audio.pop();
    }
    const hit = s.rider.hit === 'wall';
    if (hit) {
      if (!s.auto && wasGrounded && ollieDown && !wasHeld) s.press.requeue();
      s.slowUntil = s.simT + SLOW_SECONDS;
      audio.land();
    }
    s.rideT = advanceClock(s.rideT, STEP, true, hit);
    s.trick = stepTrick(s.trick, STEP);
    if (!wasGrounded && s.rider.grounded) landed(prevAngle);
    if (s.caption && s.simT > s.captionUntil) s.caption = null;
    extendObstacles(s.rider.x);
    s.cameraY += (Math.max(0, s.rider.y - 80) - s.cameraY) * 0.1;
    audio.setSpeed(speed / 640);
  }

  function render() {
    renderer.draw({
      rider: s.rider,
      trick: s.trick,
      obstacles: s.obstacles,
      phase: { from: PHASES[s.prevIdx], to: PHASES[s.phaseIdx], mix: mixAt(s.simT - s.phaseStart, opts.reducedMotion) },
      cameraX: s.rider.x,
      cameraY: s.cameraY,
      caption: s.caption,
      paused: !running(),
    });
  }

  function tick(now) {
    raf = 0;
    if (!running()) return render();
    const n = loop.advance(now);
    for (let i = 0; i < n; i++) step();
    render();
    schedule();
  }

  // ----- wiring -----
  extendObstacles(0);
  const detachInput = attachInput(canvas, {
    control,
    trick: doTrick,
    trickEnd: releaseGrab,
    pause: () => setUserPaused(!why.user),
    mute: toggleSound,
  });

  const onVisibility = () => { why.hidden = document.hidden; refresh(); };
  document.addEventListener('visibilitychange', onVisibility);
  const io = 'IntersectionObserver' in globalThis
    ? new IntersectionObserver((entries) => { why.offscreen = !entries[entries.length - 1].isIntersecting; refresh(); })
    : null;
  if (io) io.observe(canvas);
  const ro = 'ResizeObserver' in globalThis ? new ResizeObserver(() => { renderer.resize(); if (!running()) render(); }) : null;
  if (ro) ro.observe(canvas);
  function applyMotion(reduced, { fromSystem } = {}) {
    opts.reducedMotion = !!reduced;
    if (fromSystem && opts.reducedMotion) why.user = true;
    // Re-lay the obstacles ahead of the rider with the new difficulty setting.
    const n = relay({ obstacles: s.obstacles, genTo: s.genTo }, s.rider.x, phrases, opts.reducedMotion);
    s.obstacles = n.obstacles;
    s.genTo = n.genTo;
    rebuildGround();
    syncButtons();
    refresh();
    a11y.announce(opts.reducedMotion ? 'Calm motion on.' : 'Full motion on.');
  }

  const onMotion = (e) => applyMotion(e.matches, { fromSystem: true });
  if (mq && mq.addEventListener) mq.addEventListener('change', onMotion);

  renderer.resize();
  syncButtons();
  refresh();

  return {
    pause() { setUserPaused(true); },
    resume() { setUserPaused(false); },
    isPaused() { return why.user; },
    destroy() {
      destroyed = true;
      cancelAnimationFrame(raf);
      clearTimeout(grabTimer);
      grabTimer = 0;
      detachInput();
      document.removeEventListener('visibilitychange', onVisibility);
      if (io) io.disconnect();
      if (ro) ro.disconnect();
      if (mq && mq.removeEventListener) mq.removeEventListener('change', onMotion);
      audio.disable();
      a11y.destroy();
      controls.remove();
    },
  };
}
