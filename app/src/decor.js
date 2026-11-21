// NEON RAIN — decoration: rain ground, wet asphalt with neon reflections,
// falling rain streaks, skyline silhouettes, title glow, film grain.
// All randomness is seeded, so repeated renders are byte-identical.

import { mulberry32 } from './face.js';

export function drawGround(ctx, w, h) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#0a0f2a');
  g.addColorStop(0.55, '#0d1338');
  g.addColorStop(1, '#070a1c');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

// Skyline silhouettes with lit windows along the bottom edge.
export function drawSkyline(ctx, w, h, y) {
  const rnd = mulberry32(20261121);
  ctx.save();
  let x = 0;
  while (x < w) {
    const bw = w * (0.03 + rnd() * 0.05);
    const bh = h * (0.05 + rnd() * 0.11);
    ctx.fillStyle = '#05070f';
    ctx.fillRect(x, y - bh, bw, bh);
    // Lit windows: sodium orange or cyan.
    const cols = Math.floor(bw / (w * 0.012));
    const rows = Math.floor(bh / (h * 0.03));
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        if (rnd() < 0.28) {
          ctx.fillStyle = rnd() < 0.6 ? 'rgba(255,170,60,0.85)' : 'rgba(80,220,255,0.8)';
          ctx.fillRect(x + c * w * 0.012 + 2, y - bh + r * h * 0.03 + 3, w * 0.006, h * 0.014);
        }
      }
    }
    x += bw + w * 0.004;
  }
  ctx.restore();
}

// Wet asphalt band with vertical neon reflection streaks.
export function drawWetAsphalt(ctx, w, y, h) {
  const rnd = mulberry32(777);
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, '#0b0e24');
  g.addColorStop(1, '#04060f');
  ctx.fillStyle = g;
  ctx.fillRect(0, y, w, h);
  const colors = ['#e8318a', '#22d3ee', '#ffb347', '#ff5da2', '#7ee7ff'];
  for (let i = 0; i < 26; i++) {
    const x = rnd() * w;
    const rw = 2 + rnd() * 7;
    const rh = h * (0.3 + rnd() * 0.65);
    const grad = ctx.createLinearGradient(0, y, 0, y + rh);
    const col = colors[i % colors.length];
    grad.addColorStop(0, col + 'cc');
    grad.addColorStop(1, col + '00');
    ctx.fillStyle = grad;
    ctx.fillRect(x, y + 2, rw, rh);
  }
}

// Falling rain streaks across the whole cover.
export function drawRain(ctx, w, h, seed = 42, count = 0) {
  const rnd = mulberry32(seed);
  const n = count || Math.round((w * h) / 9000);
  ctx.save();
  ctx.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const x = rnd() * w, y = rnd() * h;
    const len = h * (0.015 + rnd() * 0.03);
    const tilt = w * 0.008;
    ctx.strokeStyle = `rgba(190,225,255,${0.10 + rnd() * 0.22})`;
    ctx.lineWidth = 1 + rnd() * 1.4;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - tilt, y + len);
    ctx.stroke();
  }
  ctx.restore();
}

// Soft glow behind the title zone.
export function drawTitleGlow(ctx, box) {
  const cx = box.x + box.w / 2, cy = box.y + box.h / 2;
  const r = Math.max(box.w, box.h) * 0.62;
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  g.addColorStop(0, 'rgba(232,49,138,0.30)');
  g.addColorStop(0.5, 'rgba(34,211,238,0.12)');
  g.addColorStop(1, 'rgba(34,211,238,0)');
  ctx.fillStyle = g;
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
}

// One fine deterministic film grain over the whole poster.
export function drawGrain(ctx, w, h, amount = 6) {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const s = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
      const n = (s - Math.floor(s) - 0.5) * amount;
      const i = (y * w + x) * 4;
      d[i] += n; d[i + 1] += n; d[i + 2] += n;
    }
  }
  ctx.putImageData(img, 0, 0);
}
