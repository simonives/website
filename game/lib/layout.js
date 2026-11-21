export function groundLine(canvasHeight) {
  if (typeof canvasHeight !== 'number' || !Number.isFinite(canvasHeight) || canvasHeight <= 0) return 0;
  const y = Math.round(0.78 * canvasHeight);
  if (canvasHeight >= 280) return Math.min(canvasHeight - 40, Math.max(0.5 * canvasHeight, y));
  return y;
}
