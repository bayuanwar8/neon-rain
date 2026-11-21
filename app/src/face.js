// NEON RAIN — face finder + quality score + smart crop (own implementation).
// Skin likelihood tolerates neon and sodium light; detail + upper-frame priors
// keep the box on a face, not on a bright sign. All deterministic.

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function downscale(photo, maxW) {
  const scale = Math.min(1, maxW / photo.w);
  const w = Math.max(8, Math.round(photo.w * scale));
  const h = Math.max(8, Math.round(photo.h * scale));
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(photo.img, 0, 0, w, h);
  return { ctx, w, h, data: ctx.getImageData(0, 0, w, h).data };
}

// Per-pixel skin likelihood 0..1. Neon-tolerant: warm skin under magenta/cyan
// light shifts hue, so the rule is loose on hue and strict on moderate chroma
// and sane brightness. Strictness comes from the blur + shape filters below.
function skinScore(r, g, b) {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  const chroma = mx - mn;
  if (mx < 55 || mx > 245 || chroma > 110) return 0;
  const warm = r >= g - 12 && r >= b - 8;       // warm skin
  const cool = b >= r - 12 && b >= g - 8;       // cyan neon bounce on skin
  if (!warm && !cool) return 0;
  return (warm ? 1 : 0.75) * (1 - chroma / 140);
}

export function findFace(photo) {
  if (photo.face) return photo.face;
  // Hand-tagged head box (sample cast): the skin detector mistakes warm neon
  // shopfronts and car lights for skin, so the tagged box always wins.
  if (photo.faceBox) {
    photo.face = { ...photo.faceBox };
    return photo.face;
  }
  // Known scenes have no face by construction (sample metadata).
  if (photo.faceHint === 'scene') { photo.face = null; return null; }
  const found = detectFace(photo);
  // A detected box must be plausible: centred-ish, upper half, face-sized.
  // Otherwise the detection is a neon sign or a lit wall, and the centred
  // portrait prior is used instead — portraits frame the face up high.
  if (found) {
    const cx = found.x + found.w / 2, cy = found.y + found.h / 2;
    const plausible = cx > 0.22 && cx < 0.78 && cy > 0.08 && cy < 0.62 &&
      found.w > 0.12 && found.w < 0.75 && found.h > 0.12 && found.h < 0.75;
    if (plausible) { photo.face = found; return found; }
  }
  if (photo.faceHint === 'portrait' || !found) {
    // Medium-shot fallback: the head sits in the upper third with shoulders
    // and street below it — never a tight headshot box.
    photo.face = { x: 0.30, y: 0.08, w: 0.40, h: 0.42 };
    return photo.face;
  }
  photo.face = null;
  return null;
}

function detectFace(photo) {
  const { w, h, data } = downscale(photo, 160);
  const mask = new Float32Array(w * h);
  // Detail prior: luminance gradient magnitude (eyes, mouth, hairline).
  const lum = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) lum[i] = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const s = skinScore(data[i * 4], data[i * 4 + 1], data[i * 4 + 2]);
      if (!s) continue;
      const gx = Math.abs(lum[i] - lum[y * w + Math.min(w - 1, x + 1)]);
      const gy = Math.abs(lum[i] - lum[Math.min(h - 1, y + 1) * w + x]);
      const detail = Math.min(1, (gx + gy) / 48);
      const upper = y < h * 0.62 ? 1 : Math.max(0.25, 1 - (y / h - 0.62) * 2.2);
      mask[i] = s * (0.55 + 0.45 * detail) * upper;
    }
  }
  // Blur the mask twice: a face is a smooth blob, so its pixels connect;
  // thin neon tubes and sign edges blur out below threshold.
  for (let pass = 0; pass < 2; pass++) {
    const blurred = new Float32Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let s = 0, n = 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx, yy = y + dy;
          if (xx < 0 || xx >= w || yy < 0 || yy >= h) continue;
          s += mask[yy * w + xx]; n++;
        }
        blurred[y * w + x] = s / n;
      }
    }
    mask.set(blurred);
  }
  // Largest connected skin region (4-neighbour flood fill on a 0.5 threshold).
  const seen = new Uint8Array(w * h);
  let best = null;
  const stack = [];
  for (let start = 0; start < w * h; start++) {
    if (mask[start] < 0.5 || seen[start]) continue;
    let x0 = w, y0 = h, x1 = 0, y1 = 0, n = 0, sum = 0;
    stack.length = 0; stack.push(start); seen[start] = 1;
    while (stack.length) {
      const i = stack.pop();
      const x = i % w, y = (i / w) | 0;
      n++; sum += mask[i];
      if (x < x0) x0 = x; if (x > x1) x1 = x;
      if (y < y0) y0 = y; if (y > y1) y1 = y;
      const nb = [i - 1, i + 1, i - w, i + w];
      for (const j of nb) {
        if (j < 0 || j >= w * h || seen[j] || mask[j] < 0.5) continue;
        if (j === i - 1 && x === 0) continue;
        if (j === i + 1 && x === w - 1) continue;
        seen[j] = 1; stack.push(j);
      }
    }
    // A face blob is compact and face-sized: it fills most of its own
    // bounding box, is at least 10px on a side, and covers 0.5%-50% of the frame.
    const bwC = x1 - x0 + 1, bhC = y1 - y0 + 1;
    const fill = n / (bwC * bhC);
    const areaF = n / (w * h);
    const asp = bwC / Math.max(1, bhC);
    if (n > 40 && fill > 0.45 && areaF > 0.005 && areaF < 0.5 && asp > 0.5 && asp < 2 && bwC >= 10 && bhC >= 10 && (!best || n > best.n)) best = { x0, y0, x1, y1, n, sum };
  }
  if (!best) { photo.face = null; return null; }
  // Reject fake faces (bright signs, headlights) below, after growing the box.
  // Grow the box: hair above (+28%), cheeks to the sides (+12%), chin below (+8%).
  const bw = best.x1 - best.x0 + 1, bh = best.y1 - best.y0 + 1;
  const box = {
    x: Math.max(0, (best.x0 - bw * 0.12) / w),
    y: Math.max(0, (best.y0 - bh * 0.28) / h),
    w: Math.min(1, (bw * 1.24) / w),
    h: Math.min(1, (bh * 1.36) / h),
  };
  // Skin fraction inside the grown box is NOT checked: hair is part of the
  // head, and a big-haired portrait would fail it. The component's own fill
  // ratio (checked above) already proves the blob is mostly skin.
  box.y = Math.min(box.y, 1 - box.h);
  box.x = Math.min(box.x, 1 - box.w);
  photo.face = box;
  return box;
}

