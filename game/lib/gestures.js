// Pure input classification. DOM wiring lives in input.js.
export function classifySwipe(dx, dy, dtMs) {
  if (Math.hypot(dx, dy) < 12 && dtMs < 300) return 'tap';
  if (Math.abs(dx) > 40 && Math.abs(dx) > 1.5 * Math.abs(dy)) return dx < 0 ? 'left' : 'right';
  return 'scroll';
}

const KEYS = {
  Space: 'ollie',
  ArrowUp: 'ollie',
  ArrowLeft: 'kickflip',
  KeyZ: 'kickflip',
  ArrowRight: 'shoveit',
  KeyX: 'shoveit',
  KeyP: 'pause',
  KeyM: 'mute',
};

export function keyAction(code) {
  return KEYS[code] ?? null;
}
