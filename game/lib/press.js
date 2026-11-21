// A press that begins and ends between two fixed steps (a quick tap) must still reach the next step.
export function createPressLatch() {
  let held = false;
  let queued = false;
  let deferred = false;
  return {
    press() { held = true; queued = true; },
    release() { held = false; },
    // Restore a press consumed on a wall-hit step so it fires on the next grounded step.
    requeue() { deferred = true; },
    // True while held, and once for a press already released; call once per step.
    take(grounded = true) {
      if (deferred) {
        if (!grounded) return false;
        deferred = false;
        queued = false;
        return true;
      }
      const v = held || queued;
      queued = false;
      return v;
    },
  };
}
