import { height, slope } from './terrain.js';
import { OBSTACLE_H, CHAR_W } from './obstacles.js';

const FONT = 'ui-monospace, "SF Mono", Menlo, Consolas, monospace';
const VIEW_H = 320; // world units visible vertically
const RIDER_X = 0.3; // rider's horizontal position as a fraction of canvas width
const BOARD_TEXT = 'SIMON IVES';
const BOARD_CHAR = 11; // world units per board letter
const LINE = 3.5; // CSS px stroke weight

// Distant silhouette height above the baseline, in world units.
function silhouette(wx, amp, phase) {
  return amp * (0.55 + 0.45 * Math.sin(wx * 0.004 + phase)) + amp * 0.25 * Math.sin(wx * 0.013 + phase * 2);
}

export function createRenderer(canvas, opts = {}) {
  const ctx = canvas.getContext('2d');
  let w = 0;
  let h = 0;
  let dpr = 1;

  function resize() {
    w = canvas.clientWidth || 0;
    h = canvas.clientHeight || 0;
    dpr = globalThis.devicePixelRatio || 1;
    if (w <= 0 || h <= 0) return;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
  }

  function wrap(text, maxW) {
    const lines = [];
    let line = '';
    for (const word of text.split(' ')) {
      const next = line ? `${line} ${word}` : word;
      if (line && ctx.measureText(next).width > maxW) {
        lines.push(line);
        line = word;
      } else line = next;
    }
    if (line) lines.push(line);
    return lines;
  }

  function plate(lines, colours, size, y) {
    const pad = 10;
    const lh = size * 1.35;
    let widest = 0;
    for (const l of lines) widest = Math.max(widest, ctx.measureText(l).width);
    const bw = widest + pad * 2;
    const bh = lines.length * lh + pad * 2;
    ctx.fillStyle = colours.ground;
    ctx.fillRect((w - bw) / 2, y, bw, bh);
    ctx.fillStyle = colours.text;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    lines.forEach((l, i) => ctx.fillText(l, w / 2, y + pad + i * lh));
  }

  function draw(f) {
    if (w <= 0 || h <= 0) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const sc = h / VIEW_H;
    const baseY = h * 0.7;
    const camX = f.cameraX;
    const P = f.phase.from;
    const toX = (wx, parallax = 1) => (wx - camX * parallax) * sc + w * RIDER_X;
    const fromX = (sx, parallax = 1) => (sx - w * RIDER_X) / sc + camX * parallax;

    // Sky: stepped bands, flipping one at a time to the next phase during a transition.
    const flipped = Math.round(f.phase.mix * 4);
    const bandH = baseY / 4;
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = i < flipped ? f.phase.to.skyBands[i] : P.skyBands[i];
      ctx.fillRect(0, i * bandH, w, bandH + 1);
    }

    // Parallax silhouettes (one band under reduced motion).
    const layers = opts.reducedMotion
      ? [{ par: 0.4, off: 40, amp: 30, ph: 1, c: P.hills }]
      : [
          { par: 0.15, off: 90, amp: 40, ph: 0, c: P.ridge },
          { par: 0.4, off: 40, amp: 30, ph: 1, c: P.hills },
        ];
    for (const L of layers) {
      ctx.fillStyle = L.c;
      ctx.beginPath();
      ctx.moveTo(0, h);
      for (let sx = 0; sx <= w + 8; sx += 8) {
        ctx.lineTo(sx, baseY - (L.off + silhouette(fromX(sx, L.par), L.amp, L.ph)) * sc);
      }
      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.fill();
    }

    // Ground fill and line.
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let sx = 0; sx <= w + 6; sx += 6) ctx.lineTo(sx, baseY - height(fromX(sx)) * sc);
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fillStyle = P.ground;
    ctx.fill();
    ctx.beginPath();
    for (let sx = 0; sx <= w + 6; sx += 6) {
      const y = baseY - height(fromX(sx)) * sc;
      if (sx === 0) ctx.moveTo(sx, y);
      else ctx.lineTo(sx, y);
    }
    ctx.strokeStyle = P.board;
    ctx.lineWidth = LINE;
    ctx.lineJoin = 'round';
    ctx.stroke();

    // Phrase obstacles: each letter sits on a ledge that follows the terrain.
    const fontPx = Math.max(16, 12 * sc);
    ctx.font = `bold ${fontPx}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    for (const o of f.obstacles) {
      if (toX(o.x + o.width) < -20 || toX(o.x) > w + 20) continue;
      ctx.fillStyle = o.lit ? P.textLit : P.text;
      for (let i = 0; i < o.label.length; i++) {
        const wx = o.x + (i + 0.5) * CHAR_W;
        ctx.save();
        ctx.translate(toX(wx), baseY - (height(wx) + OBSTACLE_H) * sc);
        ctx.rotate(-Math.atan(slope(wx)));
        ctx.fillText(o.label[i], 0, 0);
        ctx.restore();
      }
    }

    // Board (the name) and rider.
    const r = f.rider;
    const t = f.trick;
    const p = t.active ? t.progress : 0;
    const spread = t.active === 'shoveit' ? Math.cos(2 * Math.PI * p) : 1;
    const flipY = t.active === 'kickflip' ? Math.cos(2 * Math.PI * p) : 1;
    ctx.save();
    ctx.translate(w * RIDER_X, baseY - (r.y + 4) * sc);
    ctx.rotate(-r.angle);
    ctx.fillStyle = P.board;
    ctx.font = `bold ${Math.max(16, 12 * sc)}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    const n = BOARD_TEXT.length;
    for (let i = 0; i < n; i++) {
      ctx.save();
      ctx.translate((i - (n - 1) / 2) * BOARD_CHAR * sc * spread, 0);
      ctx.scale(1, flipY === 0 ? 0.01 : flipY);
      ctx.fillText(BOARD_TEXT[i], 0, 0);
      ctx.restore();
    }
    // Line-figure rider standing on the board.
    const k = sc * 0.9;
    ctx.strokeStyle = P.rider;
    ctx.lineWidth = LINE;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-10 * k, -16 * k); ctx.lineTo(-8 * k, -30 * k); ctx.lineTo(0, -46 * k);
    ctx.moveTo(10 * k, -16 * k); ctx.lineTo(8 * k, -30 * k); ctx.lineTo(0, -46 * k);
    ctx.lineTo(1 * k, -74 * k);
    ctx.moveTo(1 * k, -70 * k); ctx.lineTo(-14 * k, -60 * k);
    ctx.moveTo(1 * k, -70 * k); ctx.lineTo(16 * k, -62 * k);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(2 * k, -84 * k, 6 * k, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // Quiet streak indicator: one dot per clean trick in a row (max 8).
    if (t.streak > 0) {
      ctx.fillStyle = P.textLit;
      for (let i = 0; i < Math.min(t.streak, 8); i++) {
        ctx.beginPath();
        ctx.arc(20 + i * 16, h - 20, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Caption and paused overlay.
    if (f.caption) {
      ctx.font = `18px ${FONT}`;
      plate(wrap(f.caption, Math.min(w * 0.8, 640)), P, 18, 64);
    }
    if (f.paused) {
      ctx.font = `20px ${FONT}`;
      plate(['Press Space to ride', 'or tap the screen'], P, 20, h * 0.3);
    }
  }

  return { resize, draw };
}
