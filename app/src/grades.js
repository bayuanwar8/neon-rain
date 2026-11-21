// NEON RAIN — six rain grades on pixel data + photo finishing.
// Deterministic grain (hash of x,y) so repeated renders are byte-identical.
// Skin tones are protected: the grade's saturation pass skips warm skin hues.

export const GRADES = [
  { id: 'neon', label: 'Neon Rain', desc: 'Magenta + cyan neon on wet navy', sw: 'linear-gradient(135deg,#e8318a,#22d3ee)', lift: [8, 0, -6], sat: 1.18, con: 1.12, vig: 0.32, grain: 7, tintS: [-6, 4, 14], tintH: [10, -2, -8] },
  { id: 'midnight', label: 'Midnight Blue', desc: 'Cold deep blue, quiet neon', sw: 'linear-gradient(135deg,#0b1030,#2a5cff)', lift: [10, 2, -10], sat: 0.95, con: 1.16, vig: 0.42, grain: 6, tintS: [-4, 2, 16], tintH: [2, 6, 4] },
  { id: 'acid', label: 'Acid Rain', desc: 'Green-cyan toxic glow', sw: 'linear-gradient(135deg,#22ff88,#0ea5a5)', lift: [6, 4, -8], sat: 1.22, con: 1.1, vig: 0.3, grain: 8, tintS: [-8, 10, -4], tintH: [6, 8, -6] },
  { id: 'sodium', label: 'Sodium Night', desc: 'Warm orange streetlight', sw: 'linear-gradient(135deg,#ff9a1f,#7a2d00)', lift: [4, 2, -4], sat: 1.08, con: 1.14, vig: 0.36, grain: 7, tintS: [10, 2, -10], tintH: [14, 4, -10] },
  { id: 'noir', label: 'Noir', desc: 'Almost black and white, one neon accent', sw: 'linear-gradient(135deg,#111,#888)', lift: [6, 0, -8], sat: 0.18, con: 1.24, vig: 0.5, grain: 10, tintS: [0, 0, 6], tintH: [0, 0, 0] },
  { id: 'chrome', label: 'Wet Chrome', desc: 'Silver, high gloss, cold', sw: 'linear-gradient(135deg,#e8f4ff,#5a6b8a)', lift: [12, 4, -2], sat: 0.85, con: 1.08, vig: 0.26, grain: 5, tintS: [-2, 2, 8], tintH: [6, 4, 2] },
];

export function gradeById(id) { return GRADES.find((g) => g.id === id) || GRADES[0]; }

// Tone curve: lift shadows/mids/highs, then an S-curve for contrast.
function buildLUT(g) {
  const lut = new Uint8Array(256);
  const [ls, lm, lh] = g.lift;
  for (let v = 0; v < 256; v++) {
    const t = v / 255;
    let o = t + (ls / 255) * (1 - t) * (1 - t) + (lm / 255) * 4 * t * (1 - t) + (lh / 255) * t * t;
    o = o + (o - 0.5) * (g.con - 1) * 0.9; // S-curve
    lut[v] = Math.max(0, Math.min(255, Math.round(o * 255)));
  }
  return lut;
}

function hashNoise(x, y) {
  const s = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return s - Math.floor(s);
}

function isSkin(r, g, b) {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  return mx > 60 && mx < 245 && (mx - mn) < 100 && r >= g - 12 && r >= b - 8;
}

