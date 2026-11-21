import { stateFromLocation, nextState } from './home-machine.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const SITE_SELECTORS = ['.site-header', 'main', '.engage-section', 'footer', '.skip-link'];

export function isHomepagePath(pathname) {
  return pathname === '/' || pathname === '/index.html' || pathname === '';
}

export function isPlainLeftClick(event) {
  return (
    !event.defaultPrevented &&
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey
  );
}

function createHamburgerSvg(doc) {
  const svg = doc.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('width', '24');
  svg.setAttribute('height', '24');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');

  for (const y of ['6', '12', '18']) {
    const line = doc.createElementNS(SVG_NS, 'line');
    line.setAttribute('x1', '4');
    line.setAttribute('y1', y);
    line.setAttribute('x2', '20');
    line.setAttribute('y2', y);
    svg.append(line);
  }
  return svg;
}

export function initHomeGame(deps = {}) {
  const win = deps.win || window;
  const doc = deps.doc || document;
  const loc = deps.loc || win.location;
  const hist = deps.hist || win.history;
  const loadGame = deps.loadGame || (() => import('./game/game.js'));

  if (!isHomepagePath(loc.pathname)) return null;

  let currentState = stateFromLocation(loc.pathname, loc.hash);
  let wrapper = null;
  let menuBtn = null;
  let liveRegion = null;
  let game = null;
  let gamePromise = null;
  let pausedByLayer = false;
  let readyMarked = false;
  let announceTimer = 0;
  let applyToken = 0;

  function markReady() {
    if (!readyMarked) {
      readyMarked = true;
      doc.documentElement.setAttribute('data-home-ready', '');
    }
  }

  function setSiteInert(isInert) {
    for (const selector of SITE_SELECTORS) {
      const el = doc.querySelector(selector);
      if (!el) continue;
      el.inert = isInert;
      if (isInert) {
        el.setAttribute('inert', '');
        el.setAttribute('aria-hidden', 'true');
      } else {
        el.removeAttribute('inert');
        el.removeAttribute('aria-hidden');
      }
    }
  }

  function announce(msg) {
    if (!liveRegion) return;
    clearTimeout(announceTimer);
    liveRegion.textContent = '';
    announceTimer = setTimeout(() => {
      announceTimer = 0;
      if (liveRegion) liveRegion.textContent = msg;
    }, 30);
  }

  function buildWrapper() {
    const root = doc.createElement('div');
    root.id = 'home-game';
    root.hidden = true;
    root.setAttribute('hidden', '');

    const skip = doc.createElement('a');
    skip.className = 'home-skip';
    skip.setAttribute('href', '#main-content');
    skip.textContent = 'Skip the game and go to the site';
    skip.addEventListener('click', (e) => {
      e.preventDefault();
      transition('open-site');
    });

    const menu = doc.createElement('button');
    menu.className = 'home-menu';
    menu.type = 'button';
    menu.setAttribute('type', 'button');
    const label = doc.createElement('span');
    label.textContent = 'Menu';
    menu.append(createHamburgerSvg(doc), label);
    menu.addEventListener('click', () => {
      transition('open-site');
    });

    const stage = doc.createElement('div');
    stage.className = 'home-stage';
    const canvas = doc.createElement('canvas');
    canvas.setAttribute('tabindex', '0');
    canvas.setAttribute('aria-label', 'Skateboard game');
    stage.append(canvas);

    const live = doc.createElement('div');
    live.className = 'skate-sr-only';
    live.setAttribute('role', 'status');
    live.setAttribute('aria-live', 'polite');

    root.append(skip, menu, stage, live);
    return { wrapper: root, menuBtn: menu, canvas, liveRegion: live };
  }

  function ensureGame() {
    if (game) return Promise.resolve(true);
    if (gamePromise) return gamePromise;

    gamePromise = Promise.resolve()
      .then(() => loadGame())
      .then((mod) => {
        if (!mod || typeof mod.mountSkateGame !== 'function') {
          throw new Error('mountSkateGame unavailable');
        }
        const built = buildWrapper();
        wrapper = built.wrapper;
        menuBtn = built.menuBtn;
        liveRegion = built.liveRegion;
        doc.body.append(wrapper);
        game = mod.mountSkateGame(built.canvas, {});
        return true;
      })
      .catch(() => {
        if (wrapper && typeof wrapper.remove === 'function') wrapper.remove();
        wrapper = null;
        menuBtn = null;
        liveRegion = null;
        game = null;
        gamePromise = null;
        return false;
      });

    return gamePromise;
  }

  function applySite({ focus = false } = {}) {
    doc.documentElement.dataset.home = 'site';
    setSiteInert(false);

    if (wrapper) {
      if (game && !wrapper.hidden) {
        const wasPaused = typeof game.isPaused === 'function' ? game.isPaused() : false;
        pausedByLayer = !wasPaused;
        game.pause();
      }
      wrapper.hidden = true;
      wrapper.setAttribute('hidden', '');
      wrapper.inert = true;
      wrapper.setAttribute('inert', '');
    }

    if (doc.body && doc.body.classList) {
      doc.body.classList.remove('no-scroll');
    }

    const menuToggle = doc.querySelector('.menu-toggle');
    if (menuToggle && menuToggle.getAttribute('aria-expanded') === 'true') {
      menuToggle.setAttribute('aria-expanded', 'false');
      const navContainer = doc.querySelector('.nav-container');
      if (navContainer && navContainer.classList) {
        navContainer.classList.remove('is-active');
      }
    }

    if (typeof win.scrollTo === 'function') {
      win.scrollTo(0, 0);
    }
    if (typeof win.dispatchEvent === 'function' && typeof Event === 'function') {
      win.dispatchEvent(new Event('scroll'));
    }

    if (focus) {
      const heading = doc.querySelector('h1.hero-headline');
      if (heading) {
        heading.setAttribute('tabindex', '-1');
        // The site was visibility:hidden a moment ago. Where a visitor has reduced motion, the stylesheet turns that
        // into a near-instant transition, so the heading is not focusable until the next frames. Focus after them.
        const focusHeading = () => {
          heading.focus({ preventScroll: true });
        };
        if (typeof win.requestAnimationFrame === 'function') {
          win.requestAnimationFrame(() => win.requestAnimationFrame(focusHeading));
        } else {
          focusHeading();
        }
      }
    }

    markReady();
  }

  function applyGame({ focus = false } = {}) {
    doc.documentElement.dataset.home = 'game';
    wrapper.hidden = false;
    wrapper.removeAttribute('hidden');
    wrapper.inert = false;
    wrapper.removeAttribute('inert');
    setSiteInert(true);

    if (game && pausedByLayer) {
      pausedByLayer = false;
      game.resume();
    }

    if (focus) {
      if (menuBtn) menuBtn.focus();
      announce('Back to the game.');
    }

    markReady();
  }

  async function apply(targetState, opts = {}) {
    const token = ++applyToken;
    try {
      if (targetState === 'game') {
        const loaded = await ensureGame();
        if (token !== applyToken) return;
        // The boot failsafe already showed the site to a visitor who waited too long; do not pull the game over it.
        const lateStart = opts.initial && doc.documentElement.hasAttribute('data-home-timeout');
        if (!loaded || lateStart) {
          currentState = 'site';
          applySite({ focus: false });
          return;
        }
        applyGame(opts);
      } else {
        applySite(opts);
      }
    } catch (_) {
      currentState = 'site';
      try {
        applySite({ focus: false });
      } catch (__) {
        if (doc.documentElement) {
          doc.documentElement.setAttribute('data-home', 'site');
          doc.documentElement.setAttribute('data-home-ready', '');
        }
      }
    }
  }

  function transition(event) {
    try {
      const fromGame = Boolean(hist.state && hist.state.fromGame);
      const next = nextState(currentState, event, { fromGame });

      if (next.historyOp === 'back') {
        hist.back();
        return;
      }

      if (next.historyOp === 'push-site') {
        hist.pushState({ fromGame: true }, '', loc.pathname + loc.search + '#site');
      } else if (next.historyOp === 'push-game') {
        hist.pushState({ fromGame: false }, '', loc.pathname + loc.search);
      }

      const isPopstate = event === 'popstate-game' || event === 'popstate-site';
      if (next.state !== currentState || isPopstate) {
        currentState = next.state;
        apply(currentState, { focus: true });
      }
    } catch (_) {
      currentState = 'site';
      try {
        applySite({ focus: false });
      } catch (__) {
        // Never throw to the page.
      }
    }
  }

  function onPlayClick(e) {
    if (!isPlainLeftClick(e)) return;
    e.preventDefault();
    transition('play');
  }

  function injectSkatingLinks() {
    const nav = doc.querySelector('.site-header nav.container');
    if (nav && !nav.querySelector('.skate-link')) {
      const link = doc.createElement('a');
      link.className = 'skate-link';
      link.setAttribute('href', '/');
      link.textContent = "I'd rather be skating";
      link.addEventListener('click', onPlayClick);
      nav.append(link);
    }

    const main = doc.querySelector('main');
    if (main && !main.querySelector('.skate-closing')) {
      const p = doc.createElement('p');
      p.className = 'skate-closing';
      const link = doc.createElement('a');
      link.setAttribute('href', '/');
      link.textContent = "I'd rather be skating";
      link.addEventListener('click', onPlayClick);
      p.append(link);
      main.append(p);
    }
  }

  function onPopState() {
    try {
      const target = stateFromLocation(loc.pathname, loc.hash);
      transition(target === 'game' ? 'popstate-game' : 'popstate-site');
    } catch (_) {
      // Never throw to the page.
    }
  }

  function onKeyDown(e) {
    try {
      if (e.defaultPrevented || e.key !== 'Escape') return;
      if (currentState !== 'site') return;
      if (!hist.state || !hist.state.fromGame) return;
      if (doc.querySelector('.menu-toggle[aria-expanded="true"]')) return;
      transition('escape');
    } catch (_) {
      // Never throw to the page.
    }
  }

  injectSkatingLinks();
  win.addEventListener('popstate', onPopState);
  doc.addEventListener('keydown', onKeyDown);

  const ready = apply(currentState, { focus: false, initial: true });

  return {
    ready,
    getState: () => currentState,
    transition,
  };
}

function boot() {
  try {
    initHomeGame();
  } catch (_) {
    try {
      document.documentElement.dataset.home = 'site';
      document.documentElement.setAttribute('data-home-ready', '');
    } catch (__) {
      // Leave the page usable even if documentElement is inaccessible.
    }
  }
}

if (typeof document !== 'undefined' && typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
}
