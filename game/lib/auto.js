// Auto-ride: decides ollies and tricks for a visitor who wants the motion without the input.
const LOOKAHEAD = 150;

export function autoInput({ rider, obstacles }) {
  if (!rider.grounded) {
    const next = obstacles.find((o) => o.x + o.width >= rider.x);
    const odd = next ? next.id.length % 2 === 1 : false;
    return { ollieDown: false, trick: odd ? 'kickflip' : 'shoveit' };
  }
  const near = obstacles.some((o) => o.x > rider.x && o.x - rider.x < LOOKAHEAD);
  return { ollieDown: near, trick: null };
}
