// Retro dusk palettes. Every phase shares one set of foreground colours, and every
// background is dark enough that foregrounds pass contrast against any background of any phase.
const FG = { text: '#F4EFE6', textLit: '#FFD23F', board: '#F4EFE6', rider: '#F4EFE6' };

export const PHASES = [
  { name: 'dusk', skyBands: ['#1B1038', '#2E1450', '#4B1A5E', '#6B1E5A'], ridge: '#2A1048', hills: '#1E0C38', ground: '#12082A', ...FG },
  { name: 'night', skyBands: ['#0A1230', '#0F1B45', '#16295A', '#1D3566'], ridge: '#101C48', hills: '#0B1438', ground: '#070C28', ...FG },
  { name: 'ember', skyBands: ['#2A0F1E', '#4A1424', '#6E1B1F', '#8A2A14'], ridge: '#3A1020', hills: '#2A0C1A', ground: '#1A0812', ...FG },
  { name: 'dawn', skyBands: ['#0F2A35', '#14394A', '#1B4A52', '#2A5B4F'], ridge: '#12303C', hills: '#0D2430', ground: '#08171F', ...FG },
];

export const FLAT_PHASE = { ...PHASES[0], name: 'flat' };

export const CYCLE_SECONDS = 180;
const PHASE_SECONDS = CYCLE_SECONDS / PHASES.length;
const TRANSITION_SECONDS = 6; // last seconds of each phase, bands flip one at a time

export function phaseAt(t) {
  const c = ((t % CYCLE_SECONDS) + CYCLE_SECONDS) % CYCLE_SECONDS;
  const i = Math.floor(c / PHASE_SECONDS);
  const into = c - i * PHASE_SECONDS;
  const left = PHASE_SECONDS - into;
  const mix = left > TRANSITION_SECONDS ? 0 : Math.min(1, Math.floor(((TRANSITION_SECONDS - left) / TRANSITION_SECONDS) * 4 + 1) / 4);
  return { from: PHASES[i], to: PHASES[(i + 1) % PHASES.length], mix };
}

function channel(v) {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function luminance(hex) {
  const n = parseInt(hex.slice(1), 16);
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}

export function contrast(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