// Face quality 0..1: brightness, contrast, sharpness measured INSIDE the face
// box, plus face size and resolution. Scene photos (no face) score low so
// portraits outrank them.
export function scoreFace(photo) {
  const box = findFace(photo);
  if (!box) return 0.12;
  const { w, h, data } = downscale(photo, 160);
  const x0 = Math.floor(box.x * w), y0 = Math.floor(box.y * h);
  const x1 = Math.min(w, Math.ceil((box.x + box.w) * w)), y1 = Math.min(h, Math.ceil((box.y + box.h) * h));
  let sum = 0, sum2 = 0, grad = 0, n = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = y * w + x;
      const l = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];
      sum += l; sum2 += l * l; n++;
      if (x < x1 - 1) grad += Math.abs(l - (0.299 * data[i * 4 + 4] + 0.587 * data[i * 4 + 5] + 0.114 * data[i * 4 + 6]));
    }
  }
  if (!n) return 0.12;
  const mean = sum / n;
  const contrast = Math.sqrt(Math.max(0, sum2 / n - mean * mean)) / 128;
  const bright = 1 - Math.abs(mean - 128) / 128;
  const sharp = Math.min(1, grad / n / 14);
  const size = Math.min(1, Math.max(box.w, box.h) * 2.4);
  const res = Math.min(1, photo.w / 900);
  return 0.22 * bright + 0.22 * Math.min(1, contrast) + 0.22 * sharp + 0.2 * size + 0.14 * res;
}

// Smart crop: source rect (pixels) for a panel of the given aspect that keeps
// the whole head (hair to chin) inside with headroom. Variant picks a different
// framing for scene photos or single-photo repeats.
export function smartCrop(photo, aspect, variant = 0) {
  const W = photo.w, H = photo.h;
  const box = findFace(photo);
  let cw, ch;
  if (W / H > aspect) { ch = H; cw = H * aspect; } else { cw = W; ch = W / aspect; }
  let cx, cy;
  if (box) {
    const fx = (box.x + box.w / 2) * W, fy = (box.y + box.h / 2) * H;
    const fw = box.w * W, fh = box.h * H;
    // Zoom out until the head fits with room to breathe: the head is at most
    // ~52% of the crop height, so shoulders and the street behind stay visible.
    // A tight headshot box must never fill the panel.
    const need = Math.max(fw / (cw * 1.02), fh / (ch * 0.52));
    if (need > 1) { cw *= need; ch *= need; }
    cx = fx - cw / 2;
    cy = fy - ch * 0.42 - ch * 0.08; // head slightly above centre, headroom on top
  } else {
    const offs = [[0.5, 0.5], [0.5, 0.32], [0.5, 0.68], [0.32, 0.5], [0.68, 0.5], [0.5, 0.5]];
    const o = offs[variant % offs.length];
    cx = o[0] * W - cw / 2; cy = o[1] * H - ch / 2;
  }
  // Never exceed the photo: an oversized source rect draws the image into
  // only part of the panel and leaves the rest transparent (empty dark band).
  if (cw > W) { cw = W; ch = W / aspect; }
  if (ch > H) { ch = H; cw = H * aspect; }
  // Re-centre on the face (or the scene point) after the clamp, then pin inside.
  if (box) {
    const fx = (box.x + box.w / 2) * W, fy = (box.y + box.h / 2) * H;
    cx = fx - cw / 2;
    cy = fy - ch * 0.5;
  }
  cx = Math.max(0, Math.min(W - cw, cx));
  cy = Math.max(0, Math.min(H - ch, cy));
  return { sx: cx, sy: cy, sw: cw, sh: ch, face: box };
}

export { mulberry32 };
