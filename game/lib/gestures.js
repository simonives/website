// Pure key mapping. Pointer handling lives in input.js.
const KEYS = {
  Space: 'control',
  ArrowUp: 'control',
  ArrowLeft: 'kickflip',
  KeyZ: 'kickflip',
  ArrowRight: 'shoveit',
  KeyX: 'shoveit',
  ArrowDown: 'grab',
  KeyC: 'grab',
  KeyV: 'grind',
  KeyP: 'pause',
  KeyM: 'mute',
};

export function keyAction(code) {
  return KEYS[code] ?? null;
}
