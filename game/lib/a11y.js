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
  let timer = 0;
  return {
    announce(msg) {
      clearTimeout(timer);
      live.textContent = '';
      // A fresh text node each time makes repeated messages announce again.
      timer = setTimeout(() => { timer = 0; live.textContent = msg; }, 30);
    },
    destroy() {
      clearTimeout(timer);
      timer = 0;
      list.remove();
      live.remove();
    },
  };
}
