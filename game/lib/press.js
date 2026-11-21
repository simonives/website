// A press that begins and ends between two fixed steps (a quick tap) must still reach the next step.
export function createPressLatch() {
  let held = false;
  let queued = false;
  return {
    press() { held = true; queued = true; },
    release() { held = false; },
    // True while held, and once for a press already released; call once per step.
    take() {
      const v = held || queued;
      queued = false;
      return v;
    },
  };
}
