import { PHRASES } from './content.js';
import { createRider, stepRider, JUMP_SPEED } from './lib/physics.js';
import { createTrickState, startTrick, stepTrick, judgeLanding } from './lib/tricks.js';
import { height, slope } from './lib/terrain.js';
import { placeObstacles, resolveContact, lightNearest, OBSTACLE_H } from './lib/obstacles.js';
import { phaseAt, FLAT_PHASE } from './lib/palette.js';
import { createLoop } from './lib/loop.js';
import { createRenderer } from './lib/render.js';
import { attachInput } from './lib/input.js';
import { createA11y } from './lib/a11y.js';
import { createAudio } from './lib/audio.js';
import { autoInput } from './lib/auto.js';

const STEP = 1 / 60;
const BASE_SPEED = 220;
const BUMP_SPEED = 260;
const CAPTION_SECONDS = 5;

export function mountSkateGame(canvas, options = {}) {
  const phrases = options.phrases || PHRASES;
  const root = canvas.parentElement;
  const mq = globalThis.matchMedia ? globalThis.matchMedia('(prefers-reduced-motion: reduce)') : null;
  const opts = { reducedMotion: options.reducedMotion ?? !!(mq && mq.matches) };
  const renderer = createRenderer(canvas, opts);
  const audio = createAudio();
  const a11y = createA11y(root, phrases);

  canvas.setAttribute('tabindex', '0');
  canvas.setAttribute('role', 'application');
  canvas.setAttribute('aria-roledescription', 'game');
  canvas.setAttribute('aria-label', 'Skateboard game. Space or Up Arrow to ollie. Left Arrow or Z for a kickflip, Right Arrow or X for a shove-it. P pauses, M toggles sound. There is no way to fail.');

  const s = {
    rider: createRider(),
    trick: createTrickState(),
    obstacles: [],
    genTo: 0,
    simT: 0,
    caption: null,
    captionUntil: 0,
    grinding: null,
    bumped: null,
    slowUntil: 0,
    ollie: false,
    auto: false,
  };
  const why = { user: !!opts.reducedMotion, hidden: false, offscreen: false };
  let loop = createLoop();
  let raf = 0;
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
  const kickBtn = button('Kickflip', () => doTrick('kickflip'));
  const shoveBtn = button('Shove-it', () => doTrick('shoveit'));
  kickBtn.hidden = true;
  shoveBtn.hidden = true;
  canvas.after(controls);

  function syncButtons() {
    pauseBtn.textContent = why.user ? 'Resume' : 'Pause';
  }

  // ----- helpers -----
  const running = () => !why.user && !why.hidden && !why.offscreen;

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
      soundBtn.textContent = 'Sound on';
      soundBtn.setAttribute('aria-pressed', 'true');
    } else a11y.announce('Sound is not available in this browser.');
  }

  function doTrick(kind) {
    if (!running()) return;
    s.trick = startTrick(s.trick, kind, !s.rider.grounded && !s.grinding);
  }

  function landed(angle) {
    const j = judgeLanding(s.trick, angle, Math.atan(slope(s.rider.x)));
    s.trick = j.trickState;
    audio.land();
    if (!j.clean) return;
    if (options.onTrick) options.onTrick({ trick: j.trick, streak: s.trick.streak });
    const ob = lightNearest(s.obstacles, s.rider.x);
    if (!ob) {
      a11y.announce(`Clean ${j.trick === 'kickflip' ? 'kickflip' : 'shove-it'}.`);
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
    let ollieDown = s.ollie;
    if (s.auto) {
      const a = autoInput({ rider: s.rider, obstacles: s.obstacles });
      ollieDown = a.ollieDown;
      if (a.trick) s.trick = startTrick(s.trick, a.trick, !s.rider.grounded && !s.grinding);
    }
    const wasGrounded = s.rider.grounded;
    const prevAngle = s.rider.angle;
    if (s.grinding && ollieDown && !s.rider.ollieHeld) {
      s.rider = { ...s.rider, vy: JUMP_SPEED, ollieHeld: true, holdTime: 0 };
      s.grinding = null;
      audio.pop();
    }
    const speed = BASE_SPEED * (opts.reducedMotion ? 0.5 : 1) * (s.simT < s.slowUntil ? 0.6 : 1);
    s.rider = stepRider(s.rider, { ollieDown }, STEP, speed);
    if (wasGrounded && !s.rider.grounded) audio.pop();
    s.trick = stepTrick(s.trick, STEP);

    const x = s.rider.x;
    const ob = s.obstacles.find((o) => x >= o.x && x <= o.x + o.width);
    if (s.grinding) {
      if (ob !== s.grinding) s.grinding = null;
      else s.rider = { ...s.rider, y: height(x) + OBSTACLE_H, vy: 0, grounded: false };
    } else if (ob && ob !== s.bumped) {
      const c = resolveContact(s.rider, ob);
      if (c === 'grind') {
        s.grinding = ob;
        s.rider = { ...s.rider, y: height(x) + OBSTACLE_H, vy: 0, grounded: false };
        landed(prevAngle);
      } else if (c === 'bump') {
        s.bumped = ob;
        s.rider = { ...s.rider, vy: BUMP_SPEED, grounded: false };
        s.slowUntil = s.simT + 0.6;
      }
    }
    if (!wasGrounded && s.rider.grounded) landed(prevAngle);
    if (s.caption && s.simT > s.captionUntil) s.caption = null;

    if (x + 3000 > s.genTo) {
      s.obstacles.push(...placeObstacles(phrases, s.genTo, x + 6000));
      s.genTo = x + 6000;
      s.obstacles = s.obstacles.filter((o) => o.x + o.width > x - 800);
    }
    audio.setSpeed(speed / BASE_SPEED);
  }

  function render() {
    renderer.draw({
      rider: s.rider,
      trick: s.trick,
      obstacles: s.obstacles,
      phase: opts.reducedMotion ? { from: FLAT_PHASE, to: FLAT_PHASE, mix: 0 } : phaseAt(s.simT),
      cameraX: s.rider.x,
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
  s.obstacles = placeObstacles(phrases, 0, 6000);
  s.genTo = 6000;
  const detachInput = attachInput(canvas, {
    ollie(down) {
      if (down && !running() && why.user) setUserPaused(false);
      s.ollie = down;
    },
    trick: doTrick,
    pause: () => setUserPaused(!why.user),
    mute: toggleSound,
    touchSeen() {
      kickBtn.hidden = false;
      shoveBtn.hidden = false;
    },
  });

  const onVisibility = () => { why.hidden = document.hidden; refresh(); };
  document.addEventListener('visibilitychange', onVisibility);
  const io = 'IntersectionObserver' in globalThis
    ? new IntersectionObserver((entries) => { why.offscreen = !entries[entries.length - 1].isIntersecting; refresh(); })
    : null;
  if (io) io.observe(canvas);
  const ro = 'ResizeObserver' in globalThis ? new ResizeObserver(() => { renderer.resize(); if (!running()) render(); }) : null;
  if (ro) ro.observe(canvas);
  const onMotion = (e) => {
    opts.reducedMotion = e.matches;
    if (e.matches) why.user = true;
    syncButtons();
    refresh();
  };
  if (mq && mq.addEventListener) mq.addEventListener('change', onMotion);

  renderer.resize();
  syncButtons();
  refresh();

  return {
    pause() { setUserPaused(true); },
    resume() { setUserPaused(false); },
    destroy() {
      destroyed = true;
      cancelAnimationFrame(raf);
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

const el = document.getElementById('skate');
if (el) mountSkateGame(el);
