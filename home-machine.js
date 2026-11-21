export function stateFromLocation(pathname, hash) {
  if (hash === '#site') return 'site';
  if (pathname === '/' || pathname === '/index.html' || pathname === '') {
    return 'game';
  }
  return 'site';
}

export function nextState(state, event, ctx = { fromGame: false }) {
  const fromGame = Boolean(ctx && ctx.fromGame);

  switch (event) {
    case 'open-site':
      if (state === 'game') {
        return { state: 'site', historyOp: 'push-site', fromGame: true };
      }
      return { state, historyOp: 'none', fromGame };

    case 'play':
      if (state === 'site') {
        return { state: 'game', historyOp: 'push-game', fromGame: false };
      }
      return { state, historyOp: 'none', fromGame };

    case 'popstate-game':
      return { state: 'game', historyOp: 'none', fromGame };

    case 'popstate-site':
      return { state: 'site', historyOp: 'none', fromGame };

    case 'escape':
      if (state === 'site' && fromGame) {
        return { state: 'game', historyOp: 'back', fromGame: false };
      }
      return { state, historyOp: 'none', fromGame };

    default:
      return { state, historyOp: 'none', fromGame };
  }
}
