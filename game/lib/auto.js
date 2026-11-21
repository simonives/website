// Auto-ride: decides ollies and tricks for a visitor who wants the motion without the input.
const AHEAD = 0.55; // seconds of travel before a ledge, stairs, drop, rail or gap at which to ollie
const LIP = 0.12; // seconds of travel before a ramp's end at which to ollie

export function autoInput({ rider, obstacles, speed }) {
  if (!rider.grounded) {
    const next = obstacles.find((o) => o.x + o.width >= rider.x);
    const odd = next && next.id ? next.id.length % 2 === 1 : false;
    return { ollieDown: false, trick: odd ? 'kickflip' : 'shoveit' };
  }
  const on = obstacles.find((o) => rider.x >= o.x && rider.x <= o.x + o.width);
  if (on) return { ollieDown: on.kind === 'ramp' && on.x + on.width - rider.x < LIP * speed, trick: null };
  const next = obstacles.find((o) => o.x > rider.x);
  return { ollieDown: !!next && next.kind !== 'ramp' && next.x - rider.x < AHEAD * speed, trick: null };
}
