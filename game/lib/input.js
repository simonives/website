import { keyAction } from './gestures.js';

const TOUCH_HOLD_MS = 100; // a touch becomes a press after this long, or when a tap ends

// Wires keyboard (only while the canvas has focus) and pointer input into one control. Returns a detach function.
export function attachInput(canvas, handlers) {
  const holders = new Set(); // every source currently holding the control
  const grabKeys = new Set();
  let touch = null; // { timer, fired } for the primary touch

  function hold(id) {
    const wasEmpty = holders.size === 0;
    holders.add(id);
    if (wasEmpty) handlers.control(true);
  }
  function release(id) {
    if (holders.delete(id) && holders.size === 0) handlers.control(false);
  }

  function onKeyDown(e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const action = keyAction(e.code);
    if (!action) return;
    e.preventDefault();
    if (e.repeat) return;
    if (action === 'control') hold(e.code);
    else if (action === 'grab') {
      if (grabKeys.size === 0) handlers.trick('grab');
      grabKeys.add(e.code);
    } else if (action === 'kickflip' || action === 'shoveit') handlers.trick(action);
    else if (action === 'pause') handlers.pause();
    else if (action === 'mute') handlers.mute();
  }

  function onKeyUp(e) {
    if (keyAction(e.code) === 'control') release(e.code);
    else if (grabKeys.delete(e.code) && grabKeys.size === 0) handlers.trickEnd('grab');
  }

  function onBlur() {
    for (const id of [...holders]) release(id);
    if (grabKeys.size > 0) {
      grabKeys.clear();
      handlers.trickEnd('grab');
    }
  }

  function onPointerDown(e) {
    if (!e.isPrimary) return;
    canvas.focus({ preventScroll: true });
    try { canvas.setPointerCapture(e.pointerId); } catch { /* not capturable */ }
    if (e.pointerType === 'touch') {
      // Wait to see whether this touch is a tap or a scroll before it counts as a press.
      touch = { fired: false, timer: setTimeout(() => { touch.fired = true; hold('pointer'); }, TOUCH_HOLD_MS) };
    } else hold('pointer');
  }

  function onPointerUp(e) {
    if (!e.isPrimary) return;
    if (touch) {
      clearTimeout(touch.timer);
      if (!touch.fired) hold('pointer');
      touch = null;
    }
    release('pointer');
  }

  function onPointerCancel(e) {
    if (e && e.isPrimary === false) return;
    if (touch) {
      clearTimeout(touch.timer);
      touch = null;
    }
    release('pointer');
  }

  canvas.addEventListener('keydown', onKeyDown);
  canvas.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('blur', onBlur);
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerCancel);
  return () => {
    if (touch) clearTimeout(touch.timer);
    canvas.removeEventListener('keydown', onKeyDown);
    canvas.removeEventListener('keyup', onKeyUp);
    canvas.removeEventListener('blur', onBlur);
    canvas.removeEventListener('pointerdown', onPointerDown);
    canvas.removeEventListener('pointerup', onPointerUp);
    canvas.removeEventListener('pointercancel', onPointerCancel);
  };
}
