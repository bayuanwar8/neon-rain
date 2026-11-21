// NEON RAIN — lettering drawn in code: chrome title, neon script, ribbon,
// name tags with location/time/micro-story, quote bar, seal, barcode, billing.

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function fitFont(ctx, text, fontFamily, maxW, startPx, weight = '') {
  let px = startPx;
  while (px > 12) {
    ctx.font = `${weight} ${px}px ${fontFamily}`;
    if (ctx.measureText(text).width <= maxW) break;
    px -= 2;
  }
  return px;
}

// Striped-chrome title: the stripes live IN the fill gradient (hard stops),
// so the outline stays intact; gloss is clipped to the letters via source-atop.
export function drawChromeTitle(ctx, text, box, fontFamily) {
  const W = Math.ceil(box.w), H = Math.ceil(box.h);
  const layer = document.createElement('canvas');
  layer.width = W; layer.height = H;
  const c = layer.getContext('2d');
  const px = fitFont(c, text, fontFamily, W * 0.96, H * 0.92, '900');
  c.textAlign = 'center'; c.textBaseline = 'middle';
  const cx = W / 2, cy = H / 2;
  c.font = `900 ${px}px ${fontFamily}`;
  // Extrude: dark offset copies downwards for depth against busy photos.
  c.fillStyle = '#0a0618';
  const ex = Math.max(3, Math.round(px * 0.08));
  for (let i = 1; i <= ex; i++) c.fillText(text, cx, cy + i);
  // Main fill: vertical striped chrome (white -> gold -> orange -> magenta -> cyan).
  const grad = c.createLinearGradient(0, cy - px * 0.5, 0, cy + px * 0.5);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.20, '#ffe27a');
  grad.addColorStop(0.22, '#ffb347');
  grad.addColorStop(0.44, '#ff7a3c');
  grad.addColorStop(0.46, '#e8318a');
  grad.addColorStop(0.66, '#ff5da2');
  grad.addColorStop(0.68, '#7ee7ff');
  grad.addColorStop(0.86, '#22d3ee');
  grad.addColorStop(0.88, '#ffffff');
  grad.addColorStop(1, '#dff6ff');
  c.fillStyle = grad;
  c.fillText(text, cx, cy);
  // Thick dark outline so the letters separate from any photo behind them.
  c.lineWidth = Math.max(3, px * 0.05);
  c.lineJoin = 'round';
  c.strokeStyle = '#0a0618';
  c.strokeText(text, cx, cy);
  // Gloss: soft white sheen, clipped to the painted letters only.
  c.globalCompositeOperation = 'source-atop';
  const gloss = c.createLinearGradient(0, cy - px * 0.5, W, cy + px * 0.2);
  gloss.addColorStop(0, 'rgba(255,255,255,0.28)');
  gloss.addColorStop(0.5, 'rgba(255,255,255,0)');
  gloss.addColorStop(1, 'rgba(255,255,255,0.12)');
  c.fillStyle = gloss;
  c.fillRect(0, 0, W, H);
  c.globalCompositeOperation = 'source-over';
  // Sparkles at deterministic spots.
  c.fillStyle = '#fff';
  const spots = [[0.12, 0.2], [0.86, 0.3], [0.5, 0.12], [0.68, 0.85], [0.3, 0.9]];
  for (const [fx, fy] of spots) {
    const sx = fx * W, sy = fy * H, r = Math.max(2, px * 0.03);
    c.beginPath();
    c.moveTo(sx, sy - r); c.lineTo(sx + r * 0.28, sy - r * 0.28); c.lineTo(sx + r, sy);
    c.lineTo(sx + r * 0.28, sy + r * 0.28); c.lineTo(sx, sy + r); c.lineTo(sx - r * 0.28, sy + r * 0.28);
    c.lineTo(sx - r, sy); c.lineTo(sx - r * 0.28, sy - r * 0.28); c.closePath(); c.fill();
  }
  ctx.drawImage(layer, box.x, box.y);
}

