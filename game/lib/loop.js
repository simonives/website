// Fixed-step accumulator. advance(nowMs) returns how many fixed steps to run this frame.
export function createLoop(stepMs = 1000 / 60, maxFrameMs = 100) {
  let last = null;
  let acc = 0;
  return {
    advance(nowMs) {
      if (last === null) {
        last = nowMs;
        return 0;
      }
      acc += Math.min(Math.max(nowMs - last, 0), maxFrameMs);
      last = nowMs;
      const steps = Math.floor(acc / stepMs + 1e-9);
      acc -= steps * stepMs;
      return steps;
    },
  };
}
