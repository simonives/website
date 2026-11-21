import { height as terrainHeight } from './terrain.js';
import { createGround } from './ground.js';
import { groundLine } from './layout.js';

const FONT = 'ui-monospace, "SF Mono", Menlo, Consolas, monospace';
const VIEW_H = 320; // world units visible vertically
const RIDER_X = 0.3; // rider's horizontal position as a fraction of canvas width
const BOARD_TEXT = 'SIMON IVES';
const LINE = 3.5; // CSS px stroke weight
// One world unit is about 2 cm (the rider is 90 units, so about 1.8 m). Text is texture here, not copy.
const BOARD_LEN = 44; // an 88 cm deck
const KICK = 6; // nose and tail rise 12 cm
const TEXT_U = 5; // glyph size of obstacle texture, in world units
const ROW_U = 5.5; // spacing between texture rows

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
    const baseY = groundLine(h);
    const camX = f.cameraX;
    const camY = f.cameraY || 0;
    const P = f.phase.from;
    const ground = createGround(f.obstacles);
    const toX = (wx, parallax = 1) => (wx - camX * parallax) * sc + w * RIDER_X;
    const toY = (wy, parallax = 1) => baseY - (wy - camY * parallax) * sc;
    const fromX = (sx, parallax = 1) => (sx - w * RIDER_X) / sc + camX * parallax;

    // Sky: stepped bands, flipping one at a time to the next palette during a colour change.
    const flipped = Math.round(f.phase.mix * 4);
    const bandH = baseY / 4;
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = i < flipped ? f.phase.to.skyBands[i] : P.skyBands[i];
      ctx.fillRect(0, i * bandH, w, bandH + 1);
    }

    // Parallax silhouettes (one band under reduced motion). Their colours also follow the colour change.
    const T = f.phase.mix >= 0.5 ? f.phase.to : P;
    const layers = opts.reducedMotion
      ? [{ par: 0.4, off: 40, amp: 30, ph: 1, c: T.hills }]
      : [
          { par: 0.15, off: 90, amp: 40, ph: 0, c: T.ridge },
          { par: 0.4, off: 40, amp: 30, ph: 1, c: T.hills },
        ];
    for (const L of layers) {
      ctx.fillStyle = L.c;
      ctx.beginPath();
      ctx.moveTo(0, h);
      for (let sx = 0; sx <= w + 8; sx += 8) {
        ctx.lineTo(sx, toY(L.off + silhouette(fromX(sx, L.par), L.amp, L.ph), 0.3));
      }
      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.fill();
    }

    // Ground fill and line (terrain plus obstacle offsets).
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let sx = 0; sx <= w + 4; sx += 4) ctx.lineTo(sx, toY(ground.height(fromX(sx))));
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fillStyle = T.ground;
    ctx.fill();
    ctx.beginPath();
    for (let sx = 0; sx <= w + 4; sx += 4) {
      const y = toY(ground.height(fromX(sx)));
      if (sx === 0) ctx.moveTo(sx, y);
      else ctx.lineTo(sx, y);
    }
    ctx.strokeStyle = P.board;
    ctx.lineWidth = LINE;
    ctx.lineJoin = 'round';
    ctx.stroke();

    // Obstacles are blocks of tiny repeating text, clipped to the obstacle's outline, so a ledge is
    // a slab, a ramp a wedge and stairs a staircase. The surface line is a row of letters turned to the slope.
    const glyph = Math.max(6, TEXT_U * sc);
    ctx.font = `bold ${glyph}px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    const cw = ctx.measureText('M').width || glyph * 0.6;
    for (const o of f.obstacles) {
      if (toX(o.x + o.width) < -20 || toX(o.x) > w + 20) continue;
      ctx.fillStyle = o.lit ? P.textLit : P.text;
      const x0 = Math.max(o.x, fromX(-20));
      const x1 = Math.min(o.x + o.width, fromX(w + 20));
      let lo = Infinity;
      let hi = -Infinity;
      ctx.save();
      ctx.beginPath();
      for (let wx = x0; ; wx = Math.min(wx + 4, x1)) {
        const top = ground.height(wx);
        const base = terrainHeight(wx);
        hi = Math.max(hi, top, base);
        lo = Math.min(lo, top, base);
        if (wx === x0) ctx.moveTo(toX(wx), toY(top));
        else ctx.lineTo(toX(wx), toY(top));
        if (wx >= x1) break;
      }
      for (let wx = x1; ; wx = Math.max(wx - 4, x0)) {
        ctx.lineTo(toX(wx), toY(terrainHeight(wx)));
        if (wx <= x0) break;
      }
      ctx.closePath();
      ctx.clip();
      const unit = `${o.label} `;
      const row = unit.repeat(Math.ceil(((x1 - x0) * sc) / (cw * unit.length)) + 2);
      const cwW = cw / sc;
      const skip = Math.floor((x0 - o.x) / cwW);
      const text = row.slice(skip % unit.length);
      for (let y = Math.floor(lo / ROW_U) * ROW_U; y <= hi + ROW_U; y += ROW_U) ctx.fillText(text, toX(o.x + skip * cwW), toY(y));
      ctx.restore();
      // Surface line: each letter sits on the top edge and tilts with it.
      ctx.textAlign = 'center';
      for (let wx = o.x + 2 + 5 * Math.ceil((x0 - o.x - 2) / 5); wx < x1; wx += 5) {
        ctx.save();
        ctx.translate(toX(wx), toY(ground.height(wx)));
        ctx.rotate(-Math.atan(ground.slope(wx)));
        ctx.fillText(o.label[Math.floor((wx - o.x) / 5) % o.label.length], 0, 0);
        ctx.restore();
      }
      ctx.textAlign = 'left';
    }

    // Board (the name, set along a kicked deck) and rider.
    const r = f.rider;
    const t = f.trick;
    const p = t.active === 'kickflip' || t.active === 'shoveit' ? t.progress : 0;
    // A shove-it turns the deck about its vertical axis, so at 180 degrees the name runs backwards.
    const spread = t.active === 'shoveit' ? Math.cos(2 * Math.PI * p) : 1;
    const flipY = t.active === 'kickflip' ? Math.cos(2 * Math.PI * p) : 1;
    const thin = (v) => (Math.abs(v) < 0.03 ? (v < 0 ? -0.03 : 0.03) : v);
    const grabbing = t.active === 'grab' || t.pending !== null;
    ctx.save();
    ctx.translate(w * RIDER_X, toY(r.y + 4));
    ctx.rotate(-r.angle);
    ctx.fillStyle = P.board;
    ctx.font = `bold ${Math.max(8, 6.5 * sc)}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.save();
    ctx.scale(thin(spread), thin(flipY));
    const lift = (x) => KICK * Math.pow(Math.max(0, Math.abs(x) / (BOARD_LEN / 2) - 0.55) / 0.45, 2);
    const n = BOARD_TEXT.length;
    for (let i = 0; i < n; i++) {
      const x = (-0.5 + (i + 0.5) / n) * BOARD_LEN;
      const tilt = Math.atan2(lift(x + 0.5) - lift(x - 0.5), 1);
      ctx.save();
      ctx.translate(x * sc, -lift(x) * sc);
      ctx.rotate(-tilt);
      ctx.fillText(BOARD_TEXT[i], 0, 0);
      ctx.restore();
    }
    for (const wx of [-13, 13]) {
      ctx.beginPath();
      ctx.arc(wx * sc, 2.2 * sc, 2.2 * sc, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    // Line-figure rider standing on the board; a grab reaches a hand down to it.
    const k = sc * 0.9;
    ctx.strokeStyle = P.rider;
    ctx.lineWidth = LINE;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-10 * k, -16 * k); ctx.lineTo(-8 * k, -30 * k); ctx.lineTo(0, -46 * k);
    ctx.moveTo(10 * k, -16 * k); ctx.lineTo(8 * k, -30 * k); ctx.lineTo(0, -46 * k);
    ctx.lineTo(1 * k, -74 * k);
    ctx.moveTo(1 * k, -70 * k); ctx.lineTo(16 * k, -62 * k);
    ctx.moveTo(1 * k, -70 * k);
    if (grabbing) ctx.lineTo(-12 * k, -22 * k);
    else ctx.lineTo(-14 * k, -60 * k);
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
      plate(['Press Space to ride', 'or tap the screen'], P, 20, h * 0.1);
    }
  }

  return { resize, draw };
}