export function drawNeonScript(ctx, text, box, fontFamily) {
  const px = fitFont(ctx, text, fontFamily, box.w * 0.96, box.h * 0.95);
  ctx.save();
  ctx.font = `${px}px ${fontFamily}`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.shadowColor = '#ff4fd8'; ctx.shadowBlur = px * 0.35;
  ctx.fillStyle = '#ffd7f2';
  ctx.fillText(text, box.x + box.w / 2, box.y + box.h / 2);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#ff7ae0';
  ctx.fillText(text, box.x + box.w / 2, box.y + box.h / 2);
  ctx.restore();
}

export function drawTagline(ctx, text, box) {
  const px = Math.min(box.h * 0.62, 30);
  ctx.save();
  ctx.fillStyle = 'rgba(8,10,28,0.85)';
  roundRect(ctx, box.x, box.y, box.w, box.h, box.h / 2);
  ctx.fill();
  ctx.strokeStyle = '#22d3ee'; ctx.lineWidth = Math.max(1, box.h * 0.05);
  roundRect(ctx, box.x, box.y, box.w, box.h, box.h / 2);
  ctx.stroke();
  ctx.font = `700 ${px}px "NR Anton", sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#eaf6ff';
  const t = text.length > 44 ? text.slice(0, 44) : text;
  ctx.fillText(t, box.x + box.w / 2, box.y + box.h / 2 + px * 0.05);
  ctx.restore();
}

// Name tag + location/time/micro-story line, stacked from the panel bottom
// with a real gap and a dark pill behind the micro-line, so both lines stay
// fully visible and readable in every ratio (the old version parked the
// micro-line 3px above the tag box at 9px with no backing — a smudge at
// thumbnail size). The loc font fits the panel width, never squashed.
export function drawNameTag(ctx, panel, tag, loc) {
  const { x, y, w, h } = panel;
  const tagH = Math.max(20, h * 0.085);
  const margin = Math.max(8, h * 0.03);
  const gap = Math.max(5, h * 0.012);
  ctx.save();
  // Loc line: size to fit the panel width.
  let lp = Math.max(11, tagH * 0.42);
  const locText = loc ? loc.slice(0, 52) : '';
  ctx.font = `700 ${lp}px system-ui, sans-serif`;
  while (lp > 9 && ctx.measureText(locText).width > w - 28) {
    lp -= 1;
    ctx.font = `700 ${lp}px system-ui, sans-serif`;
  }
  const locW = locText ? ctx.measureText(locText).width : 0;
  const tagTop = y + h - margin - tagH;
  const locBottom = tagTop - gap;
  const locTop = locBottom - lp - 6;
  if (locText) {
    ctx.fillStyle = 'rgba(5,7,18,0.82)';
    roundRect(ctx, x + 6, locTop, Math.min(locW + 16, w - 12), lp + 6, 3);
    ctx.fill();
    ctx.fillStyle = 'rgba(230,242,255,0.95)';
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(locText, x + 14, locTop + (lp + 6) / 2);
  }
  ctx.font = `700 ${tagH * 0.58}px "NR Anton", sans-serif`;
  const tw = ctx.measureText(tag).width + tagH * 1.1;
  ctx.fillStyle = 'rgba(5,7,18,0.88)';
  roundRect(ctx, x + 6, tagTop, Math.min(tw, w - 12), tagH, 3);
  ctx.fill();
  ctx.fillStyle = '#ffd23f';
  ctx.fillRect(x + 6, tagTop, tagH * 0.22, tagH);
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText(tag, x + 6 + tagH * 0.42, tagTop + tagH / 2 + 1);
  ctx.restore();
}

export function drawQuoteBar(ctx, w, quote, source, edition) {
  const h = Math.round(w * 0.052);
  ctx.save();
  ctx.fillStyle = '#0a0f28';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#ffd23f';
  ctx.font = `${Math.round(h * 0.5)}px sans-serif`;
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  const stars = '★★★★★';
  const starW = ctx.measureText(stars).width;
  const starX = w * 0.015;
  ctx.fillText(stars, starX, h / 2 + 1);
  // Quote starts after the measured stars + a clear gap (the old fixed
  // 0.115w start ran the quote straight into the fifth star).
  const gap = w * 0.018;
  let qx = starX + starW + gap;
  const quoteText = `"${quote}"`;
  const srcText = '— ' + source;
  let qpx = Math.round(h * 0.42);
  ctx.font = `italic 700 ${qpx}px Georgia, serif`;
  let quoteW = ctx.measureText(quoteText).width;
  ctx.font = `700 ${Math.round(h * 0.4)}px "NR Anton", sans-serif`;
  const ew = ctx.measureText(edition).width + h * 0.5;
  const editionX = w - ew - w * 0.015;
  ctx.font = `700 ${Math.round(h * 0.34)}px "NR Anton", sans-serif`;
  const srcW = ctx.measureText(srcText).width;
  while (qpx > 12 && qx + quoteW + gap + srcW > editionX - gap) {
    qpx -= 1;
    ctx.font = `italic 700 ${qpx}px Georgia, serif`;
    quoteW = ctx.measureText(quoteText).width;
  }
  ctx.fillStyle = '#fff';
  ctx.font = `italic 700 ${qpx}px Georgia, serif`;
  ctx.fillText(quoteText, qx, h / 2);
  ctx.fillStyle = '#9db0e0';
  ctx.font = `700 ${Math.round(h * 0.34)}px "NR Anton", sans-serif`;
  ctx.fillText(srcText, qx + quoteW + gap, h / 2);
  // Edition box, right.
  ctx.font = `700 ${Math.round(h * 0.4)}px "NR Anton", sans-serif`;
  ctx.fillStyle = '#e8318a';
  roundRect(ctx, editionX, h * 0.16, ew, h * 0.68, 3);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.fillText(edition, editionX + ew / 2, h / 2 + 1);
  ctx.restore();
  return h;
}

export function drawSeal(ctx, cx, cy, r, text) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.beginPath();
  const spikes = 16;
  for (let i = 0; i < spikes * 2; i++) {
    const rad = i % 2 === 0 ? r : r * 0.82;
    const a = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2;
    const px = Math.cos(a) * rad, py = Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = '#f5b301';
  ctx.fill();
  ctx.lineWidth = Math.max(1.5, r * 0.05);
  ctx.strokeStyle = '#7a5200';
  ctx.stroke();
  ctx.beginPath(); ctx.arc(0, 0, r * 0.68, 0, Math.PI * 2);
  ctx.fillStyle = '#ffe27a'; ctx.fill();
  ctx.fillStyle = '#3a2500';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const words = text.split(' ');
  const fs = Math.max(8, r * 0.2);
  ctx.font = `700 ${fs}px "NR Anton", sans-serif`;
  const lines = words.length > 2 ? [words.slice(0, 2).join(' '), words.slice(2).join(' ')] : [text];
  lines.forEach((ln, i) => ctx.fillText(ln, 0, (i - (lines.length - 1) / 2) * fs * 1.15));
  ctx.restore();
}

export function drawBarcode(ctx, x, y, w, h, code) {
  ctx.save();
  ctx.fillStyle = '#fff';
  ctx.fillRect(x - 4, y - 4, w + 8, h + 14);
  ctx.fillStyle = '#111';
  let px = x;
  const seed = [...code].reduce((a, c) => a + c.charCodeAt(0), 7);
  for (let i = 0; px < x + w && i < 60; i++) {
    const bw = 1 + ((seed * (i + 3) * 7) % 4);
    if ((seed + i * 5) % 3 !== 0) ctx.fillRect(px, y, bw, h);
    px += bw + 1 + ((seed + i) % 2);
  }
  ctx.font = `11px monospace`;
  ctx.textAlign = 'center';
  ctx.fillText(code, x + w / 2, y + h + 11);
  ctx.restore();
}

export function drawBilling(ctx, text, box) {
  ctx.save();
  ctx.fillStyle = '#c8d4f2';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const words = text.split(' ');
  const lines = [];
  let line = '';
  ctx.font = `600 ${box.h * 0.42}px system-ui, sans-serif`;
  for (const wd of words) {
    const test = line ? line + ' ' + wd : wd;
    if (ctx.measureText(test).width > box.w * 0.96 && line) { lines.push(line); line = wd; }
    else line = test;
  }
  if (line) lines.push(line);
  const lh = box.h / Math.max(2, lines.length);
  lines.slice(0, 2).forEach((ln, i) => ctx.fillText(ln.toUpperCase(), box.x + box.w / 2, box.y + lh * (i + 0.5)));
  ctx.restore();
}
