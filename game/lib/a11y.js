// Text equivalents for the canvas: a visually hidden list of every phrase and a polite live region.
export function createA11y(root, phrases) {
  const list = document.createElement('ul');
  list.className = 'skate-sr-only';
  list.setAttribute('aria-label', 'Phrases in the skate game');
  for (const p of phrases) {
    const li = document.createElement('li');
    li.textContent = p.sentence;
    list.append(li);
  }
  const live = document.createElement('div');
  live.className = 'skate-sr-only';
  live.setAttribute('role', 'status');
  live.setAttribute('aria-live', 'polite');
  root.append(list, live);
  return {
    announce(msg) {
      live.textContent = '';
      // A fresh text node each time makes repeated messages announce again.
      setTimeout(() => { live.textContent = msg; }, 30);
    },
    destroy() {
      list.remove();
      live.remove();
    },
  };
}
