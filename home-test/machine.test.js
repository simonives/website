import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { stateFromLocation, nextState } from '../home-machine.js';

const LOCATION_TABLE = [
  { label: 'root path "/" with empty hash', pathname: '/', hash: '', expected: 'game' },
  { label: 'empty pathname "" with empty hash', pathname: '', hash: '', expected: 'game' },
  { label: '/index.html with empty hash', pathname: '/index.html', hash: '', expected: 'game' },
  { label: 'root path "/" with #site hash', pathname: '/', hash: '#site', expected: 'site' },
  { label: '/index.html with #site hash', pathname: '/index.html', hash: '#site', expected: 'site' },
  { label: 'empty pathname "" with #site hash', pathname: '', hash: '#site', expected: 'site' },
  { label: 'root path "/" with non-site hash', pathname: '/', hash: '#about', expected: 'site' },
  { label: '/now.html with empty hash', pathname: '/now.html', hash: '', expected: 'site' },
  { label: '/doctrine.html with empty hash', pathname: '/doctrine.html', hash: '', expected: 'site' },
  { label: '/404.html with empty hash', pathname: '/404.html', hash: '', expected: 'site' },
  { label: '/now.html with #site hash', pathname: '/now.html', hash: '#site', expected: 'site' },
];

describe('stateFromLocation', () => {
  for (const { label, pathname, hash, expected } of LOCATION_TABLE) {
    it(`${label} -> ${expected}`, () => {
      assert.equal(stateFromLocation(pathname, hash), expected);
    });
  }
});

describe('nextState', () => {
  it('open-site from game pushes #site and sets fromGame', () => {
    const result = nextState('game', 'open-site', { fromGame: false });
    assert.deepEqual(result, {
      state: 'site',
      historyOp: 'push-site',
      fromGame: true,
    });
  });

  it('popstate-game after open-site returns to game with no history op', () => {
    const opened = nextState('game', 'open-site');
    const back = nextState(opened.state, 'popstate-game', { fromGame: false });
    assert.deepEqual(back, {
      state: 'game',
      historyOp: 'none',
      fromGame: false,
    });
  });

  it('escape does nothing without fromGame', () => {
    const result = nextState('site', 'escape', { fromGame: false });
    assert.deepEqual(result, {
      state: 'site',
      historyOp: 'none',
      fromGame: false,
    });

    const defaultCtx = nextState('site', 'escape');
    assert.deepEqual(defaultCtx, {
      state: 'site',
      historyOp: 'none',
      fromGame: false,
    });
  });

  it('escape with fromGame returns to game via back', () => {
    const result = nextState('site', 'escape', { fromGame: true });
    assert.deepEqual(result, {
      state: 'game',
      historyOp: 'back',
      fromGame: false,
    });
  });

  it('play from site entered via the game goes back instead of stacking history', () => {
    const result = nextState('site', 'play', { fromGame: true });
    assert.deepEqual(result, { state: 'game', historyOp: 'back', fromGame: false });
  });

  it('play from a directly loaded site pushes the bare path', () => {
    const result = nextState('site', 'play', { fromGame: false });
    assert.deepEqual(result, { state: 'game', historyOp: 'push-game', fromGame: false });
  });

  it('popstate events never push', () => {
    assert.deepEqual(
      nextState('site', 'popstate-game', { fromGame: true }),
      { state: 'game', historyOp: 'none', fromGame: true },
    );
    assert.deepEqual(
      nextState('game', 'popstate-site', { fromGame: true }),
      { state: 'site', historyOp: 'none', fromGame: true },
    );
    assert.deepEqual(
      nextState('game', 'popstate-site', { fromGame: false }),
      { state: 'site', historyOp: 'none', fromGame: false },
    );
    assert.deepEqual(
      nextState('game', 'popstate-game', { fromGame: false }),
      { state: 'game', historyOp: 'none', fromGame: false },
    );
  });

  it('nextState does not mutate ctx', () => {
    const cases = [
      ['game', 'open-site', { fromGame: false }],
      ['site', 'play', { fromGame: true }],
      ['site', 'escape', { fromGame: true }],
      ['site', 'escape', { fromGame: false }],
      ['game', 'popstate-site', { fromGame: true }],
      ['site', 'popstate-game', { fromGame: false }],
    ];
    for (const [state, event, ctx] of cases) {
      const frozen = Object.freeze({ ...ctx });
      const snapshot = { ...frozen };
      nextState(state, event, frozen);
      assert.deepEqual(frozen, snapshot);
    }
  });

  it('inapplicable events leave state unchanged', () => {
    assert.deepEqual(
      nextState('site', 'open-site', { fromGame: true }),
      { state: 'site', historyOp: 'none', fromGame: true },
    );
    assert.deepEqual(
      nextState('game', 'play', { fromGame: false }),
      { state: 'game', historyOp: 'none', fromGame: false },
    );
    assert.deepEqual(
      nextState('game', 'escape', { fromGame: true }),
      { state: 'game', historyOp: 'none', fromGame: true },
    );
  });
});
