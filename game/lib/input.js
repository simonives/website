import { classifySwipe, keyAction } from './gestures.js';

const OLLIE_CODES = new Set(['Space', 'ArrowUp']);

// Wires keyboard (only while the canvas has focus) and pointer input. Returns a detach function.
export function attachInput(canvas, handlers) {
  const down = new Set();
  let start = null;

  function setOllie() {
    handlers.ollie(down.size > 0);
  }

  function onKeyDown(e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const action = keyAction(e.code);
    if (!action) return;
    e.preventDefault();
    if (e.repeat) return;
    if (action === 'ollie') {
      down.add(e.code);
      setOllie();
    } else if (action === 'kickflip' || action === 'shoveit') handlers.trick(action);
    else if (action === 'pause') handlers.pause();
    else if (action === 'mute') handlers.mute();
  }

  function onKeyUp(e) {
    if (OLLIE_CODES.has(e.code) && down.delete(e.code)) setOllie();
  }

  function onBlur() {
    down.clear();
    setOllie();
  }

  function onPointerDown(e) {
    if (!e.isPrimary) return;
    if (e.pointerType === 'touch') handlers.touchSeen?.();
    canvas.focus({ preventScroll: true });
    start = { x: e.clientX, y: e.clientY, t: e.timeStamp };
    try { canvas.setPointerCapture(e.pointerId); } catch { /* not capturable */ }
    handlers.ollie(true);
  }

  function onPointerUp(e) {
    if (!e.isPrimary || !start) return;
    handlers.ollie(false);
    const kind = classifySwipe(e.clientX - start.x, e.clientY - start.y, e.timeStamp - start.t);
    start = null;
    if (kind === 'left') handlers.trick('kickflip');
    else if (kind === 'right') handlers.trick('shoveit');
  }

  function onPointerCancel() {
    start = null;
    handlers.ollie(false);
  }

  canvas.addEventListener('keydown', onKeyDown);
  canvas.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('blur', onBlur);
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerCancel);
  return () => {
    canvas.removeEventListener('keydown', onKeyDown);
    canvas.removeEventListener('keyup', onKeyUp);
    canvas.removeEventListener('blur', onBlur);
    canvas.removeEventListener('pointerdown', onPointerDown);
    canvas.removeEventListener('pointerup', onPointerUp);
    canvas.removeEventListener('pointercancel', onPointerCancel);
  };
}