// Applies the grade in place on a canvas' pixels. Deterministic.
export function gradeCanvas(canvas, grade) {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const w = canvas.width, h = canvas.height;
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const lut = buildLUT(grade);
  const cx = w / 2, cy = h / 2, maxR = Math.hypot(cx, cy);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      let r = lut[d[i]], g = lut[d[i + 1]], b = lut[d[i + 2]];
      // Split toning: tint shadows and highlights.
      const lum = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
      const sw = (1 - lum) * (1 - lum), hw = lum * lum;
      r += grade.tintS[0] * sw + grade.tintH[0] * hw;
      g += grade.tintS[1] * sw + grade.tintH[1] * hw;
      b += grade.tintS[2] * sw + grade.tintH[2] * hw;
      // Saturation (skipped on skin so faces stay warm).
      const sat = isSkin(r, g, b) ? 1 : grade.sat;
      const gray = r * 0.299 + g * 0.587 + b * 0.114;
      r = gray + (r - gray) * sat;
      g = gray + (g - gray) * sat;
      b = gray + (b - gray) * sat;
      // Vignette.
      const v = 1 - grade.vig * Math.pow(Math.hypot(x - cx, y - cy) / maxR, 2.2);
      r *= v; g *= v; b *= v;
      // Deterministic film grain.
      const n = (hashNoise(x, y) - 0.5) * grade.grain;
      d[i] = Math.max(0, Math.min(255, r + n));
      d[i + 1] = Math.max(0, Math.min(255, g + n));
      d[i + 2] = Math.max(0, Math.min(255, b + n));
    }
  }
  ctx.putImageData(img, 0, 0);
}

// Photo finishing: auto-expose by histogram stretch, face-weighted gamma,
// a dehaze lift of the blacks, and a mild 3x3 sharpen. Runs on a working copy.
export function finishPhoto(photo, faceBox) {
  const maxSide = 900;
  const scale = Math.min(1, maxSide / Math.max(photo.w, photo.h));
  const w = Math.max(8, Math.round(photo.w * scale));
  const h = Math.max(8, Math.round(photo.h * scale));
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(photo.img, 0, 0, w, h);
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  // Histogram percentiles for levels.
  const hist = new Uint32Array(256);
  for (let i = 0; i < d.length; i += 4) hist[Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2])]++;
  const total = w * h;
  let lo = 0, hi = 255, acc = 0;
  for (let v = 0; v < 256; v++) { acc += hist[v]; if (acc >= total * 0.01) { lo = v; break; } }
  acc = 0;
  for (let v = 255; v >= 0; v--) { acc += hist[v]; if (acc >= total * 0.01) { hi = v; break; } }
  if (hi - lo < 24) { lo = 0; hi = 255; }
  // Face-weighted gamma: brighten the face region a touch (gamma 0.92 there).
  const fx0 = faceBox ? faceBox.x * w : 0, fy0 = faceBox ? faceBox.y * h : 0;
  const fx1 = faceBox ? (faceBox.x + faceBox.w) * w : 0, fy1 = faceBox ? (faceBox.y + faceBox.h) * h : 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const inFace = faceBox && x >= fx0 && x <= fx1 && y >= fy0 && y <= fy1;
      for (let k = 0; k < 3; k++) {
        let v = (d[i + k] - lo) * (255 / (hi - lo));
        v = Math.max(0, Math.min(255, v));
        if (inFace) v = 255 * Math.pow(v / 255, 0.92);
        v = v + (255 - v) * 0.02; // dehaze: lift the deepest blacks
        d[i + k] = v;
      }
    }
  }
  ctx.putImageData(img, 0, 0);
  // Mild sharpen (3x3) on luminance.
  const src = ctx.getImageData(0, 0, w, h);
  const out = ctx.createImageData(w, h);
  const s = src.data, o = out.data;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      for (let k = 0; k < 3; k++) {
        const c0 = s[i + k];
        const l = s[((y * w + Math.max(0, x - 1)) * 4) + k];
        const rgt = s[((y * w + Math.min(w - 1, x + 1)) * 4) + k];
        const u = s[((Math.max(0, y - 1) * w + x) * 4) + k];
        const dn = s[((Math.min(h - 1, y + 1) * w + x) * 4) + k];
        o[i + k] = Math.max(0, Math.min(255, c0 * 1.6 - (l + rgt + u + dn) * 0.15));
      }
      o[i + 3] = 255;
    }
  }
  ctx.putImageData(out, 0, 0);
  return c;
}

// Bake: finished + graded working copy, cached per photo+grade.
export function bakePhoto(photo, grade, faceBox) {
  if (photo.baked && photo.bakedGrade === grade.id) return photo.baked;
  const finished = finishPhoto(photo, faceBox);
  gradeCanvas(finished, grade);
  photo.baked = finished;
  photo.bakedGrade = grade.id;
  return finished;
}
