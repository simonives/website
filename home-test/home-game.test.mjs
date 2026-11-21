import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

function makeClassList(initial = []) {
  const set = new Set(initial);
  return {
    add: (...names) => names.forEach((n) => set.add(n)),
    remove: (...names) => names.forEach((n) => set.delete(n)),
    contains: (name) => set.has(name),
    toggle: (name, force) => {
      if (force === undefined) {
        if (set.has(name)) {
          set.delete(name);
          return false;
        }
        set.add(name);
        return true;
      }
      if (force) set.add(name);
      else set.delete(name);
      return Boolean(force);
    },
  };
}

function fakeElement(tag, opts = {}) {
  const el = new EventTarget();
  el.tagName = tag.toUpperCase();
  el.id = opts.id || '';
  el.className = opts.className || '';
  el.classList = makeClassList(el.className ? el.className.split(/\s+/) : []);
  el.children = [];
  el.attrs = new Map();
  el.dataset = {};
  el.textContent = '';
  el.hidden = false;
  el.inert = false;
  el.parentElement = null;
  el.focused = [];
  el.setAttribute = (k, v) => {
    el.attrs.set(k, String(v));
    if (k === 'id') el.id = String(v);
    if (k === 'class') {
      el.className = String(v);
      el.classList = makeClassList(el.className ? el.className.split(/\s+/) : []);
    }
    if (k === 'hidden') el.hidden = true;
    if (k === 'inert') el.inert = true;
    if (k.startsWith('data-')) {
      const camel = k.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      el.dataset[camel] = String(v);
    }
  };
  el.getAttribute = (k) => (el.attrs.has(k) ? el.attrs.get(k) : null);
  el.hasAttribute = (k) => el.attrs.has(k);
  el.removeAttribute = (k) => {
    el.attrs.delete(k);
    if (k === 'hidden') el.hidden = false;
    if (k === 'inert') el.inert = false;
    if (k.startsWith('data-')) {
      const camel = k.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      delete el.dataset[camel];
    }
  };
  el.append = (...nodes) => {
    for (const n of nodes) {
      if (typeof n === 'string') {
        el.textContent += n;
      } else {
        n.parentElement = el;
        el.children.push(n);
      }
    }
  };
  el.remove = () => {
    if (!el.parentElement) return;
    const i = el.parentElement.children.indexOf(el);
    if (i >= 0) el.parentElement.children.splice(i, 1);
    el.parentElement = null;
  };
  el.focus = (arg) => {
    el.focused.push(arg ?? null);
  };
  el.querySelector = (selector) => findInTree(el, selector);
  return el;
}

function matchesSelector(el, selector) {
  if (selector === '.site-header nav.container') {
    return el.tagName === 'NAV' && el.classList.contains('container') && el.parentElement?.classList.contains('site-header');
  }
  if (selector === 'h1.hero-headline') {
    return el.tagName === 'H1' && el.classList.contains('hero-headline');
  }
  if (selector === '.menu-toggle[aria-expanded="true"]') {
    return el.classList.contains('menu-toggle') && el.getAttribute('aria-expanded') === 'true';
  }
  if (selector.startsWith('#')) return el.id === selector.slice(1);
  if (selector.startsWith('.')) return el.classList.contains(selector.slice(1));
  return el.tagName === selector.toUpperCase();
}

function findInTree(root, selector) {
  for (const child of root.children) {
    if (matchesSelector(child, selector)) return child;
    const nested = findInTree(child, selector);
    if (nested) return nested;
  }
  return null;
}

