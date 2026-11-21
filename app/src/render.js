// NEON RAIN — cover composer: ground, panels, title, script, tags, quote bar,
// seal, barcode, billing, rain, grain. Renders at exact pixel size, offscreen.

import { SIZES } from './state.js';
import { getLayout } from './layouts.js';
import { bakePhoto, gradeById } from './grades.js';
import { findFace, smartCrop } from './face.js';
import { photoByFile } from './photos.js';
import { drawGround, drawSkyline, drawWetAsphalt, drawRain, drawTitleGlow, drawGrain } from './decor.js';
import { drawChromeTitle, drawNeonScript, drawTagline, drawNameTag, drawQuoteBar, drawSeal, drawBarcode, drawBilling, roundRect } from './lettering.js';

function panelPath(ctx, x, y, w, h, slant = 0) {
  ctx.beginPath();
  ctx.moveTo(x + slant, y);
  ctx.lineTo(x + w + slant, y);
  ctx.lineTo(x + w - slant, y + h);
  ctx.lineTo(x - slant, y + h);
  ctx.closePath();
}

function drawPanel(ctx, baked, faceBox, panelDoc, rect, W, H) {
  const x = rect.x * W, y = rect.y * H, w = rect.w * W, h = rect.h * H;
  const slant = (rect.slant || 0) * W;
  // Soft drop shadow.
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  panelPath(ctx, x + 5, y + 6, w, h, slant);
  ctx.fill();
  ctx.restore();
  ctx.save();
  panelPath(ctx, x, y, w, h, slant);
  ctx.clip();
  if (baked) {
    const aspect = w / h;
    const crop = smartCrop({ w: baked.width, h: baked.height, face: faceBox, img: baked }, aspect, panelDoc.variant || 0);
    // A no-face scene in a narrow/tall panel: a cover crop would slice the
    // sign (the motel's VACANCY loses its V when the crop is < half the photo).
    // Show the whole photo instead, centred over a dark blurred cover fill.
    const tooNarrow = !faceBox && (crop.sw < baked.width * 0.5 || crop.sh < baked.height * 0.5);
    if (tooNarrow) {
      ctx.save();
      try { ctx.filter = 'blur(14px) brightness(0.4)'; } catch (e) { /* filter unsupported: darkened cover still fills */ }
      ctx.drawImage(baked, 0, 0, baked.width, baked.height, x, y, w, h);
      try { ctx.filter = 'none'; } catch (e) {}
      ctx.fillStyle = 'rgba(6,8,22,0.25)';
      ctx.fillRect(x, y, w, h);
      ctx.restore();
      const sc = Math.min(w / baked.width, h / baked.height);
      const dw = baked.width * sc, dh = baked.height * sc;
      if (panelDoc.flip) {
        ctx.save();
        ctx.translate(x + w, y);
        ctx.scale(-1, 1);
        ctx.drawImage(baked, (w - dw) / 2, (h - dh) / 2, dw, dh);
        ctx.restore();
      } else {
        ctx.drawImage(baked, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
      }
    } else {
    // Zoom around the crop centre, then pan.
    let { sx, sy, sw, sh } = crop;
    const z = panelDoc.zoom || 1;
    sw /= z; sh /= z;
    sx += (crop.sw - sw) / 2 + (panelDoc.panX || 0) * sw;
    sy += (crop.sh - sh) / 2 + (panelDoc.panY || 0) * sh;
    sx = Math.max(0, Math.min(baked.width - sw, sx));
    sy = Math.max(0, Math.min(baked.height - sh, sy));
    if (panelDoc.flip) {
      ctx.translate(x + w, y);
      ctx.scale(-1, 1);
      ctx.drawImage(baked, sx, sy, sw, sh, 0, 0, w, h);
    } else {
      ctx.drawImage(baked, sx, sy, sw, sh, x, y, w, h);
    }
    }
  } else {
    ctx.fillStyle = '#101736';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#5a6b9a';
    ctx.font = `700 ${Math.round(h * 0.09)}px "NR Anton", sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('ADD PHOTO', x + w / 2, y + h / 2);
  }
  // Rain streaks inside the panel + faint matte.
  ctx.fillStyle = 'rgba(10,16,42,0.10)';
  ctx.fillRect(x, y, w, h);
  ctx.restore();
  // Keyline, drawn after the grade so it stays crisp.
  ctx.save();
  panelPath(ctx, x, y, w, h, slant);
  ctx.lineWidth = Math.max(2, W * 0.002);
  ctx.strokeStyle = 'rgba(190,235,255,0.85)';
  ctx.stroke();
  ctx.restore();
  return { x, y, w, h };
}

export function renderCover(doc, sizeKey, opts = {}) {
  const size = SIZES[sizeKey] || SIZES['16x9'];
  const W = size.w, H = size.h;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  const layout = getLayout(doc.layout, sizeKey);
  const grade = gradeById(doc.grade);

  drawGround(ctx, W, H);
  // Wet asphalt band along the bottom, skyline silhouettes above it.
  drawWetAsphalt(ctx, W, H * 0.90, H * 0.10);
  drawSkyline(ctx, W, H, H * 0.905);

  // Panels (hero pop-out is drawn after the title).
  const drawn = [];
  for (let i = 0; i < layout.panels.length; i++) {
    const pdoc = doc.panels[i];
    if (!pdoc) continue;
    const rect = layout.panels[i];
    if (rect.pop && i === layout.hero) { drawn.push({ i, rect, pdoc, pop: true }); continue; }
    const photo = pdoc.photo ? photoByFile(pdoc.photo) : null;
    const baked = photo ? bakePhoto(photo, grade, findFace(photo)) : null;
    const faceBox = photo ? findFace(photo) : null;
    drawn.push({ i, rect, pdoc, box: drawPanel(ctx, baked, faceBox, pdoc, rect, W, H) });
  }

  // Title glow + chrome title + script + tagline.
  const tz = layout.title;
  drawTitleGlow(ctx, { x: tz.x * W, y: tz.y * H, w: tz.w * W, h: tz.h * H });
  const titleFont = doc.titleFont === 'serif' ? '"NR Playfair", serif' : '"NR Anton", sans-serif';
  drawChromeTitle(ctx, doc.title || 'NEON RAIN', { x: tz.x * W, y: tz.y * H, w: tz.w * W, h: tz.h * H }, titleFont);
  const sz = layout.script;
  drawNeonScript(ctx, doc.script || 'Every drop tells', { x: sz.x * W, y: sz.y * H, w: sz.w * W, h: sz.h * H }, '"NR Caveat", cursive');
  const gz = layout.tagline;
  drawTagline(ctx, doc.tagline || '', { x: gz.x * W, y: gz.y * H, w: gz.w * W, h: gz.h * H });

  // Hero pop-out: drawn after the title so it overlaps the title zone.
  for (const d of drawn.filter((e) => e.pop)) {
    const photo = d.pdoc.photo ? photoByFile(d.pdoc.photo) : null;
    const baked = photo ? bakePhoto(photo, grade, findFace(photo)) : null;
    const faceBox = photo ? findFace(photo) : null;
    const rect = { ...d.rect, y: d.rect.y - 0.015, h: d.rect.h + 0.03 };
    d.box = drawPanel(ctx, baked, faceBox, d.pdoc, rect, W, H);
    d.rect = rect;
  }

  // Name tags + micro-lines on every panel.
  for (const d of drawn) {
    if (!d.box) continue;
    drawNameTag(ctx, d.box, d.pdoc.tag || '', d.pdoc.loc || '');
  }

  // Quote bar on top, seal, barcode, billing, release line.
  drawQuoteBar(ctx, W, doc.quote || '', doc.quoteSource || '', doc.edition || 'VOL. 1');
  const sealR = W * 0.048;
  drawSeal(ctx, W * 0.945, H * 0.825, sealR, doc.seal || 'ORIGINAL COVER ART');
  drawBarcode(ctx, W * 0.90, H * 0.955, W * 0.075, H * 0.016, '0 19872 05991 8');
  drawBilling(ctx, doc.billing || '', { x: W * 0.16, y: H * 0.945, w: W * 0.68, h: H * 0.045 });
  ctx.save();
  ctx.fillStyle = '#ff5da2';
  ctx.font = `700 ${Math.round(H * 0.022)}px "NR Anton", sans-serif`;
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText(doc.release || 'COMING SOON', W * 0.015, H * 0.968);
  ctx.restore();

  // Rain over everything, then grain.
  drawRain(ctx, W, H, 42);
  drawGrain(ctx, W, H, 5);
  return canvas;
}

export function renderCoverDataURL(doc, sizeKey) {
  return renderCover(doc, sizeKey).toDataURL('image/png');
}

// Panel hit-test: which panel contains the point (in cover-relative coords)?
export function panelAt(doc, sizeKey, rx, ry) {
  const layout = getLayout(doc.layout, sizeKey);
  for (let i = layout.panels.length - 1; i >= 0; i--) {
    const p = layout.panels[i];
    if (rx >= p.x && rx <= p.x + p.w && ry >= p.y && ry <= p.y + p.h) return i;
  }
  return -1;
}
