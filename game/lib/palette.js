// Retro dusk palettes. Every phase shares one set of foreground colours, and every
// background is dark enough that foregrounds pass contrast against any background of any phase.
const FG = { text: '#F4EFE6', textLit: '#FFD23F', board: '#F4EFE6', rider: '#F4EFE6' };

export const PHASES = [
  { name: 'dusk', skyBands: ['#1B1038', '#2E1450', '#4B1A5E', '#6B1E5A'], ridge: '#2A1048', hills: '#1E0C38', ground: '#12082A', ...FG },
  { name: 'night', skyBands: ['#0A1230', '#0F1B45', '#16295A', '#1D3566'], ridge: '#101C48', hills: '#0B1438', ground: '#070C28', ...FG },
  { name: 'ember', skyBands: ['#2A0F1E', '#4A1424', '#6E1B1F', '#8A2A14'], ridge: '#3A1020', hills: '#2A0C1A', ground: '#1A0812', ...FG },
  { name: 'dawn', skyBands: ['#0F2A35', '#14394A', '#1B4A52', '#2A5B4F'], ridge: '#12303C', hills: '#0D2430', ground: '#08171F', ...FG },
  { name: 'moss', skyBands: ['#0C2418', '#123222', '#1A4229', '#24523A'], ridge: '#10301F', hills: '#0A2216', ground: '#06150E', ...FG },
  { name: 'rose', skyBands: ['#2E1022', '#46142E', '#5E1A3A', '#7A2147'], ridge: '#3A1028', hills: '#2A0C1E', ground: '#190712', ...FG },
];

export const FLAT_PHASE = { ...PHASES[0], name: 'flat' };

const BAND_SECONDS = 0.06; // each of the four sky bands flips this long after the last

// How far through the colour change we are: 0 (old palette) to 1 (new), in quarters. Instant when reduced.
export function mixAt(elapsed, reduced) {
  if (reduced) return 1;
  if (elapsed <= 0) return 0;
  return Math.min(1, Math.floor(elapsed / BAND_SECONDS + 1e-9) * 0.25);
}

function channel(v) {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function luminance(hex) {
  const n = parseInt(hex.slice(1), 16);
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}

export function contrast(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