function createFakeEnv({ pathname = '/', search = '', hash = '', historyState = null, reducedMotion = false, failImport = false } = {}) {
  const doc = new EventTarget();
  const html = fakeElement('html');
  html.dataset = new Proxy({}, {
    set(target, prop, value) {
      target[prop] = String(value);
      const attr = 'data-' + String(prop).replace(/[A-Z]/g, (m) => '-' + m.toLowerCase());
      html.attrs.set(attr, String(value));
      return true;
    },
    get(target, prop) {
      return target[prop];
    },
  });
  const body = fakeElement('body');
  const skipLink = fakeElement('a', { className: 'skip-link' });
  const header = fakeElement('header', { className: 'site-header' });
  const nav = fakeElement('nav', { className: 'container' });
  const menuToggle = fakeElement('button', { className: 'menu-toggle' });
  menuToggle.setAttribute('aria-expanded', 'false');
  const navContainer = fakeElement('div', { className: 'nav-container' });
  nav.append(menuToggle, navContainer);
  header.append(nav);

  const main = fakeElement('main', { id: 'main-content' });
  const h1 = fakeElement('h1', { className: 'hero-headline' });
  main.append(h1);

  const engage = fakeElement('section', { className: 'engage-section' });
  const footer = fakeElement('footer', { className: 'site-footer' });

  body.append(skipLink, header, main, engage, footer);
  html.append(body);

  doc.documentElement = html;
  doc.body = body;
  doc.readyState = 'complete';
  doc.createElement = (tag) => fakeElement(tag);
  doc.createElementNS = (_ns, tag) => fakeElement(tag);
  doc.querySelector = (selector) => findInTree(html, selector);

  const loc = { pathname, search, hash };
  const historyStack = [{ state: historyState, url: pathname + search + hash }];
  let historyIndex = 0;
  const historyCalls = [];

  const win = new EventTarget();
  win.location = loc;
  win.scrollCalls = [];
  win.scrollEvents = 0;
  win.scrollTo = (x, y) => win.scrollCalls.push([x, y]);
  win.addEventListener('scroll', () => { win.scrollEvents++; });

  const hist = {
    get state() {
      return historyStack[historyIndex].state;
    },
    pushState(state, _title, url) {
      historyCalls.push({ op: 'pushState', state, url });
      historyStack.splice(historyIndex + 1);
      historyStack.push({ state, url });
      historyIndex = historyStack.length - 1;
      const hashIdx = url.indexOf('#');
      loc.hash = hashIdx >= 0 ? url.slice(hashIdx) : '';
    },
    back() {
      historyCalls.push({ op: 'back' });
      if (historyIndex > 0) {
        historyIndex--;
        const url = historyStack[historyIndex].url;
        const hashIdx = url.indexOf('#');
        loc.hash = hashIdx >= 0 ? url.slice(hashIdx) : '';
        win.dispatchEvent(new Event('popstate'));
      }
    },
  };
  win.history = hist;

  let loadCalls = 0;
  let paused = reducedMotion;
  const gameCalls = [];
  const loadGame = async () => {
    loadCalls++;
    if (failImport) throw new Error('network error');
    return {
      mountSkateGame(canvas, opts) {
        gameCalls.push({ op: 'mount', canvas, opts });
        return {
          pause() {
            paused = true;
            gameCalls.push({ op: 'pause' });
          },
          resume() {
            paused = false;
            gameCalls.push({ op: 'resume' });
          },
          isPaused() {
            return paused;
          },
          destroy() {
            gameCalls.push({ op: 'destroy' });
          },
        };
      },
    };
  };

  return {
    win,
    doc,
    loc,
    hist,
    html,
    body,
    skipLink,
    header,
    nav,
    menuToggle,
    navContainer,
    main,
    h1,
    engage,
    footer,
    historyCalls,
    gameCalls,
    getLoadCalls: () => loadCalls,
    setPaused: (v) => { paused = v; },
    loadGame,
  };
}

describe('home-game.js', () => {
  it('can be imported in Node with no document without throwing', async () => {
    assert.equal(typeof globalThis.document, 'undefined');
    const mod = await import('../home-game.js');
    assert.equal(typeof mod.isHomepagePath, 'function');
    assert.equal(typeof mod.isPlainLeftClick, 'function');
    assert.equal(typeof mod.initHomeGame, 'function');
  });

  it('isHomepagePath matches /, /index.html, and empty string only', async () => {
    const { isHomepagePath } = await import('../home-game.js');
    assert.equal(isHomepagePath('/'), true);
    assert.equal(isHomepagePath('/index.html'), true);
    assert.equal(isHomepagePath(''), true);
    assert.equal(isHomepagePath('/now.html'), false);
    assert.equal(isHomepagePath('/game/'), false);
  });

  it('isPlainLeftClick accepts plain left clicks and rejects modified or non-primary clicks', async () => {
    const { isPlainLeftClick } = await import('../home-game.js');
    assert.equal(isPlainLeftClick({ button: 0, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false, defaultPrevented: false }), true);
    assert.equal(isPlainLeftClick({ button: 1, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false, defaultPrevented: false }), false);
    assert.equal(isPlainLeftClick({ button: 0, metaKey: true, ctrlKey: false, shiftKey: false, altKey: false, defaultPrevented: false }), false);
    assert.equal(isPlainLeftClick({ button: 0, metaKey: false, ctrlKey: true, shiftKey: false, altKey: false, defaultPrevented: false }), false);
    assert.equal(isPlainLeftClick({ button: 0, metaKey: false, ctrlKey: false, shiftKey: true, altKey: false, defaultPrevented: false }), false);
    assert.equal(isPlainLeftClick({ button: 0, metaKey: false, ctrlKey: false, shiftKey: false, altKey: true, defaultPrevented: false }), false);
    assert.equal(isPlainLeftClick({ button: 0, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false, defaultPrevented: true }), false);
  });

  it('does nothing on non-homepage paths', async () => {
    const { initHomeGame } = await import('../home-game.js');
    const env = createFakeEnv({ pathname: '/now.html', hash: '' });
    const ctrl = initHomeGame(env);
    assert.equal(ctrl, null);
    assert.equal(env.getLoadCalls(), 0);
    assert.equal(env.doc.querySelector('#home-game'), null);
    assert.equal(env.doc.querySelector('.skate-link'), null);
  });

  it('on direct /#site load, does not mount game, injects skating links, and marks ready', async () => {
    const { initHomeGame } = await import('../home-game.js');
    const env = createFakeEnv({ pathname: '/', hash: '#site' });
    const ctrl = initHomeGame(env);
    await ctrl.ready;

    assert.equal(env.getLoadCalls(), 0);
    assert.equal(env.doc.querySelector('#home-game'), null);
    assert.equal(env.html.getAttribute('data-home'), 'site');
    assert.equal(env.html.hasAttribute('data-home-ready'), true);

    const headerLink = env.nav.children.at(-1);
    assert.equal(headerLink.className, 'skate-link');
    assert.equal(headerLink.getAttribute('href'), '/');
    assert.equal(headerLink.textContent, "I'd rather be skating");

    const closingP = env.main.children.at(-1);
    assert.equal(closingP.tagName, 'P');
    assert.equal(closingP.className, 'skate-closing');
    assert.equal(closingP.children[0].getAttribute('href'), '/');
    assert.equal(closingP.children[0].textContent, "I'd rather be skating");
  });

  it('on / load, mounts game in wrapper order, marks site inert, and transitions to site and back', async () => {
    const { initHomeGame } = await import('../home-game.js');
    const env = createFakeEnv({ pathname: '/', hash: '' });
    const ctrl = initHomeGame(env);
    await ctrl.ready;

    assert.equal(env.getLoadCalls(), 1);
    assert.equal(env.html.getAttribute('data-home'), 'game');
    assert.equal(env.html.hasAttribute('data-home-ready'), true);

    const wrapper = env.doc.querySelector('#home-game');
    assert.ok(wrapper);
    assert.equal(wrapper.hidden, false);
    assert.equal(wrapper.children.length, 4);
    assert.equal(wrapper.children[0].className, 'home-skip');
    assert.equal(wrapper.children[1].className, 'home-menu');
    assert.equal(wrapper.children[2].className, 'home-stage');
    assert.equal(wrapper.children[2].children[0].tagName, 'CANVAS');
    assert.equal(wrapper.children[3].getAttribute('role'), 'status');
    assert.equal(wrapper.children[3].getAttribute('aria-live'), 'polite');

    for (const el of [env.skipLink, env.header, env.main, env.engage, env.footer]) {
      assert.equal(el.inert, true);
      assert.equal(el.getAttribute('aria-hidden'), 'true');
    }

    // Click Menu button -> transitions to site
    env.body.classList.add('no-scroll');
    wrapper.children[1].dispatchEvent(new Event('click'));

    assert.equal(env.html.getAttribute('data-home'), 'site');
    assert.equal(env.loc.hash, '#site');
    assert.deepEqual(env.historyCalls[0], { op: 'pushState', state: { fromGame: true }, url: '/#site' });
    assert.equal(wrapper.hidden, true);
    assert.equal(wrapper.inert, true);
    assert.equal(env.body.classList.contains('no-scroll'), false);
    assert.deepEqual(env.win.scrollCalls.at(-1), [0, 0]);
    assert.ok(env.win.scrollEvents >= 1);
    assert.equal(env.h1.getAttribute('tabindex'), '-1');
    assert.deepEqual(env.h1.focused.at(-1), { preventScroll: true });
    assert.equal(env.gameCalls.at(-1).op, 'pause');

    for (const el of [env.skipLink, env.header, env.main, env.engage, env.footer]) {
      assert.equal(el.inert, false);
      assert.equal(el.getAttribute('aria-hidden'), null);
    }

    // Press Escape while mobile menu is open -> ignored
    env.menuToggle.setAttribute('aria-expanded', 'true');
    const escBlocked = new Event('keydown');
    escBlocked.key = 'Escape';
    env.doc.dispatchEvent(escBlocked);
    assert.equal(env.html.getAttribute('data-home'), 'site');

    // Press Escape with mobile menu closed -> history.back() -> returns to game and resumes
    env.menuToggle.setAttribute('aria-expanded', 'false');
    const esc = new Event('keydown');
    esc.key = 'Escape';
    env.doc.dispatchEvent(esc);
    await new Promise((r) => setTimeout(r, 50));

    assert.equal(env.html.getAttribute('data-home'), 'game');
    assert.equal(wrapper.hidden, false);
    assert.equal(wrapper.inert, false);
    assert.equal(env.gameCalls.at(-1).op, 'resume');
    assert.equal(wrapper.children[1].focused.length, 1);
    assert.equal(wrapper.children[3].textContent, 'Back to the game.');
  });

  it('does not force-unpause a game that was already paused (e.g. reduced motion) when returning', async () => {
    const { initHomeGame } = await import('../home-game.js');
    const env = createFakeEnv({ pathname: '/', hash: '', reducedMotion: true });
    const ctrl = initHomeGame(env);
    await ctrl.ready;

    const wrapper = env.doc.querySelector('#home-game');
    wrapper.children[1].dispatchEvent(new Event('click'));
    assert.equal(env.html.getAttribute('data-home'), 'site');

    const esc = new Event('keydown');
    esc.key = 'Escape';
    env.doc.dispatchEvent(esc);
    await new Promise((r) => setTimeout(r, 10));

    assert.equal(env.html.getAttribute('data-home'), 'game');
    assert.equal(env.gameCalls.some((c) => c.op === 'resume'), false);
  });

  it('falls back to site when dynamic import fails', async () => {
    const { initHomeGame } = await import('../home-game.js');
    const env = createFakeEnv({ pathname: '/', hash: '', failImport: true });
    const ctrl = initHomeGame(env);
    await ctrl.ready;

    assert.equal(env.html.getAttribute('data-home'), 'site');
    assert.equal(env.html.hasAttribute('data-home-ready'), true);
    assert.equal(env.doc.querySelector('#home-game'), null);
  });

  it('skating link lazily mounts game on plain left click and ignores modified/middle clicks', async () => {
    const { initHomeGame } = await import('../home-game.js');
    const env = createFakeEnv({ pathname: '/', search: '?ref=1', hash: '#site' });
    const ctrl = initHomeGame(env);
    await ctrl.ready;

    const headerLink = env.nav.children.at(-1);

    // Escape on direct /#site load (no fromGame) does nothing
    const esc = new Event('keydown');
    esc.key = 'Escape';
    env.doc.dispatchEvent(esc);
    assert.equal(env.html.getAttribute('data-home'), 'site');
    assert.equal(env.historyCalls.length, 0);

    // Modified click and middle click fall through without preventDefault
    for (const props of [
      { button: 0, metaKey: true },
      { button: 1, metaKey: false },
    ]) {
      const e = new Event('click', { cancelable: true });
      Object.assign(e, { ctrlKey: false, shiftKey: false, altKey: false }, props);
      headerLink.dispatchEvent(e);
      assert.equal(e.defaultPrevented, false);
    }
    assert.equal(env.getLoadCalls(), 0);

    // Plain left click prevents default, pushes bare path, lazily mounts game
    const click = new Event('click', { cancelable: true });
    Object.assign(click, { button: 0, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false });
    headerLink.dispatchEvent(click);
    await new Promise((r) => setTimeout(r, 50));

    assert.equal(click.defaultPrevented, true);
    assert.deepEqual(env.historyCalls[0], { op: 'pushState', state: { fromGame: false }, url: '/?ref=1' });
    assert.equal(env.getLoadCalls(), 1);
    assert.equal(env.html.getAttribute('data-home'), 'game');
    const wrapper = env.doc.querySelector('#home-game');
    assert.equal(wrapper.children[1].focused.length, 1);
    assert.equal(wrapper.children[3].textContent, 'Back to the game.');

    // Clicking .home-skip prevents default and returns to site
    const skipClick = new Event('click', { cancelable: true });
    wrapper.children[0].dispatchEvent(skipClick);
    assert.equal(skipClick.defaultPrevented, true);
    assert.equal(env.html.getAttribute('data-home'), 'site');
    assert.deepEqual(env.historyCalls[1], { op: 'pushState', state: { fromGame: true }, url: '/?ref=1#site' });
  });
});
